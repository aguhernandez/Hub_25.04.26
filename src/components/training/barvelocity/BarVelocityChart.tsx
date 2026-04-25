import { useRef, useEffect } from 'react';
import { VelocitySample } from './BarVelocityTypes';

interface BarVelocityChartProps {
  samples: VelocitySample[];
  height?: number;
}

export default function BarVelocityChart({
  samples,
  height = 120,
}: BarVelocityChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || samples.length === 0) return;

    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.offsetWidth;
    const h = height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    const padding = { top: 10, right: 10, bottom: 24, left: 44 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const velocities = samples.map((s) => s.velocityMs);
    const minV = Math.min(...velocities, -0.5);
    const maxV = Math.max(...velocities, 0.5);
    const vRange = maxV - minV;

    const toX = (i: number) => padding.left + (i / (samples.length - 1)) * chartW;
    const toY = (v: number) => padding.top + ((maxV - v) / vRange) * chartH;

    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, w, h);

    const zeroY = toY(0);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(padding.left, zeroY);
    ctx.lineTo(w - padding.right, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    const gridVs = [-1.0, -0.5, 0, 0.5, 1.0, 1.5, 2.0].filter(
      (v) => v > minV && v < maxV
    );
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = `${10 * dpr > 10 ? 10 : 10}px sans-serif`;
    ctx.textAlign = 'right';
    gridVs.forEach((v) => {
      const y = toY(v);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText(v.toFixed(1), padding.left - 4, y + 3);
    });

    const positivePoints = samples.filter((s) => s.velocityMs > 0);
    const negativePoints = samples.filter((s) => s.velocityMs < 0);

    const drawArea = (pts: VelocitySample[], color: string, fillColor: string) => {
      if (pts.length < 2) return;
      const indices = pts.map((p) => samples.indexOf(p));
      ctx.beginPath();
      ctx.moveTo(toX(indices[0]), zeroY);
      indices.forEach((i) => ctx.lineTo(toX(i), toY(samples[i].velocityMs)));
      ctx.lineTo(toX(indices[indices.length - 1]), zeroY);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(toX(indices[0]), toY(samples[indices[0]].velocityMs));
      indices.forEach((i) => ctx.lineTo(toX(i), toY(samples[i].velocityMs)));
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    drawArea(positivePoints, '#fdda36', 'rgba(253,218,54,0.2)');
    drawArea(negativePoints, '#f87171', 'rgba(248,113,113,0.2)');

    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    samples.forEach((s, i) => {
      const x = toX(i);
      const y = toY(s.velocityMs);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    const peakIdx = velocities.indexOf(Math.max(...velocities));
    if (peakIdx >= 0 && velocities[peakIdx] > 0) {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(toX(peakIdx), toY(velocities[peakIdx]), 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Concentrica', padding.left + chartW * 0.25, padding.top + 12);
    ctx.fillStyle = 'rgba(248,113,113,0.7)';
    ctx.fillText('Excentrica', padding.left + chartW * 0.75, h - padding.bottom + 14);
  }, [samples, height]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-lg"
      style={{ height: `${height}px` }}
    />
  );
}
