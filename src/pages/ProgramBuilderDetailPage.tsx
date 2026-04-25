import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { getExerciseName } from '../utils/exerciseI18n';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import { Play } from 'lucide-react';
import ProgramHeader from '../components/program-builder/ProgramHeader';
import WeekSelector from '../components/program-builder/WeekSelector';
import { Loader2, Plus, CreditCard as Edit2, Copy, Trash2, Calendar, Search, X } from 'lucide-react';
import AdvancedExerciseBuilder from '../components/training/AdvancedExerciseBuilder';

interface ProgramProduct {
  id: string;
  title: string;
  duration_weeks: number | null;
  is_membership: boolean;
  trainer_id: string;
}

interface Week {
  id: string;
  week_number: number;
  title: string;
}

interface Day {
  id: string;
  day_number: number;
  day_name: string;
  notes: string;
}

interface SetLine {
  sets: number;
  reps: string;
  rest_seconds: number;
}

interface WorkoutExercise {
  exercise_id: string;
  exercise_name: string;
  set_lines: SetLine[];
  primary_metric: string;
  secondary_metric?: string;
  notes: string;
  superset_group: number | null;
  order_index: number;
  section_title?: string;
}

interface Exercise {
  id: string;
  exercise: string;
  category?: string;
  link?: string;
}

const DAY_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

interface Props {
  programId: string | null;
}

export default function ProgramBuilderDetailPage({ programId }: Props) {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const { toast, hideToast, success, error: showError, warning } = useToast();

  // Early return if no programId
  if (!programId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {language === 'es' ? 'No se encontró el programa' : 'Program not found'}
          </p>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'program-builder' }))}
            className="px-4 py-2 bg-[#fdda36] text-[#514163] rounded-lg hover:bg-[#ffd51a] transition-colors"
          >
            {language === 'es' ? 'Volver a Programas' : 'Back to Programs'}
          </button>
        </div>
      </div>
    );
  }

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [program, setProgram] = useState<ProgramProduct | null>(null);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [days, setDays] = useState<Day[]>([]);
  const [dayCounts, setDayCounts] = useState<Map<string, number>>(new Map());

  const [showBuilderModal, setShowBuilderModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Day | null>(null);
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([]);
  const [sessionNotes, setSessionNotes] = useState('');

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState('');
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [sections, setSections] = useState<Array<{ id: string; title: string; emoji: string }>>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');

  useEffect(() => {
    if (programId && profile) {
      loadProgram();
      loadExercises();
      initializeSections();
    }
  }, [programId, profile]);

  useEffect(() => {
    if (program) {
      loadWeeks();
    }
  }, [program]);

  useEffect(() => {
    if (weeks.length > 0 && selectedWeek && selectedWeek <= weeks.length) {
      loadDaysForWeek(selectedWeek);
    }
  }, [selectedWeek]);

  useEffect(() => {
    if (days.length > 0) {
      loadDayCounts();
    }
  }, [days]);

  useEffect(() => {
    setShowVideoPreview(false);
  }, [selectedExercise]);

  const initializeSections = () => {
    const defaultSections = [
      { id: '1', title: language === 'es' ? 'Movilidad' : 'Mobility', emoji: '⭐️' },
      { id: '2', title: language === 'es' ? 'Entrada en Calor' : 'Warm-up', emoji: '🔥' },
      { id: '3', title: language === 'es' ? 'Parte Principal' : 'Main Work', emoji: '💪' },
      { id: '4', title: language === 'es' ? 'Trabajo Secundario' : 'Secondary Work', emoji: '⚡' },
      { id: '5', title: language === 'es' ? 'Acondicionamiento' : 'Conditioning', emoji: '🏃' },
      { id: '6', title: language === 'es' ? 'Vuelta a la Calma' : 'Cool Down', emoji: '🧘' },
    ];
    setSections(defaultSections);
  };

  const loadProgram = async () => {
    try {
      const { data, error } = await supabase
        .from('program_products')
        .select('*')
        .eq('id', programId)
        .single();

      if (error) throw error;

      if (profile?.role !== 'admin' && data.trainer_id !== profile?.id) {
        showError(language === 'es' ? 'No tienes permiso para editar este programa' : 'You do not have permission to edit this program');
        window.dispatchEvent(new CustomEvent('navigate', { detail: 'program-builder' }));
        return;
      }

      setProgram(data);
    } catch (err) {
      console.error('Error loading program:', err);
      showError(language === 'es' ? 'Error al cargar programa' : 'Error loading program');
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'program-builder' }));
    }
  };

  const loadExercises = async () => {
    const { data } = await supabase
      .from('exercises')
      .select('id, exercise, exercise_en, exercise_es, category, link')
      .order('exercise_en');
    setExercises(data || []);
  };

  const loadWeeks = async () => {
    if (!program) return;

    try {
      const { data: existingWeeks, error } = await supabase
        .from('program_weeks')
        .select('*')
        .eq('program_product_id', program.id)
        .order('week_number');

      if (error) throw error;

      if (!existingWeeks || existingWeeks.length === 0) {
        await initializeProgramStructure();
        return;
      }

      setWeeks(existingWeeks);

      if (existingWeeks.length > 0) {
        const weekToSelect = selectedWeek && selectedWeek <= existingWeeks.length ? selectedWeek : 1;
        setSelectedWeek(weekToSelect);

        const week = existingWeeks.find(w => w.week_number === weekToSelect);
        if (week) {
          const { data: daysData, error: daysError } = await supabase
            .from('program_days')
            .select('*')
            .eq('program_week_id', week.id)
            .order('day_number');

          if (!daysError && daysData) {
            setDays(daysData);
          }
        }
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading weeks:', err);
      setLoading(false);
    }
  };

  const initializeProgramStructure = async () => {
    if (!program) return;

    try {
      const { error } = await supabase.rpc('create_program_structure', {
        p_program_id: program.id,
        p_duration_weeks: program.duration_weeks || 4
      });

      if (error) throw error;
      await loadWeeks();
    } catch (err) {
      console.error('Error initializing program:', err);
      setLoading(false);
    }
  };

  const loadDaysForWeek = async (weekNumber: number) => {
    const week = weeks.find(w => w.week_number === weekNumber);
    if (!week) return;

    try {
      const { data, error } = await supabase
        .from('program_days')
        .select('*')
        .eq('program_week_id', week.id)
        .order('day_number');

      if (error) throw error;
      setDays(data || []);
    } catch (err) {
      console.error('Error loading days:', err);
    }
  };

  const loadDayCounts = async () => {
    const counts = new Map<string, number>();
    for (const day of days) {
      const { count } = await supabase
        .from('program_day_workouts')
        .select('*', { count: 'exact', head: true })
        .eq('program_day_id', day.id);
      counts.set(day.id, count || 0);
    }
    setDayCounts(counts);
  };

  const handleAddWeek = async () => {
    if (!program) return;

    const nextWeekNumber = weeks.length + 1;

    try {
      const { data: weekData, error: weekError } = await supabase
        .from('program_weeks')
        .insert({
          program_product_id: program.id,
          week_number: nextWeekNumber,
          title: `Week ${nextWeekNumber}`
        })
        .select()
        .single();

      if (weekError) throw weekError;

      for (let i = 0; i < 7; i++) {
        await supabase
          .from('program_days')
          .insert({
            program_week_id: weekData.id,
            day_number: i + 1,
            day_name: DAY_NAMES[i]
          });
      }

      success(language === 'es' ? 'Semana agregada' : 'Week added');
      await loadWeeks();
      setSelectedWeek(nextWeekNumber);
    } catch (err) {
      console.error('Error adding week:', err);
      showError(language === 'es' ? 'Error al agregar semana' : 'Error adding week');
    }
  };

  const handleDeleteWeek = async () => {
    if (weeks.length <= 1) {
      warning(language === 'es' ? 'No puedes eliminar la última semana' : 'Cannot delete the last week');
      return;
    }

    const week = weeks.find(w => w.week_number === selectedWeek);
    if (!week) return;

    try {
      const { error } = await supabase
        .from('program_weeks')
        .delete()
        .eq('id', week.id);

      if (error) throw error;

      success(language === 'es' ? 'Semana eliminada' : 'Week deleted');
      await loadWeeks();
      setSelectedWeek(Math.max(1, selectedWeek - 1));
    } catch (err) {
      console.error('Error deleting week:', err);
      showError(language === 'es' ? 'Error al eliminar semana' : 'Error deleting week');
    }
  };

  const handleOpenDayBuilder = async (day: Day) => {
    setSelectedDay(day);
    setSessionNotes(day.notes || '');

    const { data, error } = await supabase
      .from('program_day_workouts')
      .select(`
        *,
        exercise:exercises(id, exercise, exercise_en, exercise_es)
      `)
      .eq('program_day_id', day.id)
      .order('order_index');

    if (error) {
      console.error('Error loading workouts:', error);
      setWorkoutExercises([]);
    } else {
      const exs: WorkoutExercise[] = (data || []).map((w: any) => ({
        exercise_id: w.exercise_id,
        exercise_name: getExerciseName(w.exercise, language) || 'Unknown',
        set_lines: [{
          sets: w.sets,
          reps: w.reps.toString(),
          rest_seconds: w.rest_seconds
        }],
        primary_metric: 'reps',
        secondary_metric: undefined,
        notes: w.notes || '',
        superset_group: null,
        order_index: w.order_index,
        section_title: ''
      }));
      setWorkoutExercises(exs);
    }

    setShowBuilderModal(true);
  };

  const addExercise = () => {
    if (!selectedExercise) return;

    const exercise = exercises.find(e => e.id === selectedExercise);
    if (!exercise) return;

    const sectionTitle = selectedSection ? sections.find(s => s.id === selectedSection)?.title : undefined;

    const newExercise: WorkoutExercise = {
      exercise_id: exercise.id,
      exercise_name: getExerciseName(exercise, language),
      set_lines: [{ sets: 3, reps: '10', rest_seconds: 90 }],
      primary_metric: 'reps',
      secondary_metric: undefined,
      notes: '',
      superset_group: null,
      order_index: workoutExercises.length,
      section_title: sectionTitle
    };

    setWorkoutExercises([...workoutExercises, newExercise]);
    setSelectedExercise('');
    setExerciseSearchTerm('');
  };

  const updateExercise = (index: number, updatedExercise: WorkoutExercise) => {
    const updated = [...workoutExercises];
    updated[index] = updatedExercise;
    setWorkoutExercises(updated);
  };

  const deleteExercise = (index: number) => {
    setWorkoutExercises(workoutExercises.filter((_, i) => i !== index));
  };

  const duplicateExercise = (index: number) => {
    const exerciseToDuplicate = workoutExercises[index];
    const duplicated: WorkoutExercise = {
      ...exerciseToDuplicate,
      order_index: workoutExercises.length
    };
    setWorkoutExercises([...workoutExercises, duplicated]);
  };

  const handleSaveDayWorkout = async () => {
    if (!selectedDay) return;

    setSaving(true);
    try {
      await supabase
        .from('program_day_workouts')
        .delete()
        .eq('program_day_id', selectedDay.id);

      for (let i = 0; i < workoutExercises.length; i++) {
        const ex = workoutExercises[i];
        const setLine = ex.set_lines[0];

        await supabase
          .from('program_day_workouts')
          .insert({
            program_day_id: selectedDay.id,
            exercise_id: ex.exercise_id,
            order_index: i,
            sets: setLine.sets,
            reps: parseInt(setLine.reps) || 10,
            rir: null,
            load: null,
            velocity: null,
            tempo: '',
            rest_seconds: setLine.rest_seconds,
            notes: ex.notes
          });
      }

      if (sessionNotes !== selectedDay.notes) {
        await supabase
          .from('program_days')
          .update({ notes: sessionNotes })
          .eq('id', selectedDay.id);
      }

      success(language === 'es' ? 'Workout guardado' : 'Workout saved');
      setShowBuilderModal(false);
      setSelectedDay(null);
      setWorkoutExercises([]);
      setSessionNotes('');

      await loadDaysForWeek(selectedWeek);
      await loadDayCounts();
    } catch (err) {
      console.error('Error saving workout:', err);
      showError(language === 'es' ? 'Error al guardar workout' : 'Error saving workout');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyDay = async (sourceDay: Day) => {
    const targetDays = days.filter(d => d.id !== sourceDay.id);
    if (targetDays.length === 0) return;

    const targetDayName = prompt(`Copy ${sourceDay.day_name} to which day? (${targetDays.map(d => d.day_name).join(', ')})`);
    if (!targetDayName) return;

    const targetDay = targetDays.find(d => d.day_name.toLowerCase() === targetDayName.toLowerCase());
    if (!targetDay) {
      warning(language === 'es' ? 'Día inválido' : 'Invalid day');
      return;
    }

    try {
      const { data: sourceWorkouts } = await supabase
        .from('program_day_workouts')
        .select('*')
        .eq('program_day_id', sourceDay.id);

      if (!sourceWorkouts || sourceWorkouts.length === 0) {
        warning(language === 'es' ? 'No hay workout para copiar' : 'No workout to copy');
        return;
      }

      await supabase
        .from('program_day_workouts')
        .delete()
        .eq('program_day_id', targetDay.id);

      for (const workout of sourceWorkouts) {
        const { program_day_id, id, created_at, ...workoutData } = workout;
        await supabase
          .from('program_day_workouts')
          .insert({
            ...workoutData,
            program_day_id: targetDay.id
          });
      }

      success(language === 'es' ? `Copiado a ${targetDay.day_name}` : `Copied to ${targetDay.day_name}`);
      await loadDayCounts();
    } catch (err) {
      console.error('Error copying workout:', err);
      showError(language === 'es' ? 'Error al copiar workout' : 'Error copying workout');
    }
  };

  const handleClearDay = async (day: Day) => {
    try {
      await supabase
        .from('program_day_workouts')
        .delete()
        .eq('program_day_id', day.id);

      success(language === 'es' ? `${day.day_name} limpio` : `${day.day_name} cleared`);
      await loadDayCounts();
    } catch (err) {
      console.error('Error clearing day:', err);
      showError(language === 'es' ? 'Error al limpiar día' : 'Error clearing day');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      success(language === 'es' ? 'Programa guardado' : 'Program saved');
    }, 500);
  };

  const filteredExercises = exercises.filter(ex => {
    const displayName = getExerciseName(ex, language).toLowerCase();
    return displayName.includes(exerciseSearchTerm.toLowerCase()) ||
      (ex.category && ex.category.toLowerCase().includes(exerciseSearchTerm.toLowerCase()));
  });

  const selectedExerciseObj = exercises.find(e => e.id === selectedExercise);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#fdda36]" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Program not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Toast toast={toast} onHide={hideToast} />

      <ProgramHeader
        programTitle={program.title}
        onSave={handleSave}
        saving={saving}
      />

      <WeekSelector
        weeks={weeks}
        selectedWeek={selectedWeek}
        onSelectWeek={setSelectedWeek}
        onAddWeek={handleAddWeek}
        canAddWeek={profile?.role === 'admin' || profile?.role === 'trainer'}
      />

      <div className="p-6">
        {weeks.length > 1 && (
          <div className="mb-4 flex justify-end">
            <button
              onClick={handleDeleteWeek}
              className="flex items-center gap-2 px-4 py-2 border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm"
            >
              <Trash2 className="w-4 h-4" />
              {language === 'es' ? 'Eliminar Semana' : 'Delete Week'}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4">
          {days.map((day) => {
            const exerciseCount = dayCounts.get(day.id) || 0;

            return (
              <div
                key={day.id}
                className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden hover:border-gray-300 dark:hover:border-gray-600 transition-all"
              >
                <div className="bg-gradient-to-r from-[#fdda36] to-[#fde66e] px-4 py-3">
                  <h3 className="font-bold text-[#514163] text-center">
                    {day.day_name}
                  </h3>
                </div>

                <div className="p-4 space-y-3 min-h-[200px]">
                  {exerciseCount === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-8 text-gray-400 dark:text-gray-600">
                      <Calendar className="w-8 h-8 mb-2" />
                      <p className="text-sm mb-4">{language === 'es' ? 'Sin entrenamiento' : 'No workout'}</p>
                    </div>
                  ) : (
                    <div className="bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                        {exerciseCount} {language === 'es' ? 'ejercicios' : 'exercises'}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      onClick={() => handleOpenDayBuilder(day)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#fdda36] text-[#514163] rounded-lg hover:bg-[#fde66e] transition-colors text-sm font-medium"
                    >
                      {exerciseCount === 0 ? (
                        <>
                          <Plus className="w-4 h-4" />
                          {language === 'es' ? 'Crear' : 'Create'}
                        </>
                      ) : (
                        <>
                          <Edit2 className="w-4 h-4" />
                          {language === 'es' ? 'Editar' : 'Edit'}
                        </>
                      )}
                    </button>

                    {exerciseCount > 0 && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleCopyDay(day)}
                          className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          title={language === 'es' ? 'Copiar' : 'Copy'}
                        >
                          <Copy className="w-4 h-4 mx-auto text-gray-600 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleClearDay(day)}
                          className="flex-1 p-2 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title={language === 'es' ? 'Borrar' : 'Clear'}
                        >
                          <Trash2 className="w-4 h-4 mx-auto text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showBuilderModal && selectedDay && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedDay.day_name} - Week {selectedWeek}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {program.title}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowBuilderModal(false);
                  setSelectedDay(null);
                  setWorkoutExercises([]);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder={language === 'es' ? 'Buscar ejercicio...' : 'Search exercise...'}
                        value={exerciseSearchTerm}
                        onChange={(e) => setExerciseSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <select
                      value={selectedExercise}
                      onChange={(e) => setSelectedExercise(e.target.value)}
                      size={6}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">{language === 'es' ? 'Seleccionar ejercicio...' : 'Select exercise...'}</option>
                      {filteredExercises.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          {getExerciseName(ex, language)} {ex.category && `(${ex.category})`}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">{language === 'es' ? 'Seleccionar bloque...' : 'Select block...'}</option>
                      {sections.map(section => (
                        <option key={section.id} value={section.id}>
                          {section.emoji} {section.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedExerciseObj?.link && (
                    <div className="w-64">
                      {showVideoPreview ? (
                        <div className="relative rounded-lg overflow-hidden border-2 border-[#fdda36]">
                          <button
                            onClick={() => setShowVideoPreview(false)}
                            className="absolute top-2 right-2 p-1 bg-black/50 rounded-full z-10 hover:bg-black/70"
                          >
                            <X className="w-4 h-4 text-white" />
                          </button>
                          <iframe
                            src={`https://www.youtube.com/embed/${selectedExerciseObj.link.split('v=')[1]?.split('&')[0]}`}
                            className="w-full h-48"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowVideoPreview(true)}
                          className="w-full h-48 bg-gray-800 rounded-lg flex flex-col items-center justify-center hover:bg-gray-700 transition-colors"
                        >
                          <Play className="w-12 h-12 text-[#fdda36] mb-2" />
                          <p className="text-sm text-gray-400">{language === 'es' ? 'Ver demo' : 'View demo'}</p>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={addExercise}
                  disabled={!selectedExercise}
                  className="w-full px-6 py-3 bg-[#fdda36] text-[#514163] rounded-lg hover:bg-[#fde66e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  {language === 'es' ? 'Agregar Ejercicio' : 'Add Exercise'}
                </button>
              </div>

              <div className="space-y-4">
                {workoutExercises.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 dark:text-gray-600">
                    <Calendar className="w-16 h-16 mx-auto mb-4" />
                    <p>{language === 'es' ? 'No hay ejercicios. Agrega uno arriba.' : 'No exercises yet. Add one above.'}</p>
                  </div>
                ) : (
                  <>
                    {Array.from(new Set(workoutExercises.map(e => e.section_title || 'General'))).map(sectionTitle => (
                      <div key={sectionTitle} className="space-y-3">
                        {sectionTitle !== 'General' && (
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <span>{sections.find(s => s.title === sectionTitle)?.emoji || '⭐️'}</span>
                            {sectionTitle}
                          </h3>
                        )}
                        {workoutExercises
                          .filter(e => (e.section_title || 'General') === sectionTitle)
                          .map((ex, index) => {
                            const globalIndex = workoutExercises.indexOf(ex);
                            return (
                              <div key={globalIndex}>
                                <AdvancedExerciseBuilder
                                  exercise={ex}
                                  onUpdate={(updated) => updateExercise(globalIndex, updated)}
                                  onDelete={() => deleteExercise(globalIndex)}
                                  onDuplicate={() => duplicateExercise(globalIndex)}
                                />
                              </div>
                            );
                          })}
                      </div>
                    ))}
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Notas de Sesión' : 'Session Notes'}
                </label>
                <textarea
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  rows={3}
                  placeholder={language === 'es' ? 'Notas adicionales...' : 'Additional notes...'}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4 sticky bottom-0 bg-white dark:bg-gray-800 pb-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowBuilderModal(false);
                    setSelectedDay(null);
                    setWorkoutExercises([]);
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  {language === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  onClick={handleSaveDayWorkout}
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-[#fdda36] text-[#514163] rounded-lg hover:bg-[#fde66e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {saving ? (language === 'es' ? 'Guardando...' : 'Saving...') : (language === 'es' ? 'Guardar Workout' : 'Save Workout')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
