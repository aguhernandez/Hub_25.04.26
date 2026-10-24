import { analyzeTrack, velocityLossPct, fitLoadVelocity, estimate1RM, summarizeSet } from '../src/components/training/barvelocity/vbtCore.ts';
import type { TrackSample } from '../src/components/training/barvelocity/vbtCore.ts';

// RNG determinista + gauss
function rng(seed: number) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function gauss(r: () => number) { return Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r()); }

const minJerk = (s: number) => 10 * s ** 3 - 15 * s ** 4 + 6 * s ** 5;
const parab = (s: number) => 3 * s * s - 2 * s ** 3; // v = 6·(ROM/Tc)·s(1-s): aceleración finita (realista)
let prof = parab;

interface RepSpec { tc: number; rom: number; pause?: number; ecc?: number }
// Altura (mm) en función del tiempo para una serie
function buildHeight(reps: RepSpec[], startAtBottom = false) {
  const segs: { t0: number; t1: number; f: (t: number) => number }[] = [];
  let t = 0; let hCur = startAtBottom ? 0 : reps[0].rom;
  const trueMcv: number[] = [];
  const hold = (d: number) => { const h = hCur; segs.push({ t0: t, t1: t + d, f: () => h }); t += d; };
  hold(1.0);
  reps.forEach((r, k) => {
    const ecc = r.ecc ?? 1.5;
    if (!(startAtBottom && k === 0)) {
      const top = hCur; const bottom = top - r.rom;
      segs.push({ t0: t, t1: t + ecc, f: (tt) => top - (r.rom * (1 - Math.cos(Math.PI * (tt - t) / ecc))) / 2 });
      // closure over t: guardamos t actual
      const tt0 = t; segs[segs.length - 1].f = (x) => top - (r.rom * (1 - Math.cos(Math.PI * (x - tt0) / ecc))) / 2;
      t += ecc; hCur = bottom;
    }
    hold(r.pause ?? 0.3);
    const tt0 = t; const base = hCur;
    segs.push({ t0: t, t1: t + r.tc, f: (x) => base + r.rom * prof((x - tt0) / r.tc) });
    t += r.tc; hCur = base + r.rom;
    trueMcv.push(r.rom / r.tc / 1000 * 1000 / 1000 * 1); // mm/ms == m/s -> rom/(tc*1000)
    hold(0.5);
  });
  hold(0.8);
  const total = t;
  const f = (x: number) => { for (const s of segs) if (x >= s.t0 && x < s.t1) return s.f(x); return segs[segs.length - 1].f(segs[segs.length - 1].t1 - 1e-9); };
  return { f, total, trueMcv: reps.map((r) => r.rom / (r.tc * 1000) * 1000 / 1000) };
}

function sample(reps: RepSpec[], fs: number, sigmaPx: number, seed: number, pxPerMm = 0.444, startAtBottom = false, dropFrames: [number, number] | null = null): { s: TrackSample[]; truth: number[] } {
  const { f, total } = buildHeight(reps, startAtBottom);
  const r = rng(seed); const out: TrackSample[] = [];
  const y0 = 600;
  for (let k = 0; k * (1 / fs) < total; k++) {
    const t = k / fs;
    const yPx = y0 - f(t) * pxPerMm + sigmaPx * gauss(r);
    const dropped = dropFrames ? (t >= dropFrames[0] && t < dropFrames[1]) : false;
    out.push({ tMs: t * 1000, yPx, ok: !dropped });
  }
  // MCV verdadero: ROM / Tc  (mm/ms = m/s)
  return { s: out, truth: reps.map((x) => x.rom / (x.tc * 1000)) };
}

const log = (...a: any[]) => console.log(...a);
let fails = 0;
const check = (name: string, cond: boolean, extra = '') => { log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' — ' + extra : '')); if (!cond) fails++; };

// ---- 1) Exactitud de MCV vs fps y ruido ----
const reps: RepSpec[] = [0.8, 0.85, 0.95, 1.1, 1.3].map((tc) => ({ tc, rom: 500 }));
for (const [pname, pf] of [['perfil realista (aceleración finita)', parab], ['perfil min-jerk (arranque/final extremadamente suaves, caso adverso)', minJerk]] as const) {
  prof = pf;
  log(`\n== Error de MCV vs verdad exacta — ${pname}; sentadilla sintética, 5 reps, ROM 500 mm, 0,444 px/mm ==`);
  log('fps | σ ruido (px) | error medio abs (%) | p95 (%) | error máx (%) | reps detectadas');
  for (const fs of [30, 60, 120, 240]) {
    for (const sigma of [0.5, 1.0]) {
      const errs: number[] = []; let detMin = 99;
      for (let seed = 1; seed <= 200; seed++) {
        const { s, truth } = sample(reps, fs, sigma, seed * 7919 + fs);
        const a = analyzeTrack(s, { pxPerMm: 0.444, loadKg: 100 });
        detMin = Math.min(detMin, a.reps.length);
        if (a.reps.length === truth.length) a.reps.forEach((r, i) => errs.push(Math.abs(r.mcvMs - truth[i]) / truth[i] * 100));
      }
      errs.sort((x, y) => x - y);
      const mean = errs.reduce((x, y) => x + y, 0) / errs.length;
      log(`${String(fs).padStart(3)} | ${sigma.toFixed(1)}          | ${mean.toFixed(2).padStart(6)}              | ${errs[Math.floor(errs.length * 0.95)].toFixed(2).padStart(6)}  | ${errs[errs.length - 1].toFixed(2).padStart(6)}        | min ${detMin}/5`);
    }
  }
}
prof = parab;

// ---- 2) Casos estructurales ----
{
  const { s } = sample(reps, 120, 0.5, 11);
  const a = analyzeTrack(s, { pxPerMm: 0.444, loadKg: 100 });
  check('detecta 5 reps y las numera 1..5', a.reps.length === 5 && a.reps.every((r, i) => r.repNumber === i + 1));
  check('la rep 2 (más rápida que la 1 ahora no se descarta) y MCV decrece', a.reps[0].mcvMs > a.reps[4].mcvMs);
  const r0 = a.reps[0];
  check('MPV ≤ pico y ≤ ... y existe a 120 Hz', r0.mpvMs !== null && r0.mpvMs <= r0.peakVelMs + 1e-9);
  check('potencia media > m·g·MCV·0.8 (orden de magnitud correcto)', r0.meanPowerW !== null && r0.meanPowerW > 100 * 9.81 * r0.mcvMs * 0.8, `P=${r0.meanPowerW?.toFixed(0)} W`);
}
{ // pausa larga en banca: no debe contaminar la MCV
  const rp: RepSpec[] = [{ tc: 1.0, rom: 400, pause: 1.5, ecc: 1.2 }, { tc: 1.1, rom: 400, pause: 1.5, ecc: 1.2 }];
  const { s, truth } = sample(rp, 120, 0.5, 5);
  const a = analyzeTrack(s, { pxPerMm: 0.444 });
  const e = a.reps.map((r, i) => Math.abs(r.mcvMs - truth[i]) / truth[i] * 100);
  check('pausa de 1,5 s no distorsiona MCV (<6 %)', a.reps.length === 2 && e.every((x) => x < 6), `err=${e.map((x) => x.toFixed(1))}%`);
}
{ // peso muerto: la primera rep arranca desde el suelo (sin excéntrica previa)
  const rd: RepSpec[] = [{ tc: 1.2, rom: 450, pause: 0.2 }, { tc: 1.3, rom: 450, pause: 0.2 }];
  const { s, truth } = sample(rd, 120, 0.5, 9, 0.444, true);
  const a = analyzeTrack(s, { pxPerMm: 0.444 });
  const e = a.reps.map((r, i) => Math.abs(r.mcvMs - truth[i]) / truth[i] * 100);
  check('rep inicial desde el suelo se detecta (2/2)', a.reps.length === 2, `err=${e.map((x) => x.toFixed(1))}%`);
}
{ // ruido sin movimiento
  const r = rng(3); const flat: TrackSample[] = [];
  for (let k = 0; k < 600; k++) flat.push({ tMs: k * 1000 / 120, yPx: 500 + 1.0 * gauss(r), ok: true });
  const a = analyzeTrack(flat, { pxPerMm: 0.444 });
  check('barra quieta con ruido de 1 px → 0 reps', a.reps.length === 0);
}
{ // pérdida de tracking breve vs larga
  const { s } = sample(reps, 120, 0.5, 21, 0.444, false, [6.0, 6.04]);
  const a = analyzeTrack(s, { pxPerMm: 0.444 });
  check('hueco de 40 ms: sin avisos de gap', a.reps.every((r) => !r.flags.includes('tracking_gap')) && a.reps.length === 5);
  const { s: s2 } = sample(reps, 120, 0.5, 21, 0.444, false, [6.0, 6.4]);
  const b = analyzeTrack(s2, { pxPerMm: 0.444 });
  check('hueco de 400 ms: la rep afectada queda marcada', b.reps.some((r) => r.flags.includes('tracking_gap')), `${b.reps.filter((r) => r.flags.includes('tracking_gap')).length} marcada(s)`);
}
{ // fps bajo → aviso y sin MPV/potencia
  const { s } = sample(reps, 30, 0.5, 2);
  const a = analyzeTrack(s, { pxPerMm: 0.444, loadKg: 100 });
  check('30 fps: aviso de fps y MPV nulo', a.warnings.some((w) => w.includes('fps bajo')) && a.reps[0].mpvMs === null && a.reps[0].meanPowerW === null);
}

// ---- 3) Pérdida de velocidad y LV ----
check('pérdida 0,60→0,80→0,60 = 25 % (ref. mejor)', Math.abs(velocityLossPct([0.6, 0.8, 0.6]) - 25) < 1e-9);
{
  const pts = [{ loadKg: 60, mcvMs: 0.95 }, { loadKg: 80, mcvMs: 0.72 }, { loadKg: 100, mcvMs: 0.50 }, { loadKg: 110, mcvMs: 0.39 }];
  const { fit, warnings } = fitLoadVelocity(pts);
  check('ajuste LV válido', !!fit && fit.r2 > 0.99, fit ? `r²=${fit.r2.toFixed(3)}` : '');
  const est = fit ? estimate1RM(fit, 0.17) : null;
  check('1RM estimado con MVT 0,17 m/s en rango plausible (125–140 kg)', !!est?.oneRmKg && est.oneRmKg > 125 && est.oneRmKg < 140, `1RM≈${est?.oneRmKg?.toFixed(1)} kg, extrap=${est?.extrapolationKg.toFixed(1)} kg`);
  check('2 cargas distintas → rechaza', fitLoadVelocity([{ loadKg: 80, mcvMs: .7 }, { loadKg: 80, mcvMs: .71 }, { loadKg: 100, mcvMs: .5 }]).fit === null);
  check('NaN en datos no propaga', fitLoadVelocity([{ loadKg: NaN, mcvMs: .7 }, { loadKg: 60, mcvMs: .9 }, { loadKg: 100, mcvMs: .5 }, { loadKg: 120, mcvMs: .3 }]).fit !== null);
}
{
  const { s } = sample(reps, 120, 0.5, 11);
  const a = analyzeTrack(s, { pxPerMm: 0.444 });
  const sum = summarizeSet(a.reps);
  log('\nResumen serie sintética 120 fps:', JSON.stringify({ ...sum, bestMcv: +sum.bestMcv.toFixed(3), meanMcv: +sum.meanMcv.toFixed(3), lastMcv: +sum.lastMcv.toFixed(3), lossBestPct: +sum.lossBestPct.toFixed(1) }));
}
log(fails === 0 ? '\nTODOS LOS CASOS OK' : `\n${fails} FALLO(S)`);
process.exit(fails ? 1 : 0);
