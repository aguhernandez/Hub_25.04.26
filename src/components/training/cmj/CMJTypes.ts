export interface CMJJump {
  jumpNumber: number;
  flightTimeMs: number;
  jumpHeightCm: number;
  estimatedPowerW?: number;
  takeoffFrame?: number;
  landingFrame?: number;
  fps?: number;
  isValid: boolean;
}

export interface CMJSession {
  id?: string;
  sessionDate: string;
  protocol: 'standard' | 'fatigue' | 'reactive';
  bodyMassKg?: number;
  jumps: CMJJump[];
  bestHeightCm?: number;
  avgHeightCm?: number;
  fatigueIndexPct?: number;
  notes?: string;
}

export type CMJPhase =
  | 'idle'
  | 'calibration'
  | 'ready'
  | 'recording'
  | 'analyzing'
  | 'results';

export interface VideoFrameAnalysis {
  takeoffFrameIndex: number;
  landingFrameIndex: number;
  fps: number;
  totalFrames: number;
  flightTimeMs: number;
}

export function calculateJumpHeight(flightTimeMs: number): number {
  const t = flightTimeMs / 1000;
  return ((9.81 * t * t) / 8) * 100;
}

export function calculateSayersPower(
  jumpHeightCm: number,
  bodyMassKg: number
): number {
  return 60.7 * jumpHeightCm + 45.3 * bodyMassKg - 2055;
}

export function calculateFatigueIndex(jumps: CMJJump[]): number {
  const validJumps = jumps.filter((j) => j.isValid);
  if (validJumps.length < 2) return 0;
  const best = Math.max(...validJumps.map((j) => j.jumpHeightCm));
  const last = validJumps[validJumps.length - 1].jumpHeightCm;
  return ((best - last) / best) * 100;
}
