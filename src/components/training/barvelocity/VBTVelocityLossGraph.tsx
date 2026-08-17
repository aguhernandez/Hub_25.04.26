import { useRef, useEffect, useState, useCallback } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { BarRep, getVBTZone } from './BarVelocityTypes';

interface VBTVelocityLossGraphProps {
  reps: BarRep[];
  lowThreshold?: number;
  moderateThreshold?: number;
  highThreshold?: number;
  onRepHover?: (rep: BarRep | null) => void;
}

const FATIGUE_THRESHOLDS = {
  low: 10,
  moderate: 20,
  high: 30,
};

function repFatigueColor(lossPct: number): string {
  if (lossPct >= FATIGUE_THRESHOLDS.high) return '#ef4444';
  if (lossPct >= FATIGUE_THRESHOLDS.moderate) return '#f59e0b';
  if (lossPct >= FATIGUE_THRESHOLDS.low) return '#facc15';
  return '#22c55e';
}

function repFatigueLabel(lossPct: number, lang: string): string {
  if (lossPct >= FATIGUE_THRESHOLDS.high)
    return lang === 'es' ? 'Fatiga alta' : 'High fatigue';
  if (lossPct >= FATIGUE_THRESHOLDS.moderate)
    return lang === 'es' ? 'Fatiga moderada' : 'Moderate fatigue';
  if (lossPct >= FATIGUE_THRESHOLDS.low)
    return lang === 'es' ? 'Fatiga baja' : 'Low fatigue';
  return lang === 'es' ? 'Fresco' : 'Fresh';
}

export { repFatigueColor, repFatigueLabel, FATIGUE_THRESHOLDS };

export default function VBTVelocityLossGraph({
  reps,
  onRepHover,
}: VBTVelocityLossGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isDark } = useTheme();
  const { language } = useLanguage();
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    rep: BarRep;
    lossPct: number;
  } | null>(null);

  const validReps = reps.filter((r) => r.isValid && r.meanConcentricVelocityMs > 0);
  const bestVelocity =
    validReps.length > 0
      ? Math.max(...validReps.map((r) => r.meanConcentricVelocityMs))
      : 0;

  const getPoints = useCallback(
    (width: number, height: number, padL: number, padR: number, padT: number, padB: number) => {
      if (validReps.length === 0) return [];
      const chartW = width - padL - padR;
      const chartH = height - padT - padB;
      const maxV = bestVelocity * 1.25;
      const minV = 0;

      return validReps.map((rep, idx) => {
        const x = padL + (validReps.length === 1 ? chartW / 2 : (idx / (validReps.length - 1)) * chartW);
        const y = padT + chartH - ((rep.meanConcentricVelocityMs - minV) / (maxV - minV)) * chartH;
        const lossPct = bestVelocity > 0
          ? ((bestVelocity - rep.meanConcentricVelocityMs) / bestVelocity) * 100
          : 0;
        return { x, y, rep, lossPct };
      });
    },
    [validReps, bestVelocity]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || validReps.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const PAD_L = 48;
    const PAD_R = 16;
    const PAD_T = 16;
    const PAD_B = 32;
    const chartW = W - PAD_L - PAD_R;
    const chartH = H - PAD_T - PAD_B;
    const maxV = bestVelocity * 1.25;

    ctx.clearRect(0, 0, W, H);

    // ── Background
    ctx.fillStyle = isDark ? '#111827' : '#f9fafb';
    ctx.fillRect(0, 0, W, H);

    // ── Grid lines + Y-axis labels
    const yTicks = 4;
    ctx.textAlign = 'right';
    ctx.font = `10px system-ui`;
    for (let i = 0; i <= yTicks; i++) {
      const v = (maxV * i) / yTicks;
      const y = PAD_T + chartH - (i / yTicks) * chartH;
      ctx.strokeStyle = isDark ? '#374151' : '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(PAD_L, y);
      ctx.lineTo(PAD_L + chartW, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = isDark ? '#6b7280' : '#9ca3af';
      ctx.fillText(v.toFixed(2), PAD_L - 4, y + 3.5);
    }

    // ── Fatigue threshold bands
    const thresholds = [
      { pct: FATIGUE_THRESHOLDS.high, color: '#ef444420', label: `${FATIGUE_THRESHOLDS.high}%` },
      { pct: FATIGUE_THRESHOLDS.moderate, color: '#f59e0b18', label: `${FATIGUE_THRESHOLDS.moderate}%` },
      { pct: FATIGUE_THRESHOLDS.low, color: '#facc1510', label: `${FATIGUE_THRESHOLDS.low}%` },
    ];

    for (const t of thresholds) {
      const v = bestVelocity * (1 - t.pct / 100);
      const y = PAD_T + chartH - ((v / maxV) * chartH);
      ctx.fillStyle = t.color;
      ctx.fillRect(PAD_L, y, chartW, PAD_T + chartH - y);
      ctx.font = '9px system-ui';
      ctx.fillStyle = isDark ? '#9ca3af80' : '#6b728060';
      ctx.textAlign = 'left';
      ctx.fillText(`-${t.label}`, PAD_L + 4, y - 2);
    }

    // ── Best velocity horizontal line
    if (bestVelocity > 0) {
      const bestY = PAD_T + chartH - (bestVelocity / maxV) * chartH;
      ctx.strokeStyle = '#fdda3680';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(PAD_L, bestY);
      ctx.lineTo(PAD_L + chartW, bestY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = 'bold 9px system-ui';
      ctx.fillStyle = '#fdda36cc';
      ctx.textAlign = 'right';
      ctx.fillText(language === 'es' ? 'MEJOR' : 'BEST', PAD_L + chartW, bestY - 3);
    }

    // ── X-axis labels
    ctx.textAlign = 'center';
    ctx.font = '10px system-ui';
    ctx.fillStyle = isDark ? '#6b7280' : '#9ca3af';
    const points = getPoints(W, H, PAD_L, PAD_R, PAD_T, PAD_B);
    points.forEach((p) => {
      ctx.fillText(`R${p.rep.repNumber}`, p.x, H - PAD_B + 16);
    });

    // ── Smooth line
    if (points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const cp1x = (points[i - 1].x + points[i].x) / 2;
        ctx.bezierCurveTo(cp1x, points[i - 1].y, cp1x, points[i].y, points[i].x, points[i].y);
      }
      ctx.strokeStyle = isDark ? '#94a3b860' : '#94a3b840';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Fill under line
      ctx.lineTo(points[points.length - 1].x, PAD_T + chartH);
      ctx.lineTo(points[0].x, PAD_T + chartH);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, PAD_T, 0, PAD_T + chartH);
      grad.addColorStop(0, '#94a3b818');
      grad.addColorStop(1, '#94a3b800');
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // ── Data points
    for (const p of points) {
      const color = repFatigueColor(p.lossPct);
      const isBest = p.rep.meanConcentricVelocityMs === bestVelocity;

      // Outer ring for best rep
      if (isBest) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
        ctx.strokeStyle = `${color}60`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, isBest ? 7 : 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Velocity label above dot
      ctx.font = `${isBest ? 'bold ' : ''}10px system-ui`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.fillText(p.rep.meanConcentricVelocityMs.toFixed(2), p.x, p.y - 12);

      // Loss label below (skip for first rep)
      if (p.lossPct > 0) {
        ctx.font = '9px system-ui';
        ctx.fillStyle = `${color}90`;
        ctx.fillText(`-${p.lossPct.toFixed(0)}%`, p.x, p.y + 20);
      }
    }

    // ── Tooltip hover highlight
    if (tooltip) {
      const p = points.find((pt) => pt.rep.repNumber === tooltip.rep.repNumber);
      if (p) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff80';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }, [validReps, bestVelocity, isDark, getPoints, tooltip, language]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const ro = new ResizeObserver(() => draw());
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, [draw]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || validReps.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      const points = getPoints(W, H, 48, 16, 16, 32);

      let closest: (typeof points)[0] | null = null;
      let minDist = 24;
      for (const p of points) {
        const d = Math.hypot(p.x - mx, p.y - my);
        if (d < minDist) { minDist = d; closest = p; }
      }

      if (closest) {
        setTooltip({ x: closest.x, y: closest.y, rep: closest.rep, lossPct: closest.lossPct });
        onRepHover?.(closest.rep);
      } else {
        setTooltip(null);
        onRepHover?.(null);
      }
    },
    [validReps, getPoints, onRepHover]
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
    onRepHover?.(null);
  }, [onRepHover]);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || validReps.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      const t = e.touches[0];
      const mx = t.clientX - rect.left;
      const my = t.clientY - rect.top;
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      const points = getPoints(W, H, 48, 16, 16, 32);

      let closest: (typeof points)[0] | null = null;
      let minDist = 30;
      for (const p of points) {
        const d = Math.hypot(p.x - mx, p.y - my);
        if (d < minDist) { minDist = d; closest = p; }
      }
      if (closest) {
        setTooltip({ x: closest.x, y: closest.y, rep: closest.rep, lossPct: closest.lossPct });
        onRepHover?.(closest.rep);
      }
    },
    [validReps, getPoints, onRepHover]
  );

  if (validReps.length === 0) return null;

  return (
    <div className="relative w-full select-none">
      <canvas
        ref={canvasRef}
        className="w-full rounded-xl"
        style={{ height: 200, touchAction: 'none' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseLeave}
      />

      {tooltip && (
        <div
          className="absolute z-10 pointer-events-none"
          style={{
            left: Math.min(tooltip.x + 10, (canvasRef.current?.offsetWidth ?? 300) - 130),
            top: Math.max(tooltip.y - 80, 4),
          }}
        >
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-2.5 shadow-xl text-xs space-y-1 min-w-[110px]">
            <div className="font-bold text-white">Rep #{tooltip.rep.repNumber}</div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-400">{language === 'es' ? 'Media' : 'Mean'}</span>
              <span className="font-semibold text-white">{tooltip.rep.meanConcentricVelocityMs.toFixed(3)} m/s</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-400">{language === 'es' ? 'Pico' : 'Peak'}</span>
              <span className="font-semibold text-white">{tooltip.rep.peakVelocityMs.toFixed(3)} m/s</span>
            </div>
            {tooltip.lossPct > 0 && (
              <div className="flex justify-between gap-3">
                <span className="text-gray-400">{language === 'es' ? 'Perdida' : 'Loss'}</span>
                <span className="font-semibold" style={{ color: repFatigueColor(tooltip.lossPct) }}>
                  -{tooltip.lossPct.toFixed(1)}%
                </span>
              </div>
            )}
            <div
              className="text-center py-0.5 rounded-md font-medium mt-1"
              style={{
                backgroundColor: `${repFatigueColor(tooltip.lossPct)}20`,
                color: repFatigueColor(tooltip.lossPct),
              }}
            >
              {repFatigueLabel(tooltip.lossPct, language)}
            </div>
            {tooltip.rep.estimatedPowerW && (
              <div className="flex justify-between gap-3">
                <span className="text-gray-400">{language === 'es' ? 'Potencia' : 'Power'}</span>
                <span className="text-orange-400 font-semibold">{tooltip.rep.estimatedPowerW.toFixed(0)} W</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
