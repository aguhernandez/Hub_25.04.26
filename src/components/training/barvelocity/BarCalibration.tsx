import { useRef, useEffect, useState, useCallback } from 'react';
import { Target, CheckCircle, AlertCircle, Move, ScanSearch } from 'lucide-react';
import { CalibrationData } from './BarVelocityTypes';
import { detectPlateCircle, pxPerMmFromPlate } from './plateTracker';
import { useLanguage } from '../../../contexts/LanguageContext';

interface BarCalibrationProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  onCalibrated: (data: CalibrationData) => void;
  sourceFile?: File | null;
}

type DragMode = 'move' | 'resize' | null;

const ASCENDE_YELLOW = '#fdda36';

export default function BarCalibration({ videoRef, onCalibrated, sourceFile }: BarCalibrationProps) {
  const { language } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [circleX, setCircleX] = useState(50);
  const [circleY, setCircleY] = useState(50);
  const [circleRadius, setCircleRadius] = useState(18);
  const [videoSize, setVideoSize] = useState({ width: 640, height: 480 });
  const [dragging, setDragging] = useState<DragMode>(null);
  const [calibrated, setCalibrated] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectedByAuto, setDetectedByAuto] = useState(false);
  const [plateDiameterMm, setPlateDiameterMm] = useState(450);

  const txt = {
    title: language === 'es' ? 'Calibración con disco' : 'Disc calibration',
    instructions: language === 'es'
      ? 'Coloca el disco completo dentro del círculo. La línea amarilla cruza el centro del disco y sigue la barra.'
      : 'Place the entire disc inside the circle. The yellow line crosses its centre and follows the bar.',
    move: language === 'es' ? 'Arrastra dentro del círculo para moverlo' : 'Drag inside the circle to move it',
    resize: language === 'es' ? 'arrastra el borde para ajustar el tamaño' : 'drag the edge to adjust the size',
    confirmed: language === 'es' ? 'Calibración confirmada' : 'Calibration confirmed',
    detected: language === 'es' ? 'Disco detectado automáticamente' : 'Disc detected automatically',
    scale: language === 'es' ? 'Escala' : 'Scale',
    confirm: language === 'es' ? 'Confirmar calibración' : 'Confirm calibration',
    diameter: language === 'es' ? 'Diámetro real del disco' : 'Disc diameter',
    find: language === 'es' ? 'Detectar disco automáticamente' : 'Auto-detect disc',
    finding: language === 'es' ? 'Buscando disco…' : 'Finding disc…',
    tip: language === 'es'
      ? 'Usa un disco visible de frente, con contraste y sin taparlo. Puedes ajustar el círculo antes de confirmar.'
      : 'Use a visible disc with contrast and no occlusion. Adjust the circle before confirming.',
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !sourceFile) return undefined;
    const url = URL.createObjectURL(sourceFile);
    video.srcObject = null;
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.load();
    void video.play().catch(() => undefined);
    return () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
    };
  }, [sourceFile, videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    const update = () => setVideoSize({ width: video.videoWidth || 640, height: video.videoHeight || 480 });
    update();
    video.addEventListener('loadedmetadata', update);
    video.addEventListener('resize', update);
    return () => {
      video.removeEventListener('loadedmetadata', update);
      video.removeEventListener('resize', update);
    };
  }, [videoRef, sourceFile]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = videoSize.width;
    canvas.height = videoSize.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const minDimension = Math.min(canvas.width, canvas.height);
    const cx = (circleX / 100) * canvas.width;
    const cy = (circleY / 100) * canvas.height;
    const radius = (circleRadius / 100) * minDimension;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = ASCENDE_YELLOW;
    ctx.lineWidth = Math.max(3, minDimension / 180);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = ASCENDE_YELLOW;
    ctx.lineWidth = Math.max(2, minDimension / 260);
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(canvas.width, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = ASCENDE_YELLOW;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(5, minDimension / 90), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(Math.max(8, cx - 92), Math.max(8, cy - radius - 34), 184, 26);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(language === 'es' ? 'DISCO · LÍNEA DE BARRA' : 'DISC · BAR LINE', cx, Math.max(25, cy - radius - 17));
  }, [circleX, circleY, circleRadius, language, videoSize]);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)),
    };
  };

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = pointFromEvent(event);
    if (!point) return;
    const dx = ((point.x - circleX) / 100) * videoSize.width;
    const dy = ((point.y - circleY) / 100) * videoSize.height;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const radiusPx = (circleRadius / 100) * Math.min(videoSize.width, videoSize.height);
    const mode: DragMode = Math.abs(distance - radiusPx) < Math.max(18, radiusPx * 0.25) ? 'resize' : distance <= radiusPx * 1.25 ? 'move' : null;
    setDragging(mode);
    if (mode) event.currentTarget.setPointerCapture(event.pointerId);
  }, [circleRadius, circleX, circleY, videoSize]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragging) return;
    const point = pointFromEvent(event);
    if (!point) return;
    if (dragging === 'move') {
      const radiusWidth = (circleRadius / 100) * Math.min(videoSize.width, videoSize.height) / videoSize.width * 100;
      const radiusHeight = (circleRadius / 100) * Math.min(videoSize.width, videoSize.height) / videoSize.height * 100;
      setCircleX(Math.max(radiusWidth, Math.min(100 - radiusWidth, point.x)));
      setCircleY(Math.max(radiusHeight, Math.min(100 - radiusHeight, point.y)));
    } else {
      const dx = ((point.x - circleX) / 100) * videoSize.width;
      const dy = ((point.y - circleY) / 100) * videoSize.height;
      const radiusPct = (Math.sqrt(dx * dx + dy * dy) / Math.min(videoSize.width, videoSize.height)) * 100;
      setCircleRadius(Math.max(5, Math.min(45, radiusPct)));
    }
  }, [circleRadius, circleX, circleY, dragging, videoSize]);

  const handlePointerUp = useCallback(() => setDragging(null), []);

  const confirmCalibration = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const minDimension = Math.min(canvas.width, canvas.height);
    const centerX = (circleX / 100) * canvas.width;
    const centerY = (circleY / 100) * canvas.height;
    const radiusPx = (circleRadius / 100) * minDimension;
    const diameterPx = radiusPx * 2;
    onCalibrated({
      barTopY: centerY - radiusPx,
      barBottomY: centerY + radiusPx,
      barDiameterPx: diameterPx,
      pixelsPerMm: pxPerMmFromPlate(radiusPx, plateDiameterMm),
      centerX,
      centerY,
      radiusPx,
      processingWidth: canvas.width,
      processingHeight: canvas.height,
      plateDiameterMm,
      autoDetected: detectedByAuto,
    });
    setCalibrated(true);
  };

  const autoDetect = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || video.readyState < 2) return;
    setDetecting(true);
    const ctx = canvas.getContext('2d');
    if (!ctx) { setDetecting(false); return; }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const gray = new Uint8ClampedArray(canvas.width * canvas.height);
    for (let i = 0, p = 0; i < gray.length; i++, p += 4) gray[i] = Math.round(0.299 * image.data[p] + 0.587 * image.data[p + 1] + 0.114 * image.data[p + 2]);
    const detected = detectPlateCircle({ data: gray, width: canvas.width, height: canvas.height });
    if (detected) {
      setCircleX((detected.cx / canvas.width) * 100);
      setCircleY((detected.cy / canvas.height) * 100);
      setCircleRadius((detected.radiusPx / Math.min(canvas.width, canvas.height)) * 100);
      setDetectedByAuto(true);
    }
    setDetecting(false);
  };

  const scale = (circleRadius / 100) * Math.min(videoSize.width, videoSize.height) * 2 / plateDiameterMm;

  return (
    <div className="space-y-3 font-body">
      <div className="bg-primary/10 border border-primary/20 rounded-2xl p-3">
        <div className="flex items-start gap-2">
          <Target className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="text-xs text-primary/90">
            <p className="font-semibold mb-1">{txt.title}</p>
            <p>{txt.instructions}</p>
          </div>
        </div>
      </div>

      <div className="relative rounded-2xl overflow-hidden bg-gray-900" style={{ minHeight: '56vw', maxHeight: '65vh' }}>
        <video ref={videoRef} className="w-full h-full object-contain absolute inset-0" playsInline muted />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-contain touch-none cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
        <div className="absolute top-2 left-2 bg-black/75 rounded-lg px-2 py-1 text-xs text-white flex items-center gap-1">
          <Move className="w-3 h-3 text-primary" />
          {txt.move} · {txt.resize}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <label className="bg-gray-800/60 rounded-xl p-2.5">
          <div className="text-gray-400 mb-0.5">{txt.diameter}</div>
          <div className="flex items-center gap-1"><input type="number" min="50" max="1000" step="1" value={plateDiameterMm} onChange={(event) => setPlateDiameterMm(Number(event.target.value) || 450)} className="w-full bg-transparent text-primary font-mono outline-none" /><span className="text-gray-500">mm</span></div>
        </label>
        <div className="bg-gray-800/60 rounded-xl p-2.5">
          <div className="text-gray-400 mb-0.5">{txt.scale}</div>
          <div className="font-mono text-primary">{scale.toFixed(3)} px/mm</div>
        </div>
      </div>

      <button onClick={autoDetect} disabled={detecting} className="w-full flex items-center justify-center gap-2 rounded-xl border border-primary/30 text-primary py-2.5 text-xs disabled:opacity-50">
        <ScanSearch className="w-4 h-4" />
        {detecting ? txt.finding : txt.find}
      </button>

      {calibrated && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-2xl">
          <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-400">{txt.confirmed}</p>
            {detectedByAuto && <p className="text-xs text-green-300">{txt.detected}</p>}
          </div>
        </div>
      )}

      <button onClick={confirmCalibration} className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-gray-900 font-semibold py-3 rounded-xl transition-colors">
        <CheckCircle className="w-4 h-4" />
        {txt.confirm}
      </button>

      <div className="flex items-start gap-2 text-xs text-gray-400 bg-gray-800/30 rounded-xl p-3">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-gray-500" />
        <p>{txt.tip}</p>
      </div>
    </div>
  );
}
