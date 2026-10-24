import { describe, expect, it } from 'vitest';
import { analyzeTrack, TrackSample } from '../src/components/training/barvelocity/vbtCore';

function syntheticTrack(fps: number): TrackSample[] {
  const out: TrackSample[] = [];
  const dt = 1000 / fps;
  for (let rep = 0; rep < 3; rep++) {
    for (let i = 0; i < fps / 2; i++) out.push({ tMs: (rep * 1000) + i * dt, yPx: 350 - i * 3.8, ok: true });
    for (let i = 0; i < fps / 2; i++) out.push({ tMs: (rep * 1000) + 500 + i * dt, yPx: 160 + i * 3.8, ok: true });
  }
  return out;
}

describe('video pipeline core integration', () => {
  it.each([60, 120])('recovers three synthetic reps at %i fps', (fps) => {
    const result = analyzeTrack(syntheticTrack(fps), { pxPerMm: 1, loadKg: 80, minRomMm: 120 });
    expect(result.reps.length).toBe(3);
    expect(result.reps[0].mcvMs).toBeGreaterThan(0.3);
    expect(result.reps.every((rep) => !rep.flags.includes('tracking_gap'))).toBe(true);
  });
});
