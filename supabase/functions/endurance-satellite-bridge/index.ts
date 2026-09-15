import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { crypto } from "jsr:@std/crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Planner-Token",
};

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function validatePlannerToken(token: string, serviceSupabase: any): Promise<{ id: string; planner_type: string; planner_name: string } | null> {
  const tokenHash = await hashToken(token);
  const { data } = await serviceSupabase
    .from("external_planner_tokens")
    .select("id, planner_type, planner_name")
    .eq("token_hash", tokenHash)
    .eq("is_active", true)
    .maybeSingle();

  if (data) {
    await serviceSupabase
      .from("external_planner_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", data.id);
  }

  return data;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    const plannerTokenHeader = req.headers.get("X-Planner-Token");

    let plannerInfo: { id: string; planner_type: string; planner_name: string } | null = null;
    let userId: string | null = null;

    if (plannerTokenHeader) {
      plannerInfo = await validatePlannerToken(plannerTokenHeader, serviceSupabase);
      if (!plannerInfo) {
        return new Response(JSON.stringify({ error: "Invalid or inactive planner token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (authHeader) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized", details: authError?.message }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = user.id;
    } else {
      return new Response(JSON.stringify({ error: "Missing authentication. Use Authorization header (JWT) or X-Planner-Token header." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const endpoint = url.pathname.split("/").pop();
    const athleteIdParam = url.searchParams.get("athlete_id");
    const athleteEmail = url.searchParams.get("athlete_email");
    const dateFrom = url.searchParams.get("date_from");
    const dateTo = url.searchParams.get("date_to");

    // Resolve athlete ID
    let athleteId = athleteIdParam || userId || "";

    if (!athleteId && athleteEmail) {
      const { data: athleteByEmail } = await serviceSupabase
        .from("profiles")
        .select("id")
        .ilike("email", athleteEmail.trim())
        .maybeSingle();
      if (athleteByEmail) athleteId = athleteByEmail.id;
    }

    if (!athleteId && athleteEmail) {
      const { data: athleteByEmail } = await serviceSupabase
        .from("profiles")
        .select("id")
        .eq("email", athleteEmail.trim())
        .maybeSingle();
      if (athleteByEmail) athleteId = athleteByEmail.id;
    }

    // ──────────────────────────────────────────────────────────────────
    // GET /endurance-satellite-bridge/activities
    // Returns GPS/Strava activities for the athlete
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "activities") {
      const df = dateFrom || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
      const dt = dateTo || new Date().toISOString().split("T")[0];
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);

      const { data: activities, error: actError } = await serviceSupabase
        .from("external_activities")
        .select(`
          id, source, external_id, sport_type, name,
          local_date, start_time, duration_seconds, elapsed_time_seconds,
          distance_meters, elevation_gain_meters,
          average_speed_mps, max_speed_mps,
          average_heartrate, max_heartrate, has_heartrate,
          average_power, average_watts, weighted_avg_watts, max_watts,
          average_cadence, calories, kilojoules,
          map_polyline, map_summary_polyline,
          start_latlng, end_latlng,
          trainer, timezone, device_name, streams_fetched,
          splits_metric, splits_standard
        `)
        .eq("user_id", athleteId)
        .gte("local_date", df)
        .lte("local_date", dt)
        .is("deleted_at", null)
        .order("start_time", { ascending: false })
        .limit(limit);

      if (actError) throw actError;

      const enriched = (activities || []).map((a: any) => ({
        id: a.id,
        source: a.source,
        external_id: a.external_id,
        sport_type: a.sport_type,
        name: a.name,
        local_date: a.local_date,
        start_time: a.start_time,
        duration_seconds: a.duration_seconds,
        elapsed_time_seconds: a.elapsed_time_seconds,
        distance_meters: a.distance_meters,
        elevation_gain_meters: a.elevation_gain_meters,
        average_speed_mps: a.average_speed_mps,
        max_speed_mps: a.max_speed_mps,
        average_heartrate: a.average_heartrate,
        max_heartrate: a.max_heartrate,
        has_heartrate: a.has_heartrate,
        average_power: a.average_power ?? a.average_watts,
        weighted_avg_power: a.weighted_avg_watts,
        max_power: a.max_watts,
        average_cadence: a.average_cadence,
        calories: a.calories,
        kilojoules: a.kilojoules,
        map_polyline: a.map_polyline || null,
        map_summary_polyline: a.map_summary_polyline || null,
        start_latlng: a.start_latlng || null,
        end_latlng: a.end_latlng || null,
        trainer: a.trainer,
        timezone: a.timezone,
        device_name: a.device_name,
        streams_available: a.streams_fetched === true,
        splits: a.splits_metric || a.splits_standard || null,
      }));

      const totalDistance = enriched.reduce((s: number, a: any) => s + (a.distance_meters || 0), 0);
      const totalDuration = enriched.reduce((s: number, a: any) => s + (a.duration_seconds || 0), 0);

      return new Response(JSON.stringify({
        athlete_id: athleteId,
        date_from: df,
        date_to: dt,
        activities: enriched,
        summary: {
          count: enriched.length,
          total_distance_meters: totalDistance,
          total_duration_seconds: totalDuration,
          with_map: enriched.filter((a: any) => a.map_polyline).length,
          with_heartrate: enriched.filter((a: any) => a.has_heartrate).length,
          sources: [...new Set(enriched.map((a: any) => a.source))],
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // GET /endurance-satellite-bridge/athlete-profile
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "athlete-profile") {
      const { data: profile, error } = await serviceSupabase
        .from("profiles")
        .select("id, full_name, email, sport, date_of_birth, gender, role, weight_kg, height_cm")
        .eq("id", athleteId)
        .maybeSingle();
      if (error) throw error;
      return new Response(JSON.stringify({ profile }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // GET /endurance-satellite-bridge/training-schedule
    // Returns upcoming athlete_workouts + external_endurance_plans
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "training-schedule") {
      const today = new Date().toISOString().split("T")[0];
      const { data: workouts, error: wError } = await serviceSupabase
        .from("athlete_workouts")
        .select(`
          id, scheduled_date, status,
          workouts (id, title, workout_type, duration_minutes, estimated_tss)
        `)
        .eq("athlete_id", athleteId)
        .gte("scheduled_date", today)
        .order("scheduled_date", { ascending: true })
        .limit(30);
      if (wError) throw wError;

      const { data: endurancePlans, error: epError } = await serviceSupabase
        .from("external_endurance_plans")
        .select("id, plan_data, week_start_date, planner_source")
        .eq("athlete_id", athleteId)
        .order("week_start_date", { ascending: false })
        .limit(4);
      if (epError) throw epError;

      return new Response(JSON.stringify({
        scheduled_workouts: workouts || [],
        endurance_plans: endurancePlans || [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // GET /endurance-satellite-bridge/endurance-workouts
    // Returns individual scheduled endurance workouts
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "endurance-workouts") {
      const { data, error } = await serviceSupabase
        .from("external_endurance_workouts")
        .select("*")
        .eq("athlete_id", athleteId)
        .order("scheduled_date", { ascending: true })
        .limit(60);
      if (error) throw error;
      return new Response(JSON.stringify({ workouts: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // GET /endurance-satellite-bridge/endurance-data
    // Returns endurance plans pushed by the endurance planner
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "endurance-data") {
      const { data, error } = await serviceSupabase
        .from("external_endurance_plans")
        .select("*")
        .eq("athlete_id", athleteId)
        .order("week_start_date", { ascending: false })
        .limit(8);
      if (error) throw error;
      return new Response(JSON.stringify({ plans: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // GET /endurance-satellite-bridge/completed-workouts
    // Returns training logs for the athlete
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "completed-workouts") {
      let query = serviceSupabase
        .from("training_logs")
        .select("id, training_date, duration_minutes, distance_km, avg_heart_rate, avg_power_watts, tss, rpe, workout_type, notes")
        .eq("athlete_id", athleteId)
        .order("training_date", { ascending: false });
      if (dateFrom) query = query.gte("training_date", dateFrom);
      if (dateTo) query = query.lte("training_date", dateTo);
      const { data, error } = await query.limit(90);
      if (error) throw error;
      return new Response(JSON.stringify({ training_logs: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // GET /endurance-satellite-bridge/biological-passport
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "biological-passport") {
      const { data, error } = await serviceSupabase
        .from("biological_passports")
        .select("*")
        .eq("athlete_id", athleteId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return new Response(JSON.stringify({ passport: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // GET /endurance-satellite-bridge/wellness
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "wellness") {
      let query = serviceSupabase
        .from("wellness_checkins")
        .select("*")
        .eq("athlete_id", athleteId)
        .order("checkin_date", { ascending: false });
      if (dateFrom) query = query.gte("checkin_date", dateFrom);
      if (dateTo) query = query.lte("checkin_date", dateTo);
      const { data, error } = await query.limit(30);
      if (error) throw error;
      return new Response(JSON.stringify({ checkins: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // GET /endurance-satellite-bridge/athlete-habits
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "athlete-habits") {
      const { data, error } = await serviceSupabase
        .from("user_habits")
        .select(`
          id, habit_template_id, is_active, created_at,
          habit_templates (id, name, description, category, icon)
        `)
        .eq("user_id", athleteId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ habits: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // GET /endurance-satellite-bridge/anthropometry
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "anthropometry") {
      const { data, error } = await serviceSupabase
        .from("anthropometry_raw_measurements")
        .select("*")
        .eq("user_id", athleteId)
        .order("measurement_date", { ascending: false })
        .limit(10);
      if (error) throw error;
      return new Response(JSON.stringify({ measurements: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // GET /endurance-satellite-bridge/tdee
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "tdee") {
      const { data, error } = await serviceSupabase
        .from("tdee_configs")
        .select("*")
        .eq("athlete_id", athleteId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return new Response(JSON.stringify({ tdee: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // POST /endurance-satellite-bridge/push-endurance-plan
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "push-endurance-plan" && req.method === "POST") {
      const body = await req.json();
      const { week_start_date, plan_data, planner_source } = body;
      if (!week_start_date || !plan_data) {
        return new Response(JSON.stringify({ error: "week_start_date and plan_data are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await serviceSupabase
        .from("external_endurance_plans")
        .upsert({
          athlete_id: athleteId,
          week_start_date,
          plan_data,
          planner_source: planner_source || "endurance_satellite",
          pushed_by: userId || plannerInfo?.id || null,
        }, { onConflict: "athlete_id,week_start_date,planner_source" })
        .select("id")
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, id: data.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // POST /endurance-satellite-bridge/push-endurance-workout
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "push-endurance-workout" && req.method === "POST") {
      const body = await req.json();
      const { scheduled_date, workout_data, external_id } = body;
      if (!scheduled_date || !workout_data) {
        return new Response(JSON.stringify({ error: "scheduled_date and workout_data are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await serviceSupabase
        .from("external_endurance_workouts")
        .upsert({
          athlete_id: athleteId,
          scheduled_date,
          workout_data,
          external_id: external_id || null,
          pushed_by: userId || plannerInfo?.id || null,
        }, { onConflict: "athlete_id,scheduled_date,external_id" })
        .select("id")
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, id: data.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // POST /endurance-satellite-bridge/push-endurance-workouts (batch)
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "push-endurance-workouts" && req.method === "POST") {
      const body = await req.json();
      const { workouts } = body;
      if (!Array.isArray(workouts) || workouts.length === 0) {
        return new Response(JSON.stringify({ error: "workouts array is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const rows = workouts.map((w: any) => ({
        athlete_id: athleteId,
        scheduled_date: w.scheduled_date,
        workout_data: w.workout_data,
        external_id: w.external_id || null,
        pushed_by: userId || plannerInfo?.id || null,
      }));
      const { data, error } = await serviceSupabase
        .from("external_endurance_workouts")
        .upsert(rows, { onConflict: "athlete_id,scheduled_date,external_id" })
        .select("id");
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, count: data?.length || 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // DELETE /endurance-satellite-bridge/delete-endurance-workout
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "delete-endurance-workout" && req.method === "DELETE") {
      const body = await req.json();
      const { workout_id } = body;
      if (!workout_id) {
        return new Response(JSON.stringify({ error: "workout_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await serviceSupabase
        .from("external_endurance_workouts")
        .delete()
        .eq("id", workout_id)
        .eq("athlete_id", athleteId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // POST /endurance-satellite-bridge/push-training-log
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "push-training-log" && req.method === "POST") {
      const body = await req.json();
      const { training_date, duration_minutes, distance_km, avg_heart_rate, avg_power_watts, tss, rpe, workout_type, notes } = body;
      if (!training_date) {
        return new Response(JSON.stringify({ error: "training_date is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await serviceSupabase
        .from("training_logs")
        .insert({
          athlete_id: athleteId,
          training_date,
          duration_minutes: duration_minutes || null,
          distance_km: distance_km || null,
          avg_heart_rate: avg_heart_rate || null,
          avg_power_watts: avg_power_watts || null,
          tss: tss || null,
          rpe: rpe || null,
          workout_type: workout_type || "endurance",
          notes: notes || null,
          source: "endurance_satellite",
        })
        .select("id")
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, id: data.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown endpoint. Use: activities, athlete-profile, training-schedule, endurance-workouts, endurance-data, completed-workouts, biological-passport, wellness, athlete-habits, anthropometry, tdee, push-endurance-plan, push-endurance-workout, push-endurance-workouts, delete-endurance-workout, push-training-log" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
