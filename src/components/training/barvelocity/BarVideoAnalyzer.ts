import {
  VelocitySample,
  BarRep,
  CalibrationData,
  calcMeanVelocity,
  calcPeakVelocity,
  calcEstimatedPower,
} from './BarVelocityTypes';

const SMOOTHING_WINDOW = 3;
const MIN_REP_DISPLACEMENT_MM = 50;
const VELOCITY_THRESHOLD_MS = 0.05;

function detectBarPosition(
  ctx: CanvasRenderingContext2D,
  width: number,
  _height: number,
  searchMinY: number,
  searchMaxY: number
): number {
  const centerX = Math.floor(width / 2);
  const scanWidth = Math.floor(width * 0.3);
  const startX = centerX - scanWidth / 2;

  let bestY = -1;
  let bestContrast = 0;

  const step = 2;
  for (let y = searchMinY; y < searchMaxY - step; y += step) {
    const row1 = ctx.getImageData(startX, y, scanWidth, 1).data;
    const row2 = ctx.getImageData(startX, y + step, scanWidth, 1).data;

    let bright1 = 0;
    let bright2 = 0;
    for (let i = 0; i < row1.length; i += 4) {
      bright1 += (row1[i] * 0.299 + row1[i + 1] * 0.587 + row1[i + 2] * 0.114);
      bright2 += (row2[i] * 0.299 + row2[i + 1] * 0.587 + row2[i + 2] * 0.114);
    }
    bright1 /= scanWidth;
    bright2 /= scanWidth;

    const contrast = Math.abs(bright1 - bright2);
    if (contrast > bestContrast) {
      bestContrast = contrast;
      bestY = y + step / 2;
    }
  }

  return bestY;
}

function smoothPositions(positions: number[]): number[] {
  const smoothed: number[] = [];
  for (let i = 0; i < positions.length; i++) {
    const start = Math.max(0, i - SMOOTHING_WINDOW);
    const end = Math.min(positions.length - 1, i + SMOOTHING_WINDOW);
    let sum = 0;
    for (let j = start; j <= end; j++) sum += positions[j];
    smoothed.push(sum / (end - start + 1));
  }
  return smoothed;
}

function computeVelocitySamples(
  positions: number[],
  timestamps: number[],
  pixelsPerMm: number
): VelocitySample[] {
  const samples: VelocitySample[] = [];
  for (let i = 1; i < positions.length; i++) {
    const dt = (timestamps[i] - timestamps[i - 1]) / 1000;
    if (dt <= 0) continue;
    const dPosPx = positions[i - 1] - positions[i];
    const dPosMm = dPosPx / pixelsPerMm;
    const velocity = (dPosMm / 1000) / dt;
    samples.push({
      timeMs: timestamps[i],
      velocityMs: velocity,
      positionPx: positions[i],
    });
  }
  return samples;
}

function segmentReps(
  samples: VelocitySample[],
  _positions: number[],
  timestamps: number[],
  pixelsPerMm: number,
  loadKg?: number
): BarRep[] {
  if (samples.length < 10) return [];

  const reps: BarRep[] = [];
  let inConcentric = false;
  let inEccentric = false;
  let concentricStart = 0;
  let eccentricStart = 0;
  let repStartIdx = 0;
  let repNumber = 1;

  const concentricSamples: VelocitySample[] = [];
  const eccentricSamples: VelocitySample[] = [];

  const flushRep = (endIdx: number) => {
    if (concentricSamples.length < 3) return;

    const allSamples = [...eccentricSamples, ...concentricSamples];
    const meanV = calcMeanVelocity(concentricSamples);
    const peakV = calcPeakVelocity(concentricSamples);
    const meanEccV = eccentricSamples.length > 0 ? calcMeanVelocity(eccentricSamples) : 0;

    const startPos = samples[repStartIdx]?.positionPx || 0;
    const endPos = samples[Math.min(endIdx, samples.length - 1)]?.positionPx || 0;
    const dispMm = Math.abs(startPos - endPos) / pixelsPerMm;

    if (dispMm < MIN_REP_DISPLACEMENT_MM) return;
    if (meanV < VELOCITY_THRESHOLD_MS) return;

    const concDur = timestamps[Math.min(endIdx, timestamps.length - 1)] - timestamps[concentricStart] || 0;
    const eccDur = concentricStart > eccentricStart
      ? timestamps[concentricStart] - timestamps[eccentricStart]
      : 0;

    const power = loadKg ? calcEstimatedPower(meanV, loadKg) : undefined;

    reps.push({
      repNumber: repNumber++,
      meanConcentricVelocityMs: meanV,
      peakVelocityMs: peakV,
      meanEccentricVelocityMs: meanEccV,
      concentricDurationMs: concDur,
      eccentricDurationMs: eccDur,
      displacementMm: dispMm,
      estimatedPowerW: power,
      velocitySamples: allSamples,
      timestampsMs: allSamples.map((s) => s.timeMs),
      isValid: true,
    });

    concentricSamples.length = 0;
    eccentricSamples.length = 0;
    repStartIdx = endIdx;
  };

  for (let i = 0; i < samples.length; i++) {
    const v = samples[i].velocityMs;

    if (v > VELOCITY_THRESHOLD_MS && !inConcentric) {
      if (!inEccentric) eccentricStart = i;
      inConcentric = true;
      inEccentric = false;
      concentricStart = i;
      concentricSamples.push(samples[i]);
    } else if (v > VELOCITY_THRESHOLD_MS && inConcentric) {
      concentricSamples.push(samples[i]);
    } else if (v < -VELOCITY_THRESHOLD_MS && !inEccentric) {
      if (inConcentric) {
        flushRep(i);
      }
      inEccentric = true;
      inConcentric = false;
      eccentricStart = i;
      eccentricSamples.push(samples[i]);
    } else if (v < -VELOCITY_THRESHOLD_MS && inEccentric) {
      eccentricSamples.push(samples[i]);
    } else if (Math.abs(v) <= VELOCITY_THRESHOLD_MS) {
      if (inConcentric && concentricSamples.length > 3) {
        flushRep(i);
        inConcentric = false;
      }
      if (inEccentric) {
        inEccentric = false;
      }
    }
  }

  if (inConcentric && concentricSamples.length > 3) {
    flushRep(samples.length - 1);
  }

  return reps;
}

export async function analyzeBarVideo(
  blob: Blob,
  calibration: CalibrationData,
  fps: number,
  loadKg?: number
): Promise<BarRep[]> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(blob);
    video.src = url;
    video.muted = true;

    const runAnalysis = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const scaleY = canvas.height / ((video as any).clientHeight || canvas.height);

      const searchMinY = 0;
      const searchMaxY = canvas.height;

      const frameInterval = 1 / fps;
      // iOS reports duration=Infinity for MediaRecorder blobs; cap at 30s
      const safeDuration = isFinite(video.duration) && video.duration > 0
        ? video.duration
        : 15;
      const totalFrames = Math.max(1, Math.floor(safeDuration * fps));

      const positions: number[] = [];
      const timestamps: number[] = [];
      let currentFrame = 0;

      const processFrame = () => {
        if (currentFrame >= totalFrames) {
          URL.revokeObjectURL(url);

          if (positions.length < 10) {
            resolve([]);
            return;
          }

          const smoothed = smoothPositions(positions);
          const pixelsPerMm = calibration.pixelsPerMm * scaleY;
          const samples = computeVelocitySamples(smoothed, timestamps, pixelsPerMm);
          const reps = segmentReps(samples, smoothed, timestamps, pixelsPerMm, loadKg);
          resolve(reps);
          return;
        }

        video.currentTime = currentFrame * frameInterval;
        currentFrame++;
      };

      video.onseeked = () => {
        ctx.drawImage(video, 0, 0);
        const barY = detectBarPosition(ctx, canvas.width, canvas.height, searchMinY, searchMaxY);
        if (barY > 0) {
          positions.push(barY);
          timestamps.push(currentFrame * (1000 / fps));
        }
        processFrame();
      };

      processFrame();
    };

    video.onloadedmetadata = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        runAnalysis();
      } else {
        video.oncanplay = () => runAnalysis();
      }
    };

    // Safari fallback: sometimes skips onloadedmetadata for blob URLs
    video.oncanplaythrough = () => {
      if (video.videoWidth > 0 && !video.onseeked) {
        runAnalysis();
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve([]);
    };
  });
}

export function analyzeBarStream(
  stream: MediaStream,
  calibration: CalibrationData,
  fps: number,
  loadKg?: number,
  onRepDetected?: (rep: BarRep) => void,
  onVelocityUpdate?: (velocity: number) => void
): () => void {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const video = document.createElement('video');
  video.srcObject = stream;
  video.muted = true;
  video.play();

  const positions: number[] = [];
  const timestamps: number[] = [];
  const velocities: number[] = [];

  let repNumber = 1;
  let isActive = true;
  let lastRepFlush = 0;
  const concentricBuffer: number[] = [];
  const eccentricBuffer: number[] = [];

  let inPhase: 'concentric' | 'eccentric' | 'rest' = 'rest';
  let phaseStart = 0;

  const interval = setInterval(() => {
    if (!isActive || video.readyState < 2) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const barY = detectBarPosition(ctx, canvas.width, canvas.height, 0, canvas.height);
    if (barY < 0) return;

    const now = performance.now();
    positions.push(barY);
    timestamps.push(now);

    if (positions.length >= 3) {
      const dt = (timestamps[timestamps.length - 1] - timestamps[timestamps.length - 2]) / 1000;
      if (dt > 0) {
        const dPosPx = positions[positions.length - 2] - barY;
        const dPosMm = dPosPx / calibration.pixelsPerMm;
        const velocity = (dPosMm / 1000) / dt;
        velocities.push(velocity);
        onVelocityUpdate?.(velocity);

        if (velocity > VELOCITY_THRESHOLD_MS) {
          if (inPhase !== 'concentric') {
            inPhase = 'concentric';
            phaseStart = now;
            concentricBuffer.length = 0;
          }
          concentricBuffer.push(velocity);
        } else if (velocity < -VELOCITY_THRESHOLD_MS) {
          if (inPhase === 'concentric' && concentricBuffer.length > 3 && (now - lastRepFlush) > 500) {
            const meanV = concentricBuffer.reduce((a, b) => a + b, 0) / concentricBuffer.length;
            const peakV = Math.max(...concentricBuffer);
            const concDur = now - phaseStart;
            const eccDur = eccentricBuffer.length > 0 ? phaseStart - (timestamps[timestamps.length - concentricBuffer.length - eccentricBuffer.length] || phaseStart) : 0;
            const meanEccV = eccentricBuffer.length > 0
              ? eccentricBuffer.reduce((a, b) => a + Math.abs(b), 0) / eccentricBuffer.length
              : 0;
            const dispMm = (concentricBuffer.length / fps) * meanV * 1000;

            if (meanV > VELOCITY_THRESHOLD_MS && dispMm > MIN_REP_DISPLACEMENT_MM) {
              const power = loadKg ? calcEstimatedPower(meanV, loadKg) : undefined;
              const rep: BarRep = {
                repNumber: repNumber++,
                meanConcentricVelocityMs: meanV,
                peakVelocityMs: peakV,
                meanEccentricVelocityMs: meanEccV,
                concentricDurationMs: concDur,
                eccentricDurationMs: eccDur,
                displacementMm: dispMm,
                estimatedPowerW: power,
                velocitySamples: concentricBuffer.map((v, i) => ({
                  timeMs: phaseStart + i * (1000 / fps),
                  velocityMs: v,
                  positionPx: 0,
                })),
                timestampsMs: concentricBuffer.map((_, i) => phaseStart + i * (1000 / fps)),
                isValid: true,
              };
              onRepDetected?.(rep);
              lastRepFlush = now;
            }
            concentricBuffer.length = 0;
          }
          inPhase = 'eccentric';
          eccentricBuffer.push(velocity);
        } else {
          if (inPhase !== 'rest') {
            inPhase = 'rest';
            eccentricBuffer.length = 0;
          }
        }
      }
    }

    if (positions.length > fps * 30) {
      positions.splice(0, fps * 10);
      timestamps.splice(0, fps * 10);
    }
  }, Math.floor(1000 / fps));

  return () => {
    isActive = false;
    clearInterval(interval);
    video.srcObject = null;
  };
}
