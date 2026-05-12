import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // GET: return the public client ID so the frontend can build the OAuth URL
  if (req.method === "GET") {
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

    // Parse granted scopes
    const grantedScopes = (scope || "").split(",").map((s: string) => s.trim()).filter(Boolean);

    // Detect if heart rate permission was granted
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
});
