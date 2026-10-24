/**
 * vbtCore.ts — procesamiento de señal VBT, sin dependencias de React ni del DOM.
 *
 * Entrada : serie (tiempo, y en píxeles) del centro del disco, más escala px/mm.
 * Salida  : repeticiones con MCV, velocidad pico, MPV, potencia media, ROM y avisos.
 *
 * Convenciones
 *  - Imagen: y crece hacia abajo. Aquí h = (y0 - y)/pxPerMm crece hacia arriba (mm).
 *  - Unidades: mm y ms. Como 1 mm/ms = 1 m/s, v(m/s) = Δh(mm)/Δt(ms).
 *  - MCV = desplazamiento neto concéntrico / duración (NO media de |v| por muestra:
 *    el valor absoluto rectifica el ruido alrededor de cero e infla la media).
 */

export const G = 9.81;

export interface TrackSample {
  tMs: number;
  yPx: number;
  ok: boolean; // false = el tracker perdió el objetivo en ese frame
}

export interface VbtOptions {
  pxPerMm: number;
  loadKg?: number;
  minRomMm?: number; // ROM concéntrico mínimo para contar una repetición (def. 150)
  reversalFrac?: number; // fracción de minRomMm que debe revertir el movimiento (def. 0.4)
  cutoffHz?: number; // corte del pasa-bajos (def. min(8, 0.3·fs))
  startVelMs?: number; // velocidad bajo la cual se considera "aún no empezó" (def. 0.03)
  maxGapMs?: number; // hueco de tracking tolerado sin avisar (def. 100)
}

export interface VbtRep {
  repNumber: number;
  tStartMs: number;
  tEndMs: number;
  romMm: number;
  mcvMs: number;
  peakVelMs: number;
  mpvMs: number | null; // null si fs < 60 Hz (la aceleración no es fiable)
  concDurMs: number;
  eccDurMs: number | null;
  eccMeanVelMs: number | null;
  meanPowerW: number | null; // media de m·(g+a)·v en la fase concéntrica
  flags: string[];
}

export interface VbtAnalysis {
  ok: boolean;
  reason?: string;
  fs: number;
  reps: VbtRep[];
  warnings: string[];
  series: { tMs: number[]; hMm: number[]; vMs: number[] };
}

/* ------------------------------------------------------------------ */
/* Remuestreo uniforme                                                */
/* ------------------------------------------------------------------ */

export interface Uniform {
  t: number[];
  y: number[];
  fs: number;
  gap: boolean[]; // true = valor interpolado dentro de un hueco > maxGapMs
  longGaps: number;
}

export function resampleUniform(samples: TrackSample[], maxGapMs: number): Uniform | null {
  const pts = samples
    .filter((s) => s.ok && Number.isFinite(s.tMs) && Number.isFinite(s.yPx))
    .sort((a, b) => a.tMs - b.tMs)
    .filter((s, i, arr) => i === 0 || s.tMs > arr[i - 1].tMs);
  if (pts.length < 10) return null;

  const dts: number[] = [];
  for (let i = 1; i < pts.length; i++) dts.push(pts[i].tMs - pts[i - 1].tMs);
  const sorted = [...dts].sort((a, b) => a - b);
  const dt = sorted[Math.floor(sorted.length / 2)];
  if (!(dt > 0)) return null;
  const fs = 1000 / dt;

  const t0 = pts[0].tMs;
  const n = Math.floor((pts[pts.length - 1].tMs - t0) / dt) + 1;
  const t: number[] = new Array(n);
  const y: number[] = new Array(n);
  const gap: boolean[] = new Array(n).fill(false);
  let j = 0;
  let longGaps = 0;
  for (let k = 0; k < n; k++) {
    const tk = t0 + k * dt;
    t[k] = tk;
    while (j < pts.length - 2 && pts[j + 1].tMs < tk) j++;
    const a = pts[j];
    const b = pts[j + 1];
    const span = b.tMs - a.tMs;
    const w = span > 0 ? Math.min(1, Math.max(0, (tk - a.tMs) / span)) : 0;
    y[k] = a.yPx + w * (b.yPx - a.yPx);
    if (span > maxGapMs && tk > a.tMs && tk < b.tMs) {
      gap[k] = true;
    }
  }
  for (let k = 1; k < n; k++) if (gap[k] && !gap[k - 1]) longGaps++;
  return { t, y, fs, gap, longGaps };
}

/* ------------------------------------------------------------------ */
/* Pasa-bajos Butterworth de 2º orden, fase cero (filtfilt)           */
/* ------------------------------------------------------------------ */

function biquadPass(x: number[], b: number[], a: number[]): number[] {
  const out = new Array(x.length);
  let x1 = x[0], x2 = x[0], y1 = x[0], y2 = x[0];
  for (let i = 0; i < x.length; i++) {
    const xi = x[i];
    const yi = b[0] * xi + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
    out[i] = yi;
    x2 = x1; x1 = xi; y2 = y1; y1 = yi;
  }
  return out;
}

export function lowPassZeroPhase(x: number[], fs: number, fc: number): number[] {
  if (x.length < 5) return [...x];
  const wc = Math.tan((Math.PI * fc) / fs);
  const k1 = Math.SQRT2 * wc;
  const k2 = wc * wc;
  const a0 = k2 + k1 + 1;
  const b = [k2 / a0, (2 * k2) / a0, k2 / a0];
  const a = [1, (2 * (k2 - 1)) / a0, (k2 - k1 + 1) / a0];

  const pad = Math.min(x.length - 1, Math.ceil((3 * fs) / fc));
  const first = x[0];
  const last = x[x.length - 1];
  const ext: number[] = [];
  for (let i = pad; i >= 1; i--) ext.push(2 * first - x[i]); // extensión impar
  for (let i = 0; i < x.length; i++) ext.push(x[i]);
  for (let i = 1; i <= pad; i++) ext.push(2 * last - x[x.length - 1 - i]);

  const fwd = biquadPass(ext, b, a);
  const bwd = biquadPass(fwd.reverse(), b, a).reverse();
  return bwd.slice(pad, pad + x.length);
}

/** Derivada por diferencias centrales sobre malla uniforme (dtMs). */
export function derivative(x: number[], dtMs: number): number[] {
  const n = x.length;
  const d = new Array(n).fill(0);
  if (n < 2) return d;
  d[0] = (x[1] - x[0]) / dtMs;
  d[n - 1] = (x[n - 1] - x[n - 2]) / dtMs;
  for (let i = 1; i < n - 1; i++) d[i] = (x[i + 1] - x[i - 1]) / (2 * dtMs);
  return d;
}

/* ------------------------------------------------------------------ */
/* Extremos alternos (zigzag) sobre la altura                         */
/* ------------------------------------------------------------------ */

interface Extremum { i: number; type: 'min' | 'max' }

export function zigzag(h: number[], reversal: number): Extremum[] {
  const out: Extremum[] = [];
  let dir = 0; // 1 = subiendo, -1 = bajando, 0 = sin definir
  let minI = 0;
  let maxI = 0;
  for (let i = 1; i < h.length; i++) {
    if (dir === 0) {
      if (h[i] < h[minI]) minI = i;
      if (h[i] > h[maxI]) maxI = i;
      if (h[i] - h[minI] >= reversal && maxI >= minI) {
        out.push({ i: minI, type: 'min' });
        dir = 1;
        maxI = i;
      } else if (h[maxI] - h[i] >= reversal && minI >= maxI) {
        out.push({ i: maxI, type: 'max' });
        dir = -1;
        minI = i;
      }
    } else if (dir === 1) {
      if (h[i] > h[maxI]) maxI = i;
      else if (h[maxI] - h[i] >= reversal) {
        out.push({ i: maxI, type: 'max' });
        dir = -1;
        minI = i;
      }
    } else {
      if (h[i] < h[minI]) minI = i;
      else if (h[i] - h[minI] >= reversal) {
        out.push({ i: minI, type: 'min' });
        dir = 1;
        maxI = i;
      }
    }
  }
  if (dir === 1) out.push({ i: maxI, type: 'max' });
  else if (dir === -1) out.push({ i: minI, type: 'min' });
  return out;
}


function interpAt(arr: number[], t0: number, dtMs: number, tMs: number): number {
  const x = (tMs - t0) / dtMs;
  const i = Math.min(arr.length - 2, Math.max(0, Math.floor(x)));
  const w = Math.min(1, Math.max(0, x - i));
  return arr[i] + w * (arr[i + 1] - arr[i]);
}

/**
 * Tiempo en que la velocidad extrapolada cruza cero, a partir de la rama de subida (dir=-1) o de
 * bajada (dir=+1) alrededor del pico. Regresión t = a + b·v sobre muestras con 20–60 % del pico.
 */
function extrapolatedZeroTime(t: number[], v: number[], vi: number, bound: number, dir: -1 | 1, vPeak: number): number | null {
  const lo = 0.2 * vPeak;
  const hi = 0.6 * vPeak;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = vi; i >= 0 && i < v.length && (dir < 0 ? i >= bound : i <= bound); i += dir) {
    if (v[i] < 0.1 * vPeak) break;
    if (v[i] >= lo && v[i] <= hi) { xs.push(v[i]); ys.push(t[i]); }
  }
  if (xs.length < 3) return null;
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sxx += (xs[i] - mx) ** 2; sxy += (xs[i] - mx) * (ys[i] - my); }
  if (!(sxx > 0)) return null;
  const b = sxy / sxx;
  return my - b * mx;
}

/* ------------------------------------------------------------------ */
/* Análisis completo                                                  */
/* ------------------------------------------------------------------ */

export function analyzeTrack(samples: TrackSample[], opt: VbtOptions): VbtAnalysis {
  const empty: VbtAnalysis = { ok: false, fs: 0, reps: [], warnings: [], series: { tMs: [], hMm: [], vMs: [] } };
  if (!(opt.pxPerMm > 0) || !Number.isFinite(opt.pxPerMm)) return { ...empty, reason: 'escala px/mm inválida' };

  const minRom = opt.minRomMm ?? 150;
  const reversal = Math.max(20, (opt.reversalFrac ?? 0.4) * minRom);
  const startVel = opt.startVelMs ?? 0.03;
  const maxGap = opt.maxGapMs ?? 100;

  const u = resampleUniform(samples, maxGap);
  if (!u) return { ...empty, reason: 'muy pocas muestras válidas de tracking' };

  const warnings: string[] = [];
  const fs = u.fs;
  if (fs < 60) warnings.push(`fps bajo (${fs.toFixed(0)} Hz): usa ≥ 60 Hz (ideal 120–240) para velocidad fiable`);
  if (u.longGaps > 0) warnings.push(`${u.longGaps} hueco(s) de tracking > ${maxGap} ms (interpolados)`);

  const fc = Math.min(opt.cutoffHz ?? 8, 0.3 * fs);
  const yF = lowPassZeroPhase(u.y, fs, fc);
  const y0 = yF[0];
  const h = yF.map((y) => (y0 - y) / opt.pxPerMm); // mm, hacia arriba
  const dtMs = 1000 / fs;
  const v = derivative(h, dtMs); // m/s
  const a = derivative(v, dtMs).map((x) => x * 1000); // m/s²

  const ext = zigzag(h, reversal);
  const reps: VbtRep[] = [];
  let n = 0;
  for (let k = 0; k + 1 < ext.length; k++) {
    const lo = ext[k];
    const hi = ext[k + 1];
    if (lo.type !== 'min' || hi.type !== 'max') continue;
    const rom = h[hi.i] - h[lo.i];
    if (rom < minRom) continue;

    // Pico de velocidad dentro de la pierna ascendente
    let vi = lo.i;
    for (let i = lo.i; i <= hi.i; i++) if (v[i] > v[vi]) vi = i;
    const vPeak = v[vi];
    if (!(vPeak > 0.05)) continue;

    // Inicio y fin del concéntrico: onset/offset EXTRAPOLADOS a v = 0 con un ajuste lineal en la
    // banda 20–60 % del pico (zona de alta relación señal/ruido). El cruce por cero directo es
    // muy sensible al ruido y al filtro porque v→0 con pendiente suave.
    const tOn = extrapolatedZeroTime(u.t, v, vi, lo.i, -1, vPeak);
    const tOff = extrapolatedZeroTime(u.t, v, vi, hi.i, 1, vPeak);
    let s: number, e: number, tS: number, tE: number;
    if (tOn !== null && tOff !== null && tOff > tOn) {
      tS = Math.max(tOn, u.t[lo.i]);
      tE = Math.min(tOff, u.t[hi.i]);
      s = Math.min(vi, Math.max(lo.i, Math.ceil((tS - u.t[0]) / dtMs)));
      e = Math.max(vi, Math.min(hi.i, Math.floor((tE - u.t[0]) / dtMs)));
    } else {
      // Respaldo (pocas muestras en la banda, p. ej. 30 fps con repeticiones rápidas): cruces por cero
      s = lo.i;
      while (s < vi && v[s] <= startVel) s++;
      while (s > lo.i && v[s - 1] > 0) s--;
      e = vi;
      while (e < hi.i && v[e + 1] > 0) e++;
      tS = u.t[s];
      tE = u.t[e];
      warnings.push(`rep ${n + 1}: inicio/fin por cruce por cero (menos robusto)`);
    }
    const durMs = tE - tS;
    if (!(durMs > 0)) continue;

    const hS = interpAt(h, u.t[0], dtMs, tS);
    const hE = interpAt(h, u.t[0], dtMs, tE);
    const dispMm = hE - hS;
    const mcv = dispMm / durMs;
    let peak = -Infinity;
    for (let i = s; i <= e; i++) if (v[i] > peak) peak = v[i];

    let mpv: number | null = null;
    if (fs >= 60) {
      let p = e;
      for (let i = vi; i <= e; i++) {
        if (a[i] < -G) { p = i; break; }
      }
      const dt = u.t[p] - tS;
      mpv = dt > 0 ? (h[p] - hS) / dt : null;
    }

    let power: number | null = null;
    if (opt.loadKg && fs >= 60) {
      let acc = 0;
      let cnt = 0;
      for (let i = s; i <= e; i++) { acc += opt.loadKg * (G + a[i]) * v[i]; cnt++; }
      power = cnt > 0 ? acc / cnt : null;
    }

    let eccDur: number | null = null;
    let eccV: number | null = null;
    const prev = ext[k - 1];
    if (prev && prev.type === 'max') {
      eccDur = u.t[lo.i] - u.t[prev.i];
      eccV = eccDur > 0 ? (h[prev.i] - h[lo.i]) / eccDur : null;
    }

    const flags: string[] = [];
    for (let i = s; i <= e; i++) if (u.gap[i]) { flags.push('tracking_gap'); break; }
    if (mcv <= 0 || !Number.isFinite(mcv)) continue;

    n++;
    reps.push({
      repNumber: n,
      tStartMs: tS,
      tEndMs: tE,
      romMm: dispMm,
      mcvMs: mcv,
      peakVelMs: peak,
      mpvMs: mpv,
      concDurMs: durMs,
      eccDurMs: eccDur,
      eccMeanVelMs: eccV,
      meanPowerW: power,
      flags,
    });
  }

  if (reps.length === 0) warnings.push('no se detectaron repeticiones (ROM mínimo no alcanzado o tracking perdido)');
  return { ok: true, fs, reps, warnings, series: { tMs: u.t, hMm: h, vMs: v } };
}

/* ------------------------------------------------------------------ */
/* Resumen de serie y pérdida de velocidad (una sola definición)      */
/* ------------------------------------------------------------------ */

/**
 * Pérdida de velocidad dentro de la serie, respecto a la repetición MÁS RÁPIDA
 * (definición habitual en la literatura de VBT). Devuelve % (0–100).
 */
export function velocityLossPct(mcvs: number[], ref: 'best' | 'first' = 'best'): number {
  const v = mcvs.filter((x) => Number.isFinite(x) && x > 0);
  if (v.length < 2) return 0;
  const base = ref === 'best' ? Math.max(...v) : v[0];
  const last = v[v.length - 1];
  return Math.max(0, ((base - last) / base) * 100);
}

export function summarizeSet(reps: VbtRep[]) {
  const ok = reps.filter((r) => !r.flags.includes('tracking_gap'));
  const mcvs = ok.map((r) => r.mcvMs);
  return {
    nReps: reps.length,
    nValid: ok.length,
    bestMcv: mcvs.length ? Math.max(...mcvs) : 0,
    meanMcv: mcvs.length ? mcvs.reduce((s, x) => s + x, 0) / mcvs.length : 0,
    lastMcv: mcvs.length ? mcvs[mcvs.length - 1] : 0,
    lossBestPct: velocityLossPct(mcvs, 'best'),
    lossFirstPct: velocityLossPct(mcvs, 'first'),
  };
}

/* ------------------------------------------------------------------ */
/* Perfil carga–velocidad con validaciones                            */
/* ------------------------------------------------------------------ */

export interface LvPoint { loadKg: number; mcvMs: number }
export interface LvFit {
  slope: number;
  intercept: number;
  r2: number;
  n: number;
  minLoadKg: number;
  maxLoadKg: number;
}

export function fitLoadVelocity(points: LvPoint[]): { fit: LvFit | null; warnings: string[]; reason?: string } {
  const warnings: string[] = [];
  const p = points.filter((q) => Number.isFinite(q.loadKg) && Number.isFinite(q.mcvMs) && q.loadKg > 0 && q.mcvMs > 0);
  if (p.length < 3) return { fit: null, warnings, reason: 'se necesitan ≥ 3 puntos válidos' };

  const loads = p.map((q) => q.loadKg);
  const lo = Math.min(...loads);
  const hi = Math.max(...loads);
  const distinct = new Set(loads.map((x) => Math.round(x / 2.5))).size;
  if (distinct < 3) return { fit: null, warnings, reason: 'se necesitan ≥ 3 cargas distintas (≥ 2,5 kg de diferencia)' };
  if ((hi - lo) / hi < 0.2) return { fit: null, warnings, reason: 'rango de cargas demasiado estrecho (< 20 % de la carga máxima)' };

  const n = p.length;
  const mx = loads.reduce((s, x) => s + x, 0) / n;
  const my = p.reduce((s, q) => s + q.mcvMs, 0) / n;
  let sxx = 0, sxy = 0, syy = 0;
  for (const q of p) {
    sxx += (q.loadKg - mx) ** 2;
    sxy += (q.loadKg - mx) * (q.mcvMs - my);
    syy += (q.mcvMs - my) ** 2;
  }
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const r2 = syy > 0 ? (sxy * sxy) / (sxx * syy) : 0;
  if (!(slope < 0)) return { fit: null, warnings, reason: 'pendiente no negativa: los datos no siguen una relación carga–velocidad' };
  if (r2 < 0.7) warnings.push(`R² bajo (${r2.toFixed(2)}): perfil poco fiable`);
  return { fit: { slope, intercept, r2, n, minLoadKg: lo, maxLoadKg: hi }, warnings };
}

export function estimate1RM(fit: LvFit, mvtMs: number): { oneRmKg: number | null; extrapolationKg: number; lowConfidence: boolean } {
  const load = (mvtMs - fit.intercept) / fit.slope;
  if (!Number.isFinite(load) || load <= 0) return { oneRmKg: null, extrapolationKg: 0, lowConfidence: true };
  const extra = Math.max(0, load - fit.maxLoadKg);
  return { oneRmKg: load, extrapolationKg: extra, lowConfidence: extra / fit.maxLoadKg > 0.2 || fit.r2 < 0.8 };
}
