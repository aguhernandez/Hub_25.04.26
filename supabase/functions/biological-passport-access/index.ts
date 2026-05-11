import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { crypto } from "jsr:@std/crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Token-Passport",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function validatePassportToken(token: string): Promise<{
  athlete_id: string;
  biological_passport_id: string;
  token_id: string;
} | null> {
  const tokenHash = await hashToken(token);

  const { data } = await supabaseAdmin
    .from("biological_passport_tokens")
    .select("id, athlete_id, biological_passport_id, expires_at")
    .eq("token_hash", tokenHash)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) return null;

  // Check if token is expired
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return null;
  }

  // Update last_used_at
  await supabaseAdmin
    .from("biological_passport_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return {
    token_id: data.id,
    athlete_id: data.athlete_id,
    biological_passport_id: data.biological_passport_id,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const tokenHeader = req.headers.get("X-Token-Passport");

    if (!tokenHeader) {
      return new Response(
        JSON.stringify({ error: "X-Token-Passport header is required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate token
    const validatedToken = await validatePassportToken(tokenHeader);
    if (!validatedToken) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired passport token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the biological passport
    const { data: passport, error: passportError } = await supabaseAdmin
      .from("biological_passports")
      .select("*")
      .eq("id", validatedToken.biological_passport_id)
      .eq("athlete_id", validatedToken.athlete_id)
      .single();

    if (passportError || !passport) {
      console.error("Passport fetch error:", passportError);
      return new Response(
        JSON.stringify({ error: "Passport not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get athlete info
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, avatar_url, email")
      .eq("id", validatedToken.athlete_id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          passport,
          athlete: {
            id: validatedToken.athlete_id,
            name: profile?.full_name,
            avatar_url: profile?.avatar_url,
            email: profile?.email,
          },
        },
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: unknown) {
    console.error("Biological passport access error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
