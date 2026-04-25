import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ACADEMY_URL = "https://xaatkjdbtlptbkdqbmih.supabase.co/functions/v1/public-courses-api";

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
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    let tags: { tag: string; priority?: string; timing?: string }[] = [];
    let athleteIdFromBody: string | null = null;

    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (Array.isArray(body.tags)) tags = body.tags;
        if (body.athlete_id) athleteIdFromBody = body.athlete_id;
      } catch {
        // ignore
      }
    }

    const athleteId = athleteIdFromBody || user.id;
    const athleteEmail = user.email || "";

    const { data: profileRow } = await supabaseAdmin
      .from("profiles")
      .select("full_name, sport, role, country, birth_date, gender")
      .eq("id", athleteId)
      .maybeSingle();

    const { data: tokenRow } = await supabaseAdmin
      .from("external_planner_tokens")
      .select("id, token_raw, planner_name")
      .eq("planner_type", "academy")
      .eq("is_active", true)
      .maybeSingle();

    if (!tokenRow?.token_raw) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No active Academy token configured.",
          courses: [],
          token_missing: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const academyPayload = {
      action: "get_courses_by_tags",
      athlete: {
        id: athleteId,
        email: athleteEmail,
        full_name: profileRow?.full_name || null,
        sport: profileRow?.sport || null,
        country: profileRow?.country || null,
        birth_date: profileRow?.birth_date || null,
        gender: profileRow?.gender || null,
      },
      tags,
    };

    const academyRes = await fetch(ACADEMY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Planner-Token": tokenRow.token_raw,
      },
      body: JSON.stringify(academyPayload),
    });

    if (!academyRes.ok) {
      const errText = await academyRes.text().catch(() => `HTTP ${academyRes.status}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Academy returned ${academyRes.status}: ${errText}`,
          courses: [],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const academyData = await academyRes.json();
    const courses = Array.isArray(academyData.courses) ? academyData.courses : [];

    const { data: completions } = await supabaseAdmin
      .from("course_completions")
      .select("course_external_id, completed_at, progress_percent, course_title")
      .eq("athlete_id", athleteId);

    const completionMap = new Map<string, { completed_at: string; progress_percent: number; course_title: string | null }>();
    for (const c of (completions || [])) {
      completionMap.set(c.course_external_id, {
        completed_at: c.completed_at,
        progress_percent: c.progress_percent ?? 100,
        course_title: c.course_title ?? null,
      });
    }

    const enrichedCourses = courses.map((course: Record<string, unknown>) => {
      const completion = completionMap.get(course.id as string);
      if (completion) {
        return {
          ...course,
          is_completed: true,
          completed_at: completion.completed_at,
          progress_percent: completion.progress_percent,
        };
      }
      return course;
    });

    const titlesToBackfill = courses.filter((course: Record<string, unknown>) => {
      const completion = completionMap.get(course.id as string);
      return completion && !completion.course_title && course.title;
    });

    if (titlesToBackfill.length > 0) {
      for (const course of titlesToBackfill) {
        await supabaseAdmin
          .from("course_completions")
          .update({
            course_title: course.title as string,
            course_title_es: (course.title_es as string | null) ?? null,
          })
          .eq("athlete_id", athleteId)
          .eq("course_external_id", course.id as string);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        courses: enrichedCourses,
        total: enrichedCourses.length,
        source: tokenRow.planner_name || "Academy",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ success: false, error: msg, courses: [] }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
