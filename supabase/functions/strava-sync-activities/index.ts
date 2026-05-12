import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Strava API rate limit: 100 requests/15min, 1000/day
const STREAM_FETCH_DELAY_MS = 200;
const MAX_STREAMS_PER_SYNC = 20;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

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

  console.log(`[strava-sync] Refreshing token for athlete ${connection.athlete_id}`);

  const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenResponse.ok) {
    const err = await tokenResponse.text();
    console.error("[strava-sync] Failed to refresh token:", err);
    throw new Error("Failed to refresh Strava token — user may need to reconnect");
  }

  const tokenData = await tokenResponse.json();
  const expiresAt = new Date(tokenData.expires_at * 1000).toISOString();

  const { error } = await supabaseClient
    .from("strava_connections")
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt,
    })
    .eq("id", connection.id);

  if (error) console.error("[strava-sync] Failed to persist refreshed token:", error);

  console.log(`[strava-sync] Token refreshed, expires ${expiresAt}`);
  return tokenData.access_token;
}

async function getValidAccessToken(supabaseClient: any, connection: any): Promise<string> {
  const now = new Date();
  const expiresAt = new Date(connection.expires_at);
  // Refresh 5 minutes before expiry
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    return await refreshToken(supabaseClient, connection);
  }
  return connection.access_token;
}

async function fetchActivityStreams(
  activityId: number,
  accessToken: string
): Promise<{ streams: any; keys: string[]; missingHR: boolean; missingPower: boolean; missingGPS: boolean }> {
  const streamKeys = ["time", "heartrate", "watts", "cadence", "velocity_smooth", "altitude", "distance", "latlng"];
  const url = `https://www.strava.com/api/v3/activities/${activityId}/streams?keys=${streamKeys.join(",")}&key_by_type=true`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 429) {
    console.warn(`[strava-sync] Rate limit hit fetching streams for activity ${activityId}`);
    throw new Error("RATE_LIMIT");
  }

  if (!response.ok) {
    const err = await response.text();
    console.warn(`[strava-sync] Failed to fetch streams for activity ${activityId}: ${err}`);
    return { streams: null, keys: [], missingHR: true, missingPower: true, missingGPS: true };
  }

  const data = await response.json();
  const availableKeys = Object.keys(data);

  return {
    streams: data,
    keys: availableKeys,
    missingHR: !availableKeys.includes("heartrate"),
    missingPower: !availableKeys.includes("watts"),
    missingGPS: !availableKeys.includes("latlng"),
  };
}

function extractStreamData(streamsData: any, key: string): any[] | null {
  if (!streamsData || !streamsData[key]) return null;
  return streamsData[key].data || null;
}

async function detectDeletedActivities(
  supabaseClient: any,
  userId: string,
  fetchedActivityIds: Set<string>
): Promise<{ deleted: number }> {
  const { data: existing, error } = await supabaseClient
    .from("external_activities")
    .select("id, external_id")
    .eq("user_id", userId)
    .eq("source", "strava")
    .is("deleted_at", null);

  if (error || !existing) {
    console.error("[strava-sync] Failed to fetch existing activities for deletion check:", error);
    return { deleted: 0 };
  }

  const toDelete = existing.filter((a: any) => !fetchedActivityIds.has(a.external_id));
  if (toDelete.length === 0) return { deleted: 0 };

  const ids = toDelete.map((a: any) => a.id);
  const { error: delError } = await supabaseClient
    .from("external_activities")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", ids);

  if (delError) {
    console.error("[strava-sync] Failed to soft-delete activities:", delError);
    return { deleted: 0 };
  }

  console.log(`[strava-sync] Soft-deleted ${toDelete.length} activities removed from Strava`);
  return { deleted: toDelete.length };
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
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: connection, error: connError } = await supabaseClient
      .from("strava_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "No active Strava connection found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let accessToken: string;
    try {
      accessToken = await getValidAccessToken(supabaseClient, connection);
    } catch (err) {
      console.error("[strava-sync] Token refresh failed:", err);
      return new Response(
        JSON.stringify({ error: "Token refresh failed — please reconnect Strava" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const urlParams = new URL(req.url);
    const perPage = Math.min(parseInt(urlParams.searchParams.get("per_page") || "100"), 200);
    const page = parseInt(urlParams.searchParams.get("page") || "1");
    let after = urlParams.searchParams.get("after");

    const isFirstSync = !connection.last_sync_at;
    if (isFirstSync && !after) {
      const ninetyDaysAgo = Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60;
      after = ninetyDaysAgo.toString();
      console.log(`[strava-sync] First sync for user ${user.id}, fetching from last 90 days`);
    }

    let activitiesUrl = `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}&page=${page}`;
    if (after) activitiesUrl += `&after=${after}`;

    console.log(`[strava-sync] Fetching activities: page=${page}, per_page=${perPage}`);

    const activitiesResponse = await fetch(activitiesUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (activitiesResponse.status === 429) {
      console.warn("[strava-sync] Rate limit reached fetching activity list");
      return new Response(
        JSON.stringify({ error: "Strava API rate limit reached. Please try again in 15 minutes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!activitiesResponse.ok) {
      const err = await activitiesResponse.text();
      console.error("[strava-sync] Failed to fetch activities:", err);
      return new Response(
        JSON.stringify({ error: "Failed to fetch activities from Strava" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const activities: any[] = await activitiesResponse.json();
    console.log(`[strava-sync] Fetched ${activities.length} activities`);

    if (activities.length === 0) {
      await supabaseClient
        .from("strava_connections")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", connection.id);

      return new Response(
        JSON.stringify({ success: true, synced: 0, total_fetched: 0, streams_fetched: 0, deleted: 0, first_sync: isFirstSync }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build complete activity rows with all available fields
    const externalActivities = activities.map((a: any) => ({
      user_id: user.id,
      source: "strava",
      external_id: a.id.toString(),
      sport_type: normalizeActivityType(a.sport_type || a.type),
      name: a.name,
      start_time: a.start_date,
      local_date: (a.start_date_local || a.start_date).substring(0, 10),
      // Time
      duration_seconds: a.moving_time,
      elapsed_time_seconds: a.elapsed_time,
      // Distance & elevation
      distance_meters: a.distance,
      elevation_gain_meters: a.total_elevation_gain,
      // Speed
      average_speed_mps: a.average_speed,
      max_speed_mps: a.max_speed,
      // Heart rate
      average_heartrate: a.average_heartrate ?? null,
      max_heartrate: a.max_heartrate ?? null,
      has_heartrate: a.has_heartrate ?? false,
      // Power
      average_power: a.average_watts ?? null,
      average_watts: a.average_watts ?? null,
      max_watts: a.max_watts ?? null,
      weighted_avg_watts: a.weighted_average_watts ?? null,
      kilojoules: a.kilojoules ?? null,
      has_power: !!(a.average_watts || a.max_watts),
      // Cadence
      average_cadence: a.average_cadence ?? null,
      // Energy & effort
      calories: a.calories ?? null,
      perceived_exertion: a.perceived_exertion ?? null,
      // Context flags
      trainer: a.trainer ?? false,
      commute: a.commute ?? false,
      device_name: a.device_name ?? null,
      timezone: a.timezone ?? null,
      // GPS
      start_latlng: a.start_latlng?.length === 2 ? a.start_latlng : null,
      end_latlng: a.end_latlng?.length === 2 ? a.end_latlng : null,
      map_polyline: a.map?.polyline ?? null,
      map_summary_polyline: a.map?.summary_polyline ?? null,
      // Strava metadata
      strava_upload_id: a.upload_id ?? null,
      external_id_strava: a.external_id ?? null,
      // Full raw response for future use
      raw_data: a,
      synced_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await supabaseClient
      .from("external_activities")
      .upsert(externalActivities, {
        onConflict: "source,external_id",
        ignoreDuplicates: false,
      });

    if (upsertError) {
      console.error("[strava-sync] Failed to upsert activities:", upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to save activities to database" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
    let rateLimitHit = false;

    if (activitiesNeedingStreams && activitiesNeedingStreams.length > 0) {
      console.log(`[strava-sync] Fetching streams for ${activitiesNeedingStreams.length} activities`);

      for (const activity of activitiesNeedingStreams) {
        if (rateLimitHit) {
          streamsSkipped++;
          continue;
        }

        try {
          await sleep(STREAM_FETCH_DELAY_MS);

          const { streams, keys, missingHR, missingPower, missingGPS } =
            await fetchActivityStreams(parseInt(activity.external_id), accessToken);

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
            resolution: streams?.time?.resolution || "high",
            series_type: streams?.time?.series_type || "time",
            stream_keys: keys,
            missing_heartrate: missingHR,
            missing_power: missingPower,
            missing_gps: missingGPS,
            fetched_at: new Date().toISOString(),
          };

          const { error: streamError } = await supabaseClient
            .from("activity_streams")
            .upsert(streamRow, { onConflict: "activity_id" });

          if (streamError) {
            console.error(`[strava-sync] Failed to save streams for activity ${activity.external_id}:`, streamError);
          } else {
            streamsFetched++;
            if (missingHR) {
              console.log(`[strava-sync] Activity ${activity.external_id}: no HR stream (Strava health permissions may be disabled)`);
            }
          }

          await supabaseClient
            .from("external_activities")
            .update({ streams_fetched: true, streams_fetched_at: new Date().toISOString() })
            .eq("id", activity.id);

        } catch (err: any) {
          if (err.message === "RATE_LIMIT") {
            console.warn("[strava-sync] Rate limit hit during stream fetch, stopping streams for this run");
            rateLimitHit = true;
            streamsSkipped++;
          } else {
            console.warn(`[strava-sync] Stream fetch error for activity ${activity.external_id}:`, err.message);
            // Mark fetched to avoid infinite retry
            await supabaseClient
              .from("external_activities")
              .update({ streams_fetched: true, streams_fetched_at: new Date().toISOString() })
              .eq("id", activity.id);
          }
        }
      }
    }

    // Soft-delete detection only on full syncs (no pagination/after filter)
    let deleted = 0;
    if (page === 1 && !after) {
      const fetchedIds = new Set(activities.map((a: any) => a.id.toString()));
      const result = await detectDeletedActivities(supabaseClient, user.id, fetchedIds);
      deleted = result.deleted;
    }

    await supabaseClient
      .from("strava_connections")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", connection.id);

    console.log(`[strava-sync] Complete. synced=${activities.length}, streams=${streamsFetched}, skipped=${streamsSkipped}, deleted=${deleted}`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: activities.length,
        total_fetched: activities.length,
        streams_fetched: streamsFetched,
        streams_skipped: streamsSkipped,
        rate_limit_hit: rateLimitHit,
        deleted,
        first_sync: isFirstSync,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[strava-sync] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
