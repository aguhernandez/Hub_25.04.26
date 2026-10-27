import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GenerateRequest {
  athlete_id?: string;
  atp_id?: string;
  start_date?: string;
  muscle_focus?: string[];
  session_type?: string;
  available_equipment?: string;
  duration_minutes?: number;
  block_weeks?: number;
  sessions_per_week?: number;
  language?: "es" | "en";
  model?: string;
}

interface SessionBlueprint {
  session_goal: string;
  phase: string;
  week: number | null;
  allowed_patterns: string[];
  main_exercise_slots: number;
  accessory_slots: number;
  mobility_slots: number;
  warmup_slots: number;
  target_sets: number;
  intensity_range: string;
  forbidden_body_parts: string[];
  competition_in_days: number | null;
  max_exercises: number;
  duration_minutes: number;
}

interface SessionSlotPlan {
  mobility: any[];
  warmup: any[];
  main: {
    bilateral_lower: any[];
    unilateral_lower: any[];
    power: any[];
    upper_push: any[];
  };
  secondary: {
    complementary: any[];
    athletic: any[];
  };
}

interface MonthlySplitDay {
  day: number;
  lower: string;
  upper: string;
}

function buildMonthlySplitPlan(sessionsPerWeek: number): MonthlySplitDay[] {
  const plan: MonthlySplitDay[] = [
    { day: 1, lower: "bilateral squat + unilateral single-leg RDL", upper: "bilateral push + unilateral accessory" },
    { day: 2, lower: "bilateral deadlift + unilateral single-leg squat", upper: "bilateral pull + unilateral accessory" },
    { day: 3, lower: "bilateral hip thrust + unilateral knee flexion", upper: "bilateral pull priority + unilateral push accessory" },
    { day: 4, lower: "bilateral hip flexion + unilateral knee flexion", upper: "bilateral push or pull + opposite unilateral accessory" },
  ];
  return plan.slice(0, Math.max(1, Math.min(4, sessionsPerWeek)));
}

function buildSessionSlotPlan(exerciseList: any, readiness: number): SessionSlotPlan {
  const first = (items: any[], predicate?: (item: any) => boolean, count = 3) =>
    items.filter(predicate || (() => true)).slice(0, count);
  const name = (item: any) => `${item?.name || ""} ${item?.pa || ""}`.toLowerCase();
  const core = first(exerciseList.core, undefined, 3);
  const activators = first(exerciseList.compounds, (e: any) => /swing|jump|plyo|snatch|burpee|crawl|throw/.test(name(e)), 1);
  const mobility = first(exerciseList.mobility, undefined, 3);
  const bilateral = first(exerciseList.compounds, (e: any) => /squat-double|hinge-double|bilateral|double leg/.test(name(e)), 3);
  const unilateral = first(exerciseList.compounds, (e: any) => /single leg|single-leg|unilateral/.test(name(e)), 3);
  const power = first(exerciseList.compounds, (e: any) => /plyo|jump|power|explosive/.test(name(e)), 3);
  const upperPush = first(exerciseList.compounds, (e: any) => /^push| push|bench|press/.test(name(e)), 3);
  const complementary = first(exerciseList.accessories, undefined, 3);
  const athletic = first(exerciseList.accessories, (e: any) => /throw|medicine|med ball|ball|power/.test(name(e)), 3);
  return {
    mobility,
    warmup: [...core, ...activators].slice(0, 4),
    main: { bilateral_lower: bilateral, unilateral_lower: unilateral, power: readiness > 0 && readiness < 3 ? [] : power, upper_push: upperPush },
    secondary: { complementary, athletic: athletic.length ? athletic : complementary.slice(0, 1) },
  };
}

function buildSessionBlueprint(body: GenerateRequest, atpData: any, wellness: any, painFlags: string[]): SessionBlueprint {
  const week = atpData?.current_week || null;
  const weekly = week ? atpData?.weekly_loads?.find((row: any) => row.week_number === week) : null;
  const macro = week ? atpData?.macrocycles?.find((row: any) => week >= row.start_week && week <= row.end_week) : null;
  const readiness = Number(wellness?.overall_score || 0);
  const competition = atpData?.events?.find((event: any) => event.event_type === "competition" && event.event_date);
  const referenceDate = body.start_date ? Date.parse(`${body.start_date}T00:00:00Z`) : Date.now();
  const competitionInDays = competition ? Math.round((Date.parse(`${competition.event_date}T00:00:00Z`) - referenceDate) / 86400000) : null;
  const phase = macro?.phase_type || "general_prep";
  const intensityRange = readiness > 0 && readiness < 3 ? "RPE 6-7, reduce volume 20%" : phase === "competition" || (competitionInDays !== null && competitionInDays <= 14) ? "RPE 6-8, maintain intensity and reduce fatigue" : body.session_type === "strength" ? "RPE 7-9" : body.session_type === "power" ? "RPE 6-8, explosive" : "RPE 7-8";
  const forbidden = painFlags.map(flag => flag.split(":")[1]?.replace(/pain/i, "").trim()).filter(Boolean);
  // The coach's standard session is 70-80 minutes. Keep the exercise order and
  // slots deterministic; the model only fills the prescriptions for those slots.
  const targetSets = Math.max(12, Math.min(20, Number(weekly?.num_sessions || 0) > 0 ? Math.round(Number(weekly?.estimated_load || 0) > 0 ? 16 : 14) : 14));
  return {
    session_goal: body.session_type || "hypertrophy",
    phase,
    week,
    allowed_patterns: ["Squat", "Hinge", "Push", "Pull", "Accessory"],
    main_exercise_slots: 2,
    accessory_slots: 2,
    mobility_slots: 2,
    warmup_slots: 4,
    target_sets: readiness > 0 && readiness < 3 ? Math.round(targetSets * 0.8) : targetSets,
    intensity_range: intensityRange,
    forbidden_body_parts: forbidden,
    competition_in_days: competitionInDays,
    max_exercises: 13,
    duration_minutes: Math.max(70, Math.min(80, Number(body.duration_minutes) || 75)),
  };
}

function validateWorkout(workout: any, exerciseIds: Set<string>, exerciseById: Map<string, any>, blueprint: SessionBlueprint, slotPlan?: SessionSlotPlan, monthlySplitPlan?: MonthlySplitDay[]): string[] {
  const errors: string[] = [];
  if (!workout || typeof workout.name !== "string" || !Array.isArray(workout.exercises)) return ["Workout must contain name and exercises"];
  if (workout.exercises.length > blueprint.max_exercises) errors.push(`Too many exercises: ${workout.exercises.length}`);
  const sections = workout.exercises.map((exercise: any) => exercise.section_tag);
  for (const required of ["mobility", "warmup", "main_work", "secondary_work"]) {
    if (!sections.includes(required)) errors.push(`Missing section: ${required}`);
  }
  const ids = new Set<string>();
  let totalSets = 0;
  let lastSectionIndex = -1;
  const sectionOrder = ["mobility", "warmup", "main_work", "secondary_work"];
  for (const exercise of workout.exercises) {
    if (!exerciseIds.has(exercise.exercise_id)) errors.push(`Unknown exercise: ${exercise.exercise_id}`);
    if (ids.has(exercise.exercise_id)) errors.push(`Duplicate exercise: ${exercise.exercise_id}`);
    ids.add(exercise.exercise_id);
    const libraryExercise = exerciseById.get(exercise.exercise_id);
    const sectionIndex = sectionOrder.indexOf(exercise.section_tag);
    if (sectionIndex < lastSectionIndex) errors.push(`Sections are out of order near ${exercise.exercise_name || exercise.exercise_id}`);
    if (sectionIndex >= 0) lastSectionIndex = sectionIndex;
    const pattern = String(libraryExercise?.pattern_ability || "");
    if (exercise.section_tag === "secondary_work" && !pattern.startsWith("Accessory")) errors.push(`Secondary exercise is not an accessory: ${exercise.exercise_name || exercise.exercise_id}`);
    if (exercise.section_tag === "main_work" && pattern.startsWith("Accessory")) errors.push(`Main exercise is an accessory: ${exercise.exercise_name || exercise.exercise_id}`);
    if (exercise.section_tag === "mobility" && ![libraryExercise?.type, libraryExercise?.movement, libraryExercise?.category].some((value: any) => String(value || "").toLowerCase().includes("mobility"))) errors.push(`Mobility section contains non-mobility exercise: ${exercise.exercise_name || exercise.exercise_id}`);
    if (!Array.isArray(exercise.set_lines) || exercise.set_lines.length === 0) errors.push(`Missing set lines: ${exercise.exercise_name || exercise.exercise_id}`);
    for (const line of exercise.set_lines || []) {
      totalSets += Number(line.sets) || 0;
      if (!Number.isFinite(Number(line.sets)) || Number(line.sets) < 1) errors.push(`Invalid sets: ${exercise.exercise_name || exercise.exercise_id}`);
      if (!line.primary_value && !line.reps) errors.push(`Missing prescription: ${exercise.exercise_name || exercise.exercise_id}`);
    }
  }
  const mainCount = sections.filter((section: string) => section === "main_work").length;
  const accessoryCount = sections.filter((section: string) => section === "secondary_work").length;
  const mobilityCount = sections.filter((section: string) => section === "mobility").length;
  const warmupCount = sections.filter((section: string) => section === "warmup").length;
  if (mobilityCount < 2 || mobilityCount > 3) errors.push(`Mobility must contain 2-3 exercises, got ${mobilityCount}`);
  if (warmupCount !== 4) errors.push(`Warm-up must contain exactly 4 exercises, got ${warmupCount}`);
  if (mainCount !== 4) errors.push(`Main work must contain exactly 4 exercises, got ${mainCount}`);
  if (accessoryCount !== 2) errors.push(`Secondary work must contain exactly 2 exercises, got ${accessoryCount}`);
  if (slotPlan) {
    const selectedIds = new Set(workout.exercises.map((exercise: any) => exercise.exercise_id));
    const hasCandidate = (candidates: any[]) => candidates.length === 0 || candidates.some((candidate: any) => selectedIds.has(candidate.id));
    if (!hasCandidate(slotPlan.main.bilateral_lower)) errors.push("Main work is missing the bilateral lower-body slot");
    if (!hasCandidate(slotPlan.main.unilateral_lower)) errors.push("Main work is missing the unilateral lower-body slot");
    if (!hasCandidate(slotPlan.main.upper_push)) errors.push("Main work is missing the upper-body push slot");
    if (!hasCandidate(slotPlan.secondary.complementary)) errors.push("Secondary work is missing the complementary slot");
  }
  if (monthlySplitPlan) {
    const template = monthlySplitPlan.find((day) => day.day === Number(workout.day));
    const mainNames = workout.exercises
      .filter((exercise: any) => exercise.section_tag === "main_work")
      .map((exercise: any) => `${exercise.exercise_name || ""} ${exerciseById.get(exercise.exercise_id)?.pattern_ability || ""}`.toLowerCase())
      .join(" | ");
    const day = Number(workout.day);
    if (template && day === 1 && (!/squat/.test(mainNames) || !/single.?leg.*(rdl|hinge)|rdl.*single.?leg/.test(mainNames))) errors.push("Day 1 must keep bilateral squat + unilateral single-leg RDL");
    if (template && day === 2 && (!/(deadlift|hinge-double)/.test(mainNames) || !/single.?leg.*squat|squat.*single.?leg/.test(mainNames))) errors.push("Day 2 must keep bilateral deadlift + unilateral single-leg squat");
    if (template && day === 3 && (!/hip thrust/.test(mainNames) || !/(knee flexion|leg curl|hamstring curl)/.test(mainNames))) errors.push("Day 3 must keep bilateral hip thrust + unilateral knee flexion");
    if (template && day === 4 && (!/(hinge-double|deadlift|squat)/.test(mainNames) || !/(knee flexion|leg curl|hamstring curl)/.test(mainNames))) errors.push("Day 4 must keep bilateral hip flexion + unilateral knee flexion");
  }
  if (totalSets < Math.max(6, Math.round(blueprint.target_sets * 0.5)) || totalSets > Math.round(blueprint.target_sets * 1.8) + 8) errors.push(`Total sets ${totalSets} are outside the blueprint target of ${blueprint.target_sets}`);
  return errors;
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
  atpContext: string,
  sessionBlueprint: SessionBlueprint,
  slotPlan: SessionSlotPlan,
  monthlySplitPlan: MonthlySplitDay[],
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

ANNUAL TRAINING PLAN (ATP):
${atpContext || "No ATP selected. Do not invent ATP phases, loads, or events."}

SESSION BLUEPRINT (MUST BE FOLLOWED):
${JSON.stringify(sessionBlueprint)}

DETERMINISTIC SLOT PLAN (choose only from these candidates; do not invent exercise IDs):
${JSON.stringify(slotPlan)}

MONTHLY SPLIT (MUST REMAIN IDENTICAL FOR EVERY WEEK OF THIS BLOCK):
${JSON.stringify(monthlySplitPlan)}

Only progress the existing sessions across the month. Change sets, repetitions, goal,
rest, and intensity by week; do not replace the day templates with a different routine.

EXERCISE LIBRARY (USE ONLY THESE IDs):
${JSON.stringify(exerciseList)}

STRUCTURE — The workout MUST have exactly 4 sections in this order and 12-13 exercises (70-80 minutes):

SECTION 1: "Mobility & Stretching" (exactly 2-3 exercises, different body regions)
- Dynamic mobility and activation stretches relevant to today's muscle focus
- Use exercises from the library with type = "Mobility" or movement = "Mobility"
- If no mobility exercises exist in library for the focus, use general hip flexor, thoracic, or shoulder mobility
- Duration ~5-7 minutes total
- No sets/reps format: use time (e.g. "30" seconds per side)
- section_tag: "mobility"

SECTION 2: "Warm-Up Circuit" (exactly 4 exercises, circuit format)
- Exercise 1: ANTERIOR CORE — plank variation, dead bug, hollow hold, ab wheel, etc.
- Exercise 2: LATERAL CORE — side plank, Pallof press, lateral band walk, etc.
- Exercise 3: SPINAL/BACK ACTIVATION — bird dog, superman, back extension, face pull, YTW, etc.
- Exercise 4: FULL-BODY ACTIVATOR — dynamic but controlled: kettlebell swing, low-impact jump, bear crawl, etc.
- 1 round of the circuit, moderate intensity, ~10 minutes total
- section_tag: "warmup"

SECTION 3: "Main Work" (exactly 4 exercises, in this order)
- Exercise 1: bilateral lower-body pattern (for example squat, hinge, or split stance only if no bilateral option)
- Exercise 2: unilateral antagonist lower-body pattern (for example single-leg RDL or single-leg squat)
- Exercise 3: 1-2 low-volume plyometric or power exercises (only 1 exercise when readiness is low)
- Exercise 4: general upper-body push (bench press or equivalent)
- Main work must contain the first two lower-body exercises, one plyometric/power exercise, and one upper-body push.
- Include warm-up sets + working sets with proper set_lines
- section_tag: "main_work"

SECTION 4: "Secondary Work" (exactly 2 exercises)
- Exercise 1: one accessory/complementary movement for the session's weakest pattern
- Exercise 2: medicine-ball throw or a similarly athletic accessory when available
- Use patternAbility starts with "Accessory-" and keep these movements simple and time-efficient
- section_tag: "secondary_work"

PROGRAMMING RULES:
- NEVER put Accessory- exercises before compounds
- Adjust intensity based on wellness score (≥4: full, 3-4: moderate, <3: -15-20% volume)
- ${body.session_type === "strength" ? "1-5 reps, RIR 1-2, 3-5 min rest" : body.session_type === "power" ? "1-3 reps explosive, RIR 3, 3-5 min rest" : body.session_type === "endurance" ? "15-20+ reps, RIR 3-4, 60-90s rest" : "6-12 reps, RIR 2-3, 90-120s rest"}
- secondary_value = realistic starting weight in ${unitLabel}
- Pain rules are explicit: severity 8-10 or a strong pain flag means avoid the affected body part and movement completely. Severity 5-7 means do not load that body part in the main work; use a pain-free activation with 20-30 controlled repetitions only if it does not increase pain. Never invent a diagnosis.
- Keep the complete session within 70-80 minutes including mobility, warm-up, rest, and transitions.
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
    const requestedAthleteId = body.athlete_id || user.id;
    const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
      .from("profiles")
      .select("id, role, assigned_trainer_id, timezone")
      .eq("id", requestedAthleteId)
      .maybeSingle();
    if (targetProfileError || !targetProfile || targetProfile.role !== "athlete") throw new Error("Plan with AI is only available for athletes");
    const isSelf = requestedAthleteId === user.id;
    const { data: requesterProfile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const isProfessional = ["trainer", "admin", "head_coach", "nutritionist"].includes(requesterProfile?.role || "");
    if (!isSelf && (!isProfessional || (requesterProfile?.role === "trainer" && targetProfile.assigned_trainer_id !== user.id))) {
      throw new Error("Not authorized for this athlete");
    }
    // Athletes can try the feature on Free (1/month) or use it on Pro (5/month).
    // Trainers and head coaches are intentionally left open for coaching work.
    let monthlyLimit: number | null = null;
    if (isSelf && requesterProfile?.role === "athlete") {
      const { data: proAccess } = await supabaseAdmin
        .from("membership_access")
        .select("status, end_date, membership:memberships(name, slug)")
        .eq("user_id", requestedAthleteId)
        .eq("status", "active");
      const hasPro = (proAccess || []).some((row: any) => {
        const membership = Array.isArray(row.membership) ? row.membership[0] : row.membership;
        const name = `${membership?.name || ""} ${membership?.slug || ""}`.toLowerCase();
        return name.includes("pro") && (!row.end_date || new Date(row.end_date).getTime() > Date.now());
      });
      monthlyLimit = hasPro ? 5 : 1;
    } else if (!["trainer", "head_coach", "admin"].includes(requesterProfile?.role || "")) {
      monthlyLimit = 1;
    }
    const lang = body.language || "es";
    // Luna keeps generation affordable while the deterministic blueprint carries
    // the coaching structure and prevents the model from inventing a session.
    const modelRequested = requesterProfile?.role === "admin" && body.model ? body.model : "gpt-5.6-luna";
    const sessionsPerWeek = Math.min(Math.max(body.sessions_per_week || 3, 1), 7);
    const totalWeeks = Math.min(Math.max(body.block_weeks || 1, 1), 4);

    let atpContext = "";
    let atpData: any = null;
    if (body.atp_id) {
      const { data: atp } = await supabaseAdmin.from("annual_training_plans").select("id, title, year, start_date, end_date, notes").eq("id", body.atp_id).eq("athlete_id", requestedAthleteId).maybeSingle();
      if (!atp) throw new Error("Selected ATP does not belong to this athlete");
      const [macro, weekly, events] = await Promise.all([
        supabaseAdmin.from("atp_macrocycles").select("phase_type, start_week, end_week, title, description").eq("atp_id", atp.id).order("start_week"),
        supabaseAdmin.from("atp_weekly_loads").select("week_number, start_date, end_date, focus, estimated_load, relative_load_percent, num_sessions, key_exercises, notes").eq("atp_id", atp.id).order("week_number"),
        supabaseAdmin.from("atp_events").select("week_number, event_date, event_type, title, description, priority").eq("atp_id", atp.id).order("week_number")
      ]);
      const currentWeek = body.start_date
        ? Math.max(1, Math.min(52, Math.floor((Date.parse(`${body.start_date}T00:00:00Z`) - Date.parse(`${atp.start_date}T00:00:00Z`)) / (7 * 24 * 60 * 60 * 1000)) + 1))
        : null;
      atpData = { atp, current_week: currentWeek, macrocycles: macro.data || [], weekly_loads: weekly.data || [], events: events.data || [] };
      atpContext = JSON.stringify(atpData);
    }

    // Cost guard is server-side so it cannot be bypassed by editing the browser
    // request. A multi-session block still counts as one click.
    let monthlyGenerations = 0;
    if (monthlyLimit !== null) {
      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);
      let countQuery = supabaseAdmin
        .from("ai_training_plans")
        .select("id", { count: "exact", head: true })
        .gte("generated_at", monthStart.toISOString());
      countQuery = isSelf
        ? countQuery.eq("athlete_id", requestedAthleteId)
        : countQuery.eq("context_data->>requester_id", user.id);
      const { count, error: monthlyCountError } = await countQuery;
      monthlyGenerations = count || 0;
      if (monthlyCountError) console.warn("Could not read monthly AI generation count", monthlyCountError.message);
      if (monthlyGenerations >= monthlyLimit) {
        throw new Error(`Monthly AI workout modification limit reached (${monthlyLimit} per month). Try again next month.`);
      }
    }

    const openaiKey = await getOpenAIKey(supabaseAdmin);

    const fiveWeeksAgo = new Date();
    fiveWeeksAgo.setDate(fiveWeeksAgo.getDate() - 35);
    const athleteTimezone = targetProfile.timezone || "UTC";
    const dateInAthleteTimezone = (value: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: athleteTimezone }).format(value);
    const fiveWeeksAgoStr = dateInAthleteTimezone(fiveWeeksAgo);

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const twoWeeksAgoStr = dateInAthleteTimezone(twoWeeksAgo);

    const today = dateInAthleteTimezone(new Date());

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
        .eq("athlete_id", requestedAthleteId)
        .gte("scheduled_date", fiveWeeksAgoStr)
        .order("scheduled_date", { ascending: false })
        .limit(50),

      supabase
        .from("training_logs")
        .select("set_number, reps_completed, weight_used, rir, logged_at, workout_exercise_id")
        .eq("athlete_id", requestedAthleteId)
        .gte("logged_at", fiveWeeksAgo.toISOString())
        .order("logged_at", { ascending: false })
        .limit(400),

      supabase
        .from("profiles")
        .select("objectives, sport, unit_preference, full_name, weight_kg, height_cm, birth_date, gender")
        .eq("id", requestedAthleteId)
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
        .eq("athlete_id", requestedAthleteId)
        .gte("checkin_date", twoWeeksAgoStr)
        .order("checkin_date", { ascending: false })
        .limit(14),

      supabase
        .from("strength_estimates")
        .select("exercise_id, exercise_name, estimated_1rm, unit, recorded_at")
        .eq("athlete_id", requestedAthleteId)
        .order("recorded_at", { ascending: false })
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

    wellnessCheckins.forEach((checkin: any) => {
      const soreness = Number(checkin.muscle_soreness || 0);
      if (checkin.injury_notes) painFlags.push(`${checkin.checkin_date}: ${checkin.injury_notes}`);
      if (soreness >= 8) painFlags.push(`${checkin.checkin_date}: severe soreness ${soreness}/10`);
      else if (soreness >= 5) painFlags.push(`${checkin.checkin_date}: moderate soreness ${soreness}/10`);
    });

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

    const sessionBlueprint = buildSessionBlueprint(body, atpData, todayWellness, painFlags);

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
    const slotPlan = buildSessionSlotPlan(exerciseList, Number(todayWellness?.overall_score || 0));
    const monthlySplitPlan = buildMonthlySplitPlan(sessionsPerWeek);

    const systemPrompt = `You are an elite strength and conditioning coach. Generate complete gym workout sessions with MOBILITY, WARM-UP, MAIN WORK, and SECONDARY WORK sections. Respond ONLY with valid JSON — no markdown, no code blocks, no explanation.`;

    const totalWorkoutsToGenerate = totalWeeks * sessionsPerWeek;

    if (totalWorkoutsToGenerate === 1) {
      const userPrompt = buildWorkoutPrompt(
        1, 1, totalWeeks, sessionsPerWeek,
        body, athleteProfile, completedSessions, trainingLogs, wellnessCheckins,
        strengthEstimates, exerciseList, avgRpe, lowEnergyCount, painFlags,
        progressionHints, recentFeedbackNotes, todayWellness, avgWellnessScore,
        wellnessTrend, lastWeekSessions, sessionFrequencyPerWeek, unitLabel, atpContext, sessionBlueprint, slotPlan, monthlySplitPlan, lang
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
      const exerciseById = new Map(exerciseLibrary.map((e: any) => [e.id, e]));
      generatedWorkout.exercises = (generatedWorkout.exercises || []).filter((ex: any) => {
        if (!exerciseIdSet.has(ex.exercise_id)) {
          console.warn(`Exercise ID ${ex.exercise_id} not in library, skipping`);
          return false;
        }
        return true;
      });

      if (generatedWorkout.exercises.length === 0) throw new Error("No valid exercises in generated workout");
      let validationErrors = validateWorkout(generatedWorkout, exerciseIdSet, exerciseById, sessionBlueprint, slotPlan, monthlySplitPlan);
      // Spend a second call only when the first answer is structurally invalid.
      // This is cheaper than relaxing the rules and storing a bad session.
      if (validationErrors.length > 0) {
        const repairResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: modelRequested,
            max_tokens: 5000,
            temperature: 0.2,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `${userPrompt}\n\nREPAIR THIS OUTPUT. It failed validation with: ${validationErrors.join("; ")}. Return the complete corrected JSON workout, preserving the required slot plan and exercise IDs. Previous output:\n${JSON.stringify(generatedWorkout)}` },
            ],
          }),
        });
        if (repairResponse.ok) {
          const repairData = await repairResponse.json();
          const repairedContent = repairData.choices?.[0]?.message?.content;
          if (repairedContent) {
            try {
              const repairedWorkout = JSON.parse(repairedContent);
              repairedWorkout.exercises = (repairedWorkout.exercises || []).filter((ex: any) => exerciseIdSet.has(ex.exercise_id));
              const repairedErrors = validateWorkout(repairedWorkout, exerciseIdSet, exerciseById, sessionBlueprint, slotPlan, monthlySplitPlan);
              if (repairedErrors.length === 0) {
                generatedWorkout = repairedWorkout;
                validationErrors = [];
              } else validationErrors = repairedErrors;
            } catch { /* keep the original validation errors */ }
          }
        }
      }
      if (validationErrors.length > 0) throw new Error(`Generated workout failed validation: ${validationErrors.join("; ")}`);

      const { error: auditError } = await supabaseAdmin.from("ai_training_plans").insert({
        athlete_id: requestedAthleteId,
        model_used: modelRequested,
        session_type: body.session_type || "hypertrophy",
        target_date: body.start_date || null,
        context_data: { request: body, requester_id: user.id, atp: atpData, blueprint: sessionBlueprint, monthly_generation_number: (monthlyGenerations || 0) + 1 },
        plan_data: generatedWorkout,
        athlete_readiness_score: todayWellness?.overall_score || null,
          athlete_readiness_notes: todayWellness?.general_notes || null,
      });
      if (auditError) console.warn("Could not audit AI training plan", auditError.message);

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
    const exerciseById = new Map(exerciseLibrary.map((e: any) => [e.id, e]));
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

ANNUAL TRAINING PLAN (ATP):
${atpContext || "No ATP selected. Do not invent ATP phases, loads, or events."}

SESSION BLUEPRINT (MUST BE FOLLOWED FOR EVERY SESSION):
${JSON.stringify(sessionBlueprint)}

DETERMINISTIC SLOT PLAN (choose only from these candidates; do not invent exercise IDs):
${JSON.stringify(slotPlan)}

MONTHLY SPLIT (MUST REMAIN IDENTICAL FOR EVERY WEEK OF THIS BLOCK):
${JSON.stringify(monthlySplitPlan)}

Keep the same lower-body and upper-body templates on each day throughout the month.
Progress only sets, repetitions, goal, rest, and intensity from week to week.

EXERCISE LIBRARY (USE ONLY THESE IDs):
${JSON.stringify(exerciseList)}

STRUCTURE — Each workout MUST have exactly 4 sections in this order and 12-13 exercises:
1. "mobility" (2-3 exercises): different body regions, section_tag="mobility"
2. "warmup" (exactly 4 exercises): anterior core, lateral core, back activation, full-body activator, section_tag="warmup"
3. "main_work" (exactly 4 exercises): bilateral lower body, unilateral antagonist lower body, one plyometric/power movement, and one upper-body push, section_tag="main_work"
4. "secondary_work" (exactly 2 exercises): complementary accessory and medicine-ball/athletic accessory, section_tag="secondary_work"

PROGRAMMING RULES:
- Balance muscle groups intelligently across the ${sessionsPerWeek} sessions each week
- Apply periodization: increase intensity week over week, deload on final week (if >1 week)
- ${body.session_type === "strength" ? "1-5 reps, RIR 1-2, 3-5 min rest" : body.session_type === "power" ? "1-3 reps explosive, RIR 3, 3-5 min rest" : body.session_type === "endurance" ? "15-20+ reps, RIR 3-4, 60-90s rest" : "6-12 reps, RIR 2-3, 90-120s rest"}
- secondary_value = realistic starting weight in ${unitLabel}
- Pain rules: severity 8-10 or strong pain means avoid the affected body part/movement completely; severity 5-7 means no loaded main work for that body part and only pain-free activation at 20-30 controlled repetitions.
- Keep every session within 70-80 minutes including rest and transitions.

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

    if (allWorkouts.length !== totalWorkouts) throw new Error(`Expected ${totalWorkouts} workouts, received ${allWorkouts.length}`);
    const sessionKeys = new Set<string>();
    for (const workout of allWorkouts) {
      const key = `${workout.week || ""}-${workout.day || ""}`;
      if (sessionKeys.has(key)) throw new Error(`Duplicate block session position: ${key}`);
      sessionKeys.add(key);
    }
    const validationErrors = allWorkouts.flatMap((workout: any) => validateWorkout(workout, exerciseIdSet, exerciseById, sessionBlueprint, slotPlan, monthlySplitPlan));
    if (validationErrors.length > 0) throw new Error(`Generated block failed validation: ${validationErrors.slice(0, 8).join("; ")}`);

    const { error: auditError } = await supabaseAdmin.from("ai_training_plans").insert({
      athlete_id: requestedAthleteId,
      model_used: modelRequested,
      session_type: body.session_type || "hypertrophy",
      target_date: body.start_date || null,
      context_data: { request: body, requester_id: user.id, atp: atpData, blueprint: sessionBlueprint, monthly_generation_number: (monthlyGenerations || 0) + 1 },
      plan_data: { workouts: allWorkouts },
      athlete_readiness_score: todayWellness?.overall_score || null,
      athlete_readiness_notes: todayWellness?.general_notes || null,
    });
    if (auditError) console.warn("Could not audit AI training block", auditError.message);

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
