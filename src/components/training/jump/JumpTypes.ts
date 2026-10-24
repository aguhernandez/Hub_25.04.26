import type { AttemptResult, JumpMarks, JumpType, JumpContext, RjEvent, RjResult } from '../jumpCore';

export type { JumpType, JumpMarks, JumpContext };
export type JumpSource = 'video' | 'manual';

export interface JumpAttempt {
  index: number;
  marks: JumpMarks;
  result: AttemptResult | null;
  source: JumpSource;
  flags: string[];
  reasons: string[];
}

export interface JumpSession {
  id?: string;
  clientSessionId: string;
  athleteId: string;
  sessionDate: string;
  jumpType: JumpType;
  bodyMassKg: number;
  loadKg?: number | null;
  boxCm?: number | null;
  hpoM?: number | null;
  side?: 'left' | 'right' | null;
  effectiveFps: number;
  source: JumpSource;
  algorithmVersion: string;
  attempts: JumpAttempt[];
  repeated?: RjResult | null;
  saved: boolean;
  notes?: string;
}

export const MAX_ATTEMPTS_PER_SESSION = 30;

export function addAttempt(session: JumpSession, attempt: JumpAttempt): JumpSession {
  if (session.attempts.length >= MAX_ATTEMPTS_PER_SESSION) throw new Error(`máximo de ${MAX_ATTEMPTS_PER_SESSION} intentos por sesión`);
  return { ...session, attempts: [...session.attempts, attempt], saved: false };
}

export function computeJumpAttempt(session: Pick<JumpSession, 'jumpType' | 'bodyMassKg' | 'loadKg' | 'boxCm' | 'hpoM' | 'effectiveFps'>, marks: JumpMarks): AttemptResult {
  const context: JumpContext = { massKg: session.bodyMassKg, loadKg: session.loadKg ?? undefined, boxCm: session.boxCm ?? undefined, hpoM: session.hpoM ?? undefined, fps: session.effectiveFps };
  return requireJumpCore().computeAttempt(session.jumpType, marks, context);
}

function requireJumpCore(): typeof import('../jumpCore') {
  return jumpCore;
}
import * as jumpCore from '../jumpCore';

export function eventsForRepeated(events: RjEvent[]): RjResult { return jumpCore.computeRepeated(events); }
