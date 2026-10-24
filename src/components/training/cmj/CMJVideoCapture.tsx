import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Upload, AlertTriangle } from 'lucide-react';
import { VideoFrameAnalysis } from './CMJTypes';
import { useLanguage } from '../../../contexts/LanguageContext';

interface CMJVideoCaptureProps { onJumpDetected: (flightTimeMs: number, analysis: VideoFrameAnalysis) => void; onError: (msg: string) => void; isActive: boolean; }
interface VideoFrame { index: number; mediaTime: number; skipped: boolean; }

export default function CMJVideoCapture({ onJumpDetected, onError, isActive }: CMJVideoCaptureProps) {
  const { language } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const urlRef = useRef<string | null>(null);
  const framesRef = useRef<VideoFrame[]>([]);
  const [frames, setFrames] = useState<VideoFrame[]>([]);
  const [frame, setFrame] = useState(0);
  const [takeoff, setTakeoff] = useState<number | null>(null);
  const [landing, setLanding] = useState<number | null>(null);
  const [fps, setFps] = useState(0);
  const [captureFps, setCaptureFps] = useState(120);
  const [skipped, setSkipped] = useState(0);
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(1);

  const txt = language === 'es' ? { upload: 'Subir vídeo slow-motion', help: 'Usa cámara fija, cuerpo completo, buena luz y 120–240 fps. El vídeo nativo slow-motion es preferible a grabar desde el navegador.', frame: 'Frame', takeoff: 'Marcar despegue', landing: 'Marcar aterrizaje', confirm: 'Confirmar salto', warning: 'La altura puede sobreestimarse si aterrizas con más flexión que al despegar.', low: 'FPS efectivo bajo: precisión limitada; usa 120–240 fps.', skipped: 'frames saltados detectados' } : { upload: 'Upload slow-motion video', help: 'Use a fixed camera, full body, good light and 120–240 fps. Native slow-motion upload is preferred to browser recording.', frame: 'Frame', takeoff: 'Mark take-off', landing: 'Mark landing', confirm: 'Confirm jump', warning: 'Height may be overestimated if you land with more knee flexion than at take-off.', low: 'Low effective FPS: limited precision; use 120–240 fps.', skipped: 'skipped frames detected' };

  const extractFrames = useCallback(async () => {
    const video = videoRef.current; if (!video || !('requestVideoFrameCallback' in video)) { onError('Este navegador no soporta requestVideoFrameCallback; usa entrada manual.'); return; }
    framesRef.current = []; setFrames([]); setFrame(0); setReady(false); setSkipped(0);
    const times: number[] = []; let last = -Infinity; let index = 0; let medianDt = 1000 / captureFps;
    const callback = (_now: number, metadata: VideoFrameCallbackMetadata) => {
      const mediaTime = metadata.mediaTime; const dt = (mediaTime * 1000) - last; const isSkipped = Number.isFinite(last) && dt > 1.5 * medianDt;
      if (Number.isFinite(last) && dt > 0) { times.push(dt); const sorted = [...times].sort((a, b) => a - b); medianDt = sorted[Math.floor(sorted.length / 2)] ?? medianDt; }
      const next = { index, mediaTime, skipped: isSkipped }; framesRef.current.push(next); if (isSkipped) setSkipped((value) => value + 1); setFrames([...framesRef.current]); setFps(times.length ? 1000 / medianDt : captureFps); last = mediaTime * 1000; index += 1;
      if (!video.ended) video.requestVideoFrameCallback(callback); else setReady(true);
    };
    await video.play(); video.requestVideoFrameCallback(callback);
  }, [captureFps, onError]);

  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);
  useEffect(() => { if (!isActive && videoRef.current) videoRef.current.pause(); }, [isActive]);

  const loadFile = (file: File) => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); urlRef.current = URL.createObjectURL(file); const video = videoRef.current; if (video) { video.src = urlRef.current; video.load(); video.onloadedmetadata = () => void extractFrames(); } };
  const seekFrame = (next: number) => { const target = Math.max(0, Math.min(frames.length - 1, next)); const item = frames[target]; const video = videoRef.current; if (!item || !video) return; video.currentTime = item.mediaTime; setFrame(target); };
  const confirm = () => { const a = takeoff === null ? null : frames[takeoff]; const b = landing === null ? null : frames[landing]; if (!a || !b || b.mediaTime <= a.mediaTime) return; const measuredFps = fps || captureFps; const analysis: VideoFrameAnalysis = { takeoffFrameIndex: a.index, landingFrameIndex: b.index, fps: measuredFps, totalFrames: frames.length, flightTimeMs: (b.mediaTime - a.mediaTime) * 1000, takeoffMs: a.mediaTime * 1000, landingMs: b.mediaTime * 1000, effectiveFps: measuredFps, skippedFrames: skipped }; onJumpDetected(analysis.flightTimeMs, analysis); };

  return <div className="space-y-3">
    <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-primary/30 text-primary cursor-pointer"><Upload className="w-4 h-4" />{txt.upload}<input type="file" accept="video/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) loadFile(file); }} /></label>
    <p className="text-xs text-gray-400">{txt.help}</p>
    <div className="flex gap-2 items-center"><label className="text-xs">fps original <select value={captureFps} onChange={(event) => setCaptureFps(Number(event.target.value))} className="bg-gray-800 rounded px-2 py-1"><option value={30}>30</option><option value={60}>60</option><option value={120}>120</option><option value={240}>240</option></select></label><button onClick={() => seekFrame(frame - 1)}><ChevronLeft /></button><span className="text-xs">{txt.frame} {frame + 1}/{Math.max(1, frames.length)}</span><button onClick={() => seekFrame(frame + 1)}><ChevronRight /></button><button onClick={() => setZoom((value) => value === 1 ? 2 : 1)} className="text-xs">×{zoom}</button></div>
    <video ref={videoRef} className="w-full rounded-xl" style={{ transform: `scale(${zoom})` }} controls playsInline muted />
    {fps > 0 && <p className={`text-xs ${fps < 60 ? 'text-red-400' : 'text-gray-400'}`}>{fps.toFixed(1)} fps efectivo {fps < 60 ? `— ${txt.low}` : ''}</p>}
    {skipped > 0 && <p className="text-xs text-yellow-400"><AlertTriangle className="inline w-3 h-3" /> {skipped} {txt.skipped}</p>}
    <div className="grid grid-cols-2 gap-2"><button onClick={() => setTakeoff(frame)} className="rounded-xl border border-primary/30 p-2 text-xs">{txt.takeoff}{takeoff !== null ? `: ${takeoff + 1}` : ''}</button><button onClick={() => setLanding(frame)} className="rounded-xl border border-primary/30 p-2 text-xs">{txt.landing}{landing !== null ? `: ${landing + 1}` : ''}</button></div>
    <button disabled={!ready || takeoff === null || landing === null} onClick={confirm} className="w-full rounded-xl bg-primary disabled:opacity-40 text-gray-900 p-3 font-semibold"><Check className="inline w-4 h-4" /> {txt.confirm}</button><p className="text-xs text-gray-500">{txt.warning}</p>
  </div>;
}
