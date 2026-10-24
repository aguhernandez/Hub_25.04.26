import { describe, expect, it } from 'vitest';
import { buildFrameTable } from '../src/components/training/jump/jumpVideoFrames';
import { computeAttempt } from '../src/components/training/jumpCore';

describe('jump video frame table', () => {
  it.each([30, 120, 240])('measures %i fps and flags a gap', (fps) => {
    const dt = 1000 / fps; const times = [0, dt, 2 * dt, 5.5 * dt, 6.5 * dt]; const result = buildFrameTable(times, fps);
    expect(result.measuredFps).toBeCloseTo(fps, 0); expect(result.skipped).toBe(1);
  });
  it('applies slow-motion time scaling and matches jumpCore marks', () => {
    const table = buildFrameTable([0, 1000 / 30, 2000 / 30], 240);
    expect(table.timeScale).toBeCloseTo(0.125); expect(table.effectiveFps).toBeCloseTo(240);
    const result = computeAttempt('cmj', { takeoffMs: 1000, landingMs: 1500 }, { massKg: 75, fps: 120 });
    expect(result.heightCm).toBeCloseTo(30.65625);
  });
});
