import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Planner-Token",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, status = 400) {
  return jsonResponse({ error: { code, message } }, status);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    // pathname: /hub-data-proxy/<endpoint>
    const endpoint = pathParts[pathParts.length - 1];

    // ── Auth via X-Planner-Token or Bearer ─────────────────────────────────
    const plannerToken =
      req.headers.get("X-Planner-Token") ??
      req.headers.get("Authorization")?.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // ── Route: push-race-plan ──────────────────────────────────────────────
    if (endpoint === "push-race-plan" && req.method === "POST") {
      // Resolve athlete from token or email query param
      const athleteEmail = url.searchParams.get("athlete_email");
      let athleteId: string | null = null;

      if (plannerToken) {
        const { data: tokenRow } = await supabase
          .from("external_planner_tokens")
          .select("athlete_id")
          .eq("token", plannerToken)
          .maybeSingle();
        if (tokenRow) athleteId = tokenRow.athlete_id;
      }

      if (!athleteId && athleteEmail) {
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", athleteEmail)
          .maybeSingle();
        if (profileRow) athleteId = profileRow.id;
      }

      if (!athleteId) {
        return errorResponse(
          "ATHLETE_NOT_FOUND",
          "No athlete found for the provided token or email.",
          404,
        );
      }

      let bodyText: string;
      try {
        bodyText = await req.text();
      } catch (e) {
        return errorResponse("INVALID_BODY", "Could not read request body.", 400);
      }

      console.log("push-race-plan raw body text:", bodyText);

      let body: Record<string, unknown>;
      try {
        body = JSON.parse(bodyText);
      } catch (e) {
        return errorResponse("INVALID_BODY", "Request body must be valid JSON.", 400);
      }

      console.log("push-race-plan parsed race_date:", body.race_date, "type:", typeof body.race_date);

      // Deactivate any previously active plan for this athlete
      await supabase
        .from("race_plans")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("athlete_id", athleteId)
        .eq("is_active", true);

      // Map the incoming nutrition satellite payload to DB columns
      const planRow = {
        athlete_id: athleteId,
        is_active: true,
        planner_source: body.planner_source ?? "nutrition_satellite",
        plan_version: body.plan_version ?? "1.0",
        generated_at: body.generated_at ?? new Date().toISOString(),

        // Race identity
        race_name: body.race_name ?? "Race",
        sport: body.sport ?? "triathlon",
        race_date: body.race_date ?? null,
        scheduled_date: body.scheduled_date ?? body.race_date ?? null,
        distance_km: body.distance_km ?? null,
        expected_duration_min: body.expected_duration_min ?? null,
        target_pace_min_km: body.target_pace_min_km ?? null,

        // Environmental
        temperature_c: body.temperature_c ?? null,
        humidity_pct: body.humidity_pct ?? null,
        altitude_m: body.altitude_m ?? null,

        // Intensity
        intensity_percent: body.intensity_percent ?? null,
        intensity_zone: body.intensity_zone ?? null,
        pacing_recommendation: body.pacing_recommendation ?? null,

        // Carbohydrate strategy
        carbs_g_per_hour: body.carbs_g_per_hour ?? null,
        total_carbs_g: body.total_carbs_g ?? null,
        carb_sources: body.carb_sources ?? null,
        carb_timing: body.carb_timing ?? null,

        // Hydration strategy
        fluid_l_per_hour: body.fluid_l_per_hour ?? null,
        total_fluid_l: body.total_fluid_l ?? null,
        sodium_mg_per_hour: body.sodium_mg_per_hour ?? null,
        total_sodium_mg: body.total_sodium_mg ?? null,
        sweat_rate_l_per_hour: body.sweat_rate_l_per_hour ?? null,
        projected_mass_loss_pct: body.projected_mass_loss_pct ?? null,

        // Caffeine strategy
        caffeine_total_mg: body.caffeine_total_mg ?? null,
        caffeine_mg_per_kg: body.caffeine_mg_per_kg ?? null,
        caffeine_pre_dose_mg: body.caffeine_pre_dose_mg ?? null,
        caffeine_pre_dose_min_before: body.caffeine_pre_dose_min_before ?? null,
        caffeine_mid_race_doses: body.caffeine_mid_race_doses ?? null,
        caffeine_sources: body.caffeine_sources ?? null,
        caffeine_notes: body.caffeine_notes ?? null,

        // Pre-competition protocol
        pre_comp_notes: body.pre_comp_notes ?? null,
        cho_loading_days: body.cho_loading_days ?? null,
        pre_comp_days: body.pre_comp_days ?? null,
        race_breakfast_timing: body.race_breakfast_timing ?? null,
        race_breakfast_description: body.race_breakfast_description ?? null,
        race_breakfast_carbs_g: body.race_breakfast_carbs_g ?? null,

        // Gut training protocol
        gi_training_weeks: body.gi_training_weeks ?? null,
        gi_training_target_g_per_hour: body.gi_training_target_g_per_hour ?? null,
        gi_training_notes: body.gi_training_notes ?? null,
        gi_sessions: body.gi_sessions ?? null,

        // Race segments
        segments: body.segments ?? null,

        // Risks and notes
        risks: body.risks ?? null,
        athlete_notes: body.athlete_notes ?? null,
        notes: body.notes ?? null,

        updated_at: new Date().toISOString(),
      };

      const { data: inserted, error: insertError } = await supabase
        .from("race_plans")
        .insert(planRow)
        .select("id")
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        return errorResponse(
          "INSERT_FAILED",
          insertError.message,
          500,
        );
      }

      return jsonResponse({ success: true, id: inserted.id, debug_race_date_received: body.race_date ?? "WAS_NULL" });
    }

    // ── Unknown endpoint ───────────────────────────────────────────────────
    return errorResponse("NOT_FOUND", `Unknown endpoint: ${endpoint}`, 404);
  } catch (err) {
    console.error("hub-data-proxy error:", err);
    return errorResponse("INTERNAL_ERROR", "An unexpected error occurred.", 500);
  }
});
