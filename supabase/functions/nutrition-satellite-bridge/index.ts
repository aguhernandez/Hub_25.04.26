import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  console.log("DEBUG: Incoming request");
  console.log("DEBUG: Method:", req.method);
  console.log("DEBUG: URL:", req.url);
  console.log("DEBUG: Headers:", Array.from(req.headers.entries()));

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    let authHeader = req.headers.get("Authorization");
    const plannerToken = req.headers.get("X-Planner-Token");

    console.log("DEBUG: authHeader:", authHeader);
    console.log("DEBUG: plannerToken:", plannerToken);

    if (!authHeader && plannerToken) {
      authHeader = `Bearer ${plannerToken}`;
      console.log("DEBUG: Using plannerToken as Bearer token");
    }

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log("DEBUG: Auth error:", authError);
    console.log("DEBUG: User:", user?.id);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized", details: authError?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const endpoint = url.pathname.split("/").pop();
    const athleteId = url.searchParams.get("athlete_id") || user.id;
    const athleteEmail = url.searchParams.get("athlete_email");
    const dateFrom = url.searchParams.get("date_from");
    const dateTo = url.searchParams.get("date_to");

    console.log("DEBUG: Endpoint:", endpoint);
    console.log("DEBUG: athleteEmail:", athleteEmail);

    // POST /nutrition-satellite-bridge/push-nutrition-plan
    // Receives a full nutrition plan from the Nutrition Satellite and stores it
    if (endpoint === "push-nutrition-plan" && req.method === "POST") {
      console.log("DEBUG: Handling push-nutrition-plan");

      const { data: pusherProfile } = await serviceSupabase
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .maybeSingle();

      console.log("DEBUG: Pusher profile:", pusherProfile);

      if (!pusherProfile || !["trainer", "admin"].includes(pusherProfile.role)) {
        return new Response(JSON.stringify({ error: "Only trainers and admins can push nutrition plans" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      console.log("DEBUG: Request body keys:", Object.keys(body));
      console.log("DEBUG: Full body:", JSON.stringify(body, null, 2));

      const { plan_date, plan_name, plan_duration_days, summary, plan_data, notes } = body;

      console.log("DEBUG: Extracted fields - plan_date:", plan_date, "summary:", !!summary, "plan_data:", !!plan_data);

      if (!plan_date || !summary || !plan_data) {
        return new Response(JSON.stringify({
          error: "Missing required fields: plan_date, summary, plan_data",
          received: { plan_date, summary: !!summary, plan_data: !!plan_data }
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let resolvedAthleteId = athleteId;

      if (athleteEmail && !url.searchParams.get("athlete_id")) {
        const { data: athleteByEmail } = await serviceSupabase
          .from("profiles")
          .select("id")
          .eq("email", athleteEmail)
          .maybeSingle();

        if (!athleteByEmail) {
          return new Response(JSON.stringify({ error: `No athlete found with email: ${athleteEmail}` }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        resolvedAthleteId = athleteByEmail.id;
      }

      // Mark any existing active plan as superseded
      await serviceSupabase
        .from("nutrition_pushed_plans")
        .update({ status: "superseded" })
        .eq("athlete_id", resolvedAthleteId)
        .eq("status", "active");

      // Insert the new plan
      const { data: newPlan, error: insertError } = await serviceSupabase
        .from("nutrition_pushed_plans")
        .insert({
          athlete_id: resolvedAthleteId,
          pushed_by: user.id,
          plan_date,
          plan_name: plan_name || "Plan Nutricional",
          plan_duration_days: plan_duration_days || 7,
          status: "active",
          summary,
          plan_data,
          notes: notes || null,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      return new Response(JSON.stringify({ success: true, id: newPlan.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /nutrition-satellite-bridge/active-plan
    // Returns the full active pushed nutrition plan for an athlete
    if (endpoint === "active-plan") {
      const { data: plan, error: planError } = await supabase
        .from("nutrition_pushed_plans")
        .select("*")
        .eq("athlete_id", athleteId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (planError) throw planError;

      return new Response(JSON.stringify({ plan }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /nutrition-satellite-bridge/training-load
    if (endpoint === "training-load") {
      let query = supabase
        .from("training_logs")
        .select(`
          id,
          training_date,
          duration_minutes,
          distance_km,
          avg_heart_rate,
          avg_power_watts,
          tss,
          rpe,
          workout_type,
          notes
        `)
        .eq("athlete_id", athleteId)
        .order("training_date", { ascending: false });

      if (dateFrom) query = query.gte("training_date", dateFrom);
      if (dateTo) query = query.lte("training_date", dateTo);

      const { data, error } = await query.limit(90);
      if (error) throw error;

      return new Response(JSON.stringify({ training_logs: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /nutrition-satellite-bridge/athlete-profile
    if (endpoint === "athlete-profile") {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          role,
          sport,
          weight_kg,
          height_cm,
          birth_date,
          gender
        `)
        .eq("id", athleteId)
        .maybeSingle();

      if (profileError) throw profileError;

      const { data: bioimpedance } = await supabase
        .from("bioimpedance_measurements")
        .select("weight, height, adipose_tissue_percent, adipose_tissue_kg, muscle_mass_percent, muscle_mass_kg, measurement_date")
        .eq("user_id", athleteId)
        .order("measurement_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      return new Response(JSON.stringify({
        profile,
        body_composition: bioimpedance ? {
          weight_kg: bioimpedance.weight,
          height_cm: bioimpedance.height,
          fat_percent: bioimpedance.adipose_tissue_percent,
          fat_mass_kg: bioimpedance.adipose_tissue_kg,
          lean_mass_kg: bioimpedance.muscle_mass_kg,
          muscle_mass_percent: bioimpedance.muscle_mass_percent,
          measurement_date: bioimpedance.measurement_date,
        } : null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /nutrition-satellite-bridge/scheduled-workouts
    if (endpoint === "scheduled-workouts") {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("athlete_workouts")
        .select(`
          id,
          scheduled_date,
          workout_id,
          status,
          workouts (
            id,
            title,
            workout_type,
            duration_minutes,
            estimated_tss
          )
        `)
        .eq("athlete_id", athleteId)
        .gte("scheduled_date", today)
        .order("scheduled_date", { ascending: true })
        .limit(14);

      if (error) throw error;

      return new Response(JSON.stringify({ scheduled_workouts: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /nutrition-satellite-bridge/nutrition-summary
    if (endpoint === "nutrition-summary") {
      const today = new Date().toISOString().split("T")[0];

      const [planResult, adherenceResult, diaryResult, targetsResult, pushedPlanResult, externalPlanResult] = await Promise.all([
        supabase
          .from("meal_plans")
          .select("id, plan_name, status, target_kcal, target_protein_g, target_carbs_g, target_fat_g")
          .eq("athlete_id", athleteId)
          .eq("status", "active")
          .maybeSingle(),
        supabase
          .from("meal_adherence")
          .select("adherence_score, actual_kcal, target_kcal, date")
          .eq("athlete_id", athleteId)
          .eq("date", today)
          .maybeSingle(),
        supabase
          .from("food_diary_sessions")
          .select("id, session_date, status")
          .eq("athlete_id", athleteId)
          .order("session_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("nutrition_targets")
          .select("target_kcal, target_protein_g, target_carbs_g, target_fat_g, updated_at")
          .eq("athlete_id", athleteId)
          .maybeSingle(),
        supabase
          .from("nutrition_pushed_plans")
          .select("id, plan_name, plan_date, plan_duration_days, summary, plan_data, status, created_at, notes")
          .eq("athlete_id", athleteId)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        serviceSupabase
          .from("external_nutrition_plans")
          .select("id, plan_name, plan_date, summary, plan_data, notes, planner_source, updated_at")
          .eq("athlete_id", athleteId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      // Pick the most recent plan between nutrition_pushed_plans and external_nutrition_plans
      let pushedPlan = pushedPlanResult.data;
      const externalPlan = externalPlanResult.data;

      if (externalPlan) {
        const externalDate = new Date(externalPlan.updated_at).getTime();
        const pushedDate = pushedPlan ? new Date(pushedPlan.created_at).getTime() : 0;

        if (externalDate >= pushedDate) {
          pushedPlan = {
            id: externalPlan.id,
            plan_name: externalPlan.plan_name || externalPlan.planner_source || "Plan Nutricional",
            plan_date: externalPlan.plan_date,
            plan_duration_days: externalPlan.plan_data?.days?.length || 7,
            summary: externalPlan.summary,
            plan_data: externalPlan.plan_data,
            status: "active",
            created_at: externalPlan.updated_at,
            notes: externalPlan.notes,
          };
        }
      }

      return new Response(JSON.stringify({
        active_plan: planResult.data,
        today_adherence: adherenceResult.data,
        last_diary_session: diaryResult.data,
        nutrition_targets: targetsResult.data,
        pushed_plan: pushedPlan,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /nutrition-satellite-bridge/biological-passport
    if (endpoint === "biological-passport") {
      const { data: passport, error: passportError } = await supabase
        .from("biological_passports")
        .select(`
          id,
          version_number,
          status,
          source,
          measurement_date,
          vo2max,
          lt1_power,
          lt2_power,
          lt1_hr,
          lt2_hr,
          ftp_watts,
          critical_power,
          anaerobic_capacity_kj,
          running_threshold_pace,
          sport_context,
          power_zones_json,
          hr_zones_json,
          rpe_zones_json,
          height_cm,
          weight_kg,
          body_fat_percent,
          muscle_mass_kg,
          lean_mass_kg,
          bone_mass_kg,
          training_age_years,
          athlete_level,
          skinfold_sum_6,
          notes,
          created_at,
          updated_at
        `)
        .eq("athlete_id", athleteId)
        .in("status", ["current", "active"])
        .order("measurement_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (passportError) throw passportError;

      // Also fetch the latest passport regardless of status as fallback
      let latestPassport = passport;
      if (!latestPassport) {
        const { data: fallback } = await supabase
          .from("biological_passports")
          .select("id, version_number, status, source, measurement_date, vo2max, lt1_power, lt2_power, lt1_hr, lt2_hr, ftp_watts, critical_power, running_threshold_pace, sport_context, power_zones_json, hr_zones_json, rpe_zones_json, height_cm, weight_kg, body_fat_percent, muscle_mass_kg, lean_mass_kg, bone_mass_kg, training_age_years, athlete_level, skinfold_sum_6, notes, updated_at")
          .eq("athlete_id", athleteId)
          .order("measurement_date", { ascending: false })
          .limit(1)
          .maybeSingle();
        latestPassport = fallback;
      }

      return new Response(JSON.stringify({ biological_passport: latestPassport }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /nutrition-satellite-bridge/anamnesis
    if (endpoint === "anamnesis") {
      const { data: anamnesis, error: anamnesisError } = await supabase
        .from("nutrition_anamnesis")
        .select("*")
        .eq("athlete_id", athleteId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (anamnesisError) throw anamnesisError;

      return new Response(JSON.stringify({ anamnesis }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /nutrition-satellite-bridge/food-diary
    // Returns the last N food diary sessions with their entries
    if (endpoint === "food-diary") {
      const limitParam = parseInt(url.searchParams.get("limit") || "5");
      const limit = Math.min(limitParam, 20);

      const { data: sessions, error: sessionsError } = await supabase
        .from("food_diary_sessions")
        .select(`
          id,
          period_hours,
          start_date,
          day_of_week,
          status,
          total_calories,
          total_carbs_g,
          total_protein_g,
          total_fat_g,
          ai_observations,
          professional_notes,
          completed_at,
          created_at
        `)
        .eq("athlete_id", athleteId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (sessionsError) throw sessionsError;

      // Fetch entries for each session
      let sessionsWithEntries = sessions || [];
      if (sessionsWithEntries.length > 0) {
        const sessionIds = sessionsWithEntries.map((s: any) => s.id);
        const { data: entries } = await supabase
          .from("food_diary_entries")
          .select("id, session_id, entry_time, meal_type, food_description, estimated_calories, estimated_carbs_g, estimated_protein_g, estimated_fat_g, additional_notes")
          .in("session_id", sessionIds)
          .order("entry_time", { ascending: true });

        sessionsWithEntries = sessionsWithEntries.map((session: any) => ({
          ...session,
          entries: (entries || []).filter((e: any) => e.session_id === session.id),
        }));
      }

      return new Response(JSON.stringify({ food_diary_sessions: sessionsWithEntries }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown endpoint. Use: push-nutrition-plan, active-plan, training-load, athlete-profile, scheduled-workouts, nutrition-summary, biological-passport, anamnesis, food-diary" }), {
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
