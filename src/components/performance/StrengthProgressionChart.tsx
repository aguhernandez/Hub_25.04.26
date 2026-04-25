import { useState, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { TrendingUp, TrendingDown, Minus, Award } from 'lucide-react';

interface ExerciseLog {
  date: string;
  weight: number;
  reps: number;
  rir?: number;
  rpe?: number;
  sets?: number;
}

type TimePeriod = '1m' | '3m' | '6m' | '1y';

interface StrengthProgressionChartProps {
  exerciseName: string;
  logs: ExerciseLog[];
  timeFilter: TimePeriod;
}

const calcOneRM = (weight: number, reps: number, rir?: number | null): number => {
  if (!weight || weight <= 0 || !reps || reps <= 0) return weight || 0;
  const totalReps = reps + (rir !== null && rir !== undefined ? Math.min(Math.max(Math.round(rir), 0), 5) : 0);
  return Math.round(weight * (1 + totalReps / 30) * 10) / 10;
};

export default function StrengthProgressionChart({
  exerciseName,
  logs,
  timeFilter: externalTimeFilter,
}: StrengthProgressionChartProps) {
  const { language } = useLanguage();
  const [internalPeriod, setInternalPeriod] = useState<TimePeriod>(externalTimeFilter || '3m');

  const periods: { key: TimePeriod; label: string }[] = [
    { key: '1m', label: '1M' },
    { key: '3m', label: '3M' },
    { key: '6m', label: '6M' },
    { key: '1y', label: '1Y' },
  ];

  const allSessions = useMemo(() => {
    if (logs.length === 0) return [];
    return [...logs]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(l => ({ ...l, oneRM: calcOneRM(l.weight, l.reps, l.rir) }));
  }, [logs]);

  const chartData = useMemo(() => {
    const monthsMap: Record<TimePeriod, number> = { '1m': 1, '3m': 3, '6m': 6, '1y': 12 };
    const months = monthsMap[internalPeriod];
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const filtered = allSessions.filter(l => new Date(l.date) >= cutoff);
    return filtered.length > 0 ? filtered : allSessions.slice(-8);
  }, [allSessions, internalPeriod]);

  if (allSessions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          {language === 'es'
            ? 'No hay datos disponibles para este ejercicio'
            : 'No data available for this exercise'}
        </p>
      </div>
    );
  }

  const maxRM = chartData.length > 0 ? Math.max(...chartData.map(l => l.oneRM)) : 0;
  const minRM = chartData.length > 0 ? Math.min(...chartData.map(l => l.oneRM)) : 0;
  const avgRM = chartData.length > 0
    ? chartData.reduce((s, l) => s + l.oneRM, 0) / chartData.length
    : 0;
  const currentRM = chartData.length > 0 ? chartData[chartData.length - 1].oneRM : 0;

  const trend = chartData.length >= 2
    ? ((chartData[chartData.length - 1].oneRM - chartData[0].oneRM) / chartData[0].oneRM) * 100
    : 0;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + (dateStr.includes('T') ? '' : 'T12:00:00'));
    return date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getTrendIcon = () => {
    if (trend > 2) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend < -2) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
  };

  const getTrendColor = () => {
    if (trend > 2) return 'text-green-500';
    if (trend < -2) return 'text-red-500';
    return 'text-gray-400';
  };

  const getRIRColor = (rir?: number | null): string => {
    if (rir === undefined || rir === null) return '#22c55e';
    if (rir <= 2) return '#ef4444';
    if (rir <= 4) return '#eab308';
    return '#22c55e';
  };

  const SVG_W = 320;
  const SVG_H = 140;
  const PAD_L = 34;
  const PAD_R = 10;
  const PAD_T = 18;
  const PAD_B = 10;
  const plotW = SVG_W - PAD_L - PAD_R;
  const plotH = SVG_H - PAD_T - PAD_B;

  const range = maxRM - minRM;
  const padding = range < 3 ? 3 : range * 0.15;
  const yMin = Math.max(0, Math.floor((minRM - padding) / 5) * 5);
  const yMax = Math.ceil((maxRM + padding) / 5) * 5;
  const yRange = yMax - yMin || 1;

  const toX = (i: number) =>
    PAD_L + (chartData.length > 1 ? i / (chartData.length - 1) : 0.5) * plotW;
  const toY = (val: number) =>
    PAD_T + plotH - ((val - yMin) / yRange) * plotH;

  const yTicks = useMemo(() => {
    const span = yRange;
    const step = span <= 15 ? 5 : span <= 40 ? 10 : span <= 80 ? 20 : 25;
    const ticks: number[] = [];
    for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) ticks.push(v);
    return ticks;
  }, [yMin, yMax, yRange]);

  const linePath = chartData
    .map((log, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(log.oneRM)}`)
    .join(' ');

  const areaPath =
    linePath +
    ` L ${toX(chartData.length - 1)} ${PAD_T + plotH}` +
    ` L ${toX(0)} ${PAD_T + plotH} Z`;

  return (
    <div className="space-y-4">
      {/* Hero header — same style as WorkingMaxModal */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
            {exerciseName}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {language === 'es' ? 'Máximo 1RM estimado' : 'Estimated 1-Rep Max'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {getTrendIcon()}
          <span className={`text-lg font-bold ${getTrendColor()}`}>
            {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Current max card */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 rounded-2xl px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
            {language === 'es' ? 'Máximo actual' : 'Current Max'}
          </p>
          <p className="text-3xl font-bold text-[#fdda36]">
            {currentRM.toFixed(1)}<span className="text-lg font-normal text-gray-300 ml-1">kg</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {chartData[chartData.length - 1]?.weight} kg × {chartData[chartData.length - 1]?.reps} reps
            {chartData[chartData.length - 1]?.rir != null
              ? ` · RIR ${chartData[chartData.length - 1].rir}`
              : ''}
          </p>
        </div>
        <Award className="w-9 h-9 text-[#fdda36]/50" />
      </div>

      {/* Time period filter */}
      <div className="flex gap-1.5">
        {periods.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setInternalPeriod(key)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              internalPeriod === key
                ? 'bg-[#fdda36] text-gray-900'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {chartData.length === 1 ? (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl py-8 flex flex-col items-center gap-1">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{chartData[0].oneRM.toFixed(1)} kg</p>
          <p className="text-xs text-gray-400">{formatDate(chartData[0].date)}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {chartData[0].weight} kg × {chartData[0].reps} reps
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {language === 'es' ? '1 registro' : '1 record'}
          </p>
        </div>
      ) : (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3">
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className="w-full"
            style={{ height: 170, overflow: 'visible' }}
          >
            <defs>
              <linearGradient id="spGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fdda36" stopOpacity="0.30" />
                <stop offset="100%" stopColor="#fdda36" stopOpacity="0.02" />
              </linearGradient>
              <clipPath id="spClip">
                <rect x={PAD_L} y={PAD_T} width={plotW} height={plotH} />
              </clipPath>
            </defs>

            {yTicks.map(tick => (
              <g key={tick}>
                <line
                  x1={PAD_L} x2={PAD_L + plotW}
                  y1={toY(tick)} y2={toY(tick)}
                  stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="3 2"
                  className="dark:stroke-gray-700"
                />
                <text
                  x={PAD_L - 5} y={toY(tick) + 3}
                  textAnchor="end" fontSize="8" fill="#9ca3af"
                >
                  {tick}
                </text>
              </g>
            ))}

            <path d={areaPath} fill="url(#spGrad)" clipPath="url(#spClip)" />
            <path
              d={linePath} fill="none"
              stroke="#fdda36" strokeWidth="2.5"
              strokeLinejoin="round" strokeLinecap="round"
              clipPath="url(#spClip)"
            />

            {chartData.map((log, i) => {
              const x = toX(i);
              const y = toY(log.oneRM);
              const dotColor = getRIRColor(log.rir);
              const isLast = i === chartData.length - 1;
              const isMax = log.oneRM === maxRM;
              return (
                <g key={i} className="group">
                  <circle
                    cx={x} cy={y}
                    r={isLast || isMax ? 5.5 : 4}
                    fill={isLast || isMax ? dotColor : 'white'}
                    stroke={dotColor}
                    strokeWidth="2"
                    className="dark:stroke-gray-900 dark:fill-gray-900"
                  />
                  {isLast || isMax ? (
                    <circle cx={x} cy={y} r={2.5} fill="white" />
                  ) : (
                    <circle cx={x} cy={y} r={2} fill={dotColor} />
                  )}

                  {(isLast || isMax) && (
                    <text
                      x={x} y={y - 10}
                      textAnchor="middle" fontSize="8.5" fontWeight="bold" fill="#fdda36"
                    >
                      {log.oneRM.toFixed(1)}
                    </text>
                  )}

                  <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <rect
                      x={Math.min(Math.max(x - 50, PAD_L), SVG_W - PAD_R - 100)}
                      y={y - 62}
                      width={100} height={54} rx={6}
                      fill="#111827" opacity={0.95}
                    />
                    <text x={Math.min(Math.max(x, PAD_L + 50), SVG_W - PAD_R - 50)} y={y - 46}
                      textAnchor="middle" fontSize="8.5" fill="#9ca3af">
                      {formatDate(log.date)}
                    </text>
                    <text x={Math.min(Math.max(x, PAD_L + 50), SVG_W - PAD_R - 50)} y={y - 31}
                      textAnchor="middle" fontSize="11" fontWeight="bold" fill="white">
                      {log.oneRM.toFixed(1)} kg 1RM
                    </text>
                    <text x={Math.min(Math.max(x, PAD_L + 50), SVG_W - PAD_R - 50)} y={y - 16}
                      textAnchor="middle" fontSize="8.5" fill="#6b7280">
                      {log.weight}kg × {log.reps}r{log.rir != null ? ` RIR${log.rir}` : ''}
                    </text>
                  </g>

                  <text
                    x={x} y={PAD_T + plotH + 14}
                    textAnchor="middle" fontSize="8" fill="#9ca3af"
                  >
                    {formatDate(log.date)}
                  </text>
                </g>
              );
            })}

            <line
              x1={PAD_L} x2={PAD_L}
              y1={PAD_T} y2={PAD_T + plotH}
              stroke="#e5e7eb" strokeWidth="1"
              className="dark:stroke-gray-700"
            />
          </svg>
        </div>
      )}

      {/* RIR legend */}
      <div className="flex items-center justify-center gap-5 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
          <span>RIR 5+</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
          <span>RIR 3-4</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
          <span>RIR 0-2</span>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Max 1RM</p>
          <p className="text-base font-bold text-gray-900 dark:text-white">
            {maxRM.toFixed(1)}<span className="text-xs font-normal text-gray-400 ml-0.5">kg</span>
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">
            {language === 'es' ? 'Prom. 1RM' : 'Avg 1RM'}
          </p>
          <p className="text-base font-bold text-gray-900 dark:text-white">
            {avgRM.toFixed(1)}<span className="text-xs font-normal text-gray-400 ml-0.5">kg</span>
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">
            {language === 'es' ? 'Sesiones' : 'Sessions'}
          </p>
          <p className="text-base font-bold text-gray-900 dark:text-white">{chartData.length}</p>
        </div>
      </div>
    </div>
  );
}
