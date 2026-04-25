import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Trophy, Share2, X, MapPin, Clock, Zap, Mountain, ChevronDown, ChevronUp,
  TrendingUp, Heart, Flame, BarChart3, CheckCircle
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { type ActivityRecorderData } from './ActivityRecorder';
import WorkoutAnalysisPanel from './WorkoutAnalysisPanel';
import { type EnduranceWorkout } from './EnduranceWorkoutCard';

interface ActivitySummaryScreenProps {
  data: ActivityRecorderData;
  onShare: () => void;
  onClose: () => void;
  activityId?: string | null;
  plannedWorkout?: EnduranceWorkout | null;
}

const SPORT_META: Record<string, { color: string; isBike: boolean; isSwim: boolean }> = {
  run:              { color: '#22c55e', isBike: false, isSwim: false },
  trail_run:        { color: '#84cc16', isBike: false, isSwim: false },
  road_bike:        { color: '#3b82f6', isBike: true,  isSwim: false },
  mountain_bike:    { color: '#f97316', isBike: true,  isSwim: false },
  gravel_bike:      { color: '#a78bfa', isBike: true,  isSwim: false },
  open_water_swim:  { color: '#06b6d4', isBike: false, isSwim: true  },
};

function fmtDuration(s: number, compact = false) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (compact) return h > 0 ? `${h}h ${m}m` : `${m}m ${sec}s`;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
}

function getPaceOrSpeed(distKm: number, durSecs: number, isBike: boolean) {
  if (!distKm || !durSecs) return null;
  if (isBike) {
    return { value: ((distKm / durSecs) * 3600).toFixed(1), unit: 'km/h' };
  }
  const minPerKm = durSecs / 60 / distKm;
  const mins = Math.floor(minPerKm);
  const secs = Math.round((minPerKm - mins) * 60);
  return { value: `${mins}:${String(secs).padStart(2, '0')}`, unit: '/km' };
}

// Compute per-km splits from GPS points
function computeSplits(points: Array<{ latitude: number; longitude: number; altitude: number | null; timestamp: string }>) {
  if (points.length < 2) return [];

  const toRad = (d: number) => (d * Math.PI) / 180;
  const haversine = (p1: typeof points[0], p2: typeof points[0]) => {
    const R = 6371;
    const dLat = toRad(p2.latitude - p1.latitude);
    const dLon = toRad(p2.longitude - p1.longitude);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(p1.latitude)) * Math.cos(toRad(p2.latitude)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const splits: Array<{ km: number; paceSeconds: number; elevGain: number; durationSeconds: number }> = [];
  let accDist = 0;
  let splitStart = 0;
  let splitStartDist = 0;
  let splitElevGain = 0;

  for (let i = 1; i < points.length; i++) {
    const d = haversine(points[i - 1], points[i]);
    accDist += d;
    const alt1 = points[i - 1].altitude || 0;
    const alt2 = points[i].altitude || 0;
    if (alt2 > alt1) splitElevGain += alt2 - alt1;

    if (accDist - splitStartDist >= 1.0) {
      const splitDist = accDist - splitStartDist;
      const t1 = new Date(points[splitStart].timestamp).getTime();
      const t2 = new Date(points[i].timestamp).getTime();
      const splitDur = (t2 - t1) / 1000;
      const paceSeconds = splitDur / splitDist;

      splits.push({
        km: splits.length + 1,
        paceSeconds,
        elevGain: Math.round(splitElevGain),
        durationSeconds: Math.round(splitDur),
      });

      splitStart = i;
      splitStartDist = accDist;
      splitElevGain = 0;

      if (splits.length >= 20) break;
    }
  }

  return splits;
}

// Assign a pace zone (1-5) based on pace seconds per km
function paceZone(paceSeconds: number, isBike: boolean) {
  if (isBike) {
    const kmh = 3600 / paceSeconds;
    if (kmh < 20) return 1;
    if (kmh < 28) return 2;
    if (kmh < 34) return 3;
    if (kmh < 42) return 4;
    return 5;
  }
  const minPerKm = paceSeconds / 60;
  if (minPerKm > 7.5) return 1;
  if (minPerKm > 6.0) return 2;
  if (minPerKm > 5.0) return 3;
  if (minPerKm > 4.0) return 4;
  return 5;
}

// Compute zone distribution from splits
function computeZones(splits: ReturnType<typeof computeSplits>, isBike: boolean) {
  if (splits.length === 0) return null;
  const totalTime = splits.reduce((s, x) => s + x.durationSeconds, 0);
  if (!totalTime) return null;

  const zoneTimes = [0, 0, 0, 0, 0];
  for (const s of splits) {
    const z = paceZone(s.paceSeconds, isBike) - 1;
    zoneTimes[z] += s.durationSeconds;
  }
  return zoneTimes.map((t, i) => ({
    zone: i + 1,
    seconds: t,
    pct: Math.round((t / totalTime) * 100),
  }));
}

// Generate a short insight string
function generateInsight(
  splits: ReturnType<typeof computeSplits>,
  zones: ReturnType<typeof computeZones>,
  data: ActivityRecorderData,
  isBike: boolean,
  language: string
) {
  if (!splits.length || !zones) return null;

  const z2 = zones[1].pct;
  const z4z5 = zones[3].pct + zones[4].pct;
  const lastThirdPaces = splits.slice(-Math.max(1, Math.floor(splits.length / 3))).map(s => s.paceSeconds);
  const firstThirdPaces = splits.slice(0, Math.max(1, Math.floor(splits.length / 3))).map(s => s.paceSeconds);
  const avgLast = lastThirdPaces.reduce((a, b) => a + b, 0) / lastThirdPaces.length;
  const avgFirst = firstThirdPaces.reduce((a, b) => a + b, 0) / firstThirdPaces.length;
  const fadeFactor = isBike ? 0.85 : 0.9;
  const didFade = avgLast > avgFirst * (1 / fadeFactor);
  const didNegativeSplit = avgLast < avgFirst * fadeFactor;

  if (language === 'es') {
    if (z2 >= 35) return `Pasaste ${z2}% de tu sesión en Zona 2 — excelente para el desarrollo aeróbico.`;
    if (z4z5 >= 25) return `Alta intensidad: ${z4z5}% del tiempo en Zona 4-5. Sesión de calidad!`;
    if (didFade && splits.length >= 4) return `Tu ritmo bajó al final — posible fatiga acumulada. Mantén la hidratación.`;
    if (didNegativeSplit && splits.length >= 4) return `Hiciste un split negativo — más rápido al final. Excelente gestión del esfuerzo!`;
    if (data.elevationGainM > 200) return `${Math.round(data.elevationGainM)}m de desnivel. Gran trabajo de subidas!`;
    return `${data.distanceKm.toFixed(2)} km en ${fmtDuration(data.durationSeconds, true)}. Sigue así!`;
  } else {
    if (z2 >= 35) return `You spent ${z2}% of your session in Zone 2 — great for aerobic development.`;
    if (z4z5 >= 25) return `High intensity: ${z4z5}% in Zone 4-5. Quality session!`;
    if (didFade && splits.length >= 4) return `Your pace dropped in the final km — possible accumulated fatigue. Stay hydrated.`;
    if (didNegativeSplit && splits.length >= 4) return `Negative split — faster at the end. Excellent effort management!`;
    if (data.elevationGainM > 200) return `${Math.round(data.elevationGainM)}m of elevation. Great climbing effort!`;
    return `${data.distanceKm.toFixed(2)} km in ${fmtDuration(data.durationSeconds, true)}. Keep it up!`;
  }
}

// Mini GPS canvas map
function GPSMiniMap({ points, color }: { points: ActivityRecorderData['gpsPoints']; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const lats = points.map(p => p.latitude);
    const lons = points.map(p => p.longitude);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons);
    const dLat = maxLat - minLat || 0.0001;
    const dLon = maxLon - minLon || 0.0001;
    const pad = 24;
    const scaleX = (W - pad * 2) / dLon;
    const scaleY = (H - pad * 2) / dLat;
    const scale = Math.min(scaleX, scaleY);
    const usedW = dLon * scale;
    const usedH = dLat * scale;
    const offX = pad + (W - pad * 2 - usedW) / 2;
    const offY = pad + (H - pad * 2 - usedH) / 2;

    const px = (p: typeof points[0]): [number, number] => [
      offX + (p.longitude - minLon) * scale,
      offY + usedH - (p.latitude - minLat) * scale,
    ];

    // Subsample for performance
    const step = Math.max(1, Math.floor(points.length / 300));
    const sampled = points.filter((_, i) => i % step === 0);
    if (sampled[sampled.length - 1] !== points[points.length - 1]) sampled.push(points[points.length - 1]);

    const projected = sampled.map(px);

    // Glow
    ctx.save();
    ctx.shadowColor = color + '88';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(projected[0][0], projected[0][1]);
    for (let i = 1; i < projected.length; i++) ctx.lineTo(projected[i][0], projected[i][1]);
    ctx.strokeStyle = color + '55';
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();

    // Main line
    ctx.beginPath();
    ctx.moveTo(projected[0][0], projected[0][1]);
    for (let i = 1; i < projected.length; i++) ctx.lineTo(projected[i][0], projected[i][1]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Start dot
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(projected[0][0], projected[0][1], 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(projected[0][0], projected[0][1], 5, 0, Math.PI * 2);
    ctx.stroke();

    // End dot
    const last = projected[projected.length - 1];
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(last[0], last[1], 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(last[0], last[1], 5, 0, Math.PI * 2);
    ctx.stroke();
  }, [points, color]);

  if (points.length < 2) return null;

  return (
    <canvas
      ref={canvasRef}
      width={560}
      height={220}
      className="w-full h-full"
    />
  );
}

const ZONE_COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#f97316', '#ef4444'];
const ZONE_NAMES_EN = ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5'];
const ZONE_NAMES_ES = ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4', 'Zona 5'];
const ZONE_DESC_EN = ['Recovery', 'Aerobic', 'Tempo', 'Threshold', 'VO2 Max'];
const ZONE_DESC_ES = ['Recuperación', 'Aeróbico', 'Tempo', 'Umbral', 'VO2 Máx'];

export default function ActivitySummaryScreen({ data, onShare, onClose, activityId, plannedWorkout }: ActivitySummaryScreenProps) {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const [showSplits, setShowSplits] = useState(false);
  const [visible, setVisible] = useState(false);

  const sport = SPORT_META[data.sportType] ?? SPORT_META['run'];
  const pace = getPaceOrSpeed(data.distanceKm, data.durationSeconds, sport.isBike);
  const splits = computeSplits(data.gpsPoints);
  const zones = computeZones(splits, sport.isBike);
  const insight = generateInsight(splits, zones, data, sport.isBike, language);

  const fmtPace = useCallback((paceSeconds: number) => {
    if (sport.isBike) {
      const kmh = 3600 / paceSeconds;
      return kmh.toFixed(1);
    }
    const m = Math.floor(paceSeconds / 60);
    const s = Math.round(paceSeconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }, [sport.isBike]);

  // Fade in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const keyMetrics = [
    {
      label: language === 'es' ? 'Distancia' : 'Distance',
      value: data.distanceKm.toFixed(2),
      unit: 'km',
      icon: MapPin,
      color: sport.color,
      big: true,
    },
    {
      label: language === 'es' ? 'Duración' : 'Duration',
      value: fmtDuration(data.durationSeconds),
      unit: '',
      icon: Clock,
      color: '#60a5fa',
      big: true,
    },
    ...(pace ? [{
      label: sport.isBike ? (language === 'es' ? 'Velocidad' : 'Speed') : (language === 'es' ? 'Ritmo' : 'Pace'),
      value: pace.value,
      unit: pace.unit,
      icon: Zap,
      color: '#fbbf24',
      big: false,
    }] : []),
    ...(data.elevationGainM > 0 ? [{
      label: language === 'es' ? 'Desnivel +' : 'Elevation +',
      value: `${Math.round(data.elevationGainM)}`,
      unit: 'm',
      icon: Mountain,
      color: '#a78bfa',
      big: false,
    }] : []),
  ];

  const hasGPS = data.gpsPoints.length >= 2;

  return (
    <div
      className={`fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div
        className={`bg-gray-950 w-full sm:max-w-lg sm:rounded-2xl shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[95vh] transition-transform duration-300 ${visible ? 'translate-y-0' : 'translate-y-8'}`}
        style={{ boxShadow: `0 0 60px ${sport.color}22, 0 25px 50px rgba(0,0,0,0.8)` }}
      >
        {/* Top accent bar */}
        <div className="h-1 flex-shrink-0" style={{ background: `linear-gradient(90deg, transparent, ${sport.color}, transparent)` }} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: sport.color + '22', boxShadow: `0 0 16px ${sport.color}33` }}
            >
              <Trophy className="w-5 h-5" style={{ color: sport.color }} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {language === 'es' ? '¡Actividad Completada!' : 'Activity Complete!'}
              </h2>
              <p className="text-xs text-white/50">{data.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/8 transition-colors text-white/40 hover:text-white/70"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* GPS MAP */}
          {hasGPS && (
            <div
              className="rounded-2xl overflow-hidden relative"
              style={{ background: '#0a0f1a', border: `1px solid ${sport.color}33`, minHeight: '160px' }}
            >
              <div className="p-1">
                <GPSMiniMap points={data.gpsPoints} color={sport.color} />
              </div>
              <div
                className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold"
                style={{ background: sport.color + '22', color: sport.color }}
              >
                <MapPin className="w-3 h-3" />
                {data.gpsPoints.length.toLocaleString()} {language === 'es' ? 'puntos GPS' : 'GPS points'}
              </div>
            </div>
          )}

          {/* KEY METRICS */}
          <div>
            {/* Big metrics */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {keyMetrics.filter(m => m.big).map((m) => (
                <div
                  key={m.label}
                  className="rounded-2xl p-4 border"
                  style={{ background: m.color + '0d', borderColor: m.color + '33' }}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <m.icon className="w-3.5 h-3.5" style={{ color: m.color }} />
                    <span className="text-[11px] font-medium" style={{ color: m.color + 'cc' }}>{m.label}</span>
                  </div>
                  <p className="text-3xl font-black text-white leading-none">
                    {m.value}
                    {m.unit && <span className="text-sm font-medium text-white/40 ml-1">{m.unit}</span>}
                  </p>
                </div>
              ))}
            </div>

            {/* Small metrics */}
            {keyMetrics.filter(m => !m.big).length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {keyMetrics.filter(m => !m.big).map((m) => (
                  <div
                    key={m.label}
                    className="rounded-xl p-3.5 border flex items-center gap-3"
                    style={{ background: '#ffffff08', borderColor: '#ffffff12' }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: m.color + '20' }}
                    >
                      <m.icon className="w-4.5 h-4.5" style={{ color: m.color }} />
                    </div>
                    <div>
                      <p className="text-xs text-white/40">{m.label}</p>
                      <p className="text-lg font-bold text-white leading-tight">
                        {m.value}
                        {m.unit && <span className="text-xs text-white/40 ml-0.5">{m.unit}</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PACE ZONE DISTRIBUTION */}
          {zones && splits.length >= 3 && (
            <div className="rounded-2xl border border-white/8 p-4" style={{ background: '#ffffff06' }}>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-white/50" />
                <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest">
                  {language === 'es' ? 'Distribución de Zonas' : 'Zone Distribution'}
                </h3>
              </div>
              <div className="space-y-2">
                {zones.map((z) => (
                  z.pct > 0 ? (
                    <div key={z.zone} className="flex items-center gap-2">
                      <span className="text-[11px] font-bold w-12 flex-shrink-0" style={{ color: ZONE_COLORS[z.zone - 1] }}>
                        {language === 'es' ? ZONE_NAMES_ES[z.zone - 1] : ZONE_NAMES_EN[z.zone - 1]}
                      </span>
                      <div className="flex-1 h-5 rounded-full overflow-hidden bg-white/8">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${z.pct}%`,
                            background: `linear-gradient(90deg, ${ZONE_COLORS[z.zone - 1]}cc, ${ZONE_COLORS[z.zone - 1]})`,
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[11px] font-bold text-white/80 w-8 text-right">{z.pct}%</span>
                        <span className="text-[10px] text-white/30 w-12 text-right">{fmtDuration(z.seconds, true)}</span>
                      </div>
                    </div>
                  ) : null
                ))}
              </div>
              <p className="text-[10px] text-white/25 mt-2">
                {language === 'es' ? 'Basado en ritmo / velocidad' : 'Based on pace / speed'}
              </p>
            </div>
          )}

          {/* PERFORMANCE INSIGHT */}
          {insight && (
            <div
              className="rounded-2xl p-4 border flex items-start gap-3"
              style={{ background: sport.color + '0d', borderColor: sport.color + '33' }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: sport.color + '22' }}
              >
                <TrendingUp className="w-4 h-4" style={{ color: sport.color }} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: sport.color + 'bb' }}>
                  {language === 'es' ? 'Insight' : 'Performance Insight'}
                </p>
                <p className="text-sm text-white/80 leading-relaxed">{insight}</p>
              </div>
            </div>
          )}

          {/* SPLITS */}
          {splits.length >= 2 && (
            <div className="rounded-2xl border border-white/8 overflow-hidden" style={{ background: '#ffffff06' }}>
              <button
                onClick={() => setShowSplits(!showSplits)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-white/40" />
                  <span className="text-xs font-bold text-white/60 uppercase tracking-widest">
                    {language === 'es' ? `Splits (${splits.length} km)` : `Splits (${splits.length} km)`}
                  </span>
                </div>
                {showSplits ? (
                  <ChevronUp className="w-4 h-4 text-white/40" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-white/40" />
                )}
              </button>

              {showSplits && (
                <div className="border-t border-white/8">
                  {/* Header */}
                  <div className="grid grid-cols-4 px-4 py-2 bg-white/5">
                    <span className="text-[10px] font-bold text-white/30 uppercase">{language === 'es' ? 'Km' : 'Km'}</span>
                    <span className="text-[10px] font-bold text-white/30 uppercase text-right">
                      {sport.isBike ? 'km/h' : (language === 'es' ? 'Ritmo' : 'Pace')}
                    </span>
                    <span className="text-[10px] font-bold text-white/30 uppercase text-right">{language === 'es' ? 'Tiempo' : 'Time'}</span>
                    <span className="text-[10px] font-bold text-white/30 uppercase text-right">D+</span>
                  </div>
                  {splits.map((s) => {
                    const z = paceZone(s.paceSeconds, sport.isBike);
                    return (
                      <div
                        key={s.km}
                        className="grid grid-cols-4 px-4 py-2.5 border-t border-white/5 hover:bg-white/4 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-5 rounded-full flex-shrink-0" style={{ background: ZONE_COLORS[z - 1] }} />
                          <span className="text-sm font-bold text-white">{s.km}</span>
                        </div>
                        <span className="text-sm font-bold text-right" style={{ color: ZONE_COLORS[z - 1] }}>
                          {fmtPace(s.paceSeconds)}
                        </span>
                        <span className="text-sm text-white/60 text-right">{fmtDuration(s.durationSeconds)}</span>
                        <span className="text-sm text-white/40 text-right">
                          {s.elevGain > 0 ? `+${s.elevGain}m` : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Wellness feedback summary */}
          {data.feedback && (
            <div className="rounded-2xl border border-white/8 p-4" style={{ background: '#ffffff06' }}>
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-4 h-4 text-white/40" />
                <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest">
                  {language === 'es' ? 'Cómo te sentiste' : 'How You Felt'}
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <div className="text-2xl font-black text-white">{data.feedback.rpe}</div>
                  <div className="text-[10px] text-white/40">RPE</div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold text-white capitalize">{data.feedback.energy_level.replace('_', ' ')}</div>
                  <div className="text-[10px] text-white/40">{language === 'es' ? 'Energía' : 'Energy'}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold text-white capitalize">{data.feedback.mood.replace('_', ' ')}</div>
                  <div className="text-[10px] text-white/40">{language === 'es' ? 'Ánimo' : 'Mood'}</div>
                </div>
              </div>
            </div>
          )}

          {/* SESSION ANALYSIS - post-workout processing flow */}
          <WorkoutAnalysisPanel
            activityData={data}
            activityId={activityId}
            plannedWorkout={plannedWorkout}
          />

          {/* Attribution */}
          <p className="text-center text-[10px] text-white/20">
            {profile?.full_name && <span>{profile.full_name} · </span>}
            {new Date().toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Action bar */}
        <div className="flex-shrink-0 px-5 pb-5 pt-3 space-y-2.5 border-t border-white/8 bg-gray-950">
          <button
            onClick={onShare}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-bold text-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: `linear-gradient(135deg, ${sport.color}dd, ${sport.color})`,
              color: '#060810',
              boxShadow: `0 4px 20px ${sport.color}44`,
            }}
          >
            <Share2 className="w-4.5 h-4.5" />
            {language === 'es' ? 'Compartir Actividad' : 'Share Activity'}
          </button>
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium text-white/50 hover:text-white/80 hover:bg-white/5 transition-all border border-white/8"
          >
            <CheckCircle className="w-4 h-4" />
            {language === 'es' ? 'Listo' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}
