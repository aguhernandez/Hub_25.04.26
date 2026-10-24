import type { JumpAttempt, JumpSession } from './JumpTypes';

export interface JumpSessionPayload {
  client_session_id: string; athlete_id: string; session_date: string; jump_type: string; body_mass_kg: number;
  load_kg: number | null; box_cm: number | null; hpo_m: number | null; side: string | null;
  effective_fps: number; source: string; algorithm_version: string; notes: string | null;
  attempts: Array<Record<string, unknown>>;
}

export function buildJumpSessionPayload(session: JumpSession): JumpSessionPayload {
  const attempts = session.attempts.map((attempt: JumpAttempt) => {
    const values: Record<string, unknown> = {
      index: attempt.index, marks: attempt.marks, source: attempt.source,
      flags: attempt.result?.flags ?? attempt.flags, reasons: attempt.result?.reasons ?? attempt.reasons,
      flight_ms: attempt.result?.flightMs ?? null, height_cm: attempt.result?.heightCm ?? null,
      takeoff_vel_ms: attempt.result?.takeoffVelMs ?? null, contact_ms: attempt.result?.contactMs ?? null,
      rsi: attempt.result?.rsi ?? null, rsi_mod: attempt.result?.rsiMod ?? null, samozino: attempt.result?.samozino ?? null,
    };
    return values;
  });
  return {
    client_session_id: session.clientSessionId, athlete_id: session.athleteId, session_date: session.sessionDate,
    jump_type: session.jumpType, body_mass_kg: session.bodyMassKg, load_kg: session.loadKg ?? null,
    box_cm: session.boxCm ?? null, hpo_m: session.hpoM ?? null, side: session.side ?? null,
    effective_fps: session.effectiveFps, source: session.source, algorithm_version: session.algorithmVersion,
    notes: session.notes ?? null, attempts,
  };
}
