import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, ChevronRight, Dumbbell, Calendar, Loader2, Clock } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { getExerciseName } from '../../utils/exerciseI18n';

interface Last12WorkoutsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  athleteId?: string;
}

interface SetLog {
  set_number: number;
  reps_completed: number;
  weight_used: number | null;
  rir: number | null;
}

interface ExerciseItem {
  id: string;
  exercise_id: string | null;
  custom_exercise_name: string | null;
  sets: number | null;
  reps: string | null;
  order_index: number;
  exercise_name: string;
  logs: SetLog[];
}

interface WorkoutItem {
  id: string;
  workout_name: string;
  date: string | null;
  completed_at: string | null;
  exercises: ExerciseItem[];
}

export default function Last12WorkoutsPanel({ isOpen, onClose, athleteId }: Last12WorkoutsPanelProps) {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const t = (es: string, en: string) => (language === 'es' ? es : en);

  const [workouts, setWorkouts] = useState<WorkoutItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);

  const targetAthleteId = athleteId || profile?.id;

  const fetchData = useCallback(async () => {
    if (!targetAthleteId) return;
    setLoading(true);
    try {
      const { data: awData } = await supabase
        .from('athlete_workouts')
        .select(`
          id,
          scheduled_date,
          completed_at,
          workout_id,
          workouts (
            id,
            name
          )
        `)
        .eq('athlete_id', targetAthleteId)
        .order('completed_at', { ascending: false }, { foreignTable: 'athlete_workouts' })
        .limit(12);

      if (!awData || awData.length === 0) {
        setWorkouts([]);
        return;
      }

      const workoutIds = awData
        .map((aw: any) => aw.workout_id)
        .filter((id: string | null): id is string => id !== null);
      const athleteWorkoutIds = awData.map((aw: any) => aw.id);

      const { data: weData } = await supabase
        .from('workout_exercises')
        .select(`
          id,
          workout_id,
          exercise_id,
          custom_exercise_name,
          sets,
          reps,
          order_index,
          exercises (
            id,
            exercise,
            exercise_en,
            exercise_es
          )
        `)
        .in('workout_id', workoutIds)
        .order('order_index', { ascending: true });

      const { data: logsData } = await supabase
        .from('training_logs')
        .select('athlete_workout_id, workout_exercise_id, set_number, reps_completed, weight_used, rir')
        .in('athlete_workout_id', athleteWorkoutIds)
        .order('set_number', { ascending: true });

      const logsByWorkoutExercise = new Map<string, SetLog[]>();
      (logsData || []).forEach((log: any) => {
        const key = log.workout_exercise_id;
        if (!logsByWorkoutExercise.has(key)) logsByWorkoutExercise.set(key, []);
        logsByWorkoutExercise.get(key)!.push({
          set_number: log.set_number || 0,
          reps_completed: log.reps_completed || 0,
          weight_used: log.weight_used !== null ? parseFloat(log.weight_used) : null,
          rir: log.rir,
        });
      });

      const exercisesByWorkout = new Map<string, ExerciseItem[]>();
      (weData || []).forEach((we: any) => {
        const wId = we.workout_id;
        if (!exercisesByWorkout.has(wId)) exercisesByWorkout.set(wId, []);
        const exName = we.exercises
          ? getExerciseName(we.exercises, language)
          : we.custom_exercise_name || (language === 'es' ? 'Ejercicio' : 'Exercise');
        exercisesByWorkout.get(wId)!.push({
          id: we.id,
          exercise_id: we.exercise_id,
          custom_exercise_name: we.custom_exercise_name,
          sets: we.sets,
          reps: we.reps,
          order_index: we.order_index,
          exercise_name: exName,
          logs: logsByWorkoutExercise.get(we.id) || [],
        });
      });

      const result: WorkoutItem[] = awData.map((aw: any) => ({
        id: aw.id,
        workout_name: aw.workouts?.name || (language === 'es' ? 'Entrenamiento' : 'Workout'),
        date: aw.scheduled_date,
        completed_at: aw.completed_at,
        exercises: exercisesByWorkout.get(aw.workout_id) || [],
      }));

      setWorkouts(result);
    } catch {
      setWorkouts([]);
    } finally {
      setLoading(false);
    }
  }, [targetAthleteId, language]);

  useEffect(() => {
    if (isOpen) {
      setExpandedWorkout(null);
      setExpandedExercise(null);
      fetchData();
    }
  }, [isOpen, fetchData]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getWorkoutDate = (w: WorkoutItem) => w.completed_at || w.date;

  if (!isOpen) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/40 z-[100] transition-opacity"
        onClick={onClose}
      />
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white dark:bg-gray-900 shadow-2xl z-[101] flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Dumbbell className="w-5 h-5 text-[#fdda36] flex-shrink-0" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                {t('Últimos 12 entrenamientos', 'Last 12 workouts')}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
              aria-label={t('Cerrar', 'Close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-[#fdda36] animate-spin" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('Cargando entrenamientos...', 'Loading workouts...')}
              </p>
            </div>
          )}

          {!loading && workouts.length === 0 && (
            <div className="text-center py-16">
              <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-30 text-gray-400" />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                {t('Sin entrenamientos', 'No workouts')}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {t('No se encontraron entrenamientos completados', 'No completed workouts found')}
              </p>
            </div>
          )}

          {!loading && workouts.map((workout, wIdx) => {
            const isExpanded = expandedWorkout === workout.id;
            const dateLabel = formatDate(getWorkoutDate(workout));

            return (
              <div
                key={workout.id}
                className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/50 overflow-hidden"
              >
                <button
                  onClick={() => {
                    setExpandedWorkout(isExpanded ? null : workout.id);
                    setExpandedExercise(null);
                  }}
                  className="w-full flex items-center justify-between gap-3 p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#fdda36]/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-[#514163] dark:text-[#fdda36]">
                        {workouts.length - wIdx}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                        {workout.workout_name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize truncate">
                          {dateLabel || t('Sin fecha', 'No date')}
                        </p>
                      </div>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700/50 divide-y divide-gray-200 dark:divide-gray-700/30">
                    {workout.exercises.length === 0 && (
                      <p className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500">
                        {t('Sin ejercicios registrados', 'No exercises recorded')}
                      </p>
                    )}
                    {workout.exercises.map((exercise) => {
                      const exExpanded = expandedExercise === exercise.id;
                      return (
                        <div key={exercise.id}>
                          <button
                            onClick={() => setExpandedExercise(exExpanded ? null : exercise.id)}
                            className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-gray-100/50 dark:hover:bg-gray-800/30 transition-colors text-left"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="text-xs text-gray-400 font-mono flex-shrink-0">
                                {exercise.order_index + 1}
                              </span>
                              <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                {exercise.exercise_name}
                              </span>
                            </div>
                            {exExpanded ? (
                              <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            )}
                          </button>

                          {exExpanded && (
                            <div className="px-4 pb-3 pt-1 space-y-1.5">
                              {exercise.logs.length === 0 ? (
                                <div className="flex items-center gap-2 py-2 px-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                  <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                  <p className="text-xs text-gray-400 dark:text-gray-500">
                                    {t('Sin series registradas. Planificación:', 'No sets logged. Planned:')}{' '}
                                    {exercise.sets || '?'}{' '}
                                    {t('series', 'sets')} × {exercise.reps || '?'}{' '}
                                    {t('reps', 'reps')}
                                  </p>
                                </div>
                              ) : (
                                exercise.logs.map((log, sIdx) => (
                                  <div
                                    key={sIdx}
                                    className="flex items-center justify-between gap-3 py-2 px-3 bg-white dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700/30"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500">
                                        {t('Serie', 'Set')} {log.set_number || sIdx + 1}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm">
                                      <div className="text-right">
                                        <span className="font-semibold text-gray-900 dark:text-white">
                                          {log.reps_completed || 0}
                                        </span>
                                        <span className="text-xs text-gray-400 ml-1">
                                          {t('reps', 'reps')}
                                        </span>
                                      </div>
                                      <div className="text-right">
                                        <span className="font-semibold text-gray-900 dark:text-white">
                                          {log.weight_used !== null ? log.weight_used.toFixed(1) : '—'}
                                        </span>
                                        <span className="text-xs text-gray-400 ml-1">kg</span>
                                      </div>
                                      {log.rir !== null && log.rir !== undefined && (
                                        <div className="text-right">
                                          <span className="text-xs text-gray-500 dark:text-gray-400">
                                            RIR {log.rir}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>,
    document.body
  );
}
