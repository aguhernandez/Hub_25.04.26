/**
 * VBT Auto Load Prescription Engine
 * All calculations are local — no backend required.
 *
 * Flow:
 *  1. User selects training goal → get target velocity zone + %1RM range
 *  2. Initial load = estimated1RM * recommended %1RM (midpoint)
 *  3. After each set: compare actual mean velocity to target zone
 *     → too fast: increase load
 *     → too slow: decrease load
 *     → within zone: maintain
 *  4. During set: check velocity loss against fatigue stop threshold
 *  5. Session-level: compare actual vs expected → adjust global modifier
 */

export type TrainingGoal = 'strength' | 'power' | 'hypertrophy';

export interface GoalProfile {
  goal: TrainingGoal;
  labelEs: string;
  labelEn: string;
  /** Target mean concentric velocity range (m/s) */
  velocityZone: { min: number; max: number };
  /** Recommended %1RM range */
  pct1RMRange: { min: number; max: number };
  /** Velocity loss threshold for stopping the set (%) */
  fatigueCutoffPct: number;
  /** Reps in reserve guideline */
  repRange: { min: number; max: number };
  color: string;
}

export const GOAL_PROFILES: Record<TrainingGoal, GoalProfile> = {
  strength: {
    goal: 'strength',
    labelEs: 'Fuerza',
    labelEn: 'Strength',
    velocityZone: { min: 0.30, max: 0.50 },
    pct1RMRange: { min: 80, max: 90 },
    fatigueCutoffPct: 22,
    repRange: { min: 1, max: 5 },
    color: '#ef4444',
  },
  power: {
    goal: 'power',
    labelEs: 'Potencia',
    labelEn: 'Power',
    velocityZone: { min: 0.50, max: 0.80 },
    pct1RMRange: { min: 40, max: 70 },
    fatigueCutoffPct: 12,
    repRange: { min: 3, max: 6 },
    color: '#f59e0b',
  },
  hypertrophy: {
    goal: 'hypertrophy',
    labelEs: 'Hipertrofia',
    labelEn: 'Hypertrophy',
    velocityZone: { min: 0.40, max: 0.70 },
    pct1RMRange: { min: 60, max: 80 },
    fatigueCutoffPct: 35,
    repRange: { min: 8, max: 15 },
    color: '#22c55e',
  },
};

export type LoadDecision = 'increase' | 'maintain' | 'decrease' | 'stop_set';
export type FatigueStatus = 'fresh' | 'moderate' | 'high' | 'critical';

export interface SetFeedback {
  decision: LoadDecision;
  nextLoadKg: number;
  adjustmentPct: number;     // signed % applied (+2.5, -5, etc.)
  reason: string;
  fatigueStatus: FatigueStatus;
  velocityLossPct: number;
  actualMeanVelocity: number;
  targetZone: { min: number; max: number };
  repsRemainingEstimate: number;
  sessionModifier: number;   // cumulative session-level modifier (0.9–1.1)
}

export interface RepFeedback {
  /** Action to display during live rep */
  action: LoadDecision | 'ok';
  velocityLossPct: number;
  fatigueStatus: FatigueStatus;
  stopSet: boolean;
  message: string;
}

/** Round load to nearest standard plate increment (2.5 kg) */
export function roundToPlate(kg: number, increment = 2.5): number {
  return Math.round(kg / increment) * increment;
}

/** Calculate load adjustment step based on %1RM */
function loadStep(currentLoad: number, estimated1RM: number): number {
  const pct = (currentLoad / estimated1RM) * 100;
  if (pct >= 85) return 2.5;
  if (pct >= 70) return 5;
  return 5;
}

/**
 * Recommend initial load for a goal and estimated 1RM.
 * Uses midpoint of %1RM range, then rounds to plate increment.
 */
export function initialLoad(
  goal: TrainingGoal,
  estimated1RMkg: number,
): number {
  const profile = GOAL_PROFILES[goal];
  const midPct = (profile.pct1RMRange.min + profile.pct1RMRange.max) / 2 / 100;
  return roundToPlate(estimated1RMkg * midPct);
}

/**
 * Classify fatigue status from velocity loss %.
 */
export function fatigueStatus(lossPct: number, goal: TrainingGoal): FatigueStatus {
  const cutoff = GOAL_PROFILES[goal].fatigueCutoffPct;
  if (lossPct >= cutoff) return 'critical';
  if (lossPct >= cutoff * 0.75) return 'high';
  if (lossPct >= cutoff * 0.45) return 'moderate';
  return 'fresh';
}

/**
 * Evaluate set performance and return load prescription for next set.
 *
 * @param actualMeanVelocity  - mean concentric velocity achieved this set (m/s)
 * @param bestVelocityThisSet - highest rep velocity this set
 * @param velocityLossPct     - velocity loss% this set
 * @param currentLoadKg       - load used this set
 * @param estimated1RMkg      - current 1RM estimate
 * @param goal                - training goal
 * @param sessionModifier     - running modifier from session history (start at 1.0)
 */
export function evaluateSet(
  actualMeanVelocity: number,
  bestVelocityThisSet: number,
  velocityLossPct: number,
  currentLoadKg: number,
  estimated1RMkg: number,
  goal: TrainingGoal,
  sessionModifier: number,
): SetFeedback {
  const profile = GOAL_PROFILES[goal];
  const { min: vMin, max: vMax } = profile.velocityZone;
  const step = loadStep(currentLoadKg, estimated1RMkg);
  const fatigue = fatigueStatus(velocityLossPct, goal);

  // ── Expected velocity midpoint
  const expectedV = (vMin + vMax) / 2;
  // Deviation of actual from expected
  const relDev = (actualMeanVelocity - expectedV) / expectedV;

  let decision: LoadDecision;
  let adjustPct = 0;
  let nextLoad = currentLoadKg;
  let reason = '';

  // Stop set takes priority
  if (fatigue === 'critical' || velocityLossPct >= profile.fatigueCutoffPct) {
    decision = 'stop_set';
    nextLoad = currentLoadKg;
    reason = 'velocity_loss_exceeded';
  } else if (actualMeanVelocity < vMin * 0.95) {
    // Too slow → decrease
    decision = 'decrease';
    adjustPct = actualMeanVelocity < vMin * 0.85 ? -5 : -2.5;
    nextLoad = roundToPlate(currentLoadKg + (currentLoadKg * adjustPct) / 100);
    reason = 'velocity_below_zone';
  } else if (actualMeanVelocity > vMax * 1.05) {
    // Too fast → increase
    decision = 'increase';
    adjustPct = relDev > 0.20 ? 5 : 2.5;
    nextLoad = roundToPlate(currentLoadKg + (currentLoadKg * adjustPct) / 100);
    reason = 'velocity_above_zone';
  } else {
    decision = 'maintain';
    adjustPct = 0;
    nextLoad = currentLoadKg;
    reason = 'velocity_in_zone';
  }

  // Apply session modifier (if session modifier < 1 → athlete is underperforming globally)
  nextLoad = roundToPlate(nextLoad * sessionModifier);

  // Clamp to safe range
  nextLoad = Math.max(20, Math.min(nextLoad, estimated1RMkg * 1.05));

  // Estimate reps remaining at next load (based on velocity-load linear relationship)
  // Simple heuristic: more load → fewer reps within zone
  const nextPct = (nextLoad / estimated1RMkg) * 100;
  const repsRemaining = Math.max(
    profile.repRange.min,
    Math.round(profile.repRange.max - ((nextPct - profile.pct1RMRange.min) / (profile.pct1RMRange.max - profile.pct1RMRange.min)) * (profile.repRange.max - profile.repRange.min))
  );

  return {
    decision,
    nextLoadKg: nextLoad,
    adjustmentPct: adjustPct,
    reason,
    fatigueStatus: fatigue,
    velocityLossPct,
    actualMeanVelocity,
    targetZone: profile.velocityZone,
    repsRemainingEstimate: repsRemaining,
    sessionModifier,
  };
}

/**
 * Update the session-level modifier after a set.
 * If athlete is consistently over/under the target zone, adjust globally.
 *
 * @param history  - array of recent set feedback objects
 */
export function updateSessionModifier(
  history: SetFeedback[],
  currentModifier: number,
): number {
  if (history.length < 2) return currentModifier;
  const recent = history.slice(-3);
  const allAbove = recent.every((f) => f.decision === 'increase');
  const allBelow = recent.every((f) => f.decision === 'decrease' || f.decision === 'stop_set');

  if (allAbove) return Math.min(currentModifier + 0.025, 1.10);
  if (allBelow) return Math.max(currentModifier - 0.05, 0.90);
  return currentModifier;
}

/**
 * Per-rep real-time feedback during a live set.
 * Called after each rep is detected.
 */
export function repFeedback(
  reps: Array<{ meanConcentricVelocityMs: number; isValid: boolean }>,
  goal: TrainingGoal,
  lang: string,
): RepFeedback {
  const valid = reps.filter((r) => r.isValid && r.meanConcentricVelocityMs > 0);
  if (valid.length === 0) {
    return { action: 'ok', velocityLossPct: 0, fatigueStatus: 'fresh', stopSet: false, message: '' };
  }

  const best = Math.max(...valid.map((r) => r.meanConcentricVelocityMs));
  const current = valid[valid.length - 1].meanConcentricVelocityMs;
  const lossPct = best > 0 ? ((best - current) / best) * 100 : 0;
  const fatigue = fatigueStatus(lossPct, goal);
  const profile = GOAL_PROFILES[goal];
  const { min: vMin, max: vMax } = profile.velocityZone;
  const stopSet = fatigue === 'critical';

  let action: RepFeedback['action'] = 'ok';
  let message = '';

  if (stopSet) {
    action = 'stop_set';
    message = lang === 'es' ? 'Detener serie — fatiga critica' : 'Stop set — critical fatigue';
  } else if (current > vMax * 1.05) {
    action = 'increase';
    message = lang === 'es' ? 'Velocidad alta — considera subir carga' : 'High velocity — consider increasing load';
  } else if (current < vMin * 0.95) {
    action = 'decrease';
    message = lang === 'es' ? 'Velocidad baja — considera bajar carga' : 'Low velocity — consider reducing load';
  } else {
    action = 'ok';
    message = lang === 'es' ? 'Dentro de zona objetivo' : 'Within target zone';
  }

  return { action, velocityLossPct: lossPct, fatigueStatus: fatigue, stopSet, message };
}

/** Colors for each decision type */
export const DECISION_CONFIG: Record<LoadDecision | 'ok', { color: string; bg: string; labelEs: string; labelEn: string }> = {
  increase: { color: '#22c55e', bg: '#22c55e15', labelEs: 'Aumentar carga', labelEn: 'Increase load' },
  maintain: { color: '#fdda36', bg: '#fdda3615', labelEs: 'Mantener carga', labelEn: 'Maintain load' },
  decrease: { color: '#f59e0b', bg: '#f59e0b15', labelEs: 'Reducir carga', labelEn: 'Reduce load' },
  stop_set: { color: '#ef4444', bg: '#ef444415', labelEs: 'Detener serie', labelEn: 'Stop set' },
  ok:       { color: '#22c55e', bg: '#22c55e15', labelEs: 'OK', labelEn: 'OK' },
};

export const FATIGUE_CONFIG: Record<FatigueStatus, { color: string; labelEs: string; labelEn: string }> = {
  fresh:    { color: '#22c55e', labelEs: 'Fresco', labelEn: 'Fresh' },
  moderate: { color: '#facc15', labelEs: 'Moderada', labelEn: 'Moderate' },
  high:     { color: '#f97316', labelEs: 'Alta', labelEn: 'High' },
  critical: { color: '#ef4444', labelEs: 'Critica', labelEn: 'Critical' },
};
