import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Play, Pause, X, CheckCircle,
  ChevronRight, ChevronLeft, AlertTriangle, MapPin, Clock, Zap, Mountain, Flag,
  Flame, Timer, ChevronDown, ChevronUp, RotateCcw, BatteryCharging, WifiOff,
  Droplets, Coffee, Sandwich
} from 'lucide-react';
import { type RacePlan, type FuelAlert, buildFuelSchedule } from '../../utils/fuelSchedule';
import { useGPSPermission } from '../../hooks/useGPSPermission';
import {
  calculateTotalDistance,
  calculateElevationGain,
  calculateAverageSpeed,
  formatDuration,
  getGPSWatchPositionAsync,
  clearGPSWatchAsync,
  GPSFilter,
  acquireWakeLock,
  releaseWakeLock,
  registerGPSBackgroundReconnect,
  unregisterGPSBackgroundReconnect,
  persistSessionPoint,
  loadPersistedSession,
  clearPersistedSession,
  startNativeBackgroundLocation,
  stopNativeBackgroundLocation,
} from '../../utils/gpsRecording';
import { useLanguage } from '../../contexts/LanguageContext';
import ActivityShareCard from './ActivityShareCard';
import ActivitySummaryScreen from './ActivitySummaryScreen';
import { type EnduranceWorkout, type WorkoutStep } from './EnduranceWorkoutCard';

interface ActivityRecorderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ActivityRecorderData) => Promise<void>;
  plannedWorkout?: EnduranceWorkout | null;
  racePlan?: RacePlan | null;
}

export interface ConsumedFuelEntry {
  time_min: number;
  label: string;
  carbs_g: number;
  fluid_ml: number;
  sodium_mg: number;
  caffeine_mg: number;
}

export interface ActivityRecorderData {
  sportType: 'run' | 'trail_run' | 'road_bike' | 'mountain_bike' | 'gravel_bike' | 'open_water_swim';
  title: string;
  notes: string;
  gpsPoints: Array<{
    latitude: number;
    longitude: number;
    altitude: number | null;
    timestamp: string;
  }>;
  distanceKm: number;
  durationSeconds: number;
  elevationGainM: number;
  isPublic: boolean;
  local_date: string;
  planned_workout_id?: string | null;
  race_plan_id?: string | null;
  consumedFuel?: ConsumedFuelEntry[];
  feedback?: {
    rpe: number;
    energy_level: string;
    pain_level: string;
    mood: string;
    feedback_notes: string;
  };
}

interface GPSPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp: number;
}

const SPORT_TYPES = [
  { id: 'run',             label: 'Run',              labelEs: 'Correr',          color: '#22c55e', maxSpeedKmh: 40  },
  { id: 'trail_run',       label: 'Trail Run',        labelEs: 'Trail',           color: '#84cc16', maxSpeedKmh: 35  },
  { id: 'road_bike',       label: 'Road Bike',        labelEs: 'Bicicleta Ruta',  color: '#3b82f6', maxSpeedKmh: 100 },
  { id: 'mountain_bike',   label: 'Mountain Bike',    labelEs: 'MTB',             color: '#f97316', maxSpeedKmh: 70  },
  { id: 'gravel_bike',     label: 'Gravel',           labelEs: 'Gravel',          color: '#a78bfa', maxSpeedKmh: 80  },
  { id: 'open_water_swim', label: 'Open Water Swim',  labelEs: 'Natación',        color: '#06b6d4', maxSpeedKmh: 10  },
];

type RecorderPhase = 'setup' | 'recording' | 'paused' | 'details' | 'feedback' | 'done';

export default function ActivityRecorder({ isOpen, onClose, onSave, plannedWorkout, racePlan }: ActivityRecorderProps) {
  const { language } = useLanguage();
  const { requestGPSPermission } = useGPSPermission();

  const [phase, setPhase] = useState<RecorderPhase>('setup');
  const [sportType, setSportType] = useState('run');
  const [gpsPoints, setGpsPoints] = useState<GPSPoint[]>([]);
  const [distanceKm, setDistanceKm] = useState(0);
  const [elevationGainM, setElevationGainM] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [savedData, setSavedData] = useState<ActivityRecorderData | null>(null);
  const [savedActivityId, setSavedActivityId] = useState<string | null>(null);
  const [showShareCard, setShowShareCard] = useState(false);

  // Laps & warm up
  const [lapPointIndices, setLapPointIndices] = useState<number[]>([]);
  const [warmUpEndIndex, setWarmUpEndIndex] = useState<number | null>(null);
  const [lapFlash, setLapFlash] = useState<string | null>(null);
  const [warmUpFlash, setWarmUpFlash] = useState(false);
  const [excludeWarmUp, setExcludeWarmUp] = useState(false);

  // Feedback state
  const [feedbackStep, setFeedbackStep] = useState(1);
  const [feedback, setFeedback] = useState({
    rpe: 5,
    energy_level: 'normal',
    pain_level: 'none',
    mood: 'normal',
    feedback_notes: '',
  });

  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [recoveredSession, setRecoveredSession] = useState<{ sportType: string; points: any[]; startTime: number } | null>(null);
  const startTimeRef = useRef<number>(0);

  // Planned workout step follower
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [stepElapsed, setStepElapsed] = useState(0);
  const [workoutPanelExpanded, setWorkoutPanelExpanded] = useState(true);
  const stepScrollRef = useRef<HTMLDivElement>(null);
  const activeStepRef = useRef<HTMLDivElement>(null);

  // Race plan fuel alerts
  const [fuelAlerts, setFuelAlerts] = useState<FuelAlert[]>([]);
  const [fuelPanelExpanded, setFuelPanelExpanded] = useState(true);
  const [activeFuelFlash, setActiveFuelFlash] = useState<FuelAlert | null>(null);
  const [consumedFuel, setConsumedFuel] = useState<ConsumedFuelEntry[]>([]);

  const watchIdRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pausedSecondsRef = useRef<number>(0);
  const recordingStartEpochRef = useRef<number>(0);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const startMarkerRef = useRef<any>(null);
  const currentMarkerRef = useRef<any>(null);
  const gpsFilterRef = useRef<GPSFilter | null>(null);

  const isRecording = phase === 'recording';
  const sport = SPORT_TYPES.find(s => s.id === sportType) || SPORT_TYPES[0];

  // Check for crash-recovered session on mount
  useEffect(() => {
    if (!isOpen) return;
    loadPersistedSession().then((session) => {
      if (session && session.points.length > 2) {
        setRecoveredSession(session);
      }
    });
  }, [isOpen]);

  useEffect(() => {
    if (isRecording) {
      recordingStartEpochRef.current = Date.now() - pausedSecondsRef.current * 1000;
      timerIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartEpochRef.current) / 1000);
        setDurationSeconds(elapsed);
      }, 500);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      pausedSecondsRef.current = durationSeconds;
    }
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [isRecording]);

  // Beep on step change using Web Audio API
  const playStepBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playTone = (freq: number, start: number, duration: number, gain: number) => {
        const osc = ctx.createOscillator();
        const vol = ctx.createGain();
        osc.connect(vol);
        vol.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        vol.gain.setValueAtTime(0, ctx.currentTime + start);
        vol.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.01);
        vol.gain.linearRampToValueAtTime(0, ctx.currentTime + start + duration);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };
      playTone(880, 0,    0.12, 0.4);
      playTone(1100, 0.15, 0.12, 0.5);
      setTimeout(() => ctx.close(), 600);
    } catch {}
  };

  // Build fuel alerts when racePlan changes
  useEffect(() => {
    if (!racePlan) { setFuelAlerts([]); return; }
    setFuelAlerts(buildFuelSchedule(racePlan));
  }, [racePlan]);

  // Fuel alert follower: check every second if an unacknowledged alert should fire
  useEffect(() => {
    if (!isRecording || !fuelAlerts.length) return;
    const elapsedMin = durationSeconds / 60;
    const nextAlert = fuelAlerts.find(a => !a.acknowledged && a.time_min > 0 && elapsedMin >= a.time_min);
    if (nextAlert) {
      // Mark as acknowledged in state
      setFuelAlerts(prev => prev.map(a => a === nextAlert ? { ...a, acknowledged: true } : a));
      // Play fuel beep — lower softer tone (3 pulses)
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const playTone = (freq: number, start: number, dur: number, gain: number) => {
          const osc = ctx.createOscillator();
          const vol = ctx.createGain();
          osc.connect(vol); vol.connect(ctx.destination);
          osc.type = 'sine'; osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
          vol.gain.setValueAtTime(0, ctx.currentTime + start);
          vol.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.02);
          vol.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur);
          osc.start(ctx.currentTime + start); osc.stop(ctx.currentTime + start + dur);
        };
        playTone(660, 0,    0.15, 0.5);
        playTone(660, 0.20, 0.15, 0.5);
        playTone(880, 0.40, 0.20, 0.6);
        setTimeout(() => ctx.close(), 900);
      } catch {}
      // Show flash notification for 6 seconds
      setActiveFuelFlash(nextAlert);
      setTimeout(() => setActiveFuelFlash(null), 6000);
    }
  }, [durationSeconds]);

  // Step follower: advance stepElapsed every second while recording
  useEffect(() => {
    if (!isRecording || !plannedWorkout?.steps?.length) return;
    const steps = plannedWorkout.steps;
    setStepElapsed(e => {
      const step = steps[activeStepIndex];
      if (!step) return 0;
      const stepDurationSec = step.duration_type === 'time' ? step.duration_value : Infinity;
      const next = e + 1;
      if (next >= stepDurationSec) {
        const nextIdx = activeStepIndex + 1 < steps.length ? activeStepIndex + 1 : activeStepIndex;
        if (nextIdx !== activeStepIndex) {
          setActiveStepIndex(nextIdx);
          playStepBeep();
        }
        return 0;
      }
      return next;
    });
  }, [durationSeconds]);

  // Auto-scroll active step into view
  useEffect(() => {
    if (activeStepRef.current && stepScrollRef.current) {
      activeStepRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeStepIndex]);

  // Load Leaflet and initialize map when recording starts
  useEffect(() => {
    if (phase !== 'recording' && phase !== 'paused') return;
    loadLeafletAndInitMap();
  }, [phase]);

  // Update map when GPS points change
  useEffect(() => {
    if (gpsPoints.length < 1 || !mapInstanceRef.current) return;
    updateMapRoute();
  }, [gpsPoints]);

  const loadLeafletAndInitMap = async () => {
    if (typeof window === 'undefined') return;
    if (!(window as any).L) {
      await new Promise<void>((resolve) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => resolve();
        document.head.appendChild(script);
      });
    }
    setTimeout(() => initMap(), 100);
  };

  const initMap = () => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current || mapInstanceRef.current) return;
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([40.4168, -3.7038], 16);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);
    mapInstanceRef.current = map;
  };

  const updateMapRoute = () => {
    const L = (window as any).L;
    if (!L || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const latlngs = gpsPoints.map(p => [p.latitude, p.longitude]);

    if (polylineRef.current) { map.removeLayer(polylineRef.current); }
    polylineRef.current = L.polyline(latlngs, {
      color: '#fdda36',
      weight: 6,
      opacity: 1,
      lineJoin: 'round',
      lineCap: 'round',
    }).addTo(map);

    if (startMarkerRef.current) { map.removeLayer(startMarkerRef.current); }
    startMarkerRef.current = L.circleMarker([gpsPoints[0].latitude, gpsPoints[0].longitude], {
      radius: 8, fillColor: '#22c55e', color: '#fff', weight: 3, fillOpacity: 1,
    }).addTo(map);

    if (currentMarkerRef.current) { map.removeLayer(currentMarkerRef.current); }
    const last = gpsPoints[gpsPoints.length - 1];
    currentMarkerRef.current = L.circleMarker([last.latitude, last.longitude], {
      radius: 10, fillColor: '#fdda36', color: '#080c10', weight: 3, fillOpacity: 1,
    }).addTo(map);

    if (gpsPoints.length >= 2) {
      map.fitBounds(polylineRef.current.getBounds(), { padding: [80, 80] });
    } else {
      map.setView([last.latitude, last.longitude], 17);
    }
  };

  const cleanupMap = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      polylineRef.current = null;
      startMarkerRef.current = null;
      currentMarkerRef.current = null;
    }
  };

  const buildGPSHandlers = (onPoint: (p: GPSPoint) => void) => {
    const onSuccess = (position: GeolocationPosition) => {
      setGpsAccuracy(position.coords.accuracy);
      const filtered = gpsFilterRef.current?.process(position);
      if (filtered) onPoint(filtered);
    };
    const onError = (err: GeolocationPositionError) => {
      if (err.code === err.PERMISSION_DENIED) {
        setError(language === 'es' ? 'Permiso GPS denegado.' : 'GPS permission denied.');
        setPhase('setup');
      }
    };
    return { onSuccess, onError };
  };

  const startGPSWatch = async (onPoint: (p: GPSPoint) => void): Promise<number> => {
    const { onSuccess, onError } = buildGPSHandlers(onPoint);
    const watchId = await getGPSWatchPositionAsync(onSuccess, onError);

    registerGPSBackgroundReconnect(
      (newWatchId) => {
        if (watchIdRef.current !== null) {
          clearGPSWatchAsync(watchIdRef.current);
        }
        watchIdRef.current = newWatchId;
        gpsFilterRef.current?.reset();
      },
      onSuccess,
      onError
    );

    return watchId;
  };

  const handleStart = async () => {
    setError(null);
    setIsRequestingPermission(true);
    try {
      const perm = await requestGPSPermission();
      if (perm.state !== 'granted') { setError(perm.message); setIsRequestingPermission(false); return; }

      await clearPersistedSession();
      setGpsPoints([]);
      setDistanceKm(0);
      setElevationGainM(0);
      setDurationSeconds(0);
      setGpsAccuracy(null);
      pausedSecondsRef.current = 0;
      startTimeRef.current = Date.now();
      gpsFilterRef.current = new GPSFilter(sport.maxSpeedKmh);

      // Acquire Wake Lock to keep screen/GPS alive
      acquireWakeLock().then(() => setWakeLockActive(true)).catch(() => {});
      // On iOS native: activate background GPS (allowsBackgroundLocationUpdates, etc.)
      startNativeBackgroundLocation().catch(() => {});

      setPhase('recording');
      setIsRequestingPermission(false);
      watchIdRef.current = await startGPSWatch((point) => {
        persistSessionPoint(sportType, startTimeRef.current, point);
        setGpsPoints(prev => {
          const updated = [...prev, point];
          if (updated.length >= 2) {
            setDistanceKm(calculateTotalDistance(updated));
            setElevationGainM(calculateElevationGain(updated));
          }
          return updated;
        });
      });
    } catch {
      setError(language === 'es' ? 'No se pudo acceder al GPS.' : 'Could not access GPS.');
      setIsRequestingPermission(false);
    }
  };

  const handlePause = () => {
    if (watchIdRef.current !== null) { clearGPSWatchAsync(watchIdRef.current); watchIdRef.current = null; }
    unregisterGPSBackgroundReconnect();
    setPhase('paused');
  };

  const handleResume = async () => {
    // Reset filter so it re-stabilises from the new position after the pause gap
    gpsFilterRef.current?.reset();
    setPhase('recording');
    watchIdRef.current = await startGPSWatch((point) => {
      persistSessionPoint(sportType, startTimeRef.current, point);
      setGpsPoints(prev => {
        const updated = [...prev, point];
        setDistanceKm(calculateTotalDistance(updated));
        setElevationGainM(calculateElevationGain(updated));
        return updated;
      });
    });
  };

  const handleFinish = () => {
    if (watchIdRef.current !== null) { clearGPSWatchAsync(watchIdRef.current); watchIdRef.current = null; }
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    unregisterGPSBackgroundReconnect();
    releaseWakeLock().then(() => setWakeLockActive(false)).catch(() => {});
    stopNativeBackgroundLocation().catch(() => {});
    cleanupMap();
    setPhase('details');
  };

  const handleDiscard = () => {
    if (watchIdRef.current !== null) { clearGPSWatchAsync(watchIdRef.current); watchIdRef.current = null; }
    unregisterGPSBackgroundReconnect();
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    releaseWakeLock().then(() => setWakeLockActive(false)).catch(() => {});
    stopNativeBackgroundLocation().catch(() => {});
    clearPersistedSession();
    cleanupMap();
    setGpsPoints([]); setDistanceKm(0); setElevationGainM(0); setDurationSeconds(0);
    setTitle(''); setNotes(''); setError(null); setPhase('setup');
    setFeedbackStep(1); setFeedback({ rpe: 5, energy_level: 'normal', pain_level: 'none', mood: 'normal', feedback_notes: '' });
    setLapPointIndices([]); setWarmUpEndIndex(null); setExcludeWarmUp(false);
    setRecoveredSession(null);
    setConsumedFuel([]); setActiveFuelFlash(null);
    if (racePlan) setFuelAlerts(buildFuelSchedule(racePlan));
  };

  const handleLap = () => {
    const idx = gpsPoints.length > 0 ? gpsPoints.length - 1 : 0;
    setLapPointIndices(prev => [...prev, idx]);
    const lapNum = lapPointIndices.length + 1;
    setLapFlash(language === 'es' ? `Vuelta ${lapNum} marcada` : `Lap ${lapNum} marked`);
    setTimeout(() => setLapFlash(null), 2000);
  };

  const handleFinishWarmUp = () => {
    if (warmUpEndIndex !== null) return;
    const idx = gpsPoints.length > 0 ? gpsPoints.length - 1 : 0;
    setWarmUpEndIndex(idx);
    setWarmUpFlash(true);
    setTimeout(() => setWarmUpFlash(false), 2500);
  };

  const handleSaveDetails = () => {
    if (gpsPoints.length < 2) { setError(language === 'es' ? 'Se necesitan al menos 2 puntos GPS.' : 'Need at least 2 GPS points.'); return; }
    setPhase('feedback');
  };

  const handleSubmitFeedback = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const activityStartDate = gpsPoints.length > 0
        ? new Date(gpsPoints[0].timestamp)
        : new Date();
      const localDate = `${activityStartDate.getFullYear()}-${String(activityStartDate.getMonth() + 1).padStart(2, '0')}-${String(activityStartDate.getDate()).padStart(2, '0')}`;

      const data: ActivityRecorderData = {
        sportType: sportType as any,
        title: title || (language === 'es' ? sport.labelEs : sport.label),
        notes,
        gpsPoints: gpsPoints.map(p => ({
          latitude: p.latitude, longitude: p.longitude,
          altitude: p.altitude || null,
          timestamp: new Date(p.timestamp).toISOString(),
        })),
        distanceKm, durationSeconds, elevationGainM, isPublic,
        local_date: localDate,
        planned_workout_id: plannedWorkout?.id ?? null,
        race_plan_id: racePlan?.id ?? null,
        consumedFuel: consumedFuel.length > 0 ? consumedFuel : undefined,
        feedback,
      };

      const { data: sessionData } = await supabase.auth.getSession();
      const authToken = sessionData?.session?.access_token;
      if (!authToken) throw new Error('Authentication token not found');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const response = await fetch(`${supabaseUrl}/functions/v1/save-activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save activity');
      }

      const responseJson = await response.json().catch(() => null);
      const returnedActivityId: string | null = responseJson?.activityId ?? responseJson?.id ?? responseJson?.activity_id ?? null;

      await onSave(data);
      await clearPersistedSession();
      setSavedData(data);
      setSavedActivityId(returnedActivityId);
      setPhase('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save activity');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    cleanupMap();
    handleDiscard();
    setSavedData(null);
    setSavedActivityId(null);
    setShowShareCard(false);
    onClose();
  };

  if (!isOpen) return null;

  const avgSpeed = calculateAverageSpeed(distanceKm, durationSeconds);

  const getPace = () => {
    if (!distanceKm || !durationSeconds) return null;
    if (['road_bike', 'mountain_bike', 'gravel_bike'].includes(sportType)) {
      return { value: avgSpeed.toFixed(1), unit: 'km/h' };
    }
    const minPerKm = durationSeconds / 60 / distanceKm;
    const mins = Math.floor(minPerKm);
    const secs = Math.round((minPerKm - mins) * 60);
    return { value: `${mins}:${String(secs).padStart(2, '0')}`, unit: 'min/km' };
  };

  // Stats excluding warm up (used in details screen)
  const getFilteredStats = (exclude: boolean) => {
    if (!exclude || warmUpEndIndex === null || warmUpEndIndex >= gpsPoints.length - 1) {
      return { distanceKm, durationSeconds, elevationGainM };
    }
    const filtered = gpsPoints.slice(warmUpEndIndex + 1);
    if (filtered.length < 2) return { distanceKm, durationSeconds, elevationGainM };
    const warmUpDurationFraction = (warmUpEndIndex + 1) / gpsPoints.length;
    const warmUpSeconds = Math.round(durationSeconds * warmUpDurationFraction);
    return {
      distanceKm: calculateTotalDistance(filtered),
      durationSeconds: durationSeconds - warmUpSeconds,
      elevationGainM: calculateElevationGain(filtered),
    };
  };

  const getPaceForStats = (dist: number, dur: number) => {
    if (!dist || !dur) return null;
    if (['road_bike', 'mountain_bike', 'gravel_bike'].includes(sportType)) {
      return { value: calculateAverageSpeed(dist, dur).toFixed(1), unit: 'km/h' };
    }
    const minPerKm = dur / 60 / dist;
    const mins = Math.floor(minPerKm);
    const secs = Math.round((minPerKm - mins) * 60);
    return { value: `${mins}:${String(secs).padStart(2, '0')}`, unit: 'min/km' };
  };

  // ── SHARE CARD ──────────────────────────────────────────────────────────────
  if (showShareCard && savedData) {
    return (
      <ActivityShareCard
        activityData={{
          sportType: savedData.sportType,
          title: savedData.title,
          distanceKm: savedData.distanceKm,
          durationSeconds: savedData.durationSeconds,
          elevationGainM: savedData.elevationGainM,
          date: savedData.local_date || new Date().toISOString().split('T')[0],
          gpsPoints: savedData.gpsPoints,
        }}
        onClose={() => setShowShareCard(false)}
      />
    );
  }

  // ── DONE — premium summary screen ───────────────────────────────────────────
  if (phase === 'done' && savedData) {
    return (
      <ActivitySummaryScreen
        data={savedData}
        activityId={savedActivityId}
        plannedWorkout={plannedWorkout}
        racePlanName={racePlan?.race_name ?? null}
        onShare={() => setShowShareCard(true)}
        onClose={handleClose}
      />
    );
  }

  // ── FEEDBACK (5 steps) ───────────────────────────────────────────────────────
  if (phase === 'feedback') {
    const showWarning = feedback.rpe > 9 || feedback.pain_level === 'moderate' || feedback.pain_level === 'strong';
    const totalFeedbackSteps = 5;
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {language === 'es' ? 'Comentarios de la Sesión' : 'Session Feedback'}
              </h2>
              <button onClick={() => setPhase('details')} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: totalFeedbackSteps }).map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i + 1 <= feedbackStep ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {language === 'es' ? `Pregunta ${feedbackStep} de ${totalFeedbackSteps}` : `Question ${feedbackStep} of ${totalFeedbackSteps}`}
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {feedbackStep === 1 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    {language === 'es' ? '1. Esfuerzo general (RPE)' : '1. Overall Effort (RPE)'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {language === 'es' ? '¿Qué tan dura fue esta sesión? (1-10)' : 'How hard did this session feel? (1-10)'}
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{language === 'es' ? 'Muy fácil' : 'Very easy'}</span>
                    <span className="text-4xl font-bold" style={{ color: sport.color }}>{feedback.rpe}</span>
                    <span className="text-sm text-gray-500">{language === 'es' ? 'Máximo' : 'Max effort'}</span>
                  </div>
                  <input type="range" min="1" max="10" value={feedback.rpe}
                    onChange={e => setFeedback({ ...feedback, rpe: parseInt(e.target.value) })}
                    className="w-full h-3 rounded-lg appearance-none cursor-pointer"
                    style={{ background: `linear-gradient(to right, ${sport.color} 0%, ${sport.color} ${((feedback.rpe-1)/9)*100}%, #e5e7eb ${((feedback.rpe-1)/9)*100}%, #e5e7eb 100%)` }}
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    {[1,2,3,4,5,6,7,8,9,10].map(n => <span key={n}>{n}</span>)}
                  </div>
                </div>
                {feedback.rpe > 9 && (
                  <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-orange-800 dark:text-orange-300">
                      {language === 'es' ? 'Tu entrenador recibirá notificación de este esfuerzo elevado.' : 'Your coach will be notified about this high effort.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {feedbackStep === 2 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    {language === 'es' ? '2. Nivel de energía' : '2. Energy Level'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {language === 'es' ? '¿Cómo estuvo tu energía durante la sesión?' : 'How was your energy during the session?'}
                  </p>
                </div>
                {[
                  { value: 'very_low', en: 'Very low', es: 'Muy bajo', emoji: '😴' },
                  { value: 'low', en: 'Low', es: 'Bajo', emoji: '😕' },
                  { value: 'normal', en: 'Normal', es: 'Normal', emoji: '😐' },
                  { value: 'high', en: 'High', es: 'Alto', emoji: '😊' },
                  { value: 'very_high', en: 'Very high', es: 'Muy alto', emoji: '🔥' },
                ].map(o => (
                  <button key={o.value} onClick={() => setFeedback({ ...feedback, energy_level: o.value })}
                    className={`w-full p-3.5 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${feedback.energy_level === o.value ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                    <span className="text-2xl">{o.emoji}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{language === 'es' ? o.es : o.en}</span>
                  </button>
                ))}
              </div>
            )}

            {feedbackStep === 3 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    {language === 'es' ? '3. Sensaciones musculares' : '3. Muscle & Joint Feeling'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {language === 'es' ? '¿Sentiste algún dolor o molestia inusual?' : 'Did you feel any pain or unusual discomfort?'}
                  </p>
                </div>
                {[
                  { value: 'none', en: 'None', es: 'Ninguno', emoji: '✅' },
                  { value: 'mild', en: 'Mild', es: 'Leve', emoji: '⚠️' },
                  { value: 'moderate', en: 'Moderate', es: 'Moderado', emoji: '🔶' },
                  { value: 'strong', en: 'Strong', es: 'Fuerte', emoji: '🚨' },
                ].map(o => (
                  <button key={o.value} onClick={() => setFeedback({ ...feedback, pain_level: o.value })}
                    className={`w-full p-3.5 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${feedback.pain_level === o.value ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                    <span className="text-2xl">{o.emoji}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{language === 'es' ? o.es : o.en}</span>
                  </button>
                ))}
                {(feedback.pain_level === 'moderate' || feedback.pain_level === 'strong') && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-800 dark:text-red-300">
                      {language === 'es' ? 'Tu entrenador recibirá notificación sobre este dolor.' : 'Your coach will be notified about this pain.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {feedbackStep === 4 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    {language === 'es' ? '4. Estado de ánimo' : '4. Mood'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {language === 'es' ? '¿Cómo estuvo tu ánimo y motivación?' : 'How was your mood and motivation?'}
                  </p>
                </div>
                {[
                  { value: 'very_low', en: 'Very low', es: 'Muy bajo', emoji: '😞' },
                  { value: 'low', en: 'Low', es: 'Bajo', emoji: '😐' },
                  { value: 'normal', en: 'Normal', es: 'Normal', emoji: '🙂' },
                  { value: 'high', en: 'High', es: 'Alto', emoji: '😄' },
                  { value: 'very_high', en: 'Very high', es: 'Muy alto', emoji: '🤩' },
                ].map(o => (
                  <button key={o.value} onClick={() => setFeedback({ ...feedback, mood: o.value })}
                    className={`w-full p-3.5 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${feedback.mood === o.value ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                    <span className="text-2xl">{o.emoji}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{language === 'es' ? o.es : o.en}</span>
                  </button>
                ))}
              </div>
            )}

            {feedbackStep === 5 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    {language === 'es' ? '5. Observaciones personales' : '5. Personal Notes'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {language === 'es' ? 'Sueño, estrés, técnica, condiciones...' : 'Sleep, stress, technique, conditions...'}
                  </p>
                </div>
                <textarea value={feedback.feedback_notes}
                  onChange={e => setFeedback({ ...feedback, feedback_notes: e.target.value })}
                  placeholder={language === 'es' ? 'Ej: Dormí 7h, lluvia intensa en los últimos 5km...' : 'E.g., Slept 7h, heavy rain in the last 5km...'}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none text-sm"
                />
                {showWarning && (
                  <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                    <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      {language === 'es' ? 'Tu entrenador recibirá notificación para revisar esta sesión.' : 'Your coach will receive a notification to review this session.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-sm">{error}</div>}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4 flex gap-3">
            {feedbackStep > 1 && (
              <button onClick={() => setFeedbackStep(s => s - 1)}
                className="flex items-center gap-1.5 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium">
                <ChevronLeft className="w-4 h-4" />
                {language === 'es' ? 'Anterior' : 'Back'}
              </button>
            )}
            {feedbackStep < totalFeedbackSteps ? (
              <button onClick={() => setFeedbackStep(s => s + 1)}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:opacity-90 transition-all font-semibold text-sm">
                {language === 'es' ? 'Siguiente' : 'Next'}
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmitFeedback} disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold text-sm disabled:opacity-50">
                <CheckCircle className="w-4 h-4" />
                {isSaving ? (language === 'es' ? 'Guardando...' : 'Saving...') : (language === 'es' ? 'Guardar Actividad' : 'Save Activity')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── DETAILS (title, notes, public) ──────────────────────────────────────────
  if (phase === 'details') {
    const filtered = getFilteredStats(excludeWarmUp);
    const pace = getPaceForStats(filtered.distanceKm, filtered.durationSeconds);
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] flex flex-col overflow-hidden">
          <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 p-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {language === 'es' ? 'Detalles de la Actividad' : 'Activity Details'}
            </h2>
            <button onClick={() => setPhase('paused')} className="p-1 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Warm up toggle — only shown if warm up was recorded */}
            {warmUpEndIndex !== null && (
              <div className={`rounded-xl border-2 transition-all overflow-hidden ${excludeWarmUp ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                <button
                  onClick={() => setExcludeWarmUp(e => !e)}
                  className="w-full flex items-center gap-3 p-3 text-left"
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${excludeWarmUp ? 'bg-orange-500' : 'bg-gray-100 dark:bg-gray-800'}`}>
                    <Flame className={`w-4 h-4 ${excludeWarmUp ? 'text-white' : 'text-orange-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${excludeWarmUp ? 'text-orange-700 dark:text-orange-300' : 'text-gray-900 dark:text-white'}`}>
                      {language === 'es' ? 'Excluir calentamiento del ritmo' : 'Exclude warm up from pace'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {excludeWarmUp
                        ? (language === 'es' ? 'Ritmo calculado sin el calentamiento' : 'Pace calculated without warm up')
                        : (language === 'es' ? 'Toca para excluir el calentamiento de las estadísticas' : 'Tap to exclude warm up from stats')}
                    </p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${excludeWarmUp ? 'bg-orange-500 border-orange-500' : 'border-gray-300 dark:border-gray-600'}`}>
                    {excludeWarmUp && <CheckCircle className="w-3 h-3 text-white" />}
                  </div>
                </button>
              </div>
            )}

            {/* Stats summary */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                <MapPin className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-gray-900 dark:text-white leading-none">{filtered.distanceKm.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">km</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                <Clock className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                <p className="text-base font-bold text-gray-900 dark:text-white leading-none">{formatDuration(filtered.durationSeconds)}</p>
                <p className="text-xs text-gray-500 mt-1">{language === 'es' ? 'tiempo' : 'time'}</p>
              </div>
              {pace ? (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                  <Zap className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                  <p className="text-base font-bold text-gray-900 dark:text-white leading-none">{pace.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{pace.unit}</p>
                </div>
              ) : (
                filtered.elevationGainM > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                    <Mountain className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                    <p className="text-base font-bold text-gray-900 dark:text-white leading-none">{Math.round(filtered.elevationGainM)}</p>
                    <p className="text-xs text-gray-500 mt-1">m D+</p>
                  </div>
                )
              )}
            </div>

            {/* Laps summary */}
            {lapPointIndices.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-center gap-2">
                <Timer className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                  {lapPointIndices.length} {language === 'es' ? `vuelta${lapPointIndices.length > 1 ? 's' : ''} registrada${lapPointIndices.length > 1 ? 's' : ''}` : `lap${lapPointIndices.length > 1 ? 's' : ''} recorded`}
                </p>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                {language === 'es' ? 'Nombre de la actividad' : 'Activity name'}
              </label>
              <input type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={language === 'es' ? `Ej: Carrera matutina en el parque` : `E.g.: Morning run in the park`}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                {language === 'es' ? 'Notas (opcional)' : 'Notes (optional)'}
              </label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder={language === 'es' ? 'Descripción del recorrido, condiciones, etc.' : 'Route description, conditions, etc.'}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none text-sm"
              />
            </div>

            {/* Public */}
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="w-4 h-4 rounded accent-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {language === 'es' ? 'Actividad pública' : 'Public activity'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {language === 'es' ? 'Visible en tu perfil público' : 'Visible on your public profile'}
                </p>
              </div>
            </label>

            {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-sm">{error}</div>}
          </div>

          <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4 flex gap-3">
            <button onClick={() => setPhase('paused')}
              className="flex items-center gap-1.5 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium">
              <ChevronLeft className="w-4 h-4" />
              {language === 'es' ? 'Volver' : 'Back'}
            </button>
            <button onClick={handleSaveDetails}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:opacity-90 transition-all font-semibold text-sm">
              {language === 'es' ? 'Continuar' : 'Continue'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP COLOURS ─────────────────────────────────────────────────────────────
  const STEP_STYLES: Record<string, { border: string; bg: string; label: string; labelEs: string }> = {
    warmup:   { border: '#F59E0B', bg: 'rgba(245,158,11,0.15)',  label: 'Warm Up',   labelEs: 'Entrada en calor' },
    steady:   { border: '#10B981', bg: 'rgba(16,185,129,0.15)',  label: 'Steady',    labelEs: 'Constante' },
    interval: { border: '#EF4444', bg: 'rgba(239,68,68,0.15)',   label: 'Interval',  labelEs: 'Intervalo' },
    recovery: { border: '#06B6D4', bg: 'rgba(6,182,212,0.15)',   label: 'Recovery',  labelEs: 'Recuperación' },
    cooldown: { border: '#818CF8', bg: 'rgba(129,140,248,0.15)', label: 'Cool Down', labelEs: 'Vuelta a la calma' },
  };

  const formatStepTarget = (step: WorkoutStep): string => {
    if (step.target_zone) return `Z${step.target_zone}`;
    if (step.target_min_value && step.target_max_value) {
      if (step.target_type === 'hr') return `${step.target_min_value}–${step.target_max_value} bpm`;
      if (step.target_type === 'power') return `${step.target_min_value}–${step.target_max_value} W`;
      if (step.target_type === 'pace') {
        const fmt = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
        return `${fmt(step.target_min_value)}–${fmt(step.target_max_value)} /km`;
      }
    }
    if (step.target_percent_ftp) return `${step.target_percent_ftp}% FTP`;
    return '';
  };

  const formatStepDuration = (step: WorkoutStep): string => {
    if (step.duration_type === 'time') return formatDuration(step.duration_value);
    return `${(step.duration_value / 1000).toFixed(1)} km`;
  };

  // ── RECORDING / PAUSED (fullscreen map) ─────────────────────────────────────
  if (phase === 'recording' || phase === 'paused') {
    const pace = getPace();
    const safeTop = 'env(safe-area-inset-top, 20px)';
    const safeBottom = 'env(safe-area-inset-bottom, 24px)';
    const hasPlanned = !!(plannedWorkout?.steps?.length);
    const hasRacePlan = !!(racePlan && fuelAlerts.length > 0);
    const steps = plannedWorkout?.steps ?? [];
    const currentStep = steps[activeStepIndex] ?? null;
    const currentStepStyle = currentStep ? (STEP_STYLES[currentStep.step_type] ?? STEP_STYLES.steady) : null;
    const stepDurationSec = currentStep?.duration_type === 'time' ? currentStep.duration_value : 0;
    const stepProgress = stepDurationSec > 0 ? Math.min(stepElapsed / stepDurationSec, 1) : 0;

    return (
      <div className="fixed inset-0 z-50 bg-black" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Map — smaller when planned workout or race plan is shown */}
        <div
          ref={mapContainerRef}
          style={{
            flex: (hasPlanned || hasRacePlan) ? '0 0 auto' : 1,
            height: (hasPlanned || hasRacePlan) ? '38vh' : undefined,
            minHeight: 0,
            position: 'relative',
            zIndex: 1,
          }}
        />

        {/* Top bar overlay — rendered on top of map using absolute positioning */}
        <div
          className="absolute left-0 right-0 flex items-center justify-between px-4 pb-3"
          style={{
            top: 0,
            paddingTop: `max(20px, ${safeTop})`,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 70%, transparent 100%)',
            zIndex: 2000,
            pointerEvents: 'auto',
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sport.color }} />
            <span className="text-white font-semibold text-sm drop-shadow">{language === 'es' ? sport.labelEs : sport.label}</span>
            {phase === 'paused' && (
              <span className="px-2 py-0.5 bg-yellow-500 text-white text-xs font-bold rounded-full shadow-md">
                {language === 'es' ? 'PAUSADO' : 'PAUSED'}
              </span>
            )}
            {phase === 'recording' && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full shadow-md">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                {language === 'es' ? 'GRABANDO' : 'RECORDING'}
              </span>
            )}
            {wakeLockActive && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-green-600/80 text-white text-xs font-semibold rounded-full shadow-md backdrop-blur-sm">
                <BatteryCharging className="w-3 h-3" />
                {language === 'es' ? 'GPS ACTIVO EN BACKGROUND' : 'GPS BACKGROUND ACTIVE'}
              </span>
            )}
            {!wakeLockActive && phase === 'recording' && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-500/80 text-white text-xs font-semibold rounded-full shadow-md backdrop-blur-sm">
                <WifiOff className="w-3 h-3" />
                {language === 'es' ? 'ACTIVAR BACKGROUND GPS' : 'ENABLE BACKGROUND GPS'}
              </span>
            )}
          </div>
          {phase === 'paused' && (
            <button onClick={() => {
              if (window.confirm(language === 'es' ? '¿Descartar esta actividad?' : 'Discard this activity?')) handleDiscard();
            }} className="p-2 bg-black/40 hover:bg-black/60 rounded-full transition-colors backdrop-blur-sm">
              <X className="w-5 h-5 text-white" />
            </button>
          )}
        </div>

        {/* ── Planned Workout Panel ─────────────────────────────────────── */}
        {hasPlanned && (
          <div
            className="flex-shrink-0 bg-gray-950 border-t border-white/10"
            style={{ zIndex: 2000, position: 'relative' }}
          >
            {/* Header: current step highlight + progress bar + toggle */}
            <div
              className="px-4 pt-3 pb-2 cursor-pointer select-none"
              onClick={() => setWorkoutPanelExpanded(e => !e)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  {currentStep && currentStepStyle && (
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                      style={{ backgroundColor: currentStepStyle.bg, color: currentStepStyle.border, border: `1px solid ${currentStepStyle.border}` }}
                    >
                      {language === 'es' ? currentStepStyle.labelEs : currentStepStyle.label}
                    </span>
                  )}
                  {currentStep && (
                    <span className="text-white text-sm font-semibold truncate">
                      {formatStepTarget(currentStep)}
                    </span>
                  )}
                  {currentStep && stepDurationSec > 0 && (
                    <span className="text-white/40 text-xs flex-shrink-0">
                      {formatDuration(Math.max(0, stepDurationSec - stepElapsed))} left
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className="text-white/40 text-xs">
                    {activeStepIndex + 1}/{steps.length}
                  </span>
                  {workoutPanelExpanded
                    ? <ChevronDown className="w-4 h-4 text-white/50" />
                    : <ChevronUp className="w-4 h-4 text-white/50" />
                  }
                </div>
              </div>
              {/* Step progress bar */}
              {stepDurationSec > 0 && (
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${stepProgress * 100}%`,
                      backgroundColor: currentStepStyle?.border ?? '#fdda36',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Scrollable step list */}
            {workoutPanelExpanded && (
              <div
                ref={stepScrollRef}
                className="overflow-y-auto px-3 pb-2"
                style={{ maxHeight: '22vh' }}
              >
                {steps.map((step, idx) => {
                  const s = STEP_STYLES[step.step_type] ?? STEP_STYLES.steady;
                  const isActive = idx === activeStepIndex;
                  const isDone = idx < activeStepIndex;
                  return (
                    <div
                      key={step.id ?? idx}
                      ref={isActive ? activeStepRef : undefined}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1.5 transition-all"
                      style={{
                        backgroundColor: isActive ? s.bg : 'transparent',
                        border: isActive ? `1px solid ${s.border}` : '1px solid transparent',
                        opacity: isDone ? 0.4 : 1,
                      }}
                      onClick={() => setActiveStepIndex(idx)}
                    >
                      {/* Step colour dot */}
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: isDone ? '#4b5563' : s.border }}
                      />
                      {/* Step name + target */}
                      <div className="flex-1 min-w-0">
                        <span
                          className="text-xs font-semibold"
                          style={{ color: isActive ? s.border : isDone ? '#6b7280' : '#d1d5db' }}
                        >
                          {language === 'es' ? s.labelEs : s.label}
                          {step.repeat_times && step.repeat_times > 1 ? ` ×${step.repeat_times}` : ''}
                        </span>
                        {formatStepTarget(step) && (
                          <span className="text-white/40 text-xs ml-1.5">{formatStepTarget(step)}</span>
                        )}
                      </div>
                      {/* Duration */}
                      <span className="text-xs flex-shrink-0" style={{ color: isActive ? '#fdda36' : '#6b7280' }}>
                        {formatStepDuration(step)}
                      </span>
                      {/* Active timer */}
                      {isActive && stepDurationSec > 0 && (
                        <span className="text-xs font-bold flex-shrink-0" style={{ color: s.border, minWidth: 36, textAlign: 'right' }}>
                          {formatDuration(Math.max(0, stepDurationSec - stepElapsed))}
                        </span>
                      )}
                      {isDone && (
                        <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 text-white/30" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Race Plan Fuel Alert Panel ────────────────────────────────── */}
        {hasRacePlan && (() => {
          const elapsedMin = durationSeconds / 60;
          const nextAlert = fuelAlerts.find(a => !a.acknowledged && a.time_min > 0);
          const minToNext = nextAlert ? Math.max(0, nextAlert.time_min - elapsedMin) : null;
          const doneCount = fuelAlerts.filter(a => a.acknowledged).length;
          const totalCount = fuelAlerts.filter(a => a.time_min > 0).length;
          const progressFrac = totalCount > 0 ? doneCount / totalCount : 0;

          return (
            <div className="flex-shrink-0 bg-gray-950 border-t border-white/10" style={{ zIndex: 2000, position: 'relative' }}>
              {/* Header */}
              <div className="px-4 pt-3 pb-2 cursor-pointer select-none" onClick={() => setFuelPanelExpanded(e => !e)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Flag className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                    <span className="text-white text-sm font-bold truncate">{racePlan!.race_name}</span>
                    {nextAlert && (
                      <span className="text-yellow-400 text-xs font-semibold flex-shrink-0">
                        {minToNext !== null && minToNext <= 2
                          ? (language === 'es' ? 'AHORA' : 'NOW')
                          : nextAlert.label.length > 28 ? nextAlert.label.slice(0, 28) + '…' : nextAlert.label}
                      </span>
                    )}
                    {!nextAlert && (
                      <span className="text-green-400 text-xs font-semibold flex-shrink-0">
                        {language === 'es' ? 'Plan completado' : 'Plan complete'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-white/40 text-xs">{doneCount}/{totalCount}</span>
                    {fuelPanelExpanded ? <ChevronDown className="w-4 h-4 text-white/50" /> : <ChevronUp className="w-4 h-4 text-white/50" />}
                  </div>
                </div>
                {/* Overall fuel progress bar */}
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000 bg-yellow-400" style={{ width: `${progressFrac * 100}%` }} />
                </div>
              </div>

              {/* Scrollable alert list */}
              {fuelPanelExpanded && (
                <div className="overflow-y-auto px-3 pb-2" style={{ maxHeight: '22vh' }}>
                  {fuelAlerts.filter(a => a.time_min > 0).map((alert, idx) => {
                    const isNext = alert === nextAlert;
                    const isDone = alert.acknowledged;
                    const atMin = alert.time_min;
                    const h = Math.floor(atMin / 60);
                    const m = atMin % 60;
                    const timeLabel = h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}min`;
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1.5 transition-all"
                        style={{
                          backgroundColor: isNext ? 'rgba(234,179,8,0.12)' : 'transparent',
                          border: isNext ? '1px solid rgba(234,179,8,0.4)' : '1px solid transparent',
                          opacity: isDone ? 0.4 : 1,
                        }}
                      >
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: isDone ? '#4b5563' : '#EAB308' }} />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-semibold" style={{ color: isNext ? '#EAB308' : isDone ? '#6b7280' : '#d1d5db' }}>
                            {alert.label}
                          </span>
                          <div className="flex gap-2 mt-0.5">
                            {alert.carbs_g > 0 && <span className="text-[10px] text-white/30">{alert.carbs_g}g</span>}
                            {alert.fluid_ml > 0 && <span className="text-[10px] text-white/30">{alert.fluid_ml}ml</span>}
                            {alert.caffeine_mg > 0 && <span className="text-[10px] text-yellow-500/60">{alert.caffeine_mg}mg caf</span>}
                          </div>
                        </div>
                        <span className="text-xs flex-shrink-0" style={{ color: isNext ? '#fdda36' : '#6b7280' }}>{timeLabel}</span>
                        {isDone && <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 text-white/30" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* Controls panel — fixed at bottom, always visible */}
        <div
          className="flex-shrink-0 bg-black"
          style={{
            paddingBottom: `max(28px, ${safeBottom})`,
            position: 'relative',
            zIndex: 2000,
          }}
        >
          {/* Stats row */}
          <div className="text-center pt-4 pb-1">
            <p className="text-6xl font-black text-white leading-none tracking-tight">
              {distanceKm.toFixed(2)}
            </p>
            <p className="text-xs font-bold uppercase tracking-widest mt-1" style={{ color: '#fdda36' }}>km</p>
          </div>

          <div className="grid grid-cols-3 gap-px mx-4 mt-1 mb-5">
            <div className="text-center py-2">
              <p className="text-lg font-bold text-white">{formatDuration(durationSeconds)}</p>
              <p className="text-xs text-white/50 mt-0.5 uppercase tracking-wide">{language === 'es' ? 'Tiempo' : 'Time'}</p>
            </div>
            <div className="text-center py-2 border-x border-white/10">
              {pace ? (
                <>
                  <p className="text-lg font-bold text-white">{pace.value}</p>
                  <p className="text-xs text-white/50 mt-0.5 uppercase tracking-wide">{pace.unit}</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-bold text-white">{avgSpeed.toFixed(1)}</p>
                  <p className="text-xs text-white/50 mt-0.5 uppercase tracking-wide">km/h</p>
                </>
              )}
            </div>
            <div className="text-center py-2">
              <p className="text-lg font-bold text-white">{elevationGainM > 0 ? `${Math.round(elevationGainM)}m` : '—'}</p>
              <p className="text-xs text-white/50 mt-0.5 uppercase tracking-wide">{language === 'es' ? 'Desnivel' : 'Elevation'}</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="px-6">
            {phase === 'recording' ? (
              <div className="flex items-center justify-center gap-8">
                <div className="flex flex-col items-center gap-1.5">
                  <button onClick={handleLap}
                    className="bg-white/15 hover:bg-white/25 rounded-full flex items-center justify-center border border-white/30 transition-all active:scale-95"
                    style={{ width: 56, height: 56 }}>
                    <Timer className="w-6 h-6 text-white" />
                  </button>
                  <span className="text-white/60 text-xs uppercase tracking-wide">{language === 'es' ? 'Vuelta' : 'Lap'}</span>
                </div>

                <button onClick={handlePause}
                  className="rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95"
                  style={{ width: 72, height: 72, backgroundColor: '#fdda36' }}>
                  <Pause className="w-8 h-8" style={{ color: '#080c10' }} />
                </button>

                <div className="flex flex-col items-center gap-1.5">
                  <button onClick={handleFinishWarmUp}
                    disabled={warmUpEndIndex !== null}
                    className={`rounded-full flex items-center justify-center border transition-all active:scale-95 ${warmUpEndIndex !== null ? 'bg-orange-500/80 border-orange-400/60 cursor-default' : 'bg-white/15 hover:bg-white/25 border-white/30'}`}
                    style={{ width: 56, height: 56 }}>
                    <Flame className={`w-6 h-6 ${warmUpEndIndex !== null ? 'text-white' : 'text-orange-400'}`} />
                  </button>
                  <span className="text-white/60 text-xs uppercase tracking-wide text-center leading-tight" style={{ maxWidth: 56 }}>
                    {warmUpEndIndex !== null
                      ? (language === 'es' ? 'Calent.' : 'Warm Up')
                      : (language === 'es' ? 'Fin Cal.' : 'End W/U')}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-8">
                <button onClick={handleResume}
                  className="bg-green-500 hover:bg-green-400 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95"
                  style={{ width: 68, height: 68 }}>
                  <Play className="w-8 h-8 text-white fill-white" />
                </button>
                <button onClick={handleFinish}
                  className="bg-white hover:bg-gray-100 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95"
                  style={{ width: 68, height: 68 }}>
                  <Flag className="w-8 h-8 text-gray-900" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Lap flash notification */}
        {lapFlash && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-white text-gray-900 px-5 py-2.5 rounded-full shadow-xl font-bold text-sm flex items-center gap-2 pointer-events-none"
            style={{ zIndex: 3000 }}>
            <Timer className="w-4 h-4 text-blue-600" />
            {lapFlash}
          </div>
        )}

        {/* Fuel alert flash notification */}
        {activeFuelFlash && (
          <div
            className="absolute left-1/2 -translate-x-1/2 pointer-events-auto"
            style={{ top: 'max(80px, calc(env(safe-area-inset-top, 20px) + 60px))', zIndex: 3000, minWidth: 260, maxWidth: '90vw' }}
          >
            <button
              onClick={() => {
                setConsumedFuel(prev => [...prev, {
                  time_min: activeFuelFlash.time_min,
                  label: activeFuelFlash.label,
                  carbs_g: activeFuelFlash.carbs_g,
                  fluid_ml: activeFuelFlash.fluid_ml,
                  sodium_mg: activeFuelFlash.sodium_mg,
                  caffeine_mg: activeFuelFlash.caffeine_mg,
                }]);
                setActiveFuelFlash(null);
              }}
              className="w-full bg-yellow-500 text-gray-900 px-5 py-3.5 rounded-2xl shadow-2xl font-bold text-sm flex flex-col gap-1.5 border-2 border-yellow-300 active:scale-95 transition-all"
            >
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 flex-shrink-0" />
                <span className="text-base font-black">{language === 'es' ? 'COMBUSTIBLE' : 'FUEL UP'}</span>
                <span className="ml-auto text-xs font-bold opacity-70">{language === 'es' ? 'TAP para confirmar' : 'TAP to confirm'}</span>
              </div>
              <span className="text-sm font-semibold opacity-90 truncate">{activeFuelFlash.label}</span>
              <div className="flex items-center gap-3 text-xs opacity-80">
                {activeFuelFlash.carbs_g > 0 && <span className="flex items-center gap-1"><Sandwich className="w-3 h-3" />{activeFuelFlash.carbs_g}g carbs</span>}
                {activeFuelFlash.fluid_ml > 0 && <span className="flex items-center gap-1"><Droplets className="w-3 h-3" />{activeFuelFlash.fluid_ml}ml</span>}
                {activeFuelFlash.caffeine_mg > 0 && <span className="flex items-center gap-1"><Coffee className="w-3 h-3" />{activeFuelFlash.caffeine_mg}mg caf</span>}
              </div>
            </button>
          </div>
        )}

        {/* Warm up finished flash */}
        {warmUpFlash && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-5 py-2.5 rounded-full shadow-xl font-bold text-sm flex items-center gap-2 pointer-events-none" style={{ zIndex: 3000 }}>
            <Flame className="w-4 h-4" />
            {language === 'es' ? 'Calentamiento terminado' : 'Warm up finished'}
          </div>
        )}

        {/* Warm up badge */}
        {warmUpEndIndex !== null && phase === 'recording' && (
          <div className="absolute left-4 flex items-center gap-1.5 bg-orange-500/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md"
            style={{ top: `max(80px, calc(${safeTop} + 60px))`, zIndex: 2500 }}>
            <Flame className="w-3 h-3 text-white" />
            <span className="text-white text-xs font-bold">{language === 'es' ? 'Calentamiento registrado' : 'Warm up tracked'}</span>
          </div>
        )}

        {/* Laps badge */}
        {lapPointIndices.length > 0 && (
          <div className="absolute right-4 flex items-center gap-1.5 bg-blue-500/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md"
            style={{ top: `max(80px, calc(${safeTop} + 60px))`, zIndex: 2500 }}>
            <Timer className="w-3 h-3 text-white" />
            <span className="text-white text-xs font-bold">{lapPointIndices.length} {language === 'es' ? 'vueltas' : 'laps'}</span>
          </div>
        )}

        {/* GPS accuracy badge — bottom left, above controls */}
        {gpsAccuracy !== null && (
          <div
            className="absolute left-4 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm"
            style={{
              bottom: `calc(max(28px, ${safeBottom}) + 180px)`,
              zIndex: 2500,
              backgroundColor: gpsAccuracy <= 10
                ? 'rgba(34,197,94,0.95)'
                : gpsAccuracy <= 25
                  ? 'rgba(234,179,8,0.95)'
                  : gpsAccuracy <= 50
                    ? 'rgba(249,115,22,0.95)'
                    : 'rgba(239,68,68,0.95)',
              color: '#fff',
            }}
          >
            <MapPin className="w-3 h-3" />
            {gpsAccuracy <= 10
              ? `GPS ±${Math.round(gpsAccuracy)}m`
              : gpsAccuracy <= 25
                ? `GPS ±${Math.round(gpsAccuracy)}m`
                : gpsAccuracy <= 50
                  ? (language === 'es' ? `GPS debil ±${Math.round(gpsAccuracy)}m` : `GPS weak ±${Math.round(gpsAccuracy)}m`)
                  : (language === 'es' ? `GPS muy debil ±${Math.round(gpsAccuracy)}m` : `GPS poor ±${Math.round(gpsAccuracy)}m`)
            }
          </div>
        )}

        {/* Accuracy warning overlay when GPS is very poor */}
        {gpsAccuracy !== null && gpsAccuracy > 50 && phase === 'recording' && (
          <div
            className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold backdrop-blur-md"
            style={{
              bottom: `calc(max(28px, ${safeBottom}) + 220px)`,
              zIndex: 2500,
              backgroundColor: 'rgba(239,68,68,0.85)',
              color: '#fff',
            }}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {language === 'es'
              ? 'Senal GPS debil — busca cielo abierto'
              : 'Weak GPS — move to open sky'}
          </div>
        )}

        {/* No GPS points notice */}
        {gpsPoints.length === 0 && phase === 'recording' && (
          <div className="absolute left-1/2 bg-black/75 backdrop-blur-sm rounded-2xl px-6 py-5 text-center" style={{ top: '35%', zIndex: 2500, transform: 'translateX(-50%)' }}>
            <MapPin className="w-8 h-8 text-white/60 mx-auto mb-2 animate-pulse" />
            <p className="text-white text-sm font-semibold">{language === 'es' ? 'Esperando señal GPS...' : 'Waiting for GPS signal...'}</p>
            {gpsAccuracy !== null && (
              <p className="text-xs mt-1" style={{ color: gpsAccuracy <= 40 ? '#fdda36' : '#ef4444' }}>
                {`±${Math.round(gpsAccuracy)}m`}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── SETUP ────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {language === 'es' ? 'Nueva Actividad' : 'New Activity'}
          </h2>
          <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {language === 'es' ? 'Tipo de actividad' : 'Activity type'}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {SPORT_TYPES.map(s => (
                <button key={s.id} onClick={() => setSportType(s.id)}
                  className={`p-3 rounded-xl text-center transition-all border-2 ${sportType === s.id ? 'border-transparent text-white' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300'}`}
                  style={sportType === s.id ? { backgroundColor: s.color, borderColor: s.color } : {}}>
                  <p className="text-xs font-semibold mt-1">{language === 'es' ? s.labelEs : s.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Crash recovery banner */}
          {recoveredSession && recoveredSession.points.length > 2 && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl">
              <div className="flex items-start gap-3">
                <RotateCcw className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                    {language === 'es' ? 'Sesion interrumpida encontrada' : 'Interrupted session found'}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                    {recoveredSession.points.length} {language === 'es' ? 'puntos GPS guardados' : 'GPS points saved'}
                    {' · '}{recoveredSession.sportType}
                  </p>
                  <div className="flex gap-2 mt-2.5">
                    <button
                      onClick={() => {
                        const pts = recoveredSession.points;
                        setSportType(recoveredSession.sportType);
                        setGpsPoints(pts);
                        setDistanceKm(calculateTotalDistance(pts));
                        setElevationGainM(calculateElevationGain(pts));
                        setDurationSeconds(Math.round((pts[pts.length - 1].timestamp - pts[0].timestamp) / 1000));
                        setRecoveredSession(null);
                        setPhase('details');
                      }}
                      className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      {language === 'es' ? 'Recuperar sesion' : 'Recover session'}
                    </button>
                    <button
                      onClick={() => { clearPersistedSession(); setRecoveredSession(null); }}
                      className="py-2 px-3 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-medium hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                    >
                      {language === 'es' ? 'Descartar' : 'Discard'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-sm">{error}</div>
          )}

          {error?.includes('iOS') && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">iOS Limitation</p>
              <ol className="text-sm text-blue-700 dark:text-blue-300 list-decimal list-inside space-y-1">
                <li>{language === 'es' ? 'Abre Safari y visita asciende.app directamente' : 'Open Safari and visit asciende.app directly'}</li>
                <li>{language === 'es' ? 'Usa Safari en lugar de la app instalada' : 'Use Safari instead of the installed app'}</li>
              </ol>
            </div>
          )}

          <button onClick={handleStart} disabled={isRequestingPermission}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-white text-lg transition-all active:scale-98 disabled:opacity-60 shadow-lg"
            style={{ backgroundColor: sport.color }}>
            <Play className="w-6 h-6 fill-white" />
            {isRequestingPermission
              ? (language === 'es' ? 'Solicitando GPS...' : 'Requesting GPS...')
              : (language === 'es' ? 'Iniciar Actividad' : 'Start Activity')}
          </button>
        </div>
      </div>
    </div>
  );
}
