import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GPS_CHUNK_SIZE = 2000;

interface ActivityData {
  sportType: string;
  title: string;
  notes: string;
  gpsPoints: Array<{
    latitude: number;
    longitude: number;
    altitude: number | null;
    timestamp: string;
  }>;
  distanceKm: number;
  durationSeconds: number;
  elevationGainM: number;
  isPublic: boolean;
  local_date?: string;
  planned_workout_id?: string | null;
  feedback?: {
    rpe?: number;
    energy_level?: string;
    pain_level?: string;
    mood?: string;
    feedback_notes?: string;
  };
}

async function restPost(
  supabaseUrl: string,
  serviceKey: string,
  table: string,
  body: unknown,
  prefer = "return=representation"
): Promise<{ ok: boolean; json: unknown; text: string }> {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: unknown = null;
  try { json = JSON.parse(text); } catch {}
  return { ok: res.ok, json, text };
}

async function restPatch(
  supabaseUrl: string,
  serviceKey: string,
  table: string,
  query: string,
  body: unknown
): Promise<{ ok: boolean; text: string }> {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { ok: res.ok, text };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "authentication token not found" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const data: ActivityData = await req.json();

    // Input validation
    if (!data.sportType || !data.gpsPoints || data.gpsPoints.length < 2) {
      return new Response(
        JSON.stringify({ error: "Invalid activity data: sportType and at least 2 GPS points are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
      throw new Error("Missing Supabase configuration");
    }

    // Verify user token
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user: authUser }, error: authError } = await supabaseUser.auth.getUser();

    if (authError || !authUser) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authUser.id;
    const firstTimestamp = data.gpsPoints[0].timestamp;
    const lastTimestamp = data.gpsPoints[data.gpsPoints.length - 1].timestamp;

    // ── 1. Insert activity record ──────────────────────────────────────────────
    const actResult = await restPost(supabaseUrl, supabaseServiceRoleKey, "activities", {
      user_id: userId,
      sport_type: data.sportType,
      title: data.title,
      notes: data.notes || null,
      distance_km: data.distanceKm,
      duration_seconds: data.durationSeconds,
      elevation_gain_m: data.elevationGainM,
      started_at: firstTimestamp,
      completed_at: lastTimestamp,
      is_public: data.isPublic,
    });

    if (!actResult.ok) {
      console.error("Activity insert error:", actResult.text);
      return new Response(
        JSON.stringify({ error: "Failed to save activity" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const [activity] = actResult.json as Array<{ id: string }>;
    const activityId = activity.id;

    // ── 2. Insert GPS points in chunks ─────────────────────────────────────────
    // Chunking prevents request body size limits for long activities
    let gpsInsertFailed = false;
    for (let i = 0; i < data.gpsPoints.length; i += GPS_CHUNK_SIZE) {
      const chunk = data.gpsPoints.slice(i, i + GPS_CHUNK_SIZE);
      const gpsResult = await restPost(
        supabaseUrl,
        supabaseServiceRoleKey,
        "activity_gps_points",
        chunk.map((point, idx) => ({
          activity_id: activityId,
          latitude: point.latitude,
          longitude: point.longitude,
          altitude_m: point.altitude,
          timestamp: point.timestamp,
          sequence_order: i + idx,
        })),
        ""
      );
      if (!gpsResult.ok) {
        console.error(`GPS points chunk ${i}–${i + chunk.length} insert error:`, gpsResult.text);
        gpsInsertFailed = true;
      }
    }

    // ── 2b. Compute and store stream data (time, distance, altitude, latlng, velocity) ──
    // This mirrors what Strava stores so the detail modal can show elevation/pace charts.
    const startTimeMs = new Date(firstTimestamp).getTime();
    const timeStream: number[] = [];
    const distanceStream: number[] = [];
    const altitudeStream: number[] = [];
    const latlngStream: number[][] = [];
    const velocityStream: number[] = [];
    let cumDistance = 0;
    for (let i = 0; i < data.gpsPoints.length; i++) {
      const pt = data.gpsPoints[i];
      const t = Math.round((new Date(pt.timestamp).getTime() - startTimeMs) / 1000);
      timeStream.push(t);
      altitudeStream.push(pt.altitude != null ? Math.round(pt.altitude) : 0);
      latlngStream.push([pt.latitude, pt.longitude]);
      if (i > 0) {
        const prev = data.gpsPoints[i - 1];
        const dLat = (pt.latitude - prev.latitude) * Math.PI / 180;
        const dLng = (pt.longitude - prev.longitude) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(prev.latitude * Math.PI / 180) * Math.cos(pt.latitude * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const segDist = 6371000 * c;
        cumDistance += segDist;
        const dt = t - timeStream[i - 1];
        velocityStream.push(dt > 0 ? Math.round((segDist / dt) * 10) / 10 : 0);
      } else {
        velocityStream.push(0);
      }
      distanceStream.push(Math.round(cumDistance));
    }

    // Stream insert moved after external_activities insert (see section 4b below)

    // ── 3. Insert feedback record if provided ──────────────────────────────────
    if (data.feedback) {
      const feedbackRecord: Record<string, unknown> = {
        activity_id: activityId,
        user_id: userId,
      };
      if (data.feedback.rpe != null)           feedbackRecord.rpe = data.feedback.rpe;
      if (data.feedback.energy_level)          feedbackRecord.energy_level = data.feedback.energy_level;
      if (data.feedback.pain_level)            feedbackRecord.pain_level = data.feedback.pain_level;
      if (data.feedback.mood)                  feedbackRecord.mood = data.feedback.mood;
      if (data.feedback.feedback_notes)        feedbackRecord.feedback_notes = data.feedback.feedback_notes;

      const fbResult = await restPost(
        supabaseUrl, supabaseServiceRoleKey, "activity_feedback", feedbackRecord, ""
      );
      if (!fbResult.ok) {
        // Feedback table may not exist yet — log but do not fail the whole save
        console.error("Feedback insert error (non-fatal):", fbResult.text);
      }
    }

    // ── 4. Insert external_activities entry for unified view ───────────────────
    // Encode a simplified polyline so the map has a fallback route even if
    // the client can't load individual GPS points (e.g. RLS restrictions).
    const polylinePoints = data.gpsPoints;
    const step = Math.max(1, Math.floor(polylinePoints.length / 500));
    const simplified: Array<[number, number]> = [];
    for (let i = 0; i < polylinePoints.length; i += step) {
      simplified.push([
        Math.round(polylinePoints[i].latitude * 1e5),
        Math.round(polylinePoints[i].longitude * 1e5),
      ]);
    }
    if (polylinePoints.length > 0) {
      const lastIdx = (polylinePoints.length - 1) - ((polylinePoints.length - 1) % step);
      const last = [Math.round(polylinePoints[lastIdx].latitude * 1e5), Math.round(polylinePoints[lastIdx].longitude * 1e5)];
      if (simplified.length === 0 || simplified[simplified.length - 1][0] !== last[0] || simplified[simplified.length - 1][1] !== last[1]) {
        simplified.push(last);
      }
    }
    let encodedPolyline = "";
    {
      let prevLat = 0;
      let prevLng = 0;
      for (const [latE5, lngE5] of simplified) {
        const dLat = latE5 - prevLat;
        const dLng = lngE5 - prevLng;
        const encodeNum = (num: number): string => {
          let n = num << 1;
          if (n < 0) n = ~n;
          let s = "";
          do {
            let chunk = n & 0x1f;
            n >>= 5;
            if (n > 0) chunk |= 0x20;
            s += String.fromCharCode(chunk + 63);
          } while (n > 0);
          return s;
        };
        encodedPolyline += encodeNum(dLat) + encodeNum(dLng);
        prevLat = latE5;
        prevLng = lngE5;
      }
    }
    const firstPoint = data.gpsPoints[0];
    const lastPoint = data.gpsPoints[data.gpsPoints.length - 1];

    const extResult = await restPost(supabaseUrl, supabaseServiceRoleKey, "external_activities", {
      user_id: userId,
      source: "asciende_gps",
      external_id: `gps-${activityId}`,
      sport_type: data.sportType,
      name: data.title,
      start_time: firstTimestamp,
      local_date: data.local_date || firstTimestamp.substring(0, 10),
      duration_seconds: data.durationSeconds,
      distance_meters: data.distanceKm * 1000,
      elevation_gain_meters: data.elevationGainM,
      average_speed_mps: data.durationSeconds > 0 ? (data.distanceKm * 1000) / data.durationSeconds : 0,
      max_speed_mps: velocityStream.length > 0 ? Math.max(...velocityStream) : null,
      device_name: "Asciende GPS",
      user_notes: data.notes || null,
      map_polyline: encodedPolyline,
      start_latlng: [firstPoint.latitude, firstPoint.longitude],
      end_latlng: [lastPoint.latitude, lastPoint.longitude],
      raw_data: {
        activity_id: activityId,
        gps_points_count: data.gpsPoints.length,
      },
      synced_at: new Date().toISOString(),
    });

    if (!extResult.ok) {
      console.error("External activity insert error (non-fatal):", extResult.text);
    }

    // ── 4b. Insert stream data using external_activities.id ──────────────────────
    // activity_streams.activity_id FK references external_activities.id
    let extActivityId: string | null = null;
    if (extResult.ok) {
      const [extRow] = extResult.json as Array<{ id: string }>;
      extActivityId = extRow?.id ?? null;
    }
    if (extActivityId) {
      const streamResult = await restPost(supabaseUrl, supabaseServiceRoleKey, "activity_streams", {
        activity_id: extActivityId,
        user_id: userId,
        time_stream: timeStream,
        altitude_stream: altitudeStream,
        distance_stream: distanceStream,
        latlng_stream: latlngStream,
        velocity_smooth_stream: velocityStream,
        heartrate_stream: null,
        watts_stream: null,
        cadence_stream: null,
        grade_smooth_stream: null,
        moving_stream: null,
        stream_keys: ["time", "altitude", "distance", "latlng", "velocity_smooth"],
        missing_heartrate: true,
        missing_power: true,
        missing_gps: false,
        resolution: "high",
        series_type: "time",
        fetched_at: new Date().toISOString(),
      });
      if (!streamResult.ok) {
        console.error("Stream insert error (non-fatal):", streamResult.text);
      }
    }

    // ── 5. Mark planned workout as completed ───────────────────────────────────
    if (data.planned_workout_id) {
      const completionPayload: Record<string, unknown> = {
        status: "completed",
        updated_at: new Date().toISOString(),
      };
      if (data.feedback?.rpe != null)       completionPayload.rpe = data.feedback.rpe;
      if (data.feedback?.energy_level)      completionPayload.energy_level = data.feedback.energy_level;
      if (data.feedback?.pain_level)        completionPayload.pain_level = data.feedback.pain_level;
      if (data.feedback?.mood)              completionPayload.mood = data.feedback.mood;
      if (data.feedback?.feedback_notes)    completionPayload.notes = data.feedback.feedback_notes;

      const completionResult = await restPatch(
        supabaseUrl,
        supabaseServiceRoleKey,
        "external_endurance_workouts",
        `id=eq.${data.planned_workout_id}&athlete_id=eq.${userId}`,
        completionPayload
      );
      if (!completionResult.ok) {
        console.error("Failed to mark planned workout as completed (non-fatal):", completionResult.text);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        activityId,
        gpsPointsSaved: !gpsInsertFailed,
        message: "Activity saved successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error in save-activity:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
