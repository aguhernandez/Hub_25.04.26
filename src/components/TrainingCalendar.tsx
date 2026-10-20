import { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, Dumbbell, Activity, MoreVertical,
  Copy, Trash2, Plus, CreditCard as Edit, Bike, PersonStanding, Waves,
  ChevronDown, Heart, CheckCircle2, Flag, Sofa, StickyNote, Clock, MapPin, Zap
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import DeleteWorkoutModal from './DeleteWorkoutModal';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasWorkout: boolean;
  workoutStatus?: 'completed' | 'pending' | 'skipped';
  workoutName?: string;
  workoutSource?: 'asciende' | 'trainingpeaks';
  activities: any[];
}

interface WellnessEntry {
  checkin_date: string;
  wellness_score_100?: number;
  overall_score?: number;
  [key: string]: any;
}

interface TrainingCalendarProps {
  workouts: any[];
  onDaySelect: (date: Date) => void;
  selectedDate: Date;
  onWorkoutMove?: (workoutId: string, newDate: string) => void;
  onWorkoutClick?: (workout: any) => void;
  wellnessEntries?: WellnessEntry[];
  onWellnessClick?: (entry: WellnessEntry) => void;
  onWorkoutEdit?: (workout: any) => void;
  onWorkoutDuplicate?: (workout: any) => void;
  onWorkoutDelete?: (workoutId: string) => void;
  onAddWorkout?: (date: Date) => void;
  onAddExtraTraining?: (date: Date) => void;
  onAddRestDay?: (date: Date) => void;
  onAddNote?: (date: Date) => void;
  onCalendarEventClick?: (event: any) => void;
  onWearableMatchAction?: (sessionId: string, status: 'manual_matched' | 'dismissed' | 'unplanned', plannedWorkoutId?: string) => void;
}

const SESSION_DOT_COLORS: Record<string, string> = {
  easy:      '#10B981',
  endurance: '#3B82F6',
  tempo:     '#F59E0B',
  threshold: '#F97316',
  vo2max:    '#EF4444',
  sprint:    '#F43F5E',
  recovery:  '#9CA3AF',
  strength:  '#8B5CF6',
  race:      '#EAB308',
  other:     '#9CA3AF',
};

const STEP_BAR_COLORS: Record<string, string> = {
  warmup:   '#F59E0B',
  steady:   '#10B981',
  interval: '#EF4444',
  recovery: '#06B6D4',
  cooldown: '#6366F1',
};

const DIFFICULTY_COLOR_MAP: Record<string, string> = {
  red:    '#EF4444',
  yellow: '#F59E0B',
  green:  '#10B981',
  blue:   '#3B82F6',
  orange: '#F97316',
  gray:   '#9CA3AF',
  grey:   '#9CA3AF',
};

function parseDifficultyColor(workout: any): string | null {
  const sources = [workout.notes || '', workout.description || ''];
  for (const src of sources) {
    const m = src.match(/DIFFICULTY[:\s]+\w+\s*\((\w+)\)/i);
    if (m) {
      const color = m[1].toLowerCase();
      if (DIFFICULTY_COLOR_MAP[color]) return DIFFICULTY_COLOR_MAP[color];
    }
  }
  return null;
}

function getSessionDotColor(workout: any): string {
  if (workout.session_type && SESSION_DOT_COLORS[workout.session_type]) {
    return SESSION_DOT_COLORS[workout.session_type];
  }
  if (workout.status === 'completed') return '#14B8A6';
  if (workout.status === 'skipped') return '#9CA3AF';
  return '#FDDA36';
}

function getWorkoutDotColor(workout: any): string {
  if (workout.type === 'race_plan') return '#EAB308';
  if (workout.source === 'trainingpeaks') return '#3B82F6';
  if (workout.source === 'asciende_gps') return '#14B8A6';
  if (workout.source === 'strava') return '#EF4444';
  if (workout.type === 'extra') return '#F97316';
  if (workout.type === 'endurance_plan') {
    const diffColor = parseDifficultyColor(workout);
    if (diffColor) return diffColor;
    if (workout.session_type && SESSION_DOT_COLORS[workout.session_type]) {
      return SESSION_DOT_COLORS[workout.session_type];
    }
    return '#06B6D4';
  }
  return getSessionDotColor(workout);
}

function SportIcon({ sport, className }: { sport?: string; className?: string }) {
  const cls = className || 'w-4 h-4';
  if (!sport) return <Activity className={cls} />;
  const s = sport.toLowerCase();
  if (s.includes('bike') || s.includes('cycl') || s.includes('road') || s.includes('gravel') || s.includes('mtb')) {
    return <Bike className={cls} />;
  }
  if (s.includes('run') || s.includes('trail')) return <PersonStanding className={cls} />;
  if (s.includes('swim')) return <Waves className={cls} />;
  if (s.includes('strength') || s.includes('gym')) return <Dumbbell className={cls} />;
  return <Activity className={cls} />;
}

function formatMinutes(minutes: number): string {
  if (!minutes || minutes <= 0) return '--:--:--';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}:${String(m).padStart(2, '0')}:00`;
}

function StepIntensityChart({ steps }: { steps: any[] }) {
  if (!steps || steps.length === 0) return null;

  const expanded: { type: string; duration: number }[] = [];
  const repeatGroups = new Map<string, any[]>();
  steps.forEach(step => {
    if (step.repeat_group_id) {
      const group = repeatGroups.get(step.repeat_group_id) || [];
      group.push(step);
      repeatGroups.set(step.repeat_group_id, group);
    }
  });
  const emittedGroups = new Set<string>();
  for (const step of steps) {
    const groupId = step.repeat_group_id;
    if (groupId) {
      if (emittedGroups.has(groupId)) continue;
      emittedGroups.add(groupId);
      const group = repeatGroups.get(groupId) || [step];
      const repeatCount = Math.max(1, Number(group.find(item => Number(item.repeat_times) > 1)?.repeat_times) || 1);
      for (let repeat = 0; repeat < repeatCount; repeat++) {
        for (const item of group) expanded.push({ type: item.step_type || 'steady', duration: Number(item.duration_value) || 60 });
      }
      continue;
    }
    const repeats = Math.max(1, Number(step.repeat_times) || 1);
    for (let repeat = 0; repeat < repeats; repeat++) {
      expanded.push({ type: step.step_type || 'steady', duration: Number(step.duration_value) || 60 });
    }
  }

  const total = expanded.reduce((s, st) => s + st.duration, 0);
  if (total === 0) return null;

  const heights: Record<string, number> = {
    warmup: 10, recovery: 8, steady: 16, interval: 28, cooldown: 8,
  };

  return (
    <div className="flex items-end gap-[2px] h-8 w-full mt-2">
      {expanded.map((seg, i) => {
        const widthPct = (seg.duration / total) * 100;
        const h = heights[seg.type] ?? 12;
        const color = STEP_BAR_COLORS[seg.type] ?? '#9CA3AF';
        return (
          <div
            key={i}
            style={{
              width: `${Math.max(widthPct, 1)}%`,
              height: `${h}px`,
              backgroundColor: color,
              borderRadius: '2px 2px 0 0',
              flexShrink: 0,
            }}
          />
        );
      })}
    </div>
  );
}

function MonthWorkoutCard({
  workout, language, onClick, onMenuClick,
}: { workout: any; language: string; onClick: () => void; onMenuClick?: (e: React.MouseEvent<HTMLButtonElement>) => void }) {
  const t = (es: string, en: string) => language === 'es' ? es : en;
  const details = workout.endurance_workout_data || {};
  const raw = workout.raw_data || {};
  const steps = workout.steps || workout.parsed_steps || details.steps || [];
  const isCompleted = workout.status === 'completed';
  const isSkipped = workout.status === 'skipped';
  const background = isCompleted
    ? 'bg-emerald-50 dark:bg-emerald-950/35'
    : isSkipped
      ? 'bg-gray-50 dark:bg-gray-800/70'
      : 'bg-amber-50 dark:bg-amber-950/25';
  const borderColor = isCompleted ? '#10B981' : isSkipped ? '#9CA3AF' : getWorkoutDotColor(workout);

  const seconds = Number(workout.duration_seconds ?? raw.duration_seconds ?? workout.wearable_match?.session?.duration_seconds);
  const durationMinutes = Number(workout.estimated_duration_minutes ?? details.estimated_duration_minutes ?? details.planned_duration_minutes ?? details.duration_min);
  const durationText = Number.isFinite(seconds) && seconds > 0
    ? `${Math.floor(seconds / 3600)}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
    : durationMinutes > 0
      ? formatMinutes(durationMinutes)
      : (workout.duration || null);

  const rawDistance = workout.distance_km ?? details.distance_km ?? details.planned_distance_km;
  const distanceMeters = workout.distance_m ?? raw.distance_meters ?? workout.wearable_match?.session?.distance_m;
  const distanceKm = rawDistance != null ? Number(rawDistance) : distanceMeters != null ? Number(distanceMeters) / 1000 : (workout.distance != null ? Number(workout.distance) : null);
  const load = Number(workout.estimated_impulse ?? details.planned_tss ?? details.tss ?? raw.tss);
  const exerciseCount = Number(workout.exerciseCount ?? workout.exercises?.length ?? 0);
  const sport = workout.sport || details.sport || workout.type;
  const name = workout.name || workout.external_title || details.name || t('Entrenamiento', 'Workout');

  return (
    <div className="relative">
      <button
        type="button"
        onClick={event => { event.stopPropagation(); onClick(); }}
        className={`w-full min-w-0 rounded-xl border border-gray-200/80 dark:border-gray-700/80 p-2.5 text-left shadow-sm transition hover:shadow-md active:scale-[0.99] ${background}`}
        style={{ borderLeft: `3px solid ${borderColor}` }}
        title={name}
      >
        <div className={`flex items-start gap-1.5 ${onMenuClick ? 'pr-5' : ''}`}>
          <SportIcon sport={sport} className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-600 dark:text-gray-300" />
          <span className="min-w-0 flex-1 line-clamp-2 text-[11px] font-semibold leading-tight text-gray-900 dark:text-white">{name}</span>
          {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] font-medium text-gray-700 dark:text-gray-200">
          {durationText && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3 text-gray-500" />{durationText}</span>}
          {distanceKm != null && Number.isFinite(distanceKm) && distanceKm > 0 && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3 text-gray-500" />{distanceKm.toFixed(1)} km</span>}
          {Number.isFinite(load) && load > 0 && <span className="inline-flex items-center gap-1"><Zap className="h-3 w-3 text-amber-500" />{Math.round(load)} TSS</span>}
          {exerciseCount > 0 && <span>{exerciseCount} {t('ejercicios', 'exercises')}</span>}
        </div>
        {steps.length > 0 && <StepIntensityChart steps={steps} />}
      </button>
      {onMenuClick && (
        <button
          type="button"
          aria-label={t('Opciones del entrenamiento', 'Workout options')}
          onClick={event => { event.stopPropagation(); onMenuClick(event); }}
          className="absolute right-1 top-1 rounded p-0.5 text-gray-500 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function cleanDescription(text?: string): string {
  if (!text) return '';
  return text
    .replace(/^DIFFICULTY[:\s]+\w+\s*\(\w+\)\s*\n?/i, '')
    .trim();
}

function isGymWorkout(workout: any): boolean {
  const sport = (workout.sport || workout.type || '').toLowerCase();
  return sport === 'workout' || sport === 'strength' || sport === 'gym' ||
    (!sport && workout.type !== 'endurance_plan' && workout.type !== 'external' && workout.source !== 'strava');
}

function isEnduranceType(workout: any): boolean {
  const sport = (workout.sport || '').toLowerCase();
  return workout.type === 'endurance_plan' || workout.type === 'external' || workout.type === 'wearable_executed' ||
    workout.source === 'strava' || workout.source === 'asciende_gps' ||
    ['run', 'trail_run', 'road_bike', 'mountain_bike', 'gravel_bike', 'cycling', 'swim', 'hike', 'walk'].some(s => sport.includes(s));
}

function WorkoutDetailCard({
  workout, language, onClick, wellnessScore,
}: { workout: any; language: string; onClick: () => void; wellnessScore?: number }) {
  const t = (es: string, en: string) => language === 'es' ? es : en;
  const dotColor = getWorkoutDotColor(workout);
  const sport = workout.sport || workout.type;
  const name = workout.name || workout.external_title || t('Entrenamiento', 'Workout');
  const steps = workout.steps || workout.parsed_steps || [];
  const description = cleanDescription(workout.description);
  const isCompleted = workout.status === 'completed';
  const isGym = isGymWorkout(workout);
  const isEndurance = isEnduranceType(workout);

  const renderMetrics = () => {
    if (isCompleted && isEndurance) {
      const raw = workout.raw_data || workout;
      const distanceMeters = workout.distance_m ?? raw?.distance_meters;
      const distKm = workout.distance || (distanceMeters != null ? (Number(distanceMeters) / 1000).toFixed(2) : null);
      const durationSec = workout.duration_seconds ?? raw?.duration_seconds;
      const elevGain = raw?.elevation_gain_meters;
      const paceStr = (distKm && durationSec && distKm > 0)
        ? (() => { const minPerKm = (durationSec / 60) / distKm; return `${Math.floor(minPerKm)}:${String(Math.round((minPerKm - Math.floor(minPerKm)) * 60)).padStart(2, '0')}/km`; })()
        : null;
      const durStr = durationSec
        ? `${Math.floor(durationSec / 3600)}:${String(Math.floor((durationSec % 3600) / 60)).padStart(2, '0')}:${String(durationSec % 60).padStart(2, '0')}`
        : (workout.duration || (workout.estimated_duration_minutes ? formatMinutes(workout.estimated_duration_minutes) : null));

      return (
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
          {durStr && <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">{durStr}</span>}
          {distKm && <span className="font-semibold text-gray-800 dark:text-gray-200">{distKm} km</span>}
          {paceStr && <span>{paceStr}</span>}
          {elevGain != null && elevGain > 0 && <span>+{Math.round(elevGain)}m</span>}
          {workout.avg_hr != null && <span>♥ {Math.round(Number(workout.avg_hr))} bpm</span>}
          {workout.max_hr != null && <span>{t('Máx.', 'Max')} {Math.round(Number(workout.max_hr))} bpm</span>}
          {workout.calories != null && <span>{Math.round(Number(workout.calories))} kcal</span>}
          {wellnessScore != null && (
            <span className={`font-semibold ${getWellnessColor(wellnessScore).text}`}>
              <Heart className="w-3 h-3 inline mr-0.5" />{Math.round(wellnessScore)}
            </span>
          )}
        </div>
      );
    }

    if (isCompleted && isGym) {
      const exerciseCount = workout.exerciseCount || workout.exercises?.length || null;
      const totalVolume = workout.totalVolume;
      return (
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
          {totalVolume != null && totalVolume > 0 && (
            <span className="font-semibold text-gray-800 dark:text-gray-200">{Math.round(totalVolume).toLocaleString()} kg</span>
          )}
          {exerciseCount != null && exerciseCount > 0 && (
            <span>{exerciseCount} {t('ejercicios', 'exercises')}</span>
          )}
          {wellnessScore != null && (
            <span className={`font-semibold ${getWellnessColor(wellnessScore).text}`}>
              <Heart className="w-3 h-3 inline mr-0.5" />{Math.round(wellnessScore)}
            </span>
          )}
        </div>
      );
    }

    // Planned endurance
    if (!isCompleted && isEndurance) {
      const duration = workout.estimated_duration_minutes || workout.endurance_workout_data?.estimated_duration_minutes || workout.endurance_workout_data?.planned_duration_minutes || workout.endurance_workout_data?.duration_min;
      const distance = workout.endurance_workout_data?.distance_km || workout.endurance_workout_data?.planned_distance_km || workout.distance_km;
      const load = workout.estimated_impulse || workout.endurance_workout_data?.planned_tss || workout.endurance_workout_data?.tss;
      return (
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
          <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">
            {duration ? formatMinutes(duration) : '--:--:--'}
          </span>
          {distance != null && Number(distance) > 0 && <span>{Number(distance).toFixed(1)} km</span>}
          {load != null && Number(load) > 0 && <span>{Math.round(Number(load))} TSS</span>}
        </div>
      );
    }

    // Planned gym
    if (!isCompleted && isGym) {
      const exerciseCount = workout.exerciseCount || workout.exercises?.length || null;
      return (
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          {exerciseCount != null && exerciseCount > 0 && (
            <span>{exerciseCount} {t('ejercicios', 'exercises')}</span>
          )}
          {(!exerciseCount || exerciseCount === 0) && (
            <span className="italic">{t('Planificado', 'Planned')}</span>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 hover:shadow-md transition-shadow active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <SportIcon sport={sport} className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">{name}</span>
        </div>
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: dotColor }} />
      </div>

      {renderMetrics()}

      {steps.length > 0 && <StepIntensityChart steps={steps} />}

      {description && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">{description}</p>
      )}
    </button>
  );
}

function getWellnessColor(score: number) {
  if (score >= 70) return { bg: '#10b981', light: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' };
  if (score >= 45) return { bg: '#f59e0b', light: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-400' };
  return { bg: '#f43f5e', light: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300', dot: 'bg-rose-500' };
}

export default function TrainingCalendar({
  workouts,
  onDaySelect,
  selectedDate,
  onWorkoutMove,
  onWorkoutClick,
  onWorkoutEdit,
  onWorkoutDuplicate,
  onWorkoutDelete,
  onAddWorkout,
  onAddExtraTraining,
  onAddRestDay,
  onAddNote,
  onCalendarEventClick,
  onWearableMatchAction,
  wellnessEntries = [],
  onWellnessClick,
}: TrainingCalendarProps) {
  const { language } = useLanguage();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [draggedWorkout, setDraggedWorkout] = useState<string | null>(null);
  const [contextMenuWorkout, setContextMenuWorkout] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [workoutPendingDelete, setWorkoutPendingDelete] = useState<any | null>(null);
  const [showAddMenuForDate, setShowAddMenuForDate] = useState<string | null>(null);
  const closeContextMenu = () => { setContextMenuWorkout(null); setContextMenuPos(null); };
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenuWorkout) closeContextMenu();
      if (showAddMenuForDate) setShowAddMenuForDate(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenuWorkout, showAddMenuForDate]);

  const openContextMenu = (workoutId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (contextMenuWorkout === workoutId) {
      closeContextMenu();
      return;
    }
    setContextMenuWorkout(workoutId);
    setContextMenuPos({ x: rect.right, y: rect.bottom });
  };

  const monthNames = language === 'es'
    ? ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const dayNamesShort = language === 'es'
    ? ['D', 'L', 'M', 'X', 'J', 'V', 'S']
    : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const dayNamesFull = language === 'es'
    ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const dayNames = language === 'es'
    ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => { generateCalendar(); }, [currentMonth, workouts]);

  const formatDateLocal = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const generateCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = formatDateLocal(date);
      const dayActivities = workouts.filter(w => w.scheduled_date === dateStr);
      const dayWorkout = dayActivities.find(w => w.type === 'workout');

      days.push({
        date: new Date(date),
        isCurrentMonth: date.getMonth() === month,
        isToday: date.getTime() === today.getTime(),
        hasWorkout: dayActivities.length > 0,
        workoutStatus: dayWorkout?.status || (dayActivities.length > 0 ? 'completed' : undefined),
        workoutName: dayWorkout?.name,
        workoutSource: dayWorkout?.source || 'asciende',
        activities: dayActivities,
      });
    }

    setCalendarDays(days);
  };

  const goToPreviousMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const goToNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    onDaySelect(today);
  };

  const selectedDateStr = formatDateLocal(selectedDate);
  const selectedDayActivities = workouts.filter(w => w.scheduled_date === selectedDateStr);

  const getRelativeDayLabel = (date: Date): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return language === 'es' ? 'Hoy' : 'Today';
    if (diff === 1) return language === 'es' ? 'Mañana' : 'Tomorrow';
    if (diff === -1) return language === 'es' ? 'Ayer' : 'Yesterday';
    const dName = dayNamesFull[date.getDay()];
    const day = date.getDate();
    const monthAbbr = language === 'es'
      ? ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][date.getMonth()]
      : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][date.getMonth()];
    return `${dName} • ${day}. ${monthAbbr} ${date.getFullYear()}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">

      {/* Shared header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <button onClick={goToPreviousMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>

        <button onClick={goToToday} className="flex flex-col items-center gap-0.5">
          <span className="text-base font-bold text-gray-900 dark:text-white tracking-wide">
            {monthNames[currentMonth.getMonth()].toUpperCase()} {currentMonth.getFullYear()}
          </span>
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </button>

        <button onClick={goToNextMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* ── MOBILE compact view (below md) ── */}
      <div className="block md:hidden">
        {/* Day names */}
        <div className="grid grid-cols-7 px-2 pt-2 pb-1">
          {dayNamesShort.map((d, i) => (
            <div key={i} className="text-center text-xs font-semibold text-gray-400 dark:text-gray-500 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Compact day cells */}
        <div className="grid grid-cols-7 px-2 gap-y-1">
          {calendarDays.map((day, index) => {
            const isSelected = day.date.toDateString() === selectedDate.toDateString();
            const dateStr = formatDateLocal(day.date);

            return (
              <button
                key={index}
                onClick={() => onDaySelect(day.date)}
                onDragOver={(e) => { if (draggedWorkout && day.isCurrentMonth) e.preventDefault(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedWorkout && onWorkoutMove && day.isCurrentMonth) {
                    onWorkoutMove(draggedWorkout, dateStr);
                    setDraggedWorkout(null);
                  }
                }}
                className={`
                  flex flex-col items-center justify-center py-1.5 rounded-full mx-auto w-9 transition-all
                  ${!day.isCurrentMonth ? 'opacity-25' : ''}
                  ${isSelected
                    ? 'bg-[#514163]'
                    : day.isToday
                    ? 'ring-2 ring-[#514163]'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
              >
                <span className={`text-sm font-semibold leading-none ${
                  isSelected ? 'text-white' : 'text-gray-900 dark:text-white'
                }`}>
                  {day.date.getDate()}
                </span>

                <div className="flex items-center gap-[3px] mt-1 min-h-[7px]">
                  {day.activities.slice(0, 3).map((w, wi) => (
                    <div
                      key={wi}
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.75)' : getWorkoutDotColor(w) }}
                    />
                  ))}
                  {(() => {
                    const we = wellnessEntries.find(e => e.checkin_date === dateStr);
                    if (!we) return null;
                    const sc = we.wellness_score_100 ?? (we.overall_score ? we.overall_score * 20 : 50);
                    const wc = getWellnessColor(sc);
                    return <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${wc.dot} ${isSelected ? 'opacity-75' : ''}`} />;
                  })()}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected day detail panel */}
        <div ref={detailRef} className="px-3 pb-3 mt-3">
          <div className="mb-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {getRelativeDayLabel(selectedDate)}
            </span>
          </div>

          {(() => {
            const selectedWellness = wellnessEntries.find(e => e.checkin_date === selectedDateStr);
            if (!selectedWellness) return null;
            const sc = selectedWellness.wellness_score_100 ?? (selectedWellness.overall_score ? selectedWellness.overall_score * 20 : 50);
            const wc = getWellnessColor(sc);
            return (
              <button
                onClick={() => onWellnessClick && onWellnessClick(selectedWellness)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl ${wc.light} mb-2 transition-opacity hover:opacity-80`}
              >
                <div className="flex items-center gap-2">
                  <Heart className={`w-3.5 h-3.5 ${wc.text}`} />
                  <span className={`text-xs font-semibold ${wc.text}`}>
                    {language === 'es' ? 'Bienestar' : 'Wellness'} — {Math.round(sc)}/100
                  </span>
                </div>
                <span className={`text-xs ${wc.text}`}>
                  {sc >= 70 ? (language === 'es' ? 'Bueno' : 'Good') : sc >= 45 ? (language === 'es' ? 'Moderado' : 'Moderate') : (language === 'es' ? 'Bajo' : 'Low')}
                </span>
              </button>
            );
          })()}

          {selectedDayActivities.length > 0 ? (
            <div className="space-y-2">
              {selectedDayActivities.map((workout, idx) => {
                if (workout.type === 'race_plan') {
                  return (
                    <button
                      key={workout.id || idx}
                      onClick={() => { if (onWorkoutClick) onWorkoutClick(workout); }}
                      className="w-full text-left bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-700 p-3 hover:shadow-md transition-shadow active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Flag className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                        <span className="font-bold text-sm text-yellow-900 dark:text-yellow-200 truncate">{workout.name}</span>
                        {workout.is_active && (
                          <span className="ml-auto text-[10px] font-semibold bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 px-1.5 py-0.5 rounded-full flex-shrink-0">
                            {language === 'es' ? 'ACTIVO' : 'ACTIVE'}
                          </span>
                        )}
                      </div>
                      {workout.description && (
                        <p className="text-xs text-yellow-700 dark:text-yellow-400">{workout.description}</p>
                      )}
                    </button>
                  );
                }
                const wellnessEntry = wellnessEntries.find(e => e.checkin_date === selectedDateStr);
                const wScore = wellnessEntry ? (wellnessEntry.wellness_score_100 ?? (wellnessEntry.overall_score ? wellnessEntry.overall_score * 20 : undefined)) : undefined;
                return (
                  <WorkoutDetailCard
                    key={workout.id || idx}
                    workout={workout}
                    language={language}
                    onClick={() => { if (onWorkoutClick) onWorkoutClick(workout); }}
                    wellnessScore={wScore}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-2">
                {language === 'es' ? 'Sin entrenamientos' : 'No workouts'}
              </p>
              {onAddWorkout && (
                <button
                  onClick={() => onAddWorkout(selectedDate)}
                  className="flex items-center gap-1.5 mx-auto text-xs font-medium text-[#514163] dark:text-[#fdda36]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {language === 'es' ? 'Agregar entrenamiento' : 'Add workout'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── DESKTOP full grid (md and above) ── */}
      <div className="hidden md:block p-4">
        <div className="overflow-x-auto pb-2">
        <div className="min-w-[1225px]">
        <div className="grid grid-cols-7 gap-2 mb-2">
          {dayNames.map((day) => (
            <div key={day} className="text-center text-sm font-semibold text-gray-600 dark:text-gray-400 py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, index) => {
            const isSelected = day.date.toDateString() === selectedDate.toDateString();
            const dateStr = formatDateLocal(day.date);
            const dayWorkouts = day.activities;

            return (
              <div
                key={index}
                onDragOver={(e) => { if (draggedWorkout && day.isCurrentMonth) e.preventDefault(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedWorkout && onWorkoutMove && day.isCurrentMonth) {
                    onWorkoutMove(draggedWorkout, dateStr);
                    setDraggedWorkout(null);
                  }
                }}
                onClick={() => onDaySelect(day.date)}
                className={`
                  relative min-h-[210px] rounded-xl transition-all p-2 cursor-pointer group/day
                  ${draggedWorkout && day.isCurrentMonth ? 'ring-2 ring-[#fdda36]' : ''}
                  ${day.isCurrentMonth ? 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750' : 'bg-gray-50 dark:bg-gray-900'}
                  ${isSelected ? 'ring-2 ring-[#514163]' : 'border border-gray-200 dark:border-gray-700'}
                  ${day.isToday ? 'ring-2 ring-[#fdda36]' : ''}
                `}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-semibold ${day.isCurrentMonth ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-600'}`}>
                    {day.date.getDate()}
                  </span>

                  {onAddWorkout && day.isCurrentMonth && (
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowAddMenuForDate(showAddMenuForDate === dateStr ? null : dateStr); }}
                        className="opacity-0 md:group-hover/day:opacity-100 opacity-100 md:opacity-0 transition-opacity p-1 hover:bg-[#514163] hover:text-white rounded"
                        title={language === 'es' ? 'Agregar entrenamiento' : 'Add workout'}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      {showAddMenuForDate === dateStr && (
                        <>
                          <div className="fixed inset-0 z-[100]" onClick={(e) => { e.stopPropagation(); setShowAddMenuForDate(null); }} />
                          <div className="absolute right-0 top-full mt-1 z-[101] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[220px]">
                            <button
                              onClick={(e) => { e.stopPropagation(); setShowAddMenuForDate(null); onAddWorkout(day.date); }}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-gray-700 dark:text-gray-300"
                            >
                              <Dumbbell className="w-4 h-4" />
                              {language === 'es' ? 'Planificar Entrenamiento Gym' : 'Plan Gym Workout'}
                            </button>
                            {onAddExtraTraining && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setShowAddMenuForDate(null); onAddExtraTraining(day.date); }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-gray-700 dark:text-gray-300"
                              >
                                <Activity className="w-4 h-4" />
                                {language === 'es' ? 'Agregar Entrenamiento Extra' : 'Add Extra Training'}
                              </button>
                            )}
                            {onAddRestDay && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setShowAddMenuForDate(null); onAddRestDay(day.date); }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-gray-700 dark:text-gray-300"
                              >
                                <Sofa className="w-4 h-4" />
                                {language === 'es' ? 'Día de Descanso' : 'Rest Day'}
                              </button>
                            )}
                            {onAddNote && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setShowAddMenuForDate(null); onAddNote(day.date); }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-gray-700 dark:text-gray-300"
                              >
                                <StickyNote className="w-4 h-4" />
                                {language === 'es' ? 'Nota' : 'Note'}
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 overflow-y-auto max-h-[168px] pr-0.5">
                  {(() => {
                    const we = wellnessEntries.find(e => e.checkin_date === dateStr);
                    if (!we) return null;
                    const sc = we.wellness_score_100 ?? (we.overall_score ? we.overall_score * 20 : 50);
                    const wc = getWellnessColor(sc);
                    return (
                      <div
                        onClick={(e) => { e.stopPropagation(); if (onWellnessClick) onWellnessClick(we); }}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer ${wc.light} hover:opacity-80 transition-opacity`}
                      >
                        <Heart className={`w-2.5 h-2.5 flex-shrink-0 ${wc.text}`} />
                        <span className={`text-[10px] font-semibold ${wc.text}`}>{Math.round(sc)}</span>
                      </div>
                    );
                  })()}
                  {dayWorkouts.map((workout, idx) => {
                    if (workout.type === 'rest_day') {
                      return (
                        <div
                          key={workout.id || idx}
                          onClick={(e) => { e.stopPropagation(); if (onCalendarEventClick) onCalendarEventClick(workout); }}
                          className="text-xs p-1.5 rounded bg-teal-50 dark:bg-teal-900/20 border-l-2 border-teal-500 cursor-pointer hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-1">
                            <Sofa className="w-3 h-3 flex-shrink-0 text-teal-600 dark:text-teal-400" />
                            <span className="font-semibold text-teal-800 dark:text-teal-300 truncate text-[10px]">
                              {language === 'es' ? 'Descanso' : 'Rest Day'}
                            </span>
                          </div>
                          {workout.description && (
                            <p className="text-[9px] text-teal-700 dark:text-teal-400 mt-0.5 truncate">{workout.description}</p>
                          )}
                        </div>
                      );
                    }

                    if (workout.type === 'note') {
                      return (
                        <div
                          key={workout.id || idx}
                          onClick={(e) => { e.stopPropagation(); if (onCalendarEventClick) onCalendarEventClick(workout); }}
                          className="text-xs p-1.5 rounded bg-amber-50 dark:bg-amber-900/20 border-l-2 border-amber-500 cursor-pointer hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-1">
                            <StickyNote className="w-3 h-3 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                            <span className="font-semibold text-amber-800 dark:text-amber-300 truncate text-[10px]">
                              {language === 'es' ? 'Nota' : 'Note'}
                            </span>
                          </div>
                          {workout.description && (
                            <p className="text-[9px] text-amber-700 dark:text-amber-400 mt-0.5 truncate">{workout.description}</p>
                          )}
                        </div>
                      );
                    }

                    if (workout.type === 'race_plan') {
                      return (
                        <div
                          key={workout.id || idx}
                          onClick={(e) => { e.stopPropagation(); if (onWorkoutClick) onWorkoutClick(workout); }}
                          className="text-xs p-1.5 rounded bg-yellow-100 dark:bg-yellow-900/30 border-l-2 border-yellow-500 cursor-pointer hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-1">
                            <Flag className="w-3 h-3 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
                            <span className="font-semibold text-yellow-800 dark:text-yellow-300 truncate text-[10px]">{workout.name}</span>
                          </div>
                          {workout.description && (
                            <p className="text-[9px] text-yellow-700 dark:text-yellow-400 mt-0.5 truncate">{workout.description}</p>
                          )}
                        </div>
                      );
                    }

                    if (workout.type === 'endurance_plan') {
                      return (
                        <div key={workout.id || idx}>
                          <MonthWorkoutCard workout={workout} language={language} onClick={() => onWorkoutClick?.(workout)} />
                          {workout.wearable_match?.status === 'suggested' && (
                            <button
                              onClick={event => { event.stopPropagation(); onWearableMatchAction?.(workout.wearable_match.session.id, 'manual_matched', workout.endurance_workout_data?.id); }}
                              className="mt-1 w-full rounded-lg bg-white/80 px-2 py-1 text-[10px] font-semibold text-cyan-800 dark:bg-gray-800 dark:text-cyan-200"
                            >{language === 'es' ? 'Confirmar actividad' : 'Confirm activity'}</button>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={workout.id || idx}
                        draggable={workout.source !== 'open_wearables'}
                        onDragStart={(e) => {
                          e.stopPropagation();
                          if (workout.source !== 'open_wearables' && workout.id) { setDraggedWorkout(workout.id); e.dataTransfer.effectAllowed = 'move'; }
                        }}
                        onDragEnd={() => setDraggedWorkout(null)}
                        className="relative group"
                      >
                        <MonthWorkoutCard
                          workout={workout}
                          language={language}
                          onClick={() => onWorkoutClick?.(workout)}
                          onMenuClick={workout.id && (onWorkoutEdit || onWorkoutDuplicate || onWorkoutDelete)
                            ? (e: React.MouseEvent<HTMLButtonElement>) => openContextMenu(workout.id, e)
                            : undefined}
                        />
                        {workout.type === 'wearable_executed' && <p className="mt-1 px-1 text-[9px] text-violet-700 dark:text-violet-300">{language === 'es' ? `Sesión sin plan · ${workout.completion_source === 'watch' ? 'Reloj' : workout.completion_source === 'gps' ? 'GPS' : 'Manual'}` : `Unplanned session · ${workout.completion_source === 'watch' ? 'Watch' : workout.completion_source === 'gps' ? 'GPS' : 'Manual'}`}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        </div>
        </div>

        {/* Desktop legend */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Heart className="w-3 h-3 text-emerald-500" />
            <span className="text-gray-600 dark:text-gray-400">{language === 'es' ? 'Bienestar' : 'Wellness'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#fdda36]" />
            <span className="text-gray-600 dark:text-gray-400">{language === 'es' ? 'Pendiente' : 'Pending'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-teal-500" />
            <span className="text-gray-600 dark:text-gray-400">{language === 'es' ? 'Completado' : 'Completed'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-neutral-400" />
            <span className="text-gray-600 dark:text-gray-400">{language === 'es' ? 'Omitido' : 'Skipped'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-blue-500" />
            <span className="text-gray-600 dark:text-gray-400">TrainingPeaks</span>
          </div>
          <div className="flex items-center gap-2">
            <Dumbbell className="w-3 h-3 text-orange-500" />
            <span className="text-gray-600 dark:text-gray-400">{language === 'es' ? 'Entrenamiento Extra' : 'Extra Training'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-red-500" />
            <span className="text-gray-600 dark:text-gray-400">Strava</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-teal-500" />
            <span className="text-gray-600 dark:text-gray-400">GPS Track</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-cyan-500" />
            <span className="text-gray-600 dark:text-gray-400">Endurance Planner</span>
          </div>
          <div className="flex items-center gap-2">
            <Flag className="w-3 h-3 text-yellow-500" />
            <span className="text-gray-600 dark:text-gray-400">{language === 'es' ? 'Plan de Carrera' : 'Race Plan'}</span>
          </div>
        </div>
      </div>

      {/* Context menu */}
      {contextMenuWorkout && (() => {
        const workout = workouts.find(w => w.id === contextMenuWorkout);
        if (!workout) return null;
        return (
          <div className="fixed inset-0 z-[9999]" style={{ pointerEvents: 'none' }}>
            <div
              className="absolute bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 min-w-[140px]"
              style={{ top: (contextMenuPos?.y ?? 0) + 4, left: Math.max(8, Math.min((contextMenuPos?.x ?? 0), (typeof window !== 'undefined' ? window.innerWidth : 0) - 148)), pointerEvents: 'auto' }}
            >
              {onWorkoutEdit && (
                <button onClick={(e) => { e.stopPropagation(); onWorkoutEdit(workout); closeContextMenu(); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg">
                  <Edit className="w-4 h-4" />
                  {language === 'es' ? 'Editar' : 'Edit'}
                </button>
              )}
              {onWorkoutDuplicate && (
                <button onClick={(e) => { e.stopPropagation(); onWorkoutDuplicate(workout); closeContextMenu(); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <Copy className="w-4 h-4" />
                  {language === 'es' ? 'Duplicar' : 'Duplicate'}
                </button>
              )}
              {onWorkoutDelete && (
                <button onClick={(e) => { e.stopPropagation(); setWorkoutPendingDelete(workout); closeContextMenu(); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors last:rounded-b-lg">
                  <Trash2 className="w-4 h-4" />
                  {language === 'es' ? 'Eliminar' : 'Delete'}
                </button>
              )}
            </div>
          </div>
        );
      })()}
      <DeleteWorkoutModal
        open={!!workoutPendingDelete}
        workoutName={workoutPendingDelete?.name || workoutPendingDelete?.title || (language === 'es' ? 'Entrenamiento' : 'Workout')}
        workoutDate={workoutPendingDelete?.scheduled_date
          ? new Date(`${workoutPendingDelete.scheduled_date}T12:00:00`).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })
          : ''}
        workoutDuration={workoutPendingDelete?.duration || (workoutPendingDelete?.estimated_duration_minutes ? formatMinutes(workoutPendingDelete.estimated_duration_minutes) : '')}
        onCancel={() => setWorkoutPendingDelete(null)}
        onConfirm={() => {
          if (workoutPendingDelete && onWorkoutDelete) onWorkoutDelete(workoutPendingDelete.id);
          setWorkoutPendingDelete(null);
        }}
      />
    </div>
  );
}
