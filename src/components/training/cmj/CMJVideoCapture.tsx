import { useRef, useState, useCallback, useEffect } from 'react';
import {
  Camera,
  Video,
  AlertCircle,
  Square,
  Circle,
  Loader,
  ChevronLeft,
  ChevronRight,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  Check,
  RotateCcw,
  Flag,
} from 'lucide-react';
import { VideoFrameAnalysis } from './CMJTypes';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { requestCameraPermission } from '../../../utils/cameraPermission';

interface CMJVideoCaptureProps {
  onJumpDetected: (flightTimeMs: number, analysis: VideoFrameAnalysis) => void;
  onError: (msg: string) => void;
  isActive: boolean;
}

const TARGET_FPS = 240;
const MIN_FLIGHT_MS = 80;
const MAX_FLIGHT_MS = 1200;

type Phase = 'camera' | 'review';

export default function CMJVideoCapture({ onJumpDetected, onError, isActive }: CMJVideoCaptureProps) {
  const { language } = useLanguage();
  const { isDark } = useTheme();

  // ── Camera / recording refs
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const actualMimeTypeRef = useRef<string>('');

  // ── Review refs
  const reviewVideoRef = useRef<HTMLVideoElement>(null);
  const reviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const zoomCanvasRef = useRef<HTMLCanvasElement>(null);
  const blobUrlRef = useRef<string>('');
  const rafRef = useRef<number>(0);

  // ── Camera state
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'requesting' | 'active' | 'error'>('idle');
  const [actualFps, setActualFps] = useState<number>(0);
  const [isRecording, setIsRecording] = useState(false);

  // ── Phase
  const [phase, setPhase] = useState<Phase>('camera');

  // ── Review state
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoFps, setVideoFps] = useState(30);
  const [totalFrames, setTotalFrames] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [takeoffFrame, setTakeoffFrame] = useState<number | null>(null);
  const [landingFrame, setLandingFrame] = useState<number | null>(null);
  const [zoomEnabled, setZoomEnabled] = useState(true);
  const [autoDetected, setAutoDetected] = useState(false);
  const [autoDetecting, setAutoDetecting] = useState(false);

  const txt = {
    cameraIdle: language === 'es' ? 'Camara no iniciada' : 'Camera not started',
    requesting: language === 'es' ? 'Solicitando acceso...' : 'Requesting access...',
    cameraError: language === 'es' ? 'Error de camara' : 'Camera error',
    startRec: language === 'es' ? 'Iniciar grabacion' : 'Start recording',
    stopRec: language === 'es' ? 'Detener grabacion' : 'Stop recording',
    analyzing: language === 'es' ? 'Analizando...' : 'Analyzing...',
    noJump: language === 'es'
      ? 'No se detecto salto. Marca los frames manualmente.'
      : 'No jump detected. Mark frames manually.',
    cameraPermission: language === 'es'
      ? 'No se pudo acceder a la camara. Verifica los permisos.'
      : 'Could not access camera. Check your permissions.',
    reviewTitle: language === 'es' ? 'Revisar video' : 'Review video',
    frameLabel: language === 'es' ? 'Frame' : 'Frame',
    takeoff: language === 'es' ? 'Despegue' : 'Take-off',
    landing: language === 'es' ? 'Aterrizaje' : 'Landing',
    markTakeoff: language === 'es' ? 'Marcar despegue' : 'Mark take-off',
    markLanding: language === 'es' ? 'Marcar aterrizaje' : 'Mark landing',
    confirm: language === 'es' ? 'Confirmar salto' : 'Confirm jump',
    reRecord: language === 'es' ? 'Volver a grabar' : 'Re-record',
    flightTime: language === 'es' ? 'Tiempo de vuelo' : 'Flight time',
    jumpHeight: language === 'es' ? 'Altura estimada' : 'Estimated height',
    zoomFeet: language === 'es' ? 'Zoom pies' : 'Zoom feet',
    autoDetect: language === 'es' ? 'Auto-detectar' : 'Auto-detect',
    detected: language === 'es' ? 'Auto-detectado' : 'Auto-detected',
    slow: language === 'es' ? 'Lento' : 'Slow',
    normal: language === 'es' ? 'Normal' : 'Normal',
    selectBoth: language === 'es'
      ? 'Selecciona despegue y aterrizaje para continuar'
      : 'Select take-off and landing to continue',
    takeoffBeforeLanding: language === 'es'
      ? 'El despegue debe ser antes del aterrizaje'
      : 'Take-off must be before landing',
    fpsWarning: (fps: number) => language === 'es'
      ? `Camara a ${fps} fps — se recomienda 120+ fps para mayor precision`
      : `Camera at ${fps} fps — 120+ fps recommended for better accuracy`,
  };

  // ── Camera management
  const startCamera = useCallback(async () => {
    setCameraStatus('requesting');
    try {
      const permResult = await requestCameraPermission();
      if (permResult === 'denied') {
        setCameraStatus('error');
        onError(language === 'es'
          ? 'Permiso de camara denegado.'
          : 'Camera permission denied.');
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraStatus('error');
        onError(txt.cameraPermission);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          frameRate: { ideal: TARGET_FPS, min: 30 },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      if (!stream || stream.getTracks().length === 0) {
        setCameraStatus('error');
        onError(txt.cameraPermission);
        return;
      }

      streamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        try { await liveVideoRef.current.play(); } catch { /* non-critical */ }
      }

      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();
      setActualFps(settings.frameRate || 30);
      setCameraStatus('active');
    } catch {
      setCameraStatus('error');
      onError(txt.cameraPermission);
    }
  }, [onError, txt.cameraPermission, language]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraStatus('idle');
    setIsRecording(false);
  }, []);

  useEffect(() => {
    if (isActive && phase === 'camera') startCamera();
    else if (!isActive) stopCamera();
    return () => stopCamera();
  }, [isActive, phase]);

  // ── Recording
  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack || videoTrack.readyState !== 'live') return;

    const candidates = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4;codecs=avc1',
      'video/mp4',
    ];
    const mimeType = candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';

    try {
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      actualMimeTypeRef.current = recorder.mimeType || mimeType || 'video/mp4';
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: actualMimeTypeRef.current });
        stopCamera();
        openReview(blob);
      };

      recorder.onerror = () => onError(txt.cameraError);
      recorder.start(100);
      setIsRecording(true);
    } catch (err: any) {
      onError(`Recording error: ${err?.message || 'unknown'}`);
    }
  }, [stopCamera, onError, txt.cameraError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    }
  }, []);

  // ── Open review phase
  const openReview = (blob: Blob) => {
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    blobUrlRef.current = URL.createObjectURL(blob);
    setPhase('review');
    setTakeoffFrame(null);
    setLandingFrame(null);
    setCurrentFrame(0);
    setIsPlaying(false);
    setAutoDetected(false);
  };

  // ── Review: video ready
  const handleVideoLoaded = useCallback(() => {
    const video = reviewVideoRef.current;
    if (!video) return;
    const dur = isFinite(video.duration) && video.duration > 0 ? video.duration : 10;
    const fps = actualFps > 0 ? actualFps : 30;
    const frames = Math.max(1, Math.floor(dur * fps));
    setVideoDuration(dur);
    setVideoFps(fps);
    setTotalFrames(frames);
    setCurrentFrame(0);
    seekTo(0, fps);
    // Auto-detect after a short delay
    setAutoDetecting(true);
    runAutoDetect(video, fps, frames);
  }, [actualFps]);

  const seekTo = (frame: number, fps?: number) => {
    const video = reviewVideoRef.current;
    if (!video) return;
    const usedFps = fps ?? videoFps;
    const t = frame / usedFps;
    video.currentTime = Math.min(t, video.duration || 9999);
  };

  // ── Auto-detection (brightness analysis on bottom strip)
  const runAutoDetect = async (video: HTMLVideoElement, fps: number, frames: number) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) { setAutoDetecting(false); return; }

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const bottomStrip = Math.max(1, Math.floor(canvas.height * 0.18));

    const brightnessSamples: number[] = [];
    const maxFrames = Math.min(frames, 600); // cap at 600 frames for perf

    await new Promise<void>((resolve) => {
      let f = 0;
      const next = () => {
        if (f >= maxFrames) { resolve(); return; }
        video.currentTime = f / fps;
        f++;
      };
      const onSeeked = () => {
        ctx.drawImage(video, 0, 0);
        const imgData = ctx.getImageData(0, canvas.height - bottomStrip, canvas.width, bottomStrip);
        const d = imgData.data;
        let b = 0;
        for (let i = 0; i < d.length; i += 4) b += (d[i] + d[i + 1] + d[i + 2]) / 3;
        brightnessSamples.push(b / (d.length / 4));
        next();
      };
      video.onseeked = onSeeked;
      next();
    });

    // Reset onseeked after auto-detect
    video.onseeked = null;

    const result = detectTakeoffLanding(brightnessSamples, fps);
    setAutoDetecting(false);

    if (result) {
      setTakeoffFrame(result.takeoffFrameIndex);
      setLandingFrame(result.landingFrameIndex);
      setCurrentFrame(result.takeoffFrameIndex);
      seekTo(result.takeoffFrameIndex, fps);
      setAutoDetected(true);
    } else {
      seekTo(0, fps);
    }
  };

  const detectTakeoffLanding = (samples: number[], fps: number): VideoFrameAnalysis | null => {
    if (samples.length < 10) return null;
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    const std = Math.sqrt(samples.reduce((a, b) => a + (b - avg) ** 2, 0) / samples.length);
    const threshold = avg + std * 0.5;

    let takeoff = -1;
    let landing = -1;

    for (let i = 5; i < samples.length - 5; i++) {
      if (takeoff === -1 && samples[i] > threshold && samples[i - 1] <= threshold) {
        takeoff = i;
      } else if (takeoff !== -1 && landing === -1 && samples[i] < threshold && samples[i - 1] >= threshold) {
        const flightMs = ((i - takeoff) / fps) * 1000;
        if (flightMs >= MIN_FLIGHT_MS && flightMs <= MAX_FLIGHT_MS) {
          landing = i;
          break;
        } else {
          takeoff = -1;
        }
      }
    }

    if (takeoff === -1 || landing === -1) return null;

    return {
      takeoffFrameIndex: takeoff,
      landingFrameIndex: landing,
      fps,
      totalFrames: samples.length,
      flightTimeMs: ((landing - takeoff) / fps) * 1000,
    };
  };

  // ── Playback loop
  useEffect(() => {
    if (phase !== 'review') return;
    const video = reviewVideoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.playbackRate = playbackRate;
      video.play().catch(() => {});
    } else {
      video.pause();
    }

    const onTimeUpdate = () => {
      if (!video) return;
      const frame = Math.floor(video.currentTime * videoFps);
      setCurrentFrame(Math.min(frame, totalFrames - 1));
    };
    const onEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('ended', onEnded);
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('ended', onEnded);
    };
  }, [isPlaying, phase, videoFps, totalFrames, playbackRate]);

  // ── Zoom canvas update
  useEffect(() => {
    if (phase !== 'review' || !zoomEnabled) return;
    cancelAnimationFrame(rafRef.current);
    const draw = () => {
      const video = reviewVideoRef.current;
      const zCanvas = zoomCanvasRef.current;
      if (!video || !zCanvas) { rafRef.current = requestAnimationFrame(draw); return; }
      const ctx = zCanvas.getContext('2d');
      if (!ctx) return;
      const sw = video.videoWidth || 640;
      const sh = video.videoHeight || 480;
      const stripH = Math.floor(sh * 0.30);
      ctx.drawImage(video, 0, sh - stripH, sw, stripH, 0, 0, zCanvas.width, zCanvas.height);
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, zoomEnabled, isPlaying]);

  // ── Frame nav
  const goToFrame = useCallback((f: number) => {
    const clamped = Math.max(0, Math.min(f, totalFrames - 1));
    setCurrentFrame(clamped);
    seekTo(clamped);
    setIsPlaying(false);
  }, [totalFrames, videoFps]);

  // ── Calculations
  const flightMs = takeoffFrame !== null && landingFrame !== null && landingFrame > takeoffFrame
    ? ((landingFrame - takeoffFrame) / videoFps) * 1000
    : null;
  const jumpHeightCm = flightMs !== null
    ? (9.81 * (flightMs / 1000) ** 2) / 8 * 100
    : null;

  // ── Confirm
  const handleConfirm = () => {
    if (takeoffFrame === null || landingFrame === null) return;
    if (landingFrame <= takeoffFrame) { onError(txt.takeoffBeforeLanding); return; }
    const ft = ((landingFrame - takeoffFrame) / videoFps) * 1000;
    onJumpDetected(ft, {
      takeoffFrameIndex: takeoffFrame,
      landingFrameIndex: landingFrame,
      fps: videoFps,
      totalFrames,
      flightTimeMs: ft,
    });
    // Return to camera for next jump
    handleReRecord();
  };

  const handleReRecord = () => {
    setPhase('camera');
    setTakeoffFrame(null);
    setLandingFrame(null);
    setCurrentFrame(0);
    setIsPlaying(false);
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = ''; }
    if (isActive) startCamera();
  };

  // ── Cleanup
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const canConfirm = takeoffFrame !== null && landingFrame !== null && landingFrame > takeoffFrame;
  const border = isDark ? 'border-gray-800/60' : 'border-gray-200';
  const bg = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';

  // ─────────────────────────────────────────
  // CAMERA PHASE
  // ─────────────────────────────────────────
  if (phase === 'camera') {
    return (
      <div className="space-y-3">
        <div className="relative rounded-xl overflow-hidden bg-gray-900" style={{ minHeight: '56vw', maxHeight: '65vh' }}>
          <video ref={liveVideoRef} className="w-full h-full object-cover" playsInline muted />

          {cameraStatus === 'idle' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center text-gray-400">
                <Camera className="w-12 h-12 mx-auto mb-2 opacity-40" />
                <p className="text-sm">{txt.cameraIdle}</p>
              </div>
            </div>
          )}
          {cameraStatus === 'requesting' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
              <div className="text-center text-white">
                <Loader className="w-8 h-8 mx-auto mb-2 animate-spin text-[#fdda36]" />
                <p className="text-sm">{txt.requesting}</p>
              </div>
            </div>
          )}
          {cameraStatus === 'error' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center text-red-400">
                <AlertCircle className="w-10 h-10 mx-auto mb-2" />
                <p className="text-sm">{txt.cameraError}</p>
              </div>
            </div>
          )}

          {cameraStatus === 'active' && (
            <>
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <div className="bg-black/60 rounded-full px-2 py-1 text-xs text-white flex items-center gap-1">
                  <Video className="w-3 h-3 text-green-400" />
                  {actualFps > 0 ? `${actualFps} fps` : 'Live'}
                </div>
              </div>
              {isRecording && (
                <div className="absolute top-3 right-3 flex items-center gap-1 bg-red-500/90 rounded-full px-2.5 py-1">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span className="text-xs text-white font-semibold">REC</span>
                </div>
              )}
              {/* Feet zone guide */}
              <div className="absolute bottom-0 left-0 right-0 h-1/6 border-t-2 border-dashed border-[#fdda36]/70 pointer-events-none">
                <div className="absolute -top-5 left-3 text-xs text-[#fdda36]/90 bg-black/50 px-1.5 py-0.5 rounded">
                  {language === 'es' ? 'zona de pies' : 'feet zone'}
                </div>
              </div>
            </>
          )}
        </div>

        {cameraStatus === 'active' && (
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition-all active:scale-95 ${
              isRecording
                ? 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600'
                : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'
            }`}
          >
            {isRecording ? (
              <><Square className="w-4 h-4 fill-white" />{txt.stopRec}</>
            ) : (
              <><Circle className="w-4 h-4 fill-white" />{txt.startRec}</>
            )}
          </button>
        )}

        {actualFps > 0 && actualFps < 60 && (
          <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-400">{txt.fpsWarning(actualFps)}</p>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────
  // REVIEW PHASE
  // ─────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-semibold ${textPrimary}`}>{txt.reviewTitle}</h3>
        <button
          onClick={handleReRecord}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-700"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {txt.reRecord}
        </button>
      </div>

      {/* Auto-detecting banner */}
      {autoDetecting && (
        <div className="flex items-center gap-2 p-3 bg-[#514163]/20 border border-[#514163]/30 rounded-xl">
          <Loader className="w-4 h-4 text-[#fdda36] animate-spin shrink-0" />
          <p className="text-xs text-[#fdda36]">{txt.analyzing}</p>
        </div>
      )}
      {!autoDetecting && autoDetected && (
        <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <p className="text-xs text-emerald-400">{txt.detected} — {language === 'es' ? 'ajusta si es necesario' : 'adjust if needed'}</p>
        </div>
      )}

      {/* Video player */}
      <div className="relative rounded-xl overflow-hidden bg-black" style={{ minHeight: '52vw', maxHeight: '60vh' }}>
        <video
          ref={reviewVideoRef}
          src={blobUrlRef.current}
          className="w-full h-full object-contain"
          playsInline
          muted
          onLoadedMetadata={handleVideoLoaded}
          onCanPlay={handleVideoLoaded}
        />

        {/* Takeoff / landing frame markers overlay */}
        {takeoffFrame !== null && (
          <div className="absolute top-2 left-2 bg-blue-500/80 rounded-md px-2 py-1 text-xs text-white font-semibold">
            {txt.takeoff}: {takeoffFrame}
          </div>
        )}
        {landingFrame !== null && (
          <div className="absolute top-2 right-2 bg-orange-500/80 rounded-md px-2 py-1 text-xs text-white font-semibold">
            {txt.landing}: {landingFrame}
          </div>
        )}

        {/* Current frame */}
        <div className="absolute bottom-2 left-2 bg-black/60 rounded-md px-2 py-1 text-xs text-white">
          {txt.frameLabel} {currentFrame} / {totalFrames - 1}
        </div>

        {/* FPS badge */}
        <div className="absolute bottom-2 right-2 bg-black/60 rounded-md px-2 py-1 text-xs text-gray-300">
          {videoFps} fps
        </div>
      </div>

      {/* Zoom strip */}
      {zoomEnabled && (
        <div className="relative rounded-xl overflow-hidden bg-black border border-gray-700">
          <canvas
            ref={zoomCanvasRef}
            width={640}
            height={120}
            className="w-full h-20 object-cover"
          />
          <div className="absolute top-1 left-2 text-[10px] text-[#fdda36]/80 font-semibold">
            {language === 'es' ? 'ZOOM — pies' : 'ZOOM — feet'}
          </div>
        </div>
      )}

      {/* Scrubber */}
      <div className="space-y-1">
        <input
          type="range"
          min={0}
          max={totalFrames - 1}
          value={currentFrame}
          onChange={(e) => goToFrame(Number(e.target.value))}
          className="w-full accent-[#fdda36] h-2 cursor-pointer"
          style={{ background: (() => {
            if (takeoffFrame === null && landingFrame === null) return undefined;
            const pct = (v: number) => `${((v / Math.max(totalFrames - 1, 1)) * 100).toFixed(1)}%`;
            const t = takeoffFrame ?? 0;
            const l = landingFrame ?? totalFrames - 1;
            return `linear-gradient(to right, #374151 0%, #374151 ${pct(t)}, #3b82f6 ${pct(t)}, #3b82f6 ${pct(l)}, #f97316 ${pct(l)}, #374151 ${pct(l)})`;
          })() }}
        />

        {/* Scrubber tick marks for takeoff/landing */}
        <div className="flex justify-between text-[10px] text-gray-500 px-0.5">
          <span>0</span>
          {takeoffFrame !== null && (
            <span className="text-blue-400">{language === 'es' ? 'D' : 'T'}: {takeoffFrame}</span>
          )}
          {landingFrame !== null && (
            <span className="text-orange-400">{language === 'es' ? 'A' : 'L'}: {landingFrame}</span>
          )}
          <span>{totalFrames - 1}</span>
        </div>
      </div>

      {/* Playback controls */}
      <div className={`flex items-center justify-between gap-2 p-2 rounded-xl border ${bg} ${border}`}>
        {/* Frame step */}
        <div className="flex items-center gap-1">
          <button onClick={() => goToFrame(0)} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors" title="First frame">
            <SkipBack className="w-4 h-4" />
          </button>
          <button onClick={() => goToFrame(currentFrame - 10)} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors" title="-10 frames">
            <ChevronLeft className="w-4 h-4" />
            <span className="sr-only">-10</span>
          </button>
          <button onClick={() => goToFrame(currentFrame - 1)} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors" title="-1 frame">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Play / pause + speed */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying((p) => !p)}
            className="p-2 rounded-xl bg-[#fdda36] text-[#514163] hover:bg-[#ffed4e] transition-colors shadow-sm"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setPlaybackRate((r) => r === 1 ? 0.25 : 1)}
            className={`text-xs px-2 py-1.5 rounded-lg border transition-colors ${
              playbackRate < 1
                ? 'bg-[#514163] border-[#514163] text-white'
                : `border-gray-700 text-gray-400 hover:text-white ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`
            }`}
          >
            {playbackRate < 1 ? `${playbackRate}x` : txt.slow}
          </button>
        </div>

        {/* Frame step forward */}
        <div className="flex items-center gap-1">
          <button onClick={() => goToFrame(currentFrame + 1)} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => goToFrame(currentFrame + 10)} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => goToFrame(totalFrames - 1)} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mark buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setTakeoffFrame(currentFrame)}
          className={`flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all border ${
            takeoffFrame === currentFrame
              ? 'bg-blue-500 border-blue-500 text-white'
              : 'border-blue-500/40 text-blue-400 hover:bg-blue-500/10'
          }`}
        >
          <Flag className="w-4 h-4" />
          {txt.markTakeoff}
          {takeoffFrame !== null && <span className="text-xs opacity-70">({takeoffFrame})</span>}
        </button>
        <button
          onClick={() => setLandingFrame(currentFrame)}
          className={`flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all border ${
            landingFrame === currentFrame
              ? 'bg-orange-500 border-orange-500 text-white'
              : 'border-orange-500/40 text-orange-400 hover:bg-orange-500/10'
          }`}
        >
          <Flag className="w-4 h-4" />
          {txt.markLanding}
          {landingFrame !== null && <span className="text-xs opacity-70">({landingFrame})</span>}
        </button>
      </div>

      {/* Zoom toggle */}
      <button
        onClick={() => setZoomEnabled((z) => !z)}
        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
          zoomEnabled
            ? 'border-[#fdda36]/40 text-[#fdda36] bg-[#fdda36]/10'
            : `border-gray-700 ${textSecondary} hover:text-white`
        }`}
      >
        {zoomEnabled ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
        {txt.zoomFeet}
      </button>

      {/* Computed metrics */}
      {flightMs !== null && jumpHeightCm !== null && (
        <div className={`grid grid-cols-2 gap-3 p-4 rounded-2xl border ${bg} ${border}`}>
          <div className="text-center">
            <p className={`text-xs uppercase tracking-wide mb-1 ${textSecondary}`}>{txt.flightTime}</p>
            <p className="text-2xl font-bold text-[#fdda36]">{(flightMs / 1000).toFixed(3)}<span className="text-sm font-normal text-gray-400 ml-1">s</span></p>
          </div>
          <div className="text-center">
            <p className={`text-xs uppercase tracking-wide mb-1 ${textSecondary}`}>{txt.jumpHeight}</p>
            <p className="text-2xl font-bold text-[#fdda36]">{jumpHeightCm.toFixed(1)}<span className="text-sm font-normal text-gray-400 ml-1">cm</span></p>
          </div>
        </div>
      )}

      {/* Validation hint */}
      {!canConfirm && !autoDetecting && (
        <p className={`text-xs text-center ${textSecondary}`}>
          {takeoffFrame === null || landingFrame === null
            ? txt.selectBoth
            : txt.takeoffBeforeLanding}
        </p>
      )}

      {/* Confirm */}
      <button
        onClick={handleConfirm}
        disabled={!canConfirm}
        className="w-full flex items-center justify-center gap-2 bg-[#fdda36] hover:bg-[#ffed4e] disabled:bg-gray-700 disabled:text-gray-500 text-[#514163] font-bold py-3.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-[#fdda36]/10"
      >
        <Check className="w-5 h-5" />
        {txt.confirm}
        {flightMs !== null && (
          <span className="text-sm font-normal opacity-70">— {(flightMs / 1000).toFixed(3)}s</span>
        )}
      </button>
    </div>
  );
}
