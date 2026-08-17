import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ACADEMY_URL = "https://xaatkjdbtlptbkdqbmih.supabase.co/functions/v1/hub-course-detail";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { data: tokenRow } = await supabaseAdmin
      .from("external_planner_tokens")
      .select("token_raw, planner_name")
      .eq("planner_type", "academy")
      .eq("is_active", true)
      .maybeSingle();

    if (!tokenRow?.token_raw) {
      return new Response(JSON.stringify({ success: false, error: "No active Academy token configured." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const courseId = url.searchParams.get("course_id");
    if (!courseId) {
      return new Response(JSON.stringify({ error: "course_id parameter required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const academyUrl = `${ACADEMY_URL}?course_id=${encodeURIComponent(courseId)}`;
    console.log("[academy-course-detail] Forwarding to Academy:", academyUrl);
    const academyRes = await fetch(academyUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Planner-Token": tokenRow.token_raw,
      },
    });

    if (!academyRes.ok) {
      const errText = await academyRes.text().catch(() => `HTTP ${academyRes.status}`);
      return new Response(JSON.stringify({ success: false, error: `Academy returned ${academyRes.status}: ${errText}` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const academyData = await academyRes.json();

    return new Response(JSON.stringify({
      success: true,
      course: academyData.course || academyData,
      modules: academyData.modules || academyData.subjects || [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
