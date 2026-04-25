import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { eventId, topic, startTime, duration } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Zoom OAuth credentials (Server-to-Server)
    const zoomAccountId = Deno.env.get("ZOOM_ACCOUNT_ID");
    const zoomClientId = Deno.env.get("ZOOM_CLIENT_ID");
    const zoomClientSecret = Deno.env.get("ZOOM_CLIENT_SECRET");

    if (!zoomAccountId || !zoomClientId || !zoomClientSecret) {
      // Return mock data if Zoom not configured
      const mockMeeting = {
        id: `mock_${Date.now()}`,
        join_url: "https://zoom.us/j/mock-meeting",
        start_url: "https://zoom.us/s/mock-meeting",
        password: "mock123",
      };

      // Get current user
      const authHeader = req.headers.get("Authorization")!;
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);

      // Store in database
      await supabase.from("zoom_meetings").insert({
        event_id: eventId,
        zoom_meeting_id: mockMeeting.id,
        zoom_join_url: mockMeeting.join_url,
        zoom_start_url: mockMeeting.start_url,
        host_id: user?.id,
        meeting_password: mockMeeting.password,
      });

      return new Response(
        JSON.stringify({ meeting: mockMeeting, mock: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get OAuth Access Token
    const tokenResponse = await getZoomAccessToken(
      zoomAccountId,
      zoomClientId,
      zoomClientSecret
    );

    if (!tokenResponse.access_token) {
      throw new Error("Failed to get Zoom access token");
    }

    // Create Zoom meeting
    const meeting = await createZoomMeeting(
      tokenResponse.access_token,
      topic,
      startTime,
      duration
    );

    // Get current user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);

    // Store in database
    await supabase.from("zoom_meetings").insert({
      event_id: eventId,
      zoom_meeting_id: meeting.id.toString(),
      zoom_join_url: meeting.join_url,
      zoom_start_url: meeting.start_url,
      host_id: user?.id,
      meeting_password: meeting.password,
    });

    return new Response(
      JSON.stringify({ meeting }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Zoom meeting error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Get OAuth Access Token using Server-to-Server OAuth
async function getZoomAccessToken(
  accountId: string,
  clientId: string,
  clientSecret: string
): Promise<{ access_token: string; expires_in: number }> {
  const credentials = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Zoom OAuth error: ${error}`);
  }

  return await response.json();
}

// Create Zoom meeting
async function createZoomMeeting(
  accessToken: string,
  topic: string,
  startTime: string,
  duration: number
) {
  const response = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic,
      type: 2, // Scheduled meeting
      start_time: startTime,
      duration,
      timezone: "UTC",
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        mute_upon_entry: true,
        waiting_room: true,
        audio: "both",
        auto_recording: "none",
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Zoom API error: ${error}`);
  }

  return await response.json();
}
