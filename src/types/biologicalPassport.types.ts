export type PassportStatus = 'active' | 'archived';
export type PassportSource = 'lab' | 'manual' | 'imported';
export type AthleteLevel = 'beginner' | 'intermediate' | 'advanced' | 'elite';
export type SportContext = 'cycling' | 'running' | 'triathlon' | 'strength' | 'swimming' | 'other';
export type HeatAdaptationClassification = 'Insufficient Data' | 'Minimal' | 'Moderate' | 'Good' | 'Excellent';
export type FVImbalanceDirection = 'force_deficit' | 'velocity_deficit' | 'balanced';

export interface HydrationProfile {
  evaluation_date: string;
  sweat_rate_l_h: number;
  percent_dehydration: number;
  average_sweat_rate_l_h: number;
  temperature_c: number;
  humidity_percent: number;
}

export interface HeatAdaptationProfile {
  evaluation_date: string;
  heat_adaptation_score: number;
  adaptation_classification: HeatAdaptationClassification;
  total_sessions: number;
}

export interface ForceVelocityProfile {
  evaluation_date: string;
  exercise: string;
  f0_n: number;
  f0_relative_bw: number;
  pmax_w: number;
  pmax_w_kg: number;
  optimal_velocity_ms: number;
  fv_imbalance_percent: number;
  fv_imbalance_direction: FVImbalanceDirection;
}

export interface PowerZone {
  zone: number;
  name: string;
  min_watts: number;
  max_watts: number;
}

export interface HRZone {
  zone: number;
  name: string;
  min_bpm: number;
  max_bpm: number;
}

export interface RPEZone {
  zone: number;
  name: string;
  description: string;
  rpe_min: number;
  rpe_max: number;
}

export interface ZoneSet {
  hr?: HRZone[];
  power?: PowerZone[];
  rpe?: RPEZone[];
}

export interface TrainingZones {
  base_method?: string;
  zones5?: ZoneSet;
  zones7?: ZoneSet;
  default_display?: '5' | '7';
}

export interface BiologicalPassport {
  id: string;
  athlete_id: string;
  version_number: number;
  status: PassportStatus;
  source: PassportSource;
  source_satellite?: string;
  source_test_type?: string;
  measurement_date: string;
  lab_record_id?: string;
  anthropometry_record_id?: string;

  // Physiological
  vo2max?: number;
  lt1_power?: number;
  lt2_power?: number;
  lt1_hr?: number;
  lt2_hr?: number;
  ftp_watts?: number;
  critical_power?: number;
  anaerobic_capacity_kj?: number;
  running_threshold_pace?: string;
  vam?: number;
  pam?: number;
  sport_context: SportContext;
  power_zones_json?: PowerZone[];
  hr_zones_json?: HRZone[];
  rpe_zones_json?: RPEZone[];
  training_zones?: TrainingZones | null;

  // Anthropometry
  height_cm?: number;
  weight_kg?: number;
  body_fat_percent?: number;
  muscle_mass_kg?: number;
  lean_mass_kg?: number;
  bone_mass_kg?: number;
  skinfold_sum_6?: number;
  muscle_bone_index?: number;
  z_adipose?: number;
  z_muscle?: number;
  z_bone?: number;

  // Athletic profile
  training_age_years?: number;
  athlete_level?: AthleteLevel;

  // Lab modules
  hydration?: HydrationProfile | null;
  heat_adaptation?: HeatAdaptationProfile | null;
  force_velocity?: ForceVelocityProfile | null;

  // Visibility
  public_visible: boolean;
  share_vo2: boolean;
  share_zones: boolean;
  share_body_comp: boolean;

  test_protocol?: string;
  lab_athlete_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CreatePassportPayload {
  athlete_id: string;
  source: PassportSource;
  source_satellite?: string;
  source_test_type?: string;
  measurement_date: string;
  sport_context: SportContext;

  vo2max?: number;
  lt1_power?: number;
  lt2_power?: number;
  lt1_hr?: number;
  lt2_hr?: number;
  ftp_watts?: number;
  critical_power?: number;
  anaerobic_capacity_kj?: number;
  running_threshold_pace?: string;
  vam?: number;
  pam?: number;
  power_zones_json?: PowerZone[];
  hr_zones_json?: HRZone[];
  rpe_zones_json?: RPEZone[];
  training_zones?: TrainingZones | null;

  height_cm?: number;
  weight_kg?: number;
  body_fat_percent?: number;
  muscle_mass_kg?: number;
  lean_mass_kg?: number;
  bone_mass_kg?: number;
  skinfold_sum_6?: number;
  muscle_bone_index?: number;
  z_adipose?: number;
  z_muscle?: number;
  z_bone?: number;

  training_age_years?: number;
  athlete_level?: AthleteLevel;

  hydration?: HydrationProfile | null;
  heat_adaptation?: HeatAdaptationProfile | null;
  force_velocity?: ForceVelocityProfile | null;

  test_protocol?: string;
  lab_athlete_id?: string;
  notes?: string;
}
