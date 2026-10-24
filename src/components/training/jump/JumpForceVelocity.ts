import { fitFVProfile, samozinoPoint } from '../jumpCore';

export const JUMP_FV_FEATURE_ENABLED = false;
export function buildJumpForceVelocityProfile(points: Array<{ massKg: number; loadKg?: number; heightM: number; hpoM: number }>) {
  if (!JUMP_FV_FEATURE_ENABLED) return { enabled: false as const, fit: null, warnings: ['Perfil F–v desactivado en v1.'] };
  const result = fitFVProfile(points.map((point) => { const p = samozinoPoint(point); return { forceN: p.forceN, velMs: p.velMs }; }));
  return { enabled: true as const, ...result };
}
