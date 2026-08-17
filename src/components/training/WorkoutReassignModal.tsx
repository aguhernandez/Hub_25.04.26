import { useState, useEffect } from 'react';
import { X, ArrowLeftRight, Calendar, Clock, Search, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { type EnduranceWorkout } from './EnduranceWorkoutCard';

interface WorkoutReassignModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalWorkout: EnduranceWorkout;
  language: string;
  athleteId: string;
  onSelect: (selectedWorkout: EnduranceWorkout, originalPlannedDay: string) => void;
}

const SPORT_COLORS: Record<string, string> = {
  cycling: '#06b6d4',
  running: '#22c55e',
  swimming: '#3b82f6',
  triathlon: '#f59e0b',
  gravel: '#a3e635',
  mtb: '#f97316',
  trail_run: '#84cc16',
  default: '#06b6d4',
};

function getSportColor(sport: string) {
  return SPORT_COLORS[sport?.toLowerCase()] ?? SPORT_COLORS.default;
}

function parseStepsFromDescription(description: string) {
  if (!description) return [];
  const stepsMatch = description.match(/Steps:\n([\s\S]*?)(?:\n\nPlanned impulse:|$)/);
  if (!stepsMatch) return [];
  return stepsMatch[1]
    .split('\n')
    .filter(Boolean)
    .map((line, i) => {
      const match = line.match(/^(\w+):\s*(\d+)(min|m|km|s)?\s*@\s*(.+)$/i);
      if (!match) return null;
      return {
        id: `step-${i}`,
        order: i,
        step_type: match[1].toLowerCase() as any,
        duration_type: 'time' as const,
        duration_value: parseInt(match[2]),
        target_type: 'rpe' as const,
        target_zone: undefined,
      };
    })
    .filter(Boolean);
}

export default function WorkoutReassignModal({
  isOpen,
  onClose,
  originalWorkout,
  language,
  athleteId,
  onSelect,
}: WorkoutReassignModalProps) {
  const [workouts, setWorkouts] = useState<EnduranceWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const es = language === 'es';

  useEffect(() => {
    if (!isOpen || !athleteId) return;
    setLoading(true);
    setWorkouts([]);

    const today = new Date().toISOString().split('T')[0];
    const future = new Date();
    future.setDate(future.getDate() + 90);
    const futureStr = future.toISOString().split('T')[0];

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    supabase
      .from('external_endurance_plans')
      .select('id, week_start_date, planner_source, plan_data, summary')
      .eq('athlete_id', athleteId)
      .gte('week_start_date', weekStartStr)
      .lte('week_start_date', futureStr)
      .order('week_start_date', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error('[WorkoutReassignModal] query error:', error);
          setLoading(false);
          return;
        }

        const results: EnduranceWorkout[] = [];

        (data || []).forEach((ep: any) => {
          const days: any[] = ep.plan_data?.days || ep.summary?.workouts || [];
          days.forEach((w: any, i: number) => {
            if (!w.date) return;
            const scheduledDate = String(w.date).substring(0, 10);
            if (scheduledDate < today || scheduledDate > futureStr) return;
            if (w.completed) return;

            const workoutId = `endurance-plan-${ep.id}-${i}`;
            if (workoutId === originalWorkout.id) return;

            const rawDescription: string = w.description || '';
            const sport: string = w.sport || 'cycling';
            const duration: number = w.planned_duration_minutes || w.duration_min || 0;
            const tss = w.planned_tss || w.planned_impulse || w.tss || null;

            let name: string = w.name || '';
            if (!name) {
              const firstLine = rawDescription.split('\n')[0].trim();
              name = firstLine || sport;
            }

            const parsedSteps = parseStepsFromDescription(rawDescription);

            results.push({
              id: workoutId,
              name,
              sport,
              sub_discipline: undefined,
              description: rawDescription,
              intensity_basis: w.intensity_basis || 'RPE',
              scheduled_date: scheduledDate,
              estimated_duration_minutes: duration,
              estimated_impulse: tss || undefined,
              status: 'planned',
              steps: parsedSteps as any,
              planner_source: ep.planner_source || '',
              session_type: w.session_type || undefined,
              target_zones: w.target_zones || [],
              rpe: w.rpe || null,
              notes: w.notes || undefined,
            });
          });
        });

        results.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
        setWorkouts(results);
        setLoading(false);
      });
  }, [isOpen, athleteId, originalWorkout.id]);

  if (!isOpen) return null;

  const filtered = search.trim()
    ? workouts.filter(w =>
        w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.sport.toLowerCase().includes(search.toLowerCase())
      )
    : workouts;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString(es ? 'es-ES' : 'en-US', {
      weekday: 'short', day: 'numeric', month: 'short',
    });
  };

  const isToday = (dateStr: string) => {
    return dateStr === new Date().toISOString().split('T')[0];
  };

  const isTomorrow = (dateStr: string) => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return dateStr === t.toISOString().split('T')[0];
  };

  const getDateLabel = (dateStr: string) => {
    if (isToday(dateStr)) return es ? 'Hoy' : 'Today';
    if (isTomorrow(dateStr)) return es ? 'Mañana' : 'Tomorrow';
    return formatDate(dateStr);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                {es ? 'Registrar Otro Entreno' : 'Log Different Workout'}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {es ? 'Elige el entreno que hiciste hoy' : 'Choose the workout you actually did today'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <X className="w-4 h-4 text-neutral-500" />
          </button>
        </div>

        {/* Original workout context */}
        <div className="mx-4 mt-4 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-0.5">
            {es ? 'Entreno planificado para hoy' : 'Originally planned for today'}
          </p>
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
            {originalWorkout.name}
          </p>
          <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-0.5">
            {originalWorkout.estimated_duration_minutes
              ? `${originalWorkout.estimated_duration_minutes} min`
              : ''
            }
          </p>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={es ? 'Buscar entreno...' : 'Search workouts...'}
              className="w-full pl-9 pr-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/40 text-neutral-900 dark:text-white placeholder-neutral-400"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                {es ? 'No hay entrenos próximos disponibles' : 'No upcoming workouts found'}
              </p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                {es ? 'Los entrenos completados no aparecen aquí' : 'Completed workouts are not listed here'}
              </p>
            </div>
          ) : (
            <>
              <p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest pb-1">
                {es ? 'Próximos entrenos planificados' : 'Upcoming planned workouts'} ({filtered.length})
              </p>
              {filtered.map(w => {
                const color = getSportColor(w.sport);
                const dateLabel = getDateLabel(w.scheduled_date);
                const isUpcoming = isToday(w.scheduled_date) || isTomorrow(w.scheduled_date);
                return (
                  <button
                    key={w.id}
                    onClick={() => onSelect(w, originalWorkout.scheduled_date)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-cyan-300 dark:hover:border-cyan-700 hover:bg-cyan-50 dark:hover:bg-cyan-900/10 transition-all text-left group"
                  >
                    <div
                      className="w-2 h-full min-h-[40px] rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                          {w.name}
                        </p>
                        {isUpcoming && (
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0"
                            style={{ backgroundColor: color + '22', color }}
                          >
                            {dateLabel}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {!isUpcoming && (
                          <span className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                            <Calendar className="w-3 h-3" />
                            {dateLabel}
                          </span>
                        )}
                        {w.estimated_duration_minutes > 0 && (
                          <span className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                            <Clock className="w-3 h-3" />
                            {w.estimated_duration_minutes} min
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600 group-hover:text-cyan-500 transition-colors flex-shrink-0" />
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer note */}
        <div className="px-5 py-3 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40">
          <p className="text-[10px] text-neutral-400 dark:text-neutral-500 text-center">
            {es
              ? 'El plan original no se modifica. La ejecución queda registrada por separado.'
              : 'The original plan is not modified. Execution is recorded separately.'}
          </p>
        </div>
      </div>
    </div>
  );
}
