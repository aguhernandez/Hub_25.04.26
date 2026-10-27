import { BarRep, CalibrationData } from './BarVelocityTypes';
import { analyzeTrack, TrackSample, VbtRep } from './vbtCore';
import { GrayFrame, PlateTracker, pxPerMmFromPlate } from './plateTracker';

export interface VideoAnalysisOptions { minRomMm?: number; captureFps?: number; onProgress?: (progress: number, effectiveFps: number, lostFrames: number) => void; signal?: AbortSignal; }
export interface LiveTrackPoint { xPx: number; yPx: number; score: number; ok: boolean; width: number; height: number; }

function median(values: number[]): number { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.floor(sorted.length / 2)] ?? 0; }
function toGray(ctx: CanvasRenderingContext2D, width: number, height: number): GrayFrame {
  const rgba = ctx.getImageData(0, 0, width, height).data;
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) gray[i] = Math.round(0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2]);
  return { data: gray, width, height };
}
function mapRep(rep: VbtRep): BarRep {
  return { repNumber: rep.repNumber, source: 'video', meanConcentricVelocityMs: rep.mcvMs, meanPropulsiveVelocityMs: rep.mpvMs, peakVelocityMs: rep.peakVelMs, meanEccentricVelocityMs: rep.eccMeanVelMs, concentricDurationMs: rep.concDurMs, eccentricDurationMs: rep.eccDurMs, displacementMm: rep.romMm, estimatedPowerW: rep.meanPowerW, velocitySamples: null, timestampsMs: [rep.tStartMs, rep.tEndMs], isValid: !rep.flags.includes('tracking_gap') };
}

export async function analyzeBarVideo(blob: Blob, calibration: CalibrationData, fps: number, loadKg?: number, options: VideoAnalysisOptions = {}): Promise<BarRep[]> {
  const video = document.createElement('video');
  const url = URL.createObjectURL(blob);
  video.src = url; video.muted = true; video.playsInline = true; video.playbackRate = 0.25;
  await new Promise<void>((resolve, reject) => { video.onloadedmetadata = () => resolve(); video.onerror = () => reject(new Error('No se pudo leer el vídeo')); });
  const sourceWidth = video.videoWidth || 640; const sourceHeight = video.videoHeight || 480; const scale = Math.min(1, 720 / sourceHeight);
  const width = Math.max(1, Math.round(sourceWidth * scale)); const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas no disponible');
  const radius = (calibration.radiusPx ?? calibration.barDiameterPx / 2) * scale;
  const init = { cx: (calibration.centerX ?? width / 2) * scale, cy: (calibration.centerY ?? calibration.barTopY) * scale, radiusPx: radius };
  const samples: TrackSample[] = []; const dts: number[] = []; let tracker: PlateTracker | null = null; let lastTime = -Infinity; let lostFrames = 0;
  const frameCallback = (_now: number, metadata: VideoFrameCallbackMetadata) => {
    if (options.signal?.aborted || video.ended) return;
    const tMs = metadata.mediaTime * 1000; ctx.drawImage(video, 0, 0, width, height); const frame = toGray(ctx, width, height);
    if (!tracker) tracker = new PlateTracker(frame, init);
    const tracked = tracker.update(frame); const nominalDt = dts.length ? median(dts) : 1000 / Math.max(1, fps);
    const gap = Number.isFinite(lastTime) && tMs - lastTime > 1.5 * nominalDt;
    if (Number.isFinite(lastTime) && tMs > lastTime) dts.push(tMs - lastTime);
    samples.push({ tMs, yPx: tracked.cy, ok: tracked.ok && !gap }); if (!tracked.ok || gap) lostFrames++;
    lastTime = tMs; options.onProgress?.(video.duration > 0 ? Math.min(1, video.currentTime / video.duration) : 0, dts.length ? 1000 / median(dts) : 0, lostFrames);
    if (!video.ended) video.requestVideoFrameCallback(frameCallback);
  };
  await video.play(); video.requestVideoFrameCallback(frameCallback);
  await new Promise<void>((resolve) => { video.onended = () => resolve(); options.signal?.addEventListener('abort', () => resolve(), { once: true }); });
  URL.revokeObjectURL(url);
  const result = analyzeTrack(samples, { pxPerMm: calibration.pixelsPerMm * scale, loadKg, minRomMm: options.minRomMm });
  return result.reps.map(mapRep);
}

export function analyzeBarStream(
  stream: MediaStream,
  calibration: CalibrationData,
  fps: number,
  loadKg?: number,
  onRep?: (rep: BarRep) => void,
  onVelocity?: (velocityMs: number) => void,
  onTrack?: (point: LiveTrackPoint) => void,
): () => void {
  void fps;
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  let stopped = false;
  let tracker: PlateTracker | null = null;
  let lastTime = -Infinity;
  let lastY = 0;
  const samples: TrackSample[] = [];

  const finish = () => {
    if (stopped) return;
    stopped = true;
    const result = analyzeTrack(samples, { pxPerMm: calibration.pixelsPerMm, loadKg });
    result.reps.forEach((rep) => onRep?.(mapRep(rep)));
    video.pause();
    video.srcObject = null;
  };

  const callback = (_now: number, metadata: VideoFrameCallbackMetadata) => {
    if (stopped || !ctx) return;
    const width = video.videoWidth || calibration.processingWidth || 640;
    const height = video.videoHeight || calibration.processingHeight || 480;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    ctx.drawImage(video, 0, 0, width, height);
    const rgba = ctx.getImageData(0, 0, width, height).data;
    const gray = new Uint8ClampedArray(width * height);
    for (let i = 0, p = 0; i < gray.length; i++, p += 4) gray[i] = Math.round(0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2]);
    const frame: GrayFrame = { data: gray, width, height };
    if (!tracker) {
      tracker = new PlateTracker(frame, {
        cx: calibration.centerX ?? width / 2,
        cy: calibration.centerY ?? calibration.barTopY,
        radiusPx: calibration.radiusPx ?? calibration.barDiameterPx / 2,
      });
    }
    const tMs = metadata.mediaTime * 1000;
    const tracked = tracker.update(frame);
    onTrack?.({ xPx: tracked.cx, yPx: tracked.cy, score: tracked.score, ok: tracked.ok, width, height });
    const dt = Number.isFinite(lastTime) && tMs > lastTime ? tMs - lastTime : 0;
    if (dt > 0) onVelocity?.(Math.abs((lastY - tracked.cy) / dt) / calibration.pixelsPerMm);
    samples.push({ tMs, yPx: tracked.cy, ok: tracked.ok });
    lastY = tracked.cy;
    lastTime = tMs;
    if (!stopped) video.requestVideoFrameCallback(callback);
  };

  void video.play().then(() => video.requestVideoFrameCallback(callback)).catch(() => undefined);
  return finish;
}
export { pxPerMmFromPlate };
