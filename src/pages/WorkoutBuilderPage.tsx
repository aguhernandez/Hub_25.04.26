import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { Dumbbell, Plus, Save, Users, Calendar, Search, X, Play, Trash2, CreditCard as Edit2, Check, GripVertical, MoveUp, MoveDown, Calculator, Layers } from 'lucide-react';
import AdvancedExerciseBuilder from '../components/training/AdvancedExerciseBuilder';
import StrengthEstimator from '../components/training/StrengthEstimator';
import CircuitPanelInline from '../components/training/CircuitPanelInline';
import CircuitBlock from '../components/training/CircuitBlock';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { getExerciseName } from '../utils/exerciseI18n';
import TagSelector from '../components/tags/TagSelector';

interface Exercise {
  id: string;
  exercise: string;
  exercise_en?: string | null;
  exercise_es?: string | null;
  category?: string;
  type?: string;
  equipment?: string;
  link?: string;
  pattern_ability?: string;
  movement?: string;
  contraction?: string;
  orientation?: string;
  body_part?: string;
  parameter?: string;
}

interface SetLine {
  sets: number;
  reps: string;
  primary_value?: string;
  secondary_value?: string;
  rest_seconds: number;
}

interface AdvancedWorkoutExercise {
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

interface CircuitExerciseItem {
  exercise_id: string;
  exercise_name: string;
  exercise_link?: string;
  reps: string;
  notes: string;
  order_index: number;
}

interface WorkoutCircuit {
  id: string;
  circuit_id: string;
  circuit_name: string;
  circuit_type: string;
  rounds: number;
  amrap_minutes: number;
  exercises: CircuitExerciseItem[];
  section_title: string;
}

export default function WorkoutBuilderPage() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const { toast, hideToast, success, error, warning } = useToast();
  const [workoutName, setWorkoutName] = useState('');
  const [workoutDescription, setWorkoutDescription] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workoutExercises, setWorkoutExercises] = useState<AdvancedWorkoutExercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState('');
  const [athletes, setAthletes] = useState<any[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState('');
  const [assignmentType, setAssignmentType] = useState<'individual' | 'team' | 'membership'>('individual');
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [memberships, setMemberships] = useState<any[]>([]);
  const [selectedMembership, setSelectedMembership] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [editWorkoutId, setEditWorkoutId] = useState<string | null>(null);
  const [editAthleteWorkoutId, setEditAthleteWorkoutId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [exerciseHistory, setExerciseHistory] = useState<Map<string, { maxWeight: number; maxDate: string }>>(new Map());
  const [sections, setSections] = useState<Array<{ id: string; title: string; emoji: string; color: string; isEditing: boolean }>>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [showStrengthEstimator, setShowStrengthEstimator] = useState(false);
  const [estimatorExerciseId, setEstimatorExerciseId] = useState<string>('');
  const [estimatorExerciseName, setEstimatorExerciseName] = useState<string>('');
  const [savedWorkoutId, setSavedWorkoutId] = useState<string | null>(null);
  const [pendingTagIds, setPendingTagIds] = useState<string[]>([]);
  const [workoutCircuits, setWorkoutCircuits] = useState<WorkoutCircuit[]>([]);
  const [addPanelTab, setAddPanelTab] = useState<'exercise' | 'circuit'>('exercise');

  useEffect(() => {
    initializeSections();
    if (profile?.role === 'trainer' || profile?.role === 'admin') {
      loadAthletes();
      loadTeams();
      loadMemberships();
    }
  }, [profile]);

  useEffect(() => {
    loadExercises();
  }, []);

  useEffect(() => {
    const checkSessionStorage = () => {
      const savedDate = sessionStorage.getItem('workout_scheduled_date');
      const editWorkoutId = sessionStorage.getItem('edit_workout_id');
      const editScheduledDate = sessionStorage.getItem('edit_scheduled_date');

      if (editWorkoutId && editScheduledDate) {
        loadWorkoutForEdit(editWorkoutId, editScheduledDate);
        sessionStorage.removeItem('edit_workout_id');
        sessionStorage.removeItem('edit_scheduled_date');
      } else if (savedDate) {
        setScheduledDate(savedDate);
        setWorkoutName('');
        setWorkoutDescription('');
        setWorkoutExercises([]);
        setSessionNotes('');
        setSelectedAthlete('');
        setSelectedTeam('');
        setSelectedMembership('');
        sessionStorage.removeItem('workout_scheduled_date');
      }
    };

    // Check immediately on mount
    checkSessionStorage();

    // Listen for navigation events
    const handleNavigation = () => {
      setTimeout(checkSessionStorage, 50);
    };

    window.addEventListener('navigate', handleNavigation);
    return () => window.removeEventListener('navigate', handleNavigation);
  }, []);

  const initializeSections = () => {
    const defaultSections = [
      { id: '1', title: language === 'es' ? 'Movilidad' : 'Mobility', emoji: '⭐️', color: 'green', isEditing: false },
      { id: '2', title: language === 'es' ? 'Entrada en Calor' : 'Warm-up', emoji: '⭐️', color: 'green', isEditing: false },
      { id: '3', title: language === 'es' ? 'Evaluación Rápida' : 'Pre-session Check', emoji: '📊', color: 'green', isEditing: false },
      { id: '4', title: language === 'es' ? 'Parte Principal' : 'Main Work', emoji: '⭐️', color: 'blue', isEditing: false },
      { id: '5', title: language === 'es' ? 'Trabajo Secundario' : 'Secondary Work', emoji: '⭐️', color: 'blue', isEditing: false },
      { id: '6', title: language === 'es' ? 'Superseries / Circuitos' : 'Superset / Complex', emoji: '🔄', color: 'blue', isEditing: false },
      { id: '7', title: language === 'es' ? 'Acondicionamiento' : 'Conditioning', emoji: '💪', color: 'blue', isEditing: false },
      { id: '8', title: language === 'es' ? 'Accesorios / Preventivo' : 'Auxiliary / Prehab', emoji: '⭐️', color: 'orange', isEditing: false },
      { id: '9', title: language === 'es' ? 'Vuelta a la Calma' : 'Cool Down', emoji: '⭐️', color: 'orange', isEditing: false },
    ];
    setSections(defaultSections);
  };

  useEffect(() => {
    if (selectedAthlete) {
      loadExerciseHistory(selectedAthlete);
    } else if (profile?.role === 'athlete' && profile?.id) {
      loadExerciseHistory(profile.id);
    }
  }, [selectedAthlete, profile?.id]);

  // Close video preview when exercise selection changes
  useEffect(() => {
    setShowVideoPreview(false);
  }, [selectedExercise]);

  const loadExercises = async () => {
    const { data } = await supabase
      .from('exercises')
      .select('id, exercise, exercise_en, exercise_es, category, type, equipment, link, pattern_ability, movement')
      .order('exercise_en');
    setExercises(data || []);
  };

  const loadWorkoutForEdit = async (athleteWorkoutId: string, scheduledDate: string) => {
    setLoading(true);
    try {
      const { data: athleteWorkout, error: awError } = await supabase
        .from('athlete_workouts')
        .select('workout_id')
        .eq('id', athleteWorkoutId)
        .single();

      if (awError || !athleteWorkout?.workout_id) {
        console.error('Error loading athlete workout:', awError);
        setLoading(false);
        return;
      }

      setEditWorkoutId(athleteWorkout.workout_id);
      setSavedWorkoutId(athleteWorkout.workout_id);
      setEditAthleteWorkoutId(athleteWorkoutId);

      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .select(`
          id,
          name,
          description,
          workout_exercises (
            id,
            exercise_id,
            sets,
            reps,
            primary_value,
            secondary_value,
            rest_seconds,
            notes,
            superset_group,
            order_index,
            primary_metric,
            secondary_metric,
            section_title,
            exercises (
              id,
              exercise,
              exercise_en,
              exercise_es,
              category,
              type,
              equipment,
              link
            )
          )
        `)
        .eq('id', athleteWorkout.workout_id)
        .single();

      if (workoutError) {
        console.error('Error loading workout:', workoutError);
        setLoading(false);
        return;
      }

      setScheduledDate(scheduledDate);
      setWorkoutName(workout.name);
      setWorkoutDescription(workout.description || '');

      const groupedExercises: { [key: string]: any } = {};
      workout.workout_exercises
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .forEach((we: any) => {
          const key = `${we.exercise_id}-${we.superset_group || 'none'}`;
          if (!groupedExercises[key]) {
            groupedExercises[key] = {
              exercise_id: we.exercise_id,
              exercise_name: getExerciseName(we.exercises, language),
              exercise_link: we.exercises.link,
              superset_group: we.superset_group,
              order_index: we.order_index,
              notes: we.notes || '',
              section_title: we.section_title,
              primary_metric: we.primary_metric || 'reps',
              secondary_metric: we.secondary_metric || null,
              set_lines: []
            };
          }
          groupedExercises[key].set_lines.push({
            sets: we.sets,
            reps: we.reps,
            primary_value: we.primary_value ?? we.reps,
            secondary_value: we.secondary_value ?? null,
            rest_seconds: we.rest_seconds
          });
        });

      const exercisesArray = Object.values(groupedExercises);
      setWorkoutExercises(exercisesArray);

      const { data: tagRows } = await supabase
        .from('workout_tags')
        .select('tag_id')
        .eq('workout_id', athleteWorkout.workout_id);
      setPendingTagIds((tagRows || []).map((r: any) => r.tag_id));
    } catch (err) {
      console.error('Error loading workout for edit:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAthletes = async () => {
    if (profile?.role === 'trainer' || profile?.role === 'admin') {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'athlete')
        .order('full_name');
      setAthletes(data || []);
    }
  };

  const loadTeams = async () => {
    if (profile?.role === 'trainer' || profile?.role === 'admin') {
      const { data } = await supabase
        .from('teams')
        .select('id, name, sport, coach_id')
        .eq('coach_id', profile.id)
        .order('name');
      setTeams(data || []);
    }
  };

  const loadMemberships = async () => {
    if (profile?.role === 'trainer' || profile?.role === 'admin') {
      const { data } = await supabase
        .from('memberships')
        .select(`
          id,
          name,
          description,
          user_memberships(count)
        `)
        .eq('is_active', true)
        .order('name');
      setMemberships(data || []);
    }
  };

  const loadExerciseHistory = async (athleteId: string) => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: logs } = await supabase
      .from('training_logs')
      .select(`
        weight_used,
        reps_completed,
        logged_at,
        workout_exercises (
          exercises (
            id,
            exercise
          )
        )
      `)
      .eq('athlete_id', athleteId)
      .not('weight_used', 'is', null)
      .gte('logged_at', threeMonthsAgo.toISOString())
      .order('logged_at', { ascending: false })
      .limit(500);

    if (!logs) return;

    const historyMap = new Map<string, { maxWeight: number; maxDate: string }>();

    logs.forEach((log: any) => {
      const exerciseId = log.workout_exercises?.exercises?.id;
      const exerciseName = log.workout_exercises?.exercises?.exercise;

      if (!exerciseId || !log.weight_used) return;

      const existing = historyMap.get(exerciseId);
      const weight = log.weight_used;

      if (!existing || weight > existing.maxWeight) {
        historyMap.set(exerciseId, {
          maxWeight: weight,
          maxDate: new Date(log.logged_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })
        });
      }
    });

    setExerciseHistory(historyMap);
  };

  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return null;
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?]+)/);
    return videoId ? `https://www.youtube.com/embed/${videoId[1]}` : null;
  };

  const addExerciseToWorkout = () => {
    if (!selectedExercise) return;

    const exercise = exercises.find(e => e.id === selectedExercise);
    if (!exercise) return;

    let sectionTitle: string;
    if (selectedSection) {
      const section = sections.find(s => s.id === selectedSection);
      if (section) {
        sectionTitle = `${section.emoji} ${section.title}`;
      } else {
        // Default section if selectedSection not found
        const defaultSection = sections.find(s => s.id === '4');
        sectionTitle = defaultSection ? `${defaultSection.emoji} ${defaultSection.title}` : '⭐️ Main Work';
      }
    } else {
      // No section selected - use default "Main Work" section (id=4)
      const defaultSection = sections.find(s => s.id === '4');
      sectionTitle = defaultSection ? `${defaultSection.emoji} ${defaultSection.title}` : '⭐️ Main Work';
    }

    const newExercise: AdvancedWorkoutExercise = {
      exercise_id: exercise.id,
      exercise_name: getExerciseName(exercise, language),
      set_lines: [{ sets: 3, reps: '10', primary_value: '', secondary_value: '', rest_seconds: 60 }],
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

  const deleteSection = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    const sectionFullTitle = `${section.emoji} ${section.title}`;
    setSections(sections.filter(s => s.id !== sectionId));
    setWorkoutExercises(workoutExercises.filter(ex => ex.section_title !== sectionFullTitle));
    success(language === 'es' ? `Bloque "${section.title}" eliminado` : `Block "${section.title}" deleted`);
  };

  const updateSectionTitle = (sectionId: string, newTitle: string) => {
    const oldSection = sections.find(s => s.id === sectionId);
    if (!oldSection) return;

    const oldTitle = `${oldSection.emoji} ${oldSection.title}`;
    const newFullTitle = `${oldSection.emoji} ${newTitle}`;

    setSections(sections.map(s =>
      s.id === sectionId ? { ...s, title: newTitle, isEditing: false } : s
    ));

    setWorkoutExercises(workoutExercises.map(ex =>
      ex.section_title === oldTitle ? { ...ex, section_title: newFullTitle } : ex
    ));
  };

  const toggleSectionEdit = (sectionId: string) => {
    setSections(sections.map(s =>
      s.id === sectionId ? { ...s, isEditing: !s.isEditing } : { ...s, isEditing: false }
    ));
  };

  const moveSectionUp = (index: number) => {
    if (index === 0) return;
    const newSections = [...sections];
    [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
    setSections(newSections);
  };

  const moveSectionDown = (index: number) => {
    if (index === sections.length - 1) return;
    const newSections = [...sections];
    [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
    setSections(newSections);
  };

  const moveExerciseUp = (currentIndex: number) => {
    if (currentIndex === 0) return;

    const currentExercise = workoutExercises[currentIndex];
    const previousExercise = workoutExercises[currentIndex - 1];

    // Only move within the same section
    if (currentExercise.section_title !== previousExercise.section_title) return;

    const newExercises = [...workoutExercises];
    [newExercises[currentIndex - 1], newExercises[currentIndex]] = [newExercises[currentIndex], newExercises[currentIndex - 1]];
    setWorkoutExercises(newExercises);
  };

  const moveExerciseDown = (currentIndex: number) => {
    if (currentIndex === workoutExercises.length - 1) return;

    const currentExercise = workoutExercises[currentIndex];
    const nextExercise = workoutExercises[currentIndex + 1];

    // Only move within the same section
    if (currentExercise.section_title !== nextExercise.section_title) return;

    const newExercises = [...workoutExercises];
    [newExercises[currentIndex], newExercises[currentIndex + 1]] = [newExercises[currentIndex + 1], newExercises[currentIndex]];
    setWorkoutExercises(newExercises);
  };

  const updateExercise = (index: number, updatedExercise: AdvancedWorkoutExercise) => {
    const updated = [...workoutExercises];
    updated[index] = updatedExercise;
    setWorkoutExercises(updated);
  };

  const deleteExercise = (index: number) => {
    const exerciseName = workoutExercises[index].exercise_name;
    setWorkoutExercises(workoutExercises.filter((_, i) => i !== index));
    success(language === 'es' ? `${exerciseName} eliminado` : `${exerciseName} deleted`);
  };

  const duplicateExercise = (index: number) => {
    const exerciseToDuplicate = workoutExercises[index];
    const duplicated: AdvancedWorkoutExercise = {
      ...exerciseToDuplicate,
      order_index: workoutExercises.length
    };
    setWorkoutExercises([...workoutExercises, duplicated]);
    success(language === 'es' ? `${exerciseToDuplicate.exercise_name} duplicado` : `${exerciseToDuplicate.exercise_name} duplicated`);
  };

  const handleCircuitAdded = (circuit: { circuit_id: string; circuit_name: string; circuit_type: string; rounds: number; amrap_minutes: number; exercises: CircuitExerciseItem[] }) => {
    let sectionTitle: string;
    if (selectedSection) {
      const section = sections.find(s => s.id === selectedSection);
      sectionTitle = section ? `${section.emoji} ${section.title}` : (() => {
        const def = sections.find(s => s.id === '4');
        return def ? `${def.emoji} ${def.title}` : '⭐️ Main Work';
      })();
    } else {
      const def = sections.find(s => s.id === '4');
      sectionTitle = def ? `${def.emoji} ${def.title}` : '⭐️ Main Work';
    }
    const newCircuit: WorkoutCircuit = {
      id: `circuit_${Date.now()}`,
      ...circuit,
      section_title: sectionTitle,
    };
    setWorkoutCircuits(prev => [...prev, newCircuit]);
    success(language === 'es' ? `Circuito "${circuit.circuit_name}" agregado` : `Circuit "${circuit.circuit_name}" added`);
  };

  const deleteCircuit = (circuitId: string) => {
    setWorkoutCircuits(prev => prev.filter(c => c.id !== circuitId));
  };

  const saveWorkout = async () => {
    if (workoutExercises.length === 0 && workoutCircuits.length === 0) {
      warning(language === 'es' ? 'Agrega ejercicios o circuitos al entrenamiento' : 'Add exercises or circuits to the workout');
      return;
    }

    if (!scheduledDate) {
      warning(language === 'es' ? 'Selecciona una fecha' : 'Select a date');
      return;
    }

    const finalWorkoutName = workoutName.trim() || new Date(scheduledDate).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    setLoading(true);
    try {
      let workout;

      if (editWorkoutId) {
        const { data: updatedWorkout, error: updateError } = await supabase
          .from('workouts')
          .update({
            name: finalWorkoutName,
            description: workoutDescription
          })
          .eq('id', editWorkoutId)
          .select()
          .single();

        if (updateError) throw updateError;
        workout = updatedWorkout;

        const { error: deleteExercisesError } = await supabase
          .from('workout_exercises')
          .delete()
          .eq('workout_id', editWorkoutId);

        if (deleteExercisesError) throw deleteExercisesError;
      } else {
        const { data: newWorkout, error: workoutError } = await supabase
          .from('workouts')
          .insert([{
            name: finalWorkoutName,
            description: workoutDescription,
            trainer_id: profile?.id
          }])
          .select()
          .single();

        if (workoutError) throw workoutError;
        workout = newWorkout;
      }

      // Flatten set_lines into individual exercise entries
      // Sort exercises by section order before assigning order_index
      const sectionOrder = sections.map(s => `${s.emoji} ${s.title}`);
      const sortedExercises = [...workoutExercises].sort((a, b) => {
        const aTitle = a.section_title || sectionOrder[0] || '';
        const bTitle = b.section_title || sectionOrder[0] || '';
        const aIdx = sectionOrder.indexOf(aTitle);
        const bIdx = sectionOrder.indexOf(bTitle);
        if (aIdx !== bIdx) return aIdx - bIdx;
        return (a.order_index ?? 0) - (b.order_index ?? 0);
      });

      const exercisesToInsert: any[] = [];
      sortedExercises.forEach((ex, exerciseIndex) => {
        ex.set_lines.forEach((line, lineIndex) => {
          exercisesToInsert.push({
            workout_id: workout.id,
            exercise_id: ex.exercise_id,
            sets: line.sets,
            reps: line.reps,
            primary_value: line.primary_value ?? line.reps,
            secondary_value: line.secondary_value ?? null,
            rest_seconds: line.rest_seconds,
            notes: lineIndex === 0 ? ex.notes : '',
            superset_group: ex.superset_group,
            order_index: exerciseIndex * 100 + lineIndex,
            primary_metric: ex.primary_metric,
            secondary_metric: ex.secondary_metric,
            section_title: lineIndex === 0 ? ex.section_title : null
          });
        });
      });

      const { error: exercisesError } = await supabase
        .from('workout_exercises')
        .insert(exercisesToInsert);

      if (exercisesError) throw exercisesError;

      if (editAthleteWorkoutId) {
        const { error: updateDateError } = await supabase
          .from('athlete_workouts')
          .update({ scheduled_date: scheduledDate })
          .eq('id', editAthleteWorkoutId);

        if (updateDateError) throw updateDateError;
      } else {
        // If athlete creating for themselves, auto-assign
        if (profile?.role === 'athlete' && scheduledDate) {
          const { error: assignError } = await supabase
            .from('athlete_workouts')
            .insert([{
              athlete_id: profile.id,
              trainer_id: profile.assigned_trainer_id || null,
              workout_id: workout.id,
              scheduled_date: scheduledDate,
              assignment_type: 'individual',
              status: 'pending'
            }]);

          if (assignError) throw assignError;
        }
        // If trainer/admin, handle different assignment types
        else if ((profile?.role === 'trainer' || profile?.role === 'admin') && scheduledDate) {
          if (assignmentType === 'individual' && selectedAthlete) {
            const { error: assignError } = await supabase
              .from('athlete_workouts')
              .insert([{
                athlete_id: selectedAthlete,
                trainer_id: profile?.id,
                workout_id: workout.id,
                scheduled_date: scheduledDate,
                assignment_type: 'individual',
                status: 'pending'
              }]);

            if (assignError) throw assignError;
          } else if (assignmentType === 'team' && selectedTeam) {
            const { data: result, error: assignError } = await supabase
              .rpc('assign_workout_to_team', {
                p_workout_id: workout.id,
                p_team_id: selectedTeam,
                p_trainer_id: profile.id,
                p_scheduled_date: scheduledDate
              });

            if (assignError) throw assignError;
            console.log(`Assigned to ${result} team members`);
          } else if (assignmentType === 'membership' && selectedMembership) {
            const { data: result, error: assignError } = await supabase
              .rpc('assign_workout_to_membership', {
                p_workout_id: workout.id,
                p_membership_id: selectedMembership,
                p_trainer_id: profile.id,
                p_scheduled_date: scheduledDate
              });

            if (assignError) throw assignError;
            console.log(`Assigned to ${result} membership subscribers`);
          }
        }
      }

      setSavedWorkoutId(workout.id);

      if (pendingTagIds.length > 0) {
        await supabase.from('workout_tags').delete().eq('workout_id', workout.id);
        await supabase.from('workout_tags').insert(
          pendingTagIds.map(tag_id => ({
            workout_id: workout.id,
            tag_id,
            created_by: profile?.id || null
          }))
        );
      } else if (editWorkoutId) {
        await supabase.from('workout_tags').delete().eq('workout_id', workout.id);
      }

      success(language === 'es'
        ? (editWorkoutId ? 'Entrenamiento actualizado' : 'Entrenamiento guardado')
        : (editWorkoutId ? 'Workout updated' : 'Workout saved')
      );

      setWorkoutName('');
      setWorkoutDescription('');
      setWorkoutExercises([]);
      setSelectedAthlete('');
      setSelectedTeam('');
      setSelectedMembership('');
      setAssignmentType('individual');
      setScheduledDate('');
      setEditWorkoutId(null);
      setEditAthleteWorkoutId(null);
      setSavedWorkoutId(null);
      setPendingTagIds([]);

      window.dispatchEvent(new CustomEvent('navigate', { detail: 'training' }));
    } catch (err: any) {
      console.error('Error:', err);
      error(err.message || (language === 'es' ? 'Error al guardar' : 'Error saving'));
    } finally {
      setLoading(false);
    }
  };

  const isTrainerOrAdmin = profile?.role === 'trainer' || profile?.role === 'admin';
  const isAthlete = profile?.role === 'athlete';

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={hideToast}
        />
      )}
      <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Dumbbell className="w-8 h-8 text-[#fdda36]" />
          {language === 'es' ? 'Crear Entrenamiento Avanzado' : 'Create Advanced Workout'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {language === 'es' ? 'Diseña entrenamientos con métricas múltiples y líneas de series' : 'Design workouts with multiple metrics and set lines'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {language === 'es' ? 'Detalles del Entrenamiento' : 'Workout Details'}
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'es' ? 'Nombre (opcional)' : 'Name (optional)'}
              </label>
              <input
                type="text"
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                placeholder={language === 'es' ? 'Si no especificas, se usará la fecha' : 'If not specified, the date will be used'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'es' ? 'Descripción' : 'Description'}
              </label>
              <textarea
                value={workoutDescription}
                onChange={(e) => setWorkoutDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                placeholder={language === 'es' ? 'Descripción opcional...' : 'Optional description...'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'es' ? 'Etiquetas' : 'Tags'}
              </label>
              <TagSelector
                selectedTagIds={pendingTagIds}
                onChange={setPendingTagIds}
                language={language}
                canCreate={profile?.role === 'trainer' || profile?.role === 'admin'}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Tab header */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setAddPanelTab('exercise')}
                className={`flex-1 flex items-center justify-center gap-2.5 py-4 text-sm font-semibold transition-all border-b-2 ${
                  addPanelTab === 'exercise'
                    ? 'border-[#fdda36] text-[#514163] dark:text-[#fdda36] bg-[#fdda36]/5'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                }`}
              >
                <Dumbbell className="w-5 h-5" />
                {language === 'es' ? 'Agregar Ejercicio' : 'Add Exercise'}
              </button>
              {isTrainerOrAdmin && (
                <button
                  onClick={() => setAddPanelTab('circuit')}
                  className={`flex-1 flex items-center justify-center gap-2.5 py-4 text-sm font-semibold transition-all border-b-2 ${
                    addPanelTab === 'circuit'
                      ? 'border-[#fdda36] text-[#514163] dark:text-[#fdda36] bg-[#fdda36]/5'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                  }`}
                >
                  <Layers className="w-5 h-5" />
                  {language === 'es' ? 'Agregar Circuito' : 'Add Circuit'}
                </button>
              )}
            </div>

            {addPanelTab === 'circuit' ? (
              <div className="p-6">
                <CircuitPanelInline
                  language={language}
                  exercises={exercises}
                  sections={sections}
                  selectedSection={selectedSection}
                  onCircuitAdded={handleCircuitAdded}
                />
              </div>
            ) : (
            <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Columna izquierda: Búsqueda y selección */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'es' ? 'Buscar ejercicio' : 'Search exercise'}
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={exerciseSearchTerm}
                      onChange={(e) => setExerciseSearchTerm(e.target.value)}
                      placeholder={language === 'es' ? 'Buscar...' : 'Search...'}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    <option value="">{language === 'es' ? 'Categoría' : 'Category'}</option>
                    {Array.from(new Set(exercises.map(e => e.category).filter(Boolean))).sort().map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    <option value="">{language === 'es' ? 'Tipo' : 'Type'}</option>
                    {Array.from(new Set(exercises.map(e => e.type).filter(Boolean))).sort().map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <select
                    value={equipmentFilter}
                    onChange={(e) => setEquipmentFilter(e.target.value)}
                    className="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    <option value="">{language === 'es' ? 'Equipo' : 'Equipment'}</option>
                    {Array.from(new Set(exercises.map(e => e.equipment).filter(Boolean))).sort().map(eq => (
                      <option key={eq} value={eq}>{eq}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'es' ? 'Seleccionar ejercicio' : 'Select exercise'}
                  </label>
                  <select
                    value={selectedExercise}
                    onChange={(e) => setSelectedExercise(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    size={6}
                  >
                    <option value="">{language === 'es' ? 'Seleccionar...' : 'Select...'}</option>
                    {exercises
                      .filter(ex => {
                        const displayName = getExerciseName(ex, language);
                        const matchesSearch = displayName.toLowerCase().includes(exerciseSearchTerm.toLowerCase());
                        const matchesCategory = !categoryFilter || ex.category === categoryFilter;
                        const matchesType = !typeFilter || ex.type === typeFilter;
                        const matchesEquipment = !equipmentFilter || ex.equipment === equipmentFilter;
                        return matchesSearch && matchesCategory && matchesType && matchesEquipment;
                      })
                      .map(ex => (
                        <option key={ex.id} value={ex.id}>{getExerciseName(ex, language)}</option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'es' ? 'Bloque / Sección' : 'Block / Section'}
                  </label>
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    <option value="">{language === 'es' ? 'Seleccionar bloque...' : 'Select block...'}</option>
                    {sections.map(section => (
                      <option key={section.id} value={section.id}>
                        {section.emoji} {section.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (selectedExercise) {
                        const exercise = exercises.find(ex => ex.id === selectedExercise);
                        if (exercise) {
                          setEstimatorExerciseId(exercise.id);
                          setEstimatorExerciseName(getExerciseName(exercise, language));
                          setShowStrengthEstimator(true);
                        }
                      }
                    }}
                    disabled={!selectedExercise}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-[#514163] text-white font-medium rounded-lg hover:bg-[#6d5581] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={language === 'es' ? 'Estimador de Fuerza (1RM)' : 'Strength Estimator (1RM)'}
                  >
                    <Calculator className="w-5 h-5" />
                  </button>
                  <button
                    onClick={addExerciseToWorkout}
                    disabled={!selectedExercise}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    {language === 'es' ? 'Agregar Ejercicio' : 'Add Exercise'}
                  </button>
                </div>
              </div>

              {/* Columna derecha: Video preview */}
              <div>
                {selectedExercise && exercises.find(ex => ex.id === selectedExercise)?.link ? (() => {
                  const exercise = exercises.find(ex => ex.id === selectedExercise);
                  const embedUrl = getYouTubeEmbedUrl(exercise?.link || '');

                  return (
                    <div className="sticky top-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {language === 'es' ? 'Vista previa' : 'Preview'}
                      </label>
                      <div className="rounded-lg overflow-hidden border-2 border-[#fdda36]">
                        <div className="relative aspect-video bg-gray-900">
                          {showVideoPreview && embedUrl ? (
                            <div className="relative w-full h-full">
                              <iframe
                                src={embedUrl}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                              <button
                                onClick={() => setShowVideoPreview(false)}
                                className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black/90 text-white rounded-full transition-colors z-10"
                                title={language === 'es' ? 'Cerrar video' : 'Close video'}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => setShowVideoPreview(true)}
                              className="relative w-full h-full bg-gradient-to-br from-[#514163] to-[#6d5581] flex items-center justify-center cursor-pointer hover:from-[#6d5581] hover:to-[#514163] transition-all group"
                            >
                              <div className="text-center">
                                <Play className="w-12 h-12 text-white opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all mx-auto mb-1" />
                                <p className="text-white text-xs font-medium opacity-70 group-hover:opacity-100">
                                  {language === 'es' ? 'Click para ver' : 'Click to watch'}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900 px-3 py-2">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                            {exercise ? getExerciseName(exercise, language) : ''}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {exercise?.category && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#fdda36]/20 text-[#514163] dark:text-[#fdda36]">
                                {exercise.category}
                              </span>
                            )}
                            {exercise?.type && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400">
                                {exercise.type}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })() : (
                  <div className="sticky top-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {language === 'es' ? 'Vista previa' : 'Preview'}
                    </label>
                    <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 aspect-video flex items-center justify-center">
                      <div className="text-center text-gray-400">
                        <Dumbbell className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p className="text-xs">
                          {language === 'es' ? 'Selecciona un ejercicio' : 'Select an exercise'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            </div>
            )}
          </div>

          {(workoutExercises.length > 0 || workoutCircuits.length > 0) && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {language === 'es' ? 'Contenido del Entrenamiento' : 'Workout Content'}
              </h2>

              {/* Circuits grouped by section */}
              {workoutCircuits.length > 0 && (() => {
                const groupedCircuits = workoutCircuits.reduce((acc, circuit) => {
                  const key = circuit.section_title;
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(circuit);
                  return acc;
                }, {} as Record<string, WorkoutCircuit[]>);

                return Object.entries(groupedCircuits).map(([sectionTitle, circuits]) => (
                  <div key={`circuits_${sectionTitle}`} className="border-2 border-[#514163]/20 dark:border-[#fdda36]/20 rounded-xl p-4 bg-[#514163]/3 dark:bg-[#fdda36]/3">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#514163]/20 dark:border-[#fdda36]/20">
                      <Layers className="w-4 h-4 text-[#514163] dark:text-[#fdda36]" />
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">{sectionTitle}</h3>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        ({circuits.length} {circuits.length === 1 ? (language === 'es' ? 'circuito' : 'circuit') : (language === 'es' ? 'circuitos' : 'circuits')})
                      </span>
                    </div>
                    <div className="space-y-3">
                      {circuits.map(circuit => (
                        <CircuitBlock
                          key={circuit.id}
                          {...circuit}
                          onDelete={() => deleteCircuit(circuit.id)}
                          language={language}
                        />
                      ))}
                    </div>
                  </div>
                ));
              })()}

              {/* Group exercises by section and order by section order */}
              {(() => {
                // First group exercises by section
                const grouped = workoutExercises.reduce((acc, ex, index) => {
                  const defaultSection = sections.find(s => s.id === '4');
                  const defaultTitle = defaultSection ? `${defaultSection.emoji} ${defaultSection.title}` : '⭐️ Main Work';
                  const sectionTitle = ex.section_title || defaultTitle;
                  if (!acc[sectionTitle]) {
                    acc[sectionTitle] = [];
                  }
                  acc[sectionTitle].push({ exercise: ex, index });
                  return acc;
                }, {} as Record<string, Array<{ exercise: typeof workoutExercises[0]; index: number }>>);

                // Order sections according to the sections array order
                const orderedSections = sections
                  .map(section => {
                    const fullTitle = `${section.emoji} ${section.title}`;
                    return {
                      title: fullTitle,
                      items: grouped[fullTitle] || [],
                      color: section.color
                    };
                  })
                  .filter(section => section.items.length > 0);

                // Add any exercises that don't match defined sections (orphaned exercises)
                const definedSectionTitles = sections.map(s => `${s.emoji} ${s.title}`);
                Object.keys(grouped).forEach(groupTitle => {
                  if (!definedSectionTitles.includes(groupTitle)) {
                    orderedSections.push({
                      title: groupTitle,
                      items: grouped[groupTitle],
                      color: 'blue'
                    });
                  }
                });

                return orderedSections.map(({ title: sectionTitle, items, color }) => {
                  const colorClass = color === 'green'
                    ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/10'
                    : color === 'blue'
                    ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/10'
                    : color === 'orange'
                    ? 'border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-900/10'
                    : 'border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/10';

                  return (
                    <div key={sectionTitle} className={`border-2 rounded-xl p-4 ${colorClass}`}>
                      <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-current opacity-50">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {sectionTitle}
                        </h3>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          ({items.length} {language === 'es' ? 'ejercicios' : 'exercises'})
                        </span>
                      </div>
                      <div className="space-y-3">
                        {items.map(({ exercise: ex, index }, itemIndex) => {
                          const history = exerciseHistory.get(ex.exercise_id);
                          const isFirstInSection = itemIndex === 0;
                          const isLastInSection = itemIndex === items.length - 1;

                          return (
                            <div key={index} className="flex gap-2 items-start">
                              <div className="flex flex-col gap-1 pt-4">
                                <button
                                  onClick={() => moveExerciseUp(index)}
                                  disabled={isFirstInSection}
                                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                                  title={language === 'es' ? 'Subir en este bloque' : 'Move up in this block'}
                                >
                                  <MoveUp className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => moveExerciseDown(index)}
                                  disabled={isLastInSection}
                                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                                  title={language === 'es' ? 'Bajar en este bloque' : 'Move down in this block'}
                                >
                                  <MoveDown className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="flex-1">
                                <AdvancedExerciseBuilder
                                  exercise={ex}
                                  onUpdate={(updated) => updateExercise(index, updated)}
                                  onDelete={() => deleteExercise(index)}
                                  onDuplicate={() => duplicateExercise(index)}
                                  athleteId={selectedAthlete || (profile?.role === 'athlete' ? profile.id : undefined)}
                                  exerciseHistory={history}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {language === 'es' ? 'Bloques del Entrenamiento' : 'Workout Blocks'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {language === 'es' ? 'Gestiona las secciones de tu entrenamiento' : 'Manage your workout sections'}
            </p>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {sections.map((section, sectionIndex) => (
                <div
                  key={section.id}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    section.color === 'green'
                      ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10'
                      : section.color === 'blue'
                      ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/10'
                      : 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {section.isEditing ? (
                      <>
                        <span className="text-lg">{section.emoji}</span>
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => {
                            setSections(sections.map(s =>
                              s.id === section.id ? { ...s, title: e.target.value } : s
                            ));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateSectionTitle(section.id, section.title);
                            }
                          }}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                          autoFocus
                        />
                        <button
                          onClick={() => updateSectionTitle(section.id, section.title)}
                          className="p-1.5 text-green-600 hover:text-green-700 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleSectionEdit(section.id)}
                          className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => moveSectionUp(sectionIndex)}
                            disabled={sectionIndex === 0}
                            className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title={language === 'es' ? 'Subir' : 'Move up'}
                          >
                            <MoveUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => moveSectionDown(sectionIndex)}
                            disabled={sectionIndex === sections.length - 1}
                            className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title={language === 'es' ? 'Bajar' : 'Move down'}
                          >
                            <MoveDown className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-lg">{section.emoji}</span>
                        <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">
                          {section.title}
                        </span>
                        <button
                          onClick={() => toggleSectionEdit(section.id)}
                          className="p-1.5 text-gray-500 hover:text-[#514163] dark:hover:text-[#fdda36] transition-colors"
                          title={language === 'es' ? 'Editar' : 'Edit'}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteSection(section.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 transition-colors"
                          title={language === 'es' ? 'Eliminar' : 'Delete'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {isAthlete
                ? (language === 'es' ? 'Programar Entrenamiento' : 'Schedule Workout')
                : (language === 'es' ? 'Asignar (Opcional)' : 'Assign (Optional)')
              }
            </h2>

            {isTrainerOrAdmin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Users className="w-4 h-4 inline mr-1" />
                    {language === 'es' ? 'Asignar a' : 'Assign to'}
                  </label>
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => {
                        setAssignmentType('individual');
                        setSelectedTeam('');
                        setSelectedMembership('');
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        assignmentType === 'individual'
                          ? 'bg-[#514163] text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {language === 'es' ? 'Individual' : 'Individual'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAssignmentType('team');
                        setSelectedAthlete('');
                        setSelectedMembership('');
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        assignmentType === 'team'
                          ? 'bg-[#514163] text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {language === 'es' ? 'Equipo' : 'Team'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAssignmentType('membership');
                        setSelectedAthlete('');
                        setSelectedTeam('');
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        assignmentType === 'membership'
                          ? 'bg-[#514163] text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {language === 'es' ? 'Membresía' : 'Membership'}
                    </button>
                  </div>
                </div>

                {assignmentType === 'individual' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'es' ? 'Seleccionar Atleta' : 'Select Athlete'}
                    </label>
                    <select
                      value={selectedAthlete}
                      onChange={(e) => setSelectedAthlete(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    >
                      <option value="">{language === 'es' ? 'Sin asignar' : 'Unassigned'}</option>
                      {athletes.map(athlete => (
                        <option key={athlete.id} value={athlete.id}>
                          {athlete.full_name || athlete.email}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {assignmentType === 'team' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'es' ? 'Seleccionar Equipo' : 'Select Team'}
                    </label>
                    <select
                      value={selectedTeam}
                      onChange={(e) => setSelectedTeam(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    >
                      <option value="">{language === 'es' ? 'Selecciona un equipo' : 'Select a team'}</option>
                      {teams.map(team => (
                        <option key={team.id} value={team.id}>
                          {team.name} {team.sport ? `(${team.sport})` : ''}
                        </option>
                      ))}
                    </select>
                    {selectedTeam && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {language === 'es'
                          ? '✓ Se asignará a todos los miembros del equipo'
                          : '✓ Will be assigned to all team members'}
                      </p>
                    )}
                  </div>
                )}

                {assignmentType === 'membership' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'es' ? 'Seleccionar Membresía' : 'Select Membership'}
                    </label>
                    <select
                      value={selectedMembership}
                      onChange={(e) => setSelectedMembership(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    >
                      <option value="">{language === 'es' ? 'Selecciona una membresía' : 'Select a membership'}</option>
                      {memberships.map(membership => (
                        <option key={membership.id} value={membership.id}>
                          {membership.name}
                        </option>
                      ))}
                    </select>
                    {selectedMembership && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {language === 'es'
                          ? '✓ Se asignará a todos los suscriptores activos'
                          : '✓ Will be assigned to all active subscribers'}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {language === 'es' ? 'Fecha *' : 'Date *'}
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <Calculator className="w-5 h-5" />
              {language === 'es' ? 'Herramientas' : 'Tools'}
            </h2>
            <button
              onClick={() => {
                setEstimatorExerciseId('');
                setEstimatorExerciseName('');
                setShowStrengthEstimator(true);
              }}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#514163] hover:bg-[#3d3149] text-white font-semibold rounded-lg transition-colors"
            >
              <Calculator className="w-5 h-5" />
              {language === 'es' ? 'Calculadora 1RM' : '1RM Calculator'}
            </button>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
              {language === 'es' ? '💡 Funcionalidades Avanzadas' : '💡 Advanced Features'}
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
              <li>• {language === 'es' ? 'Múltiples líneas de series por ejercicio' : 'Multiple set lines per exercise'}</li>
              <li>• {language === 'es' ? 'Métricas primarias y secundarias' : 'Primary and secondary metrics'}</li>
              <li>• {language === 'es' ? 'Kg, Lb, %, Tiempo, Distancia, Calorías' : 'Kg, Lb, %, Time, Distance, Calories'}</li>
              <li>• {language === 'es' ? 'Duplicar ejercicios fácilmente' : 'Duplicate exercises easily'}</li>
              <li>• <strong>{language === 'es' ? 'Estimador de Fuerza 1RM (Fórmula de Epley)' : 'Strength Estimator 1RM (Epley Formula)'}</strong></li>
            </ul>
          </div>

          <button
            onClick={saveWorkout}
            disabled={loading || (workoutExercises.length === 0 && workoutCircuits.length === 0) || !scheduledDate}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {loading
              ? (language === 'es' ? (editWorkoutId ? 'Actualizando...' : 'Guardando...') : (editWorkoutId ? 'Updating...' : 'Saving...'))
              : (language === 'es' ? (editWorkoutId ? 'Actualizar Entrenamiento' : 'Guardar Entrenamiento') : (editWorkoutId ? 'Update Workout' : 'Save Workout'))}
          </button>
        </div>
      </div>

      <StrengthEstimator
        isOpen={showStrengthEstimator}
        onClose={() => setShowStrengthEstimator(false)}
        exerciseId={estimatorExerciseId}
        exerciseName={estimatorExerciseName}
        athleteId={selectedAthlete || (profile?.role === 'athlete' ? profile.id : undefined)}
        onApplyToSession={(percentages) => {
          console.log('Applied percentages:', percentages);
        }}
      />

      </div>
    </>
  );
}
