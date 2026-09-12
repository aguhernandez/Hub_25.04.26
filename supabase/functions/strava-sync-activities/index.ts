import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const STREAM_FETCH_DELAY_MS = 200;
const MAX_STREAMS_PER_SYNC = 20;
const MAX_DETAIL_FETCHES = 30;
const DETAIL_FETCH_DELAY_MS = 150;

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function normalizeActivityType(stravaType: string): string {
  const typeMap: Record<string, string> = {
    Run: "run", TrailRun: "run", VirtualRun: "run",
    Ride: "ride", VirtualRide: "ride", EBikeRide: "ride", MountainBikeRide: "ride", GravelRide: "ride",
    Swim: "swim", OpenWaterSwim: "swim",
    Walk: "walk", Hike: "hike",
    AlpineSki: "ski", BackcountrySki: "ski", NordicSki: "ski",
    Snowboard: "ski", Snowshoe: "ski",
    Rowing: "row", Kayaking: "kayak", Canoeing: "canoe",
    WeightTraining: "strength", Workout: "workout",
    Yoga: "yoga", Pilates: "yoga",
    Crossfit: "strength", RockClimbing: "strength",
    Soccer: "sport", Tennis: "sport", Basketball: "sport",
  };
  return typeMap[stravaType] || stravaType.toLowerCase().replace(/\s+/g, "_");
}

async function refreshToken(supabaseClient: any, connection: any): Promise<string> {
  const clientId = Deno.env.get("STRAVA_CLIENT_ID");
  const clientSecret = Deno.env.get("STRAVA_CLIENT_SECRET");
  const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId, client_secret: clientSecret,
      refresh_token: connection.refresh_token, grant_type: "refresh_token",
    }),
  });
  if (!tokenResponse.ok) throw new Error("Failed to refresh Strava token — user may need to reconnect");
  const tokenData = await tokenResponse.json();
  const expiresAt = new Date(tokenData.expires_at * 1000).toISOString();
  await supabaseClient.from("strava_connections").update({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: expiresAt,
  }).eq("id", connection.id);
  return tokenData.access_token;
}

async function getValidAccessToken(supabaseClient: any, connection: any): Promise<string> {
  const now = new Date();
  const expiresAt = new Date(connection.expires_at);
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    return await refreshToken(supabaseClient, connection);
  }
  return connection.access_token;
}

async function fetchActivityDetail(activityId: number, accessToken: string): Promise<any | null> {
  const res = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (!res.ok) return null;
  return await res.json();
}

async function fetchActivityStreams(activityId: number, accessToken: string): Promise<any | null> {
  const streamKeys = ["time", "heartrate", "watts", "cadence", "velocity_smooth", "altitude", "distance", "latlng", "moving", "grade_smooth"];
  const url = `https://www.strava.com/api/v3/activities/${activityId}/streams?keys=${streamKeys.join(",")}&key_by_type=true`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (!res.ok) return null;
  return await res.json();
}

function extractStreamData(streamsData: any, key: string): any[] | null {
  if (!streamsData || !streamsData[key]) return null;
  return streamsData[key].data || null;
}

function calculateTimeInZones(
  dataStream: number[] | null, timeStream: number[] | null,
  zones: { min: number; max: number }[] | null
): Record<string, number> | null {
  if (!dataStream || !timeStream || !zones || dataStream.length !== timeStream.length) return null;
  const result: Record<string, number> = {};
  for (let z = 1; z <= 7; z++) result[`zone_${z}_seconds`] = 0;
  for (let i = 1; i < timeStream.length; i++) {
    const dt = timeStream[i] - timeStream[i - 1];
    const val = dataStream[i];
    for (let z = 0; z < zones.length; z++) {
      if (val >= zones[z].min && val <= zones[z].max) {
        result[`zone_${z + 1}_seconds`] += dt;
        break;
      }
    }
  }
  return result;
}

async function getAthleteZones(supabaseClient: any, userId: string): Promise<{ hrZones: { min: number; max: number }[] | null; powerZones: { min: number; max: number }[] | null }> {
  const { data: passport } = await supabaseClient
    .from("biological_passports")
    .select("training_zones, hr_zones_json, power_zones_json")
    .eq("athlete_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (!passport) return { hrZones: null, powerZones: null };

  let hrZones: { min: number; max: number }[] | null = null;
  let powerZones: { min: number; max: number }[] | null = null;

  if (passport.training_zones) {
    const tz = passport.training_zones;
    if (tz.zones7?.hr && Array.isArray(tz.zones7.hr)) {
      hrZones = tz.zones7.hr.map((z: any) => ({ min: z.min ?? z.low ?? 0, max: z.max ?? z.high ?? 999 }));
    }
    if (tz.zones7?.power && Array.isArray(tz.zones7.power)) {
      powerZones = tz.zones7.power.map((z: any) => ({ min: z.min ?? z.low ?? 0, max: z.max ?? z.high ?? 9999 }));
    }
  }
  if (!hrZones && passport.hr_zones_json) {
    const arr = Array.isArray(passport.hr_zones_json) ? passport.hr_zones_json : Object.values(passport.hr_zones_json);
    if (Array.isArray(arr) && arr.length >= 5) {
      hrZones = arr.map((z: any) => ({ min: z.min ?? z.low ?? 0, max: z.max ?? z.high ?? 999 }));
    }
  }
  if (!powerZones && passport.power_zones_json) {
    const arr = Array.isArray(passport.power_zones_json) ? passport.power_zones_json : Object.values(passport.power_zones_json);
    if (Array.isArray(arr) && arr.length >= 5) {
      powerZones = arr.map((z: any) => ({ min: z.min ?? z.low ?? 0, max: z.max ?? z.high ?? 9999 }));
    }
  }
  return { hrZones, powerZones };
}

async function findDuplicateAsciendeActivity(
  supabaseClient: any, userId: string, startTime: string, distanceMeters: number
): Promise<string | null> {
  const start = new Date(startTime);
  const windowMs = 5 * 60 * 1000;
  const { data: candidates } = await supabaseClient
    .from("external_activities")
    .select("id, distance_meters")
    .eq("user_id", userId)
    .eq("source", "asciende_gps")
    .is("deleted_at", null)
    .gte("start_time", new Date(start.getTime() - windowMs).toISOString())
    .lte("start_time", new Date(start.getTime() + windowMs).toISOString());

  if (!candidates || candidates.length === 0) return null;
  for (const c of candidates) {
    if (distanceMeters > 0 && c.distance_meters) {
      if (Math.abs(c.distance_meters - distanceMeters) / distanceMeters <= 0.05) return c.id;
    } else {
      return c.id;
    }
  }
  return null;
}

async function detectDeletedActivities(supabaseClient: any, userId: string, fetchedIds: Set<string>): Promise<number> {
  const { data: existing } = await supabaseClient
    .from("external_activities")
    .select("id, external_id")
    .eq("user_id", userId)
    .eq("source", "strava")
    .is("deleted_at", null);
  if (!existing) return 0;
  const toDelete = existing.filter((a: any) => !fetchedIds.has(a.external_id));
  if (toDelete.length === 0) return 0;
  await supabaseClient.from("external_activities")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", toDelete.map((a: any) => a.id));
  return toDelete.length;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: connection, error: connError } = await supabaseClient
      .from("strava_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (connError || !connection) {
      return new Response(JSON.stringify({ error: "No active Strava connection found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let accessToken: string;
    try {
      accessToken = await getValidAccessToken(supabaseClient, connection);
    } catch {
      return new Response(JSON.stringify({ error: "Token refresh failed — please reconnect Strava" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const urlParams = new URL(req.url);
    const perPage = Math.min(parseInt(urlParams.searchParams.get("per_page") || "100"), 200);
    const page = parseInt(urlParams.searchParams.get("page") || "1");
    let after = urlParams.searchParams.get("after");

    const isFirstSync = !connection.last_sync_at;
    if (isFirstSync && !after) {
      after = Math.floor(Date.now() / 1000 - 90 * 24 * 60 * 60).toString();
    }

    let activitiesUrl = `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}&page=${page}`;
    if (after) activitiesUrl += `&after=${after}`;

    const activitiesResponse = await fetch(activitiesUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (activitiesResponse.status === 429) {
      return new Response(JSON.stringify({ error: "Strava API rate limit reached. Try again in 15 minutes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!activitiesResponse.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch activities from Strava" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const activities: any[] = await activitiesResponse.json();
    console.log(`[strava-sync] Fetched ${activities.length} activities`);

    if (activities.length === 0) {
      await supabaseClient.from("strava_connections").update({ last_sync_at: new Date().toISOString() }).eq("id", connection.id);
      return new Response(JSON.stringify({ success: true, synced: 0, total_fetched: 0, streams_fetched: 0, deleted: 0, first_sync: isFirstSync }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build activity rows from summary
    const externalActivities = activities.map((a: any) => ({
      user_id: user.id,
      source: "strava",
      external_id: a.id.toString(),
      sport_type: normalizeActivityType(a.sport_type || a.type),
      name: a.name,
      start_time: a.start_date,
      local_date: (a.start_date_local || a.start_date).substring(0, 10),
      duration_seconds: a.moving_time,
      elapsed_time_seconds: a.elapsed_time,
      distance_meters: a.distance,
      elevation_gain_meters: a.total_elevation_gain,
      average_speed_mps: a.average_speed,
      max_speed_mps: a.max_speed,
      average_heartrate: a.average_heartrate ?? null,
      max_heartrate: a.max_heartrate ?? null,
      has_heartrate: a.has_heartrate ?? false,
      average_power: a.average_watts ?? null,
      average_watts: a.average_watts ?? null,
      max_watts: a.max_watts ?? null,
      weighted_avg_watts: a.weighted_average_watts ?? null,
      kilojoules: a.kilojoules ?? null,
      has_power: !!(a.average_watts || a.max_watts),
      average_cadence: a.average_cadence ?? null,
      calories: a.calories ?? null,
      perceived_exertion: a.perceived_exertion ?? null,
      trainer: a.trainer ?? false,
      commute: a.commute ?? false,
      device_name: a.device_name ?? null,
      timezone: a.timezone ?? null,
      start_latlng: a.start_latlng?.length === 2 ? a.start_latlng : null,
      end_latlng: a.end_latlng?.length === 2 ? a.end_latlng : null,
      map_polyline: a.map?.polyline ?? null,
      map_summary_polyline: a.map?.summary_polyline ?? null,
      strava_upload_id: a.upload_id ?? null,
      external_id_strava: a.external_id ?? null,
      raw_data: a,
      synced_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await supabaseClient
      .from("external_activities")
      .upsert(externalActivities, { onConflict: "source,external_id", ignoreDuplicates: false });

    if (upsertError) {
      return new Response(JSON.stringify({ error: "Failed to save activities to database" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch detailed activity data for suffer_score + extra fields
    let detailFetched = 0;
    let rateLimitHit = false;
    const { data: activitiesNeedingDetail } = await supabaseClient
      .from("external_activities")
      .select("id, external_id, start_time, distance_meters")
      .eq("user_id", user.id)
      .eq("source", "strava")
      .is("deleted_at", null)
      .is("suffer_score", null)
      .order("start_time", { ascending: false })
      .limit(MAX_DETAIL_FETCHES);

    if (activitiesNeedingDetail && !rateLimitHit) {
      const { hrZones, powerZones } = await getAthleteZones(supabaseClient, user.id);
      for (const act of activitiesNeedingDetail) {
        if (rateLimitHit) break;
        try {
          await sleep(DETAIL_FETCH_DELAY_MS);
          const detail = await fetchActivityDetail(parseInt(act.external_id), accessToken);
          if (!detail) continue;
          detailFetched++;

          const updates: Record<string, unknown> = {
            suffer_score: detail.suffer_score ?? null,
            average_grade: detail.average_grade ?? null,
            elev_high: detail.elev_high ?? null,
            elev_low: detail.elev_low ?? null,
            splits_metric: detail.splits_metric ?? null,
            splits_standard: detail.splits_standard ?? null,
          };

          // Dedup check
          const fusedId = await findDuplicateAsciendeActivity(supabaseClient, user.id, act.start_time, act.distance_meters);
          if (fusedId) updates.fused_activity_id = fusedId;

          await supabaseClient.from("external_activities").update(updates).eq("id", act.id);
        } catch (err: any) {
          if (err.message === "RATE_LIMIT") { rateLimitHit = true; }
        }
      }
    }

    // Fetch streams for activities that don't have them yet
    const { data: activitiesNeedingStreams } = await supabaseClient
      .from("external_activities")
      .select("id, external_id, has_heartrate, has_power")
      .eq("user_id", user.id)
      .eq("source", "strava")
      .eq("streams_fetched", false)
      .is("deleted_at", null)
      .limit(MAX_STREAMS_PER_SYNC);

    let streamsFetched = 0;
    let streamsSkipped = 0;

    if (activitiesNeedingStreams && activitiesNeedingStreams.length > 0 && !rateLimitHit) {
      const { hrZones, powerZones } = await getAthleteZones(supabaseClient, user.id);

      for (const activity of activitiesNeedingStreams) {
        if (rateLimitHit) { streamsSkipped++; continue; }
        try {
          await sleep(STREAM_FETCH_DELAY_MS);
          const streams = await fetchActivityStreams(parseInt(activity.external_id), accessToken);
          if (!streams) {
            await supabaseClient.from("external_activities").update({ streams_fetched: true, streams_fetched_at: new Date().toISOString() }).eq("id", activity.id);
            continue;
          }

          const availableKeys = Object.keys(streams);
          const streamRow = {
            activity_id: activity.id,
            user_id: user.id,
            time_stream: extractStreamData(streams, "time"),
            heartrate_stream: extractStreamData(streams, "heartrate"),
            watts_stream: extractStreamData(streams, "watts"),
            cadence_stream: extractStreamData(streams, "cadence"),
            velocity_smooth_stream: extractStreamData(streams, "velocity_smooth"),
            altitude_stream: extractStreamData(streams, "altitude"),
            distance_stream: extractStreamData(streams, "distance"),
            latlng_stream: streams?.latlng?.data ?? null,
            grade_smooth_stream: extractStreamData(streams, "grade_smooth"),
            moving_stream: extractStreamData(streams, "moving"),
            resolution: streams?.time?.resolution || "high",
            series_type: streams?.time?.series_type || "time",
            stream_keys: availableKeys,
            missing_heartrate: !availableKeys.includes("heartrate"),
            missing_power: !availableKeys.includes("watts"),
            missing_gps: !availableKeys.includes("latlng"),
            fetched_at: new Date().toISOString(),
          };

          await supabaseClient.from("activity_streams").upsert(streamRow, { onConflict: "activity_id" });
          streamsFetched++;

          await supabaseClient.from("external_activities").update({
            streams_fetched: true,
            streams_fetched_at: new Date().toISOString(),
          }).eq("id", activity.id);

          // Calculate time-in-zones
          const hrStream = extractStreamData(streams, "heartrate");
          const timeStream = extractStreamData(streams, "time");
          const wattsStream = extractStreamData(streams, "watts");

          let timeInZones: Record<string, number> | null = null;
          if (wattsStream && powerZones) {
            timeInZones = calculateTimeInZones(wattsStream, timeStream, powerZones);
          } else if (hrStream && hrZones) {
            timeInZones = calculateTimeInZones(hrStream, timeStream, hrZones);
          }

          if (timeInZones) {
            await supabaseClient.from("external_activities").update({ time_in_zones: timeInZones }).eq("id", activity.id);
          }
        } catch (err: any) {
          if (err.message === "RATE_LIMIT") {
            rateLimitHit = true;
            streamsSkipped++;
          } else {
            await supabaseClient.from("external_activities").update({ streams_fetched: true, streams_fetched_at: new Date().toISOString() }).eq("id", activity.id);
          }
        }
      }
    }

    // Soft-delete detection
    let deleted = 0;
    if (page === 1 && !after) {
      const fetchedIds = new Set(activities.map((a: any) => a.id.toString()));
      deleted = await detectDeletedActivities(supabaseClient, user.id, fetchedIds);
    }

    await supabaseClient.from("strava_connections").update({ last_sync_at: new Date().toISOString() }).eq("id", connection.id);

    console.log(`[strava-sync] Done. synced=${activities.length}, detail=${detailFetched}, streams=${streamsFetched}, skipped=${streamsSkipped}, deleted=${deleted}`);

    return new Response(JSON.stringify({
      success: true,
      synced: activities.length,
      total_fetched: activities.length,
      detail_fetched: detailFetched,
      streams_fetched: streamsFetched,
      streams_skipped: streamsSkipped,
      rate_limit_hit: rateLimitHit,
      deleted,
      first_sync: isFirstSync,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[strava-sync] Unexpected error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
