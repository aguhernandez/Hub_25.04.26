/**
 * Load-Velocity Profile engine.
 * All calculations are local — no backend needed.
 *
 * Model: velocity = a * load + b  (simple linear regression)
 * 1RM  = (MVT - b) / a           (solve for load when velocity == MVT)
 */

export interface LVDataPoint {
  loadKg: number;
  meanVelocityMs: number;
  /** optional: which set/session this came from */
  label?: string;
}

export interface LVRegressionResult {
  a: number;           // slope  (m/s per kg)
  b: number;           // intercept (m/s)
  r2: number;          // coefficient of determination
  valid: boolean;      // true when >= MIN_POINTS and r² acceptable
}

export interface LV1RMEstimate {
  estimated1RMkg: number;
  currentPct1RM: number;    // % for the current load/velocity
  mvt: number;              // MVT used
  regression: LVRegressionResult;
}

// Minimum velocity threshold by exercise (m/s)
export const MVT_PRESETS: Record<string, number> = {
  squat:              0.30,
  'back squat':       0.30,
  'front squat':      0.30,
  'bench press':      0.17,
  'bench':            0.17,
  'overhead press':   0.15,
  'ohp':              0.15,
  deadlift:           0.12,
  'hip thrust':       0.25,
  'romanian deadlift':0.14,
  default:            0.20,
};

export const MVT_DEFAULT = 0.20;
export const MIN_POINTS  = 3;
export const MAX_CV      = 0.25; // max coefficient of variation to keep a point (outlier guard)

/** Detect the MVT for an exercise name (case-insensitive partial match). */
export function getMVT(exerciseName: string): number {
  const lower = exerciseName.toLowerCase().trim();
  for (const key of Object.keys(MVT_PRESETS)) {
    if (lower.includes(key)) return MVT_PRESETS[key];
  }
  return MVT_DEFAULT;
}

/** Simple ordinary-least-squares linear regression on (load, velocity) pairs. */
export function linearRegression(points: LVDataPoint[]): LVRegressionResult {
  const n = points.length;
  if (n < 2) return { a: 0, b: 0, r2: 0, valid: false };

  const sumX  = points.reduce((s, p) => s + p.loadKg, 0);
  const sumY  = points.reduce((s, p) => s + p.meanVelocityMs, 0);
  const sumXY = points.reduce((s, p) => s + p.loadKg * p.meanVelocityMs, 0);
  const sumX2 = points.reduce((s, p) => s + p.loadKg * p.loadKg, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { a: 0, b: 0, r2: 0, valid: false };

  const a = (n * sumXY - sumX * sumY) / denom;
  const b = (sumY - a * sumX) / n;

  // R²
  const meanY = sumY / n;
  const ssTot = points.reduce((s, p) => s + Math.pow(p.meanVelocityMs - meanY, 2), 0);
  const ssRes = points.reduce((s, p) => s + Math.pow(p.meanVelocityMs - (a * p.loadKg + b), 2), 0);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { a, b, r2, valid: n >= MIN_POINTS && r2 >= 0.5 };
}

/**
 * Estimate 1RM and %1RM for a given current load.
 * Returns null if regression is not valid or 1RM is nonsensical.
 */
export function estimate1RM(
  points: LVDataPoint[],
  currentLoadKg: number,
  exerciseName: string,
): LV1RMEstimate | null {
  const reg = linearRegression(points);
  if (!reg.valid) return null;
  if (reg.a >= 0) return null; // slope must be negative (higher load → lower velocity)

  const mvt = getMVT(exerciseName);

  // 1RM = (MVT - b) / a
  const est1RM = (mvt - reg.b) / reg.a;
  if (est1RM <= 0 || est1RM > 1000) return null; // sanity guard

  const currentPct = (currentLoadKg / est1RM) * 100;

  return {
    estimated1RMkg: Math.round(est1RM * 10) / 10,
    currentPct1RM: Math.min(Math.round(currentPct * 10) / 10, 120),
    mvt,
    regression: reg,
  };
}

/**
 * Filter outliers from a batch of reps using coefficient of variation.
 * Returns only reps whose velocity is within ±MAX_CV*mean of the group mean.
 */
export function filterOutliers(points: LVDataPoint[]): LVDataPoint[] {
  if (points.length < 3) return points;
  const mean = points.reduce((s, p) => s + p.meanVelocityMs, 0) / points.length;
  const std  = Math.sqrt(points.reduce((s, p) => s + Math.pow(p.meanVelocityMs - mean, 2), 0) / points.length);
  const cv   = mean > 0 ? std / mean : 0;
  if (cv <= MAX_CV) return points;
  // Remove points more than 2σ from mean
  return points.filter((p) => Math.abs(p.meanVelocityMs - mean) <= 2 * std);
}

/**
 * Predict velocity for a given load using regression coefficients.
 */
export function predictVelocity(reg: LVRegressionResult, loadKg: number): number {
  return reg.a * loadKg + reg.b;
}

/**
 * Predict load for a given target velocity.
 */
export function predictLoad(reg: LVRegressionResult, targetVelocityMs: number): number {
  if (reg.a === 0) return 0;
  return (targetVelocityMs - reg.b) / reg.a;
}

/** Color for a given %1RM value */
export function pct1RMColor(pct: number): string {
  if (pct >= 95) return '#ef4444';  // max effort
  if (pct >= 85) return '#f97316';  // heavy
  if (pct >= 75) return '#f59e0b';  // moderate-heavy
  if (pct >= 60) return '#22c55e';  // moderate
  return '#06b6d4';                  // light
}

/** Label for a %1RM range */
export function pct1RMLabel(pct: number, lang: string): string {
  if (pct >= 95) return lang === 'es' ? 'Maximo' : 'Maximal';
  if (pct >= 85) return lang === 'es' ? 'Pesado' : 'Heavy';
  if (pct >= 75) return lang === 'es' ? 'Moderado-pesado' : 'Mod-heavy';
  if (pct >= 60) return lang === 'es' ? 'Moderado' : 'Moderate';
  return lang === 'es' ? 'Ligero' : 'Light';
}
