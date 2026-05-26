import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PushPayload {
  user_id?: string;
  user_ids?: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  category?:
    | "trainer_messages"
    | "new_training_plan"
    | "new_nutrition_plan"
    | "new_academy_course"
    | "new_habit"
    | "performance_pills";
}

async function getAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  const payloadB64 = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  const signInput = `${headerB64}.${payloadB64}`;

  const pemContent = serviceAccount.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(signInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  const jwt = `${signInput}.${signatureB64}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

async function sendFCMv1(
  accessToken: string,
  projectId: string,
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  const message: any = {
    message: {
      token,
      notification: { title, body },
      android: {
        priority: "high",
        notification: { channel_id: "asciende_default" },
      },
      apns: {
        payload: {
          aps: { alert: { title, body }, sound: "default", badge: 1 },
        },
      },
    },
  };

  if (data) {
    message.message.data = data;
  }

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error(`FCM send failed for token ${token.slice(0, 10)}...:`, errText);
    return false;
  }
  return true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (!serviceAccountJson) {
      return new Response(
        JSON.stringify({
          error: "FIREBASE_SERVICE_ACCOUNT secret not configured",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId = serviceAccount.project_id;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, user_ids, title, body, data, category }: PushPayload =
      await req.json();

    const targetUserIds: string[] = user_ids || (user_id ? [user_id] : []);

    if (targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "user_id or user_ids required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: "title and body required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user preferences if category is specified
    let eligibleUserIds = targetUserIds;
    if (category) {
      const { data: prefs } = await supabase
        .from("push_notification_preferences")
        .select("user_id, " + category)
        .in("user_id", targetUserIds);

      if (prefs && prefs.length > 0) {
        const disabledUsers = new Set(
          prefs.filter((p: any) => p[category] === false).map((p: any) => p.user_id)
        );
        eligibleUserIds = targetUserIds.filter((id) => !disabledUsers.has(id));
      }
    }

    if (eligibleUserIds.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "All users have disabled this notification category" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get push tokens for eligible users
    const { data: tokens } = await supabase
      .from("push_tokens")
      .select("token, platform, user_id")
      .in("user_id", eligibleUserIds);

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No push tokens found for target users" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get OAuth2 access token for FCM v1 API
    const accessToken = await getAccessToken(serviceAccount);

    let sent = 0;
    let failed = 0;
    const failedTokens: string[] = [];

    for (const tokenEntry of tokens) {
      const success = await sendFCMv1(
        accessToken,
        projectId,
        tokenEntry.token,
        title,
        body,
        data
      );
      if (success) {
        sent++;
      } else {
        failed++;
        failedTokens.push(tokenEntry.token);
      }
    }

    // Clean up invalid tokens (tokens that fail are often expired/unregistered)
    if (failedTokens.length > 0) {
      await supabase
        .from("push_tokens")
        .delete()
        .in("token", failedTokens);
    }

    return new Response(
      JSON.stringify({ sent, failed, total_tokens: tokens.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("send-push-notification error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
