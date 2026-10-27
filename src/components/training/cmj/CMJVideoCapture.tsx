import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Camera, Check, ChevronLeft, ChevronRight, Square, Upload } from 'lucide-react';
import { VideoFrameAnalysis } from './CMJTypes';
import { buildFrameTable } from '../jump/jumpVideoFrames';
import { requestCameraPermission } from '../../../utils/cameraPermission';
import { useLanguage } from '../../../contexts/LanguageContext';

interface CMJVideoCaptureProps {
  onJumpDetected: (flightTimeMs: number, analysis: VideoFrameAnalysis) => void;
  onError: (msg: string) => void;
  isActive: boolean;
}
interface VideoFrame { index: number; mediaTime: number; skipped: boolean; footY?: number; }
type SourceMode = 'live' | 'video';

function median(values: number[]): number {
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.floor(ordered.length / 2)] ?? 0;
}

function estimateFootY(ctx: CanvasRenderingContext2D, width: number, height: number): number | null {
  const image = ctx.getImageData(0, 0, width, height);
  const sample = (x: number, y: number) => {
    const p = (y * width + x) * 4;
    return 0.299 * image.data[p] + 0.587 * image.data[p + 1] + 0.114 * image.data[p + 2];
  };
  let background = 0; let n = 0;
  for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 32))) { background += sample(x, 2) + sample(x, height - 3); n += 2; }
  background /= Math.max(1, n);
  const threshold = 32; const minCount = Math.max(2, Math.floor(width * 0.012));
  for (let y = height - 4; y >= Math.floor(height * 0.2); y -= 2) {
    let count = 0;
    for (let x = Math.floor(width * 0.08); x < Math.floor(width * 0.92); x += 3) if (Math.abs(sample(x, y) - background) > threshold) count++;
    if (count >= minCount) return y;
  }
  return null;
}

export default function CMJVideoCapture({ onJumpDetected, onError, isActive }: CMJVideoCaptureProps) {
  const { language } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const urlRef = useRef<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const framesRef = useRef<VideoFrame[]>([]);
  const timesRef = useRef<number[]>([]);
  const baselineRef = useRef<number[]>([]);
  const takeoffRef = useRef<{ index: number; timeMs: number } | null>(null);
  const lastEventRef = useRef(-Infinity);
  const runningRef = useRef(false);
  const [source, setSource] = useState<SourceMode>('live');
  const [frames, setFrames] = useState<VideoFrame[]>([]);
  const [frame, setFrame] = useState(0);
  const [takeoff, setTakeoff] = useState<number | null>(null);
  const [landing, setLanding] = useState<number | null>(null);
  const [fps, setFps] = useState(0);
  const [effectiveFps, setEffectiveFps] = useState(0);
  const [captureFps, setCaptureFps] = useState(120);
  const [skipped, setSkipped] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [capturing, setCapturing] = useState(false);
  const [autoMessage, setAutoMessage] = useState('');

  const txt = language === 'es'
    ? { upload: 'Subir video slow-motion', live: 'Cámara en vivo', start: 'Iniciar cámara', stop: 'Detener cámara', help: 'Cámara fija, cuerpo completo, buena luz y 120–240 fps. La detección automática necesita contraste entre atleta y fondo.', frame: 'Cuadro', takeoff: 'Marcar despegue', landing: 'Marcar aterrizaje', confirm: 'Confirmar salto', detected: 'Salto detectado automáticamente', fallback: 'No se detectó el evento; puedes marcarlo cuadro a cuadro.', warning: 'La altura puede sobreestimarse si aterrizas con más flexión que al despegar.', low: 'FPS efectivo bajo: precisión limitada; usa 120–240 fps.', skipped: 'frames saltados detectados' }
    : { upload: 'Upload slow-motion video', live: 'Live camera', start: 'Start camera', stop: 'Stop camera', help: 'Fixed camera, full body, good light and 120–240 fps. Automatic detection needs contrast between athlete and background.', frame: 'Frame', takeoff: 'Mark take-off', landing: 'Mark landing', confirm: 'Confirm jump', detected: 'Jump detected automatically', fallback: 'Event not detected; you can mark it frame by frame.', warning: 'Height may be overestimated if you land with more knee flexion than at take-off.', low: 'Low effective FPS: limited precision; use 120–240 fps.', skipped: 'skipped frames detected' };

  const resetCapture = () => {
    framesRef.current = []; timesRef.current = []; baselineRef.current = []; takeoffRef.current = null;
    setFrames([]); setFrame(0); setTakeoff(null); setLanding(null); setSkipped(0); setFps(0); setEffectiveFps(0); setAutoMessage('');
  };

  const emitAutomaticJump = useCallback((a: { index: number; timeMs: number }, b: { index: number; timeMs: number }) => {
    const table = buildFrameTable(timesRef.current, captureFps); const scale = table.timeScale; const rawFlight = b.timeMs - a.timeMs;
    const flightMs = rawFlight * scale;
    if (!(flightMs > 0) || rawFlight < 120 || rawFlight > 1100 || b.timeMs <= lastEventRef.current) return;
    lastEventRef.current = b.timeMs;
    const analysis: VideoFrameAnalysis = { takeoffFrameIndex: a.index, landingFrameIndex: b.index, fps: table.measuredFps, totalFrames: framesRef.current.length, flightTimeMs: flightMs, takeoffMs: a.timeMs * scale, landingMs: b.timeMs * scale, effectiveFps: table.effectiveFps, skippedFrames: table.skipped };
    setFps(table.measuredFps); setEffectiveFps(table.effectiveFps); setAutoMessage(txt.detected); onJumpDetected(flightMs, analysis);
  }, [captureFps, onJumpDetected, txt.detected]);

  const processFrame = useCallback((_now: number, metadata: VideoFrameCallbackMetadata) => {
    const video = videoRef.current; const canvas = canvasRef.current; const ctx = canvas?.getContext('2d');
    if (!runningRef.current || !video || !canvas || !ctx) return;
    const width = video.videoWidth || 640; const height = video.videoHeight || 480;
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    ctx.drawImage(video, 0, 0, width, height);
    const mediaTimeMs = metadata.mediaTime * 1000; const previous = framesRef.current[framesRef.current.length - 1]; const dt = previous ? mediaTimeMs - previous.mediaTime * 1000 : 0;
    if (dt > 0) timesRef.current.push(mediaTimeMs);
    const deltas = timesRef.current.slice(1).map((time, index) => time - timesRef.current[index]).filter((value) => value > 0);
    const med = median(deltas) || 1000 / captureFps; const footY = estimateFootY(ctx, width, height); const skippedFrame = Boolean(previous && dt > 1.5 * med);
    const next: VideoFrame = { index: framesRef.current.length, mediaTime: metadata.mediaTime, skipped: skippedFrame, footY: footY ?? undefined };
    framesRef.current.push(next); if (skippedFrame) setSkipped((value) => value + 1);
    if (footY !== null) {
      if (baselineRef.current.length < 20) baselineRef.current.push(footY);
      const baseline = median(baselineRef.current); const lift = Math.max(8, height * 0.035);
      if (!takeoffRef.current && baselineRef.current.length >= 5 && footY < baseline - lift) takeoffRef.current = { index: next.index, timeMs: mediaTimeMs };
      else if (takeoffRef.current && footY >= baseline - lift * 0.4 && mediaTimeMs - takeoffRef.current.timeMs >= 120) { const start = takeoffRef.current; takeoffRef.current = null; emitAutomaticJump(start, { index: next.index, timeMs: mediaTimeMs }); }
    }
    setFrames([...framesRef.current]); setFrame(next.index);
    const table = buildFrameTable(timesRef.current, captureFps); setFps(table.measuredFps); setEffectiveFps(table.effectiveFps);
    if (runningRef.current && (!video.ended || source === 'live')) video.requestVideoFrameCallback(processFrame);
  }, [captureFps, emitAutomaticJump, source]);

  const startCapture = useCallback(async (mode: SourceMode = source) => {
    const video = videoRef.current;
    if (!video || !('requestVideoFrameCallback' in video)) { onError('Este navegador no soporta requestVideoFrameCallback.'); return; }
    resetCapture(); runningRef.current = true; setCapturing(true); video.playbackRate = mode === 'video' ? 0.5 : 1;
    await video.play().catch(() => undefined); video.requestVideoFrameCallback(processFrame);
  }, [onError, processFrame, source]);

  const releaseVideoSource = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
      video.removeAttribute('src');
      video.load();
      video.onended = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const stopCapture = useCallback(() => {
    runningRef.current = false;
    setCapturing(false);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    releaseVideoSource();
  }, [releaseVideoSource]);

  const startLive = async () => {
    const permission = await requestCameraPermission();
    if (permission !== 'granted' || !navigator.mediaDevices?.getUserMedia) { onError('No se pudo acceder a la cámara.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', frameRate: { ideal: 120, min: 30 } }, audio: false });
      streamRef.current = stream; const video = videoRef.current;
      if (video) { video.srcObject = stream; video.muted = true; video.playsInline = true; }
      setSource('live'); await startCapture('live');
    } catch { onError('No se pudo acceder a la cámara.'); }
  };

  const loadFile = (file: File) => {
    stopCapture();
    urlRef.current = URL.createObjectURL(file);
    const video = videoRef.current;
    if (!video) return;
    setSource('video');
    video.srcObject = null;
    video.src = urlRef.current;
    video.onended = stopCapture;
    video.load();
    video.onloadedmetadata = () => void startCapture('video');
  };

  const seekFrame = (next: number) => { const target = Math.max(0, Math.min(frames.length - 1, next)); const item = frames[target]; if (!item || !videoRef.current) return; videoRef.current.currentTime = item.mediaTime; setFrame(target); };
  const confirmMarkedJump = () => {
    const a = takeoff === null ? null : frames[takeoff]; const b = landing === null ? null : frames[landing]; if (!a || !b || b.mediaTime <= a.mediaTime) return;
    const table = buildFrameTable(frames.map((item) => item.mediaTime * 1000), captureFps); const scale = table.timeScale;
    const analysis: VideoFrameAnalysis = { takeoffFrameIndex: a.index, landingFrameIndex: b.index, fps: table.measuredFps, totalFrames: frames.length, flightTimeMs: (b.mediaTime - a.mediaTime) * 1000 * scale, takeoffMs: a.mediaTime * 1000 * scale, landingMs: b.mediaTime * 1000 * scale, effectiveFps: table.effectiveFps, skippedFrames: table.skipped };
    onJumpDetected(analysis.flightTimeMs, analysis);
  };

  useEffect(() => () => { stopCapture(); }, [stopCapture]);
  useEffect(() => { if (!isActive) stopCapture(); }, [isActive, stopCapture]);

  return <div className="space-y-3">
    <div className="grid grid-cols-2 gap-2"><button onClick={() => setSource('live')} className={`rounded-xl border p-2 text-xs ${source === 'live' ? 'border-primary text-primary' : 'border-gray-700 text-gray-400'}`}><Camera className="inline w-4 h-4 mr-1" />{txt.live}</button><label className="rounded-xl border border-gray-700 text-gray-400 p-2 text-xs text-center cursor-pointer"><Upload className="inline w-4 h-4 mr-1" />{txt.upload}<input type="file" accept="video/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) loadFile(file); }} /></label></div>
    <p className="text-xs text-gray-400">{txt.help}</p>
    <div className="relative overflow-hidden rounded-xl bg-gray-900"><video ref={videoRef} className="w-full rounded-xl" style={{ transform: `scale(${zoom})` }} playsInline muted controls={source === 'video'} /><canvas ref={canvasRef} className="hidden" /></div>
    <div className="flex gap-2 items-center"><label className="text-xs">fps original <select value={captureFps} onChange={(event) => setCaptureFps(Number(event.target.value))} className="bg-gray-800 rounded px-2 py-1"><option value={30}>30</option><option value={60}>60</option><option value={120}>120</option><option value={240}>240</option></select></label><button onClick={() => seekFrame(frame - 1)}><ChevronLeft /></button><span className="text-xs">{txt.frame} {frame + 1}/{Math.max(1, frames.length)}</span><button onClick={() => seekFrame(frame + 1)}><ChevronRight /></button><button onClick={() => setZoom((value) => value === 1 ? 2 : 1)} className="text-xs">×{zoom}</button></div>
    {!capturing && source === 'live' && <button onClick={() => void startLive()} className="w-full rounded-xl bg-primary p-3 text-sm font-semibold text-gray-900"><Camera className="inline w-4 h-4 mr-1" />{txt.start}</button>}
    {capturing && <button onClick={stopCapture} className="w-full rounded-xl bg-gray-700 p-3 text-sm font-semibold text-white"><Square className="inline w-4 h-4 mr-1" />{txt.stop}</button>}
    {fps > 0 && <p className={`text-xs ${effectiveFps < 60 ? 'text-red-400' : 'text-gray-400'}`}>{fps.toFixed(1)} fps medidos · {effectiveFps.toFixed(1)} fps efectivos {effectiveFps < 60 ? `— ${txt.low}` : ''}</p>}
    {skipped > 0 && <div className="flex items-center gap-2 rounded-xl border border-yellow-300/80 bg-yellow-400 px-3 py-2 text-xs font-semibold text-gray-950"><AlertTriangle className="w-3 h-3 shrink-0" /> {skipped} {txt.skipped}</div>}
    {autoMessage && <p className="text-xs text-green-400">{autoMessage}</p>}
    {frames.length > 1 && <div className="grid grid-cols-2 gap-2"><button onClick={() => setTakeoff(frame)} className="rounded-xl border border-primary/30 p-2 text-xs">{txt.takeoff}</button><button onClick={() => setLanding(frame)} className="rounded-xl border border-primary/30 p-2 text-xs">{txt.landing}</button></div>}
    {takeoff !== null && landing !== null && <button onClick={confirmMarkedJump} className="w-full rounded-xl bg-primary p-3 font-semibold text-gray-900"><Check className="inline w-4 h-4" /> {txt.confirm}</button>}
    <p className="text-xs text-gray-500">{txt.warning}</p>
    {!autoMessage && frames.length > 20 && <div className="rounded-xl border border-yellow-300/80 bg-yellow-400 px-3 py-2 text-xs font-semibold text-gray-950">{txt.fallback}</div>}
  </div>;
}
