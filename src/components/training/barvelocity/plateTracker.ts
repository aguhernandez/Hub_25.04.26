/**
 * plateTracker.ts — seguimiento del disco por correlación cruzada normalizada (NCC).
 *
 * Flujo (igual que las apps de VBT por video):
 *  1) El usuario marca el disco en el primer frame (centro + radio) → plantilla y escala.
 *     Escala: radio_px / 225 mm (disco olímpico de 450 mm). NO usar el grosor de la barra (28 mm).
 *  2) En cada frame se busca la plantilla en una ventana pequeña alrededor de la posición
 *     predicha (velocidad constante). Se trabaja en resolución reducida y se afina con una
 *     parábola (subpíxel).
 *  3) Si el puntaje NCC cae por debajo del umbral se amplía la búsqueda; si aún falla, el frame
 *     se marca como perdido (ok=false) — nunca se inventa una posición.
 *
 * Sin DOM: recibe frames en escala de grises (Uint8ClampedArray / Float32Array).
 */

export interface GrayFrame {
  data: ArrayLike<number>;
  width: number;
  height: number;
}

export interface PlateInit {
  cx: number;
  cy: number;
  radiusPx: number;
}

export interface TrackResult {
  cx: number;
  cy: number;
  score: number;
  ok: boolean;
}

export interface TrackerOptions {
  minScore?: number; // def. 0.6
  searchFrac?: number; // radio de búsqueda como fracción del radio del disco (def. 0.35)
  targetTemplatePx?: number; // lado deseado de la plantilla reducida (def. 40)
}

export const PLATE_DIAMETER_MM = 450;

export function pxPerMmFromPlate(radiusPx: number, diameterMm = PLATE_DIAMETER_MM): number {
  return (2 * radiusPx) / diameterMm;
}

/**
 * Estimación inicial del círculo del disco para evitar que el usuario tenga que empezar de cero.
 * Es deliberadamente conservadora: siempre se puede corregir el centro y el radio antes de confirmar.
 */
export function detectPlateCircle(frame: GrayFrame): PlateInit | null {
  const minRadius = Math.max(12, Math.round(Math.min(frame.width, frame.height) * 0.04));
  const maxRadius = Math.round(Math.min(frame.width, frame.height) * 0.28);
  let best: PlateInit | null = null;
  let bestScore = 0;
  const sample = (x: number, y: number) => {
    const xx = Math.max(0, Math.min(frame.width - 1, Math.round(x)));
    const yy = Math.max(0, Math.min(frame.height - 1, Math.round(y)));
    return Number(frame.data[yy * frame.width + xx] ?? 0);
  };
  for (let cy = maxRadius; cy < frame.height - maxRadius; cy += Math.max(8, Math.round(maxRadius / 5))) {
    for (let cx = maxRadius; cx < frame.width - maxRadius; cx += Math.max(8, Math.round(maxRadius / 5))) {
      for (let radius = minRadius; radius <= maxRadius; radius += Math.max(4, Math.round(radius / 8))) {
        let inner = 0; let ring = 0; let outer = 0;
        for (let i = 0; i < 16; i++) {
          const angle = (i / 16) * Math.PI * 2;
          inner += sample(cx + Math.cos(angle) * radius * 0.55, cy + Math.sin(angle) * radius * 0.55);
          ring += sample(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
          outer += sample(cx + Math.cos(angle) * radius * 1.25, cy + Math.sin(angle) * radius * 1.25);
        }
        const score = Math.abs(inner - ring) + Math.abs(ring - outer) * 0.75;
        if (score > bestScore) { bestScore = score; best = { cx, cy, radiusPx: radius }; }
      }
    }
  }
  return bestScore > 18 ? best : null;
}

/** Promedio por cajas de la región (x0,y0,w,h) reduciéndola por ds. Bordes: se repite el píxel del borde. */
function boxDownscale(f: GrayFrame, x0: number, y0: number, w: number, h: number, ds: number): Float32Array {
  const dw = Math.floor(w / ds);
  const dh = Math.floor(h / ds);
  const out = new Float32Array(dw * dh);
  const inv = 1 / (ds * ds);
  for (let j = 0; j < dh; j++) {
    for (let i = 0; i < dw; i++) {
      let acc = 0;
      for (let b = 0; b < ds; b++) {
        let yy = y0 + j * ds + b;
        yy = yy < 0 ? 0 : yy >= f.height ? f.height - 1 : yy;
        const row = yy * f.width;
        for (let a = 0; a < ds; a++) {
          let xx = x0 + i * ds + a;
          xx = xx < 0 ? 0 : xx >= f.width ? f.width - 1 : xx;
          acc += f.data[row + xx] as number;
        }
      }
      out[j * dw + i] = acc * inv;
    }
  }
  return out;
}

export class PlateTracker {
  private tz: Float32Array; // plantilla con media cero
  private tNorm: number;
  private tw: number;
  private th: number;
  private ds: number;
  private radius: number;
  private minScore: number;
  private searchFrac: number;
  private cx: number; // última posición (centro de la plantilla)
  private cy: number;
  private vx = 0;
  private vy = 0;
  private lostFrames = 0;

  constructor(first: GrayFrame, init: PlateInit, opt: TrackerOptions = {}) {
    this.radius = init.radiusPx;
    this.minScore = opt.minScore ?? 0.6;
    this.searchFrac = opt.searchFrac ?? 0.35;
    const side = Math.round(2 * init.radiusPx * 1.15);
    const target = opt.targetTemplatePx ?? 40;
    this.ds = Math.max(1, Math.floor(side / target));
    this.tw = Math.floor(side / this.ds);
    this.th = this.tw;
    const x0 = Math.round(init.cx - (this.tw * this.ds) / 2);
    const y0 = Math.round(init.cy - (this.th * this.ds) / 2);
    const t = boxDownscale(first, x0, y0, this.tw * this.ds, this.th * this.ds, this.ds);
    let mean = 0;
    for (let i = 0; i < t.length; i++) mean += t[i];
    mean /= t.length;
    let ss = 0;
    for (let i = 0; i < t.length; i++) { t[i] -= mean; ss += t[i] * t[i]; }
    this.tz = t;
    this.tNorm = Math.sqrt(ss);
    this.cx = x0 + (this.tw * this.ds) / 2;
    this.cy = y0 + (this.th * this.ds) / 2;
  }

  private search(f: GrayFrame, pcx: number, pcy: number, S: number) {
    const { tw, th, ds, tz, tNorm } = this;
    const ox = Math.round(pcx - (tw * ds) / 2) - S * ds;
    const oy = Math.round(pcy - (th * ds) / 2) - S * ds;
    const rw = (tw + 2 * S) * ds;
    const rh = (th + 2 * S) * ds;
    const roi = boxDownscale(f, ox, oy, rw, rh, ds);
    const W = tw + 2 * S;
    const N = tw * th;
    const n = 2 * S + 1;
    const scores = new Float32Array(n * n);
    let best = -2, bi = 0, bj = 0;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        let dot = 0, sum = 0, sq = 0;
        for (let y = 0; y < th; y++) {
          const rr = (j + y) * W + i;
          const tr = y * tw;
          for (let x = 0; x < tw; x++) {
            const val = roi[rr + x];
            dot += tz[tr + x] * val;
            sum += val;
            sq += val * val;
          }
        }
        const varr = sq - (sum * sum) / N;
        const sc = varr > 1e-6 && tNorm > 0 ? dot / (tNorm * Math.sqrt(varr)) : 0;
        scores[j * n + i] = sc;
        if (sc > best) { best = sc; bi = i; bj = j; }
      }
    }
    // Refinamiento subpíxel (parábola en x e y)
    const para = (m: number, c: number, p: number) => {
      const d = m - 2 * c + p;
      return Math.abs(d) < 1e-9 ? 0 : Math.max(-0.5, Math.min(0.5, (0.5 * (m - p)) / d));
    };
    let sx = 0, sy = 0;
    if (bi > 0 && bi < n - 1) sx = para(scores[bj * n + bi - 1], best, scores[bj * n + bi + 1]);
    if (bj > 0 && bj < n - 1) sy = para(scores[(bj - 1) * n + bi], best, scores[(bj + 1) * n + bi]);
    const cx = ox + (bi + sx) * ds + (tw * ds) / 2;
    const cy = oy + (bj + sy) * ds + (th * ds) / 2;
    return { cx, cy, score: best };
  }

  update(f: GrayFrame): TrackResult {
    const pcx = this.cx + this.vx;
    const pcy = this.cy + this.vy;
    const S1 = Math.max(3, Math.ceil((this.searchFrac * this.radius) / this.ds));
    let r = this.search(f, pcx, pcy, S1);
    if (r.score < this.minScore) {
      r = this.search(f, pcx, pcy, S1 * 2);
    }
    if (r.score < this.minScore) {
      this.lostFrames++;
      // Mantener predicción inercial amortiguada para poder reenganchar, pero reportar perdido
      this.cx = pcx;
      this.cy = pcy;
      this.vx *= 0.8;
      this.vy *= 0.8;
      return { cx: pcx, cy: pcy, score: r.score, ok: false };
    }
    this.vx = r.cx - this.cx;
    this.vy = r.cy - this.cy;
    this.cx = r.cx;
    this.cy = r.cy;
    this.lostFrames = 0;
    return { cx: r.cx, cy: r.cy, score: r.score, ok: true };
  }
}
