import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GenerateRequest {
  muscle_focus?: string[];
  session_type?: string;
  available_equipment?: string;
  duration_minutes?: number;
  block_weeks?: number;
  sessions_per_week?: number;
  language?: "es" | "en";
  model?: string;
}

async function getOpenAIKey(supabaseAdmin: any): Promise<string> {
  const envKey = Deno.env.get("OPENAI_API_KEY");
  if (envKey) return envKey;

  const { data } = await supabaseAdmin
    .from("api_configurations")
    .select("config_value, encrypted_value")
    .eq("service_name", "openai")
    .eq("config_key", "api_key")
    .eq("is_active", true)
    .maybeSingle();

  if (!data) {
    throw new Error(
      "OpenAI API key not configured. Go to Settings → API Configuration → OpenAI to add your key."
    );
  }

  if (data.config_value) return data.config_value;

  if (data.encrypted_value) {
    const encryptionKey = Deno.env.get("VITE_API_ENCRYPTION_KEY") || "asciende-default-key-2024";
    const { data: decrypted, error: decryptError } = await supabaseAdmin.rpc(
      "decrypt_api_config",
      { p_encrypted_value: data.encrypted_value, p_key: encryptionKey }
    );
    if (!decryptError && decrypted) return decrypted;
  }

  throw new Error(
    "OpenAI API key not configured. Go to Settings → API Configuration → OpenAI to add your key."
  );
}

function buildWorkoutPrompt(
  dayNumber: number,
  weekNumber: number,
  totalWeeks: number,
  sessionsPerWeek: number,
  body: GenerateRequest,
  athleteProfile: any,
  completedSessions: any[],
  trainingLogs: any[],
  wellnessCheckins: any[],
  strengthEstimates: any[],
  exerciseList: any[],
  avgRpe: number | null,
  lowEnergyCount: number,
  painFlags: string[],
  progressionHints: string[],
  recentFeedbackNotes: string,
  todayWellness: any,
  avgWellnessScore: number | null,
  wellnessTrend: string,
  lastWeekSessions: any[],
  sessionFrequencyPerWeek: string,
  unitLabel: string,
  lang: string
): string {
  const totalSessions = totalWeeks * sessionsPerWeek;
  const currentSessionNumber = (weekNumber - 1) * sessionsPerWeek + dayNumber;

  const blockContext = totalWeeks > 1 ? `
Training Block: Week ${weekNumber} of ${totalWeeks}, Day ${dayNumber} of ${sessionsPerWeek} (session ${currentSessionNumber}/${totalSessions})
Block periodization:
  * Weeks 1-${Math.ceil(totalWeeks * 0.4)}: Accumulation — higher volume, moderate intensity (RPE 7-8)
  * Weeks ${Math.ceil(totalWeeks * 0.4) + 1}-${Math.ceil(totalWeeks * 0.75)}: Intensification — lower volume, higher intensity (RPE 8-9)
  * Weeks ${Math.ceil(totalWeeks * 0.75) + 1}-${totalWeeks - 1}: Realization — peak intensity (RPE 9-10), minimal volume
  * Week ${totalWeeks}: Deload — 50% volume, 70% intensity
Current phase: ${weekNumber <= Math.ceil(totalWeeks * 0.4) ? "Accumulation" : weekNumber <= Math.ceil(totalWeeks * 0.75) ? "Intensification" : weekNumber < totalWeeks ? "Realization" : "Deload"}` : `Single week plan — Day ${dayNumber} of ${sessionsPerWeek}`;

  return `Generate a complete gym workout session for:
- Session type: ${body.session_type || "hypertrophy"}
- Muscle focus: ${body.muscle_focus && body.muscle_focus.length > 0 ? body.muscle_focus.join(", ") : "auto-select for balanced programming across the week"}
- Duration: ${body.duration_minutes || 60} minutes
- Equipment: ${body.available_equipment || "full gym"}
- Language for all text: ${lang === "es" ? "Spanish" : "English"}

ATHLETE PROFILE:
- Name: ${athleteProfile?.full_name || "Athlete"}
- Objectives: ${athleteProfile?.objectives || "General strength and hypertrophy"}
- Sport: ${athleteProfile?.sport || "Gym / General fitness"}
- Weight: ${athleteProfile?.weight_kg ? `${athleteProfile.weight_kg} kg` : "not provided"}
- Units: ${unitLabel}

TRAINING HISTORY (last 5 weeks):
- Sessions completed: ${completedSessions.length} (${sessionFrequencyPerWeek}/week avg)
- Total sets logged: ${trainingLogs.length}
- Average RPE: ${avgRpe ? avgRpe.toFixed(1) : "no data"}
- Low energy sessions: ${lowEnergyCount}
- Pain/injury flags: ${painFlags.length > 0 ? painFlags.join(", ") : "none"}
- Progression: ${progressionHints.length > 0 ? progressionHints.join(". ") : "insufficient data"}
Recent feedback: ${recentFeedbackNotes || "None"}

WELLNESS:
${todayWellness ? `Today: score=${todayWellness.overall_score || "N/A"}/5, fatigue=${todayWellness.fatigue_level || "?"}/5, motivation=${todayWellness.motivation || "?"}/5` : "No check-in today"}
14-day avg wellness: ${avgWellnessScore ? avgWellnessScore.toFixed(1) : "no data"}
${wellnessTrend ? `Trend: ${wellnessTrend}` : ""}

BLOCK CONTEXT:
${blockContext}

EXERCISE LIBRARY (USE ONLY THESE IDs):
${JSON.stringify(exerciseList)}

STRUCTURE — The workout MUST have exactly 4 sections in this order:

SECTION 1: "Mobility & Stretching" (2-3 exercises)
- Dynamic mobility and activation stretches relevant to today's muscle focus
- Use exercises from the library with type = "Mobility" or movement = "Mobility"
- If no mobility exercises exist in library for the focus, use general hip flexor, thoracic, or shoulder mobility
- Duration ~5-7 minutes total
- No sets/reps format: use time (e.g. "30" seconds per side)
- section_tag: "mobility"

SECTION 2: "Warm-Up Circuit" (exactly 4 exercises, circuit format)
- Exercise 1: ANTERIOR CORE — plank variation, dead bug, hollow hold, ab wheel, etc.
- Exercise 2: LATERAL CORE — side plank, pallof press, lateral band walk, etc.
- Exercise 3: SPINAL/BACK ACTIVATION — bird dog, superman, back extension, face pull, YTW, etc.
- Exercise 4: FULL-BODY ACTIVATOR — use something dynamic: DB snatch, kettlebell swing, jump, burpee, mountain climber, bear crawl, etc.
- 1 round of the circuit, moderate intensity, ~10 minutes total
- section_tag: "warmup"

SECTION 3: "Main Work" (2-3 exercises — TIER 1 and TIER 2 compounds)
- TIER 1 PRIMARY: patternAbility starts with "Squat-Double Leg", "Hinge-Double Leg", "Push-", "Pull-"
- TIER 2 SECONDARY: patternAbility starts with "Squat-Single Leg", "Hinge-Single Leg"
- Include warm-up sets + working sets with proper set_lines
- section_tag: "main_work"

SECTION 4: "Secondary Work" (2-3 exercises — TIER 3 accessories/isolation)
- patternAbility starts with "Accessory-"
- Targeted isolation exercises to complement main work
- section_tag: "secondary_work"

PROGRAMMING RULES:
- NEVER put Accessory- exercises before compounds
- Adjust intensity based on wellness score (≥4: full, 3-4: moderate, <3: -15-20% volume)
- ${body.session_type === "strength" ? "1-5 reps, RIR 1-2, 3-5 min rest" : body.session_type === "power" ? "1-3 reps explosive, RIR 3, 3-5 min rest" : body.session_type === "endurance" ? "15-20+ reps, RIR 3-4, 60-90s rest" : "6-12 reps, RIR 2-3, 90-120s rest"}
- secondary_value = realistic starting weight in ${unitLabel}
- If pain flags: AVOID those body parts completely
- For a ${sessionsPerWeek}x/week plan, balance muscle groups across the ${sessionsPerWeek} sessions (this is day ${dayNumber})

OUTPUT — JSON only, no markdown:
{
  "name": "Session name in ${lang === "es" ? "Spanish" : "English"}",
  "description": "1-2 sentence description",
  "week": ${weekNumber},
  "day": ${dayNumber},
  "exercises": [
    {
      "exercise_id": "<exact id from library>",
      "exercise_name": "<exact name from library>",
      "primary_metric": "reps",
      "secondary_metric": "${unitLabel}",
      "notes": "Coach notes",
      "order_index": 0,
      "section_tag": "mobility",
      "set_lines": [
        {
          "sets": 1,
          "reps": "30s",
          "primary_value": "30s",
          "primary_metric": "time",
          "secondary_value": null,
          "secondary_metric": null,
          "rest_seconds": 0,
          "rir": null,
          "notes": "Each side"
        }
      ]
    }
  ]
}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const body: GenerateRequest = await req.json();
    const athleteId = user.id;
    const lang = body.language || "es";
    const modelRequested = body.model || "gpt-4o-mini";
    const sessionsPerWeek = Math.min(Math.max(body.sessions_per_week || 3, 1), 7);
    const totalWeeks = body.block_weeks || 1;

    const openaiKey = await getOpenAIKey(supabaseAdmin);

    const fiveWeeksAgo = new Date();
    fiveWeeksAgo.setDate(fiveWeeksAgo.getDate() - 35);
    const fiveWeeksAgoStr = fiveWeeksAgo.toISOString().split("T")[0];

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const twoWeeksAgoStr = twoWeeksAgo.toISOString().split("T")[0];

    const today = new Date().toISOString().split("T")[0];

    const [
      workoutsResult,
      logsResult,
      profileResult,
      exercisesResult,
      wellnessResult,
      strengthResult,
    ] = await Promise.all([
      supabase
        .from("athlete_workouts")
        .select("scheduled_date, status, rpe, energy_level, pain_level, mood, feedback_notes, completed_at")
        .eq("athlete_id", athleteId)
        .gte("scheduled_date", fiveWeeksAgoStr)
        .order("scheduled_date", { ascending: false })
        .limit(50),

      supabase
        .from("training_logs")
        .select("set_number, reps_completed, weight_used, rir, logged_at, workout_exercise_id")
        .eq("athlete_id", athleteId)
        .gte("logged_at", fiveWeeksAgo.toISOString())
        .order("logged_at", { ascending: false })
        .limit(400),

      supabase
        .from("profiles")
        .select("objectives, sport, unit_preference, full_name, weight_kg, height_cm, birth_date, gender")
        .eq("id", athleteId)
        .maybeSingle(),

      supabase
        .from("exercises")
        .select("id, exercise, category, equipment, body_part, movement, pattern_ability, type")
        .eq("is_global", true)
        .order("exercise")
        .limit(200),

      supabase
        .from("wellness_checkins")
        .select("checkin_date, sleep_quality, sleep_hours, stress_level, fatigue_level, muscle_soreness, motivation, hydration, nutrition_quality, overall_score, ready_to_train, injury_notes, general_notes")
        .eq("athlete_id", athleteId)
        .gte("checkin_date", twoWeeksAgoStr)
        .order("checkin_date", { ascending: false })
        .limit(14),

      supabase
        .from("strength_estimates")
        .select("exercise_id, one_rm_kg, estimated_at")
        .eq("athlete_id", athleteId)
        .order("estimated_at", { ascending: false })
        .limit(20),
    ]);

    const recentWorkouts = workoutsResult.data || [];
    const trainingLogs = logsResult.data || [];
    const athleteProfile = profileResult.data;
    const exerciseLibrary = exercisesResult.data || [];
    const wellnessCheckins = wellnessResult.data || [];
    const strengthEstimates = strengthResult.data || [];

    if (exerciseLibrary.length === 0) {
      throw new Error("Exercise library not available");
    }

    const completedSessions = recentWorkouts.filter((w: any) => w.status === "completed");
    const sessionsWithRpe = completedSessions.filter((w: any) => w.rpe);
    const avgRpe = sessionsWithRpe.length > 0
      ? sessionsWithRpe.reduce((s: number, w: any) => s + (w.rpe || 0), 0) / sessionsWithRpe.length
      : null;

    const lastWeekSessions = completedSessions.filter((w: any) => {
      const d = new Date(w.scheduled_date);
      return d >= twoWeeksAgo;
    });

    const painFlags = recentWorkouts
      .filter((w: any) => w.pain_level === "moderate" || w.pain_level === "strong")
      .map((w: any) => `${w.scheduled_date}: ${w.pain_level} pain`);

    const lowEnergyCount = recentWorkouts
      .filter((w: any) => w.energy_level === "low" || w.energy_level === "very_low").length;

    const highMoodSessions = completedSessions
      .filter((w: any) => w.mood === "high" || w.mood === "very_high").length;

    const recentFeedbackNotes = recentWorkouts
      .filter((w: any) => w.feedback_notes)
      .slice(0, 5)
      .map((w: any) => `${w.scheduled_date}: "${w.feedback_notes}"`)
      .join("\n");

    const sessionFrequencyPerWeek = completedSessions.length > 0
      ? (completedSessions.length / 5).toFixed(1)
      : "0";

    const todayWellness = wellnessCheckins.find((w: any) => w.checkin_date === today);
    const avgWellnessScore = wellnessCheckins.length > 0
      ? wellnessCheckins
          .filter((w: any) => w.overall_score)
          .reduce((s: number, w: any) => s + parseFloat(w.overall_score || 0), 0) / wellnessCheckins.filter((w: any) => w.overall_score).length
      : null;

    const wellnessTrend = wellnessCheckins.slice(0, 7).map((w: any) =>
      `${w.checkin_date}: score=${w.overall_score || "N/A"}, fatigue=${w.fatigue_level || "?"}/5, motivation=${w.motivation || "?"}/5`
    ).join(" | ");

    const exerciseVolumes: Record<string, { weights: number[] }> = {};
    trainingLogs.forEach((log: any) => {
      if (log.weight_used) {
        const key = log.workout_exercise_id;
        if (!exerciseVolumes[key]) exerciseVolumes[key] = { weights: [] };
        exerciseVolumes[key].weights.push(parseFloat(log.weight_used));
      }
    });

    const progressionHints: string[] = [];
    Object.entries(exerciseVolumes).forEach(([, data]) => {
      if (data.weights.length >= 3) {
        const recentAvg = data.weights.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
        const olderAvg = data.weights.slice(-3).reduce((a, b) => a + b, 0) / 3;
        if (recentAvg > olderAvg * 1.05) progressionHints.push("Progressive overload detected");
        else if (recentAvg < olderAvg * 0.95) progressionHints.push("Load reduction detected — may need deload");
      }
    });

    const unitLabel = athleteProfile?.unit_preference === "imperial" ? "lb" : "kg";

    const mobilityExercises = exerciseLibrary.filter((e: any) =>
      e.type === "Mobility" || e.movement === "Mobility" || e.category === "Mobility"
    ).slice(0, 20).map((e: any) => ({ id: e.id, name: e.exercise, pa: e.pattern_ability, type: "mobility" }));

    const compoundExercises = exerciseLibrary.filter((e: any) => {
      const pa = e.pattern_ability || "";
      return pa.startsWith("Squat") || pa.startsWith("Hinge") || pa.startsWith("Push") || pa.startsWith("Pull");
    }).slice(0, 50).map((e: any) => ({ id: e.id, name: e.exercise, eq: e.equipment, bp: e.body_part, pa: e.pattern_ability }));

    const coreExercises = exerciseLibrary.filter((e: any) => {
      const bp = (e.body_part || "").toLowerCase();
      const pa = (e.pattern_ability || "").toLowerCase();
      return bp.includes("core") || bp.includes("abs") || bp.includes("abdomen") || pa.includes("core") || pa.includes("anti");
    }).slice(0, 25).map((e: any) => ({ id: e.id, name: e.exercise, bp: e.body_part, pa: e.pattern_ability }));

    const accessoryExercises = exerciseLibrary.filter((e: any) => {
      const pa = e.pattern_ability || "";
      return pa.startsWith("Accessory");
    }).slice(0, 40).map((e: any) => ({ id: e.id, name: e.exercise, eq: e.equipment, bp: e.body_part, pa: e.pattern_ability }));

    const exerciseList = {
      mobility: mobilityExercises,
      core: coreExercises,
      compounds: compoundExercises,
      accessories: accessoryExercises,
    };

    const systemPrompt = `You are an elite strength and conditioning coach. Generate complete gym workout sessions with MOBILITY, WARM-UP, MAIN WORK, and SECONDARY WORK sections. Respond ONLY with valid JSON — no markdown, no code blocks, no explanation.`;

    const totalWorkoutsToGenerate = totalWeeks * sessionsPerWeek;

    if (totalWorkoutsToGenerate === 1) {
      const userPrompt = buildWorkoutPrompt(
        1, 1, totalWeeks, sessionsPerWeek,
        body, athleteProfile, completedSessions, trainingLogs, wellnessCheckins,
        strengthEstimates, exerciseList, avgRpe, lowEnergyCount, painFlags,
        progressionHints, recentFeedbackNotes, todayWellness, avgWellnessScore,
        wellnessTrend, lastWeekSessions, sessionFrequencyPerWeek, unitLabel, lang
      );

      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: modelRequested,
          max_tokens: 5000,
          temperature: 0.7,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!openaiResponse.ok) {
        const errText = await openaiResponse.text();
        if (openaiResponse.status === 401) throw new Error("Invalid OpenAI API key. Please check your key in Settings → API Configuration → OpenAI.");
        if (openaiResponse.status === 429) throw new Error("OpenAI rate limit exceeded. Please try again in a moment.");
        throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errText}`);
      }

      const openaiData = await openaiResponse.json();
      const rawContent = openaiData.choices?.[0]?.message?.content;
      if (!rawContent) throw new Error("Empty response from OpenAI");

      let generatedWorkout: any;
      try {
        generatedWorkout = JSON.parse(rawContent);
      } catch {
        throw new Error("OpenAI returned invalid JSON");
      }

      const exerciseIdSet = new Set(exerciseLibrary.map((e: any) => e.id));
      generatedWorkout.exercises = (generatedWorkout.exercises || []).filter((ex: any) => {
        if (!exerciseIdSet.has(ex.exercise_id)) {
          console.warn(`Exercise ID ${ex.exercise_id} not in library, skipping`);
          return false;
        }
        return true;
      });

      if (generatedWorkout.exercises.length === 0) throw new Error("No valid exercises in generated workout");

      return new Response(
        JSON.stringify({
          success: true,
          mode: "single",
          workout: generatedWorkout,
          model_used: modelRequested,
          athlete_readiness_score: todayWellness?.overall_score || null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Multi-session plan: generate ALL sessions in a single OpenAI call
    const exerciseIdSet = new Set(exerciseLibrary.map((e: any) => e.id));
    const totalWorkouts = totalWeeks * sessionsPerWeek;

    const blockContextFull = `
Training Block: ${totalWeeks} week(s), ${sessionsPerWeek} sessions/week = ${totalWorkouts} total sessions.
Periodization:
  * Weeks 1-${Math.ceil(totalWeeks * 0.4)}: Accumulation — higher volume, moderate intensity (RPE 7-8)
  * Weeks ${Math.ceil(totalWeeks * 0.4) + 1}-${Math.ceil(totalWeeks * 0.75)}: Intensification — lower volume, higher intensity (RPE 8-9)
  * Weeks ${Math.ceil(totalWeeks * 0.75) + 1}-${totalWeeks > 1 ? totalWeeks - 1 : 1}: Realization — peak intensity (RPE 9-10), minimal volume
  * Week ${totalWeeks} (if >1): Deload — 50% volume, 70% intensity`;

    const multiSystemPrompt = `You are an elite strength and conditioning coach. Generate a complete multi-session training block. Respond ONLY with valid JSON — no markdown, no code blocks, no explanation. The response must be a JSON object with a "workouts" array containing exactly ${totalWorkouts} workout objects.`;

    const multiUserPrompt = `Generate a complete ${totalWeeks}-week training block with ${sessionsPerWeek} sessions/week (${totalWorkouts} total sessions) for:
- Session type: ${body.session_type || "hypertrophy"}
- Muscle focus: ${body.muscle_focus && body.muscle_focus.length > 0 ? body.muscle_focus.join(", ") : "auto-select for balanced programming across sessions"}
- Duration per session: ${body.duration_minutes || 60} minutes
- Equipment: ${body.available_equipment || "full gym"}
- Language for all text: ${lang === "es" ? "Spanish" : "English"}

ATHLETE PROFILE:
- Name: ${athleteProfile?.full_name || "Athlete"}
- Objectives: ${athleteProfile?.objectives || "General strength and hypertrophy"}
- Sport: ${athleteProfile?.sport || "Gym / General fitness"}
- Weight: ${athleteProfile?.weight_kg ? `${athleteProfile.weight_kg} kg` : "not provided"}
- Units: ${unitLabel}

TRAINING HISTORY:
- Sessions completed (last 5 weeks): ${completedSessions.length} (${sessionFrequencyPerWeek}/week avg)
- Average RPE: ${avgRpe ? avgRpe.toFixed(1) : "no data"}
- Low energy sessions: ${lowEnergyCount}
- Pain/injury flags: ${painFlags.length > 0 ? painFlags.join(", ") : "none"}
- Progression: ${progressionHints.length > 0 ? progressionHints.join(". ") : "insufficient data"}
Recent feedback: ${recentFeedbackNotes || "None"}

WELLNESS:
${todayWellness ? `Today: score=${todayWellness.overall_score || "N/A"}/5, fatigue=${todayWellness.fatigue_level || "?"}/5, motivation=${todayWellness.motivation || "?"}/5` : "No check-in today"}
14-day avg wellness: ${avgWellnessScore ? avgWellnessScore.toFixed(1) : "no data"}

BLOCK CONTEXT:
${blockContextFull}

EXERCISE LIBRARY (USE ONLY THESE IDs):
${JSON.stringify(exerciseList)}

STRUCTURE — Each workout MUST have exactly 4 sections in this order:
1. "mobility" (2-3 exercises): Dynamic mobility, section_tag="mobility"
2. "warmup" (4 exercises circuit): Core anterior, core lateral, back activation, full-body activator, section_tag="warmup"
3. "main_work" (2-3 exercises): TIER 1+2 compounds (Squat/Hinge/Push/Pull pattern_ability), section_tag="main_work"
4. "secondary_work" (2-3 exercises): Accessory- pattern_ability, section_tag="secondary_work"

PROGRAMMING RULES:
- Balance muscle groups intelligently across the ${sessionsPerWeek} sessions each week
- Apply periodization: increase intensity week over week, deload on final week (if >1 week)
- ${body.session_type === "strength" ? "1-5 reps, RIR 1-2, 3-5 min rest" : body.session_type === "power" ? "1-3 reps explosive, RIR 3, 3-5 min rest" : body.session_type === "endurance" ? "15-20+ reps, RIR 3-4, 60-90s rest" : "6-12 reps, RIR 2-3, 90-120s rest"}
- secondary_value = realistic starting weight in ${unitLabel}
- If pain flags: AVOID those body parts completely

OUTPUT — JSON only, exactly this structure:
{
  "workouts": [
    {
      "name": "Session name",
      "description": "1-2 sentence description",
      "week": 1,
      "day": 1,
      "exercises": [
        {
          "exercise_id": "<exact id from library>",
          "exercise_name": "<exact name>",
          "primary_metric": "reps",
          "secondary_metric": "${unitLabel}",
          "notes": "Coach notes",
          "order_index": 0,
          "section_tag": "mobility",
          "set_lines": [
            {
              "sets": 1,
              "reps": "30s",
              "primary_value": "30s",
              "primary_metric": "time",
              "secondary_value": null,
              "secondary_metric": null,
              "rest_seconds": 0,
              "rir": null,
              "notes": ""
            }
          ]
        }
      ]
    }
  ]
}

Generate ALL ${totalWorkouts} workouts in the "workouts" array (week 1 day 1, week 1 day 2, ..., week ${totalWeeks} day ${sessionsPerWeek}).`;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: modelRequested,
        max_tokens: 16000,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: multiSystemPrompt },
          { role: "user", content: multiUserPrompt },
        ],
      }),
    });

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      if (openaiResponse.status === 401) throw new Error("Invalid OpenAI API key.");
      if (openaiResponse.status === 429) throw new Error("OpenAI rate limit exceeded. Try again in a moment.");
      throw new Error(`OpenAI error: ${openaiResponse.status} - ${errText}`);
    }

    const openaiData = await openaiResponse.json();
    const rawContent = openaiData.choices?.[0]?.message?.content;
    if (!rawContent) throw new Error("Empty response from OpenAI");

    let parsed: any;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      throw new Error("OpenAI returned invalid JSON for multi-session plan");
    }

    const allWorkouts: any[] = (parsed.workouts || []).map((w: any) => ({
      ...w,
      exercises: (w.exercises || []).filter((ex: any) => exerciseIdSet.has(ex.exercise_id)),
    }));

    if (allWorkouts.length === 0) throw new Error("No workouts generated");

    return new Response(
      JSON.stringify({
        success: true,
        mode: "multi",
        workouts: allWorkouts,
        total_weeks: totalWeeks,
        sessions_per_week: sessionsPerWeek,
        total_sessions: allWorkouts.length,
        model_used: modelRequested,
        athlete_readiness_score: todayWellness?.overall_score || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating AI workout:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
