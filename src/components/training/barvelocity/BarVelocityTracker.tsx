import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { supabase } from '../../../lib/supabase';
import {
  ArrowLeft,
  Camera,
  Video,
  CheckCircle,
  X,
  Save,
  Plus,
  History,
  Settings,
  Loader,
  Play,
  Square,
  AlertCircle,
} from 'lucide-react';
import BarCalibration from './BarCalibration';
import BarVelocityResultsPanel from './BarVelocityResultsPanel';
import BarVelocityHistory from './BarVelocityHistory';
import {
  BarRep,
  CalibrationData,
  calcVelocityLoss,
  calcPeakVelocity,
} from './BarVelocityTypes';
import { analyzeBarVideo, analyzeBarStream } from './BarVideoAnalyzer';
import { requestCameraPermission } from '../../../utils/cameraPermission';

type AppTab = 'session' | 'history';
type SessionStep = 'setup' | 'calibration' | 'recording' | 'analyzing' | 'results';
type CaptureMode = 'video' | 'live';

interface BarVelocityTrackerProps {
  onClose: () => void;
}

export default function BarVelocityTracker({ onClose }: BarVelocityTrackerProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { isDark } = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const stopLiveRef = useRef<(() => void) | null>(null);

  const [tab, setTab] = useState<AppTab>('session');
  const [step, setStep] = useState<SessionStep>('setup');
  const [captureMode, setCaptureMode] = useState<CaptureMode>('video');

  const [exerciseName, setExerciseName] = useState('');
  const [loadKg, setLoadKg] = useState('');
  const [notes, setNotes] = useState('');

  const [calibration, setCalibration] = useState<CalibrationData | null>(null);
  const [actualFps, setActualFps] = useState(30);
  const [isRecording, setIsRecording] = useState(false);
  const [liveVelocity, setLiveVelocity] = useState(0);

  const [reps, setReps] = useState<BarRep[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const txt = {
    title: 'Bar Velocity Tracker',
    subtitle: language === 'es' ? 'VBT — Entrenamiento basado en velocidad' : 'VBT — Velocity-Based Training',
    session: language === 'es' ? 'Sesion' : 'Session',
    sessionConfig: language === 'es' ? 'Configuracion de serie' : 'Set configuration',
    exercise: language === 'es' ? 'Ejercicio' : 'Exercise',
    exercisePlaceholder: language === 'es' ? 'ej: Sentadilla, Press banca...' : 'e.g.: Squat, Bench press...',
    load: language === 'es' ? 'Carga total (kg)' : 'Total load (kg)',
    loadPlaceholder: language === 'es' ? 'ej: 100' : 'e.g.: 100',
    force: language === 'es' ? 'Fuerza' : 'Force',
    forceNote: language === 'es' ? 'necesario para calcular potencia' : 'required to calculate power',
    captureMode: language === 'es' ? 'Modo de captura' : 'Capture mode',
    recordAnalyze: language === 'es' ? 'Grabar y analizar' : 'Record & analyze',
    videoPost: language === 'es' ? 'Video post-sesion' : 'Post-session video',
    realTime: language === 'es' ? 'Tiempo real' : 'Real-time',
    instantFeedback: language === 'es' ? 'Feedback instantaneo' : 'Instant feedback',
    prepTitle: language === 'es' ? 'Preparacion optima:' : 'Optimal setup:',
    prepItems: language === 'es' ? [
      'Camara lateral al atleta, paralela al suelo',
      'Disco completamente visible en todo momento',
      'Fondo contrastante (pared clara vs disco oscuro)',
      'Iluminacion uniforme sin sombras fuertes',
      'Distancia: 2-3 metros del atleta',
    ] : [
      'Camera lateral to athlete, parallel to floor',
      'Disc completely visible at all times',
      'Contrasting background (light wall vs dark disc)',
      'Uniform lighting without strong shadows',
      'Distance: 2-3 meters from athlete',
    ],
    toCalibration: language === 'es' ? 'Continuar a calibracion' : 'Continue to calibration',
    calibrated: language === 'es' ? 'Calibrado' : 'Calibrated',
    startRecording: language === 'es' ? 'Iniciar grabacion' : 'Start recording',
    stopAnalyze: language === 'es' ? 'Detener y analizar' : 'Stop & analyze',
    startLive: language === 'es' ? 'Iniciar tracking en vivo' : 'Start live tracking',
    stopSet: language === 'es' ? 'Finalizar serie' : 'Finish set',
    recording: language === 'es' ? 'Grabando...' : 'Recording...',
    repsDetected: language === 'es' ? 'Reps detectadas:' : 'Reps detected:',
    last: language === 'es' ? 'ultima:' : 'last:',
    liveProgress: language === 'es' ? 'Progreso en vivo' : 'Live progress',
    analyzing: language === 'es' ? 'Analizando video...' : 'Analyzing video...',
    analyzingDesc: language === 'es' ? 'Detectando barra y calculando velocidades' : 'Detecting bar and calculating velocities',
    noReps: language === 'es' ? 'No se detectaron repeticiones' : 'No reps detected',
    noRepsDesc: language === 'es'
      ? 'Verifica que el disco sea claramente visible y con buen contraste de fondo.'
      : 'Make sure the disc is clearly visible with good background contrast.',
    tryAgain: language === 'es' ? 'Intentar de nuevo' : 'Try again',
    notes: language === 'es' ? 'Notas' : 'Notes',
    notesPlaceholder: language === 'es' ? 'Observaciones, RPE, condiciones...' : 'Observations, RPE, conditions...',
    sessionSaved: language === 'es' ? 'Serie guardada' : 'Set saved',
    viewHistory: language === 'es' ? 'Ver en historial' : 'View in history',
    newSet: language === 'es' ? 'Nueva serie' : 'New set',
    saveSet: language === 'es' ? 'Guardar serie' : 'Save set',
    saving: language === 'es' ? 'Guardando...' : 'Saving...',
    saveError: language === 'es' ? 'Error al guardar. Intenta de nuevo.' : 'Error saving. Please try again.',
    cameraError: language === 'es' ? 'No se pudo acceder a la camara.' : 'Could not access camera.',
  };

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current && streamRef.current.getTracks().some(t => t.readyState === 'live')) {
        if (videoRef.current && !videoRef.current.srcObject) {
          videoRef.current.srcObject = streamRef.current;
          await videoRef.current.play();
        }
        return;
      }

      // CRITICAL FIX: Request camera permission with iOS runtime safety
      const permResult = await requestCameraPermission();
      if (permResult === 'denied') {
        setError(
          language === 'es'
            ? 'Permiso de camara denegado. Por favor habilitalo en la configuracion del dispositivo.'
            : 'Camera permission denied. Please enable it in your device settings.'
        );
        return;
      }
      if (permResult === 'unavailable') {
        setError(txt.cameraError);
        return;
      }

      // Safety check: Verify getUserMedia is available before calling
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(txt.cameraError);
        return;
      }

      // CRITICAL FIX: Add safety checks and verify stream before use
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          frameRate: { ideal: 240, min: 60 },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      // Verify stream is valid before storing
      if (!stream || stream.getTracks().length === 0) {
        setError(txt.cameraError);
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.debug('Video play error (non-critical):', playErr);
          // Don't fail if play fails
        }
      }

      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) {
        setError(txt.cameraError);
        return;
      }

      const settings = videoTracks[0].getSettings();
      setActualFps(settings.frameRate || 30);
    } catch (err) {
      console.debug('Camera start error:', err);
      setError(txt.cameraError);
    }
  }, [txt.cameraError, language]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (step === 'calibration') {
      startCamera();
    }
  }, [step, startCamera]);

  useEffect(() => {
    if (step === 'recording' && videoRef.current && streamRef.current) {
      if (!videoRef.current.srcObject) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [step]);

  useEffect(() => {
    return () => {
      stopCamera();
      stopLiveRef.current?.();
    };
  }, [stopCamera]);

  const handleCalibrated = (data: CalibrationData) => {
    setCalibration(data);
    setTimeout(() => setStep('recording'), 800);
  };

  const startVideoRecording = () => {
    const stream = streamRef.current;
    if (!stream || stream.getTracks().length === 0) return;

    // Verify stream is still active (iOS safety check)
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack || videoTrack.readyState !== 'live') return;

    chunksRef.current = [];
    const candidates = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4;codecs=avc1',
      'video/mp4',
    ];
    const mimeType = candidates.find(t => MediaRecorder.isTypeSupported(t)) ?? '';

    try {
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const actualMimeType = recorder.mimeType || mimeType;
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        setStep('analyzing');
        const blob = new Blob(chunksRef.current, { type: actualMimeType || 'video/mp4' });
        const detected = await analyzeBarVideo(
          blob,
          calibration!,
          actualFps,
          loadKg ? parseFloat(loadKg) : undefined
        );
        setReps(detected);
        setStep('results');
        stopCamera();
      };

      recorder.onerror = (err) => {
        console.error('MediaRecorder error:', err);
        setError(txt.cameraError);
      };

      recorder.start(100);
      setIsRecording(true);
    } catch (err: any) {
      console.error('Video recording error:', err);
      setError(txt.cameraError);
    }
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    }
  };

  const startLiveTracking = () => {
    if (!streamRef.current || !calibration) return;
    setIsRecording(true);
    setReps([]);

    const stop = analyzeBarStream(
      streamRef.current,
      calibration,
      actualFps,
      loadKg ? parseFloat(loadKg) : undefined,
      (rep) => setReps((prev) => [...prev, rep]),
      (v) => setLiveVelocity(v)
    );
    stopLiveRef.current = stop;
  };

  const stopLiveTracking = () => {
    stopLiveRef.current?.();
    stopLiveRef.current = null;
    setIsRecording(false);
    setStep('results');
    stopCamera();
  };

  const saveSession = async () => {
    if (!user || reps.length === 0) return;
    setSaving(true);
    setError('');

    try {
      const validReps = reps.filter((r) => r.isValid);
      const allSamples = validReps.flatMap((r) => r.velocitySamples);
      const peakV = calcPeakVelocity(allSamples);
      const meanV =
        validReps.reduce((s, r) => s + r.meanConcentricVelocityMs, 0) / validReps.length;
      const velocityLoss = calcVelocityLoss(validReps);
      const avgPower =
        validReps.filter((r) => r.estimatedPowerW).reduce((s, r) => s + (r.estimatedPowerW || 0), 0) /
        Math.max(1, validReps.filter((r) => r.estimatedPowerW).length);
      const mass = parseFloat(loadKg);

      const { data: session, error: sessionErr } = await (supabase as any)
        .from('bar_velocity_sessions')
        .insert({
          athlete_id: user.id,
          session_date: new Date().toISOString().split('T')[0],
          exercise_name: exerciseName.trim() || null,
          load_kg: !isNaN(mass) && mass > 0 ? mass : null,
          total_reps: validReps.length,
          peak_velocity_ms: peakV,
          mean_concentric_velocity_ms: meanV,
          velocity_loss_pct: velocityLoss,
          estimated_power_w: avgPower > 0 ? avgPower : null,
          fps: actualFps,
          notes: notes.trim() || null,
        })
        .select()
        .single();

      if (sessionErr) throw sessionErr;

      const repRows = validReps.map((r) => ({
        session_id: (session as any).id,
        rep_number: r.repNumber,
        mean_concentric_velocity_ms: r.meanConcentricVelocityMs,
        peak_velocity_ms: r.peakVelocityMs,
        mean_eccentric_velocity_ms: r.meanEccentricVelocityMs,
        concentric_duration_ms: r.concentricDurationMs,
        eccentric_duration_ms: r.eccentricDurationMs,
        displacement_mm: r.displacementMm,
        estimated_power_w: r.estimatedPowerW || null,
        velocity_samples: r.velocitySamples,
        timestamps_ms: r.timestampsMs,
        is_valid: r.isValid,
      }));

      const { error: repsErr } = await (supabase as any)
        .from('bar_velocity_reps')
        .insert(repRows);

      if (repsErr) throw repsErr;
      setSaved(true);
    } catch {
      setError(txt.saveError);
    } finally {
      setSaving(false);
    }
  };

  const resetSession = () => {
    setStep('setup');
    setReps([]);
    setCalibration(null);
    setSaved(false);
    setError('');
    setIsRecording(false);
    setLiveVelocity(0);
    stopCamera();
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col overflow-hidden font-body ${isDark ? 'bg-gray-950' : 'bg-white'}`}>
      <div className={`flex items-center gap-3 px-4 py-3 border-b shrink-0 backdrop-blur-sm ${isDark ? 'border-gray-800 bg-gray-900/80' : 'border-gray-200 bg-gray-50/80'}`}>
        <button onClick={onClose} className={`transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className={`text-base font-heading font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{txt.title}</h2>
          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{txt.subtitle}</p>
        </div>
        <div className="ml-auto flex gap-1">
          <button
            onClick={() => setTab('session')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === 'session' ? 'bg-primary/20 text-primary' : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {txt.session}
          </button>
          <button
            onClick={() => setTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === 'history' ? 'bg-primary/20 text-primary' : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'history' ? (
          <div className="p-4">
            <BarVelocityHistory />
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {step === 'setup' && (
              <>
                <div className={`rounded-2xl p-4 border space-y-3 ${isDark ? 'bg-gray-800/50 border-gray-700/40' : 'bg-gray-50 border-gray-200'}`}>
                  <h3 className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
                    <Settings className="w-3.5 h-3.5" />
                    {txt.sessionConfig}
                  </h3>
                  <div>
                    <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>{txt.exercise}</label>
                    <input
                      type="text"
                      value={exerciseName}
                      onChange={(e) => setExerciseName(e.target.value)}
                      placeholder={txt.exercisePlaceholder}
                      className={`w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 border ${isDark ? 'bg-gray-700/60 border-gray-600/50 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>{txt.load}</label>
                    <input
                      type="number"
                      value={loadKg}
                      onChange={(e) => setLoadKg(e.target.value)}
                      placeholder={txt.loadPlaceholder}
                      min="0"
                      className={`w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 border ${isDark ? 'bg-gray-700/60 border-gray-600/50 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                    />
                    {loadKg && (
                      <p className="text-xs text-gray-500 mt-1">
                        {txt.force}: {(parseFloat(loadKg) * 9.81).toFixed(0)} N — {txt.forceNote}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className={`block text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>{txt.captureMode}</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setCaptureMode('video')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-colors ${
                        captureMode === 'video'
                          ? 'bg-primary/15 border-primary/40 text-primary'
                          : isDark ? 'bg-gray-800/50 border-gray-700/30 text-gray-400 hover:border-gray-600' : 'bg-gray-50 border-gray-300 text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      <Video className="w-6 h-6" />
                      <div className="text-center">
                        <div className="text-sm font-medium">{txt.recordAnalyze}</div>
                        <div className="text-xs opacity-70">{txt.videoPost}</div>
                      </div>
                    </button>
                    <button
                      onClick={() => setCaptureMode('live')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-colors ${
                        captureMode === 'live'
                          ? 'bg-green-500/15 border-green-500/40 text-green-400'
                          : isDark ? 'bg-gray-800/50 border-gray-700/30 text-gray-400 hover:border-gray-600' : 'bg-gray-50 border-gray-300 text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      <Camera className="w-6 h-6" />
                      <div className="text-center">
                        <div className="text-sm font-medium">{txt.realTime}</div>
                        <div className="text-xs opacity-70">{txt.instantFeedback}</div>
                      </div>
                    </button>
                  </div>
                </div>

                <div className={`border rounded-2xl p-3 text-xs space-y-1 ${isDark ? 'bg-gray-800/40 border-gray-700/30 text-gray-400' : 'bg-gray-50 border-gray-300 text-gray-700'}`}>
                  <p className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{txt.prepTitle}</p>
                  <ul className={`list-disc list-inside space-y-0.5 ${isDark ? 'text-gray-400/80' : 'text-gray-700/80'}`}>
                    {txt.prepItems.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => setStep('calibration')}
                  className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-gray-900 font-semibold py-3 rounded-xl transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  {txt.toCalibration}
                </button>
              </>
            )}

            {step === 'calibration' && (
              <BarCalibration videoRef={videoRef} onCalibrated={handleCalibrated} />
            )}

            {step === 'recording' && (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden bg-gray-900" style={{ minHeight: '56vw', maxHeight: '65vh' }}>
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover absolute inset-0"
                    playsInline
                    muted
                    autoPlay
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <div className="bg-black/60 rounded-full px-2 py-1 text-xs text-white flex items-center gap-1">
                      <Video className="w-3 h-3 text-green-400" />
                      {actualFps} fps
                    </div>
                    {calibration && (
                      <div className="bg-primary/80 rounded-full px-2 py-1 text-xs text-gray-900 flex items-center gap-1 font-semibold">
                        <CheckCircle className="w-3 h-3" />
                        {txt.calibrated}
                      </div>
                    )}
                  </div>

                  {isRecording && captureMode === 'live' && (
                    <div className="absolute top-3 right-3">
                      <div className="bg-black/60 rounded-xl px-3 py-2 text-center">
                        <div className={`text-2xl font-bold ${liveVelocity > 0.8 ? 'text-primary' : liveVelocity > 0.4 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {Math.abs(liveVelocity).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-300">m/s</div>
                      </div>
                    </div>
                  )}

                  {isRecording && (
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="bg-black/60 rounded-lg px-3 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-xs text-white">
                            {captureMode === 'live' ? `${txt.repsDetected} ${reps.length}` : txt.recording}
                          </span>
                        </div>
                        {captureMode === 'live' && reps.length > 0 && (
                          <span className="text-xs text-primary font-semibold">
                            {txt.last} {reps[reps.length - 1].meanConcentricVelocityMs.toFixed(2)} m/s
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {captureMode === 'video' ? (
                  <div className="space-y-2">
                    {!isRecording ? (
                      <button
                        onClick={startVideoRecording}
                        className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl transition-colors"
                      >
                        <div className="w-3 h-3 rounded-full bg-white" />
                        {txt.startRecording}
                      </button>
                    ) : (
                      <button
                        onClick={stopVideoRecording}
                        className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-xl transition-colors"
                      >
                        <Square className="w-4 h-4" />
                        {txt.stopAnalyze}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {!isRecording ? (
                      <button
                        onClick={startLiveTracking}
                        className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-colors"
                      >
                        <Play className="w-4 h-4" />
                        {txt.startLive}
                      </button>
                    ) : (
                      <button
                        onClick={stopLiveTracking}
                        className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-xl transition-colors"
                      >
                        <Square className="w-4 h-4" />
                        {txt.stopSet}
                      </button>
                    )}
                  </div>
                )}

                {reps.length > 0 && captureMode === 'live' && (
                  <div className="bg-gray-800/50 rounded-2xl p-3 border border-gray-700/30">
                    <div className="text-xs text-gray-400 mb-2">{txt.liveProgress}</div>
                    <div className="flex items-end gap-1.5 h-12">
                      {reps.map((r, idx) => (
                        <div key={idx} className="flex-1 flex items-end">
                          <div
                            className="w-full rounded-t bg-primary"
                            style={{ height: `${(r.meanConcentricVelocityMs / 2) * 100}%`, minHeight: 4 }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 'analyzing' && (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Loader className="w-8 h-8 text-primary animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-white font-semibold">{txt.analyzing}</p>
                  <p className="text-sm text-gray-400 mt-1">{txt.analyzingDesc}</p>
                </div>
              </div>
            )}

            {step === 'results' && (
              <div className="space-y-4">
                {reps.length === 0 ? (
                  <div className="text-center py-10 space-y-3">
                    <AlertCircle className="w-10 h-10 text-yellow-400 mx-auto" />
                    <p className="text-gray-300 font-medium">{txt.noReps}</p>
                    <p className="text-sm text-gray-400">{txt.noRepsDesc}</p>
                    <button
                      onClick={resetSession}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm transition-colors"
                    >
                      {txt.tryAgain}
                    </button>
                  </div>
                ) : (
                  <>
                    <BarVelocityResultsPanel
                      reps={reps}
                      loadKg={loadKg ? parseFloat(loadKg) : undefined}
                      exerciseName={exerciseName || undefined}
                    />

                    <div>
                      <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>{txt.notes}</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={txt.notesPlaceholder}
                        rows={2}
                        className={`w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/50 resize-none border ${isDark ? 'bg-gray-700/60 border-gray-600/50 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                      />
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <X className="w-4 h-4 text-red-400 shrink-0" />
                        <p className="text-xs text-red-300">{error}</p>
                      </div>
                    )}

                    {saved ? (
                      <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-2xl">
                        <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-green-400">{txt.sessionSaved}</p>
                          <p className="text-xs text-green-400/70">{txt.viewHistory}</p>
                        </div>
                        <button
                          onClick={resetSession}
                          className="ml-auto text-xs text-gray-400 hover:text-white flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {txt.newSet}
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={resetSession}
                          className="flex-1 py-3 rounded-xl border border-gray-600 text-gray-400 hover:text-white hover:border-gray-500 text-sm transition-colors"
                        >
                          {txt.newSet}
                        </button>
                        <button
                          onClick={saveSession}
                          disabled={saving}
                          className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:bg-gray-700 disabled:text-gray-500 text-gray-900 font-semibold py-3 rounded-xl transition-colors text-sm"
                        >
                          <Save className="w-4 h-4" />
                          {saving ? txt.saving : txt.saveSet}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
