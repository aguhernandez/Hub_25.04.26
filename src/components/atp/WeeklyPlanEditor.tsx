import { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAthlete } from '../../contexts/AthleteContext';
import { supabase } from '../../lib/supabase';
import { X, Plus, Calendar, Dumbbell, Copy, FileText, TrendingUp, CreditCard as Edit2, Trash2, Check, Clock, Target, Activity } from 'lucide-react';
import EventManager from './EventManager';

interface WeeklyPlanEditorProps {
  atpId: string;
  weekNumber: number;
  weekData: {
    id: string;
    start_date: string;
    end_date: string;
    focus: string | null;
    estimated_load: number;
    num_sessions: number;
    notes: string | null;
  };
  macrocycle: {
    phase_type: string;
    title: string | null;
    color: string;
  } | null;
  athleteId: string;
  athleteName: string;
  teamId: string;
  onClose: () => void;
  onUpdate: () => void;
}

interface Workout {
  id: string;
  assignment_id: string;
  name: string;
  scheduled_date: string;
  description: string | null;
  session_notes: string | null;
  workout_exercises?: any[];
}

const FOCUS_OPTIONS = [
  { value: 'hypertrophy', en: 'Hypertrophy', es: 'Hipertrofia' },
  { value: 'max_strength', en: 'Max Strength', es: 'Fuerza Máxima' },
  { value: 'power', en: 'Power', es: 'Potencia' },
  { value: 'endurance', en: 'Endurance', es: 'Resistencia' },
  { value: 'speed', en: 'Speed', es: 'Velocidad' },
  { value: 'technique', en: 'Technique', es: 'Técnica' },
  { value: 'recovery', en: 'Recovery', es: 'Recuperación' },
  { value: 'deload', en: 'Deload', es: 'Descarga' },
  { value: 'test', en: 'Testing', es: 'Evaluación' }
];

const DAYS_OF_WEEK = {
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  es: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
};

export default function WeeklyPlanEditor({
  atpId,
  weekNumber,
  weekData,
  macrocycle,
  athleteId,
  athleteName,
  teamId,
  onClose,
  onUpdate
}: WeeklyPlanEditorProps) {
  const { language } = useLanguage();
  const { setSelectedAthlete, clearSelectedAthlete } = useAthlete();

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekNotes, setWeekNotes] = useState(weekData.notes || '');
  const [weekFocus, setWeekFocus] = useState(weekData.focus || '');

  useEffect(() => {
    loadWeekWorkouts();
  }, [weekNumber, athleteId, teamId, weekData.start_date, weekData.end_date]);

  const loadWeekWorkouts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('athlete_workouts')
        .select(`
          id, workout_id, team_id,
          scheduled_date,
          workout:workouts(id, name, description, workout_exercises(count))
        `)
        .gte('scheduled_date', weekData.start_date)
        .lte('scheduled_date', weekData.end_date)
        .order('scheduled_date');

      query = teamId ? query.eq('team_id', teamId) : query.eq('athlete_id', athleteId);
      const { data, error } = await query;
      if (error) throw error;
      const assignments = (data || []).flatMap((assignment: any) => assignment.workout ? [{
        ...assignment.workout,
        scheduled_date: assignment.scheduled_date,
        assignment_id: assignment.id,
        team_id: assignment.team_id
      }] : []);
      const uniqueSessions = new Map<string, Workout>();
      assignments.forEach((assignment: Workout) => {
        uniqueSessions.set(`${assignment.id}:${assignment.scheduled_date}`, assignment);
      });
      setWorkouts([...uniqueSessions.values()]);
    } catch (error) {
      console.error('Error loading workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorkout = async (workoutId: string) => {
    if (!confirm(language === 'es' ? '¿Eliminar esta sesión?' : 'Delete this session?')) return;

    try {
      const scheduledDate = workouts.find(w => w.id === workoutId)?.scheduled_date || weekData.start_date;
      let query = supabase.from('athlete_workouts').delete()
        .eq('workout_id', workoutId)
        .eq('scheduled_date', scheduledDate);

      if (teamId) {
        // Team assignments are represented by one row per athlete for the shared session.
        query = query.eq('team_id', teamId);
      } else {
        query = query.eq('athlete_id', athleteId);
      }

      const { error } = await query;
      if (error) throw error;

      await updateWeekStats();
      loadWeekWorkouts();
      onUpdate();
    } catch (error: any) {
      console.error('Error deleting workout:', error);
      alert(error.message);
    }
  };

  const handleDuplicateFromPreviousWeek = async () => {
    if (weekNumber === 1) {
      alert(language === 'es' ? 'No hay semana anterior' : 'No previous week');
      return;
    }

    try {
      // Get previous week data
      const { data: prevWeekData, error: prevWeekError } = await supabase
        .from('atp_weekly_loads')
        .select('*')
        .eq('atp_id', atpId)
        .eq('week_number', weekNumber - 1)
        .single();

      if (prevWeekError || !prevWeekData) {
        alert(language === 'es' ? 'No hay plan en la semana anterior' : 'No plan in previous week');
        return;
      }

      // Get previous week workouts
      let previousAssignmentsQuery = supabase
        .from('athlete_workouts')
        .select('athlete_id, trainer_id, workout_id, assignment_type, team_id, membership_id, scheduled_date')
        .gte('scheduled_date', prevWeekData.start_date)
        .lte('scheduled_date', prevWeekData.end_date);
      previousAssignmentsQuery = teamId
        ? previousAssignmentsQuery.eq('team_id', teamId)
        : previousAssignmentsQuery.eq('athlete_id', athleteId);
      const { data: prevWorkouts, error: prevWorkoutsError } = await previousAssignmentsQuery;
      if (prevWorkoutsError) throw prevWorkoutsError;

      if (!prevWorkouts || prevWorkouts.length === 0) {
        alert(language === 'es' ? 'No hay sesiones en la semana anterior' : 'No sessions in previous week');
        return;
      }

      const assignmentsToInsert = prevWorkouts.map((assignment: any) => {
        const nextDate = new Date(`${assignment.scheduled_date}T00:00:00.000Z`);
        nextDate.setUTCDate(nextDate.getUTCDate() + 7);
        return {
          ...assignment,
          scheduled_date: nextDate.toISOString().slice(0, 10),
          status: 'pending'
        };
      });
      const { error: duplicateError } = await supabase.from('athlete_workouts').insert(assignmentsToInsert);
      if (duplicateError) throw duplicateError;

      await updateWeekStats();
      loadWeekWorkouts();
      onUpdate();
      alert(language === 'es' ? 'Plan duplicado exitosamente' : 'Plan duplicated successfully');
    } catch (error: any) {
      console.error('Error duplicating week:', error);
      alert(error.message);
    }
  };

  const updateWeekStats = async () => {
    try {
      // Recalculate week stats based on workouts
      let query = supabase
        .from('athlete_workouts')
        .select(`
          id, workout_id, scheduled_date,
          workout:workouts(
            workout_exercises(
            sets,
            reps,
            primary_metric,
            secondary_metric,
            primary_value,
            secondary_value
            )
          )
        `)
        .gte('scheduled_date', weekData.start_date)
        .lte('scheduled_date', weekData.end_date);

      query = teamId ? query.eq('team_id', teamId) : query.eq('athlete_id', athleteId);
      const { data: weekWorkouts, error: workoutsError } = await query;
      if (workoutsError) throw workoutsError;

      const uniqueSessions = new Map<string, any>();
      (weekWorkouts || []).forEach((assignment: any) => {
        uniqueSessions.set(`${assignment.workout_id}:${assignment.scheduled_date}`, assignment);
      });
      const plannedSessions = [...uniqueSessions.values()];
      let totalLoad = 0;
      const numSessions = plannedSessions.length;

      // Simple load calculation: sum of (sets * avg_reps * avg_weight)
      plannedSessions.forEach((workout: any) => {
        workout.workout?.workout_exercises?.forEach((ex: any) => {
          const sets = ex.sets || 0;
          const parseAverage = (value: unknown) => {
            const values = String(value || '').match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
            return values.length > 1 ? (values[0] + values[1]) / 2 : (values[0] || 0);
          };
          const reps = parseAverage(ex.reps);
          const primaryMetric = String(ex.primary_metric || '').toLowerCase();
          const secondaryMetric = String(ex.secondary_metric || '').toLowerCase();
          const weight = primaryMetric.includes('kg')
            ? parseAverage(ex.primary_value)
            : secondaryMetric.includes('kg') ? parseAverage(ex.secondary_value) : 0;
          totalLoad += sets * reps * weight;
        });
      });

      const { error: updateError } = await supabase
        .from('atp_weekly_loads')
        .update({
          estimated_load: totalLoad,
          num_sessions: numSessions,
          has_plan: numSessions > 0,
          notes: weekNotes,
          focus: weekFocus
        })
        .eq('id', weekData.id);
      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error updating week stats:', error);
    }
  };

  const handleSaveWeekSettings = async () => {
    try {
      const { error } = await supabase
        .from('atp_weekly_loads')
        .update({
          notes: weekNotes,
          focus: weekFocus
        })
        .eq('id', weekData.id);
      if (error) throw error;

      onUpdate();
      alert(language === 'es' ? 'Configuración guardada' : 'Settings saved');
    } catch (error: any) {
      console.error('Error saving week settings:', error);
      alert(error.message);
    }
  };

  const openWorkoutBuilder = (workoutId?: string) => {
    if (athleteId) setSelectedAthlete(athleteId, athleteName);
    else clearSelectedAthlete();
    const existingWorkout = workoutId ? workouts.find(w => w.assignment_id === workoutId) : null;
    const scheduledDate = existingWorkout?.scheduled_date || weekData.start_date;
    sessionStorage.setItem('workout_scheduled_date', scheduledDate);
    sessionStorage.setItem('workout_return_page', 'atp');
    sessionStorage.setItem('workout_return_atp_id', atpId);
    sessionStorage.setItem('workout_return_recalculate_load', 'true');
    if (teamId) sessionStorage.setItem('workout_team_id', teamId);
    else sessionStorage.removeItem('workout_team_id');
    if (workoutId) {
      sessionStorage.setItem('edit_workout_id', workoutId);
      sessionStorage.setItem('edit_scheduled_date', scheduledDate);
    }
    window.dispatchEvent(new CustomEvent('navigate', { detail: 'workout-builder' }));
  };

  const getDayName = (dateString: string) => {
    const date = new Date(`${dateString}T00:00:00.000Z`);
    const dayIndex = date.getUTCDay();
    const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
    return DAYS_OF_WEEK[language][adjustedIndex];
  };

  const getTotalVolume = (workout: Workout) => {
    if (!workout.workout_exercises) return 0;
    return (workout.workout_exercises as any)[0]?.count || 0;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl max-w-6xl w-full my-8">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-6 h-6 text-[#fdda36]" />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">
                  {language === 'es' ? 'Semana' : 'Week'} {weekNumber}
                </h3>
                {macrocycle && (
                  <span
                    className="px-3 py-1 rounded-full text-sm font-medium text-white"
                    style={{ backgroundColor: macrocycle.color }}
                  >
                    {macrocycle.title || macrocycle.phase_type}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
                {new Date(weekData.start_date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
                  month: 'long',
                  day: 'numeric'
                })} - {new Date(weekData.end_date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-[#fdda36]" />
                <span className="text-xs text-gray-600 dark:text-gray-400 dark:text-gray-400">
                  {language === 'es' ? 'Sesiones' : 'Sessions'}
                </span>
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-white dark:text-white">
                {workouts.length}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-[#fdda36]" />
                <span className="text-xs text-gray-600 dark:text-gray-400 dark:text-gray-400">
                  {language === 'es' ? 'Carga' : 'Load'}
                </span>
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-white dark:text-white">
                {weekData.estimated_load.toFixed(0)}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-[#fdda36]" />
                <span className="text-xs text-gray-600 dark:text-gray-400 dark:text-gray-400">
                  {language === 'es' ? 'Enfoque' : 'Focus'}
                </span>
              </div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white dark:text-white">
                {weekFocus || '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => openWorkoutBuilder()}
              className="px-4 py-2 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {language === 'es' ? 'Agregar Sesión' : 'Add Session'}
            </button>
            <button
              onClick={handleDuplicateFromPreviousWeek}
              disabled={weekNumber === 1}
              className="px-4 py-2 bg-white dark:bg-gray-800 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Copy className="w-4 h-4" />
              {language === 'es' ? 'Duplicar Semana Anterior' : 'Duplicate Previous Week'}
            </button>
            <button
              onClick={handleSaveWeekSettings}
              className="px-4 py-2 bg-white dark:bg-gray-800 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {language === 'es' ? 'Guardar Configuración' : 'Save Settings'}
            </button>
          </div>

          {/* Week Settings */}
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                {language === 'es' ? 'Enfoque Semanal' : 'Weekly Focus'}
              </label>
              <select
                value={weekFocus}
                onChange={(e) => setWeekFocus(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-900 text-gray-900 dark:text-white dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
              >
                <option value="">{language === 'es' ? 'Sin definir' : 'Not defined'}</option>
                {FOCUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {language === 'es' ? opt.es : opt.en}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                {language === 'es' ? 'Notas de la Semana' : 'Week Notes'}
              </label>
              <input
                type="text"
                value={weekNotes}
                onChange={(e) => setWeekNotes(e.target.value)}
                placeholder={language === 'es' ? 'Ej: Semana de descarga' : 'e.g., Deload week'}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-900 text-gray-900 dark:text-white dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
              />
            </div>
          </div>
        </div>

        {/* Events & Competitions */}
        <div className="px-6 pb-4">
          <EventManager
            atpId={atpId}
            weekNumber={weekNumber}
            weekStartDate={weekData.start_date}
            weekEndDate={weekData.end_date}
          />
        </div>

        {/* Workouts List */}
        <div className="p-6 max-h-[50vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-[#fdda36] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : workouts.length === 0 ? (
            <div className="text-center py-12">
              <Dumbbell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-4">
                {language === 'es'
                  ? 'No hay sesiones definidas para esta semana'
                  : 'No training sessions defined for this week'}
              </p>
              <button
                onClick={() => openWorkoutBuilder()}
                className="px-6 py-3 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                {language === 'es' ? 'Crear Primera Sesión' : 'Create First Session'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {workouts.map((workout) => (
                <div
                  key={workout.id}
                  className="bg-white dark:bg-gray-800 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg p-4 hover:border-[#fdda36] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-1 bg-[#fdda36]/20 text-[#514163] dark:text-[#fdda36] text-xs font-medium rounded">
                          {getDayName(workout.scheduled_date)}
                        </span>
                        <h4 className="font-semibold text-gray-900 dark:text-white dark:text-white">
                          {workout.name}
                        </h4>
                      </div>
                      {workout.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-2">
                          {workout.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {getTotalVolume(workout)} {language === 'es' ? 'ejercicios' : 'exercises'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(workout.scheduled_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openWorkoutBuilder(workout.assignment_id)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title={language === 'es' ? 'Editar' : 'Edit'}
                      >
                        <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-400 dark:text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteWorkout(workout.id)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title={language === 'es' ? 'Eliminar' : 'Delete'}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>


    </div>
  );
}
