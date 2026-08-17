import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TEAM_ID = "78WWG7XATW";
const KEY_ID = "DCBPLPK49A";
const CLIENT_ID = "pro.asciende.auth";

const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgxiT+NZOPBHCHB3gq
fnGeukBgwdvpbruUah7gM1z4tpSgCgYIKoZIzj0DAQehRANCAAR1GZgYnqIGJBYU
C51zpZkztK2DAZX7P1LkPuB3umlnK/bzBl9jtKWNegraGYFUxeDyUDtbVvBHyn+E
ObYLOPko
-----END PRIVATE KEY-----`;

function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 15777000; // 180 days (max Apple allows)

    const header = { alg: "ES256", kid: KEY_ID };
    const payload = {
      iss: TEAM_ID,
      iat: now,
      exp,
      aud: "https://appleid.apple.com",
      sub: CLIENT_ID,
    };

    const encoder = new TextEncoder();
    const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
    const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
    const signInput = `${headerB64}.${payloadB64}`;

    const pemContent = PRIVATE_KEY
      .replace("-----BEGIN PRIVATE KEY-----", "")
      .replace("-----END PRIVATE KEY-----", "")
      .replace(/\n/g, "")
      .trim();
    const binaryKey = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      cryptoKey,
      encoder.encode(signInput)
    );

    const signatureB64 = base64UrlEncode(new Uint8Array(signature));
    const jwt = `${signInput}.${signatureB64}`;

    const expirationDate = new Date(exp * 1000).toISOString().split("T")[0];

    return new Response(
      JSON.stringify({
        client_secret: jwt,
        expires: expirationDate,
        team_id: TEAM_ID,
        key_id: KEY_ID,
        client_id: CLIENT_ID,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("generate-apple-client-secret error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
