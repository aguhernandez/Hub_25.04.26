import { useState } from 'react';
import { Bike, PersonStanding, Waves, Dumbbell, Clock, Zap, ChevronDown, ChevronUp, RotateCcw, Play, Target, Activity, FileText, ClipboardCheck, CheckCircle2, ArrowLeftRight, Download, Share2, Info, AlertTriangle } from 'lucide-react';
import { exportFitWorkout } from '../../utils/fit/exportFitFile';
import ActivityShareCard from './ActivityShareCard';

export interface WorkoutStep {
  id: string;
  order: number;
  step_type: 'warmup' | 'steady' | 'interval' | 'recovery' | 'cooldown';
  duration_type: 'time' | 'distance';
  duration_value: number;
  target_type: 'power' | 'hr' | 'pace' | 'rpe';
  target_zone?: number;
  zone_system?: number;
  target_min_value?: number;
  target_max_value?: number;
  target_percent_ftp?: number;
  repeat_times?: number;
  repeat_group_id?: string;
}

export interface EnduranceWorkout {
  id: string;
  name: string;
  sport: string;
  sub_discipline?: string;
  description?: string;
  intensity_basis: string;
  scheduled_date: string;
  estimated_duration_minutes: number;
  estimated_impulse?: number;
  status: string;
  steps: WorkoutStep[];
  planner_source: string;
  session_type?: string;
  target_zones?: any[];
  rpe?: number | null;
  notes?: string;
}

const STEP_COLORS: Record<string, { fill: string; stroke: string; label: string; labelEs: string; dot: string }> = {
  warmup:   { fill: '#FEF3C7', stroke: '#F59E0B', label: 'Warm Up',   labelEs: 'Entrada en calor', dot: 'bg-amber-400' },
  steady:   { fill: '#D1FAE5', stroke: '#10B981', label: 'Steady',    labelEs: 'Constante',         dot: 'bg-emerald-500' },
  interval: { fill: '#FEE2E2', stroke: '#EF4444', label: 'Interval',  labelEs: 'Intervalo',         dot: 'bg-red-500' },
  recovery: { fill: '#CFFAFE', stroke: '#06B6D4', label: 'Recovery',  labelEs: 'Recuperación',      dot: 'bg-cyan-500' },
  cooldown: { fill: '#E0E7FF', stroke: '#6366F1', label: 'Cool Down', labelEs: 'Vuelta a la calma', dot: 'bg-violet-500' },
};

const SESSION_TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  easy:       { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  endurance:  { bg: 'bg-blue-100 dark:bg-blue-900/30',     text: 'text-blue-700 dark:text-blue-400',     dot: 'bg-blue-500' },
  tempo:      { bg: 'bg-amber-100 dark:bg-amber-900/30',   text: 'text-amber-700 dark:text-amber-400',   dot: 'bg-amber-500' },
  threshold:  { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
  vo2max:     { bg: 'bg-red-100 dark:bg-red-900/30',       text: 'text-red-700 dark:text-red-400',       dot: 'bg-red-500' },
  sprint:     { bg: 'bg-rose-100 dark:bg-rose-900/30',     text: 'text-rose-700 dark:text-rose-400',     dot: 'bg-rose-500' },
  recovery:   { bg: 'bg-gray-100 dark:bg-gray-700/50',     text: 'text-gray-600 dark:text-gray-300',     dot: 'bg-gray-400' },
  strength:   { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-400', dot: 'bg-violet-500' },
  race:       { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', dot: 'bg-yellow-500' },
  other:      { bg: 'bg-gray-100 dark:bg-gray-700/50',     text: 'text-gray-600 dark:text-gray-300',     dot: 'bg-gray-400' },
};

const SPORT_ICONS: Record<string, any> = {
  cycling: Bike,
  running: PersonStanding,
  swimming: Waves,
  strength: Dumbbell,
  other: Activity,
};

function getStepIntensity(step: WorkoutStep): number {
  if (step.target_percent_ftp != null) return Math.min(step.target_percent_ftp, 130);
  if (step.target_type === 'power' && step.target_zone != null) return step.target_zone * 18;
  if (step.target_type === 'rpe') {
    const rpe = step.target_max_value ?? step.target_min_value ?? step.target_zone;
    if (rpe != null) return Math.min((rpe / 10) * 100, 130);
  }
  if (step.target_type === 'hr' && step.target_zone != null) return step.target_zone * 18;
  if (step.target_zone != null) return step.target_zone * 18;
  // No intensity data — use step type defaults only as last resort
  const defaults: Record<string, number> = {
    warmup: 35, cooldown: 35, recovery: 30, steady: 65, interval: 90,
  };
  return defaults[step.step_type] ?? 50;
}

function getStepLabel(step: WorkoutStep): string {
  if (step.target_percent_ftp != null) return `${step.target_percent_ftp}%`;
  if (step.target_type === 'rpe') {
    const rpe = step.target_max_value ?? step.target_min_value ?? step.target_zone;
    if (rpe != null) return `RPE ${rpe}`;
  }
  if (step.target_zone != null) return `Z${step.target_zone}`;
  if (step.target_min_value != null && step.target_type === 'power') return `${step.target_min_value}W`;
  return '';
}

function formatDuration(step: WorkoutStep): string {
  if (step.duration_type === 'time') {
    const secs = step.duration_value;
    if (secs < 60) return `${secs}s`;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return s === 0 ? `${m} min` : `${m}:${String(s).padStart(2, '0')}`;
  }
  return `${(step.duration_value / 1000).toFixed(1)} km`;
}

function formatTarget(step: WorkoutStep, language: string): string {
  const parts: string[] = [];
  if (step.target_type === 'power') {
    if (step.target_percent_ftp != null) parts.push(`${step.target_percent_ftp}% FTP`);
    if (step.target_zone != null) parts.push(`Z${step.target_zone}`);
    if (step.target_min_value != null && step.target_max_value != null && !step.target_percent_ftp)
      parts.push(`${step.target_min_value}–${step.target_max_value} W`);
  } else if (step.target_type === 'hr') {
    if (step.target_zone != null) parts.push(`Z${step.target_zone}`);
    if (step.target_min_value != null && step.target_max_value != null)
      parts.push(`${step.target_min_value}–${step.target_max_value} bpm`);
  } else if (step.target_type === 'pace') {
    const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} /km`;
    if (step.target_min_value != null && step.target_max_value != null)
      parts.push(`${fmt(step.target_min_value)}–${fmt(step.target_max_value)}`);
    if (step.target_zone != null) parts.push(`Z${step.target_zone}`);
  } else if (step.target_type === 'rpe') {
    if (step.target_min_value != null && step.target_max_value != null)
      parts.push(`RPE ${step.target_min_value}–${step.target_max_value}`);
    else if (step.target_zone != null)
      parts.push(`RPE ${step.target_zone}`);
  }
  return parts.join(' · ');
}

function WorkoutBarChart({ steps }: { steps: WorkoutStep[] }) {
  if (!steps.length) return null;

  const totalDuration = steps.reduce((sum, s) => {
    const times = s.repeat_times && s.repeat_times > 1 ? s.repeat_times : 1;
    return sum + s.duration_value * times;
  }, 0);

  if (totalDuration === 0) return null;

  const CHART_H = 140;
  const MAX_INTENSITY = 130;

  const groupedByRepeat = new Map<string, WorkoutStep[]>();
  steps.forEach(s => {
    if (s.repeat_group_id) {
      if (!groupedByRepeat.has(s.repeat_group_id)) groupedByRepeat.set(s.repeat_group_id, []);
      groupedByRepeat.get(s.repeat_group_id)!.push(s);
    }
  });

  const expanded: WorkoutStep[] = [];
  steps.forEach(s => {
    if (s.repeat_group_id) {
      const group = groupedByRepeat.get(s.repeat_group_id)!;
      const lead = group.find(g => g.repeat_times && g.repeat_times > 1) || group[0];
      const repeatCount = lead.repeat_times || 1;
      for (let r = 0; r < repeatCount; r++) {
        group.forEach(gs => expanded.push(gs));
      }
    } else {
      expanded.push(s);
    }
  });

  const uniqueExpanded = expanded.filter((s, i, arr) => arr.indexOf(s) === i);
  const totalExpanded = uniqueExpanded.reduce((sum, s) => sum + s.duration_value, 0);

  const zoneBands = [
    { label: 'Z5', top: 0,   height: 20,  color: 'rgba(239,68,68,0.06)' },
    { label: 'Z4', top: 20,  height: 20,  color: 'rgba(251,146,60,0.06)' },
    { label: 'Z3', top: 40,  height: 20,  color: 'rgba(234,179,8,0.06)' },
    { label: 'Z2', top: 60,  height: 25,  color: 'rgba(34,197,94,0.06)' },
    { label: 'Z1', top: 85,  height: 15,  color: 'rgba(59,130,246,0.06)' },
  ];

  return (
    <div className="relative w-full overflow-hidden" style={{ height: CHART_H + 24 }}>
      <svg width="100%" height={CHART_H} className="absolute inset-0" preserveAspectRatio="none">
        {zoneBands.map(band => (
          <rect key={band.label} x="0" y={`${band.top}%`} width="100%" height={`${band.height}%`} fill={band.color} />
        ))}
        {uniqueExpanded.map((step, i) => {
          const intensity = getStepIntensity(step);
          const barH = (intensity / MAX_INTENSITY) * CHART_H;
          const xStart = uniqueExpanded.slice(0, i).reduce((s, st) => s + st.duration_value, 0) / totalExpanded * 100;
          const xWidth = step.duration_value / totalExpanded * 100;
          const colors = STEP_COLORS[step.step_type] || STEP_COLORS.steady;
          return (
            <g key={`${step.id}-${i}`}>
              <rect x={`${xStart}%`} y={CHART_H - barH} width={`${xWidth - 0.3}%`} height={barH} fill={colors.fill} stroke={colors.stroke} strokeWidth="1" rx="2" />
              {xWidth > 5 && (
                <text x={`${xStart + xWidth / 2}%`} y={CHART_H - barH + 14} textAnchor="middle" fontSize="9" fill={colors.stroke} fontWeight="600">
                  {getStepLabel(step)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[9px] text-gray-400 pt-1">
        <span>0m</span>
        <span>{Math.round(totalExpanded / 60)}m</span>
      </div>
    </div>
  );
}

function StepRow({ step, language }: { step: WorkoutStep; language: string }) {
  const colors = STEP_COLORS[step.step_type] || STEP_COLORS.steady;
  const label = language === 'es' ? colors.labelEs : colors.label;
  const target = formatTarget(step, language);
  const duration = formatDuration(step);
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors.dot}`} />
      <span className="text-xs text-gray-700 dark:text-gray-300 flex-1 truncate">{label}</span>
      <span className="text-xs text-gray-500 dark:text-gray-400 w-14 text-right flex-shrink-0">{duration}</span>
      {target && (
        <span className="text-xs font-bold flex-shrink-0 ml-2" style={{ color: colors.stroke }}>{target}</span>
      )}
    </div>
  );
}

function groupRepeatPairs(steps: WorkoutStep[]): Array<WorkoutStep | { isGroup: true; steps: WorkoutStep[]; repeatTimes: number; groupId: string }> {
  const seen = new Set<string>();
  const result: Array<WorkoutStep | { isGroup: true; steps: WorkoutStep[]; repeatTimes: number; groupId: string }> = [];
  for (const step of steps) {
    if (step.repeat_group_id) {
      if (seen.has(step.repeat_group_id)) continue;
      seen.add(step.repeat_group_id);
      const group = steps.filter(s => s.repeat_group_id === step.repeat_group_id);
      const lead = group.find(s => s.repeat_times && s.repeat_times > 1) || group[0];
      result.push({ isGroup: true, steps: group, repeatTimes: lead.repeat_times || 1, groupId: step.repeat_group_id });
    } else {
      result.push(step);
    }
  }
  return result;
}

function SessionTypeBadge({ type, language }: { type: string; language: string }) {
  const c = SESSION_TYPE_COLORS[type] || SESSION_TYPE_COLORS.other;
  const labels: Record<string, Record<string, string>> = {
    easy:      { es: 'Suave', en: 'Easy' },
    endurance: { es: 'Resistencia', en: 'Endurance' },
    tempo:     { es: 'Tempo', en: 'Tempo' },
    threshold: { es: 'Umbral', en: 'Threshold' },
    vo2max:    { es: 'VO2 Max', en: 'VO2 Max' },
    sprint:    { es: 'Sprint', en: 'Sprint' },
    recovery:  { es: 'Recuperación', en: 'Recovery' },
    strength:  { es: 'Fuerza', en: 'Strength' },
    race:      { es: 'Competencia', en: 'Race' },
    other:     { es: 'Otro', en: 'Other' },
  };
  const label = labels[type]?.[language === 'es' ? 'es' : 'en'] || type;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {label}
    </span>
  );
}

interface Props {
  workout: EnduranceWorkout;
  language: string;
  initialExpanded?: boolean;
  showFitExport?: boolean;
  onStartWorkout?: () => void;
  onLogWorkout?: () => void;
  onLogDifferentWorkout?: () => void;
}

export default function EnduranceWorkoutCard({ workout, language, initialExpanded = false, showFitExport = false, onStartWorkout, onLogWorkout, onLogDifferentWorkout }: Props) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [fitExporting, setFitExporting] = useState(false);
  const [fitExportMsg, setFitExportMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showFitInfo, setShowFitInfo] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);

  const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const handleFitExport = async () => {
    setFitExporting(true);
    setFitExportMsg(null);
    const result = await exportFitWorkout(workout);
    if (result.success) {
      const isShared = 'method' in result && result.method.startsWith('share');
      const successText = isShared
        ? (language === 'es' ? 'Archivo .FIT compartido' : '.FIT file shared')
        : (language === 'es' ? 'Archivo .FIT descargado' : '.FIT file downloaded');
      setFitExportMsg({ type: 'success', text: successText });
    } else {
      console.error('[FIT Export] Error shown to user:', result.error);
      setFitExportMsg({ type: 'error', text: language === 'es' ? 'Error al exportar .FIT. Revisa la consola.' : 'FIT export failed. Check console for details.' });
    }
    setFitExporting(false);
    setTimeout(() => setFitExportMsg(null), 5000);
  };

  const SportIcon = SPORT_ICONS[workout.sport] || SPORT_ICONS.other;
  const totalMinutes = workout.estimated_duration_minutes || 0;
  const stepCount = workout.steps?.length || 0;
  const hasSteps = stepCount > 0;

  const statusColors: Record<string, string> = {
    planned:     'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    completed:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    skipped:     'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  };
  const statusLabels: Record<string, string> = {
    planned:     language === 'es' ? 'Planificado' : 'Planned',
    in_progress: language === 'es' ? 'En progreso' : 'In Progress',
    completed:   language === 'es' ? 'Completado' : 'Completed',
    skipped:     language === 'es' ? 'Omitido' : 'Skipped',
  };

  const groupedSteps = groupRepeatPairs(workout.steps || []);
  const legendItems = [...new Set((workout.steps || []).map(s => s.step_type))];

  const intensityBasisLabel: Record<string, string> = {
    power: 'Power', hr: 'HR', pace: 'Pace', rpe: 'RPE',
  };

  const hours = totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60 > 0 ? `${totalMinutes % 60}min` : ''}`.trim() : `${totalMinutes} min`;

  return (
    <div className="rounded-xl border border-cyan-200 dark:border-cyan-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
      <div
        className="px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center flex-shrink-0">
              <SportIcon className="w-4.5 h-4.5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{workout.name}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {workout.planner_source}
                {workout.sub_discipline ? ` · ${workout.sub_discipline}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[workout.status] || statusColors.planned}`}>
              {statusLabels[workout.status] || workout.status}
            </span>
            {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-3 mt-2.5">
          {totalMinutes > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Clock className="w-3 h-3" />
              {hours}
            </span>
          )}
          {hasSteps && (
            <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Zap className="w-3 h-3" />
              {stepCount} {language === 'es' ? 'pasos' : 'steps'}
            </span>
          )}
          {workout.session_type && (
            <SessionTypeBadge type={workout.session_type} language={language} />
          )}
          {!hasSteps && workout.intensity_basis && workout.intensity_basis !== 'rpe' && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">
              {intensityBasisLabel[workout.intensity_basis] || workout.intensity_basis}
            </span>
          )}
          {workout.rpe != null && (
            <span className="text-xs text-gray-500 dark:text-gray-400">RPE {workout.rpe}</span>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-cyan-100 dark:border-cyan-900/50">
          {workout.description && (
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-start gap-2">
                <FileText className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{workout.description}</p>
              </div>
            </div>
          )}

          {workout.notes && workout.notes !== workout.description && (
            <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-900/30">
              <p className="text-xs text-amber-700 dark:text-amber-400">{workout.notes}</p>
            </div>
          )}

          {(workout.target_zones && workout.target_zones.length > 0) && (
            <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
                {language === 'es' ? 'Zonas objetivo' : 'Target Zones'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {workout.target_zones.map((z: any, i: number) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 font-medium">
                    {typeof z === 'object' ? (z.label || z.zone || JSON.stringify(z)) : z}
                  </span>
                ))}
              </div>
            </div>
          )}

          {hasSteps && (
            <>
              <div className="px-4 pt-3 pb-1">
                <WorkoutBarChart steps={workout.steps} />
              </div>
              <div className="px-4 pb-1 flex flex-wrap gap-x-3 gap-y-1">
                {legendItems.map(type => {
                  const c = STEP_COLORS[type];
                  if (!c) return null;
                  return (
                    <div key={type} className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: c.stroke }} />
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">{language === 'es' ? c.labelEs : c.label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="px-4 pb-3 pt-2">
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
                  {language === 'es' ? `Pasos (${stepCount})` : `Steps (${stepCount})`}
                </p>
                <div>
                  {groupedSteps.map((item, i) => {
                    if ('isGroup' in item) {
                      return (
                        <div key={item.groupId} className="mb-1">
                          <div className="flex items-center gap-1 mb-1 text-[10px] text-gray-400 dark:text-gray-500">
                            <RotateCcw className="w-3 h-3" />
                            <span className="font-semibold">{item.repeatTimes}x</span>
                          </div>
                          <div className="pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                            {item.steps.map(s => <StepRow key={s.id} step={s} language={language} />)}
                          </div>
                        </div>
                      );
                    }
                    return <StepRow key={item.id} step={item} language={language} />;
                  })}
                </div>
              </div>
            </>
          )}

          {/* FIT Export */}
          {showFitExport && (workout.steps?.length ?? 0) > 0 && (
            <div className="px-4 py-3 border-t border-cyan-100 dark:border-cyan-900/50 space-y-2">

              {/* Row: title + export button */}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 leading-tight">
                    {language === 'es' ? 'Exportar archivo .FIT' : 'Export .FIT File'}
                  </p>
                  <button
                    onClick={() => setShowFitInfo(v => !v)}
                    className="text-gray-400 dark:text-gray-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                    title={language === 'es' ? 'Cómo usar el archivo' : 'How to use this file'}
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  onClick={handleFitExport}
                  disabled={fitExporting}
                  className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-cyan-300 dark:border-cyan-700 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 text-xs font-semibold hover:bg-cyan-100 dark:hover:bg-cyan-900/50 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {fitExporting ? (
                    <Zap className="w-3.5 h-3.5 animate-pulse" />
                  ) : isMobileDevice ? (
                    <Share2 className="w-3.5 h-3.5" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  {fitExporting
                    ? (language === 'es' ? 'Generando…' : 'Generating…')
                    : 'Export .FIT'}
                </button>
              </div>

              {/* Collapsible usage instructions */}
              {showFitInfo && (
                <div className="rounded-lg border border-cyan-200 dark:border-cyan-800 bg-cyan-50/60 dark:bg-cyan-900/20 p-3 space-y-2.5 text-[11px] leading-relaxed text-gray-600 dark:text-gray-300">

                  {/* intervals.icu */}
                  <div>
                    <p className="font-semibold text-gray-700 dark:text-gray-200 mb-0.5">intervals.icu</p>
                    <p>
                      {language === 'es'
                        ? 'Usa la Biblioteca de Entrenamientos (icono de libro) → menú "···" → "Importar Workout". NO uses el botón de subir actividades (nube) — ese espera archivos de actividad grabados, no planes.'
                        : 'Use the Workout Library (book icon) → "···" menu → "Import Workout". Do NOT use the activity Upload button (cloud icon) — that expects recorded activity files, not plans.'}
                    </p>
                  </div>

                  {/* TrainingPeaks */}
                  <div>
                    <p className="font-semibold text-gray-700 dark:text-gray-200 mb-0.5">TrainingPeaks</p>
                    <p>
                      {language === 'es'
                        ? 'Biblioteca → "Agregar Workout" → "Importar desde archivo .FIT".'
                        : 'Library → "Add Workout" → "Import from .FIT file".'}
                    </p>
                  </div>

                  {/* Garmin device */}
                  <div>
                    <p className="font-semibold text-gray-700 dark:text-gray-200 mb-0.5">
                      {language === 'es' ? 'Dispositivo Garmin (USB)' : 'Garmin Device (USB)'}
                    </p>
                    <p>
                      {language === 'es'
                        ? 'Conecta el dispositivo por USB y copia el archivo a GARMIN/NewFiles/. El dispositivo lo procesará al arrancar.'
                        : 'Connect your device via USB and copy the file to GARMIN/NewFiles/. The device processes it on next boot.'}
                    </p>
                  </div>

                  {/* Garmin Connect warning */}
                  <div className="flex items-start gap-1.5 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-2.5 py-2">
                    <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-amber-700 dark:text-amber-400">
                      {language === 'es'
                        ? 'Garmin Connect rechaza workout .FIT por diseño (error 406). Su endpoint de subida solo acepta actividades grabadas. Usa el método USB arriba para dispositivos Garmin.'
                        : 'Garmin Connect upload intentionally rejects workout .FIT files (HTTP 406). Its upload endpoint only accepts recorded activities. Use the USB method above for Garmin devices.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Result feedback */}
              {fitExportMsg && (
                <div className={`flex items-center gap-1.5 text-[11px] font-medium rounded-md px-2.5 py-1.5 ${
                  fitExportMsg.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
                }`}>
                  {fitExportMsg.type === 'success'
                    ? <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                    : <AlertTriangle className="w-3 h-3 flex-shrink-0" />}
                  {fitExportMsg.text}
                </div>
              )}
            </div>
          )}

          {workout.status === 'completed' ? (
            <div className="px-4 pb-4 pt-2 space-y-2">
              <div className="flex items-center gap-2 py-2.5 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  {language === 'es' ? 'Completado' : 'Completed'}
                </span>
                {workout.rpe != null && (
                  <span className="ml-auto text-xs font-medium text-emerald-600 dark:text-emerald-500">
                    RPE {workout.rpe}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowShareCard(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white text-sm font-semibold transition-colors"
              >
                <Share2 className="w-4 h-4" />
                {language === 'es' ? 'Compartir' : 'Share'}
              </button>
            </div>
          ) : (
            <div className="px-4 pb-4 pt-2 flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={onStartWorkout}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700 text-white text-sm font-semibold transition-colors"
                >
                  <Play className="w-4 h-4" />
                  {language === 'es' ? 'Iniciar GPS' : 'Start GPS'}
                </button>
                <button
                  onClick={onLogWorkout}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold transition-colors border border-gray-200 dark:border-gray-700"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  {language === 'es' ? 'Registrar' : 'Log Workout'}
                </button>
              </div>
              {onLogDifferentWorkout && (
                <button
                  onClick={onLogDifferentWorkout}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors border border-dashed border-gray-200 dark:border-gray-700 hover:border-cyan-300 dark:hover:border-cyan-700"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  {language === 'es' ? 'Registrar otro entreno hoy' : 'Log Different Workout'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {showShareCard && (
        <ActivityShareCard
          activityData={{
            sportType: workout.sport || 'cycling',
            title: workout.name,
            distanceKm: 0,
            durationSeconds: (workout.estimated_duration_minutes || 0) * 60,
            elevationGainM: 0,
            date: workout.scheduled_date,
          }}
          onClose={() => setShowShareCard(false)}
        />
      )}
    </div>
  );
}
