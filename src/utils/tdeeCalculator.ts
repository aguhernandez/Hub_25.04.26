import { supabase } from '../lib/supabase';
import type { BiologicalPassport } from '../types/biologicalPassport.types';

export interface TDEEDayResult {
  date: string;
  bmr: number;
  neatBase: number;
  eat: number;
  tdee: number;
  tdeeLow: number;
  tdeeHigh: number;
  sessions: SessionKcal[];
}

export interface SessionKcal {
  name: string;
  source: 'endurance' | 'gym';
  kcal: number;
  durationMinutes: number;
  zoneBreakdown?: { zone: number; hours: number; kcal: number }[];
}

export interface TDEEWeeklySummary {
  avgTDEE: number;
  avgTDEELow: number;
  avgTDEEHigh: number;
  totalEAT: number;
  restDays: number;
  trainingDays: number;
  daily: TDEEDayResult[];
}

interface TDEEConfig {
  met5zones: Record<string, number>;
  met7zones: Record<string, number>;
  neatFactor: number;
  metEnduranceDefault: number;
  metGymDefault: number;
}

const DEFAULT_CONFIG: TDEEConfig = {
  met5zones: { Z1: 4, Z2: 6, Z3: 8, Z4: 10, Z5: 12 },
  met7zones: { Z1: 4, Z2: 5, Z3: 6, Z4: 7.5, Z5: 9, Z6: 10.5, Z7: 12 },
  neatFactor: 1.25,
  metEnduranceDefault: 7,
  metGymDefault: 5,
};

let cachedConfig: TDEEConfig | null = null;

async function loadConfig(): Promise<TDEEConfig> {
  if (cachedConfig) return cachedConfig;
  try {
    const { data, error } = await supabase
      .from('tdee_config')
      .select('config_key, config_value');
    if (error || !data) {
      cachedConfig = DEFAULT_CONFIG;
      return cachedConfig;
    }
    const cfg = { ...DEFAULT_CONFIG };
    for (const row of data) {
      const val = row.config_value;
      switch (row.config_key) {
        case 'met_5zones':
          cfg.met5zones = typeof val === 'object' && val !== null ? val as Record<string, number> : cfg.met5zones;
          break;
        case 'met_7zones':
          cfg.met7zones = typeof val === 'object' && val !== null ? val as Record<string, number> : cfg.met7zones;
          break;
        case 'neat_factor':
          cfg.neatFactor = typeof val === 'number' ? val : Number(val) || cfg.neatFactor;
          break;
        case 'met_endurance_default':
          cfg.metEnduranceDefault = typeof val === 'number' ? val : Number(val) || cfg.metEnduranceDefault;
          break;
        case 'met_gym_default':
          cfg.metGymDefault = typeof val === 'number' ? val : Number(val) || cfg.metGymDefault;
          break;
      }
    }
    cachedConfig = cfg;
    return cfg;
  } catch {
    cachedConfig = DEFAULT_CONFIG;
    return cachedConfig;
  }
}

export function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const dob = new Date(dateOfBirth);
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: 'male' | 'female',
  ffmKg?: number | null
): number {
  if (ffmKg != null && ffmKg > 0) {
    return 500 + 22 * ffmKg;
  }
  if (sex === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

interface EnduranceStep {
  step_type?: string;
  duration_type?: string;
  duration_value?: number;
  target_zone?: number;
  zone_system?: number;
}

interface EnduranceWorkout {
  id: string;
  name: string;
  sport: string;
  scheduled_date: string;
  estimated_duration_minutes: number;
  steps: EnduranceStep[];
  status: string;
}

interface GymWorkout {
  id: string;
  scheduled_date: string;
  duration_minutes: number;
  workout_id: string;
  source?: string;
  external_title?: string;
  raw_description?: string;
}

function getMETForZone(zone: number, zoneSystem: number, cfg: TDEEConfig): number | null {
  const table = zoneSystem === 7 ? cfg.met7zones : cfg.met5zones;
  const key = `Z${zone}`;
  return table[key] ?? null;
}

function calculateEnduranceSessionKcal(
  workout: EnduranceWorkout,
  weightKg: number,
  cfg: TDEEConfig,
  defaultZoneSystem: number
): SessionKcal {
  const zoneBreakdown: { zone: number; hours: number; kcal: number }[] = [];
  let totalKcal = 0;
  let hasZones = false;

  for (const step of workout.steps || []) {
    if (step.duration_type !== 'time' || !step.duration_value) continue;
    const hours = step.duration_value / 3600;
    if (hours <= 0) continue;

    const zone = step.target_zone;
    const zoneSystem = step.zone_system ?? defaultZoneSystem;

    if (zone != null && zone >= 1) {
      const met = getMETForZone(zone, zoneSystem, cfg);
      if (met != null) {
        const kcal = hours * met * weightKg;
        totalKcal += kcal;
        hasZones = true;
        const existing = zoneBreakdown.find(zb => zb.zone === zone);
        if (existing) {
          existing.hours += hours;
          existing.kcal += kcal;
        } else {
          zoneBreakdown.push({ zone, hours, kcal });
        }
      }
    }
  }

  if (!hasZones) {
    const hours = (workout.estimated_duration_minutes || 0) / 60;
    totalKcal = hours * cfg.metEnduranceDefault * weightKg;
  }

  return {
    name: workout.name,
    source: 'endurance',
    kcal: Math.round(totalKcal),
    durationMinutes: workout.estimated_duration_minutes || 0,
    zoneBreakdown: hasZones ? zoneBreakdown : undefined,
  };
}

function calculateGymSessionKcal(workout: GymWorkout, weightKg: number, cfg: TDEEConfig): SessionKcal {
  const hours = (workout.duration_minutes || 0) / 60;
  const kcal = hours * cfg.metGymDefault * weightKg;
  const name = workout.external_title || workout.raw_description || 'Gym Session';
  return {
    name,
    source: 'gym',
    kcal: Math.round(kcal),
    durationMinutes: workout.duration_minutes || 0,
  };
}

export async function calculateTDEEForDateRange(
  athleteId: string,
  passport: BiologicalPassport | null,
  profile: { date_of_birth?: string | null; gender?: string | null } | null,
  startDate: string,
  endDate: string
): Promise<TDEEWeeklySummary | null> {
  if (!passport || !passport.weight_kg || !passport.height_cm) return null;

  const cfg = await loadConfig();
  const age = profile?.date_of_birth ? calculateAge(profile.date_of_birth) : 0;
  if (age <= 0) return null;

  const sex = (profile?.gender === 'male' || profile?.gender === 'female')
    ? profile.gender
    : 'male';

  const bmr = calculateBMR(
    passport.weight_kg,
    passport.height_cm,
    age,
    sex,
    passport.lean_mass_kg
  );

  const neatBase = bmr * cfg.neatFactor;
  const defaultZoneSystem = passport.training_zones?.default_display === '7' ? 7 : 5;

  // Fetch endurance workouts for date range
  const { data: enduranceWorkouts, error: enduranceErr } = await supabase
    .from('external_endurance_workouts')
    .select('id, name, sport, scheduled_date, estimated_duration_minutes, steps, status')
    .eq('athlete_id', athleteId)
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)
    .order('scheduled_date', { ascending: true });

  if (enduranceErr) console.error('TDEE: endurance query error', enduranceErr);

  // Fetch gym workouts for date range
  const { data: gymWorkouts, error: gymErr } = await supabase
    .from('athlete_workouts')
    .select('id, scheduled_date, duration_minutes, workout_id, source, external_title, raw_description')
    .eq('athlete_id', athleteId)
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)
    .order('scheduled_date', { ascending: true });

  if (gymErr) console.error('TDEE: gym query error', gymErr);

  // Build per-day map
  const dayMap = new Map<string, SessionKcal[]>();

  for (const ew of (enduranceWorkouts || []) as EnduranceWorkout[]) {
    if (ew.status === 'skipped') continue;
    const kcal = calculateEnduranceSessionKcal(ew, passport.weight_kg, cfg, defaultZoneSystem);
    const day = ew.scheduled_date;
    if (!dayMap.has(day)) dayMap.set(day, []);
    dayMap.get(day)!.push(kcal);
  }

  // Need to join with workouts table for duration_minutes
  const gymWorkoutIds = (gymWorkouts || []).map((g: GymWorkout) => g.workout_id).filter(Boolean);
  let workoutDurationMap = new Map<string, number>();
  if (gymWorkoutIds.length > 0) {
    const { data: workoutsData } = await supabase
      .from('workouts')
      .select('id, duration_minutes')
      .in('id', gymWorkoutIds);
    for (const w of (workoutsData || [])) {
      workoutDurationMap.set(w.id, w.duration_minutes || 0);
    }
  }

  for (const gw of (gymWorkouts || []) as GymWorkout[]) {
    const duration = workoutDurationMap.get(gw.workout_id) ?? gw.duration_minutes ?? 0;
    const enrichedGw = { ...gw, duration_minutes: duration };
    const kcal = calculateGymSessionKcal(enrichedGw, passport.weight_kg, cfg);
    const day = gw.scheduled_date;
    if (!dayMap.has(day)) dayMap.set(day, []);
    dayMap.get(day)!.push(kcal);
  }

  // Generate daily results for the date range
  const daily: TDEEDayResult[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  let totalEAT = 0;
  let restDays = 0;
  let trainingDays = 0;

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const sessions = dayMap.get(dateStr) || [];
    const eat = sessions.reduce((sum, s) => sum + s.kcal, 0);
    const tdee = neatBase + eat;

    daily.push({
      date: dateStr,
      bmr: Math.round(bmr),
      neatBase: Math.round(neatBase),
      eat: Math.round(eat),
      tdee: Math.round(tdee),
      tdeeLow: Math.round(tdee * 0.92),
      tdeeHigh: Math.round(tdee * 1.08),
      sessions,
    });

    totalEAT += eat;
    if (sessions.length > 0) trainingDays++;
    else restDays++;
  }

  const avgTDEE = daily.reduce((sum, d) => sum + d.tdee, 0) / daily.length;
  const avgTDEELow = daily.reduce((sum, d) => sum + d.tdeeLow, 0) / daily.length;
  const avgTDEEHigh = daily.reduce((sum, d) => sum + d.tdeeHigh, 0) / daily.length;

  return {
    avgTDEE: Math.round(avgTDEE),
    avgTDEELow: Math.round(avgTDEELow),
    avgTDEEHigh: Math.round(avgTDEEHigh),
    totalEAT: Math.round(totalEAT),
    restDays,
    trainingDays,
    daily,
  };
}

export function getWeekDateRange(referenceDate?: Date): { start: string; end: string } {
  const ref = referenceDate || new Date();
  const day = ref.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(ref);
  monday.setDate(ref.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  };
}
