import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  elapsed_time: number;
  moving_time: number;
  distance: number;
  total_elevation_gain: number;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_watts?: number;
  average_cadence?: number;
  device_name?: string;
}

function normalizeActivityType(stravaType: string): string {
  const typeMap: Record<string, string> = {
    'Run': 'run',
    'Ride': 'ride',
    'VirtualRide': 'ride',
    'Swim': 'swim',
    'Walk': 'walk',
    'Hike': 'hike',
    'AlpineSki': 'ski',
    'BackcountrySki': 'ski',
    'NordicSki': 'ski',
    'Rowing': 'row',
    'Kayaking': 'kayak',
    'Canoeing': 'canoe',
    'WeightTraining': 'strength',
    'Workout': 'workout',
    'Yoga': 'yoga',
  };

  return typeMap[stravaType] || stravaType.toLowerCase();
}

async function refreshToken(supabaseClient: any, connection: any) {
  const clientId = Deno.env.get("STRAVA_CLIENT_ID");
  const clientSecret = Deno.env.get("STRAVA_CLIENT_SECRET");

  const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error("Failed to refresh token");
  }

  const tokenData = await tokenResponse.json();
  const expiresAt = new Date(tokenData.expires_at * 1000).toISOString();

  await supabaseClient
    .from("strava_connections")
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt,
    })
    .eq("id", connection.id);

  return tokenData.access_token;
}

async function getValidAccessToken(supabaseClient: any, connection: any) {
  const now = new Date();
  const expiresAt = new Date(connection.expires_at);

  if (expiresAt <= now) {
    return await refreshToken(supabaseClient, connection);
  }

  return connection.access_token;
}

async function detectDeletedActivities(
  supabaseClient: any,
  userId: string,
  fetchedActivityIds: Set<string>
) {
  const { data: existingActivities, error: fetchError } = await supabaseClient
    .from("external_activities")
    .select("id, external_id")
    .eq("user_id", userId)
    .eq("source", "strava")
    .is("deleted_at", null);

  if (fetchError || !existingActivities) {
    console.error("Failed to fetch existing activities for deletion check:", fetchError);
    return { deleted: 0 };
  }

  const activitiesToDelete = existingActivities.filter(
    (activity) => !fetchedActivityIds.has(activity.external_id)
  );

  if (activitiesToDelete.length > 0) {
    const idsToDelete = activitiesToDelete.map((a) => a.id);
    const { error: deleteError } = await supabaseClient
      .from("external_activities")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", idsToDelete);

    if (deleteError) {
      console.error("Failed to mark activities as deleted:", deleteError);
      return { deleted: 0 };
    }

    console.log(`Marked ${activitiesToDelete.length} activities as deleted`);
    return { deleted: activitiesToDelete.length };
  }

  return { deleted: 0 };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: connection, error: connectionError } = await supabaseClient
      .from("strava_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (connectionError || !connection) {
      return new Response(
        JSON.stringify({ error: "No active Strava connection found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const accessToken = await getValidAccessToken(supabaseClient, connection);

    const url = new URL(req.url);
    const perPage = parseInt(url.searchParams.get("per_page") || "200");
    const page = url.searchParams.get("page") || "1";
    let after = url.searchParams.get("after");

    const isFirstSync = !connection.last_sync_at;
    if (isFirstSync && !after) {
      const ninetyDaysAgo = Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60);
      after = ninetyDaysAgo.toString();
      console.log(`First sync detected. Fetching activities from last 90 days (after=${after})`);
    }

    let activitiesUrl = `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}&page=${page}`;
    if (after) {
      activitiesUrl += `&after=${after}`;
    }

    const activitiesResponse = await fetch(activitiesUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!activitiesResponse.ok) {
      const error = await activitiesResponse.text();
      console.error("Failed to fetch Strava activities:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch activities" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const activities: StravaActivity[] = await activitiesResponse.json();

    const externalActivities = activities.map((activity) => ({
      user_id: user.id,
      source: "strava",
      external_id: activity.id.toString(),
      sport_type: normalizeActivityType(activity.sport_type),
      name: activity.name,
      start_time: activity.start_date,
      local_date: (activity.start_date_local || activity.start_date).substring(0, 10),
      duration_seconds: activity.moving_time,
      distance_meters: activity.distance,
      elevation_gain_meters: activity.total_elevation_gain,
      average_speed_mps: activity.average_speed,
      average_heartrate: activity.average_heartrate,
      max_heartrate: activity.max_heartrate,
      average_power: activity.average_watts,
      average_cadence: activity.average_cadence,
      device_name: activity.device_name,
      raw_data: activity,
      synced_at: new Date().toISOString(),
    }));

    let inserted = 0;
    let updated = 0;

    if (externalActivities.length > 0) {
      const { error: insertError } = await supabaseClient
        .from("external_activities")
        .upsert(externalActivities, {
          onConflict: "source,external_id",
          ignoreDuplicates: false,
        });

      if (insertError) {
        console.error("Failed to insert activities:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to save activities" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      inserted = externalActivities.length;
    }

    const fetchedActivityIds = new Set(
      activities.map((a) => a.id.toString())
    );
    const deletionResult = await detectDeletedActivities(
      supabaseClient,
      user.id,
      fetchedActivityIds
    );

    await supabaseClient
      .from("strava_connections")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", connection.id);

    return new Response(
      JSON.stringify({
        success: true,
        synced: inserted,
        total_fetched: activities.length,
        deleted: deletionResult.deleted,
        first_sync: isFirstSync,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in strava-sync-activities:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});