import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../hooks/useToast';
import { TrendingUp, Calendar, Weight, ChevronDown, ChevronUp, Dumbbell, Search, Trash2, Activity, Bike } from 'lucide-react';
import { getExerciseName } from '../utils/exerciseI18n';

interface WorkoutHistoryItem {
  id: string;
  type: 'gym' | 'extra' | 'external';
  scheduled_date: string;
  completed_at: string;
  workout_name: string;
  total_volume: number;
  exercises?: ExerciseDetail[];
  rpe?: number;
  energy_level?: string;
  pain_level?: string;
  mood?: string;
  feedback_notes?: string;
  duration?: string;
  distance?: number;
  source?: string;
}

interface ExerciseDetail {
  exercise_name: string;
  planned_sets: number;
  completed_sets: number;
  total_weight: number;
  total_reps: number;
}

interface ExerciseProgress {
  exercise_name: string;
  dates: string[];
  weights: number[];
  volumes: number[];
}

interface ExerciseHistoryRecord {
  id: string;
  date: string;
  weight: number;
  reps: number;
  rir?: number;
  velocity?: number;
}

interface ExerciseHistory {
  exercise_name: string;
  records: ExerciseHistoryRecord[];
}

export default function WorkoutHistory() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const { success, error } = useToast();
  const [history, setHistory] = useState<WorkoutHistoryItem[]>([]);
  const [progress, setProgress] = useState<ExerciseProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null);
  const [exerciseHistory, setExerciseHistory] = useState<ExerciseHistory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (profile?.id) {
      loadHistory();
      loadProgress();
      loadExerciseHistory();
    }
  }, [profile?.id, refreshTrigger]);

  useEffect(() => {
    const handleRefresh = () => {
      console.log('🔄 WorkoutHistory: Received refresh event');
      setRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener('workout-history-refresh', handleRefresh);
    return () => window.removeEventListener('workout-history-refresh', handleRefresh);
  }, []);

  const loadHistory = async () => {
    if (!profile?.id) return;

    const allActivities: WorkoutHistoryItem[] = [];

    const { data: workouts } = await supabase
      .from('athlete_workouts')
      .select(`
        id,
        scheduled_date,
        completed_at,
        workout_id,
        rpe,
        energy_level,
        pain_level,
        mood,
        feedback_notes,
        workouts (
          name
        )
      `)
      .eq('athlete_id', profile.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(20);

    if (workouts) {
      const formattedWorkouts = await Promise.all(
        workouts.map(async (item: any) => {
          // Load workout_exercises to get planned sets
          const { data: workoutExercises } = await supabase
            .from('workout_exercises')
            .select(`
              id,
              sets,
              exercises (
                exercise,
                exercise_en,
                exercise_es
              )
            `)
            .eq('workout_id', item.workout_id);

          const { data: logs } = await supabase
            .from('training_logs')
            .select(`
              set_number,
              reps_completed,
              weight_used,
              workout_exercise_id,
              workout_exercises (
                exercises (
                  exercise,
                  exercise_en,
                  exercise_es
                )
              )
            `)
            .eq('athlete_workout_id', item.id);

          let totalVolume = 0;
          const exerciseMap = new Map<string, ExerciseDetail>();

          // Initialize exerciseMap with planned sets from workout_exercises
          workoutExercises?.forEach((workoutEx: any) => {
            const exerciseName = getExerciseName(workoutEx.exercises, language);
            if (exerciseName && !exerciseMap.has(exerciseName)) {
              exerciseMap.set(exerciseName, {
                exercise_name: exerciseName,
                planned_sets: workoutEx.sets || 0,
                completed_sets: 0,
                total_weight: 0,
                total_reps: 0,
              });
            }
          });

          logs?.forEach((log: any) => {
            const exerciseName = getExerciseName(log.workout_exercises?.exercises, language);
            if (!exerciseName) return;

            const volume = (log.weight_used || 0) * (log.reps_completed || 0);
            totalVolume += volume;

            if (!exerciseMap.has(exerciseName)) {
              exerciseMap.set(exerciseName, {
                exercise_name: exerciseName,
                planned_sets: 0,
                completed_sets: 0,
                total_weight: 0,
                total_reps: 0,
              });
            }

            const detail = exerciseMap.get(exerciseName)!;
            detail.completed_sets++;
            detail.total_weight += log.weight_used || 0;
            detail.total_reps += log.reps_completed || 0;
          });

          return {
            type: 'gym' as const,
            id: item.id,
            scheduled_date: item.scheduled_date,
            completed_at: item.completed_at,
            workout_name: item.workouts?.name || 'Workout',
            total_volume: totalVolume,
            exercises: Array.from(exerciseMap.values()),
            rpe: item.rpe,
            energy_level: item.energy_level,
            pain_level: item.pain_level,
            mood: item.mood,
            feedback_notes: item.feedback_notes,
          };
        })
      );
      allActivities.push(...formattedWorkouts);
    }

    const { data: extraTraining } = await supabase
      .from('extra_training_logs')
      .select('*')
      .eq('athlete_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (extraTraining) {
      const formattedExtra: WorkoutHistoryItem[] = extraTraining.map((item: any) => ({
        type: 'extra' as const,
        id: item.id,
        scheduled_date: item.training_date,
        completed_at: item.created_at,
        workout_name: item.activity_name,
        total_volume: 0,
        duration: item.duration,
        feedback_notes: item.notes,
      }));
      allActivities.push(...formattedExtra);
    }

    const { data: externalActivities } = await supabase
      .from('external_activities')
      .select('*')
      .eq('user_id', profile.id)
      .order('start_time', { ascending: false })
      .limit(20);

    if (externalActivities) {
      const formattedExternal: WorkoutHistoryItem[] = externalActivities.map((item: any) => ({
        type: 'external' as const,
        id: item.id,
        scheduled_date: item.start_time.split('T')[0],
        completed_at: item.start_time,
        workout_name: item.name || item.sport_type,
        total_volume: 0,
        duration: item.duration_seconds ? `${Math.round(item.duration_seconds / 60)} min` : undefined,
        distance: item.distance_meters ? Math.round(item.distance_meters / 1000 * 10) / 10 : undefined,
        source: item.source,
        rpe: item.user_rpe,
        feedback_notes: item.user_notes,
      }));
      allActivities.push(...formattedExternal);
    }

    allActivities.sort((a, b) =>
      new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
    );

    setHistory(allActivities.slice(0, 10));
    setLoading(false);
  };

  const loadProgress = async () => {
    if (!profile?.id) return;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data } = await supabase
      .from('training_logs')
      .select(`
        weight_used,
        reps_completed,
        logged_at,
        workout_exercises (
          exercises (
            name
          )
        )
      `)
      .eq('athlete_id', profile.id)
      .gte('logged_at', sixMonthsAgo.toISOString())
      .order('logged_at', { ascending: true });

    if (!data) return;

    const exerciseMap = new Map<string, ExerciseProgress>();

    data.forEach((log: any) => {
      const exerciseName = log.workout_exercises?.exercises?.name;
      if (!exerciseName) return;

      if (!exerciseMap.has(exerciseName)) {
        exerciseMap.set(exerciseName, {
          exercise_name: exerciseName,
          dates: [],
          weights: [],
          volumes: []
        });
      }

      const progress = exerciseMap.get(exerciseName)!;
      const date = new Date(log.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const volume = (log.weight_used || 0) * (log.reps_completed || 0);

      if (!progress.dates.includes(date)) {
        progress.dates.push(date);
        progress.weights.push(log.weight_used || 0);
        progress.volumes.push(volume);
      }
    });

    setProgress(Array.from(exerciseMap.values()).slice(0, 3));
  };

  const loadExerciseHistory = async () => {
    if (!profile?.id) return;

    const { data: logs } = await supabase
      .from('training_logs')
      .select(`
        id,
        logged_at,
        reps_completed,
        weight_used,
        rir,
        bar_speed,
        workout_exercises (
          exercises (
            exercise,
            exercise_en,
            exercise_es
          )
        )
      `)
      .eq('athlete_id', profile.id)
      .order('logged_at', { ascending: false });

    if (!logs) return;

    const exerciseMap = new Map<string, ExerciseHistoryRecord[]>();

    logs.forEach((log: any) => {
      const exerciseName = getExerciseName(log.workout_exercises?.exercises, language);
      if (!exerciseName) return;

      if (!exerciseMap.has(exerciseName)) {
        exerciseMap.set(exerciseName, []);
      }

      const records = exerciseMap.get(exerciseName)!;
      if (records.length < 3) {
        records.push({
          id: log.id,
          date: new Date(log.logged_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          }),
          weight: log.weight_used || 0,
          reps: log.reps_completed || 0,
          rir: log.rir,
          velocity: log.bar_speed,
        });
      }
    });

    const exerciseHistoryList = Array.from(exerciseMap.entries()).map(([name, records]) => ({
      exercise_name: name,
      records: records,
    }));

    setExerciseHistory(exerciseHistoryList);
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="w-12 h-12 border-4 border-[#fdda36] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400">Loading history...</p>
      </div>
    );
  }

  const filteredExercises = exerciseHistory.filter(ex =>
    ex.exercise_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Grid con 2 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna izquierda: Sesiones */}
        <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Recent Workouts
          </h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {history.length > 0 ? (
            history.slice(0, 3).map((item) => {
              const isExpanded = expandedWorkout === item.id;
              const getIcon = () => {
                if (item.type === 'extra') return <Activity className="w-5 h-5" />;
                if (item.type === 'external') return <Bike className="w-5 h-5" />;
                return <Dumbbell className="w-5 h-5" />;
              };
              const getColor = () => {
                if (item.type === 'extra') return 'text-orange-600 dark:text-orange-400';
                if (item.type === 'external') return 'text-blue-600 dark:text-blue-400';
                return 'text-[#514163] dark:text-[#fdda36]';
              };
              return (
                <div key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center gap-2 p-4">
                    <button
                      onClick={() => setExpandedWorkout(isExpanded ? null : item.id)}
                      className="flex-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-left flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={getColor()}>
                              {getIcon()}
                            </span>
                            <h3 className="font-semibold text-gray-900 dark:text-white dark:text-white">
                              {item.workout_name}
                            </h3>
                            {item.type === 'external' && item.source && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 capitalize">
                                {item.source}
                              </span>
                            )}
                          </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
                          {new Date(item.completed_at).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          {item.type === 'gym' && (
                            <>
                              <span className="flex items-center gap-1 text-sm font-medium text-[#514163] dark:text-[#fdda36]">
                                <Weight className="w-4 h-4" />
                                {item.total_volume.toFixed(0)} kg
                              </span>
                              <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
                                <Dumbbell className="w-4 h-4" />
                                {item.exercises?.length || 0} exercises
                              </span>
                            </>
                          )}
                          {(item.type === 'extra' || item.type === 'external') && (
                            <>
                              {item.duration && (
                                <span className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                  <Calendar className="w-4 h-4" />
                                  {item.duration}
                                </span>
                              )}
                              {item.distance && (
                                <span className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                  <Bike className="w-4 h-4" />
                                  {item.distance} km
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          let tableName = 'athlete_workouts';
                          if (item.type === 'extra') tableName = 'extra_training_logs';
                          if (item.type === 'external') tableName = 'external_activities';

                          const { error: deleteError } = await supabase
                            .from(tableName)
                            .delete()
                            .eq('id', item.id);

                          if (deleteError) throw deleteError;

                          success(language === 'es' ? 'Actividad eliminada' : 'Activity deleted');
                          await loadHistory();
                          await loadExerciseHistory();
                          await loadProgress();
                        } catch (err: any) {
                          console.error('Error deleting activity:', err);
                          error(err.message || (language === 'es' ? 'Error al eliminar' : 'Failed to delete activity'), 5000);
                        }
                      }}
                      className="p-2 text-red-500 hover:text-red-700 transition-colors"
                      title={language === 'es' ? 'Eliminar actividad' : 'Delete activity'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3">
                      {/* Exercise Details (only for gym workouts) */}
                      {item.type === 'gym' && item.exercises && item.exercises.length > 0 && (
                        <div className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 rounded-lg p-3">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                            Exercise Details
                          </h4>
                          <div className="space-y-2">
                            {item.exercises.map((ex, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <span className="text-gray-900 dark:text-white dark:text-white font-medium">
                                  {ex.exercise_name}
                                </span>
                                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400 dark:text-gray-400">
                                  <span>
                                    {ex.completed_sets}/{ex.planned_sets} sets
                                  </span>
                                  <span className="font-semibold text-[#514163] dark:text-[#fdda36]">
                                    {(ex.total_weight * ex.total_reps / ex.completed_sets).toFixed(1)} kg avg
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Activity Details (for extra and external) */}
                      {(item.type === 'extra' || item.type === 'external') && (
                        <div className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 rounded-lg p-3">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                            Activity Details
                          </h4>
                          <div className="space-y-2 text-sm">
                            {item.duration && (
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                                <span className="font-medium text-gray-900 dark:text-white">{item.duration}</span>
                              </div>
                            )}
                            {item.distance && (
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Distance:</span>
                                <span className="font-medium text-gray-900 dark:text-white">{item.distance} km</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Post-Training Feedback */}
                      {(item.rpe || item.energy_level || item.pain_level || item.mood || item.feedback_notes) && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2">
                            📋 Session Feedback
                          </h4>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            {item.rpe && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600 dark:text-gray-400 dark:text-gray-400">RPE:</span>
                                <span className={`font-bold ${item.rpe > 9 ? 'text-red-600 dark:text-red-400' : item.rpe > 7 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                                  {item.rpe}/10
                                </span>
                              </div>
                            )}
                            {item.energy_level && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600 dark:text-gray-400 dark:text-gray-400">Energy:</span>
                                <span className="font-medium text-gray-900 dark:text-white dark:text-white capitalize">
                                  {item.energy_level.replace('_', ' ')}
                                </span>
                              </div>
                            )}
                            {item.pain_level && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600 dark:text-gray-400 dark:text-gray-400">Pain:</span>
                                <span className={`font-medium capitalize ${(item.pain_level === 'moderate' || item.pain_level === 'strong') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                  {item.pain_level}
                                </span>
                              </div>
                            )}
                            {item.mood && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600 dark:text-gray-400 dark:text-gray-400">Mood:</span>
                                <span className="font-medium text-gray-900 dark:text-white dark:text-white capitalize">
                                  {item.mood.replace('_', ' ')}
                                </span>
                              </div>
                            )}
                          </div>
                          {item.feedback_notes && (
                            <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                              <p className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300 italic">
                                "{item.feedback_notes}"
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="p-8 text-center text-gray-500 dark:text-gray-400 dark:text-gray-400">
              No completed workouts yet
            </p>
          )}
        </div>
      </div>

      {progress.length > 0 && (
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Progress Overview
            </h2>
          </div>
          <div className="p-6 space-y-6">
            {progress.map((exercise, idx) => (
              <div key={idx} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white dark:text-white">
                    {exercise.exercise_name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm">
                    <Weight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400 dark:text-gray-400">
                      Max: {Math.max(...exercise.weights)}kg
                    </span>
                  </div>
                </div>
                <div className="h-32 bg-gray-50 dark:bg-gray-900 dark:bg-gray-700/50 rounded-lg p-4 relative">
                  <div className="flex items-end justify-between h-full gap-1">
                    {exercise.weights.slice(-10).map((weight, i) => {
                      const maxWeight = Math.max(...exercise.weights);
                      const height = (weight / maxWeight) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full bg-[#fdda36] rounded-t transition-all hover:bg-[#ffd51a]"
                            style={{ height: `${height}%`, minHeight: '4px' }}
                            title={`${weight}kg`}
                          />
                          <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 rotate-0">
                            {exercise.dates[i]?.split(' ')[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

        </div>

        {/* Columna derecha: Historial por Ejercicio */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white flex items-center gap-2 mb-4">
                <Dumbbell className="w-5 h-5" />
                Exercise History
              </h2>
              {/* Buscador */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search exercise..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:border-gray-600 bg-white dark:bg-gray-800 dark:bg-gray-900 text-gray-900 dark:text-white dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#fdda36] focus:border-transparent"
                />
              </div>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
              {filteredExercises.length > 0 ? (
                filteredExercises.map((exercise, idx) => {
                  const maxRecord = exercise.records.reduce((max, record) =>
                    record.weight > max.weight ? record : max
                  , exercise.records[0]);
                  const isExpanded = expandedExercise === exercise.exercise_name;

                  return (
                    <div key={idx} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900 dark:text-white dark:text-white">
                          {exercise.exercise_name}
                        </h3>
                        {exercise.records.length > 1 && (
                          <button
                            onClick={() => setExpandedExercise(isExpanded ? null : exercise.exercise_name)}
                            className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-300 flex items-center gap-1"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-4 h-4" />
                                Hide
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4" />
                                View all ({exercise.records.length})
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {/* Máximo siempre visible */}
                        <div className="flex items-center justify-between text-sm bg-gradient-to-r from-[#fdda36]/20 to-transparent dark:from-[#fdda36]/10 rounded-lg p-3 border-2 border-[#fdda36]">
                          <div className="flex items-center gap-2">
                            <Weight className="w-4 h-4 text-[#514163] dark:text-[#fdda36]" />
                            <span className="text-gray-600 dark:text-gray-400 dark:text-gray-400 text-xs">
                              {maxRecord.date}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-[#514163] dark:text-[#fdda36] text-base">
                              {maxRecord.weight} kg × {maxRecord.reps} reps
                            </span>
                            {maxRecord.velocity && (
                              <span className="text-gray-600 dark:text-gray-400 dark:text-gray-400">
                                {maxRecord.velocity.toFixed(2)} m/s
                              </span>
                            )}
                            {maxRecord.rir !== undefined && maxRecord.rir !== null && (
                              <span className="text-gray-600 dark:text-gray-400 dark:text-gray-400">
                                RIR: {maxRecord.rir}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Otros registros - Expandibles */}
                        {isExpanded && exercise.records.filter(r => r !== maxRecord).map((record, recordIdx) => (
                          <div key={recordIdx} className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 rounded-lg p-3 group">
                            <span className="text-gray-600 dark:text-gray-400 dark:text-gray-400 text-xs">
                              {record.date}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-[#514163] dark:text-[#fdda36]">
                                {record.weight} kg × {record.reps} reps
                              </span>
                              {record.velocity && (
                                <span className="text-gray-600 dark:text-gray-400 dark:text-gray-400">
                                  {record.velocity.toFixed(2)} m/s
                                </span>
                              )}
                              {record.rir !== undefined && record.rir !== null && (
                                <span className="text-gray-600 dark:text-gray-400 dark:text-gray-400">
                                  RIR: {record.rir}
                                </span>
                              )}
                              <button
                                onClick={async () => {
                                  try {
                                    const { error: deleteError } = await supabase
                                      .from('training_logs')
                                      .delete()
                                      .eq('id', record.id);

                                    if (deleteError) throw deleteError;

                                    success(language === 'es' ? 'Registro eliminado' : 'Record deleted');
                                    await loadExerciseHistory();
                                    await loadHistory();
                                    await loadProgress();
                                  } catch (err: any) {
                                    console.error('Error deleting record:', err);
                                    error(err.message || (language === 'es' ? 'Error al eliminar' : 'Failed to delete record'), 5000);
                                  }
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-700 transition-all"
                                title="Delete record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="p-8 text-center text-gray-500 dark:text-gray-400 dark:text-gray-400">
                  {searchTerm ? 'No exercises found' : 'No exercise history yet'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
