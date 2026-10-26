import { flightMsToHeightCm, sayersPeakPowerSJ, type AttemptResult, type JumpMarks } from '../jumpCore';

export interface CMJJump {
  jumpNumber: number;
  flightTimeMs: number;
  jumpHeightCm: number;
  estimatedPowerW?: number;
  takeoffFrame?: number;
  landingFrame?: number;
  fps?: number;
  isValid: boolean;
  source?: 'manual' | 'video';
  marks?: Partial<JumpMarks>;
  result?: AttemptResult;
  flags?: string[];
  reasons?: string[];
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
  takeoffMs?: number;
  landingMs?: number;
  effectiveFps?: number;
  skippedFrames?: number;
}

export function calculateJumpHeight(flightTimeMs: number): number {
  return flightMsToHeightCm(flightTimeMs);
}

export function calculateSayersPower(
  jumpHeightCm: number,
  bodyMassKg: number
): number {
  return sayersPeakPowerSJ(jumpHeightCm, bodyMassKg);
}
