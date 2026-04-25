import { useState, useEffect, useMemo } from 'react';
import { X, TrendingUp, TrendingDown, Minus, Award } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';

interface SessionPoint {
  date: string;
  oneRM: number;
  weight: number;
  reps: number;
  rir: number | null;
  sessionKey: string;
}

type TimePeriod = '1m' | '2m' | '3m' | '6m' | '12m';

interface WorkingMaxModalProps {
  exerciseName: string;
  exerciseId?: string;
  athleteId: string;
  currentMax: number | null;
  onClose: () => void;
}

const calcOneRM = (weight: number, reps: number, rir?: number | null): number => {
  if (!weight || weight <= 0 || !reps || reps <= 0) return weight || 0;
  const totalReps = reps + (rir !== null && rir !== undefined ? Math.min(Math.max(Math.round(rir), 0), 5) : 0);
  return Math.round(weight * (1 + totalReps / 30) * 10) / 10;
};

export default function WorkingMaxModal({ exerciseName, exerciseId, athleteId, currentMax, onClose }: WorkingMaxModalProps) {
  const { language } = useLanguage();
  const [period, setPeriod] = useState<TimePeriod>('3m');
  const [allPoints, setAllPoints] = useState<SessionPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const periods: { key: TimePeriod; label: string }[] = [
    { key: '1m', label: '1M' },
    { key: '2m', label: '2M' },
    { key: '3m', label: '3M' },
    { key: '6m', label: '6M' },
    { key: '12m', label: '12M' },
  ];

  useEffect(() => {
    (async () => {
      setLoading(true);

      let query = supabase
        .from('training_logs')
        .select(`
          logged_at,
          weight_used,
          reps_completed,
          rir,
          athlete_workout_id,
          workout_exercises(exercise_id)
        `)
        .eq('athlete_id', athleteId)
        .order('logged_at', { ascending: true });

      if (exerciseId) {
        const { data: weData } = await supabase
          .from('workout_exercises')
          .select('id')
          .eq('exercise_id', exerciseId);
        const weIds = (weData || []).map((r: any) => r.id);
        if (weIds.length > 0) {
          query = query.in('workout_exercise_id', weIds);
        } else {
          setAllPoints([]);
          setLoading(false);
          return;
        }
      }

      const { data: rawLogs } = await query;

      if (!rawLogs || rawLogs.length === 0) {
        setAllPoints([]);
        setLoading(false);
        return;
      }

      const sessionMap = new Map<string, SessionPoint>();

      rawLogs.forEach((log: any) => {
        const w = log.weight_used || 0;
        const r = log.reps_completed || 0;
        if (w <= 0 || r <= 0) return;

        const rir = log.rir ?? null;
        const oneRM = calcOneRM(w, r, rir);
        const sessionKey = log.athlete_workout_id || log.logged_at.split('T')[0];
        const dateStr = log.logged_at;

        const existing = sessionMap.get(sessionKey);
        if (!existing || oneRM > existing.oneRM) {
          sessionMap.set(sessionKey, { date: dateStr, oneRM, weight: w, reps: r, rir, sessionKey });
        }
      });

      const sorted = Array.from(sessionMap.values())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setAllPoints(sorted);
      setLoading(false);
    })();
  }, [athleteId, exerciseName, exerciseId]);

  const filtered = useMemo(() => {
    const monthsMap: Record<TimePeriod, number> = { '1m': 1, '2m': 2, '3m': 3, '6m': 6, '12m': 12 };
    const months = monthsMap[period];
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    return allPoints.filter((p) => new Date(p.date) >= cutoff);
  }, [allPoints, period]);

  const displayPoints = filtered.length > 0 ? filtered : allPoints.slice(-20);

  const maxRM = displayPoints.length > 0 ? Math.max(...displayPoints.map((p) => p.oneRM)) : (currentMax || 0);
  const minRM = displayPoints.length > 0 ? Math.min(...displayPoints.map((p) => p.oneRM)) : (currentMax || 0);
  const avgRM = displayPoints.length > 0
    ? displayPoints.reduce((s, p) => s + p.oneRM, 0) / displayPoints.length
    : (currentMax || 0);

  const effectiveMax = currentMax ?? (displayPoints.length > 0 ? maxRM : null);

  const trend = displayPoints.length >= 2
    ? ((displayPoints[displayPoints.length - 1].oneRM - displayPoints[0].oneRM) / displayPoints[0].oneRM) * 100
    : 0;

  const formatDate = (iso: string) =>
    new Date(iso + (iso.includes('T') ? '' : 'T12:00:00'))
      .toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric' });

  const TrendIcon = trend > 2 ? TrendingUp : trend < -2 ? TrendingDown : Minus;
  const trendColor = trend > 2 ? 'text-green-500' : trend < -2 ? 'text-red-500' : 'text-gray-400';

  const chartW = 280;
  const chartH = 130;
  const padL = 28;
  const padR = 8;
  const padT = 10;
  const padB = 10;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;

  const chartRange = maxRM - minRM;
  const yPad = chartRange < 3 ? 3 : chartRange * 0.15;
  const yMin = Math.max(0, Math.floor((minRM - yPad) / 5) * 5);
  const yMax = Math.ceil((maxRM + yPad) / 5) * 5;
  const yRange = yMax - yMin || 1;

  const toChartX = (i: number) =>
    padL + (displayPoints.length > 1 ? (i / (displayPoints.length - 1)) : 0.5) * innerW;
  const toChartY = (val: number) =>
    padT + innerH - ((val - yMin) / yRange) * innerH;

  const yTicks = useMemo(() => {
    const span = yMax - yMin;
    const step = span <= 15 ? 5 : span <= 40 ? 10 : span <= 80 ? 20 : 25;
    const ticks: number[] = [];
    for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) ticks.push(v);
    return ticks;
  }, [yMin, yMax]);

  const svgPoints = displayPoints.map((p, i) => ({ x: toChartX(i), y: toChartY(p.oneRM), ...p }));

  const linePath = svgPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = svgPoints.length > 0
    ? linePath + ` L ${svgPoints[svgPoints.length - 1].x} ${padT + innerH} L ${svgPoints[0].x} ${padT + innerH} Z`
    : '';

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base leading-tight">
              {exerciseName}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {language === 'es' ? 'Máximo 1RM estimado' : 'Estimated 1-Rep Max'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Current 1RM hero */}
        <div className="mx-5 mb-3 bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 rounded-2xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              {language === 'es' ? 'Máximo actual' : 'Current Max'}
            </p>
            {effectiveMax ? (
              <p className="text-3xl font-bold text-[#fdda36]">
                {effectiveMax.toFixed(1)}<span className="text-lg font-normal text-gray-300 ml-1">kg</span>
              </p>
            ) : (
              <p className="text-xl font-semibold text-gray-400">—</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <Award className="w-8 h-8 text-[#fdda36]/60" />
            {displayPoints.length >= 2 && (
              <div className={`flex items-center gap-1 ${trendColor}`}>
                <TrendIcon className="w-3.5 h-3.5" />
                <span className="text-xs font-bold">
                  {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Time period filter */}
        <div className="px-5 mb-3 flex gap-1.5">
          {periods.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                period === key
                  ? 'bg-[#fdda36] text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Chart area */}
        <div className="px-5 pb-5">
          {loading ? (
            <div className="h-36 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-[#fdda36] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : displayPoints.length === 0 ? (
            <div className="h-36 flex flex-col items-center justify-center gap-2">
              <TrendingUp className="w-8 h-8 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center">
                {language === 'es' ? 'Sin registros en este periodo' : 'No records in this period'}
              </p>
            </div>
          ) : displayPoints.length === 1 ? (
            <div className="h-36 flex flex-col items-center justify-center gap-1">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{displayPoints[0].oneRM.toFixed(1)} kg</p>
              <p className="text-xs text-gray-400">{formatDate(displayPoints[0].date)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {displayPoints[0].weight} kg × {displayPoints[0].reps} reps
                {displayPoints[0].rir !== null ? ` · RIR ${displayPoints[0].rir}` : ''}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {language === 'es' ? '1 registro' : '1 record'}
              </p>
            </div>
          ) : (
            <div className="relative">
              <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" style={{ height: 150 }}>
                <defs>
                  <linearGradient id="wmGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fdda36" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#fdda36" stopOpacity="0.02" />
                  </linearGradient>
                  <clipPath id="wmClip">
                    <rect x={padL} y={padT} width={innerW} height={innerH} />
                  </clipPath>
                </defs>

                {yTicks.map(tick => (
                  <g key={tick}>
                    <line
                      x1={padL} x2={padL + innerW}
                      y1={toChartY(tick)} y2={toChartY(tick)}
                      stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="3 2"
                      className="dark:stroke-gray-700"
                    />
                    <text
                      x={padL - 4} y={toChartY(tick) + 3}
                      textAnchor="end" fontSize="7.5" fill="#9ca3af"
                    >
                      {tick}
                    </text>
                  </g>
                ))}

                <path d={areaPath} fill="url(#wmGrad)" clipPath="url(#wmClip)" />
                <path
                  d={linePath} fill="none"
                  stroke="#fdda36" strokeWidth="2.5"
                  strokeLinejoin="round" strokeLinecap="round"
                  clipPath="url(#wmClip)"
                />

                {svgPoints.map((p, i) => {
                  const isLast = i === svgPoints.length - 1;
                  const isMax = p.oneRM === maxRM;
                  return (
                    <g key={i}>
                      <circle
                        cx={p.x} cy={p.y}
                        r={isLast || isMax ? 5 : 3.5}
                        fill={isLast || isMax ? '#fdda36' : 'white'}
                        stroke={isLast || isMax ? 'white' : '#fdda36'}
                        strokeWidth="1.5"
                        className="dark:stroke-gray-900"
                      />
                      {(isLast || isMax) && (
                        <text
                          x={p.x}
                          y={p.y - 9}
                          textAnchor="middle"
                          fontSize="8"
                          fontWeight="bold"
                          fill="#fdda36"
                        >
                          {p.oneRM.toFixed(1)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* X-axis labels */}
              <div className="flex justify-between mt-0.5" style={{ paddingLeft: padL, paddingRight: padR }}>
                {svgPoints.length <= 5
                  ? svgPoints.map((p, i) => (
                      <span key={i} className="text-[8px] text-gray-400 dark:text-gray-500 text-center flex-1">
                        {formatDate(p.date)}
                      </span>
                    ))
                  : (
                    <>
                      <span className="text-[8px] text-gray-400">{formatDate(svgPoints[0].date)}</span>
                      <span className="text-[8px] text-gray-400">{formatDate(svgPoints[Math.floor(svgPoints.length / 2)].date)}</span>
                      <span className="text-[8px] text-gray-400">{formatDate(svgPoints[svgPoints.length - 1].date)}</span>
                    </>
                  )}
              </div>
            </div>
          )}

          {/* Stats row */}
          {(displayPoints.length > 0 || effectiveMax) && (
            <div className="mt-3 grid grid-cols-3 gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <div className="text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Max</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {maxRM.toFixed(1)}<span className="text-xs font-normal text-gray-400 ml-0.5">kg</span>
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">
                  {language === 'es' ? 'Prom.' : 'Avg'}
                </p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {avgRM.toFixed(1)}<span className="text-xs font-normal text-gray-400 ml-0.5">kg</span>
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">
                  {language === 'es' ? 'Sesiones' : 'Sessions'}
                </p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{displayPoints.length}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
