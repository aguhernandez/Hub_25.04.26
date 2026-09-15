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
  // Try hash-based lookup first
  const tokenHash = await hashToken(token);
  const { data: hashed } = await serviceSupabase
    .from("external_planner_tokens")
    .select("id, planner_type, planner_name")
    .eq("token_hash", tokenHash)
    .eq("is_active", true)
    .maybeSingle();

  if (hashed) {
    await serviceSupabase
      .from("external_planner_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", hashed.id);
    return hashed;
  }

  // Fallback: try raw token lookup
  const { data: raw } = await serviceSupabase
    .from("external_planner_tokens")
    .select("id, planner_type, planner_name")
    .eq("token_raw", token)
    .eq("is_active", true)
    .maybeSingle();

  if (raw) {
    await serviceSupabase
      .from("external_planner_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", raw.id);
    return raw;
  }

  // Fallback: try admin_config table
  const { data: configRow } = await serviceSupabase
    .from("admin_config")
    .select("value")
    .eq("key", "hub_planner_token")
    .maybeSingle();

  if (configRow && configRow.value === token) {
    return { id: "admin-config", planner_type: "endurance", planner_name: "Endurance Planner" };
  }

  return null;
}

// Build enriched gps_track from activity streams
function buildGpsTrack(streams: any, activity: any): any[] {
  if (!streams) return [];
  const track: any[] = [];
  const timeArr = streams.time_stream || [];
  const latlngArr = streams.latlng_stream || [];
  const altArr = streams.altitude_stream || [];
  const distArr = streams.distance_stream || [];
  const hrArr = streams.heartrate_stream || [];
  const powerArr = streams.watts_stream || [];
  const cadArr = streams.cadence_stream || [];
  const velArr = streams.velocity_smooth_stream || [];
  const len = timeArr.length || latlngArr.length || altArr.length || 0;

  for (let i = 0; i < len; i++) {
    const latlng = latlngArr[i];
    track.push({
      lat: latlng ? (typeof latlng === "string" ? parseFloat(latlng.split(",")[0]) : latlng[0]) : null,
      lng: latlng ? (typeof latlng === "string" ? parseFloat(latlng.split(",")[1]) : latlng[1]) : null,
      altitude_m: altArr[i] ?? null,
      timestamp: timeArr[i] ?? null,
      speed_kmh: velArr[i] != null ? velArr[i] * 3.6 : null,
      heart_rate: hrArr[i] ?? null,
      power_watts: powerArr[i] ?? null,
      cadence: cadArr[i] ?? null,
      distance_m: distArr[i] ?? null,
    });
  }
  return track;
}

// Build zone distribution from time_in_zones
function buildZoneDistribution(timeInZones: any): any[] {
  if (!timeInZones) return [];
  const zoneNames = ["Z1 Recovery", "Z2 Endurance", "Z3 Tempo", "Z4 Threshold", "Z5 VO2max", "Z6 Anaerobic"];
  const zoneColors = ["#3b82f6", "#22c55e", "#eab308", "#f97316", "#ef4444", "#a855f7"];
  if (Array.isArray(timeInZones)) {
    return timeInZones.map((z: any, i: number) => ({
      zone: z.zone || i + 1,
      name: z.name || zoneNames[i] || `Zone ${i + 1}`,
      color: z.color || zoneColors[i] || "#6b7280",
      planned_percent: z.planned_percent ?? null,
      actual_percent: z.actual_percent ?? null,
      actual_seconds: z.actual_seconds ?? z.seconds ?? null,
      within_target: z.within_target ?? null,
    }));
  }
  if (typeof timeInZones === "object") {
    return Object.entries(timeInZones).map(([key, val]: [string, any], i: number) => ({
      zone: i + 1,
      name: key || zoneNames[i] || `Zone ${i + 1}`,
      color: zoneColors[i] || "#6b7280",
      planned_percent: null,
      actual_percent: null,
      actual_seconds: typeof val === "number" ? val : val?.seconds ?? null,
      within_target: null,
    }));
  }
  return [];
}

// Build activity log from splits
function buildActivityLog(splits: any, activity: any): any[] {
  if (!splits) return [];
  if (Array.isArray(splits)) {
    return splits.map((s: any, i: number) => ({
      timestamp: s.elapsed_time ?? s.time ?? null,
      type: "split",
      label: `Split ${i + 1}`,
      value: s.distance ?? s.distance_m ?? null,
      duration_s: s.elapsed_time ?? s.moving_time ?? s.duration ?? null,
      avg_hr: s.average_heartrate ?? s.avg_hr ?? null,
      avg_power: s.average_watts ?? s.avg_power ?? null,
      avg_speed: s.average_speed ?? s.avg_speed_mps ?? null,
      compliance: null,
    }));
  }
  return [];
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
    const logId = url.searchParams.get("log_id");

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

    if (!athleteId) {
      return new Response(JSON.stringify({ error: "athlete_id or athlete_email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ════════════════════════════════════════════════════════════════
    // GET /endurance-satellite-bridge/training-schedule
    // ════════════════════════════════════════════════════════════════
    if (endpoint === "training-schedule") {
      const df = dateFrom || new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
      const dt = dateTo || new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];

      // 1. Get athlete_workouts with workout details
      let workoutQuery = serviceSupabase
        .from("athlete_workouts")
        .select(`
          id, scheduled_date, status, notes, rpe, energy_level, pain_level, mood,
          feedback_notes, feedback_submitted_at, source, external_id, raw_description,
          external_title, assignment_type, team_id,
          workouts (id, name, description, duration_minutes, difficulty)
        `)
        .eq("athlete_id", athleteId)
        .gte("scheduled_date", df)
        .lte("scheduled_date", dt)
        .order("scheduled_date", { ascending: true });

      const { data: athleteWorkouts, error: wError } = await workoutQuery;
      if (wError) throw wError;

      // 2. Get external_endurance_workouts
      const { data: enduranceWorkouts, error: ewError } = await serviceSupabase
        .from("external_endurance_workouts")
        .select("*")
        .eq("athlete_id", athleteId)
        .gte("scheduled_date", df)
        .lte("scheduled_date", dt)
        .order("scheduled_date", { ascending: true });
      if (ewError) throw ewError;

      // 3. Get external_endurance_plans (weekly plans)
      const { data: endurancePlans, error: epError } = await serviceSupabase
        .from("external_endurance_plans")
        .select("*")
        .eq("athlete_id", athleteId)
        .order("week_start_date", { ascending: false })
        .limit(4);
      if (epError) throw epError;

      // 4. Get completed training_logs for the same period
      const { data: completedLogs, error: clError } = await serviceSupabase
        .from("training_logs")
        .select(`
          id, athlete_id, athlete_workout_id, logged_at, max_heart_rate, max_power_watts,
          normalized_power_watts, if_value, elevation_gain_m, avg_cadence, avg_speed_kmh,
          calories, external_source, external_activity_id, notes, rpe, bar_speed
        `)
        .eq("athlete_id", athleteId)
        .gte("logged_at", df)
        .lte("logged_at", dt + "T23:59:59")
        .order("logged_at", { ascending: false });
      if (clError) throw clError;

      // 5. Get endurance_completed_workouts
      const { data: enduranceCompleted, error: ecError } = await serviceSupabase
        .from("endurance_completed_workouts")
        .select("*")
        .eq("athlete_id", athleteId)
        .gte("scheduled_date", df)
        .lte("scheduled_date", dt)
        .order("scheduled_date", { ascending: false });
      if (ecError) throw ecError;

      // Build enriched schedule
      const schedule: any[] = [];

      // Process athlete_workouts
      for (const aw of (athleteWorkouts || [])) {
        const workout = (aw as any).workouts;
        const matchingLog = (completedLogs || []).find((l: any) => l.athlete_workout_id === aw.id);
        const isCompleted = aw.status === "completed" || !!matchingLog;

        schedule.push({
          id: aw.id,
          scheduled_date: aw.scheduled_date,
          status: aw.status || "pending",
          workout: workout ? {
            id: workout.id,
            name: workout.name,
            workout_type: workout.difficulty,
            duration_minutes: workout.duration_minutes,
            description: workout.description,
          } : null,
          name: aw.external_title || workout?.name || null,
          sport: null,
          planned_duration_minutes: workout?.duration_minutes || null,
          planned_impulse: null,
          session_type: aw.assignment_type || null,
          target_zones: null,
          intensity_basis: null,
          planner_source: aw.source || "hub",
          workout_source: aw.source || "hub",
          intensity_color: null,
          intensity_label: null,
          ...(isCompleted && matchingLog ? {
            actual_duration_minutes: null,
            actual_distance_km: null,
            actual_avg_hr: null,
            actual_max_hr: matchingLog.max_heart_rate,
            actual_avg_power_watts: matchingLog.normalized_power_watts,
            actual_max_power_watts: matchingLog.max_power_watts,
            actual_avg_cadence: matchingLog.avg_cadence,
            actual_avg_speed_kmh: matchingLog.avg_speed_kmh,
            actual_elevation_gain_m: matchingLog.elevation_gain_m,
            actual_calories: matchingLog.calories,
            actual_tss: null,
            actual_impulse: null,
            rpe: matchingLog.rpe || aw.rpe,
            compliance_percent: null,
            athlete_notes: matchingLog.notes || aw.notes,
            athlete_feedback: aw.feedback_notes,
            athlete_feeling: aw.energy_level,
            coach_notes: null,
            training_log_id: matchingLog.id,
          } : {}),
        });
      }

      // Process external_endurance_workouts
      for (const ew of (enduranceWorkouts || [])) {
        const wd = (ew as any).workout_data;
        const matchingCompleted = (enduranceCompleted || []).find((c: any) => c.planned_workout_id === ew.id);
        schedule.push({
          id: ew.id,
          scheduled_date: ew.scheduled_date,
          status: matchingCompleted ? "completed" : "pending",
          workout: {
            id: ew.id,
            name: wd?.name || wd?.title || "Endurance Workout",
            workout_type: wd?.sport || wd?.type || "endurance",
            duration_minutes: wd?.duration_minutes || null,
            description: wd?.description || wd?.notes || null,
          },
          name: wd?.name || wd?.title || "Endurance Workout",
          sport: wd?.sport || null,
          planned_duration_minutes: wd?.duration_minutes || null,
          planned_impulse: wd?.planned_impulse || wd?.tss || null,
          session_type: wd?.session_type || null,
          target_zones: wd?.target_zones || null,
          intensity_basis: wd?.intensity_basis || null,
          planner_source: ew.planner_source || "endurance_satellite",
          workout_source: "endurance_satellite",
          intensity_color: wd?.intensity_color || null,
          intensity_label: wd?.intensity_label || null,
          ...(matchingCompleted ? {
            actual_duration_minutes: matchingCompleted.duration_seconds ? Math.round(matchingCompleted.duration_seconds / 60) : null,
            actual_distance_km: null,
            actual_avg_hr: null,
            actual_max_hr: null,
            actual_avg_power_watts: null,
            actual_max_power_watts: null,
            actual_avg_cadence: null,
            actual_avg_speed_kmh: null,
            actual_elevation_gain_m: null,
            actual_calories: null,
            actual_tss: null,
            actual_impulse: null,
            rpe: matchingCompleted.rpe,
            compliance_percent: null,
            athlete_notes: matchingCompleted.notes,
            athlete_feedback: null,
            athlete_feeling: matchingCompleted.effort,
            coach_notes: null,
            training_log_id: matchingCompleted.id,
          } : {}),
        });
      }

      // Process external_endurance_plans (weekly plan days)
      for (const ep of (endurancePlans || [])) {
        const planData = (ep as any).plan_data;
        if (planData?.days && Array.isArray(planData.days)) {
          for (const day of planData.days) {
            if (day.date && day.date >= df && day.date <= dt) {
              schedule.push({
                id: `${ep.id}-${day.date}`,
                scheduled_date: day.date,
                status: day.completed ? "completed" : "pending",
                workout: {
                  id: null,
                  name: day.workout_name || day.title || `Day ${day.day_index ?? ""}`,
                  workout_type: day.sport || day.type || "endurance",
                  duration_minutes: day.planned_duration_minutes || day.duration_minutes || null,
                  description: day.description || day.notes || null,
                },
                name: day.workout_name || day.title || null,
                sport: day.sport || null,
                planned_duration_minutes: day.planned_duration_minutes || day.duration_minutes || null,
                planned_impulse: day.planned_impulse || day.tss || null,
                session_type: day.session_type || null,
                target_zones: day.target_zones || null,
                intensity_basis: day.intensity_basis || null,
                planner_source: (ep as any).planner_source || "endurance_satellite",
                workout_source: "endurance_satellite",
                intensity_color: day.intensity_color || day.difficulty_color || null,
                intensity_label: day.intensity_label || day.difficulty || null,
              });
            }
          }
        }
      }

      return new Response(JSON.stringify({ schedule }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ════════════════════════════════════════════════════════════════
    // GET /endurance-satellite-bridge/activities
    // ════════════════════════════════════════════════════════════════
    if (endpoint === "activities") {
      const df = dateFrom || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
      const dt = dateTo || new Date().toISOString().split("T")[0];

      const { data: activities, error: actError } = await serviceSupabase
        .from("external_activities")
        .select(`
          id, user_id, source, external_id, sport_type, name,
          start_time, local_date, duration_seconds, elapsed_time_seconds,
          distance_meters, elevation_gain_meters,
          average_speed_mps, max_speed_mps,
          average_heartrate, max_heartrate, has_heartrate,
          average_power, average_watts, weighted_avg_watts, max_watts, has_power,
          average_cadence, calories, kilojoules,
          map_polyline, map_summary_polyline,
          start_latlng, end_latlng,
          trainer, timezone, device_name, streams_fetched,
          splits_metric, splits_standard, time_in_zones,
          raw_data, created_at, updated_at
        `)
        .eq("user_id", athleteId)
        .gte("local_date", df)
        .lte("local_date", dt)
        .is("deleted_at", null)
        .order("start_time", { ascending: false })
        .limit(100);

      if (actError) throw actError;

      // Fetch streams for each activity
      const activityIds = (activities || []).map((a: any) => a.id);
      let streamsMap: Record<string, any> = {};
      if (activityIds.length > 0) {
        const { data: streams } = await serviceSupabase
          .from("activity_streams")
          .select("*")
          .in("activity_id", activityIds);
        for (const s of (streams || [])) {
          streamsMap[(s as any).activity_id] = s;
        }
      }

      const enriched = (activities || []).map((a: any) => {
        const streams = streamsMap[a.id];
        const gpsTrack = buildGpsTrack(streams, a);
        const zoneDist = buildZoneDistribution(a.time_in_zones);
        const activityLog = buildActivityLog(a.splits_metric || a.splits_standard, a);

        return {
          id: a.id,
          user_id: a.user_id,
          name: a.name,
          source: a.source,
          sport_type: a.sport_type,
          distance_meters: a.distance_meters,
          duration_seconds: a.duration_seconds,
          calories: a.calories,
          start_time: a.start_time,
          local_date: a.local_date,
          raw_data: a.raw_data,
          created_at: a.created_at,
          updated_at: a.updated_at,
          // Enriched data
          elapsed_time_seconds: a.elapsed_time_seconds,
          elevation_gain_meters: a.elevation_gain_meters,
          average_speed_mps: a.average_speed_mps,
          max_speed_mps: a.max_speed_mps,
          average_heartrate: a.average_heartrate,
          max_heartrate: a.max_heartrate,
          has_heartrate: a.has_heartrate,
          average_power: a.average_power ?? a.average_watts,
          weighted_avg_power: a.weighted_avg_watts,
          max_power: a.max_watts,
          has_power: a.has_power,
          average_cadence: a.average_cadence,
          kilojoules: a.kilojoules,
          map_polyline: a.map_polyline || null,
          map_summary_polyline: a.map_summary_polyline || null,
          start_latlng: a.start_latlng || null,
          end_latlng: a.end_latlng || null,
          trainer: a.trainer,
          timezone: a.timezone,
          device_name: a.device_name,
          streams_available: a.streams_fetched === true,
          gps_track: gpsTrack,
          zone_distribution: zoneDist,
          activity_log: activityLog,
          splits: a.splits_metric || a.splits_standard || null,
        };
      });

      return new Response(JSON.stringify({ activities: enriched }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ════════════════════════════════════════════════════════════════
    // GET /endurance-satellite-bridge/training-logs
    // ════════════════════════════════════════════════════════════════
    if (endpoint === "training-logs") {
      const df = dateFrom || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
      const dt = dateTo || new Date().toISOString().split("T")[0];

      const { data: logs, error: logError } = await serviceSupabase
        .from("training_logs")
        .select(`
          id, athlete_id, athlete_workout_id, logged_at, max_heart_rate, max_power_watts,
          normalized_power_watts, if_value, elevation_gain_m, avg_cadence, avg_speed_kmh,
          calories, external_source, external_activity_id, notes, rpe, bar_speed,
          set_number, reps_completed, weight_used, rir
        `)
        .eq("athlete_id", athleteId)
        .gte("logged_at", df + "T00:00:00")
        .lte("logged_at", dt + "T23:59:59")
        .order("logged_at", { ascending: false })
        .limit(100);

      if (logError) throw logError;

      // Get linked external_activities for enrichment
      const externalActivityIds = (logs || []).filter((l: any) => l.external_activity_id).map((l: any) => l.external_activity_id);
      let extActMap: Record<string, any> = {};
      if (externalActivityIds.length > 0) {
        const { data: extActs } = await serviceSupabase
          .from("external_activities")
          .select("*")
          .in("external_id", externalActivityIds);
        for (const ea of (extActs || [])) {
          extActMap[(ea as any).external_id] = ea;
        }
      }

      // Get streams for those external activities
      const eaUuids = Object.values(extActMap).map((ea: any) => ea.id);
      let streamsMap: Record<string, any> = {};
      if (eaUuids.length > 0) {
        const { data: streams } = await serviceSupabase
          .from("activity_streams")
          .select("*")
          .in("activity_id", eaUuids);
        for (const s of (streams || [])) {
          streamsMap[(s as any).activity_id] = s;
        }
      }

      // Get athlete_workouts for workout_name
      const awIds = (logs || []).filter((l: any) => l.athlete_workout_id).map((l: any) => l.athlete_workout_id);
      let awMap: Record<string, any> = {};
      if (awIds.length > 0) {
        const { data: aws } = await serviceSupabase
          .from("athlete_workouts")
          .select(`
            id, scheduled_date, status, external_title, raw_description,
            workouts (id, name, description, duration_minutes)
          `)
          .in("id", awIds);
        for (const aw of (aws || [])) {
          awMap[(aw as any).id] = aw;
        }
      }

      const enrichedLogs = (logs || []).map((l: any) => {
        const extAct = l.external_activity_id ? extActMap[l.external_activity_id] : null;
        const streams = extAct ? streamsMap[extAct.id] : null;
        const aw = l.athlete_workout_id ? awMap[l.athlete_workout_id] : null;
        const workout = aw ? (aw as any).workouts : null;

        return {
          id: l.id,
          training_date: l.logged_at?.split("T")[0] || null,
          duration_minutes: extAct?.duration_seconds ? Math.round(extAct.duration_seconds / 60) : null,
          distance_km: extAct?.distance_meters ? extAct.distance_meters / 1000 : null,
          avg_heart_rate: extAct?.average_heartrate || null,
          max_heart_rate: l.max_heart_rate || extAct?.max_heartrate || null,
          avg_power_watts: l.normalized_power_watts || extAct?.average_power || extAct?.average_watts || null,
          max_power_watts: l.max_power_watts || extAct?.max_watts || null,
          tss: null,
          rpe: l.rpe || null,
          workout_type: extAct?.sport_type || (workout?.difficulty) || "training",
          notes: l.notes || null,
          session_impulse: null,
          relative_intensity: l.if_value || null,
          elevation_gain_m: l.elevation_gain_m || extAct?.elevation_gain_meters || null,
          avg_cadence: l.avg_cadence || extAct?.average_cadence || null,
          avg_speed_kmh: l.avg_speed_kmh || (extAct?.average_speed_mps ? extAct.average_speed_mps * 3.6 : null) || null,
          calories: l.calories || extAct?.calories || null,
          external_source: l.external_source || extAct?.source || null,
          external_activity_id: l.external_activity_id || null,
          athlete_notes: l.notes || null,
          athlete_feedback: aw?.feedback_notes || null,
          athlete_feeling: aw?.energy_level || null,
          compliance_percent: null,
          workout_name: aw?.external_title || workout?.name || extAct?.name || null,
          gps_track: streams ? buildGpsTrack(streams, extAct) : [],
          zone_distribution: extAct ? buildZoneDistribution(extAct.time_in_zones) : [],
          activity_log: extAct ? buildActivityLog(extAct.splits_metric || extAct.splits_standard, extAct) : [],
        };
      });

      return new Response(JSON.stringify({ logs: enrichedLogs }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ════════════════════════════════════════════════════════════════
    // GET /endurance-satellite-bridge/training-log (single)
    // ════════════════════════════════════════════════════════════════
    if (endpoint === "training-log" && logId) {
      const { data: log, error: logError } = await serviceSupabase
        .from("training_logs")
        .select("*")
        .eq("id", logId)
        .eq("athlete_id", athleteId)
        .maybeSingle();

      if (logError) throw logError;
      if (!log) {
        return new Response(JSON.stringify({ error: "Log not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Enrich with external activity + streams
      let extAct: any = null;
      let streams: any = null;
      let aw: any = null;

      if (log.external_activity_id) {
        const { data: ea } = await serviceSupabase
          .from("external_activities")
          .select("*")
          .eq("external_id", log.external_activity_id)
          .maybeSingle();
        extAct = ea;
        if (extAct) {
          const { data: s } = await serviceSupabase
            .from("activity_streams")
            .select("*")
            .eq("activity_id", extAct.id)
            .maybeSingle();
          streams = s;
        }
      }

      if (log.athlete_workout_id) {
        const { data: awData } = await serviceSupabase
          .from("athlete_workouts")
          .select(`
            id, scheduled_date, status, external_title, raw_description,
            rpe, energy_level, pain_level, mood, feedback_notes,
            workouts (id, name, description, duration_minutes)
          `)
          .eq("id", log.athlete_workout_id)
          .maybeSingle();
        aw = awData;
      }

      const workout = aw ? (aw as any).workouts : null;
      const result = {
        id: log.id,
        training_date: log.logged_at?.split("T")[0] || null,
        duration_minutes: extAct?.duration_seconds ? Math.round(extAct.duration_seconds / 60) : null,
        distance_km: extAct?.distance_meters ? extAct.distance_meters / 1000 : null,
        avg_heart_rate: extAct?.average_heartrate || null,
        max_heart_rate: log.max_heart_rate || extAct?.max_heartrate || null,
        avg_power_watts: log.normalized_power_watts || extAct?.average_power || extAct?.average_watts || null,
        max_power_watts: log.max_power_watts || extAct?.max_watts || null,
        tss: null,
        rpe: log.rpe || aw?.rpe || null,
        workout_type: extAct?.sport_type || workout?.difficulty || "training",
        notes: log.notes || null,
        session_impulse: null,
        relative_intensity: log.if_value || null,
        elevation_gain_m: log.elevation_gain_m || extAct?.elevation_gain_meters || null,
        avg_cadence: log.avg_cadence || extAct?.average_cadence || null,
        avg_speed_kmh: log.avg_speed_kmh || (extAct?.average_speed_mps ? extAct.average_speed_mps * 3.6 : null) || null,
        calories: log.calories || extAct?.calories || null,
        external_source: log.external_source || extAct?.source || null,
        external_activity_id: log.external_activity_id || null,
        athlete_notes: log.notes || null,
        athlete_feedback: aw?.feedback_notes || null,
        athlete_feeling: aw?.energy_level || null,
        compliance_percent: null,
        workout_name: aw?.external_title || workout?.name || extAct?.name || null,
        gps_track: streams ? buildGpsTrack(streams, extAct) : [],
        zone_distribution: extAct ? buildZoneDistribution(extAct.time_in_zones) : [],
        activity_log: extAct ? buildActivityLog(extAct.splits_metric || extAct.splits_standard, extAct) : [],
      };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ════════════════════════════════════════════════════════════════
    // GET /endurance-satellite-bridge/athlete-profile
    // ════════════════════════════════════════════════════════════════
    if (endpoint === "athlete-profile") {
      const { data: profile, error: pError } = await serviceSupabase
        .from("profiles")
        .select("id, full_name, email, sport, date_of_birth, gender, role, weight_kg, height_cm")
        .eq("id", athleteId)
        .maybeSingle();
      if (pError) throw pError;

      let bodyComposition = null;
      const { data: bio } = await serviceSupabase
        .from("bioimpedance_measurements")
        .select("weight, height, adipose_tissue_percent, adipose_tissue_kg, muscle_mass_percent, muscle_mass_kg, measurement_date")
        .eq("user_id", athleteId)
        .order("measurement_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (bio) {
        bodyComposition = {
          weight_kg: bio.weight,
          height_cm: bio.height,
          fat_percent: bio.adipose_tissue_percent,
          fat_mass_kg: bio.adipose_tissue_kg,
          lean_mass_kg: bio.muscle_mass_kg,
          muscle_mass_percent: bio.muscle_mass_percent,
          measurement_date: bio.measurement_date,
        };
      }

      let nutritionTargets = null;
      const { data: tdee } = await serviceSupabase
        .from("tdee_configs")
        .select("*")
        .eq("athlete_id", athleteId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (tdee) {
        nutritionTargets = {
          tdee: tdee.tdee_value || tdee.tdee || null,
          target_calories: tdee.target_calories || null,
          protein_g: tdee.protein_g || null,
          carbs_g: tdee.carbs_g || null,
          fat_g: tdee.fat_g || null,
        };
      }

      return new Response(JSON.stringify({
        athlete: {
          id: profile?.id,
          full_name: profile?.full_name,
          sport: profile?.sport,
          weight_kg: profile?.weight_kg,
          height_cm: profile?.height_cm,
          birth_date: profile?.date_of_birth,
          gender: profile?.gender,
          role: profile?.role,
        },
        body_composition: bodyComposition,
        nutrition_targets: nutritionTargets,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ════════════════════════════════════════════════════════════════
    // GET /endurance-satellite-bridge/biological-passport
    // ════════════════════════════════════════════════════════════════
    if (endpoint === "biological-passport") {
      const { data: activePassport, error: bpError } = await serviceSupabase
        .from("biological_passports")
        .select("*")
        .eq("athlete_id", athleteId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (bpError) throw bpError;

      const { data: history } = await serviceSupabase
        .from("biological_passports")
        .select("id, measurement_date, source, status, version_number, ftp_watts, vo2max, critical_power")
        .eq("athlete_id", athleteId)
        .order("created_at", { ascending: false })
        .limit(10);

      return new Response(JSON.stringify({
        active_passport: activePassport || null,
        passport_history: history || [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ════════════════════════════════════════════════════════════════
    // POST /endurance-satellite-bridge/push-endurance-plan
    // ════════════════════════════════════════════════════════════════
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

    // ════════════════════════════════════════════════════════════════
    // POST /endurance-satellite-bridge/push-training-log
    // ════════════════════════════════════════════════════════════════
    if (endpoint === "push-training-log" && req.method === "POST") {
      const body = await req.json();
      const { training_date, duration_minutes, distance_km, avg_heart_rate, max_heart_rate, avg_power_watts, max_power_watts, tss, rpe, workout_type, notes, session_impulse, relative_intensity, elevation_gain_m, avg_cadence, avg_speed_kmh, calories, external_source, external_activity_id, athlete_notes, athlete_feedback, athlete_feeling } = body;
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
          logged_at: training_date,
          max_heart_rate: max_heart_rate || null,
          max_power_watts: max_power_watts || null,
          normalized_power_watts: avg_power_watts || null,
          if_value: relative_intensity || null,
          elevation_gain_m: elevation_gain_m || null,
          avg_cadence: avg_cadence || null,
          avg_speed_kmh: avg_speed_kmh || null,
          calories: calories || null,
          external_source: external_source || "endurance_satellite",
          external_activity_id: external_activity_id || null,
          notes: notes || athlete_notes || null,
          rpe: rpe || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, id: data.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ════════════════════════════════════════════════════════════════
    // POST /endurance-satellite-bridge/push-tags
    // ════════════════════════════════════════════════════════════════
    if (endpoint === "push-tags" && req.method === "POST") {
      const body = await req.json();
      const { tags } = body;
      if (!Array.isArray(tags)) {
        return new Response(JSON.stringify({ error: "tags array is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Store tags in satellite_tags table
      const tagRows = tags.map((t: any) => ({
        name: t.name || t.label || String(t),
        color: t.color || null,
        category: t.category || "endurance",
        created_by: userId || null,
      }));
      const { data, error } = await serviceSupabase
        .from("satellite_tags")
        .upsert(tagRows, { onConflict: "name,category" })
        .select("id");
      if (error) {
        // Non-fatal: tags may not exist in this schema version
        return new Response(JSON.stringify({ success: true, count: 0, note: "tags stored partially" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, count: data?.length || 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ════════════════════════════════════════════════════════════════
    // POST /endurance-satellite-bridge/push-endurance-workout
    // ════════════════════════════════════════════════════════════════
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

    // ════════════════════════════════════════════════════════════════
    // POST /endurance-satellite-bridge/push-endurance-workouts (batch)
    // ════════════════════════════════════════════════════════════════
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

    // ════════════════════════════════════════════════════════════════
    // DELETE /endurance-satellite-bridge/delete-endurance-workout
    // ════════════════════════════════════════════════════════════════
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

    // ════════════════════════════════════════════════════════════════
    // GET /endurance-satellite-bridge/endurance-workouts
    // ════════════════════════════════════════════════════════════════
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

    // ════════════════════════════════════════════════════════════════
    // GET /endurance-satellite-bridge/endurance-data
    // ════════════════════════════════════════════════════════════════
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

    // ════════════════════════════════════════════════════════════════
    // GET /endurance-satellite-bridge/wellness
    // ════════════════════════════════════════════════════════════════
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

    // ════════════════════════════════════════════════════════════════
    // GET /endurance-satellite-bridge/athlete-habits
    // ════════════════════════════════════════════════════════════════
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

    // ════════════════════════════════════════════════════════════════
    // GET /endurance-satellite-bridge/tdee
    // ════════════════════════════════════════════════════════════════
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

    return new Response(JSON.stringify({
      error: "Unknown endpoint. Available: training-schedule, activities, training-logs, training-log, athlete-profile, biological-passport, push-endurance-plan, push-training-log, push-tags, push-endurance-workout, push-endurance-workouts, delete-endurance-workout, endurance-workouts, endurance-data, wellness, athlete-habits, tdee",
    }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("endurance-satellite-bridge error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
