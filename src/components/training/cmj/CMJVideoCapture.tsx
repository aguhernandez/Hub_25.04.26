import { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, Video, AlertCircle, CheckCircle, Square, Circle, Loader } from 'lucide-react';
import { VideoFrameAnalysis } from './CMJTypes';
import { useLanguage } from '../../../contexts/LanguageContext';
import { requestCameraPermission } from '../../../utils/cameraPermission';

interface CMJVideoCaptureProps {
  onJumpDetected: (flightTimeMs: number, analysis: VideoFrameAnalysis) => void;
  onError: (msg: string) => void;
  isActive: boolean;
}

const TARGET_FPS = 240;
const MIN_FLIGHT_MS = 100;
const MAX_FLIGHT_MS = 1200;

export default function CMJVideoCapture({ onJumpDetected, onError, isActive }: CMJVideoCaptureProps) {
  const { language } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [cameraStatus, setCameraStatus] = useState<'idle' | 'requesting' | 'active' | 'error'>('idle');
  const [actualFps, setActualFps] = useState<number>(0);
  const [isRecording, setIsRecording] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState('');

  const txt = {
    cameraIdle: language === 'es' ? 'Camara no iniciada' : 'Camera not started',
    requesting: language === 'es' ? 'Solicitando acceso a camara...' : 'Requesting camera access...',
    cameraError: language === 'es' ? 'Error de camara' : 'Camera error',
    highSpeed: language === 'es' ? 'Alta velocidad' : 'High speed',
    fpsLimited: language === 'es' ? 'FPS limitado' : 'FPS limited',
    feetZone: language === 'es' ? 'zona de pies' : 'feet zone',
    startRec: language === 'es' ? 'Iniciar grabacion' : 'Start recording',
    stopRec: language === 'es' ? 'Detener y analizar' : 'Stop & analyze',
    analyzing: language === 'es' ? 'Analizando video...' : 'Analyzing video...',
    flightDetected: language === 'es' ? 'Vuelo detectado' : 'Flight detected',
    noJump: language === 'es'
      ? 'No se detecto un salto valido. Asegurate de que los pies sean visibles.'
      : 'No valid jump detected. Make sure feet are visible in frame.',
    cameraPermission: language === 'es'
      ? 'No se pudo acceder a la camara. Verifica los permisos.'
      : 'Could not access camera. Check your permissions.',
    fpsWarning: (fps: number) => language === 'es'
      ? `Tu camara opera a ${fps} fps. Se recomienda al menos 120 fps para mayor precision.`
      : `Camera is running at ${fps} fps. At least 120 fps is recommended for better accuracy.`,
  };

  const startCamera = useCallback(async () => {
    setCameraStatus('requesting');
    try {
      // CRITICAL FIX: Request camera permission with iOS runtime safety
      const permResult = await requestCameraPermission();
      if (permResult === 'denied') {
        setCameraStatus('error');
        onError(
          language === 'es'
            ? 'Permiso de camara denegado. Por favor habilitalo en la configuracion del dispositivo.'
            : 'Camera permission denied. Please enable it in your device settings.'
        );
        return;
      }
      if (permResult === 'unavailable') {
        setCameraStatus('error');
        onError(txt.cameraPermission);
        return;
      }

      // Safety check: Verify getUserMedia is available before calling
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraStatus('error');
        onError(txt.cameraPermission);
        return;
      }

      // CRITICAL FIX: Add safety delay and verify stream before use
      // This prevents iOS runtime state issues on rapid re-initialization
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          frameRate: { ideal: TARGET_FPS, min: 30 },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      // Verify stream is valid before storing
      if (!stream || stream.getTracks().length === 0) {
        setCameraStatus('error');
        onError(txt.cameraPermission);
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Use play() with proper error handling for iOS
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.debug('Video play error (non-critical):', playErr);
          // Don't fail if play fails, stream may still be ready
        }
      }

      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) {
        setCameraStatus('error');
        onError(txt.cameraPermission);
        return;
      }

      const track = videoTracks[0];
      const settings = track.getSettings();
      setActualFps(settings.frameRate || 30);
      setCameraStatus('active');
    } catch (err) {
      console.debug('Camera start error:', err);
      setCameraStatus('error');
      onError(txt.cameraPermission);
    }
  }, [onError, txt.cameraPermission, language]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraStatus('idle');
    setIsRecording(false);
    setAnalysisStatus('');
  }, []);

  useEffect(() => {
    if (isActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isActive]);

  const detectTakeoffLanding = (samples: number[], fps: number): VideoFrameAnalysis | null => {
    if (samples.length < 10) return null;
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    const std = Math.sqrt(samples.reduce((a, b) => a + (b - avg) ** 2, 0) / samples.length);
    const threshold = avg + std * 0.5;

    let takeoffFrame = -1;
    let landingFrame = -1;

    for (let i = 5; i < samples.length - 5; i++) {
      if (takeoffFrame === -1 && samples[i] > threshold && samples[i - 1] <= threshold) {
        takeoffFrame = i;
      } else if (takeoffFrame !== -1 && landingFrame === -1 && samples[i] < threshold && samples[i - 1] >= threshold) {
        const flightMs = ((i - takeoffFrame) / fps) * 1000;
        if (flightMs >= MIN_FLIGHT_MS && flightMs <= MAX_FLIGHT_MS) {
          landingFrame = i;
          break;
        } else {
          takeoffFrame = -1;
        }
      }
    }

    if (takeoffFrame === -1 || landingFrame === -1) return null;

    return {
      takeoffFrameIndex: takeoffFrame,
      landingFrameIndex: landingFrame,
      fps,
      totalFrames: samples.length,
      flightTimeMs: ((landingFrame - takeoffFrame) / fps) * 1000,
    };
  };

  const analyzeVideoForJump = useCallback(async (blob: Blob, fps: number): Promise<VideoFrameAnalysis | null> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(blob);
      video.src = url;
      video.muted = true;

      video.onloadedmetadata = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const frameInterval = 1 / fps;
        const totalFrames = Math.floor(video.duration / frameInterval);
        const bottomStrip = Math.floor(canvas.height * 0.15);
        const brightnessSamples: number[] = [];
        let currentFrame = 0;

        const sampleFrame = () => {
          if (currentFrame >= totalFrames) {
            URL.revokeObjectURL(url);
            resolve(detectTakeoffLanding(brightnessSamples, fps));
            return;
          }
          video.currentTime = currentFrame * frameInterval;
          currentFrame++;
        };

        video.onseeked = () => {
          ctx.drawImage(video, 0, 0);
          const imageData = ctx.getImageData(0, canvas.height - bottomStrip, canvas.width, bottomStrip);
          const data = imageData.data;
          let brightness = 0;
          for (let i = 0; i < data.length; i += 4) {
            brightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
          }
          brightnessSamples.push(brightness / (data.length / 4));
          sampleFrame();
        };

        video.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
        sampleFrame();
      };

      video.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    });
  }, []);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || stream.getTracks().length === 0) {
      onError(txt.cameraPermission);
      return;
    }

    // Verify stream is still active (iOS safety check)
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack || videoTrack.readyState !== 'live') {
      onError(txt.cameraPermission);
      return;
    }

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
      ? 'video/webm'
      : '';

    try {
      chunksRef.current = [];
      // CRITICAL FIX: Verify MediaRecorder creation doesn't crash on iOS
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setAnalysisStatus(txt.analyzing);
        const blob = new Blob(chunksRef.current, { type: mimeType || 'video/webm' });
        const usedFps = actualFps > 0 ? actualFps : 30;
        const analysis = await analyzeVideoForJump(blob, usedFps);

        if (analysis) {
          setAnalysisStatus(`${txt.flightDetected}: ${analysis.flightTimeMs.toFixed(0)}ms`);
          onJumpDetected(analysis.flightTimeMs, analysis);
        } else {
          setAnalysisStatus('');
          onError(txt.noJump);
        }
      };

      recorder.onerror = (err) => {
        console.error('MediaRecorder error:', err);
        onError(txt.cameraPermission);
      };

      recorder.start(100);
      setIsRecording(true);
      setAnalysisStatus('');
    } catch (err: any) {
      console.error('Recording error:', err);
      onError(`Recording error: ${err?.message || 'unknown'}`);
    }
  }, [actualFps, analyzeVideoForJump, onJumpDetected, onError, txt]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl overflow-hidden bg-gray-900" style={{ minHeight: '56vw', maxHeight: '65vh' }}>
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        <canvas ref={canvasRef} className="hidden" />

        {cameraStatus === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center text-gray-400">
              <Camera className="w-12 h-12 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-body">{txt.cameraIdle}</p>
            </div>
          </div>
        )}

        {cameraStatus === 'requesting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
            <div className="text-center text-white">
              <Loader className="w-8 h-8 mx-auto mb-2 animate-spin text-primary" />
              <p className="text-sm font-body">{txt.requesting}</p>
            </div>
          </div>
        )}

        {cameraStatus === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center text-red-400">
              <AlertCircle className="w-10 h-10 mx-auto mb-2" />
              <p className="text-sm font-body">{txt.cameraError}</p>
            </div>
          </div>
        )}

        {cameraStatus === 'active' && (
          <>
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <div className="bg-black/60 rounded-full px-2 py-1 text-xs text-white flex items-center gap-1 font-body">
                <Video className="w-3 h-3 text-green-400" />
                {actualFps > 0 ? `${actualFps} fps` : 'Live'}
              </div>
              {actualFps >= 120 && (
                <div className="bg-green-500/80 rounded-full px-2 py-1 text-xs text-white flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {txt.highSpeed}
                </div>
              )}
              {actualFps > 0 && actualFps < 120 && (
                <div className="bg-yellow-500/80 rounded-full px-2 py-1 text-xs text-white">
                  {txt.fpsLimited}
                </div>
              )}
            </div>

            {isRecording && (
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-red-500/90 rounded-full px-2.5 py-1">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-xs text-white font-semibold">REC</span>
              </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 h-1/6 border-t-2 border-dashed border-primary/70 pointer-events-none">
              <div className="absolute -top-5 left-3 text-xs text-primary/90 bg-black/50 px-1.5 py-0.5 rounded font-body">
                {txt.feetZone}
              </div>
            </div>

            {analysisStatus && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                <div className="bg-black/75 rounded-lg px-3 py-1.5 text-sm text-white flex items-center gap-2 font-body">
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                  {analysisStatus}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {cameraStatus === 'active' && (
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition-all active:scale-95 font-body ${
            isRecording
              ? 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600'
              : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'
          }`}
        >
          {isRecording ? (
            <>
              <Square className="w-4 h-4 fill-white" />
              {txt.stopRec}
            </>
          ) : (
            <>
              <Circle className="w-4 h-4 fill-white" />
              {txt.startRec}
            </>
          )}
        </button>
      )}

      {actualFps > 0 && actualFps < 60 && (
        <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
          <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
          <p className="text-xs text-yellow-300 font-body">{txt.fpsWarning(actualFps)}</p>
        </div>
      )}
    </div>
  );
}
