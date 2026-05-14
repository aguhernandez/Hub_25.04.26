import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { crypto } from "jsr:@std/crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Planner-Token",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function validatePlannerToken(token: string): Promise<{ id: string; planner_type: string; planner_name: string } | null> {
  const tokenHash = await hashToken(token);
  const { data } = await supabaseAdmin
    .from("external_planner_tokens")
    .select("id, planner_type, planner_name")
    .eq("token_hash", tokenHash)
    .eq("is_active", true)
    .maybeSingle();

  if (data) {
    await supabaseAdmin
      .from("external_planner_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", data.id);
  }

  return data;
}

async function resolveAthlete(athleteId: string | null, athleteEmail: string | null): Promise<any | null> {
  if (athleteId) {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, sport, role")
      .eq("id", athleteId)
      .eq("role", "athlete")
      .maybeSingle();
    if (data) return data;
  }

  if (athleteEmail) {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, sport, role")
      .ilike("email", athleteEmail.trim())
      .eq("role", "athlete")
      .maybeSingle();
    if (data) return data;
  }

  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const plannerTokenHeader = req.headers.get("X-Planner-Token");

    if (!plannerTokenHeader) {
      return new Response(JSON.stringify({ error: "Missing X-Planner-Token header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const plannerInfo = await validatePlannerToken(plannerTokenHeader);
    if (!plannerInfo) {
      return new Response(JSON.stringify({ error: "Invalid or inactive planner token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const athleteIdParam = url.searchParams.get("athlete_id");
    const athleteEmail = url.searchParams.get("athlete_email");

    if (!athleteIdParam && !athleteEmail) {
      return new Response(JSON.stringify({ error: "athlete_id or athlete_email query parameter is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const athleteProfile = await resolveAthlete(athleteIdParam, athleteEmail);

    if (!athleteProfile) {
      return new Response(JSON.stringify({ error: "Athlete not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const athleteId = athleteProfile.id;

    // ── POST /push-to-hub (race plan) ──────────────────────────────────
    if (req.method === "POST" && plannerInfo.planner_type === "nutrition") {
      const body = await req.json();

      // If the body contains race_name + race_date it's a race plan push
      if (body.race_name !== undefined || body.race_date !== undefined) {
        // Deactivate previous active plan for this athlete
        await supabaseAdmin
          .from("race_plans")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("athlete_id", athleteId)
          .eq("is_active", true);

        const planRow: Record<string, unknown> = {
          athlete_id: athleteId,
          is_active: true,
          planner_source: plannerInfo.planner_name,
          plan_version: body.plan_version ?? "1.0",
          generated_at: body.generated_at ?? new Date().toISOString(),
          race_name: body.race_name ?? "Race",
          sport: body.sport ?? "triathlon",
          race_date: body.race_date ?? null,
          scheduled_date: body.scheduled_date ?? body.race_date ?? null,
          distance_km: body.distance_km ?? null,
          expected_duration_min: body.expected_duration_min ?? null,
          target_pace_min_km: body.target_pace_min_km ?? null,
          temperature_c: body.temperature_c ?? null,
          humidity_pct: body.humidity_pct ?? null,
          altitude_m: body.altitude_m ?? null,
          intensity_percent: body.intensity_percent ?? null,
          intensity_zone: body.intensity_zone ?? null,
          pacing_recommendation: body.pacing_recommendation ?? null,
          carbs_g_per_hour: body.carbs_g_per_hour ?? null,
          total_carbs_g: body.total_carbs_g ?? null,
          carb_sources: body.carb_sources ?? null,
          carb_timing: body.carb_timing ?? null,
          fluid_l_per_hour: body.fluid_l_per_hour ?? null,
          total_fluid_l: body.total_fluid_l ?? null,
          sodium_mg_per_hour: body.sodium_mg_per_hour ?? null,
          total_sodium_mg: body.total_sodium_mg ?? null,
          sweat_rate_l_per_hour: body.sweat_rate_l_per_hour ?? null,
          projected_mass_loss_pct: body.projected_mass_loss_pct ?? null,
          caffeine_total_mg: body.caffeine_total_mg ?? null,
          caffeine_mg_per_kg: body.caffeine_mg_per_kg ?? null,
          caffeine_pre_dose_mg: body.caffeine_pre_dose_mg ?? null,
          caffeine_pre_dose_min_before: body.caffeine_pre_dose_min_before ?? null,
          caffeine_mid_race_doses: body.caffeine_mid_race_doses ?? null,
          caffeine_sources: body.caffeine_sources ?? null,
          caffeine_notes: body.caffeine_notes ?? null,
          pre_comp_notes: body.pre_comp_notes ?? null,
          cho_loading_days: body.cho_loading_days ?? null,
          pre_comp_days: body.pre_comp_days ?? null,
          race_breakfast_timing: body.race_breakfast_timing ?? null,
          race_breakfast_description: body.race_breakfast_description ?? null,
          race_breakfast_carbs_g: body.race_breakfast_carbs_g ?? null,
          gi_training_weeks: body.gi_training_weeks ?? null,
          gi_training_target_g_per_hour: body.gi_training_target_g_per_hour ?? null,
          gi_training_notes: body.gi_training_notes ?? null,
          gi_sessions: body.gi_sessions ?? null,
          segments: body.segments ?? null,
          risks: body.risks ?? null,
          athlete_notes: body.athlete_notes ?? null,
          notes: body.notes ?? null,
          updated_at: new Date().toISOString(),
        };

        const { data: inserted, error: insertError } = await supabaseAdmin
          .from("race_plans")
          .insert(planRow)
          .select("id")
          .single();

        if (insertError) throw insertError;

        await supabaseAdmin.from("external_planner_access_log").insert({
          planner_token_id: plannerInfo.id,
          athlete_id: athleteId,
          action: "write",
          endpoint: "push-to-hub/race-plan",
          status_code: 200,
        }).then(() => {});

        return new Response(JSON.stringify({
          success: true,
          id: inserted.id,
          race_date: planRow.race_date,
          message: `Race plan for ${planRow.race_name} saved to Hub successfully`,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { plan_date, plan_name, summary, plan_data, adherence_data, notes, plan_mode, start_date } = body;

      if (!plan_date) {
        return new Response(JSON.stringify({ error: "plan_date is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Enrich plan_data days with date and day_label fields when calendar mode
      let enrichedPlanData = plan_data || {};
      if (plan_data?.days && Array.isArray(plan_data.days)) {
        const resolvedMode = plan_mode || "template";
        const resolvedStartDate = start_date || plan_date;
        const locale = "es-ES";

        enrichedPlanData = {
          ...plan_data,
          plan_mode: resolvedMode,
          start_date: resolvedMode === "calendar" ? resolvedStartDate : null,
          days: plan_data.days.map((day: Record<string, any>, idx: number) => {
            let computedDate: string | null = null;
            let computedDayName: string = day.day_name ?? `Día ${day.day ?? idx + 1}`;

            if (resolvedMode === "calendar") {
              const base = new Date(resolvedStartDate + "T12:00:00Z");
              base.setUTCDate(base.getUTCDate() + idx);
              computedDate = base.toISOString().split("T")[0];
              computedDayName = base.toLocaleDateString(locale, {
                weekday: "long",
                day: "numeric",
                month: "long",
              });
            }

            return {
              ...day,
              day_label: day.day_name ?? `Día ${day.day ?? idx + 1}`,
              day_name: computedDayName,
              date: computedDate,
            };
          }),
        };
      }

      const { data, error } = await supabaseAdmin
        .from("external_nutrition_plans")
        .upsert({
          athlete_id: athleteId,
          planner_source: plannerInfo.planner_name,
          plan_date,
          plan_name: plan_name || null,
          summary: summary || {},
          plan_data: enrichedPlanData,
          adherence_data: adherence_data || {},
          notes: notes || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "athlete_id,plan_date,planner_source",
        })
        .select("id, plan_date, plan_name, updated_at")
        .single();

      if (error) throw error;

      await supabaseAdmin.from("external_planner_access_log").insert({
        planner_token_id: plannerInfo.id,
        athlete_id: athleteId,
        action: "write",
        endpoint: "push-to-hub/nutrition",
        status_code: 200,
      }).then(() => {});

      return new Response(JSON.stringify({
        success: true,
        record: data,
        message: `Nutrition plan for ${plan_date} saved to Hub successfully`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── POST /push-to-hub (endurance planner) ──────────────────────────
    if (req.method === "POST" && plannerInfo.planner_type === "endurance") {
      const body = await req.json();

      // Helper: save a single workout record, upsert if external_id present
      async function saveWorkout(w: Record<string, any>): Promise<any> {
        const extId = w.id || w.external_id || w.external_workout_id || null;
        const record: Record<string, any> = {
          athlete_id: athleteId,
          planner_source: plannerInfo!.planner_name,
          name: w.name || "Endurance Workout",
          sport: w.sport || "cycling",
          sub_discipline: w.sub_discipline || null,
          description: w.description || null,
          intensity_basis: w.intensity_basis || "power",
          scheduled_date: String(w.scheduled_date).substring(0, 10),
          scheduled_time: w.scheduled_time || null,
          estimated_duration_minutes: w.estimated_duration_minutes ?? null,
          estimated_impulse: w.estimated_impulse || null,
          status: w.status || "planned",
          steps: w.steps || [],
          updated_at: new Date().toISOString(),
        };

        if (extId) {
          record.external_id = extId;
          record.external_workout_id = extId;
          // Check if already exists
          const { data: existing } = await supabaseAdmin
            .from("external_endurance_workouts")
            .select("id")
            .eq("athlete_id", athleteId)
            .eq("planner_source", plannerInfo!.planner_name)
            .eq("external_id", extId)
            .maybeSingle();
          if (existing) {
            const { data, error } = await supabaseAdmin
              .from("external_endurance_workouts")
              .update(record)
              .eq("id", existing.id)
              .select("id, scheduled_date, name, updated_at")
              .single();
            if (error) throw error;
            return data;
          }
        }

        const { data, error } = await supabaseAdmin
          .from("external_endurance_workouts")
          .insert(record)
          .select("id, scheduled_date, name, updated_at")
          .single();
        if (error) throw error;
        return data;
      }

      // BATCH: array of workouts
      if (Array.isArray(body.workouts)) {
        if (body.workouts.length === 0) {
          return new Response(JSON.stringify({ error: "workouts array must not be empty" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const results: any[] = [];
        const errors: any[] = [];

        for (const w of body.workouts) {
          if (!w.scheduled_date) {
            errors.push({ name: w.name || "unknown", error: "scheduled_date is required" });
            continue;
          }
          try {
            results.push(await saveWorkout(w));
          } catch (e: any) {
            errors.push({ name: w.name, error: e.message });
          }
        }

        await supabaseAdmin.from("external_planner_access_log").insert({
          planner_token_id: plannerInfo.id,
          athlete_id: athleteId,
          action: "write",
          endpoint: "push-to-hub/endurance-workouts-batch",
          status_code: 200,
        }).then(() => {});

        return new Response(JSON.stringify({
          success: errors.length === 0,
          saved: results,
          errors,
          message: `${results.length} workout(s) saved, ${errors.length} error(s)`,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // SINGLE workout (with scheduled_date + steps)
      if (body.scheduled_date !== undefined || body.steps !== undefined) {
        if (!body.scheduled_date) {
          return new Response(JSON.stringify({ error: "scheduled_date is required for individual workouts" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const result = await saveWorkout(body);

        await supabaseAdmin.from("external_planner_access_log").insert({
          planner_token_id: plannerInfo.id,
          athlete_id: athleteId,
          action: "write",
          endpoint: "push-to-hub/endurance-workout",
          status_code: 200,
        }).then(() => {});

        return new Response(JSON.stringify({
          success: true,
          record: result,
          message: `Endurance workout for ${body.scheduled_date} saved to Hub successfully`,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Weekly plan push (legacy / summary)
      const { week_start_date, plan_name, summary, plan_data, notes } = body;

      if (!week_start_date) {
        return new Response(JSON.stringify({ error: "week_start_date is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabaseAdmin
        .from("external_endurance_plans")
        .upsert({
          athlete_id: athleteId,
          planner_source: plannerInfo.planner_name,
          week_start_date,
          plan_name: plan_name || null,
          summary: summary || {},
          plan_data: plan_data || {},
          notes: notes || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "athlete_id,week_start_date,planner_source",
        })
        .select("id, week_start_date, plan_name, updated_at")
        .single();

      if (error) throw error;

      await supabaseAdmin.from("external_planner_access_log").insert({
        planner_token_id: plannerInfo.id,
        athlete_id: athleteId,
        action: "write",
        endpoint: "push-to-hub/endurance",
        status_code: 200,
      }).then(() => {});

      return new Response(JSON.stringify({
        success: true,
        record: data,
        message: `Endurance plan for week ${week_start_date} saved to Hub successfully`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── POST /push-to-hub (lab planner) ───────────────────────────────
    if (req.method === "POST" && plannerInfo.planner_type === "lab") {
      const body = await req.json();
      const {
        record_id,
        measurement_date,
        test_protocol,
        notes,
        physiological = {},
        anthropometry = {},
        athletic_profile = {},
        sport_context,
      } = body;

      if (!measurement_date) {
        return new Response(JSON.stringify({ error: "measurement_date is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const safeLabRecordId = record_id && UUID_REGEX.test(record_id) ? record_id : null;
      const VALID_LEVELS = ["beginner", "intermediate", "advanced", "elite"];
      const safeAthleteLevel = VALID_LEVELS.includes(athletic_profile.athlete_level)
        ? athletic_profile.athlete_level
        : null;

      const passportRecord: Record<string, any> = {
        athlete_id: athleteId,
        measurement_date,
        test_protocol: test_protocol || null,
        notes: notes || null,
        lab_record_id: safeLabRecordId,
        source: "lab",
        status: "active",
        sport_context: sport_context || null,
      };

      const physMap: Record<string, string[]> = {
        vo2max: ["vo2max"],
        lt1_power: ["lt1_power", "lt1_power_watts"],
        lt2_power: ["lt2_power", "lt2_power_watts"],
        lt1_hr: ["lt1_hr"],
        lt2_hr: ["lt2_hr"],
        ftp_watts: ["ftp_watts", "ftp"],
        critical_power: ["critical_power", "critical_power_watts"],
        anaerobic_capacity_kj: ["anaerobic_capacity_kj", "anaerobic_capacity"],
        running_threshold_pace: ["running_threshold_pace", "running_threshold_pace_min_km"],
        power_zones_json: ["power_zones_json", "power_zones"],
        hr_zones_json: ["hr_zones_json", "hr_zones"],
        rpe_zones_json: ["rpe_zones_json", "rpe_zones"],
      };
      for (const [dbField, aliases] of Object.entries(physMap)) {
        for (const alias of aliases) {
          if (physiological[alias] !== undefined) {
            passportRecord[dbField] = physiological[alias];
            break;
          }
        }
      }

      if (physiological.training_zones !== undefined) {
        const tz = physiological.training_zones;
        passportRecord.training_zones = tz;
        const defaultDisplay = tz?.default_display === "7" ? "7" : "5";
        const legacyZoneSet = defaultDisplay === "7" ? tz?.zones7 : tz?.zones5;
        if (legacyZoneSet?.hr !== undefined && passportRecord.hr_zones_json === undefined) {
          passportRecord.hr_zones_json = legacyZoneSet.hr;
        }
        if (legacyZoneSet?.power !== undefined && passportRecord.power_zones_json === undefined) {
          passportRecord.power_zones_json = legacyZoneSet.power;
        }
        if (legacyZoneSet?.rpe !== undefined && passportRecord.rpe_zones_json === undefined) {
          passportRecord.rpe_zones_json = legacyZoneSet.rpe;
        }
      }

      if (anthropometry.height_cm !== undefined) passportRecord.height_cm = anthropometry.height_cm;
      if (anthropometry.weight_kg !== undefined) passportRecord.weight_kg = anthropometry.weight_kg;
      if (anthropometry.body_fat_percent !== undefined) passportRecord.body_fat_percent = anthropometry.body_fat_percent;
      if (anthropometry.muscle_mass_kg !== undefined) passportRecord.muscle_mass_kg = anthropometry.muscle_mass_kg;
      if (anthropometry.lean_mass_kg !== undefined) passportRecord.lean_mass_kg = anthropometry.lean_mass_kg;
      if (anthropometry.bone_mass_kg !== undefined) passportRecord.bone_mass_kg = anthropometry.bone_mass_kg;
      if (athletic_profile.training_age_years !== undefined) passportRecord.training_age_years = athletic_profile.training_age_years;
      if (safeAthleteLevel) passportRecord.athlete_level = safeAthleteLevel;

      if (safeLabRecordId) {
        await supabaseAdmin
          .from("biological_passports")
          .update({ status: "superseded" })
          .eq("athlete_id", athleteId)
          .eq("lab_record_id", safeLabRecordId)
          .eq("status", "active");
      }

      const { data, error } = await supabaseAdmin
        .from("biological_passports")
        .insert(passportRecord)
        .select("id, measurement_date, status")
        .single();

      if (error) throw error;

      await supabaseAdmin.from("external_planner_access_log").insert({
        planner_token_id: plannerInfo.id,
        athlete_id: athleteId,
        action: "write",
        endpoint: "push-to-hub/lab",
        status_code: 200,
      }).then(() => {});

      return new Response(JSON.stringify({
        success: true,
        record: data,
        message: `Biological passport entry saved to Hub for ${measurement_date}`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed or unknown planner type" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
