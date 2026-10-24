import { PlateTracker, pxPerMmFromPlate } from '../src/components/training/barvelocity/plateTracker.ts';
import { analyzeTrack } from '../src/components/training/barvelocity/vbtCore.ts';
import type { TrackSample } from '../src/components/training/barvelocity/vbtCore.ts';

function rng(seed: number) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function gauss(r: () => number) { return Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r()); }
const parab = (s: number) => 3 * s * s - 2 * s ** 3;
const W = 640, H = 760, R = 90, PXMM = (2 * R) / 450; // 0,4 px/mm
const ROM = 500;

// fondo con estructura (rack, líneas, gradiente)
function makeBackground(): Uint8ClampedArray {
  const bg = new Uint8ClampedArray(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let v = 110 + 30 * (x / W) + 20 * Math.sin(y / 70);
    if (Math.abs(x - 40) < 8 || Math.abs(x - 600) < 8) v = 60;       // montantes
    if (Math.abs(y - 80) < 3 || Math.abs(y - 700) < 3) v = 170;      // líneas horizontales
    bg[y * W + x] = v;
  }
  return bg;
}
const BG = makeBackground();

// disco: anillo oscuro exterior, cara clara con "logo" asimétrico, borde antialias
function drawFrame(cx: number, cy: number, gain: number, sigma: number, r: () => number): { data: Uint8ClampedArray; width: number; height: number } {
  const d = new Uint8ClampedArray(BG); // copia
  const x0 = Math.max(0, Math.floor(cx - R - 3)), x1 = Math.min(W - 1, Math.ceil(cx + R + 3));
  const y0 = Math.max(0, Math.floor(cy - R - 3)), y1 = Math.min(H - 1, Math.ceil(cy + R + 3));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const dx = x - cx, dy = y - cy; const rr = Math.hypot(dx, dy);
    const cover = Math.max(0, Math.min(1, R + 0.5 - rr)); // antialias
    if (cover <= 0) continue;
    let v = rr > 0.8 * R ? 45 : 150;                          // anillo / cara
    if (rr < 0.8 * R) {
      if (Math.hypot(dx - 0.35 * R, dy + 0.25 * R) < 0.18 * R) v = 230;     // logo 1
      if (Math.abs(dy - 0.4 * R) < 3 && Math.abs(dx + 0.2 * R) < 0.35 * R) v = 60; // marca 2
    }
    if (rr < 0.12 * R) v = 30;                                // agujero
    const base = BG[y * W + x];
    d[y * W + x] = base * (1 - cover) + v * cover;
  }
  for (let i = 0; i < d.length; i++) d[i] = d[i] * gain + sigma * gauss(r);
  return { data: d, width: W, height: H };
}

function runCase(fs: number, tcs: number[], sigmaGray: number, seed: number, radiusErrPx: number) {
  const r = rng(seed);
  // trayectoria analítica: y_px = y0 - h*PXMM
  const y0 = 640;
  const segs: { t0: number; t1: number; f: (t: number) => number }[] = [];
  let t = 0; let hCur = ROM;
  const hold = (dd: number) => { const h = hCur, a = t; segs.push({ t0: a, t1: a + dd, f: () => h }); t += dd; };
  hold(1.0);
  for (const tc of tcs) {
    const top = hCur, a = t; segs.push({ t0: a, t1: a + 1.5, f: (x) => top - ROM * (1 - Math.cos(Math.PI * (x - a) / 1.5)) / 2 }); t += 1.5; hCur = top - ROM;
    hold(0.3);
    const base = hCur, b = t; segs.push({ t0: b, t1: b + tc, f: (x) => base + ROM * parab((x - b) / tc) }); t += tc; hCur = base + ROM;
    hold(0.5);
  }
  hold(0.8);
  const total = t;
  const hOf = (x: number) => { for (const s of segs) if (x >= s.t0 && x < s.t1) return s.f(x); return ROM; };

  const samples: TrackSample[] = []; const errs: number[] = []; let lost = 0; let tracker: PlateTracker | null = null;
  const t0 = performance.now(); let frames = 0;
  for (let k = 0; k / fs < total; k++) {
    const tt = k / fs; const cyTrue = y0 - hOf(tt) * PXMM; const cxTrue = 320 + 2 * Math.sin(tt * 1.7);
    const gain = 1 + 0.05 * Math.sin(tt * 0.9); // deriva de iluminación
    const fr = drawFrame(cxTrue, cyTrue, gain, sigmaGray, r);
    if (!tracker) { tracker = new PlateTracker(fr, { cx: cxTrue, cy: cyTrue, radiusPx: R }); }
    const res = tracker.update(fr); frames++;
    samples.push({ tMs: tt * 1000, yPx: res.cy, ok: res.ok });
    if (!res.ok) lost++;
    errs.push(res.cy - cyTrue);
  }
  const ms = (performance.now() - t0) / frames;
  const rmse = Math.sqrt(errs.reduce((a, b) => a + b * b, 0) / errs.length);
  const maxe = Math.max(...errs.map(Math.abs));
  // El usuario marca el radio con un error de ±radiusErrPx → error de escala
  const pxPerMm = pxPerMmFromPlate(R + radiusErrPx);
  const an = analyzeTrack(samples, { pxPerMm });
  const truth = tcs.map((tc) => ROM / (tc * 1000));
  const e = an.reps.map((rp, i) => (rp.mcvMs - truth[i]) / truth[i] * 100);
  return { rmse, maxe, lost, ms, nReps: an.reps.length, e };
}

const tcs = [0.8, 1.0, 1.3];
console.log('fps | σ gris | err radio marcado | RMSE y (px) | máx (px) | frames perdidos | ms/frame | reps | error MCV por rep (%)');
for (const fs of [30, 60, 120]) {
  for (const [sg, re] of [[3, 0], [8, 2]] as const) {
    const o = runCase(fs, tcs, sg, 100 + fs, re);
    console.log(`${String(fs).padStart(3)} | ${sg}      | ${String(re).padStart(2)} px            | ${o.rmse.toFixed(3).padStart(6)}      | ${o.maxe.toFixed(2).padStart(5)}    | ${String(o.lost).padStart(3)}             | ${o.ms.toFixed(1).padStart(5)}    | ${o.nReps}/3  | ${o.e.map((x) => x.toFixed(1)).join(', ')}`);
  }
}
