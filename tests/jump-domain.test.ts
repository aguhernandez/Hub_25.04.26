import { describe, expect, it } from 'vitest';
import { computeAttempt } from '../src/components/training/jumpCore';
import { addAttempt, MAX_ATTEMPTS_PER_SESSION } from '../src/components/training/jump/JumpTypes';

describe('jump domain validation', () => {
  it('rejects non-finite marks and invalid mass', () => {
    const result = computeAttempt('cmj', { takeoffMs: Number.NaN, landingMs: 500 }, { massKg: 0, fps: 30 });
    expect(result.ok).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/no finitas|inválida/);
  });
  it('limits attempts for every source and marks changes unsaved', () => {
    const session = { clientSessionId: 'x', athleteId: 'a', sessionDate: '2026-01-01', jumpType: 'cmj' as const, bodyMassKg: 75, effectiveFps: 120, source: 'manual' as const, algorithmVersion: 'jump-core-1', attempts: Array.from({ length: MAX_ATTEMPTS_PER_SESSION }, (_, index) => ({ index, marks: { takeoffMs: 1000, landingMs: 1500 }, result: null, source: 'manual' as const, flags: [], reasons: [] })), saved: true };
    expect(() => addAttempt(session, { index: 31, marks: { takeoffMs: 1000, landingMs: 1500 }, result: null, source: 'manual', flags: [], reasons: [] })).toThrow();
  });
});
