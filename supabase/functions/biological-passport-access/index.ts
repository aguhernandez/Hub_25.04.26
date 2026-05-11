import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Planner-Token",
};

// This endpoint is handled by planner-hub-api/biological-passport
// Use: GET /planner-hub-api/biological-passport?athlete_id=XXX with X-Planner-Token header
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  return new Response(
    JSON.stringify({
      error: "Use /planner-hub-api/biological-passport?athlete_id=XXX with X-Planner-Token header instead",
    }),
    { status: 301, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
