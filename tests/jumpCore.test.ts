import {
  flightMsToHeightCm, heightCmToFlightMs, takeoffVelocityMs, frameUncertainty, timeScaleFromFps,
  computeAttempt, computeRepeated, summarizeSession, asymmetryPct, samozinoPoint, fitFVProfile, sayersPeakPowerSJ, G,
} from '../src/components/training/jumpCore.ts';
import { it } from 'vitest';

let fails = 0;
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;
const check = (name: string, cond: boolean, extra = '') => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' — ' + extra : '')); if (!cond) fails++; };

// --- conversiones ---
check('500 ms → 30,65625 cm', near(flightMsToHeightCm(500), 30.65625, 1e-9));
check('ida y vuelta altura↔tiempo', near(flightMsToHeightCm(heightCmToFlightMs(42.3)), 42.3, 1e-9));
check('velocidad de despegue 500 ms = 2,4525 m/s', near(takeoffVelocityMs(500), 2.4525, 1e-9));
check('coherencia: v² = 2·g·h', near(takeoffVelocityMs(500) ** 2, 2 * G * flightMsToHeightCm(500) / 100, 1e-9));

// --- incertidumbre por cuadro (vuelo 500 ms) ---
for (const [fps, expected] of [[30, 4.22], [120, 1.03], [240, 0.51]] as const) {
  const u = frameUncertainty(500, fps);
  check(`1 cuadro a ${fps} fps ≈ ${expected} cm`, near(u.oneFrameStepCm, expected, 0.03), `${u.oneFrameStepCm.toFixed(2)} cm; 1σ típico ${u.typicalCm.toFixed(2)} cm`);
}

// --- escala de tiempo (slow-mo exportado) ---
check('30 fps medidos, captura 30 → factor 1', timeScaleFromFps(1000 / 30, 30) === 1);
check('240 fps reales → factor 1', timeScaleFromFps(1000 / 240, 240) === 1);
check('slow-mo estirado (30 fps medidos, captura 240) → factor 0,125', near(timeScaleFromFps(1000 / 30, 240), 0.125, 1e-9));

// --- CMJ / SJ ---
const ctx = { massKg: 75, fps: 240 };
{
  const a = computeAttempt('cmj', { takeoffMs: 1000, landingMs: 1500 }, ctx);
  check('CMJ válido: altura y velocidad', a.ok && near(a.heightCm, 30.65625, 1e-9) && near(a.takeoffVelMs, 2.4525, 1e-9));
  check('CMJ sin marca de inicio: sin RSImod', a.rsiMod === null);
  const b = computeAttempt('cmj', { onsetMs: 600, takeoffMs: 1000, landingMs: 1500 }, ctx);
  check('RSImod = altura(m)/tiempo hasta despegue(s) = 0,3066/0,4', b.rsiMod !== null && near(b.rsiMod, 0.3065625 / 0.4, 1e-9), `${b.rsiMod?.toFixed(3)}`);
}
{
  const bad = computeAttempt('cmj', { takeoffMs: 1000, landingMs: 1100 }, ctx);
  check('vuelo de 100 ms se rechaza', !bad.ok && bad.reasons.some((r) => r.includes('150')));
  check('vuelo de 1200 ms se rechaza', !computeAttempt('cmj', { takeoffMs: 0, landingMs: 1200 }, ctx).ok);
  check('aterrizaje antes del despegue se rechaza', !computeAttempt('cmj', { takeoffMs: 1500, landingMs: 1000 }, ctx).ok);
  check('NaN en marcas se rechaza', !computeAttempt('cmj', { takeoffMs: NaN, landingMs: 1500 }, ctx).ok);
  check('masa 0 se rechaza', !computeAttempt('cmj', { takeoffMs: 1000, landingMs: 1500 }, { massKg: 0, fps: 240 }).ok);
  check('30 fps marca low_fps', computeAttempt('cmj', { takeoffMs: 1000, landingMs: 1500 }, { massKg: 75, fps: 30 }).flags.includes('low_fps'));
}

// --- DJ ---
{
  const a = computeAttempt('dj', { contactMs: 800, takeoffMs: 1000, landingMs: 1500 }, { ...ctx, boxCm: 30 });
  check('DJ: contacto 200 ms, vuelo 500 ms → RSI ≈ 1,533', a.ok && a.contactMs === 200 && near(a.rsi!, 0.3065625 / 0.2, 1e-9), `RSI=${a.rsi?.toFixed(3)}`);
  check('DJ sin primer contacto se rechaza', !computeAttempt('dj', { takeoffMs: 1000, landingMs: 1500 }, ctx).ok);
  check('DJ con contacto de 20 ms se rechaza', !computeAttempt('dj', { contactMs: 980, takeoffMs: 1000, landingMs: 1500 }, ctx).ok);
}

// --- Samozino ---
{
  const s = samozinoPoint({ massKg: 80, heightM: 0.40, hpoM: 0.40 });
  const F = 80 * G * 2; const v = Math.sqrt(G * 0.4 / 2);
  check('Samozino: F = 2·m·g, v = √(g·h/2), P = F·v', near(s.forceN, F, 1e-9) && near(s.velMs, v, 1e-9) && near(s.powerW, F * v, 1e-9), `F=${s.forceN.toFixed(0)} N, v=${s.velMs.toFixed(3)} m/s, P=${s.powerW.toFixed(0)} W`);
  const withLoad = samozinoPoint({ massKg: 80, loadKg: 20, heightM: 0.25, hpoM: 0.40 });
  check('Samozino con carga usa masa total', near(withLoad.forceN, 100 * G * (0.25 / 0.40 + 1), 1e-9));
  const a = computeAttempt('sj', { takeoffMs: 1000, landingMs: 1500 }, { massKg: 80, fps: 240, hpoM: 0.40 });
  check('SJ con hPO calcula Samozino; sin hPO no', a.samozino !== null && computeAttempt('sj', { takeoffMs: 1000, landingMs: 1500 }, { massKg: 80, fps: 240 }).samozino === null);
  check('hPO fuera de 0,1–0,8 m marca aviso', computeAttempt('sj', { takeoffMs: 1000, landingMs: 1500 }, { massKg: 80, fps: 240, hpoM: 1.2 }).flags.includes('hpo_atipico'));
}
// --- perfil F-v ---
{
  const F0 = 3000, v0 = 3.0; // verdad
  const pts = [0.9, 1.3, 1.7, 2.1].map((v) => ({ velMs: v, forceN: F0 * (1 - v / v0) }));
  const { fit } = fitFVProfile(pts);
  check('F-v: recupera F0, v0 y Pmax = F0·v0/4', !!fit && near(fit.f0N, 3000, 1e-6) && near(fit.v0Ms, 3.0, 1e-9) && near(fit.pmaxW, 2250, 1e-6), fit ? `Pmax=${fit.pmaxW.toFixed(0)}` : '');
  check('F-v: 2 cargas se rechaza', fitFVProfile(pts.slice(0, 2)).fit === null);
  check('F-v: pendiente positiva se rechaza', fitFVProfile([{ velMs: 1, forceN: 1000 }, { velMs: 1.5, forceN: 1500 }, { velMs: 2, forceN: 2000 }]).fit === null);
  check('F-v: NaN no se propaga', fitFVProfile([{ velMs: NaN, forceN: 1 }, ...pts]).fit !== null);
}

// --- RJ ---
{
  const ev = (arr: [string, number][]) => arr.map(([k, t]) => ({ kind: k as 'touch' | 'takeoff', tMs: t }));
  // 5 saltos: contacto 180–220 ms, vuelo 420→380 ms
  let t = 0; const evs: [string, number][] = [];
  const cts = [180, 190, 200, 210, 220], fls = [420, 410, 400, 390, 380];
  for (let i = 0; i < 5; i++) { evs.push(['touch', t]); t += cts[i]; evs.push(['takeoff', t]); t += fls[i]; }
  evs.push(['touch', t]);
  const r = computeRepeated(ev(evs));
  check('RJ: 5 saltos formados', r.ok && r.jumps.length === 5 && r.summary!.n === 5);
  check('RJ: altura del 1.º salto = h(420 ms) y RSI = h/contacto', near(r.jumps[0].heightCm, flightMsToHeightCm(420), 1e-9) && near(r.jumps[0].rsi, flightMsToHeightCm(420) / 100 / 0.18, 1e-9));
  check('RJ: caída de altura = (mejor − último)/mejor', near(r.summary!.heightDropPct, (1 - flightMsToHeightCm(380) / flightMsToHeightCm(420)) * 100, 1e-9), `${r.summary!.heightDropPct.toFixed(1)} %`);
  check('RJ: marcas sin alternar se rechazan', !computeRepeated(ev([['touch', 0], ['touch', 100], ['takeoff', 300]])).ok);
  check('RJ: marcas desordenadas se rechazan', !computeRepeated(ev([['touch', 0], ['takeoff', 200], ['touch', 100]])).ok);
}

// --- resumen y asimetría ---
{
  const s = summarizeSession([40, 30, 40]);
  check('resumen: 40/30/40 → caída respecto al mejor 0 % (último = mejor) y CV calculado', s.bestCm === 40 && s.dropFromBestPct === 0 && s.cvPct !== null);
  check('resumen: 40/38/34 → caída 15 %', near(summarizeSession([40, 38, 34]).dropFromBestPct, 15, 1e-9));
  check('resumen ignora NaN y ceros', summarizeSession([NaN, 0, 30, 32]).n === 2);
  const a = asymmetryPct(28, 32);
  check('asimetría 28 vs 32 = 12,5 % a favor del derecho', !!a && near(a.pct, 12.5, 1e-9) && a.stronger === 'right');
  check('asimetría con 0 → null', asymmetryPct(0, 30) === null);
}
{
  const pp = sayersPeakPowerSJ(40, 75);
  check('Sayers SJ: 40 cm, 75 kg = 3770,5 W', near(pp, 3770.5, 1e-9));
}
console.log(fails === 0 ? '\nTODOS LOS CASOS OK' : `\n${fails} FALLO(S)`);
it('ported jumpCore assertions', () => {
  if (fails > 0) throw new Error(`${fails} test(s) failed`);
});
