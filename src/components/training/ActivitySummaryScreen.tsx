import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Trophy, Share2, X, MapPin, Clock, Zap, Mountain, ChevronDown, ChevronUp,
  TrendingUp, Heart, Flame, BarChart3, CheckCircle, Flag, Droplets, Coffee, Sandwich
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
  racePlanName?: string | null;
}

// Brand colors
const BRAND_YELLOW = '#f5c400';
const BRAND_YELLOW_LIGHT = '#fef9e0';
const BRAND_VIOLET = '#7c3aed';
const BRAND_VIOLET_LIGHT = '#ede9fe';

const SPORT_META: Record<string, { color: string; isBike: boolean; isSwim: boolean }> = {
  run:              { color: '#f5c400', isBike: false, isSwim: false },
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

    const step = Math.max(1, Math.floor(points.length / 300));
    const sampled = points.filter((_, i) => i % step === 0);
    if (sampled[sampled.length - 1] !== points[points.length - 1]) sampled.push(points[points.length - 1]);

    const projected = sampled.map(px);

    // Glow
    ctx.save();
    ctx.shadowColor = color + '66';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(projected[0][0], projected[0][1]);
    for (let i = 1; i < projected.length; i++) ctx.lineTo(projected[i][0], projected[i][1]);
    ctx.strokeStyle = color + '44';
    ctx.lineWidth = 7;
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
    ctx.stroke();

    // End dot
    const last = projected[projected.length - 1];
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(last[0], last[1], 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
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

export default function ActivitySummaryScreen({ data, onShare, onClose, activityId, plannedWorkout, racePlanName }: ActivitySummaryScreenProps) {
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
      color: BRAND_YELLOW,
      bgColor: BRAND_YELLOW_LIGHT,
      big: true,
    },
    {
      label: language === 'es' ? 'Duración' : 'Duration',
      value: fmtDuration(data.durationSeconds),
      unit: '',
      icon: Clock,
      color: BRAND_VIOLET,
      bgColor: BRAND_VIOLET_LIGHT,
      big: true,
    },
    ...(pace ? [{
      label: sport.isBike ? (language === 'es' ? 'Velocidad' : 'Speed') : (language === 'es' ? 'Ritmo' : 'Pace'),
      value: pace.value,
      unit: pace.unit,
      icon: Zap,
      color: BRAND_YELLOW,
      bgColor: BRAND_YELLOW_LIGHT,
      big: false,
    }] : []),
    ...(data.elevationGainM > 0 ? [{
      label: language === 'es' ? 'Desnivel +' : 'Elevation +',
      value: `${Math.round(data.elevationGainM)}`,
      unit: 'm',
      icon: Mountain,
      color: BRAND_VIOLET,
      bgColor: BRAND_VIOLET_LIGHT,
      big: false,
    }] : []),
  ];

  const hasGPS = data.gpsPoints.length >= 2;

  return (
    <div
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div
        className={`bg-white w-full sm:max-w-lg sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] transition-transform duration-300 ${visible ? 'translate-y-0' : 'translate-y-8'}`}
        style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}
      >
        {/* Top accent bar — brand yellow */}
        <div className="h-1 flex-shrink-0" style={{ background: `linear-gradient(90deg, ${BRAND_YELLOW}, ${BRAND_VIOLET})` }} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: BRAND_YELLOW_LIGHT }}
            >
              <Trophy className="w-5 h-5" style={{ color: BRAND_YELLOW }} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {language === 'es' ? '¡Actividad Completada!' : 'Activity Complete!'}
              </h2>
              <p className="text-xs text-gray-400">{data.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4 bg-gray-50">

          {/* GPS MAP — dark container so route is visible */}
          {hasGPS && (
            <div className="rounded-2xl overflow-hidden relative" style={{ background: '#111827', minHeight: '160px' }}>
              <div className="p-1">
                <GPSMiniMap points={data.gpsPoints} color={BRAND_YELLOW} />
              </div>
              <div
                className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold"
                style={{ background: BRAND_YELLOW + '22', color: BRAND_YELLOW, border: `1px solid ${BRAND_YELLOW}33` }}
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
                  className="rounded-2xl p-4 bg-white border border-gray-100 shadow-sm"
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: m.bgColor }}>
                      <m.icon className="w-3.5 h-3.5" style={{ color: m.color }} />
                    </div>
                    <span className="text-[11px] font-semibold text-gray-400">{m.label}</span>
                  </div>
                  <p className="text-3xl font-black text-gray-900 leading-none">
                    {m.value}
                    {m.unit && <span className="text-sm font-medium text-gray-400 ml-1">{m.unit}</span>}
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
                    className="rounded-xl p-3.5 bg-white border border-gray-100 shadow-sm flex items-center gap-3"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: m.bgColor }}
                    >
                      <m.icon className="w-4 h-4" style={{ color: m.color }} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">{m.label}</p>
                      <p className="text-lg font-bold text-gray-900 leading-tight">
                        {m.value}
                        {m.unit && <span className="text-xs text-gray-400 ml-0.5">{m.unit}</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PACE ZONE DISTRIBUTION */}
          {zones && splits.length >= 3 && (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: BRAND_VIOLET_LIGHT }}>
                  <BarChart3 className="w-3.5 h-3.5" style={{ color: BRAND_VIOLET }} />
                </div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
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
                      <div className="flex-1 h-4 rounded-full overflow-hidden bg-gray-100">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${z.pct}%`,
                            background: `linear-gradient(90deg, ${ZONE_COLORS[z.zone - 1]}99, ${ZONE_COLORS[z.zone - 1]})`,
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[11px] font-bold text-gray-700 w-8 text-right">{z.pct}%</span>
                        <span className="text-[10px] text-gray-400 w-12 text-right">{fmtDuration(z.seconds, true)}</span>
                      </div>
                    </div>
                  ) : null
                ))}
              </div>
              <p className="text-[10px] text-gray-300 mt-2">
                {language === 'es' ? 'Basado en ritmo / velocidad' : 'Based on pace / speed'}
              </p>
            </div>
          )}

          {/* PERFORMANCE INSIGHT */}
          {insight && (
            <div
              className="rounded-2xl p-4 border flex items-start gap-3"
              style={{ background: BRAND_YELLOW_LIGHT, borderColor: BRAND_YELLOW + '66' }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: BRAND_YELLOW + '33' }}
              >
                <TrendingUp className="w-4 h-4" style={{ color: BRAND_YELLOW }} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest mb-1 text-gray-500">
                  {language === 'es' ? 'Insight' : 'Performance Insight'}
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">{insight}</p>
              </div>
            </div>
          )}

          {/* SPLITS */}
          {splits.length >= 2 && (
            <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white shadow-sm">
              <button
                onClick={() => setShowSplits(!showSplits)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: BRAND_YELLOW_LIGHT }}>
                    <Flame className="w-3.5 h-3.5" style={{ color: BRAND_YELLOW }} />
                  </div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    {`Splits (${splits.length} km)`}
                  </span>
                </div>
                {showSplits ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {showSplits && (
                <div className="border-t border-gray-100">
                  <div className="grid grid-cols-4 px-4 py-2 bg-gray-50">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Km</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase text-right">
                      {sport.isBike ? 'km/h' : (language === 'es' ? 'Ritmo' : 'Pace')}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase text-right">{language === 'es' ? 'Tiempo' : 'Time'}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase text-right">D+</span>
                  </div>
                  {splits.map((s) => {
                    const z = paceZone(s.paceSeconds, sport.isBike);
                    return (
                      <div
                        key={s.km}
                        className="grid grid-cols-4 px-4 py-2.5 border-t border-gray-50 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-5 rounded-full flex-shrink-0" style={{ background: ZONE_COLORS[z - 1] }} />
                          <span className="text-sm font-bold text-gray-800">{s.km}</span>
                        </div>
                        <span className="text-sm font-bold text-right" style={{ color: ZONE_COLORS[z - 1] }}>
                          {fmtPace(s.paceSeconds)}
                        </span>
                        <span className="text-sm text-gray-500 text-right">{fmtDuration(s.durationSeconds)}</span>
                        <span className="text-sm text-gray-400 text-right">
                          {s.elevGain > 0 ? `+${s.elevGain}m` : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Wellness feedback */}
          {data.feedback && (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: BRAND_VIOLET_LIGHT }}>
                  <Heart className="w-3.5 h-3.5" style={{ color: BRAND_VIOLET }} />
                </div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  {language === 'es' ? 'Cómo te sentiste' : 'How You Felt'}
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 rounded-xl" style={{ background: BRAND_YELLOW_LIGHT }}>
                  <div className="text-2xl font-black text-gray-900">{data.feedback.rpe}</div>
                  <div className="text-[10px] font-medium text-gray-500">RPE</div>
                </div>
                <div className="text-center p-2 rounded-xl bg-gray-50">
                  <div className="text-xs font-bold text-gray-800 capitalize">{data.feedback.energy_level.replace('_', ' ')}</div>
                  <div className="text-[10px] text-gray-400">{language === 'es' ? 'Energía' : 'Energy'}</div>
                </div>
                <div className="text-center p-2 rounded-xl bg-gray-50">
                  <div className="text-xs font-bold text-gray-800 capitalize">{data.feedback.mood.replace('_', ' ')}</div>
                  <div className="text-[10px] text-gray-400">{language === 'es' ? 'Ánimo' : 'Mood'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Consumed fuel log */}
          {data.consumedFuel && data.consumedFuel.length > 0 && (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: BRAND_YELLOW_LIGHT }}>
                  <Flag className="w-3.5 h-3.5" style={{ color: BRAND_YELLOW }} />
                </div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  {racePlanName ?? (language === 'es' ? 'Plan de Carrera' : 'Race Plan')}
                  {' — '}
                  {language === 'es' ? 'Combustible' : 'Fuel'}
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center p-2 rounded-xl" style={{ background: BRAND_YELLOW_LIGHT }}>
                  <div className="text-lg font-black text-gray-900">{data.consumedFuel.reduce((s, e) => s + e.carbs_g, 0)}g</div>
                  <div className="text-[10px] text-gray-500">{language === 'es' ? 'Carbos' : 'Carbs'}</div>
                </div>
                <div className="text-center p-2 rounded-xl bg-gray-50">
                  <div className="text-lg font-black text-gray-900">{Math.round(data.consumedFuel.reduce((s, e) => s + e.fluid_ml, 0) / 100) / 10}L</div>
                  <div className="text-[10px] text-gray-500">{language === 'es' ? 'Líquido' : 'Fluid'}</div>
                </div>
                <div className="text-center p-2 rounded-xl bg-gray-50">
                  <div className="text-lg font-black text-gray-900">{data.consumedFuel.reduce((s, e) => s + e.caffeine_mg, 0)}mg</div>
                  <div className="text-[10px] text-gray-500">{language === 'es' ? 'Cafeína' : 'Caffeine'}</div>
                </div>
              </div>
              <div className="space-y-1.5">
                {data.consumedFuel.map((entry, i) => {
                  const h = Math.floor(entry.time_min / 60);
                  const m = entry.time_min % 60;
                  const t = h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}min`;
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="text-gray-400 font-mono w-10 flex-shrink-0">{t}</span>
                      <span className="text-gray-700 flex-1 truncate">{entry.label}</span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {entry.carbs_g > 0 && <span className="flex items-center gap-0.5 text-yellow-600"><Sandwich className="w-3 h-3" />{entry.carbs_g}g</span>}
                        {entry.fluid_ml > 0 && <span className="flex items-center gap-0.5 text-blue-500"><Droplets className="w-3 h-3" />{entry.fluid_ml}ml</span>}
                        {entry.caffeine_mg > 0 && <span className="flex items-center gap-0.5 text-orange-500"><Coffee className="w-3 h-3" />{entry.caffeine_mg}mg</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SESSION ANALYSIS */}
          <WorkoutAnalysisPanel
            activityData={data}
            activityId={activityId}
            plannedWorkout={plannedWorkout}
          />

          {/* Attribution */}
          <p className="text-center text-[10px] text-gray-300">
            {profile?.full_name && <span>{profile.full_name} · </span>}
            {new Date().toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Action bar */}
        <div className="flex-shrink-0 px-5 pb-5 pt-3 space-y-2.5 border-t border-gray-100 bg-white">
          <button
            onClick={onShare}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-bold text-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: `linear-gradient(135deg, ${BRAND_YELLOW} 0%, #f5c400 100%)`,
              color: '#1a1428',
              boxShadow: `0 4px 16px ${BRAND_YELLOW}55`,
            }}
          >
            <Share2 className="w-4 h-4" />
            {language === 'es' ? 'Compartir Actividad' : 'Share Activity'}
          </button>
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all border border-gray-200"
          >
            <CheckCircle className="w-4 h-4" />
            {language === 'es' ? 'Listo' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}
