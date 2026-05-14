import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { crypto } from "jsr:@std/crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Planner-Token",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function validatePlannerToken(token: string): Promise<{ id: string; planner_type: string; planner_name: string } | null> {
  const tokenHash = await hashToken(token);
  const { data } = await supabaseAdmin
    .from("external_planner_tokens")
    .select("id, planner_type, planner_name")
    .eq("token_hash", tokenHash)
    .eq("is_active", true)
    .maybeSingle();

  if (data) {
    await supabaseAdmin
      .from("external_planner_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", data.id);
  }

  return data;
}

async function logAccess(tokenId: string, athleteId: string | null, action: string, endpoint: string, statusCode: number) {
  await supabaseAdmin.from("external_planner_access_log").insert({
    planner_token_id: tokenId,
    athlete_id: athleteId,
    action,
    endpoint,
    status_code: statusCode,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    // pathname: /planner-hub-api/<endpoint>
    const endpoint = pathParts[pathParts.length - 1];

    // ─────────────────────────────────────────────────────────────────────
    // AUTENTICACIÓN: Accept both Supabase JWT (hub users) and Planner Token
    // ─────────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    const plannerTokenHeader = req.headers.get("X-Planner-Token");

    let plannerInfo: { id: string; planner_type: string; planner_name: string } | null = null;
    let supabaseUser: any = null;

    if (plannerTokenHeader) {
      // External planner app authentication
      plannerInfo = await validatePlannerToken(plannerTokenHeader);
      if (!plannerInfo) {
        return new Response(JSON.stringify({ error: "Invalid or inactive planner token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (authHeader) {
      // Hub user authentication (admin managing tokens from hub UI)
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await supabase.auth.getUser();
      supabaseUser = user;
    } else {
      return new Response(JSON.stringify({ error: "Missing authentication. Use Authorization header (Hub JWT) or X-Planner-Token header." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─────────────────────────────────────────────────────────────────────
    // ADMIN ENDPOINTS (Hub user only) — Gestión de tokens
    // ─────────────────────────────────────────────────────────────────────

    // POST /planner-hub-api/generate-token
    // Admin generates a token for an external planner
    if (endpoint === "generate-token" && req.method === "POST") {
      if (!supabaseUser) {
        return new Response(JSON.stringify({ error: "Only hub admin users can generate tokens" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const body = await req.json();
      const { planner_name, planner_type, description } = body;
      if (!planner_name || !planner_type) {
        return new Response(JSON.stringify({ error: "planner_name and planner_type are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const rawToken = `planner_${crypto.randomUUID().replace(/-/g, "")}`;
      const tokenHash = await hashToken(rawToken);

      const { data, error } = await supabaseAdmin.from("external_planner_tokens").insert({
        planner_name,
        planner_type,
        description,
        token_hash: tokenHash,
        token_raw: rawToken,
        created_by: supabaseUser.id,
        is_active: true,
      }).select("id, planner_name, planner_type, created_at").single();

      if (error) throw error;

      return new Response(JSON.stringify({
        token: rawToken,
        token_id: data.id,
        planner_name: data.planner_name,
        planner_type: data.planner_type,
        message: "Store this token securely. It will not be shown again.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /planner-hub-api/regenerate-token
    // Admin regenerates a token (replaces hash, returns new raw token)
    if (endpoint === "regenerate-token" && req.method === "POST") {
      if (!supabaseUser) {
        return new Response(JSON.stringify({ error: "Only hub admin users can regenerate tokens" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const body = await req.json();
      const { token_id } = body;
      if (!token_id) {
        return new Response(JSON.stringify({ error: "token_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const rawToken = `planner_${crypto.randomUUID().replace(/-/g, "")}`;
      const tokenHash = await hashToken(rawToken);

      const { data, error } = await supabaseAdmin
        .from("external_planner_tokens")
        .update({ token_hash: tokenHash, token_raw: rawToken, is_active: true, updated_at: new Date().toISOString() })
        .eq("id", token_id)
        .select("id, planner_name, planner_type")
        .single();

      if (error) throw error;
      if (!data) {
        return new Response(JSON.stringify({ error: "Token not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        token: rawToken,
        token_id: data.id,
        planner_name: data.planner_name,
        planner_type: data.planner_type,
        message: "Token regenerated. Store this new token securely. It will not be shown again.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE /planner-hub-api/delete-token
    // Admin deletes a token permanently
    if (endpoint === "delete-token" && req.method === "DELETE") {
      if (!supabaseUser) {
        return new Response(JSON.stringify({ error: "Only hub admin users can delete tokens" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const body = await req.json();
      const { token_id } = body;
      if (!token_id) {
        return new Response(JSON.stringify({ error: "token_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabaseAdmin
        .from("external_planner_tokens")
        .delete()
        .eq("id", token_id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, message: "Token deleted permanently" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /planner-hub-api/list-tokens
    // Admin lists registered planner tokens
    if (endpoint === "list-tokens" && req.method === "GET") {
      if (!supabaseUser) {
        return new Response(JSON.stringify({ error: "Only hub admin users can list tokens" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await supabaseAdmin
        .from("external_planner_tokens")
        .select("id, planner_name, planner_type, description, is_active, last_used_at, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ tokens: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─────────────────────────────────────────────────────────────────────
    // PLANNER ENDPOINTS (external planner app using X-Planner-Token)
    // ─────────────────────────────────────────────────────────────────────

    if (!plannerInfo) {
      return new Response(JSON.stringify({ error: "This endpoint requires X-Planner-Token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ATHLETE_FREE_ENDPOINTS: string[] = [];

    const athleteIdParam = url.searchParams.get("athlete_id");
    const athleteEmail = url.searchParams.get("athlete_email");

    if (!ATHLETE_FREE_ENDPOINTS.includes(endpoint) && !athleteIdParam && !athleteEmail) {
      return new Response(JSON.stringify({ error: "athlete_id or athlete_email query parameter is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve athlete: by ID first, fall back to email
    let athleteProfile: any = null;

    if (athleteIdParam) {
      const { data } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email, sport, date_of_birth, gender, role")
        .eq("id", athleteIdParam)
        .eq("role", "athlete")
        .maybeSingle();
      athleteProfile = data;
    }

    if (!athleteProfile && athleteEmail) {
      const { data } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email, sport, date_of_birth, gender, role")
        .ilike("email", athleteEmail.trim())
        .eq("role", "athlete")
        .maybeSingle();
      athleteProfile = data;
    }

    if (!athleteProfile) {
      return new Response(JSON.stringify({ error: "Athlete not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const athleteId = athleteProfile.id;

    // ──────────────────────────────────────────────────────────────────
    // GET /planner-hub-api/athlete-profile
    // Both Nutrition and Endurance planners: get athlete base data
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "athlete-profile" && req.method === "GET") {
      const { data: kerr } = await supabaseAdmin
        .from("anthropometry_kerr_results")
        .select("fat_mass_kg, lean_mass_kg, fat_percent, measurement_date")
        .eq("athlete_id", athleteId)
        .order("measurement_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: targets } = await supabaseAdmin
        .from("nutrition_targets")
        .select("target_kcal, target_protein_g, target_carbs_g, target_fat_g, updated_at")
        .eq("athlete_id", athleteId)
        .maybeSingle();

      await logAccess(plannerInfo.id, athleteId, "read", endpoint, 200);

      return new Response(JSON.stringify({
        athlete: athleteProfile,
        body_composition: kerr || null,
        nutrition_targets: targets || null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // GET /planner-hub-api/training-schedule
    // Nutrition Planner: reads the athlete's training calendar
    // Returns scheduled + completed workouts with load data
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "training-schedule" && req.method === "GET") {
      const dateFrom = url.searchParams.get("date_from") || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
      const dateTo = url.searchParams.get("date_to") || new Date(Date.now() + 21 * 86400000).toISOString().split("T")[0];

      // ── Helper: extract intensity_color from the notes/description fields
      // The endurance planner writes "DIFFICULTY: Hard (red)", "DIFFICULTY: Moderate (yellow)", "DIFFICULTY: Easy (green)"
      function extractColorFromText(notes: string, description: string): string | null {
        const text = (notes || "") + " " + (description || "");
        const match = text.match(/DIFFICULTY\s*:\s*\w+\s*\((\w+)\)/i);
        if (match) {
          const c = match[1].toLowerCase();
          if (c === "red" || c === "yellow" || c === "green") return c;
        }
        return null;
      }

      // ── 1. Strength/gym workouts (athlete_workouts table) ──────────────
      const { data: scheduledWorkouts } = await supabaseAdmin
        .from("athlete_workouts")
        .select(`
          id,
          scheduled_date,
          status,
          completed_at,
          notes,
          rpe,
          workout:workouts(
            id,
            name,
            description,
            duration_minutes,
            difficulty
          )
        `)
        .eq("athlete_id", athleteId)
        .gte("scheduled_date", dateFrom)
        .lte("scheduled_date", dateTo)
        .order("scheduled_date", { ascending: true });

      const completedWorkoutIds = (scheduledWorkouts || [])
        .filter((w: any) => w.status === "completed")
        .map((w: any) => w.id);

      let setLogSummaries: Record<string, any> = {};
      if (completedWorkoutIds.length > 0) {
        const { data: setLogs } = await supabaseAdmin
          .from("training_logs")
          .select("athlete_workout_id, reps_completed, weight_used, rir, bar_speed, logged_at")
          .in("athlete_workout_id", completedWorkoutIds);

        for (const log of setLogs || []) {
          const wid = log.athlete_workout_id;
          if (!setLogSummaries[wid]) {
            setLogSummaries[wid] = { total_sets: 0, total_reps: 0, last_logged_at: null };
          }
          setLogSummaries[wid].total_sets += 1;
          setLogSummaries[wid].total_reps += log.reps_completed || 0;
          if (!setLogSummaries[wid].last_logged_at || log.logged_at > setLogSummaries[wid].last_logged_at) {
            setLogSummaries[wid].last_logged_at = log.logged_at;
          }
        }
      }

      const strengthWorkouts = (scheduledWorkouts || []).map((w: any) => {
        let intensity_color = "green";
        if (w.rpe !== null && w.rpe !== undefined) {
          if (w.rpe >= 8) intensity_color = "red";
          else if (w.rpe >= 6) intensity_color = "yellow";
          else intensity_color = "green";
        } else if (w.workout?.difficulty) {
          const d = w.workout.difficulty.toLowerCase();
          if (d === "hard" || d === "advanced") intensity_color = "red";
          else if (d === "medium" || d === "intermediate" || d === "moderate") intensity_color = "yellow";
          else intensity_color = "green";
        }
        return {
          ...w,
          workout_source: "strength",
          intensity_color,
          set_log_summary: setLogSummaries[w.id] || null,
        };
      });

      // ── 2. Endurance workouts from external_endurance_plans.plan_data.days[] ──
      // The endurance satellite pushes weekly plans where each day is in plan_data.days[]
      // Color is encoded as "DIFFICULTY: Hard (red)" in notes/description of each day
      const { data: endurancePlans } = await supabaseAdmin
        .from("external_endurance_plans")
        .select("id, week_start_date, plan_name, plan_data, planner_source")
        .eq("athlete_id", athleteId)
        .gte("week_start_date", new Date(new Date(dateFrom).getTime() - 7 * 86400000).toISOString().split("T")[0])
        .lte("week_start_date", dateTo)
        .order("week_start_date", { ascending: true });

      const enduranceWorkouts: any[] = [];
      for (const plan of endurancePlans || []) {
        const days: any[] = plan.plan_data?.days || [];
        for (const day of days) {
          const date: string = String(day.date || "").substring(0, 10);
          if (!date || date < dateFrom || date > dateTo) continue;

          const colorFromText = extractColorFromText(day.notes || "", day.description || "");
          const intensity_color = colorFromText || "green";
          const intensity_label = intensity_color === "red"
            ? "Hard / High Intensity"
            : intensity_color === "yellow"
            ? "Moderate Intensity"
            : "Easy / Recovery";

          enduranceWorkouts.push({
            id: `${plan.id}_${date}`,
            scheduled_date: date,
            name: day.name || "Endurance Session",
            sport: day.sport || "cycling",
            description: day.description || null,
            notes: day.notes || null,
            status: day.completed ? "completed" : "planned",
            planned_duration_minutes: day.planned_duration_minutes || null,
            planned_impulse: day.planned_impulse || null,
            session_type: day.session_type || null,
            target_zones: day.target_zones || [],
            intensity_basis: (day.description || "").match(/Intensity basis:\s*(\w+)/i)?.[1]?.toLowerCase() || null,
            planner_source: plan.planner_source || null,
            workout_source: "endurance",
            intensity_color,
            intensity_label,
          });
        }
      }

      // ── 3. ATP weekly loads ─────────────────────────────────────────────
      const { data: weeklyLoads } = await supabaseAdmin
        .from("atp_weekly_loads")
        .select("week_start_date, planned_tss, actual_tss, planned_hours, actual_hours, load_status")
        .eq("athlete_id", athleteId)
        .gte("week_start_date", dateFrom)
        .lte("week_start_date", dateTo)
        .order("week_start_date", { ascending: true });

      // ── 4. Merge and sort all workouts by date ──────────────────────────
      const allWorkouts = [...strengthWorkouts, ...enduranceWorkouts]
        .sort((a: any, b: any) => a.scheduled_date.localeCompare(b.scheduled_date));

      const total = allWorkouts.length;
      const completed = allWorkouts.filter((w: any) => w.status === "completed").length;
      const pending = allWorkouts.filter((w: any) => w.status === "pending" || w.status === "planned").length;
      const skipped = allWorkouts.filter((w: any) => w.status === "skipped").length;
      const highIntensity = allWorkouts.filter((w: any) => w.intensity_color === "red").length;
      const moderateIntensity = allWorkouts.filter((w: any) => w.intensity_color === "yellow").length;
      const lowIntensity = allWorkouts.filter((w: any) => w.intensity_color === "green").length;

      await logAccess(plannerInfo.id, athleteId, "read", endpoint, 200);

      return new Response(JSON.stringify({
        date_from: dateFrom,
        date_to: dateTo,
        scheduled_workouts: allWorkouts,
        weekly_loads: weeklyLoads || [],
        summary: {
          total,
          completed,
          pending,
          skipped,
          completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
          intensity_distribution: {
            high_red: highIntensity,
            moderate_yellow: moderateIntensity,
            low_green: lowIntensity,
          },
        },
        intensity_color_legend: {
          green: "Easy / Recovery — lighter nutrition needs",
          yellow: "Moderate Intensity — standard fueling",
          red: "Hard / High Intensity / Key Session — elevated carb & calorie needs",
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // GET /planner-hub-api/nutrition-data
    // Endurance Planner: reads nutrition plans pushed by Nutrition Planner
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "nutrition-data" && req.method === "GET") {
      const dateFrom = url.searchParams.get("date_from") || new Date().toISOString().split("T")[0];
      const dateTo = url.searchParams.get("date_to") || new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];

      const { data: nutritionPlans } = await supabaseAdmin
        .from("external_nutrition_plans")
        .select("id, plan_date, plan_name, summary, adherence_data, created_at, updated_at")
        .eq("athlete_id", athleteId)
        .gte("plan_date", dateFrom)
        .lte("plan_date", dateTo)
        .order("plan_date", { ascending: true });

      // Also read from internal meal_plans and meal_adherence
      const { data: internalAdherence } = await supabaseAdmin
        .from("meal_adherence")
        .select("plan_date, fuel_day_type, target_kcal, actual_kcal, adherence_score, target_protein_g, actual_protein_g")
        .eq("athlete_id", athleteId)
        .gte("plan_date", dateFrom)
        .lte("plan_date", dateTo)
        .order("plan_date", { ascending: true });

      await logAccess(plannerInfo.id, athleteId, "read", endpoint, 200);

      return new Response(JSON.stringify({
        external_nutrition_plans: nutritionPlans || [],
        internal_adherence: internalAdherence || [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // POST /planner-hub-api/push-nutrition-plan
    // Nutrition Planner → Hub: sends nutrition plan data
    // Body: { plan_date, plan_name, summary, plan_data, adherence_data, notes }
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "push-nutrition-plan" && req.method === "POST") {
      if (plannerInfo.planner_type !== "nutrition") {
        return new Response(JSON.stringify({ error: "Only nutrition planners can push nutrition plans" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const { plan_date, plan_name, summary, plan_data, adherence_data, notes } = body;

      if (!plan_date) {
        return new Response(JSON.stringify({ error: "plan_date is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabaseAdmin
        .from("external_nutrition_plans")
        .upsert({
          athlete_id: athleteId,
          planner_source: plannerInfo.planner_name,
          plan_date,
          plan_name: plan_name || null,
          summary: summary || {},
          plan_data: plan_data || {},
          adherence_data: adherence_data || {},
          notes: notes || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "athlete_id,plan_date,planner_source",
        })
        .select("id, plan_date, plan_name, updated_at")
        .single();

      if (error) throw error;
      await logAccess(plannerInfo.id, athleteId, "write", endpoint, 200);

      return new Response(JSON.stringify({
        success: true,
        record: data,
        message: `Nutrition plan for ${plan_date} saved to Hub successfully`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // POST /planner-hub-api/push-endurance-plan
    // Endurance Planner → Hub: sends weekly endurance plan
    // Body: { week_start_date, plan_name, summary, plan_data, notes }
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "push-endurance-plan" && req.method === "POST") {
      if (plannerInfo.planner_type !== "endurance") {
        return new Response(JSON.stringify({ error: "Only endurance planners can push endurance plans" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const { week_start_date, plan_name, summary, plan_data, notes } = body;

      if (!week_start_date) {
        return new Response(JSON.stringify({ error: "week_start_date is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const normalizedPlanData = plan_data || {};
      if (normalizedPlanData.days && Array.isArray(normalizedPlanData.days)) {
        normalizedPlanData.days = normalizedPlanData.days.map((day: any) => ({
          ...day,
          date: day.date ? String(day.date).substring(0, 10) : day.date,
        }));
      }

      const { data, error } = await supabaseAdmin
        .from("external_endurance_plans")
        .upsert({
          athlete_id: athleteId,
          planner_source: plannerInfo.planner_name,
          week_start_date: String(week_start_date).substring(0, 10),
          plan_name: plan_name || null,
          summary: summary || {},
          plan_data: normalizedPlanData,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "athlete_id,week_start_date,planner_source",
        })
        .select("id, week_start_date, plan_name, updated_at")
        .single();

      if (error) throw error;
      await logAccess(plannerInfo.id, athleteId, "write", endpoint, 200);

      return new Response(JSON.stringify({
        success: true,
        record: data,
        message: `Endurance plan for week ${week_start_date} saved to Hub successfully`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // POST /planner-hub-api/push-lab-passport
    // Lab → Hub: sends physiological test results as a biological passport version
    // Requires planner_type === "lab"
    // Body: { athlete_id (in query), record_id, measurement_date, test_protocol, notes,
    //         physiological: { vo2max, lt1_power, lt2_power, lt1_hr, lt2_hr, ftp_watts,
    //           critical_power, anaerobic_capacity_kj, running_threshold_pace,
    //           power_zones_json, hr_zones_json, rpe_zones_json },
    //         anthropometry: { height_cm, weight_kg, body_fat_percent, muscle_mass_kg,
    //           lean_mass_kg, bone_mass_kg },
    //         athletic_profile: { training_age_years, athlete_level } }
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "push-lab-passport" && req.method === "POST") {
      if (plannerInfo.planner_type !== "lab") {
        return new Response(JSON.stringify({ error: "Only lab planners can push passport data" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const {
        record_id,
        measurement_date,
        test_protocol,
        notes,
        physiological = {},
        anthropometry = {},
        athletic_profile = {},
        sport_context,
      } = body;

      if (!measurement_date) {
        return new Response(JSON.stringify({ error: "measurement_date is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const safeLabRecordId = record_id && UUID_REGEX.test(record_id) ? record_id : null;

      const VALID_ATHLETE_LEVELS = ["beginner", "intermediate", "advanced", "elite"];
      const safeAthleteLevel = VALID_ATHLETE_LEVELS.includes(athletic_profile.athlete_level)
        ? athletic_profile.athlete_level
        : null;

      // Deactivate any existing active passport for this athlete from this lab source
      await supabaseAdmin
        .from("biological_passports")
        .update({ status: "superseded" })
        .eq("athlete_id", athleteId)
        .eq("source", "lab")
        .eq("status", "active");

      const passportPayload = {
        athlete_id: athleteId,
        source: "lab",
        source_satellite: plannerInfo.planner_name,
        source_test_type: test_protocol || null,
        lab_record_id: safeLabRecordId,
        measurement_date,
        sport_context: sport_context || "other",
        status: "active",
        notes: notes || null,

        vo2max: physiological.vo2max ?? null,
        lt1_power: physiological.lt1_power ?? null,
        lt2_power: physiological.lt2_power ?? null,
        lt1_hr: physiological.lt1_hr ?? null,
        lt2_hr: physiological.lt2_hr ?? null,
        ftp_watts: physiological.ftp_watts ?? null,
        critical_power: physiological.critical_power ?? null,
        anaerobic_capacity_kj: physiological.anaerobic_capacity_kj ?? null,
        running_threshold_pace: physiological.running_threshold_pace ?? null,
        power_zones_json: physiological.power_zones_json ?? null,
        hr_zones_json: physiological.hr_zones_json ?? null,
        rpe_zones_json: physiological.rpe_zones_json ?? null,
        training_zones: physiological.training_zones ?? null,

        height_cm: anthropometry.height_cm ?? null,
        weight_kg: anthropometry.weight_kg ?? null,
        body_fat_percent: anthropometry.body_fat_percent ?? null,
        muscle_mass_kg: anthropometry.muscle_mass_kg ?? null,
        lean_mass_kg: anthropometry.lean_mass_kg ?? null,
        bone_mass_kg: anthropometry.bone_mass_kg ?? null,

        training_age_years: athletic_profile.training_age_years ?? null,
        athlete_level: safeAthleteLevel,
      };

      const { data, error } = await supabaseAdmin
        .from("biological_passports")
        .insert(passportPayload)
        .select("id, athlete_id, measurement_date, source_test_type, status, version_number")
        .single();

      if (error) throw error;

      await logAccess(plannerInfo.id, athleteId, "write", endpoint, 201);

      return new Response(JSON.stringify({
        success: true,
        passport: data,
        message: `Lab passport for athlete ${athleteId} saved to Hub (version ${data.version_number})`,
      }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // POST /planner-hub-api/push-training-log
    // Endurance Planner → Hub: sends a completed endurance workout log
    // Body: { training_date, workout_type, duration_minutes, distance_km,
    //   avg_heart_rate, max_heart_rate, avg_power_watts, max_power_watts,
    //   normalized_power_watts, tss, if_value, rpe, elevation_gain_m,
    //   avg_cadence, avg_speed_kmh, calories,
    //   external_source, external_activity_id, notes }
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "push-training-log" && req.method === "POST") {
      if (plannerInfo.planner_type !== "endurance") {
        return new Response(JSON.stringify({ error: "Only endurance planners can push training logs" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const {
        training_date,
        workout_type,
        duration_minutes,
        distance_km,
        avg_heart_rate,
        max_heart_rate,
        avg_power_watts,
        max_power_watts,
        normalized_power_watts,
        tss,
        if_value,
        rpe,
        elevation_gain_m,
        avg_cadence,
        avg_speed_kmh,
        calories,
        external_source,
        external_activity_id,
        notes,
      } = body;

      if (!training_date || !duration_minutes) {
        return new Response(JSON.stringify({ error: "training_date and duration_minutes are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check for duplicate by external_activity_id if provided
      if (external_activity_id) {
        const { data: existing } = await supabaseAdmin
          .from("training_logs")
          .select("id")
          .eq("athlete_id", athleteId)
          .eq("external_activity_id", external_activity_id)
          .maybeSingle();

        if (existing) {
          // Update existing record instead of inserting duplicate
          const { data: updated, error: updateError } = await supabaseAdmin
            .from("training_logs")
            .update({
              training_date,
              workout_type: workout_type || null,
              duration_minutes,
              distance_km: distance_km ?? null,
              avg_heart_rate: avg_heart_rate ?? null,
              max_heart_rate: max_heart_rate ?? null,
              avg_power_watts: avg_power_watts ?? null,
              max_power_watts: max_power_watts ?? null,
              normalized_power_watts: normalized_power_watts ?? null,
              tss: tss ?? null,
              if_value: if_value ?? null,
              rpe: rpe ?? null,
              elevation_gain_m: elevation_gain_m ?? null,
              avg_cadence: avg_cadence ?? null,
              avg_speed_kmh: avg_speed_kmh ?? null,
              calories: calories ?? null,
              notes: notes ?? null,
              external_source: external_source ?? plannerInfo.planner_name,
            })
            .eq("id", existing.id)
            .select("id, training_date, workout_type, duration_minutes")
            .single();

          if (updateError) throw updateError;
          await logAccess(plannerInfo.id, athleteId, "write", endpoint, 200);
          return new Response(JSON.stringify({
            success: true,
            record: updated,
            message: `Training log for ${training_date} updated in Hub`,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const { data, error } = await supabaseAdmin
        .from("training_logs")
        .insert({
          athlete_id: athleteId,
          training_date,
          workout_type: workout_type || null,
          duration_minutes,
          distance_km: distance_km ?? null,
          avg_heart_rate: avg_heart_rate ?? null,
          max_heart_rate: max_heart_rate ?? null,
          avg_power_watts: avg_power_watts ?? null,
          max_power_watts: max_power_watts ?? null,
          normalized_power_watts: normalized_power_watts ?? null,
          tss: tss ?? null,
          if_value: if_value ?? null,
          rpe: rpe ?? null,
          elevation_gain_m: elevation_gain_m ?? null,
          avg_cadence: avg_cadence ?? null,
          avg_speed_kmh: avg_speed_kmh ?? null,
          calories: calories ?? null,
          notes: notes ?? null,
          external_source: external_source ?? plannerInfo.planner_name,
          external_activity_id: external_activity_id ?? null,
        })
        .select("id, training_date, workout_type, duration_minutes")
        .single();

      if (error) throw error;
      await logAccess(plannerInfo.id, athleteId, "write", endpoint, 201);

      return new Response(JSON.stringify({
        success: true,
        record: data,
        message: `Training log for ${training_date} saved to Hub`,
      }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // GET /planner-hub-api/biological-passport
    // Endurance Planner: reads the athlete's active biological passport
    // Returns the most recent active passport with all physiological data
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "biological-passport" && req.method === "GET") {
      const { data: passport } = await supabaseAdmin
        .from("biological_passports")
        .select(`
          id,
          measurement_date,
          source,
          source_satellite,
          source_test_type,
          sport_context,
          status,
          notes,
          vo2max,
          lt1_power,
          lt2_power,
          lt1_hr,
          lt2_hr,
          ftp_watts,
          critical_power,
          anaerobic_capacity_kj,
          running_threshold_pace,
          power_zones_json,
          hr_zones_json,
          rpe_zones_json,
          training_zones,
          vam,
          pam,
          height_cm,
          weight_kg,
          body_fat_percent,
          muscle_mass_kg,
          lean_mass_kg,
          bone_mass_kg,
          training_age_years,
          athlete_level,
          version_number,
          created_at
        `)
        .eq("athlete_id", athleteId)
        .eq("status", "active")
        .order("measurement_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: passportHistory } = await supabaseAdmin
        .from("biological_passports")
        .select("id, measurement_date, source, source_test_type, status, vo2max, ftp_watts, lt2_power, version_number")
        .eq("athlete_id", athleteId)
        .order("measurement_date", { ascending: false })
        .limit(10);

      await logAccess(plannerInfo.id, athleteId, "read", endpoint, 200);

      return new Response(JSON.stringify({
        active_passport: passport || null,
        passport_history: passportHistory || [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // POST /planner-hub-api/push-endurance-workout
    // Endurance Planner → Hub: sends a single scheduled workout with steps
    // Body: { name, sport, sub_discipline, description, intensity_basis,
    //   scheduled_date, scheduled_time, estimated_duration_minutes,
    //   estimated_impulse, status, steps }
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "push-endurance-workout" && req.method === "POST") {
      if (plannerInfo.planner_type !== "endurance") {
        return new Response(JSON.stringify({ error: "Only endurance planners can push endurance workouts" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const {
        name,
        sport,
        sub_discipline,
        description,
        intensity_basis,
        scheduled_date,
        scheduled_time,
        estimated_duration_minutes,
        estimated_impulse,
        status,
        steps,
        external_workout_id,
      } = body;

      if (!scheduled_date) {
        return new Response(JSON.stringify({ error: "scheduled_date is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const upsertPayload: any = {
        athlete_id: athleteId,
        planner_source: plannerInfo.planner_name,
        name: name || "Endurance Session",
        sport: sport || "cycling",
        sub_discipline: sub_discipline || null,
        description: description || null,
        intensity_basis: intensity_basis || "rpe",
        scheduled_date,
        scheduled_time: scheduled_time || null,
        estimated_duration_minutes: estimated_duration_minutes || null,
        estimated_impulse: estimated_impulse || null,
        status: status || "planned",
        steps: steps || [],
        updated_at: new Date().toISOString(),
      };

      if (external_workout_id) {
        upsertPayload.external_workout_id = external_workout_id;
      }

      let savedRecord: any;
      let savedError: any;

      if (external_workout_id) {
        // Upsert by external_workout_id
        const { data: existing } = await supabaseAdmin
          .from("external_endurance_workouts")
          .select("id")
          .eq("athlete_id", athleteId)
          .eq("external_workout_id", external_workout_id)
          .maybeSingle();

        if (existing) {
          const { data, error } = await supabaseAdmin
            .from("external_endurance_workouts")
            .update(upsertPayload)
            .eq("id", existing.id)
            .select("id, name, scheduled_date, status")
            .single();
          savedRecord = data;
          savedError = error;
        } else {
          const { data, error } = await supabaseAdmin
            .from("external_endurance_workouts")
            .insert(upsertPayload)
            .select("id, name, scheduled_date, status")
            .single();
          savedRecord = data;
          savedError = error;
        }
      } else {
        // Insert always (no dedup key)
        const { data, error } = await supabaseAdmin
          .from("external_endurance_workouts")
          .insert(upsertPayload)
          .select("id, name, scheduled_date, status")
          .single();
        savedRecord = data;
        savedError = error;
      }

      if (savedError) throw savedError;
      await logAccess(plannerInfo.id, athleteId, "write", endpoint, 201);

      return new Response(JSON.stringify({
        success: true,
        record: savedRecord,
        message: `Endurance workout "${savedRecord.name}" for ${scheduled_date} saved to Hub`,
      }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // POST /planner-hub-api/push-endurance-workouts
    // Endurance Planner → Hub: sends multiple scheduled workouts at once
    // Body: { workouts: [ { name, sport, scheduled_date, steps, ... } ] }
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "push-endurance-workouts" && req.method === "POST") {
      if (plannerInfo.planner_type !== "endurance") {
        return new Response(JSON.stringify({ error: "Only endurance planners can push endurance workouts" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const { workouts: workoutList } = body;

      if (!Array.isArray(workoutList) || workoutList.length === 0) {
        return new Response(JSON.stringify({ error: "workouts array is required and must not be empty" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results: any[] = [];
      const errors: any[] = [];

      for (const w of workoutList) {
        if (!w.scheduled_date) {
          errors.push({ workout: w.name || "unknown", error: "scheduled_date is required" });
          continue;
        }

        const payload: any = {
          athlete_id: athleteId,
          planner_source: plannerInfo.planner_name,
          name: w.name || "Endurance Session",
          sport: w.sport || "cycling",
          sub_discipline: w.sub_discipline || null,
          description: w.description || null,
          intensity_basis: w.intensity_basis || "rpe",
          scheduled_date: w.scheduled_date,
          scheduled_time: w.scheduled_time || null,
          estimated_duration_minutes: w.estimated_duration_minutes || null,
          estimated_impulse: w.estimated_impulse || null,
          status: w.status || "planned",
          steps: w.steps || [],
          updated_at: new Date().toISOString(),
        };

        if (w.external_workout_id) {
          payload.external_workout_id = w.external_workout_id;

          const { data: existing } = await supabaseAdmin
            .from("external_endurance_workouts")
            .select("id")
            .eq("athlete_id", athleteId)
            .eq("external_workout_id", w.external_workout_id)
            .maybeSingle();

          if (existing) {
            const { data, error } = await supabaseAdmin
              .from("external_endurance_workouts")
              .update(payload)
              .eq("id", existing.id)
              .select("id, name, scheduled_date, status")
              .single();
            if (error) errors.push({ workout: w.name, error: error.message });
            else results.push(data);
            continue;
          }
        }

        const { data, error } = await supabaseAdmin
          .from("external_endurance_workouts")
          .insert(payload)
          .select("id, name, scheduled_date, status")
          .single();
        if (error) errors.push({ workout: w.name, error: error.message });
        else results.push(data);
      }

      await logAccess(plannerInfo.id, athleteId, "write", endpoint, 201);

      return new Response(JSON.stringify({
        success: errors.length === 0,
        saved: results,
        errors,
        message: `${results.length} workout(s) saved, ${errors.length} error(s)`,
      }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // DELETE /planner-hub-api/delete-endurance-workout
    // Endurance Planner → Hub: deletes a scheduled workout by id or external_workout_id
    // Body: { workout_id } or { external_workout_id }
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "delete-endurance-workout" && req.method === "DELETE") {
      if (plannerInfo.planner_type !== "endurance") {
        return new Response(JSON.stringify({ error: "Only endurance planners can delete endurance workouts" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const { workout_id, external_workout_id } = body;

      if (!workout_id && !external_workout_id) {
        return new Response(JSON.stringify({ error: "workout_id or external_workout_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let query = supabaseAdmin
        .from("external_endurance_workouts")
        .delete()
        .eq("athlete_id", athleteId);

      if (workout_id) query = query.eq("id", workout_id);
      else query = query.eq("external_workout_id", external_workout_id);

      const { error } = await query;
      if (error) throw error;

      await logAccess(plannerInfo.id, athleteId, "write", endpoint, 200);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // GET /planner-hub-api/endurance-workouts
    // Reads individual scheduled endurance workouts (with steps)
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "endurance-workouts" && req.method === "GET") {
      const dateFrom = url.searchParams.get("date_from") || new Date().toISOString().split("T")[0];
      const dateTo = url.searchParams.get("date_to") || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

      const { data: workouts, error } = await supabaseAdmin
        .from("external_endurance_workouts")
        .select("id, name, sport, sub_discipline, description, intensity_basis, scheduled_date, scheduled_time, estimated_duration_minutes, estimated_impulse, status, steps, planner_source, external_workout_id, created_at, updated_at")
        .eq("athlete_id", athleteId)
        .gte("scheduled_date", dateFrom)
        .lte("scheduled_date", dateTo)
        .order("scheduled_date", { ascending: true });

      if (error) throw error;
      await logAccess(plannerInfo.id, athleteId, "read", endpoint, 200);

      return new Response(JSON.stringify({ workouts: workouts || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // GET /planner-hub-api/endurance-data
    // Nutrition Planner: reads endurance plans pushed by Endurance Planner
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "endurance-data" && req.method === "GET") {
      const dateFrom = url.searchParams.get("date_from") || new Date().toISOString().split("T")[0];
      const dateTo = url.searchParams.get("date_to") || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

      const { data: endurancePlans } = await supabaseAdmin
        .from("external_endurance_plans")
        .select("id, week_start_date, plan_name, summary, created_at, updated_at")
        .eq("athlete_id", athleteId)
        .gte("week_start_date", dateFrom)
        .lte("week_start_date", dateTo)
        .order("week_start_date", { ascending: true });

      await logAccess(plannerInfo.id, athleteId, "read", endpoint, 200);

      return new Response(JSON.stringify({
        external_endurance_plans: endurancePlans || [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // GET /planner-hub-api/food-diary
    // Nutrition Planner: reads the athlete's food diary sessions and entries
    // Returns food diary sessions with their entries for a date range
    // Query params: date_from, date_to
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "food-diary" && req.method === "GET") {
      const dateFrom = url.searchParams.get("date_from") || new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
      const dateTo = url.searchParams.get("date_to") || new Date().toISOString().split("T")[0];

      const { data: sessions } = await supabaseAdmin
        .from("food_diary_sessions")
        .select("id, start_date, period_hours, status, total_calories, total_protein_g, total_carbs_g, total_fat_g, ai_observations, professional_notes, completed_at, reviewed_at, adherence_score, created_at")
        .eq("athlete_id", athleteId)
        .gte("start_date", dateFrom)
        .lte("start_date", dateTo)
        .order("start_date", { ascending: false });

      const sessionIds = (sessions || []).map((s: any) => s.id);

      let entries: any[] = [];
      if (sessionIds.length > 0) {
        const { data: entriesData } = await supabaseAdmin
          .from("food_diary_entries")
          .select("id, session_id, food_id, food_name, quantity_g, kcal, protein_g, carbs_g, fat_g, off_product_id, created_at")
          .in("session_id", sessionIds)
          .order("created_at", { ascending: true });
        entries = entriesData || [];
      }

      const entriesBySession: Record<string, any[]> = {};
      for (const entry of entries) {
        if (!entriesBySession[entry.session_id]) entriesBySession[entry.session_id] = [];
        entriesBySession[entry.session_id].push(entry);
      }

      const result = (sessions || []).map((s: any) => ({
        ...s,
        entries: entriesBySession[s.id] || [],
      }));

      const dailyTotals: Record<string, { kcal: number; protein_g: number; carbs_g: number; fat_g: number; sessions: number }> = {};
      for (const s of sessions || []) {
        const key = s.start_date;
        if (!dailyTotals[key]) {
          dailyTotals[key] = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, sessions: 0 };
        }
        dailyTotals[key].kcal += s.total_calories || 0;
        dailyTotals[key].protein_g += s.total_protein_g || 0;
        dailyTotals[key].carbs_g += s.total_carbs_g || 0;
        dailyTotals[key].fat_g += s.total_fat_g || 0;
        dailyTotals[key].sessions += 1;
      }

      await logAccess(plannerInfo.id, athleteId, "read", endpoint, 200);

      return new Response(JSON.stringify({
        date_from: dateFrom,
        date_to: dateTo,
        sessions: result,
        daily_totals: dailyTotals,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // GET /planner-hub-api/anthropometry
    // Nutrition Planner: reads the athlete's anthropometry measurements
    // Returns latest records + Kerr body composition results + history
    // Query params: limit (default 5 for history)
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "anthropometry" && req.method === "GET") {
      const historyLimit = parseInt(url.searchParams.get("limit") || "5");

      const { data: kerrHistory } = await supabaseAdmin
        .from("anthropometry_kerr_results")
        .select(`
          id,
          measurement_date,
          fat_mass_kg,
          lean_mass_kg,
          muscle_mass_kg,
          bone_mass_kg,
          residual_mass_kg,
          skin_mass_kg,
          fat_percent,
          lean_percent,
          muscle_percent,
          bone_percent,
          height_cm,
          weight_kg,
          bmi,
          created_at
        `)
        .eq("athlete_id", athleteId)
        .order("measurement_date", { ascending: false })
        .limit(historyLimit);

      const { data: rawMeasurements } = await supabaseAdmin
        .from("anthropometry_measurements")
        .select(`
          id,
          record_id,
          measurement_type,
          value,
          unit,
          measurement_date,
          created_at
        `)
        .eq("athlete_id", athleteId)
        .order("measurement_date", { ascending: false })
        .limit(historyLimit * 30);

      const { data: bioimpedance } = await supabaseAdmin
        .from("bioimpedance_measurements")
        .select("id, measurement_date, weight_kg, body_fat_percent, muscle_mass_kg, bone_mass_kg, body_water_percent, visceral_fat_index, bmr_kcal, notes")
        .eq("athlete_id", athleteId)
        .order("measurement_date", { ascending: false })
        .limit(historyLimit);

      const latestKerr = kerrHistory && kerrHistory.length > 0 ? kerrHistory[0] : null;

      const measurementsByDate: Record<string, any[]> = {};
      for (const m of rawMeasurements || []) {
        if (!measurementsByDate[m.measurement_date]) measurementsByDate[m.measurement_date] = [];
        measurementsByDate[m.measurement_date].push(m);
      }

      await logAccess(plannerInfo.id, athleteId, "read", endpoint, 200);

      return new Response(JSON.stringify({
        latest_body_composition: latestKerr,
        kerr_history: kerrHistory || [],
        raw_measurements_by_date: measurementsByDate,
        bioimpedance_history: bioimpedance || [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // GET /planner-hub-api/athlete-habits
    // Returns the athlete's active habits with compliance stats
    // Query params: athlete_email or athlete_id, days (default 30)
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "athlete-habits" && req.method === "GET") {
      const days = parseInt(url.searchParams.get("days") || "30");
      const since = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
      const today = new Date().toISOString().split("T")[0];

      // Load user_habits joined with habit_templates for category info
      const { data: userHabits } = await supabaseAdmin
        .from("user_habits")
        .select(`
          id,
          name,
          description,
          tracking_type,
          numeric_unit,
          numeric_target,
          is_active,
          assigned_by,
          created_at,
          habit_template_id,
          habit_templates (
            category,
            numeric_unit,
            numeric_target
          )
        `)
        .eq("user_id", athleteId)
        .order("created_at", { ascending: false });

      const habitIds = (userHabits || []).map((h: any) => h.id);

      let logs: any[] = [];
      if (habitIds.length > 0) {
        const { data: logsData } = await supabaseAdmin
          .from("habit_logs")
          .select("habit_id, log_date, completed, value, notes")
          .in("habit_id", habitIds)
          .gte("log_date", since)
          .lte("log_date", today)
          .order("log_date", { ascending: false });
        logs = logsData || [];
      }

      // Group logs by habit_id
      const logsByHabit: Record<string, any[]> = {};
      for (const log of logs) {
        if (!logsByHabit[log.habit_id]) logsByHabit[log.habit_id] = [];
        logsByHabit[log.habit_id].push(log);
      }

      // Calculate streaks and compliance per habit
      const habitsWithStats = (userHabits || []).map((h: any) => {
        const habitLogs = logsByHabit[h.id] || [];
        const completedLogs = habitLogs.filter((l: any) => l.completed);
        const compliancePct = days > 0 ? Math.round((completedLogs.length / days) * 100 * 10) / 10 : 0;

        // Current streak: count consecutive completed days from today backwards
        const logDateSet = new Set(completedLogs.map((l: any) => l.log_date));
        let currentStreak = 0;
        let bestStreak = 0;
        let tempStreak = 0;
        const sortedDates = habitLogs.map((l: any) => l.log_date).sort().reverse();

        for (let i = 0; i < days; i++) {
          const d = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
          if (logDateSet.has(d)) {
            if (i === currentStreak) currentStreak++;
            tempStreak++;
            if (tempStreak > bestStreak) bestStreak = tempStreak;
          } else {
            if (i < currentStreak) break;
            tempStreak = 0;
          }
        }

        const lastLogged = sortedDates[0] || null;
        const category = h.habit_templates?.category || "general";

        return {
          id: h.id,
          category,
          name: h.name,
          tracking_type: h.tracking_type,
          frequency: "daily",
          target_value: h.numeric_target ?? h.habit_templates?.numeric_target ?? null,
          target_unit: h.numeric_unit ?? h.habit_templates?.numeric_unit ?? null,
          current_streak: currentStreak,
          best_streak: bestStreak,
          compliance_pct: compliancePct,
          last_logged: lastLogged,
          active: h.is_active ?? true,
          logs_count: completedLogs.length,
        };
      });

      // Compute sleep and hydration averages from habit logs
      const sleepHabit = habitsWithStats.find((h: any) =>
        h.category === "sleep" || h.name?.toLowerCase().includes("sleep") || h.name?.toLowerCase().includes("sueño")
      );
      const hydrationHabit = habitsWithStats.find((h: any) =>
        h.category === "hydration" || h.name?.toLowerCase().includes("hydration") || h.name?.toLowerCase().includes("hidrat") || h.name?.toLowerCase().includes("agua")
      );

      const sleepLogs = sleepHabit ? (logsByHabit[sleepHabit.id] || []).filter((l: any) => l.value != null) : [];
      const hydrationLogs = hydrationHabit ? (logsByHabit[hydrationHabit.id] || []).filter((l: any) => l.value != null) : [];

      const sleepAvg = sleepLogs.length > 0
        ? Math.round((sleepLogs.reduce((s: number, l: any) => s + Number(l.value), 0) / sleepLogs.length) * 10) / 10
        : null;
      const hydrationAvg = hydrationLogs.length > 0
        ? Math.round((hydrationLogs.reduce((s: number, l: any) => s + Number(l.value), 0) / hydrationLogs.length) * 10) / 10
        : null;

      const activeHabits = habitsWithStats.filter((h: any) => h.active);
      const avgCompliance = activeHabits.length > 0
        ? Math.round(activeHabits.reduce((s: number, h: any) => s + h.compliance_pct, 0) / activeHabits.length * 10) / 10
        : 0;

      await logAccess(plannerInfo.id, athleteId, "read", endpoint, 200);

      return new Response(JSON.stringify({
        athlete_id: athleteId,
        date_range: { from: since, to: today, days },
        habits: habitsWithStats,
        sleep_avg_hours: sleepAvg,
        hydration_avg_liters: hydrationAvg,
        summary: {
          total_habits: habitsWithStats.length,
          active_habits: activeHabits.length,
          avg_compliance_pct: avgCompliance,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // GET /planner-hub-api/completed-workouts
    // Endurance Planner: reads manually logged completed endurance workouts
    // These are submitted by the athlete via "Log Workout" in the Hub app.
    // Each record includes: duration_seconds, time_in_zones (always seconds),
    // intervals, rpe, effort, source, wellness (null if not submitted)
    // Query params: date_from, date_to, limit (default 50)
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "completed-workouts" && req.method === "GET") {
      const dateFrom = url.searchParams.get("date_from") || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
      const dateTo = url.searchParams.get("date_to") || new Date().toISOString().split("T")[0];
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);

      const { data: completedWorkouts, error } = await supabaseAdmin
        .from("endurance_completed_workouts")
        .select("id, planned_workout_id, scheduled_date, sport, workout_name, duration_seconds, time_in_zones, intervals, rpe, effort, source, wellness, notes, created_at")
        .eq("athlete_id", athleteId)
        .gte("scheduled_date", dateFrom)
        .lte("scheduled_date", dateTo)
        .order("scheduled_date", { ascending: false })
        .limit(limit);

      if (error) throw error;

      const totalDuration = (completedWorkouts || []).reduce((s: number, w: any) => s + (w.duration_seconds || 0), 0);
      const avgRpe = (() => {
        const withRpe = (completedWorkouts || []).filter((w: any) => w.rpe != null);
        if (withRpe.length === 0) return null;
        return Math.round((withRpe.reduce((s: number, w: any) => s + w.rpe, 0) / withRpe.length) * 10) / 10;
      })();

      const timeInZonesTotals: Record<string, number> = {};
      for (const w of completedWorkouts || []) {
        const tiz = w.time_in_zones || {};
        for (const [zone, secs] of Object.entries(tiz)) {
          timeInZonesTotals[zone] = (timeInZonesTotals[zone] || 0) + (secs as number);
        }
      }

      await logAccess(plannerInfo.id, athleteId, "read", endpoint, 200);

      return new Response(JSON.stringify({
        athlete_id: athleteId,
        date_from: dateFrom,
        date_to: dateTo,
        completed_workouts: completedWorkouts || [],
        summary: {
          count: (completedWorkouts || []).length,
          total_duration_seconds: totalDuration,
          avg_rpe: avgRpe,
          time_in_zones_totals: timeInZonesTotals,
        },
        contract: {
          time_in_zones: "always in seconds (absolute)",
          source_values: ["manual_block_based", "quick_log"],
          wellness: "null if athlete did not submit wellness at time of logging",
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // GET /planner-hub-api/wellness
    // Returns wellness checkin data for a date range
    // Query params: athlete_email or athlete_id, date_from, date_to
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "wellness" && req.method === "GET") {
      const dateFrom = url.searchParams.get("date_from") || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
      const dateTo = url.searchParams.get("date_to") || new Date().toISOString().split("T")[0];

      const { data: checkins } = await supabaseAdmin
        .from("wellness_checkins")
        .select(`
          id,
          checkin_date,
          sleep_quality,
          sleep_hours,
          sleep_duration,
          sleep_quality_10,
          fatigue_level,
          fatigue_level_10,
          stress_level,
          stress_level_10,
          muscle_soreness,
          lower_body_soreness,
          upper_body_soreness,
          back_soreness,
          motivation,
          motivation_10,
          hydration,
          urine_color,
          hrv,
          rhr,
          prs,
          illness_symptoms,
          general_notes,
          injury_notes,
          ready_to_train,
          overall_score,
          wellness_score_100,
          created_at
        `)
        .eq("athlete_id", athleteId)
        .gte("checkin_date", dateFrom)
        .lte("checkin_date", dateTo)
        .order("checkin_date", { ascending: false });

      const normalize = (c: any) => {
        // Normalize to 1-10 scale, preferring the _10 fields
        const fatigue = c.fatigue_level_10 ?? (c.fatigue_level ? Math.round(c.fatigue_level * 2) : null);
        const stress = c.stress_level_10 ?? (c.stress_level ? Math.round(c.stress_level * 2) : null);
        const sleepQuality = c.sleep_quality_10 ?? (c.sleep_quality ? Math.round(c.sleep_quality * 2) : null);
        const motivation = c.motivation_10 ?? (c.motivation ? Math.round(c.motivation * 2) : null);
        const avgSoreness = c.lower_body_soreness != null && c.upper_body_soreness != null
          ? Math.round(((c.lower_body_soreness + c.upper_body_soreness + (c.back_soreness ?? c.upper_body_soreness)) / 3) * 10) / 10
          : c.muscle_soreness ?? null;
        const sleepHours = c.sleep_duration === ">8h" ? 8.5
          : c.sleep_duration === "7-8h" ? 7.5
          : c.sleep_duration === "6-7h" ? 6.5
          : c.sleep_duration === "<6h" ? 5.5
          : (c.sleep_hours ?? null);
        const overallScore = c.wellness_score_100 != null
          ? Math.round(c.wellness_score_100 / 10 * 10) / 10
          : (c.overall_score ?? null);

        return {
          date: c.checkin_date,
          fatigue,
          mood: motivation,
          sleep_quality: sleepQuality,
          sleep_hours: sleepHours,
          muscle_soreness: avgSoreness,
          lower_body_soreness: c.lower_body_soreness ?? null,
          upper_body_soreness: c.upper_body_soreness ?? null,
          back_soreness: c.back_soreness ?? null,
          stress,
          motivation,
          urine_color: c.urine_color ?? null,
          hrv: c.hrv ?? null,
          resting_hr: c.rhr ?? null,
          prs: c.prs ?? null,
          illness_symptoms: c.illness_symptoms ?? null,
          notes: c.general_notes ?? c.injury_notes ?? null,
          ready_to_train: c.ready_to_train ?? null,
          overall_score: overallScore,
          wellness_score_100: c.wellness_score_100 ?? null,
        };
      };

      const entries = (checkins || []).map(normalize);
      const latest = entries.length > 0 ? entries[0] : null;

      // Compute averages over the range
      const avg = (field: string) => {
        const vals = entries.map((e: any) => e[field]).filter((v: any) => v != null && !isNaN(v));
        return vals.length > 0 ? Math.round((vals.reduce((s: number, v: number) => s + v, 0) / vals.length) * 10) / 10 : null;
      };

      const averages = latest ? {
        date_range: { from: dateFrom, to: dateTo, count: entries.length },
        fatigue: avg("fatigue"),
        mood: avg("mood"),
        sleep_quality: avg("sleep_quality"),
        sleep_hours: avg("sleep_hours"),
        muscle_soreness: avg("muscle_soreness"),
        stress: avg("stress"),
        motivation: avg("motivation"),
        hrv: avg("hrv"),
        resting_hr: avg("resting_hr"),
        overall_score: avg("overall_score"),
        wellness_score_100: avg("wellness_score_100"),
      } : null;

      await logAccess(plannerInfo.id, athleteId, "read", endpoint, 200);

      return new Response(JSON.stringify({
        athlete_id: athleteId,
        date_from: dateFrom,
        date_to: dateTo,
        latest,
        averages,
        entries,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─────────────────────────────────────────────────────────────────────
    // POST /academy-courses-webhook
    // Academy pushes course results back to the Hub (callback push)
    // Authenticated via X-Planner-Token or Authorization: Bearer <token>
    // ─────────────────────────────────────────────────────────────────────
    if (endpoint === "academy-courses-webhook" && req.method === "POST") {
      if (!plannerInfo) {
        return new Response(JSON.stringify({ error: "Planner token required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const { athlete_id, athlete_email, courses, action } = body;

      if (action !== "academy_courses_result") {
        return new Response(JSON.stringify({ error: "Invalid action. Expected academy_courses_result" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!Array.isArray(courses) || courses.length === 0) {
        return new Response(JSON.stringify({ success: true, upserted: 0, message: "No courses to process" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const sourceName = plannerInfo.planner_name || "Academy";
      let upserted = 0;
      const errors: string[] = [];

      for (const c of courses) {
        const courseId = c.id || "";
        if (!courseId) continue;

        const row = {
          title: c.title || courseId,
          title_es: c.title_es || null,
          description: c.description || null,
          description_es: c.description_es || null,
          url: c.url || "",
          image_url: c.image_url || null,
          category: c.category || "other",
          price: typeof c.price === "number" ? c.price : 0,
          duration_hours: typeof c.duration_hours === "number" ? c.duration_hours : null,
          level: c.level || "beginner",
          language: c.language || "es",
          sports: Array.isArray(c.sports) ? c.sports : [],
          is_active: true,
          sort_order: typeof c.sort_order === "number" ? c.sort_order : 999,
          external_source: sourceName,
          external_course_id: courseId,
          external_updated_at: new Date().toISOString(),
        };

        const { error: upsertErr } = await supabaseAdmin
          .from("courses")
          .upsert(row, { onConflict: "external_source,external_course_id" });

        if (upsertErr) {
          errors.push(`${courseId}: ${upsertErr.message}`);
        } else {
          upserted++;
        }
      }

      console.log(`Academy webhook: upserted ${upserted}/${courses.length} courses for athlete ${athlete_id || athlete_email || "unknown"}`);

      return new Response(JSON.stringify({
        success: true,
        upserted,
        total: courses.length,
        errors: errors.length > 0 ? errors : undefined,
        athlete_id: athlete_id || null,
        source: sourceName,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─────────────────────────────────────────────────────────────────────
    // POST /push-tags  (any planner type)
    // Satellite pushes its own tags for an athlete to the Hub Tag Hub
    // ─────────────────────────────────────────────────────────────────────
    if (endpoint === "push-tags" && req.method === "POST") {
      if (!plannerInfo) {
        return new Response(JSON.stringify({ error: "Planner token required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const athleteIdParam = url.searchParams.get("athlete_id");
      const athleteEmailParam = url.searchParams.get("athlete_email");

      let resolvedAthleteId: string | null = athleteIdParam;
      if (!resolvedAthleteId && athleteEmailParam) {
        const { data: p } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("email", athleteEmailParam)
          .maybeSingle();
        resolvedAthleteId = p?.id ?? null;
      }

      if (!resolvedAthleteId) {
        return new Response(JSON.stringify({ error: "athlete_id or athlete_email required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();

      /*
        Expected payload:
        {
          "tags": [
            {
              "name": "Zone 2",
              "name_es": "Zona 2",         // optional
              "slug": "zone-2",
              "category": "training",       // training|nutrition|recovery|performance|mindset|methodology|other
              "color": "#22c55e",           // optional, hex color
              "description": "...",         // optional
              "source_context": "endurance_plan_2026_W14"  // optional free text
            }
          ]
        }
      */

      const tags: Array<{
        name: string;
        name_es?: string;
        slug: string;
        category: string;
        color?: string;
        description?: string;
        source_context?: string;
      }> = body.tags || [];

      if (!Array.isArray(tags) || tags.length === 0) {
        return new Response(JSON.stringify({ error: "tags array is required and must not be empty" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const validCategories = ['training', 'nutrition', 'recovery', 'performance', 'mindset', 'methodology', 'other'];
      const results: string[] = [];
      const errors: string[] = [];

      for (const tag of tags) {
        if (!tag.name || !tag.slug) {
          errors.push(`Tag missing name or slug: ${JSON.stringify(tag)}`);
          continue;
        }
        const category = validCategories.includes(tag.category) ? tag.category : 'other';

        const { error } = await supabaseAdmin
          .from("satellite_tags")
          .upsert({
            athlete_id: resolvedAthleteId,
            planner_token_id: plannerInfo.id,
            planner_name: plannerInfo.planner_name,
            planner_type: plannerInfo.planner_type,
            name: tag.name,
            name_es: tag.name_es ?? null,
            slug: tag.slug,
            category,
            color: tag.color ?? '#fdda36',
            description: tag.description ?? null,
            source_context: tag.source_context ?? null,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'athlete_id,planner_token_id,slug',
          });

        if (error) {
          errors.push(`Error upserting tag "${tag.name}": ${error.message}`);
        } else {
          results.push(tag.slug);
        }
      }

      await logAccess(plannerInfo.id, resolvedAthleteId, "write", endpoint, 201);

      return new Response(JSON.stringify({
        success: errors.length === 0,
        saved: results,
        errors,
        message: `${results.length} tag(s) saved, ${errors.length} error(s)`,
      }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─────────────────────────────────────────────────────────────────────
    // GET /athlete-satellite-tags  (any planner type — read own athlete tags)
    // ─────────────────────────────────────────────────────────────────────
    if (endpoint === "athlete-satellite-tags" && req.method === "GET") {
      if (!plannerInfo) {
        return new Response(JSON.stringify({ error: "Planner token required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const athleteIdParam = url.searchParams.get("athlete_id");
      const athleteEmailParam = url.searchParams.get("athlete_email");

      let resolvedAthleteId: string | null = athleteIdParam;
      if (!resolvedAthleteId && athleteEmailParam) {
        const { data: p } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("email", athleteEmailParam)
          .maybeSingle();
        resolvedAthleteId = p?.id ?? null;
      }

      if (!resolvedAthleteId) {
        return new Response(JSON.stringify({ error: "athlete_id or athlete_email required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: satelliteTags, error } = await supabaseAdmin
        .from("satellite_tags")
        .select("*")
        .eq("athlete_id", resolvedAthleteId)
        .order("category")
        .order("name");

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await logAccess(plannerInfo.id, resolvedAthleteId, "read", endpoint, 200);

      return new Response(JSON.stringify({ tags: satelliteTags || [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // POST /planner-hub-api/push-race-plan
    // Endurance planner pushes a race-day fuel plan for an athlete.
    // Creates or replaces the active race plan for that athlete.
    // Body: { race_name, sport, distance_km, expected_duration_min,
    //         target_pace_min_km?, temperature_c?,
    //         carbs_g_per_hour, fluid_l_per_hour, sodium_mg_per_hour,
    //         caffeine_total_mg?, caffeine_pre_dose_mg?,
    //         caffeine_pre_dose_min_before?, caffeine_mid_race_doses?,
    //         segments?: [{name, duration_min, carbs_g_per_hour?, ...}],
    //         scheduled_date?, notes? }
    // ──────────────────────────────────────────────────────────────────
    if (endpoint === "push-race-plan" && req.method === "POST") {
      const body = await req.json();
      const {
        race_name,
        sport = "cycling",
        distance_km,
        expected_duration_min,
        target_pace_min_km,
        temperature_c,
        carbs_g_per_hour,
        fluid_l_per_hour,
        sodium_mg_per_hour,
        caffeine_total_mg,
        caffeine_pre_dose_mg,
        caffeine_pre_dose_min_before,
        caffeine_mid_race_doses,
        total_carbs_g,
        total_fluid_l,
        total_sodium_mg,
        segments,
        scheduled_date,
        notes,
        external_plan_id,
      } = body;

      if (!race_name) {
        return new Response(JSON.stringify({ error: "race_name is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Deactivate any previous active plan for this athlete
      await supabaseAdmin
        .from("race_plans")
        .update({ is_active: false })
        .eq("athlete_id", athleteId)
        .eq("is_active", true);

      const { data: newPlan, error: insertError } = await supabaseAdmin
        .from("race_plans")
        .insert({
          athlete_id: athleteId,
          race_name,
          sport,
          distance_km: distance_km ?? null,
          expected_duration_min: expected_duration_min ?? null,
          target_pace_min_km: target_pace_min_km ?? null,
          temperature_c: temperature_c ?? null,
          carbs_g_per_hour: carbs_g_per_hour ?? null,
          fluid_l_per_hour: fluid_l_per_hour ?? null,
          sodium_mg_per_hour: sodium_mg_per_hour ?? null,
          caffeine_total_mg: caffeine_total_mg ?? null,
          caffeine_pre_dose_mg: caffeine_pre_dose_mg ?? null,
          caffeine_pre_dose_min_before: caffeine_pre_dose_min_before ?? null,
          caffeine_mid_race_doses: caffeine_mid_race_doses ?? null,
          total_carbs_g: total_carbs_g ?? null,
          total_fluid_l: total_fluid_l ?? null,
          total_sodium_mg: total_sodium_mg ?? null,
          segments: segments ?? null,
          scheduled_date: scheduled_date ?? null,
          notes: notes ?? null,
          planner_source: plannerInfo.planner_name,
          external_plan_id: external_plan_id ?? null,
          is_active: true,
        })
        .select("id, race_name, sport, scheduled_date, expected_duration_min")
        .single();

      if (insertError) throw insertError;

      await logAccess(plannerInfo.id, athleteId, "write", endpoint, 200);

      return new Response(JSON.stringify({
        success: true,
        race_plan_id: newPlan.id,
        race_name: newPlan.race_name,
        sport: newPlan.sport,
        scheduled_date: newPlan.scheduled_date,
        expected_duration_min: newPlan.expected_duration_min,
        message: "Race plan pushed successfully. Previous active plan deactivated.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      error: "Unknown endpoint",
      available_endpoints: {
        "admin_only": ["POST /generate-token", "GET /list-tokens"],
        "planner_read": [
          "GET /athlete-profile",
          "GET /training-schedule",
          "GET /nutrition-data",
          "GET /endurance-data",
          "GET /biological-passport",
          "GET /food-diary",
          "GET /anthropometry",
          "GET /athlete-habits",
          "GET /wellness",
          "GET /athlete-satellite-tags",
        ],
        "planner_write": [
          "POST /push-nutrition-plan",
          "POST /push-endurance-plan",
          "POST /push-endurance-workout",
          "POST /push-endurance-workouts",
          "DELETE /delete-endurance-workout",
          "POST /push-training-log (endurance type only)",
          "POST /push-lab-passport (lab type only)",
          "POST /push-tags (any type)",
        ],
        "planner_read_endurance": ["GET /endurance-workouts", "GET /endurance-data"],
      },
    }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
