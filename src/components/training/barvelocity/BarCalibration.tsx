import { useRef, useEffect, useState, useCallback } from 'react';
import { Target, CheckCircle, AlertCircle, Move } from 'lucide-react';
import { CalibrationData, DISC_DIAMETER_MM } from './BarVelocityTypes';
import { useLanguage } from '../../../contexts/LanguageContext';

interface BarCalibrationProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  onCalibrated: (data: CalibrationData) => void;
}

export default function BarCalibration({ videoRef, onCalibrated }: BarCalibrationProps) {
  const { language } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragging, setDragging] = useState<'top' | 'bottom' | null>(null);
  const [barTop, setBarTop] = useState(30);
  const [barBottom, setBarBottom] = useState(70);
  const [videoHeight, setVideoHeight] = useState(300);
  const [calibrated, setCalibrated] = useState(false);

  const txt = {
    title: language === 'es' ? 'Calibracion con disco olimpico' : 'Olympic disc calibration',
    instructions: language === 'es'
      ? 'Arrastra las lineas para que delimiten el diametro del disco olimpico (45 cm). El disco debe verse completo en el encuadre.'
      : 'Drag the lines to frame the full diameter of an Olympic disc (45 cm). The disc must be fully visible.',
    drag: language === 'es' ? 'Arrastra para calibrar' : 'Drag to calibrate',
    topLine: language === 'es' ? 'Linea superior' : 'Top line',
    bottomLine: language === 'es' ? 'Linea inferior' : 'Bottom line',
    framePercent: language === 'es' ? '% del frame' : '% of frame',
    confirmed: language === 'es' ? 'Calibracion confirmada' : 'Calibration confirmed',
    scale: language === 'es' ? 'Escala' : 'Scale',
    confirm: language === 'es' ? 'Confirmar calibracion' : 'Confirm calibration',
    tip: language === 'es'
      ? 'Coloca la camara a 1-2m lateral al atleta. Asegurate de que el disco sea completamente visible durante todo el movimiento.'
      : 'Place the camera 1-2m to the side of the athlete. Make sure the disc is fully visible throughout the movement.',
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const update = () => setVideoHeight(video.clientHeight);
    update();
    video.addEventListener('resize', update);
    return () => video.removeEventListener('resize', update);
  }, [videoRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const topY = (barTop / 100) * canvas.height;
    const botY = (barBottom / 100) * canvas.height;
    const mid = topY + (botY - topY) / 2;
    const midX = canvas.width / 2;

    ctx.strokeStyle = 'rgba(253,218,54,0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);

    ctx.beginPath();
    ctx.moveTo(0, topY);
    ctx.lineTo(canvas.width, topY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, botY);
    ctx.lineTo(canvas.width, botY);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(253,218,54,0.08)';
    ctx.fillRect(0, topY, canvas.width, botY - topY);

    ctx.fillStyle = 'rgba(253,218,54,0.9)';
    ctx.beginPath();
    ctx.arc(midX, topY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(midX, botY, 8, 0, Math.PI * 2);
    ctx.fill();

    const diamPx = botY - topY;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(midX - 65, mid - 13, 130, 26);
    ctx.fillStyle = '#fdda36';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${diamPx.toFixed(0)}px = 45 cm`, midX, mid + 4);
  }, [barTop, barBottom, videoRef, videoHeight]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!dragging || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const clamped = Math.max(5, Math.min(95, y));
      if (dragging === 'top') setBarTop(Math.min(clamped, barBottom - 5));
      else setBarBottom(Math.max(clamped, barTop + 5));
    },
    [dragging, barTop, barBottom]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const distTop = Math.abs(y - barTop);
      const distBot = Math.abs(y - barBottom);
      setDragging(distTop < distBot ? 'top' : 'bottom');
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [barTop, barBottom]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  const confirmCalibration = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const topY = (barTop / 100) * canvas.height;
    const botY = (barBottom / 100) * canvas.height;
    const diameterPx = botY - topY;
    const pixelsPerMm = diameterPx / DISC_DIAMETER_MM;

    onCalibrated({
      barTopY: topY,
      barBottomY: botY,
      barDiameterPx: diameterPx,
      pixelsPerMm,
    });
    setCalibrated(true);
  };

  return (
    <div className="space-y-3 font-body">
      <div className="bg-primary/10 border border-primary/20 rounded-2xl p-3">
        <div className="flex items-start gap-2">
          <Target className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="text-xs text-primary/80">
            <p className="font-semibold mb-1">{txt.title}</p>
            <p>{txt.instructions}</p>
          </div>
        </div>
      </div>

      <div className="relative rounded-2xl overflow-hidden bg-gray-900" style={{ minHeight: '56vw', maxHeight: '65vh' }}>
        <video
          ref={videoRef}
          className="w-full h-full object-cover absolute inset-0"
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none cursor-ns-resize"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
        <div className="absolute top-2 left-2 bg-black/60 rounded-lg px-2 py-1 text-xs text-white flex items-center gap-1">
          <Move className="w-3 h-3 text-primary" />
          {txt.drag}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-gray-800/60 rounded-xl p-2.5">
          <div className="text-gray-400 mb-0.5">{txt.topLine}</div>
          <div className="font-mono text-primary">{barTop.toFixed(1)}% {txt.framePercent}</div>
        </div>
        <div className="bg-gray-800/60 rounded-xl p-2.5">
          <div className="text-gray-400 mb-0.5">{txt.bottomLine}</div>
          <div className="font-mono text-primary">{barBottom.toFixed(1)}% {txt.framePercent}</div>
        </div>
      </div>

      {calibrated ? (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-2xl">
          <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-400">{txt.confirmed}</p>
            <p className="text-xs text-green-400/70">
              {txt.scale}: {((barBottom - barTop) / 100 * 300 / DISC_DIAMETER_MM).toFixed(3)} px/mm
            </p>
          </div>
        </div>
      ) : (
        <button
          onClick={confirmCalibration}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-gray-900 font-semibold py-3 rounded-xl transition-colors"
        >
          <CheckCircle className="w-4 h-4" />
          {txt.confirm}
        </button>
      )}

      <div className="flex items-start gap-2 text-xs text-gray-400 bg-gray-800/30 rounded-xl p-3">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-gray-500" />
        <p>{txt.tip}</p>
      </div>
    </div>
  );
}
