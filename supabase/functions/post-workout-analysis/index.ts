import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface WorkoutPayload {
  activityId?: string | null;
  plannedWorkoutId?: string | null;
  sportType: string;
  durationSeconds: number;
  distanceKm: number;
  elevationGainM: number;
  gpsPoints?: Array<{ latitude: number; longitude: number; altitude: number | null; timestamp: string }>;
  feedback?: {
    rpe?: number;
    energy_level?: string;
    pain_level?: string;
    mood?: string;
    feedback_notes?: string;
  };
  plannedWorkout?: {
    id?: string;
    title?: string;
    duration_min?: number;
    distance_km?: number;
    steps?: Array<{
      duration_type?: string;
      duration_value?: number;
      intensity?: string;
      pace_zone?: string;
    }>;
  } | null;
  athleteId?: string;
  localDate?: string;
}

interface AnalysisResult {
  final_score: number;
  classification: "green" | "yellow" | "red";
  insights: string[];
  quick_feedback: string;
  duration_pct: number;
  intensity_deviation: "on_target" | "slightly_above" | "slightly_below" | "above" | "below";
  source: "satellite" | "local_fallback";
  updated_fitness?: number;
  updated_fatigue?: number;
}

function classifyScore(score: number): "green" | "yellow" | "red" {
  if (score >= 75) return "green";
  if (score >= 45) return "yellow";
  return "red";
}

function computeIntensityDeviation(rpe: number | undefined): "on_target" | "slightly_above" | "slightly_below" | "above" | "below" {
  if (!rpe) return "on_target";
  if (rpe >= 9) return "above";
  if (rpe >= 7) return "slightly_above";
  if (rpe <= 3) return "below";
  if (rpe <= 4) return "slightly_below";
  return "on_target";
}

function analyzeWorkout(payload: WorkoutPayload, athleteId: string): AnalysisResult {
  const { durationSeconds, distanceKm, feedback, plannedWorkout } = payload;
  const rpe = feedback?.rpe ?? 5;
  const energyLevel = feedback?.energy_level ?? "normal";
  const painLevel = feedback?.pain_level ?? "none";

  const plannedDurationSec = plannedWorkout?.duration_min ? plannedWorkout.duration_min * 60 : null;
  const plannedDistanceKm = plannedWorkout?.distance_km ?? null;

  const durationPct = plannedDurationSec
    ? Math.round((durationSeconds / plannedDurationSec) * 100)
    : 100;

  const distancePct = plannedDistanceKm && distanceKm
    ? Math.round((distanceKm / plannedDistanceKm) * 100)
    : 100;

  const intensityDeviation = computeIntensityDeviation(rpe);

  const insights: string[] = [];
  let score = 70;

  if (plannedDurationSec) {
    if (durationPct >= 90 && durationPct <= 115) {
      score += 10;
      insights.push("Duration well within planned range — session executed as designed.");
    } else if (durationPct < 70) {
      score -= 20;
      insights.push(`Session was ${100 - durationPct}% shorter than planned — consider the cause (fatigue, schedule, or injury).`);
    } else if (durationPct > 130) {
      score -= 10;
      insights.push(`Session ran ${durationPct - 100}% longer than planned — monitor cumulative training load.`);
    }
  }

  if (plannedDistanceKm && distanceKm) {
    if (distancePct >= 88 && distancePct <= 112) {
      score += 5;
      insights.push("Distance matched the plan closely.");
    } else if (distancePct < 75) {
      score -= 15;
      insights.push(`Distance was ${100 - distancePct}% below plan — check pacing strategy or terrain conditions.`);
    }
  }

  if (rpe >= 9) {
    score -= 15;
    insights.push(`Very high RPE (${rpe}/10) — ensure adequate recovery before next hard session.`);
  } else if (rpe >= 7) {
    score -= 5;
    insights.push(`RPE ${rpe}/10 indicates high effort — this is expected for threshold or race-pace work.`);
  } else if (rpe <= 3) {
    score += 5;
    insights.push(`Low RPE (${rpe}/10) — could be a recovery or base aerobic session well executed.`);
  } else {
    insights.push(`RPE ${rpe}/10 — moderate effort, consistent with aerobic development.`);
  }

  if (painLevel === "strong" || painLevel === "moderate") {
    score -= 20;
    insights.push("Pain was reported during this session. Review with your coach or physio before your next training block.");
  }

  if (energyLevel === "high") {
    score += 5;
    insights.push("High energy level reported — good sign for training readiness and recovery status.");
  } else if (energyLevel === "low") {
    score -= 10;
    insights.push("Low energy level reported — consider sleep quality, nutrition timing, and accumulated fatigue.");
  }

  score = Math.max(0, Math.min(100, score));

  const classification = classifyScore(score);
  const quickFeedback = classification === "green"
    ? "Solid session — execution matched intent."
    : classification === "yellow"
    ? "Decent effort — a few things to monitor."
    : "Session needs attention — review with your coach.";

  return {
    final_score: score,
    classification,
    insights,
    quick_feedback: quickFeedback,
    duration_pct: durationPct,
    intensity_deviation: intensityDeviation,
    source: "satellite",
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: WorkoutPayload = await req.json();
    const athleteId = user.id;

    const result = analyzeWorkout(payload, athleteId);

    const dbRecord = {
      athlete_id: athleteId,
      activity_id: payload.activityId ?? null,
      planned_workout_id: payload.plannedWorkoutId ?? payload.plannedWorkout?.id ?? null,
      final_score: result.final_score,
      classification: result.classification,
      insights: result.insights,
      quick_feedback: result.quick_feedback,
      duration_pct: result.duration_pct,
      intensity_deviation: result.intensity_deviation,
      satellite_response_raw: result,
      source: "satellite",
    };

    const { error: insertError } = await supabase
      .from("workout_analysis_results")
      .upsert(dbRecord, { onConflict: "athlete_id,activity_id" });

    if (insertError) {
      console.error("Failed to save analysis result:", insertError);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("post-workout-analysis error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
