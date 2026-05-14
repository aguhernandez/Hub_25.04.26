/**
 * Fuel schedule builder for live race execution.
 *
 * Takes a race_plan row (from the race_plans table) and produces a flat array
 * of timed alerts the LiveRacePage ticks through during the race.
 */

export interface FuelAlert {
  /** Minutes from race start when this alert fires */
  time_min: number;
  /** Short label shown on screen, e.g. "Gel #2 · 25 g carbs" */
  label: string;
  /** Calories in this intake */
  calories: number;
  /** Carbohydrates in grams */
  carbs_g: number;
  /** Fluid in millilitres */
  fluid_ml: number;
  /** Sodium in milligrams */
  sodium_mg: number;
  /** Caffeine in milligrams */
  caffeine_mg: number;
  /** Free-text note from the planner */
  notes?: string;
  /** Whether this alert has been acknowledged by the athlete */
  acknowledged: boolean;
}

export interface RacePlan {
  id: string;
  athlete_id: string;
  race_name: string;
  sport: string;
  distance_km: number | null;
  expected_duration_min: number | null;
  target_pace_min_km: number | null;
  temperature_c: number | null;
  carbs_g_per_hour: number | null;
  fluid_l_per_hour: number | null;
  sodium_mg_per_hour: number | null;
  caffeine_total_mg: number | null;
  caffeine_pre_dose_mg: number | null;
  caffeine_pre_dose_min_before: number | null;
  caffeine_mid_race_doses: number | null;
  total_carbs_g: number | null;
  total_fluid_l: number | null;
  total_sodium_mg: number | null;
  segments: Segment[] | null;
  planner_source: string | null;
  scheduled_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface Segment {
  /** Segment name, e.g. "Swim", "T1", "Bike", "T2", "Run" */
  name: string;
  /** Duration of this segment in minutes */
  duration_min: number;
  /** Override carbs g/h for this segment */
  carbs_g_per_hour?: number;
  /** Override fluid l/h for this segment */
  fluid_l_per_hour?: number;
  /** Override sodium mg/h for this segment */
  sodium_mg_per_hour?: number;
  notes?: string;
}

/** Minutes between automatic fuel reminders when no segments are defined */
const DEFAULT_INTERVAL_MIN = 20;

/**
 * Build a sorted, de-duplicated array of FuelAlert from a RacePlan.
 *
 * Strategy:
 * 1. If segments exist, generate one alert per segment boundary + midpoints.
 * 2. Otherwise, distribute alerts every DEFAULT_INTERVAL_MIN throughout race.
 * 3. Caffeine pre-dose alert fires at (caffeine_pre_dose_min_before) min before start (negative time — shown as "pre-race").
 * 4. Mid-race caffeine doses distributed evenly across race duration.
 */
export function buildFuelSchedule(plan: RacePlan): FuelAlert[] {
  const totalMin = plan.expected_duration_min ?? 60;
  const carbsPerHour = plan.carbs_g_per_hour ?? 60;
  const fluidLPerHour = plan.fluid_l_per_hour ?? 0.5;
  const sodiumMgPerHour = plan.sodium_mg_per_hour ?? 500;
  const alerts: FuelAlert[] = [];

  // ── Pre-race caffeine ──────────────────────────────────────────────────────
  if ((plan.caffeine_pre_dose_mg ?? 0) > 0 && (plan.caffeine_pre_dose_min_before ?? 0) > 0) {
    alerts.push({
      time_min: -(plan.caffeine_pre_dose_min_before!),
      label: `Cafeína pre-carrera · ${plan.caffeine_pre_dose_mg} mg`,
      calories: 0,
      carbs_g: 0,
      fluid_ml: 150,
      sodium_mg: 0,
      caffeine_mg: plan.caffeine_pre_dose_mg!,
      notes: 'Tomar antes de la salida',
      acknowledged: false,
    });
  }

  // ── Segment-based schedule ─────────────────────────────────────────────────
  if (plan.segments && plan.segments.length > 0) {
    let cursor = 0;
    for (const seg of plan.segments) {
      const segCarbs = (seg.carbs_g_per_hour ?? carbsPerHour) * (seg.duration_min / 60);
      const segFluid = (seg.fluid_l_per_hour ?? fluidLPerHour) * (seg.duration_min / 60);
      const segSodium = (seg.sodium_mg_per_hour ?? sodiumMgPerHour) * (seg.duration_min / 60);
      const intervalMin = Math.max(15, seg.duration_min / 2);
      let t = cursor + intervalMin;
      while (t < cursor + seg.duration_min) {
        const fraction = intervalMin / seg.duration_min;
        alerts.push({
          time_min: Math.round(t),
          label: `${seg.name} · ${Math.round(segCarbs * fraction)} g carbs`,
          calories: Math.round(segCarbs * fraction * 4),
          carbs_g: Math.round(segCarbs * fraction),
          fluid_ml: Math.round(segFluid * fraction * 1000),
          sodium_mg: Math.round(segSodium * fraction),
          caffeine_mg: 0,
          notes: seg.notes,
          acknowledged: false,
        });
        t += intervalMin;
      }
      cursor += seg.duration_min;
    }
  } else {
    // ── Even distribution ──────────────────────────────────────────────────
    const intervalMin = DEFAULT_INTERVAL_MIN;
    const carbsPerInterval = carbsPerHour * (intervalMin / 60);
    const fluidMlPerInterval = fluidLPerHour * (intervalMin / 60) * 1000;
    const sodiumMgPerInterval = sodiumMgPerHour * (intervalMin / 60);

    for (let t = intervalMin; t <= totalMin; t += intervalMin) {
      alerts.push({
        time_min: Math.round(t),
        label: `Combustible · ${Math.round(carbsPerInterval)} g carbs`,
        calories: Math.round(carbsPerInterval * 4),
        carbs_g: Math.round(carbsPerInterval),
        fluid_ml: Math.round(fluidMlPerInterval),
        sodium_mg: Math.round(sodiumMgPerInterval),
        caffeine_mg: 0,
        acknowledged: false,
      });
    }
  }

  // ── Mid-race caffeine doses ────────────────────────────────────────────────
  const midDoses = plan.caffeine_mid_race_doses ?? 0;
  const totalCaffeine = plan.caffeine_total_mg ?? 0;
  const preDose = plan.caffeine_pre_dose_mg ?? 0;
  const midCaffeine = totalCaffeine - preDose;

  if (midDoses > 0 && midCaffeine > 0) {
    const doseStep = totalMin / (midDoses + 1);
    const perDose = Math.round(midCaffeine / midDoses);
    for (let i = 1; i <= midDoses; i++) {
      const t = Math.round(doseStep * i);
      // Merge into nearest existing alert if within 5 min
      const nearest = alerts.find(a => Math.abs(a.time_min - t) <= 5 && a.time_min > 0);
      if (nearest) {
        nearest.caffeine_mg += perDose;
        nearest.label += ` + ${perDose} mg cafeína`;
      } else {
        alerts.push({
          time_min: t,
          label: `Cafeína · ${perDose} mg`,
          calories: 0,
          carbs_g: 0,
          fluid_ml: 150,
          sodium_mg: 0,
          caffeine_mg: perDose,
          acknowledged: false,
        });
      }
    }
  }

  // Sort by time, pre-race alerts first
  return alerts.sort((a, b) => a.time_min - b.time_min);
}

/** Format elapsed seconds as mm:ss or h:mm:ss */
export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Returns the next unacknowledged alert that should fire now */
export function getActiveAlert(
  alerts: FuelAlert[],
  elapsedMin: number,
): FuelAlert | null {
  return alerts.find(a => !a.acknowledged && a.time_min > 0 && elapsedMin >= a.time_min) ?? null;
}
