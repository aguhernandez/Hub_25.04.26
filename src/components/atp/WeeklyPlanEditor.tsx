import { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
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
  onClose: () => void;
  onUpdate: () => void;
}

interface Workout {
  id: string;
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
  onClose,
  onUpdate
}: WeeklyPlanEditorProps) {
  const { language } = useLanguage();

  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekNotes, setWeekNotes] = useState(weekData.notes || '');
  const [weekFocus, setWeekFocus] = useState(weekData.focus || '');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWorkout, setNewWorkout] = useState({
    name: '',
    day_index: 0,
    description: ''
  });

  useEffect(() => {
    loadWeekWorkouts();
  }, [weekNumber, athleteId]);

  const loadWeekWorkouts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select(`
          id,
          name,
          scheduled_date,
          description,
          session_notes,
          workout_exercises(count)
        `)
        .eq('athlete_id', athleteId)
        .gte('scheduled_date', weekData.start_date)
        .lte('scheduled_date', weekData.end_date)
        .order('scheduled_date');

      if (error) throw error;
      setWorkouts(data || []);
    } catch (error) {
      console.error('Error loading workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWorkout = async () => {
    if (!newWorkout.name) {
      alert(language === 'es' ? 'Ingresa un nombre para la sesión' : 'Enter a session name');
      return;
    }

    try {
      const workoutDate = new Date(weekData.start_date);
      workoutDate.setDate(workoutDate.getDate() + newWorkout.day_index);

      const { error } = await supabase
        .from('workouts')
        .insert({
          name: newWorkout.name,
          description: newWorkout.description,
          athlete_id: athleteId,
          scheduled_date: formatDateLocal(workoutDate),
          session_notes: `ATP Week ${weekNumber} - ${weekFocus || macrocycle?.phase_type || 'Training'}`
        });

      if (error) throw error;

      await updateWeekStats();
      loadWeekWorkouts();
      setShowAddModal(false);
      setNewWorkout({ name: '', day_index: 0, description: '' });
      onUpdate();
    } catch (error: any) {
      console.error('Error adding workout:', error);
      alert(error.message);
    }
  };

  const handleDeleteWorkout = async (workoutId: string) => {
    if (!confirm(language === 'es' ? '¿Eliminar esta sesión?' : 'Delete this session?')) return;

    try {
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workoutId);

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
      const { data: prevWeekData } = await supabase
        .from('atp_weekly_loads')
        .select('*')
        .eq('atp_id', atpId)
        .eq('week_number', weekNumber - 1)
        .single();

      if (!prevWeekData) {
        alert(language === 'es' ? 'No hay plan en la semana anterior' : 'No plan in previous week');
        return;
      }

      // Get previous week workouts
      const { data: prevWorkouts } = await supabase
        .from('workouts')
        .select(`
          *,
          workout_exercises(*)
        `)
        .eq('athlete_id', athleteId)
        .gte('scheduled_date', prevWeekData.start_date)
        .lte('scheduled_date', prevWeekData.end_date);

      if (!prevWorkouts || prevWorkouts.length === 0) {
        alert(language === 'es' ? 'No hay sesiones en la semana anterior' : 'No sessions in previous week');
        return;
      }

      // Duplicate workouts with date adjustment
      for (const workout of prevWorkouts) {
        const prevDate = new Date(workout.scheduled_date);
        const newDate = new Date(prevDate);
        newDate.setDate(newDate.getDate() + 7);

        const { data: newWorkout, error: workoutError } = await supabase
          .from('workouts')
          .insert({
            name: workout.name,
            description: workout.description,
            athlete_id: athleteId,
            scheduled_date: formatDateLocal(newDate),
            session_notes: workout.session_notes,
            created_by: workout.created_by
          })
          .select()
          .single();

        if (workoutError) throw workoutError;

        // Duplicate exercises
        if (workout.workout_exercises && workout.workout_exercises.length > 0) {
          const exercisesToInsert = workout.workout_exercises.map((ex: any) => ({
            workout_id: newWorkout.id,
            exercise_id: ex.exercise_id,
            sets: ex.sets,
            reps: ex.reps,
            rest_seconds: ex.rest_seconds,
            weight_kg: ex.weight_kg,
            notes: ex.notes,
            order_index: ex.order_index,
            superset_group: ex.superset_group,
            primary_metric: ex.primary_metric,
            secondary_metric: ex.secondary_metric,
            set_lines: ex.set_lines,
            section_title: ex.section_title
          }));

          await supabase.from('workout_exercises').insert(exercisesToInsert);
        }
      }

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
      const { data: weekWorkouts } = await supabase
        .from('workouts')
        .select(`
          id,
          workout_exercises(
            sets,
            reps,
            weight_kg
          )
        `)
        .eq('athlete_id', athleteId)
        .gte('scheduled_date', weekData.start_date)
        .lte('scheduled_date', weekData.end_date);

      let totalLoad = 0;
      let numSessions = weekWorkouts?.length || 0;

      // Simple load calculation: sum of (sets * avg_reps * avg_weight)
      weekWorkouts?.forEach((workout: any) => {
        workout.workout_exercises?.forEach((ex: any) => {
          const sets = ex.sets || 0;
          const reps = parseInt(ex.reps) || 10;
          const weight = ex.weight_kg || 0;
          totalLoad += sets * reps * weight;
        });
      });

      await supabase
        .from('atp_weekly_loads')
        .update({
          estimated_load: totalLoad,
          num_sessions: numSessions,
          has_plan: numSessions > 0,
          notes: weekNotes,
          focus: weekFocus
        })
        .eq('id', weekData.id);
    } catch (error) {
      console.error('Error updating week stats:', error);
    }
  };

  const handleSaveWeekSettings = async () => {
    try {
      await supabase
        .from('atp_weekly_loads')
        .update({
          notes: weekNotes,
          focus: weekFocus
        })
        .eq('id', weekData.id);

      onUpdate();
      alert(language === 'es' ? 'Configuración guardada' : 'Settings saved');
    } catch (error: any) {
      console.error('Error saving week settings:', error);
      alert(error.message);
    }
  };

  const openWorkoutBuilder = (workoutId?: string) => {
    // Navigate to workout builder
    const event = new CustomEvent('navigate', { detail: 'workout-builder' });
    window.dispatchEvent(event);

    // Store workout context for the builder
    if (workoutId) {
      sessionStorage.setItem('editWorkoutId', workoutId);
    }
  };

  const getDayName = (dateString: string) => {
    const date = new Date(dateString);
    const dayIndex = date.getDay();
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
              onClick={() => setShowAddModal(true)}
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
                onClick={() => setShowAddModal(true)}
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
                        onClick={() => openWorkoutBuilder(workout.id)}
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

      {/* Add Session Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
              <h4 className="text-lg font-bold text-gray-900 dark:text-white dark:text-white">
                {language === 'es' ? 'Nueva Sesión' : 'New Session'}
              </h4>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Nombre' : 'Name'} *
                </label>
                <input
                  type="text"
                  value={newWorkout.name}
                  onChange={(e) => setNewWorkout({ ...newWorkout, name: e.target.value })}
                  placeholder={language === 'es' ? 'Ej: Tren Superior' : 'e.g., Upper Body'}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-900 text-gray-900 dark:text-white dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Día de la Semana' : 'Day of Week'}
                </label>
                <select
                  value={newWorkout.day_index}
                  onChange={(e) => setNewWorkout({ ...newWorkout, day_index: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-900 text-gray-900 dark:text-white dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
                >
                  {DAYS_OF_WEEK[language].map((day, index) => (
                    <option key={index} value={index}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Descripción' : 'Description'}
                </label>
                <textarea
                  value={newWorkout.description}
                  onChange={(e) => setNewWorkout({ ...newWorkout, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-900 text-gray-900 dark:text-white dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36] resize-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewWorkout({ name: '', day_index: 0, description: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
                >
                  {language === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  onClick={handleAddWorkout}
                  className="flex-1 px-4 py-2 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors"
                >
                  {language === 'es' ? 'Crear' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
