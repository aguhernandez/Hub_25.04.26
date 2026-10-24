import type { Json } from '../../../lib/database.types';
import type { BarRep, BarSource } from './BarVelocityTypes';
import { velocityLossPct } from './vbtCore';

export function createManualRep(repNumber: number, velocity: number): BarRep {
  return { repNumber, source: 'manual', meanConcentricVelocityMs: velocity,
    peakVelocityMs: null, meanEccentricVelocityMs: null,
    concentricDurationMs: null, eccentricDurationMs: null, displacementMm: null,
    estimatedPowerW: null, velocitySamples: null, timestampsMs: null, isValid: true };
}

interface SessionInput {
  clientSessionId: string; sessionDate: string; exerciseName: string;
  loadKg: number | null; notes: string; fps: number; source: BarSource; reps: BarRep[];
}
export function buildBarSessionPayload(input: SessionInput) {
  const valid = input.reps.filter(r => r.isValid && Number.isFinite(r.meanConcentricVelocityMs) && r.meanConcentricVelocityMs > 0);
  const nullable = (v: number | null | undefined) => v != null && Number.isFinite(v) ? v : null;
  const integerMs = (v: number | null) => v != null && Number.isFinite(v) ? Math.round(v) : null;
  const peaks = valid.flatMap(r => r.source === 'video' && r.peakVelocityMs != null ? [r.peakVelocityMs] : []);
  const powers = valid.flatMap(r => r.source === 'video' && r.estimatedPowerW != null ? [r.estimatedPowerW] : []);
  return {
    p_session: {
      client_session_id: input.clientSessionId, source: input.source,
      session_date: input.sessionDate, exercise_name: input.exerciseName.trim(),
      load_kg: input.loadKg != null && input.loadKg > 0 ? nullable(input.loadKg) : null,
      notes: input.notes.trim() || null, fps: input.source === 'video' ? Math.round(input.fps) : null,
      total_reps: valid.length, peak_velocity_ms: peaks.length ? Math.max(...peaks) : null,
      mean_concentric_velocity_ms: valid.length ? valid.reduce((s,r)=>s+r.meanConcentricVelocityMs,0)/valid.length : null,
      velocity_loss_pct: velocityLossPct(valid.map((rep) => rep.meanConcentricVelocityMs), 'best'),
      estimated_power_w: powers.length ? powers.reduce((a,b)=>a+b,0)/powers.length : null,
    },
    p_reps: valid.map(r => {
      const video = r.source === 'video';
      return { rep_number: r.repNumber, source: r.source,
        mean_concentric_velocity_ms: r.meanConcentricVelocityMs,
        peak_velocity_ms: video ? nullable(r.peakVelocityMs) : null,
        mean_eccentric_velocity_ms: video ? nullable(r.meanEccentricVelocityMs) : null,
        concentric_duration_ms: video ? integerMs(r.concentricDurationMs) : null,
        eccentric_duration_ms: video ? integerMs(r.eccentricDurationMs) : null,
        displacement_mm: video ? nullable(r.displacementMm) : null,
        estimated_power_w: video ? nullable(r.estimatedPowerW) : null,
        velocity_samples: video && r.velocitySamples ? r.velocitySamples.map(s => ({...s})) : null,
        timestamps_ms: video ? r.timestampsMs : null, is_valid: true };
    }),
  };
}

// Database types in this repo predate VBT. Keep the new RPC boundary typed locally
// until the generated schema is refreshed after the migration is deployed.
interface VBTClient {
  rpc(name: 'save_bar_velocity_session', args: {p_session: Json; p_reps: Json}): PromiseLike<{data: unknown; error: unknown}>;
}
export async function persistBarSession(client: unknown, payload: ReturnType<typeof buildBarSessionPayload>) {
  if (!payload.p_reps.length) throw new Error('No valid repetitions');
  const {data, error} = await (client as VBTClient).rpc('save_bar_velocity_session', payload);
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('Invalid saved session id');
  return data;
}
