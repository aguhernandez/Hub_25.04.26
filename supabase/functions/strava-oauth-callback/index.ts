import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
// verify_jwt=false: GET must be public — Strava redirects here without auth headers
// htmlResponse must return Content-Type: text/html so browsers render the page

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function htmlResponse(title: string, message: string, isError = false): Response {
  const bgColor = isError ? "#1a1a2e" : "#0C0D0F";
  const accentColor = isError ? "#ef4444" : "#fdda36";
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>Asciende — ${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: ${bgColor};
    color: #e5e7eb;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 24px;
  }
  .card {
    max-width: 400px;
    text-align: center;
    width: 100%;
  }
  .icon {
    width: 64px;
    height: 64px;
    margin: 0 auto 20px;
    border-radius: 16px;
    background: rgba(253,218,54,0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
  }
  h1 {
    font-size: 20px;
    font-weight: 700;
    color: ${accentColor};
    margin-bottom: 12px;
  }
  p {
    font-size: 15px;
    line-height: 1.6;
    color: #9ca3af;
  }
</style>
</head>
<body>
  <div class="card">
    <div class="icon">${isError ? "\u26a0" : "\u2713"}</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Client-Info, Apikey");
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(html, {
    status: isError ? 400 : 200,
    headers,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);

  // GET without query params: return the public client ID so the frontend can build the OAuth URL
  if (req.method === "GET" && !url.searchParams.has("code") && !url.searchParams.has("state")) {
    const clientId = Deno.env.get("STRAVA_CLIENT_ID");
    if (!clientId) {
      return new Response(
        JSON.stringify({ error: "Strava not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ client_id: clientId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // GET with code+state: Strava redirect callback — handle server-side token exchange
  if (req.method === "GET" && url.searchParams.has("code")) {
    const code = url.searchParams.get("code");
    const scope = url.searchParams.get("scope") || "";
    const state = url.searchParams.get("state") || "";

    if (!state) {
      return htmlResponse("Error de conexion", "No se pudo identificar al usuario. Cerra esta ventana y volvi a intentar desde la app.", true);
    }

    const clientId = Deno.env.get("STRAVA_CLIENT_ID");
    const clientSecret = Deno.env.get("STRAVA_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      console.error("[strava-oauth-callback] STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET not set");
      return htmlResponse("Error de configuracion", "Strava no esta configurado en el servidor.", true);
    }

    try {
      // Exchange authorization code for tokens
      const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("[strava-oauth-callback] Token exchange failed:", errorText);
        return htmlResponse("Error de conexion", "Strava rechazo el codigo de autorizacion. Volvi a intentar desde la app.", true);
      }

      const tokenData = await tokenResponse.json();
      const athlete = tokenData.athlete;
      const expiresAt = new Date(tokenData.expires_at * 1000).toISOString();

      const grantedScopes = (scope || "").split(",").map((s: string) => s.trim()).filter(Boolean);
      const hasHeartratePermission =
        grantedScopes.includes("activity:read_all") ||
        grantedScopes.includes("profile:read_all");

      console.log(`[strava-oauth-callback] Connected athlete ${athlete.id} for user ${state} | scopes: ${grantedScopes.join(", ")} | HR: ${hasHeartratePermission}`);

      // Use service role to upsert — the callback has no user session
      const serviceSupabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const { error: upsertError } = await serviceSupabase
        .from("strava_connections")
        .upsert(
          {
            user_id: state,
            athlete_id: athlete.id,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: expiresAt,
            scope: scope || "",
            granted_scopes: grantedScopes,
            has_heartrate_permission: hasHeartratePermission,
            athlete_profile: athlete,
            athlete_firstname: athlete.firstname || null,
            athlete_lastname: athlete.lastname || null,
            athlete_profile_pic: athlete.profile || athlete.profile_medium || null,
            connected_at: new Date().toISOString(),
            is_active: true,
            requires_reauth: !grantedScopes.includes("activity:read_all"),
          },
          { onConflict: "user_id" }
        );

      if (upsertError) {
        console.error("[strava-oauth-callback] Failed to save connection:", upsertError);
        return htmlResponse("Error", "No se pudo guardar la conexion. Volvi a intentar desde la app.", true);
      }

      return htmlResponse("Strava conectado", "Tu cuenta de Strava se conecto correctamente. Ya podes volver a la app de Asciende.");
    } catch (error) {
      console.error("[strava-oauth-callback] Unexpected error:", error);
      return htmlResponse("Error inesperado", error.message || "Ocurrio un error. Volvi a intentar desde la app.", true);
    }
  }

  // POST: legacy flow — frontend sends code + scope with auth header (still supported for web)
  if (req.method === "POST") {
    try {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
      );

      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { code, scope } = await req.json();
      if (!code) {
        return new Response(
          JSON.stringify({ error: "Missing authorization code" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const clientId = Deno.env.get("STRAVA_CLIENT_ID");
      const clientSecret = Deno.env.get("STRAVA_CLIENT_SECRET");
      if (!clientId || !clientSecret) {
        console.error("[strava-oauth-callback] STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET not set");
        return new Response(
          JSON.stringify({ error: "Strava credentials not configured on server" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Exchange authorization code for tokens
      const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("[strava-oauth-callback] Token exchange failed:", errorText);
        return new Response(
          JSON.stringify({ error: "Failed to exchange authorization code with Strava" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tokenData = await tokenResponse.json();
      const athlete = tokenData.athlete;
      const expiresAt = new Date(tokenData.expires_at * 1000).toISOString();

      const grantedScopes = (scope || "").split(",").map((s: string) => s.trim()).filter(Boolean);
      const hasHeartratePermission =
        grantedScopes.includes("activity:read_all") ||
        grantedScopes.includes("profile:read_all");

      console.log(`[strava-oauth-callback] Connected athlete ${athlete.id} | scopes: ${grantedScopes.join(", ")} | HR: ${hasHeartratePermission}`);

      const { error: upsertError } = await supabaseClient
        .from("strava_connections")
        .upsert(
          {
            user_id: user.id,
            athlete_id: athlete.id,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: expiresAt,
            scope: scope || "",
            granted_scopes: grantedScopes,
            has_heartrate_permission: hasHeartratePermission,
            athlete_profile: athlete,
            athlete_firstname: athlete.firstname || null,
            athlete_lastname: athlete.lastname || null,
            athlete_profile_pic: athlete.profile || athlete.profile_medium || null,
            connected_at: new Date().toISOString(),
            is_active: true,
            requires_reauth: !grantedScopes.includes("activity:read_all"),
          },
          { onConflict: "user_id" }
        );

      if (upsertError) {
        console.error("[strava-oauth-callback] Failed to save connection:", upsertError);
        return new Response(
          JSON.stringify({ error: "Failed to save Strava connection" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          athlete: {
            id: athlete.id,
            firstname: athlete.firstname,
            lastname: athlete.lastname,
            profile: athlete.profile,
            profile_medium: athlete.profile_medium,
            city: athlete.city,
            country: athlete.country,
          },
          has_heartrate_permission: hasHeartratePermission,
          granted_scopes: grantedScopes,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("[strava-oauth-callback] Unexpected error:", error);
      return new Response(
        JSON.stringify({ error: error.message || "Internal server error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  return new Response(
    JSON.stringify({ error: "Method not allowed" }),
    { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
