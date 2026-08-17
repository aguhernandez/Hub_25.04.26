import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
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
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Forbidden" }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (req.method === "POST") {
    try {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const payload = await req.json();

      console.log("Received Strava webhook event:", payload);

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

      if (insertError) {
        console.error("Failed to log webhook event:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to log event" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log("Webhook event logged successfully (not processed yet - manual sync only)");

      return new Response(
        JSON.stringify({ success: true, message: "Event logged" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error processing webhook:", error);
      return new Response(
        JSON.stringify({ error: error.message || "Internal server error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  }

  return new Response(
    JSON.stringify({ error: "Method not allowed" }),
    {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});