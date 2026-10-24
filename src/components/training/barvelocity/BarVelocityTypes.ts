export interface VelocitySample {
  timeMs: number;
  velocityMs: number;
  positionPx: number;
}

export type BarSource = 'manual' | 'video';

export interface BarRep {
  source: BarSource;
  repNumber: number;
  meanConcentricVelocityMs: number;
  peakVelocityMs: number | null;
  meanEccentricVelocityMs: number | null;
  concentricDurationMs: number | null;
  eccentricDurationMs: number | null;
  displacementMm: number | null;
  estimatedPowerW?: number | null;
  velocitySamples: VelocitySample[] | null;
  timestampsMs: number[] | null;
  isValid: boolean;
}

export interface BarSession {
  source: BarSource;
  clientSessionId: string;
  id?: string;
  sessionDate: string;
  exerciseName: string;
  loadKg?: number;
  reps: BarRep[];
  peakVelocityMs?: number;
  meanConcentricVelocityMs?: number;
  velocityLossPct?: number;
  estimatedPowerW?: number | null;
  fps?: number;
  notes?: string;
}

export interface CalibrationData {
  barTopY: number;
  barBottomY: number;
  barDiameterPx: number;
  pixelsPerMm: number;
  centerX?: number;
  centerY?: number;
  radiusPx?: number;
  processingWidth?: number;
  processingHeight?: number;
}

export type TrackerPhase =
  | 'idle'
  | 'calibration'
  | 'ready'
  | 'recording'
  | 'analyzing'
  | 'results';

export interface BarDetectionResult {
  detected: boolean;
  centerY: number;
  confidence: number;
}

export function calcMeanVelocity(samples: VelocitySample[]): number {
  if (samples.length === 0) return 0;
  return samples.reduce((s, v) => s + Math.abs(v.velocityMs), 0) / samples.length;
}

export function calcPeakVelocity(samples: VelocitySample[]): number {
  if (samples.length === 0) return 0;
  return Math.max(...samples.map((s) => Math.abs(s.velocityMs)));
}

export function calcEstimatedPower(meanVelocityMs: number, loadKg: number): number {
  const force = loadKg * 9.81;
  return force * meanVelocityMs;
}

export const VBT_ZONES = [
  { labelEs: 'Fuerza maxima', labelEn: 'Max strength', min: 0, max: 0.35, color: '#ef4444' },
  { labelEs: 'Fuerza-velocidad', labelEn: 'Strength-speed', min: 0.35, max: 0.6, color: '#f97316' },
  { labelEs: 'Potencia optima', labelEn: 'Optimal power', min: 0.6, max: 1.0, color: '#eab308' },
  { labelEs: 'Velocidad-fuerza', labelEn: 'Speed-strength', min: 1.0, max: 1.3, color: '#22c55e' },
  { labelEs: 'Velocidad maxima', labelEn: 'Max speed', min: 1.3, max: 3.0, color: '#06b6d4' },
];

export function getVBTZone(velocity: number) {
  return VBT_ZONES.find((z) => velocity >= z.min && velocity < z.max) ?? null;
}

export const DISC_DIAMETER_MM = 450;
