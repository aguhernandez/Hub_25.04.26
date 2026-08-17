import { useRef, useEffect, useCallback } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import {
  LVDataPoint,
  LVRegressionResult,
  LV1RMEstimate,
  predictVelocity,
  pct1RMColor,
  MIN_POINTS,
} from './LVProfile';

interface LoadVelocityProfileChartProps {
  points: LVDataPoint[];
  regression: LVRegressionResult | null;
  estimate: LV1RMEstimate | null;
  currentPoint?: LVDataPoint | null;
  height?: number;
}

export default function LoadVelocityProfileChart({
  points,
  regression,
  estimate,
  currentPoint,
  height = 220,
}: LoadVelocityProfileChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isDark } = useTheme();
  const { language } = useLanguage();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth;
    const H = height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const PAD_L = 48;
    const PAD_R = 24;
    const PAD_T = 20;
    const PAD_B = 36;
    const chartW = W - PAD_L - PAD_R;
    const chartH = H - PAD_T - PAD_B;

    // ── Background
    ctx.fillStyle = isDark ? '#0f172a' : '#f9fafb';
    ctx.fillRect(0, 0, W, H);

    if (points.length === 0) {
      ctx.font = '12px system-ui';
      ctx.fillStyle = isDark ? '#6b7280' : '#9ca3af';
      ctx.textAlign = 'center';
      const msg = language === 'es'
        ? `Necesitas ${MIN_POINTS} series con carga para construir el perfil`
        : `Need ${MIN_POINTS} sets with load to build profile`;
      ctx.fillText(msg, W / 2, H / 2);
      return;
    }

    // ── Axis ranges
    const allLoads = points.map((p) => p.loadKg);
    const allVels  = points.map((p) => p.meanVelocityMs);
    if (estimate) {
      allLoads.push(estimate.estimated1RMkg * 1.05);
      allVels.push(estimate.mvt * 0.8);
    }
    const loadMin = Math.max(0, Math.min(...allLoads) * 0.9);
    const loadMax = Math.max(...allLoads) * 1.1;
    const velMin  = Math.max(0, Math.min(...allVels) * 0.85);
    const velMax  = Math.max(...allVels) * 1.2;

    const toX = (load: number) => PAD_L + ((load - loadMin) / (loadMax - loadMin)) * chartW;
    const toY = (vel:  number) => PAD_T + chartH - ((vel - velMin) / (velMax - velMin)) * chartH;

    // ── Grid
    ctx.strokeStyle = isDark ? '#1e293b' : '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    const xTicks = 5;
    const yTicks = 4;
    ctx.font = '10px system-ui';

    for (let i = 0; i <= xTicks; i++) {
      const load = loadMin + (i / xTicks) * (loadMax - loadMin);
      const x = toX(load);
      ctx.beginPath(); ctx.moveTo(x, PAD_T); ctx.lineTo(x, PAD_T + chartH); ctx.stroke();
      ctx.fillStyle = isDark ? '#475569' : '#9ca3af';
      ctx.textAlign = 'center';
      ctx.fillText(`${load.toFixed(0)}`, x, PAD_T + chartH + 14);
    }
    for (let i = 0; i <= yTicks; i++) {
      const vel = velMin + (i / yTicks) * (velMax - velMin);
      const y = toY(vel);
      ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(PAD_L + chartW, y); ctx.stroke();
      ctx.fillStyle = isDark ? '#475569' : '#9ca3af';
      ctx.textAlign = 'right';
      ctx.fillText(vel.toFixed(2), PAD_L - 5, y + 3.5);
    }
    ctx.setLineDash([]);

    // ── Axis labels
    ctx.font = '10px system-ui';
    ctx.fillStyle = isDark ? '#64748b' : '#9ca3af';
    ctx.textAlign = 'center';
    ctx.fillText('kg', PAD_L + chartW / 2, H - 2);
    ctx.save();
    ctx.translate(10, PAD_T + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('m/s', 0, 0);
    ctx.restore();

    // ── MVT horizontal line
    if (estimate) {
      const mvtY = toY(estimate.mvt);
      ctx.strokeStyle = '#f9731640';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(PAD_L, mvtY);
      ctx.lineTo(PAD_L + chartW, mvtY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = 'bold 9px system-ui';
      ctx.fillStyle = '#f97316cc';
      ctx.textAlign = 'left';
      ctx.fillText(`MVT ${estimate.mvt.toFixed(2)} m/s`, PAD_L + 4, mvtY - 3);
    }

    // ── 1RM vertical line
    if (estimate && regression?.valid) {
      const rmX = toX(estimate.estimated1RMkg);
      if (rmX >= PAD_L && rmX <= PAD_L + chartW) {
        ctx.strokeStyle = '#ef444440';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(rmX, PAD_T);
        ctx.lineTo(rmX, PAD_T + chartH);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = 'bold 9px system-ui';
        ctx.fillStyle = '#ef4444cc';
        ctx.textAlign = 'center';
        ctx.fillText(`${estimate.estimated1RMkg.toFixed(1)} kg`, rmX, PAD_T + 10);
        ctx.font = '9px system-ui';
        ctx.fillStyle = '#ef4444aa';
        ctx.fillText(language === 'es' ? '1RM est.' : 'est. 1RM', rmX, PAD_T + 20);
      }
    }

    // ── Regression line
    if (regression?.valid) {
      const x0 = loadMin;
      const x1 = loadMax;
      const y0 = predictVelocity(regression, x0);
      const y1 = predictVelocity(regression, x1);

      const grd = ctx.createLinearGradient(toX(x0), 0, toX(x1), 0);
      grd.addColorStop(0, '#06b6d4aa');
      grd.addColorStop(1, '#ef4444aa');

      ctx.beginPath();
      ctx.moveTo(toX(x0), toY(y0));
      ctx.lineTo(toX(x1), toY(y1));
      ctx.strokeStyle = grd;
      ctx.lineWidth = 2;
      ctx.stroke();

      // R² label
      ctx.font = '9px system-ui';
      ctx.fillStyle = isDark ? '#64748b' : '#9ca3af';
      ctx.textAlign = 'right';
      ctx.fillText(`R² = ${regression.r2.toFixed(3)}`, PAD_L + chartW, PAD_T + 10);
    }

    // ── Data points
    for (const p of points) {
      const x = toX(p.loadKg);
      const y = toY(p.meanVelocityMs);
      const pct = estimate ? (p.loadKg / estimate.estimated1RMkg) * 100 : 70;
      const color = pct1RMColor(pct);

      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = `${color}cc`;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // load label
      ctx.font = '9px system-ui';
      ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
      ctx.textAlign = 'center';
      ctx.fillText(`${p.loadKg}`, x, y - 9);
    }

    // ── Current rep highlight
    if (currentPoint) {
      const x = toX(currentPoint.loadKg);
      const y = toY(currentPoint.meanVelocityMs);

      // Pulse ring
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.strokeStyle = '#fdda3660';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#fdda36';
      ctx.fill();

      ctx.font = 'bold 9px system-ui';
      ctx.fillStyle = '#fdda36';
      ctx.textAlign = 'center';
      ctx.fillText(
        language === 'es' ? 'ACTUAL' : 'NOW',
        x,
        y - 16,
      );
    }
  }, [points, regression, estimate, currentPoint, height, isDark, language]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const ro = new ResizeObserver(() => draw());
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-xl"
      style={{ height }}
    />
  );
}
