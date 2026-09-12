import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
  if (!tokenResponse.ok) throw new Error("Failed to refresh Strava token");
  const tokenData = await tokenResponse.json();
  await supabaseClient.from("strava_connections").update({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: new Date(tokenData.expires_at * 1000).toISOString(),
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
  const url = `https://www.strava.com/api/v3/activities/${activityId}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    console.warn(`[strava-webhook] Failed to fetch activity detail ${activityId}: ${res.status}`);
    return null;
  }
  return await res.json();
}

async function fetchActivityStreams(activityId: number, accessToken: string): Promise<any | null> {
  const streamKeys = ["time", "latlng", "distance", "altitude", "heartrate", "cadence", "watts", "moving", "grade_smooth"];
  const url = `https://www.strava.com/api/v3/activities/${activityId}/streams?keys=${streamKeys.join(",")}&key_by_type=true`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (res.status === 429) {
    console.warn(`[strava-webhook] Rate limit fetching streams for ${activityId}`);
    return null;
  }
  if (!res.ok) return null;
  return await res.json();
}

function extractStreamData(streamsData: any, key: string): any[] | null {
  if (!streamsData || !streamsData[key]) return null;
  return streamsData[key].data || null;
}

function calculateTimeInZones(
  heartrateStream: number[] | null,
  timeStream: number[] | null,
  hrZones: { min: number; max: number }[] | null
): Record<string, number> | null {
  if (!heartrateStream || !timeStream || !hrZones || heartrateStream.length !== timeStream.length) return null;
  const zones: Record<string, number> = {};
  for (let z = 1; z <= 7; z++) zones[`zone_${z}_seconds`] = 0;
  for (let i = 1; i < timeStream.length; i++) {
    const dt = timeStream[i] - timeStream[i - 1];
    const hr = heartrateStream[i];
    for (let z = 0; z < hrZones.length; z++) {
      if (hr >= hrZones[z].min && hr <= hrZones[z].max) {
        zones[`zone_${z + 1}_seconds`] += dt;
        break;
      }
    }
  }
  return zones;
}

function calculateTimeInPowerZones(
  wattsStream: number[] | null,
  timeStream: number[] | null,
  powerZones: { min: number; max: number }[] | null
): Record<string, number> | null {
  if (!wattsStream || !timeStream || !powerZones || wattsStream.length !== timeStream.length) return null;
  const zones: Record<string, number> = {};
  for (let z = 1; z <= 7; z++) zones[`zone_${z}_seconds`] = 0;
  for (let i = 1; i < timeStream.length; i++) {
    const dt = timeStream[i] - timeStream[i - 1];
    const w = wattsStream[i];
    if (w === 0) continue;
    for (let z = 0; z < powerZones.length; z++) {
      if (w >= powerZones[z].min && w <= powerZones[z].max) {
        zones[`zone_${z + 1}_seconds`] += dt;
        break;
      }
    }
  }
  return zones;
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

  // Try unified training_zones first (zones7 structure)
  if (passport.training_zones) {
    const tz = passport.training_zones;
    if (tz.zones7?.hr && Array.isArray(tz.zones7.hr)) {
      hrZones = tz.zones7.hr.map((z: any) => ({ min: z.min ?? z.low ?? 0, max: z.max ?? z.high ?? 999 }));
    }
    if (tz.zones7?.power && Array.isArray(tz.zones7.power)) {
      powerZones = tz.zones7.power.map((z: any) => ({ min: z.min ?? z.low ?? 0, max: z.max ?? z.high ?? 9999 }));
    }
  }

  // Fallback to legacy jsonb fields
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
  supabaseClient: any,
  userId: string,
  startTime: string,
  distanceMeters: number
): Promise<string | null> {
  const start = new Date(startTime);
  const windowMs = 5 * 60 * 1000;
  const after = new Date(start.getTime() - windowMs).toISOString();
  const before = new Date(start.getTime() + windowMs).toISOString();

  const { data: candidates } = await supabaseClient
    .from("external_activities")
    .select("id, distance_meters, start_time")
    .eq("user_id", userId)
    .eq("source", "asciende_gps")
    .is("deleted_at", null)
    .gte("start_time", after)
    .lte("start_time", before);

  if (!candidates || candidates.length === 0) return null;

  for (const c of candidates) {
    if (distanceMeters > 0 && c.distance_meters) {
      const ratio = Math.abs(c.distance_meters - distanceMeters) / distanceMeters;
      if (ratio <= 0.05) return c.id;
    } else {
      return c.id;
    }
  }
  return null;
}

async function processActivityCreate(
  supabaseClient: any,
  ownerStravaId: bigint,
  activityStravaId: bigint
): Promise<void> {
  // Find the user's Strava connection by athlete_id
  const { data: connection } = await supabaseClient
    .from("strava_connections")
    .select("*")
    .eq("athlete_id", ownerStravaId)
    .eq("is_active", true)
    .maybeSingle();

  if (!connection) {
    console.warn(`[strava-webhook] No active connection for Strava athlete ${ownerStravaId}`);
    return;
  }

  let accessToken: string;
  try {
    accessToken = await getValidAccessToken(supabaseClient, connection);
  } catch {
    console.warn(`[strava-webhook] Token refresh failed for athlete ${ownerStravaId}, marking requires_reauth`);
    await supabaseClient.from("strava_connections").update({ requires_reauth: true }).eq("id", connection.id);
    return;
  }

  // 1. Fetch detailed activity
  const detail = await fetchActivityDetail(activityStravaId, accessToken);
  if (!detail) return;

  const activityRow = {
    user_id: connection.user_id,
    source: "strava",
    external_id: activityStravaId.toString(),
    sport_type: normalizeActivityType(detail.sport_type || detail.type),
    name: detail.name,
    start_time: detail.start_date,
    local_date: (detail.start_date_local || detail.start_date).substring(0, 10),
    duration_seconds: detail.moving_time,
    elapsed_time_seconds: detail.elapsed_time,
    distance_meters: detail.distance,
    elevation_gain_meters: detail.total_elevation_gain,
    average_speed_mps: detail.average_speed,
    max_speed_mps: detail.max_speed,
    average_heartrate: detail.average_heartrate ?? null,
    max_heartrate: detail.max_heartrate ?? null,
    has_heartrate: detail.has_heartrate ?? false,
    average_power: detail.average_watts ?? null,
    average_watts: detail.average_watts ?? null,
    max_watts: detail.max_watts ?? null,
    weighted_avg_watts: detail.weighted_average_watts ?? null,
    kilojoules: detail.kilojoules ?? null,
    has_power: !!(detail.average_watts || detail.max_watts),
    average_cadence: detail.average_cadence ?? null,
    calories: detail.calories ?? null,
    perceived_exertion: detail.perceived_exertion ?? null,
    suffer_score: detail.suffer_score ?? null,
    average_grade: detail.average_grade ?? null,
    elev_high: detail.elev_high ?? null,
    elev_low: detail.elev_low ?? null,
    trainer: detail.trainer ?? false,
    commute: detail.commute ?? false,
    device_name: detail.device_name ?? null,
    timezone: detail.timezone ?? null,
    start_latlng: detail.start_latlng?.length === 2 ? detail.start_latlng : null,
    end_latlng: detail.end_latlng?.length === 2 ? detail.end_latlng : null,
    map_polyline: detail.map?.polyline ?? null,
    map_summary_polyline: detail.map?.summary_polyline ?? null,
    strava_upload_id: detail.upload_id ?? null,
    external_id_strava: detail.external_id ?? null,
    raw_data: detail,
    synced_at: new Date().toISOString(),
  };

  const { data: upserted, error: upsertError } = await supabaseClient
    .from("external_activities")
    .upsert(activityRow, { onConflict: "source,external_id" })
    .select("id")
    .single();

  if (upsertError || !upserted) {
    console.error(`[strava-webhook] Failed to upsert activity ${activityStravaId}:`, upsertError);
    return;
  }

  const activityDbId = upserted.id;

  // 2. Fetch streams
  const streams = await fetchActivityStreams(activityStravaId, accessToken);
  if (streams) {
    const availableKeys = Object.keys(streams);
    const streamRow = {
      activity_id: activityDbId,
      user_id: connection.user_id,
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

    await supabaseClient.from("external_activities").update({
      streams_fetched: true,
      streams_fetched_at: new Date().toISOString(),
    }).eq("id", activityDbId);

    // 3. Calculate time-in-zones
    const { hrZones, powerZones } = await getAthleteZones(supabaseClient, connection.user_id);
    let timeInZones: Record<string, number> | null = null;

    const hrStream = extractStreamData(streams, "heartrate");
    const timeStream = extractStreamData(streams, "time");
    const wattsStream = extractStreamData(streams, "watts");

    if (wattsStream && powerZones) {
      timeInZones = calculateTimeInPowerZones(wattsStream, timeStream, powerZones);
    } else if (hrStream && hrZones) {
      timeInZones = calculateTimeInZones(hrStream, timeStream, hrZones);
    }

    if (timeInZones) {
      await supabaseClient.from("external_activities").update({
        time_in_zones: timeInZones,
      }).eq("id", activityDbId);
      console.log(`[strava-webhook] Calculated time-in-zones for activity ${activityStravaId}`);
    }
  }

  // 4. Dedup: check for matching Asciende GPS activity
  const fusedId = await findDuplicateAsciendeActivity(
    supabaseClient,
    connection.user_id,
    detail.start_date,
    detail.distance
  );

  if (fusedId) {
    await supabaseClient.from("external_activities").update({
      fused_activity_id: fusedId,
    }).eq("id", activityDbId);
    console.log(`[strava-webhook] Fused Strava activity ${activityStravaId} with Asciende GPS ${fusedId}`);
  }

  console.log(`[strava-webhook] Processed activity ${activityStravaId} for athlete ${ownerStravaId}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);

  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const VERIFY_TOKEN = Deno.env.get("STRAVA_WEBHOOK_VERIFY_TOKEN") || "ASCIENDE_STRAVA_WEBHOOK";

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook verification successful");
      return new Response(
        JSON.stringify({ "hub.challenge": challenge }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ error: "Forbidden" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (req.method === "POST") {
    try {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const payload = await req.json();
      console.log("[strava-webhook] Received event:", JSON.stringify(payload));

      // Log the event
      const { error: insertError } = await supabaseClient
        .from("strava_webhook_events")
        .insert({
          subscription_id: payload.subscription_id,
          owner_id: payload.owner_id,
          object_type: payload.object_type,
          object_id: payload.object_id,
          aspect_type: payload.aspect_type,
          event_time: new Date(payload.event_time * 1000).toISOString(),
          raw_payload: payload,
          processed: false,
        });

      if (insertError) console.error("[strava-webhook] Failed to log event:", insertError);

      // Process the event
      let processed = false;
      let errorMessage: string | null = null;

      if (payload.object_type === "activity") {
        if (payload.aspect_type === "create") {
          try {
            await processActivityCreate(supabaseClient, BigInt(payload.owner_id), BigInt(payload.object_id));
            processed = true;
          } catch (err: any) {
            errorMessage = err.message;
            console.error("[strava-webhook] Error processing activity create:", err);
          }
        } else if (payload.aspect_type === "delete") {
          // Soft-delete the activity
          const { data: connection } = await supabaseClient
            .from("strava_connections")
            .select("user_id")
            .eq("athlete_id", BigInt(payload.owner_id))
            .eq("is_active", true)
            .maybeSingle();

          if (connection) {
            await supabaseClient.from("external_activities")
              .update({ deleted_at: new Date().toISOString() })
              .eq("user_id", connection.user_id)
              .eq("source", "strava")
              .eq("external_id", payload.object_id.toString());
            processed = true;
          }
        } else if (payload.aspect_type === "update") {
          // Title/type change — re-fetch and update
          try {
            await processActivityCreate(supabaseClient, BigInt(payload.owner_id), BigInt(payload.object_id));
            processed = true;
          } catch (err: any) {
            errorMessage = err.message;
          }
        }
      } else if (payload.object_type === "athlete" && payload.aspect_type === "update") {
        // Athlete deauthorized — mark connection inactive
        const { data: connection } = await supabaseClient
          .from("strava_connections")
          .select("id")
          .eq("athlete_id", BigInt(payload.owner_id))
          .maybeSingle();
        if (connection) {
          await supabaseClient.from("strava_connections").update({ is_active: false }).eq("id", connection.id);
          processed = true;
        }
      }

      // Mark event as processed
      if (insertError === null) {
        const { data: loggedEvent } = await supabaseClient
          .from("strava_webhook_events")
          .select("id")
          .eq("subscription_id", payload.subscription_id)
          .eq("object_id", payload.object_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (loggedEvent) {
          await supabaseClient.from("strava_webhook_events").update({
            processed,
            processed_at: new Date().toISOString(),
            error_message: errorMessage,
          }).eq("id", loggedEvent.id);
        }
      }

      return new Response(
        JSON.stringify({ success: true, processed }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("[strava-webhook] Error:", error);
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
