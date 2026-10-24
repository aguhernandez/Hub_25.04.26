/**
 * jumpCore.ts — control de salto (estilo My Jump Lab): lógica pura, sin React ni DOM.
 *
 * Entradas: marcas de tiempo (ms) elegidas sobre el video (cuadro de despegue, de aterrizaje, etc.)
 * Salidas : altura por tiempo de vuelo, velocidad de despegue, tiempo de contacto, RSI, RSImod,
 *           potencia/fuerza/velocidad medias (Samozino), perfil F-v, asimetría, resumen de sesión.
 *
 * Convención: todos los tiempos en ms, alturas en cm salvo que el nombre diga lo contrario.
 */

export const G = 9.81;

export type JumpType = 'cmj' | 'cmj_free_arms' | 'sj' | 'dj' | 'rj' | 'cmj_unilateral';

export const FLIGHT_MIN_MS = 150; // ≈ 2,8 cm
export const FLIGHT_MAX_MS = 1000; // ≈ 122 cm
export const CONTACT_MIN_MS = 60;
export const CONTACT_MAX_MS = 1000;
export const TIME_TO_TAKEOFF_MIN_MS = 200;
export const TIME_TO_TAKEOFF_MAX_MS = 2500;

/* ---------------- conversiones básicas ---------------- */

/** Altura por tiempo de vuelo: h = g·t²/8 (cm). Supone la misma posición del centro de masas al despegar y aterrizar. */
export function flightMsToHeightCm(flightMs: number): number {
  const t = flightMs / 1000;
  return ((G * t * t) / 8) * 100;
}

export function heightCmToFlightMs(heightCm: number): number {
  return 2 * Math.sqrt((2 * (heightCm / 100)) / G) * 1000;
}

/** Velocidad de despegue (m/s) = g·t/2. */
export function takeoffVelocityMs(flightMs: number): number {
  return (G * (flightMs / 1000)) / 2;
}

/* ---------------- incertidumbre por resolución de cuadro ---------------- */

export interface FrameUncertainty {
  oneFrameStepCm: number; // cuánto cambia la altura al sumar 1 cuadro al tiempo de vuelo
  typicalCm: number; // 1σ si cada evento tiene error uniforme de ±½ cuadro
}

export function frameUncertainty(flightMs: number, fps: number): FrameUncertainty {
  const dtMs = 1000 / fps;
  const step = flightMsToHeightCm(flightMs + dtMs) - flightMsToHeightCm(flightMs);
  const dhdt = (G * (flightMs / 1000)) / 4; // m/s
  const sigmaEvent = dtMs / 1000 / Math.sqrt(12);
  const sigmaT = Math.SQRT2 * sigmaEvent;
  return { oneFrameStepCm: step, typicalCm: dhdt * sigmaT * 100 };
}

/**
 * Factor de tiempo para corregir timestamps estirados (típico: slow-mo de iOS exportado, cuyos
 * timestamps no son en tiempo real). medianDtMs = mediana de Δ(mediaTime) entre frames.
 * Si el fps medido coincide (±10 %) con el fps de captura declarado, el factor es 1.
 */
export function timeScaleFromFps(medianDtMs: number, captureFps: number): number {
  const measuredFps = 1000 / medianDtMs;
  if (Math.abs(measuredFps - captureFps) / captureFps <= 0.1) return 1;
  return 1000 / captureFps / medianDtMs;
}

/* ---------------- un intento ---------------- */

export interface JumpMarks {
  onsetMs?: number; // inicio del movimiento (opcional; permite RSImod en CMJ)
  contactMs?: number; // DJ: primer contacto tras bajar del cajón
  takeoffMs: number; // primer cuadro sin contacto
  landingMs: number; // primer cuadro con contacto al aterrizar
}

export interface JumpContext {
  massKg: number;
  loadKg?: number; // carga externa (CMJ/SJ cargado)
  boxCm?: number; // altura del cajón (DJ)
  hpoM?: number; // recorrido de impulso (m) para Samozino
  fps: number; // fps efectivo (después de timeScale)
}

export interface AttemptResult {
  ok: boolean;
  reasons: string[]; // por qué no es válido
  flags: string[]; // avisos que no invalidan
  flightMs: number;
  heightCm: number;
  takeoffVelMs: number;
  contactMs: number | null;
  rsi: number | null; // m/s = altura(m) / contacto(s)
  timeToTakeoffMs: number | null;
  rsiMod: number | null; // m/s = altura(m) / tiempo hasta despegue(s)
  samozino: SamozinoPoint | null;
  uncertainty: FrameUncertainty;
}

export function computeAttempt(type: JumpType, m: JumpMarks, ctx: JumpContext): AttemptResult {
  const reasons: string[] = [];
  const flags: string[] = [];
  const nums = [m.takeoffMs, m.landingMs, m.onsetMs, m.contactMs].filter((x) => x !== undefined) as number[];
  if (nums.some((x) => !Number.isFinite(x))) reasons.push('marcas no finitas');
  if (!(ctx.massKg > 0) || !Number.isFinite(ctx.massKg)) reasons.push('masa corporal inválida');
  if (!(ctx.fps > 0)) reasons.push('fps inválido');

  const flightMs = m.landingMs - m.takeoffMs;
  if (!(flightMs > 0)) reasons.push('el aterrizaje debe ser posterior al despegue');
  else if (flightMs < FLIGHT_MIN_MS) reasons.push(`tiempo de vuelo < ${FLIGHT_MIN_MS} ms`);
  else if (flightMs > FLIGHT_MAX_MS) reasons.push(`tiempo de vuelo > ${FLIGHT_MAX_MS} ms`);

  let contactMs: number | null = null;
  if (type === 'dj') {
    if (m.contactMs === undefined) reasons.push('DJ requiere la marca de primer contacto');
    else {
      contactMs = m.takeoffMs - m.contactMs;
      if (!(contactMs > 0)) reasons.push('el primer contacto debe ser anterior al despegue');
      else if (contactMs < CONTACT_MIN_MS || contactMs > CONTACT_MAX_MS) reasons.push(`tiempo de contacto fuera de ${CONTACT_MIN_MS}–${CONTACT_MAX_MS} ms`);
    }
  }

  let timeToTakeoffMs: number | null = null;
  if (m.onsetMs !== undefined && type !== 'dj' && type !== 'rj') {
    timeToTakeoffMs = m.takeoffMs - m.onsetMs;
    if (!(timeToTakeoffMs > 0)) reasons.push('el inicio del movimiento debe ser anterior al despegue');
    else if (timeToTakeoffMs < TIME_TO_TAKEOFF_MIN_MS || timeToTakeoffMs > TIME_TO_TAKEOFF_MAX_MS) flags.push('time_to_takeoff_atipico');
  }

  const valid = reasons.length === 0;
  const heightCm = valid ? flightMsToHeightCm(flightMs) : NaN;
  const heightM = heightCm / 100;
  if (ctx.fps < 60) flags.push('low_fps');
  else if (ctx.fps < 120) flags.push('fps_moderado');

  const rsi = valid && contactMs ? heightM / (contactMs / 1000) : null;
  const rsiMod = valid && timeToTakeoffMs && timeToTakeoffMs > 0 ? heightM / (timeToTakeoffMs / 1000) : null;

  let samozino: SamozinoPoint | null = null;
  if (valid && ctx.hpoM !== undefined && (type === 'cmj' || type === 'cmj_free_arms' || type === 'sj' || type === 'cmj_unilateral')) {
    if (ctx.hpoM < 0.1 || ctx.hpoM > 0.8) flags.push('hpo_atipico');
    samozino = samozinoPoint({ massKg: ctx.massKg, loadKg: ctx.loadKg ?? 0, heightM, hpoM: ctx.hpoM });
  }

  return {
    ok: valid,
    reasons,
    flags,
    flightMs,
    heightCm,
    takeoffVelMs: valid ? takeoffVelocityMs(flightMs) : NaN,
    contactMs,
    rsi,
    timeToTakeoffMs,
    rsiMod,
    samozino,
    uncertainty: frameUncertainty(Math.max(flightMs, 1), ctx.fps > 0 ? ctx.fps : 1),
  };
}

/* ---------------- saltos repetidos (RJ) ---------------- */

export interface RjEvent { kind: 'touch' | 'takeoff'; tMs: number }

export interface RjJump {
  index: number;
  contactMs: number; // touch -> takeoff
  flightMs: number; // takeoff -> siguiente touch
  heightCm: number;
  rsi: number;
}

export interface RjResult {
  ok: boolean;
  reasons: string[];
  jumps: RjJump[];
  summary: {
    n: number;
    meanHeightCm: number;
    bestHeightCm: number;
    meanContactMs: number;
    meanRsi: number;
    bestRsi: number;
    heightDropPct: number; // (mejor − último)/mejor
  } | null;
}

export function computeRepeated(events: RjEvent[]): RjResult {
  const reasons: string[] = [];
  if (events.length < 3) return { ok: false, reasons: ['se necesitan al menos contacto, despegue y siguiente contacto'], jumps: [], summary: null };
  for (let i = 0; i < events.length; i++) {
    if (!Number.isFinite(events[i].tMs)) reasons.push(`marca ${i + 1} no finita`);
    if (i > 0) {
      if (events[i].kind === events[i - 1].kind) reasons.push(`marcas ${i} y ${i + 1} no alternan contacto/despegue`);
      if (!(events[i].tMs > events[i - 1].tMs)) reasons.push(`marca ${i + 1} no es posterior a la anterior`);
    }
  }
  if (reasons.length) return { ok: false, reasons, jumps: [], summary: null };

  const jumps: RjJump[] = [];
  // Buscar tríos touch → takeoff → touch
  for (let i = 0; i + 2 < events.length; i++) {
    if (events[i].kind === 'touch' && events[i + 1].kind === 'takeoff' && events[i + 2].kind === 'touch') {
      const contactMs = events[i + 1].tMs - events[i].tMs;
      const flightMs = events[i + 2].tMs - events[i + 1].tMs;
      if (contactMs < CONTACT_MIN_MS || contactMs > CONTACT_MAX_MS) { reasons.push(`salto ${jumps.length + 1}: contacto fuera de rango`); continue; }
      if (flightMs < FLIGHT_MIN_MS || flightMs > FLIGHT_MAX_MS) { reasons.push(`salto ${jumps.length + 1}: vuelo fuera de rango`); continue; }
      const heightCm = flightMsToHeightCm(flightMs);
      jumps.push({ index: jumps.length + 1, contactMs, flightMs, heightCm, rsi: heightCm / 100 / (contactMs / 1000) });
    }
  }
  if (jumps.length === 0) return { ok: false, reasons: reasons.length ? reasons : ['no se formó ningún salto válido'], jumps, summary: null };
  const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
  const best = Math.max(...jumps.map((j) => j.heightCm));
  const last = jumps[jumps.length - 1].heightCm;
  return {
    ok: true,
    reasons,
    jumps,
    summary: {
      n: jumps.length,
      meanHeightCm: mean(jumps.map((j) => j.heightCm)),
      bestHeightCm: best,
      meanContactMs: mean(jumps.map((j) => j.contactMs)),
      meanRsi: mean(jumps.map((j) => j.rsi)),
      bestRsi: Math.max(...jumps.map((j) => j.rsi)),
      heightDropPct: Math.max(0, ((best - last) / best) * 100),
    },
  };
}

/* ---------------- resumen de sesión y asimetría ---------------- */

export function summarizeSession(heightsCm: number[]) {
  const v = heightsCm.filter((x) => Number.isFinite(x) && x > 0);
  const n = v.length;
  if (n === 0) return { n: 0, bestCm: 0, meanCm: 0, lastCm: 0, dropFromBestPct: 0, cvPct: null as number | null };
  const mean = v.reduce((s, x) => s + x, 0) / n;
  const best = Math.max(...v);
  const last = v[n - 1];
  let cv: number | null = null;
  if (n >= 3) {
    const sd = Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1));
    cv = (sd / mean) * 100;
  }
  return { n, bestCm: best, meanCm: mean, lastCm: last, dropFromBestPct: Math.max(0, ((best - last) / best) * 100), cvPct: cv };
}

export function asymmetryPct(leftCm: number, rightCm: number): { pct: number; stronger: 'left' | 'right' | 'equal' } | null {
  if (!(leftCm > 0) || !(rightCm > 0) || !Number.isFinite(leftCm) || !Number.isFinite(rightCm)) return null;
  const max = Math.max(leftCm, rightCm);
  const pct = ((max - Math.min(leftCm, rightCm)) / max) * 100;
  return { pct, stronger: leftCm === rightCm ? 'equal' : leftCm > rightCm ? 'left' : 'right' };
}

/* ---------------- Samozino: fuerza, velocidad y potencia medias del impulso ---------------- */

export interface SamozinoPoint { forceN: number; velMs: number; powerW: number; forceRelNkg: number }

/**
 * Samozino et al. (2008): F = m·g·(h/hPO + 1); v = √(g·h/2); P = F·v.
 * m = masa total movida (cuerpo + carga), h = altura (m) por tiempo de vuelo, hPO = recorrido de impulso (m).
 */
export function samozinoPoint(p: { massKg: number; loadKg?: number; heightM: number; hpoM: number }): SamozinoPoint {
  const m = p.massKg + (p.loadKg ?? 0);
  const F = m * G * (p.heightM / p.hpoM + 1);
  const v = Math.sqrt((G * p.heightM) / 2);
  return { forceN: F, velMs: v, powerW: F * v, forceRelNkg: F / m };
}

export interface FvFit { f0N: number; v0Ms: number; pmaxW: number; slope: number; r2: number; n: number; vMaxData: number }

/** Perfil F-v lineal con cargas distintas: F = F0 + pendiente·v;  v0 = −F0/pendiente;  Pmax = F0·v0/4. */
export function fitFVProfile(points: { forceN: number; velMs: number }[]): { fit: FvFit | null; warnings: string[]; reason?: string } {
  const warnings: string[] = [];
  const p = points.filter((q) => Number.isFinite(q.forceN) && Number.isFinite(q.velMs) && q.forceN > 0 && q.velMs > 0);
  if (p.length < 3) return { fit: null, warnings, reason: 'se necesitan ≥ 3 cargas con datos válidos' };
  const vs = p.map((q) => q.velMs);
  if (Math.max(...vs) - Math.min(...vs) < 0.2) return { fit: null, warnings, reason: 'rango de velocidades demasiado estrecho (< 0,2 m/s)' };
  const n = p.length;
  const mx = vs.reduce((s, x) => s + x, 0) / n;
  const my = p.reduce((s, q) => s + q.forceN, 0) / n;
  let sxx = 0, sxy = 0, syy = 0;
  for (const q of p) { sxx += (q.velMs - mx) ** 2; sxy += (q.velMs - mx) * (q.forceN - my); syy += (q.forceN - my) ** 2; }
  const slope = sxy / sxx;
  const f0 = my - slope * mx;
  const r2 = syy > 0 ? (sxy * sxy) / (sxx * syy) : 0;
  if (!(slope < 0) || !(f0 > 0)) return { fit: null, warnings, reason: 'la relación F-v no es decreciente: datos no válidos para el perfil' };
  const v0 = -f0 / slope;
  if (n < 4) warnings.push('con < 4 cargas el perfil es poco robusto');
  if (r2 < 0.9) warnings.push(`R² bajo (${r2.toFixed(2)})`);
  const vMax = Math.max(...vs);
  if (vMax / v0 < 0.5) warnings.push('v0 es una extrapolación grande: añade cargas más ligeras');
  return { fit: { f0N: f0, v0Ms: v0, pmaxW: (f0 * v0) / 4, slope, r2, n, vMaxData: vMax }, warnings };
}

/* ---------------- potencia pico por regresión (solo SJ verificada) ---------------- */

/** Sayers et al. (1999), ecuación derivada de SJ: PP(W) = 60,7·h(cm) + 45,3·masa(kg) − 2055. Estimación poblacional. */
export function sayersPeakPowerSJ(heightCm: number, massKg: number): number {
  return 60.7 * heightCm + 45.3 * massKg - 2055;
}
