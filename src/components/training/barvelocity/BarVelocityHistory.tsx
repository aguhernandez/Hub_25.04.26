import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import {
  TrendingUp,
  Calendar,
  Loader,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Download,
  Filter,
  Trophy,
  Zap,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { getVBTZone } from './BarVelocityTypes';
import { repFatigueColor } from './VBTVelocityLossGraph';

interface SessionRecord {
  id: string;
  session_date: string;
  exercise_name: string;
  load_kg: number;
  total_reps: number;
  peak_velocity_ms: number;
  mean_concentric_velocity_ms: number;
  velocity_loss_pct: number;
  estimated_power_w: number;
  fps: number;
  notes: string;
}

type DateRange = '7d' | '30d' | '90d' | 'all';

// ── Trend mini-chart via canvas
function TrendSparkline({
  values,
  color,
  width = 80,
  height = 32,
}: {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isDark } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || values.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const pts = values.map((v, i) => ({
      x: (i / (values.length - 1)) * (width - 4) + 2,
      y: height - 4 - ((v - min) / range) * (height - 8),
    }));

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const cp = (pts[i - 1].x + pts[i].x) / 2;
      ctx.bezierCurveTo(cp, pts[i - 1].y, cp, pts[i].y, pts[i].x, pts[i].y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // fill
    ctx.lineTo(pts[pts.length - 1].x, height - 2);
    ctx.lineTo(pts[0].x, height - 2);
    ctx.closePath();
    ctx.fillStyle = `${color}18`;
    ctx.fill();

    // last dot
    const last = pts[pts.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }, [values, color, width, height, isDark]);

  if (values.length < 2) return null;
  return <canvas ref={canvasRef} style={{ width, height }} />;
}

// ── Exports
function exportCSV(sessions: SessionRecord[], fileName: string) {
  const header = [
    'date', 'exercise', 'load_kg', 'total_reps',
    'peak_velocity_ms', 'mean_concentric_velocity_ms',
    'velocity_loss_pct', 'estimated_power_w', 'fps', 'notes',
  ].join(',');
  const rows = sessions.map((s) => [
    s.session_date,
    `"${s.exercise_name || ''}"`,
    s.load_kg ?? '',
    s.total_reps ?? '',
    s.peak_velocity_ms?.toFixed(4) ?? '',
    s.mean_concentric_velocity_ms?.toFixed(4) ?? '',
    s.velocity_loss_pct?.toFixed(2) ?? '',
    s.estimated_power_w?.toFixed(1) ?? '',
    s.fps ?? '',
    `"${(s.notes || '').replace(/"/g, '""')}"`,
  ].join(','));
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function exportJSON(sessions: SessionRecord[], fileName: string) {
  const blob = new Blob([JSON.stringify(sessions, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BarVelocityHistory() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { isDark } = useTheme();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterExercise, setFilterExercise] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [showExport, setShowExport] = useState(false);

  const txt = {
    noSessions: language === 'es' ? 'Sin sesiones registradas aun.' : 'No sessions recorded yet.',
    firstSession: language === 'es' ? 'Realiza tu primer analisis de velocidad' : 'Complete your first velocity analysis',
    record: language === 'es' ? 'record m/s' : 'm/s record',
    sessions: language === 'es' ? 'sesiones' : 'sessions',
    exercises: language === 'es' ? 'ejercicios' : 'exercises',
    all: language === 'es' ? 'Todos' : 'All',
    progression: language === 'es' ? 'Tendencia de velocidad media' : 'Mean velocity trend',
    bestTrend: language === 'es' ? 'Tendencia vel. pico' : 'Peak vel. trend',
    lossTrend: language === 'es' ? 'Tendencia perdida vel.' : 'Vel. loss trend',
    meanAvg: language === 'es' ? 'media' : 'avg',
    peakVel: language === 'es' ? 'Vel. pico:' : 'Peak vel.:',
    velLoss: language === 'es' ? 'Perdida vel.:' : 'Vel. loss:',
    power: language === 'es' ? 'Potencia:' : 'Power:',
    zone: language === 'es' ? 'Zona:' : 'Zone:',
    notes: language === 'es' ? 'Notas:' : 'Notes:',
    export: language === 'es' ? 'Exportar' : 'Export',
    exportCSV: 'CSV',
    exportJSON: 'JSON',
    filter: language === 'es' ? 'Filtros' : 'Filters',
    last7: language === 'es' ? 'Ult. 7 dias' : 'Last 7 days',
    last30: language === 'es' ? 'Ult. 30 dias' : 'Last 30 days',
    last90: language === 'es' ? 'Ult. 90 dias' : 'Last 90 days',
    totalLoss: language === 'es' ? 'Perdida total avg' : 'Avg total loss',
    bestSession: language === 'es' ? 'Mejor sesion' : 'Best session',
    trend: language === 'es' ? 'Tendencia' : 'Trend',
    reps: language === 'es' ? 'reps' : 'reps',
    fps: 'fps',
  };

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await (supabase as any)
        .from('bar_velocity_sessions')
        .select('*')
        .eq('athlete_id', user.id)
        .order('session_date', { ascending: false })
        .limit(100);
      setSessions(data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const applyDateFilter = useCallback(
    (list: SessionRecord[]) => {
      if (dateRange === 'all') return list;
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      return list.filter((s) => new Date(s.session_date) >= cutoff);
    },
    [dateRange]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className={`text-center py-10 font-body ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">{txt.noSessions}</p>
        <p className="text-xs mt-1 opacity-70">{txt.firstSession}</p>
      </div>
    );
  }

  const exercises = ['all', ...Array.from(new Set(sessions.map((s) => s.exercise_name).filter(Boolean)))];
  const byExercise = filterExercise === 'all' ? sessions : sessions.filter((s) => s.exercise_name === filterExercise);
  const filtered = applyDateFilter(byExercise);

  const allPeaks = filtered.map((s) => s.peak_velocity_ms).filter(Boolean);
  const allMeans = filtered.map((s) => s.mean_concentric_velocity_ms).filter(Boolean);
  const allLoss = filtered.map((s) => s.velocity_loss_pct).filter((v) => v != null);
  const record = allPeaks.length > 0 ? Math.max(...allPeaks) : 0;
  const avgLoss = allLoss.length > 0 ? allLoss.reduce((a, b) => a + b, 0) / allLoss.length : 0;

  // Trend data (chronological order)
  const chronological = [...filtered].sort(
    (a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime()
  );
  const meanTrend = chronological.map((s) => s.mean_concentric_velocity_ms || 0);
  const peakTrend = chronological.map((s) => s.peak_velocity_ms || 0);
  const lossTrend = chronological.map((s) => s.velocity_loss_pct || 0);

  const exportFileName = `vbt_${filterExercise !== 'all' ? filterExercise.replace(/\s+/g, '_') + '_' : ''}${dateRange}`;

  const bg = isDark ? 'bg-gray-900' : 'bg-white';
  const border = isDark ? 'border-gray-800/60' : 'border-gray-200';
  const textSec = isDark ? 'text-gray-400' : 'text-gray-600';
  const cardBg = isDark ? 'bg-gray-800/50 border-gray-700/30' : 'bg-gray-50 border-gray-200';

  return (
    <div className="space-y-4 font-body">
      {/* ── Top stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`rounded-2xl p-3 text-center border ${isDark ? 'bg-primary/10 border-primary/20' : 'bg-amber-50 border-amber-200'}`}>
          <Trophy className="w-4 h-4 text-primary mx-auto mb-1" />
          <div className="text-lg font-bold text-primary">{record.toFixed(2)}</div>
          <div className={`text-xs ${textSec}`}>{txt.record}</div>
        </div>
        <div className={`rounded-2xl p-3 text-center border ${cardBg}`}>
          <Calendar className={`w-4 h-4 mx-auto mb-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
          <div className={`text-lg font-bold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{filtered.length}</div>
          <div className={`text-xs ${textSec}`}>{txt.sessions}</div>
        </div>
        <div className={`rounded-2xl p-3 text-center border ${cardBg}`}>
          <AlertTriangle className={`w-4 h-4 mx-auto mb-1 ${repFatigueColor(avgLoss) ? '' : 'text-gray-400'}`} style={{ color: repFatigueColor(avgLoss) }} />
          <div className="text-lg font-bold" style={{ color: repFatigueColor(avgLoss) }}>{avgLoss.toFixed(1)}%</div>
          <div className={`text-xs ${textSec}`}>{txt.totalLoss}</div>
        </div>
      </div>

      {/* ── Filters row */}
      <div className={`flex items-center gap-2 p-2 rounded-xl border ${isDark ? 'bg-gray-900/60 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
        <Filter className={`w-3.5 h-3.5 shrink-0 ${textSec}`} />
        <div className="flex gap-1 overflow-x-auto">
          {(['7d', '30d', '90d', 'all'] as DateRange[]).map((d) => (
            <button
              key={d}
              onClick={() => setDateRange(d)}
              className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                dateRange === d
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : `${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'}`
              }`}
            >
              {d === 'all' ? txt.all : d === '7d' ? txt.last7 : d === '30d' ? txt.last30 : txt.last90}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <div className="relative">
            <button
              onClick={() => setShowExport((p) => !p)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                isDark
                  ? 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                  : 'border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              {txt.export}
            </button>
            {showExport && (
              <div className={`absolute right-0 top-8 z-20 rounded-xl border shadow-xl overflow-hidden ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
                <button
                  onClick={() => { exportCSV(filtered, `${exportFileName}.csv`); setShowExport(false); }}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm w-full text-left transition-colors ${
                    isDark ? 'hover:bg-gray-800 text-gray-200' : 'hover:bg-gray-50 text-gray-900'
                  }`}
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  {txt.exportCSV}
                </button>
                <button
                  onClick={() => { exportJSON(filtered, `${exportFileName}.json`); setShowExport(false); }}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm w-full text-left transition-colors ${
                    isDark ? 'hover:bg-gray-800 text-gray-200' : 'hover:bg-gray-50 text-gray-900'
                  }`}
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  {txt.exportJSON}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Exercise filter pills */}
      {exercises.length > 2 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {exercises.map((ex) => (
            <button
              key={ex}
              onClick={() => setFilterExercise(ex)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterExercise === ex
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : `border ${isDark ? 'bg-gray-800 text-gray-400 border-gray-700/30 hover:border-gray-600' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`
              }`}
            >
              {ex === 'all' ? <><Dumbbell className="w-3 h-3" />{txt.all}</> : ex}
            </button>
          ))}
        </div>
      )}

      {/* ── Trend section */}
      {filtered.length >= 3 && (
        <div className={`rounded-2xl p-4 border space-y-4 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
          <h4 className={`text-xs font-semibold uppercase tracking-wide ${textSec}`}>{txt.trend}</h4>

          <div className="grid grid-cols-3 gap-3">
            {/* Mean velocity trend */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-primary" />
                <span className={`text-[10px] ${textSec}`}>{language === 'es' ? 'Vel. media' : 'Mean vel.'}</span>
              </div>
              <TrendSparkline values={meanTrend} color="#fdda36" />
              <div className="text-xs font-bold text-primary">
                {meanTrend[meanTrend.length - 1]?.toFixed(2)} m/s
              </div>
            </div>

            {/* Peak velocity trend */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Trophy className="w-3 h-3 text-emerald-400" />
                <span className={`text-[10px] ${textSec}`}>{language === 'es' ? 'Vel. pico' : 'Peak vel.'}</span>
              </div>
              <TrendSparkline values={peakTrend} color="#22c55e" />
              <div className="text-xs font-bold text-emerald-400">
                {peakTrend[peakTrend.length - 1]?.toFixed(2)} m/s
              </div>
            </div>

            {/* Velocity loss trend */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 text-orange-400" />
                <span className={`text-[10px] ${textSec}`}>{language === 'es' ? 'Perdida' : 'V. loss'}</span>
              </div>
              <TrendSparkline values={lossTrend} color="#f97316" />
              <div
                className="text-xs font-bold"
                style={{ color: repFatigueColor(lossTrend[lossTrend.length - 1] || 0) }}
              >
                {lossTrend[lossTrend.length - 1]?.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Bar chart (last 12 sessions) */}
          <div>
            <p className={`text-[10px] mb-2 ${textSec}`}>{language === 'es' ? 'Ultimas sesiones — vel. media concentrica' : 'Recent sessions — mean concentric velocity'}</p>
            <div className="flex items-end gap-1 h-14">
              {chronological.slice(-12).map((s, idx) => {
                const v = s.mean_concentric_velocity_ms || 0;
                const pct = record > 0 ? (v / (record * 1.15)) * 100 : 0;
                const zone = getVBTZone(v);
                return (
                  <div key={idx} className="flex-1 flex items-end group relative">
                    <div
                      className="w-full rounded-t transition-all"
                      style={{
                        height: `${pct}%`,
                        minHeight: 3,
                        background: zone.color,
                        opacity: 0.8,
                      }}
                    />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      <div className={`rounded px-1.5 py-0.5 text-[9px] whitespace-nowrap ${isDark ? 'bg-gray-800 text-white' : 'bg-gray-900 text-white'}`}>
                        {v.toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Session list */}
      <div className="space-y-2">
        {filtered.map((s) => {
          const zone = getVBTZone(s.mean_concentric_velocity_ms || 0);
          const zoneLabel = language === 'es' ? zone.labelEs : zone.labelEn;
          const isExpanded = expanded === s.id;
          const lossColor = repFatigueColor(s.velocity_loss_pct || 0);

          return (
            <div
              key={s.id}
              className={`border rounded-2xl overflow-hidden ${cardBg}`}
            >
              <button
                onClick={() => setExpanded(isExpanded ? null : s.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                  isDark ? 'hover:bg-gray-700/20' : 'hover:bg-gray-100'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                      {new Date(s.session_date).toLocaleDateString(language === 'es' ? 'es' : 'en', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </span>
                    {s.exercise_name && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                        {s.exercise_name}
                      </span>
                    )}
                    {s.load_kg && (
                      <span className={`text-xs ${textSec}`}>{s.load_kg} kg</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-xs ${textSec}`}>
                      <span className="text-primary font-semibold">{(s.mean_concentric_velocity_ms || 0).toFixed(2)} m/s</span> {txt.meanAvg}
                    </span>
                    <span className={`text-xs ${textSec}`}>{s.total_reps} {txt.reps}</span>
                    {s.velocity_loss_pct > 0 && (
                      <span className="text-xs font-semibold" style={{ color: lossColor }}>
                        -{s.velocity_loss_pct.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: zone.color }} />
                  {isExpanded ? (
                    <ChevronUp className={`w-4 h-4 ${textSec}`} />
                  ) : (
                    <ChevronDown className={`w-4 h-4 ${textSec}`} />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className={`px-4 pb-4 pt-3 border-t space-y-3 ${isDark ? 'border-gray-700/30' : 'border-gray-200'}`}>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-3.5 h-3.5 text-primary shrink-0" />
                      <div>
                        <div className={`text-[10px] ${textSec}`}>{txt.peakVel}</div>
                        <div className="text-sm font-semibold text-primary">{(s.peak_velocity_ms || 0).toFixed(2)} m/s</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: lossColor }} />
                      <div>
                        <div className={`text-[10px] ${textSec}`}>{txt.velLoss}</div>
                        <div className="text-sm font-semibold" style={{ color: lossColor }}>
                          {(s.velocity_loss_pct || 0).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    {s.estimated_power_w > 0 && (
                      <div className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <div>
                          <div className={`text-[10px] ${textSec}`}>{txt.power}</div>
                          <div className="text-sm font-semibold text-orange-400">{s.estimated_power_w.toFixed(0)} W</div>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5 shrink-0" style={{ color: zone.color }} />
                      <div>
                        <div className={`text-[10px] ${textSec}`}>{txt.zone}</div>
                        <div className="text-sm font-medium" style={{ color: zone.color }}>{zoneLabel}</div>
                      </div>
                    </div>
                    {s.fps > 0 && (
                      <div className={`text-xs ${textSec}`}>
                        {txt.fps}: {s.fps}
                      </div>
                    )}
                  </div>
                  {s.notes && (
                    <div className={`text-xs p-2.5 rounded-lg ${isDark ? 'bg-gray-900/60 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                      <span className={`font-medium ${textSec}`}>{txt.notes} </span>
                      {s.notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
