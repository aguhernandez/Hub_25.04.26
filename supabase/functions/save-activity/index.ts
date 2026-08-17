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
      device_name: "Asciende GPS",
      user_notes: data.notes || null,
      raw_data: {
        activity_id: activityId,
        gps_points_count: data.gpsPoints.length,
      },
      synced_at: new Date().toISOString(),
    });

    if (!extResult.ok) {
      console.error("External activity insert error (non-fatal):", extResult.text);
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
