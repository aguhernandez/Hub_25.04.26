import { timeScaleFromFps } from '../jumpCore';

export interface FrameTimestamp { index: number; mediaTimeMs: number; skipped: boolean; }
export function buildFrameTable(mediaTimesMs: number[], captureFps: number): { frames: FrameTimestamp[]; measuredFps: number; skipped: number; timeScale: number; effectiveFps: number } {
  const deltas = mediaTimesMs.slice(1).map((time, index) => time - mediaTimesMs[index]).filter((delta) => delta > 0);
  const sorted = [...deltas].sort((a, b) => a - b); const median = sorted[Math.floor(sorted.length / 2)] ?? 1000 / captureFps;
  const frames = mediaTimesMs.map((mediaTimeMs, index) => ({ index, mediaTimeMs, skipped: index > 0 && mediaTimeMs - mediaTimesMs[index - 1] > 1.5 * median }));
  const measuredFps = median > 0 ? 1000 / median : 0; const timeScale = measuredFps > 0 ? timeScaleFromFps(median, captureFps) : 1;
  return { frames, measuredFps, skipped: frames.filter((frame) => frame.skipped).length, timeScale, effectiveFps: timeScale > 0 ? measuredFps / timeScale : measuredFps };
}
