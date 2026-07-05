import { useState, useEffect } from 'react';
import { Check, Clock, Dumbbell, Play, X, ChevronDown, ChevronUp, Timer, Weight, Calendar, Trash2, Activity, Plus, CreditCard as Edit, Save, Calculator, Zap, Share2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { getExerciseName, getExerciseDescription } from '../utils/exerciseI18n';
import PostTrainingFeedbackModal, { FeedbackData } from './PostTrainingFeedbackModal';
import StrengthEstimator from './training/StrengthEstimator';
import WorkoutSessionScreen from './training/WorkoutSessionScreen';
import WorkoutShareCard from './training/WorkoutShareCard';
import { updateATPComplianceForWorkout } from '../utils/atpIntegration';
import Toast from './Toast';
import { useToast } from '../hooks/useToast';

interface SetLine {
  id: string;
  sets: number;
  reps: string | number;
  primary_value?: string;
  secondary_value?: string;
  primary_metric?: string;
  secondary_metric?: string;
  rest_seconds?: number;
}

interface Exercise {
  id: string;
  workout_exercise_id: string;
  name: string;
  description?: string;
  sets: number;
  reps: string | number;
  rest_seconds: number;
  link?: string;
  section_title?: string;
  actualSets?: number;
  primary_value?: string;
  secondary_value?: string;
  primary_metric?: string;
  secondary_metric?: string;
  set_lines?: SetLine[];
}

interface SetTracking {
  completed: boolean;
  reps?: number;
  weight?: number;
  velocity?: number;
  rir?: number;
  notes?: string;
}

interface DailyWorkoutViewProps {
  selectedDate: Date;
  onWorkoutUpdate: () => void;
  onOpenExtraTraining?: () => void;
  athleteId?: string;
}

export default function DailyWorkoutView({ selectedDate, onWorkoutUpdate, onOpenExtraTraining, athleteId }: DailyWorkoutViewProps) {
  const { profile } = useAuth();
  const effectiveAthleteId = athleteId || profile?.id;
  const { t, language } = useLanguage();
  const { toast, hideToast, success, error } = useToast();
  const [allWorkouts, setAllWorkouts] = useState<any[]>([]);
  const [selectedWorkoutIndex, setSelectedWorkoutIndex] = useState(0);
  const [workout, setWorkout] = useState<any>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [setTracking, setSetTracking] = useState<{ [key: string]: SetTracking }>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [showStrengthEstimator, setShowStrengthEstimator] = useState(false);
  const [estimatorExerciseId, setEstimatorExerciseId] = useState<string>('');
  const [estimatorExerciseName, setEstimatorExerciseName] = useState<string>('');
  const [showSessionScreen, setShowSessionScreen] = useState(false);
  const [videoModal, setVideoModal] = useState<{ url: string; name: string; description?: string } | null>(null);
  const [showShareCard, setShowShareCard] = useState(false);

  useEffect(() => {
    loadDailyWorkout();
  }, [selectedDate, profile?.id, athleteId]);

  const getTotalSetsForExercise = (exercise: Exercise): number => {
    if (exercise.set_lines) {
      const baseTotal = exercise.set_lines.reduce((sum, line) => sum + (line.sets || 0), 0);
      const extraSets = exercise.actualSets ? Math.max(0, exercise.actualSets - baseTotal) : 0;
      return baseTotal + extraSets;
    }
    return exercise.actualSets || exercise.sets;
  };

  const groupConsecutiveSameExercises = (exercisesData: any[]): Exercise[] => {
    const grouped: Exercise[] = [];

    exercisesData?.forEach((item, index) => {
      const exerciseId = item.exercises?.id || item.id;
      const prevItem = index > 0 ? exercisesData[index - 1] : null;
      const prevExerciseId = prevItem?.exercises?.id || prevItem?.id;

      // Check if this is the same exercise as the previous one
      if (exerciseId === prevExerciseId && grouped.length > 0) {
        const lastGroup = grouped[grouped.length - 1];
        // Initialize set_lines if first duplicate
        if (!lastGroup.set_lines) {
          lastGroup.set_lines = [{
            id: lastGroup.workout_exercise_id,
            sets: lastGroup.sets,
            reps: lastGroup.reps,
            primary_value: lastGroup.primary_value,
            secondary_value: lastGroup.secondary_value,
            primary_metric: lastGroup.primary_metric,
            secondary_metric: lastGroup.secondary_metric,
            rest_seconds: lastGroup.rest_seconds
          }];
        }
        // Add this as another line
        lastGroup.set_lines.push({
          id: item.id,
          sets: item.sets || 3,
          reps: item.reps || '10',
          primary_value: item.primary_value,
          secondary_value: item.secondary_value,
          primary_metric: item.primary_metric,
          secondary_metric: item.secondary_metric,
          rest_seconds: item.rest_seconds || 60
        });
      } else {
        // New exercise
        grouped.push({
          id: item.exercises?.id || item.id,
          workout_exercise_id: item.id,
          name: getExerciseName(item.exercises, language) || 'Exercise',
          description: getExerciseDescription(item.exercises, language),
          sets: item.sets || 3,
          reps: item.reps || '10',
          rest_seconds: item.rest_seconds || 60,
          link: item.exercises?.link,
          section_title: item.section_title,
          primary_value: item.primary_value,
          secondary_value: item.secondary_value,
          primary_metric: item.primary_metric,
          secondary_metric: item.secondary_metric,
        });
      }
    });

    return grouped;
  };

  const loadDailyWorkout = async () => {
    if (!effectiveAthleteId) return;

    setLoading(true);
    const formatDateLocal = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const dateStr = formatDateLocal(selectedDate);

    // Load programmed workouts
    const { data: workoutList, error: wError } = await supabase
      .from('athlete_workouts')
      .select('*')
      .eq('athlete_id', effectiveAthleteId)
      .eq('scheduled_date', dateStr)
      .order('created_at');

    // Load extra training logs
    const { data: extraTraining, error: extraError } = await supabase
      .from('extra_training_logs')
      .select('*')
      .eq('athlete_id', effectiveAthleteId)
      .eq('training_date', dateStr);

    // Load external activities (Strava, etc)
    const { data: allExternalActivities, error: externalError } = await supabase
      .from('external_activities')
      .select('*')
      .eq('user_id', effectiveAthleteId)
      .order('start_time', { ascending: false });

    // Filter external activities by date - prefer local_date field, fallback to string substring
    const externalActivities = allExternalActivities?.filter((activity: any) => {
      const activityDate = activity.local_date
        ? String(activity.local_date).substring(0, 10)
        : String(activity.start_time).substring(0, 10);
      return activityDate === dateStr;
    }) || [];

    // Load completed workouts from training_logs
    const { data: completedLogsData, error: logsError } = await supabase
      .from('training_logs')
      .select(`
        id,
        athlete_workout_id,
        logged_at,
        athlete_workouts (
          id,
          workouts (
            id,
            name,
            description
          )
        )
      `)
      .eq('athlete_id', effectiveAthleteId)
      .order('logged_at', { ascending: false });

    // Filter logs for this date
    const logsForDate = completedLogsData?.filter((log: any) => {
      return String(log.logged_at).substring(0, 10) === dateStr;
    }) || [];

    console.log('📅 Date:', dateStr, 'Athlete:', effectiveAthleteId);
    console.log('🏋️ Programmed workouts found:', workoutList?.length || 0);
    console.log('💪 Extra training found:', extraTraining?.length || 0);
    console.log('🏃 External activities found:', externalActivities?.length || 0);
    console.log('✅ Completed logs found:', logsForDate.length);

    const allActivities = [];

    // Process programmed workouts
    if (workoutList && workoutList.length > 0) {
      for (const workout of workoutList) {
        if (workout.workout_id) {
          const { data: workoutDetails } = await supabase
            .from('workouts')
            .select('id, name, description, duration_minutes')
            .eq('id', workout.workout_id)
            .maybeSingle();

          if (workoutDetails) {
            workout.workouts = workoutDetails;
          }
        }
        workout.type = 'workout';
        allActivities.push(workout);
      }
    }

    // Process extra training
    if (extraTraining && extraTraining.length > 0) {
      extraTraining.forEach(extra => {
        allActivities.push({
          id: `extra-${extra.id}`,
          type: 'extra',
          source: 'extra',
          name: extra.activity_name,
          description: extra.notes || '',
          duration: extra.duration,
          status: 'completed',
          scheduled_date: extra.training_date,
        });
      });
    }

    // Process external activities
    if (externalActivities && externalActivities.length > 0) {
      externalActivities.forEach(ext => {
        allActivities.push({
          id: `external-${ext.id}`,
          type: 'external',
          source: ext.source || 'strava',
          name: ext.name || ext.sport_type || 'External Activity',
          description: ext.user_notes || '',
          duration: ext.duration_seconds ? `${Math.round(ext.duration_seconds / 60)} min` : '',
          distance: ext.distance_meters ? (ext.distance_meters / 1000).toFixed(2) : null,
          status: 'completed',
          scheduled_date: dateStr,
        });
      });
    }

    // Load endurance workouts (single-day, from external_endurance_workouts)
    const { data: enduranceWorkouts } = await supabase
      .from('external_endurance_workouts')
      .select('*')
      .eq('athlete_id', effectiveAthleteId)
      .eq('scheduled_date', dateStr);

    if (enduranceWorkouts && enduranceWorkouts.length > 0) {
      enduranceWorkouts.forEach((ew: any) => {
        allActivities.push({
          id: `endurance-workout-${ew.id}`,
          type: 'endurance_plan',
          source: 'endurance_planner',
          name: ew.name || ew.sport_type || (language === 'es' ? 'Sesión Endurance' : 'Endurance Session'),
          description: ew.description || '',
          status: ew.status || 'planned',
          scheduled_date: dateStr,
          sport: ew.sport_type || ew.sport || 'cycling',
          planner_source: ew.planner_source,
          endurance_workout_data: ew,
        });
      });
    }

    // Load endurance plans (weekly, from external_endurance_plans) and expand for this date
    const weekStart = new Date(selectedDate);
    weekStart.setDate(weekStart.getDate() - 6);
    const { data: endurancePlans } = await supabase
      .from('external_endurance_plans')
      .select('id, week_start_date, plan_name, planner_source, summary, plan_data')
      .eq('athlete_id', effectiveAthleteId)
      .gte('week_start_date', formatDateLocal(weekStart))
      .lte('week_start_date', dateStr);

    endurancePlans?.forEach((ep: any) => {
      const days: any[] = ep.plan_data?.days || ep.summary?.workouts || [];
      days.forEach((w: any) => {
        if (!w.date) return;
        const scheduledDate = String(w.date).substring(0, 10);
        if (scheduledDate !== dateStr) return;
        const sport: string = w.sport || 'cycling';
        let name: string = w.name || '';
        if (!name) {
          const firstLine = (w.description || '').split('\n')[0].trim();
          name = firstLine || sport;
        }
        allActivities.push({
          id: `endurance-plan-${ep.id}-${scheduledDate}`,
          type: 'endurance_plan',
          source: 'endurance_planner',
          name,
          description: w.description || '',
          status: w.completed ? 'completed' : 'planned',
          scheduled_date: dateStr,
          sport,
          planner_source: ep.planner_source,
          endurance_workout_data: w,
        });
      });
    });

    // Process completed workouts from training_logs (not already in programmed workouts)
    const programmedWorkoutIds = new Set(workoutList?.map(w => w.id) || []);
    const uniqueCompletedWorkouts = new Map<string, any>();

    logsForDate.forEach((log: any) => {
      const workoutId = log.athlete_workout_id;
      if (!programmedWorkoutIds.has(workoutId) && log.athlete_workouts?.workouts) {
        uniqueCompletedWorkouts.set(workoutId, {
          id: workoutId,
          workout_id: log.athlete_workouts.workouts.id,
          type: 'workout',
          source: 'asciende',
          name: log.athlete_workouts.workouts.name,
          description: log.athlete_workouts.workouts.description || '',
          status: 'completed',
          scheduled_date: dateStr,
          workouts: log.athlete_workouts.workouts
        });
      }
    });

    // Add unique completed workouts
    uniqueCompletedWorkouts.forEach(workout => {
      allActivities.push(workout);
    });

    setAllWorkouts(allActivities);
    setSelectedWorkoutIndex(0);
    setWorkout(allActivities[0] || null);
    setAdditionalNotes(allActivities[0]?.notes || '');

    // Load exercises only for programmed workouts
    if (allActivities[0]?.workout_id) {
      console.log('🔍 Loading exercises for workout:', allActivities[0].workout_id);
      const { data: exercisesData, error: exError } = await supabase
        .from('workout_exercises')
        .select('id, order_index, sets, reps, rest_seconds, section_title, primary_value, secondary_value, primary_metric, secondary_metric, exercises(id, exercise, exercise_en, exercise_es, description, description_en, description_es, link)')
        .eq('workout_id', allActivities[0].workout_id)
        .order('order_index');

      const formattedExercises = groupConsecutiveSameExercises(exercisesData || []);

      setExercises(formattedExercises);

      // Load training logs to populate setTracking state
      if (allActivities[0]?.id) {
        await loadTrainingLogs(allActivities[0].id, formattedExercises);
      }
    } else {
      setExercises([]);
    }

    setLoading(false);
  };

  const loadTrainingLogs = async (athleteWorkoutId: string, exercisesList: Exercise[]) => {
    console.log('📊 Loading training logs for workout:', athleteWorkoutId);
    const { data: logsData, error: logsError } = await supabase
      .from('training_logs')
      .select('workout_exercise_id, set_number, reps_completed, weight_used, rir, notes')
      .eq('athlete_workout_id', athleteWorkoutId);

    if (logsError) {
      console.error('Error loading training logs:', logsError);
      return;
    }

    if (!logsData || logsData.length === 0) {
      console.log('No training logs found for this workout');
      setSetTracking({});
      return;
    }

    console.log('✅ Found', logsData.length, 'training log entries');

    // Build setTracking state from training logs
    const newTracking: { [key: string]: SetTracking } = {};
    const exerciseMaxSets: { [key: string]: number } = {};

    logsData.forEach((log: any) => {
      // Find the exercise in the exercises list
      const exercise = exercisesList.find(ex => ex.workout_exercise_id === log.workout_exercise_id);
      if (exercise) {
        const key = `${exercise.id}-${log.set_number}`;
        newTracking[key] = {
          completed: true,
          reps: log.reps_completed || 0,
          weight: log.weight_used || 0,
          rir: log.rir || undefined,
          notes: log.notes || undefined,
        };

        // Track max set number for each exercise
        if (!exerciseMaxSets[exercise.id] || log.set_number > exerciseMaxSets[exercise.id]) {
          exerciseMaxSets[exercise.id] = log.set_number;
        }
      }
    });

    // Update exercises with actual set counts
    setExercises(prevExercises =>
      prevExercises.map(ex => ({
        ...ex,
        actualSets: exerciseMaxSets[ex.id] || ex.sets
      }))
    );

    console.log('🎯 Populated tracking state with', Object.keys(newTracking).length, 'entries');
    setSetTracking(newTracking);
  };

  const handleCompleteWorkout = async () => {
    if (!workout?.id || !profile?.id) return;
    if (!workoutStartTime) setWorkoutStartTime(Date.now());
    setShowFeedbackModal(true);
  };

  const getWorkoutShareData = () => {
    let totalVolume = 0;
    let bestSet: { exercise: string; weight: number; reps: number } | null = null;
    let completedSets = 0;
    const completedExercises = new Set<string>();

    for (const exercise of exercises) {
      const maxSets = getTotalSetsForExercise(exercise);
      for (let setNum = 1; setNum <= maxSets; setNum++) {
        const tracking = getSetTracking(exercise.id, setNum);
        if (tracking.reps && tracking.weight) {
          totalVolume += tracking.reps * tracking.weight;
          completedSets++;
          completedExercises.add(exercise.id);
          if (!bestSet || tracking.weight > bestSet.weight || (tracking.weight === bestSet.weight && tracking.reps > bestSet.reps)) {
            bestSet = { exercise: exercise.name, weight: tracking.weight, reps: tracking.reps };
          }
        }
      }
    }

    const durationMinutes = workoutStartTime
      ? Math.round((Date.now() - workoutStartTime) / 60000)
      : workout?.workouts?.duration_minutes || 60;

    return {
      date: workout?.scheduled_date || new Date().toISOString().split('T')[0],
      duration: durationMinutes,
      totalVolume,
      bestSet,
      exerciseCount: completedExercises.size,
      setCount: completedSets,
      workoutName: workout?.workouts?.name || undefined,
    };
  };

  const handleFeedbackSubmit = async (feedback: FeedbackData) => {
    if (!workout?.id || !profile?.id) return;

    const trainingLogs = [];
    let totalVolume = 0;

    for (const exercise of exercises) {
      const maxSets = getTotalSetsForExercise(exercise);
      for (let setNum = 1; setNum <= maxSets; setNum++) {
        const tracking = getSetTracking(exercise.id, setNum);
        if (tracking.reps && tracking.weight) {
          totalVolume += tracking.reps * tracking.weight;
        }

        if (tracking.completed || tracking.reps || tracking.weight) {
          trainingLogs.push({
            athlete_id: profile.id,
            athlete_workout_id: workout.id,
            workout_exercise_id: exercise.workout_exercise_id,
            set_number: setNum,
            reps_completed: tracking.reps || 0,
            weight_used: tracking.weight || 0,
            rir: tracking.rir || null,
            notes: tracking.notes || null,
            logged_at: new Date().toISOString(),
          });
        }
      }
    }

    if (trainingLogs.length > 0) {
      const { error: deleteError } = await supabase
        .from('training_logs')
        .delete()
        .eq('athlete_workout_id', workout.id);

      if (deleteError) {
        console.error('Error deleting previous training logs:', deleteError);
      }

      await supabase.from('training_logs').insert(trainingLogs);

      const strengthEstimates: Record<string, { exercise_name: string; weight: number; oneRM: number; reps: number; rir: number | null }> = {};
      for (const exercise of exercises) {
        const maxSets = getTotalSetsForExercise(exercise);
        let bestOneRM = 0;
        let bestWeight = 0;
        let bestReps = 0;
        let bestRir: number | null = null;
        for (let setNum = 1; setNum <= maxSets; setNum++) {
          const tracking = getSetTracking(exercise.id, setNum);
          if (tracking.weight && tracking.weight > 0 && tracking.reps && tracking.reps > 0) {
            const totalReps = tracking.reps + (tracking.rir !== null && tracking.rir !== undefined ? Math.min(Math.max(Math.round(tracking.rir), 0), 5) : 0);
            const est = Math.round(tracking.weight * (1 + totalReps / 30) * 10) / 10;
            if (est > bestOneRM) {
              bestOneRM = est;
              bestWeight = tracking.weight;
              bestReps = tracking.reps;
              bestRir = tracking.rir ?? null;
            }
          }
        }
        if (bestOneRM > 0) {
          strengthEstimates[exercise.name] = { exercise_name: exercise.name, weight: bestWeight, oneRM: bestOneRM, reps: bestReps, rir: bestRir };
        }
      }

      const estimateRows = Object.values(strengthEstimates).map(({ exercise_name, weight, oneRM, reps, rir }) => ({
        athlete_id: profile.id,
        trainer_id: workout.trainer_id || null,
        exercise_name,
        weight_lifted: weight,
        estimated_1rm: oneRM,
        reps_performed: reps,
        rir: rir,
        unit: 'kg',
        is_baseline: false,
        estimation_method: 'epley',
        formula_used: `${weight} x (1 + ${reps}${rir !== null ? '+' + rir : ''} / 30)`,
        calculated_at: new Date().toISOString(),
      }));

      if (estimateRows.length > 0) {
        await supabase.from('strength_estimates').insert(estimateRows);
      }
    }

    await supabase
      .from('measurement_history')
      .insert({
        user_id: profile.id,
        measurement_type: 'workout_completion',
        measurement_data: {
          workout_id: workout.workout_id,
          workout_name: workout.workouts?.name,
          scheduled_date: workout.scheduled_date,
          completed_at: new Date().toISOString(),
          total_volume: totalVolume,
          exercises: exercises.map(ex => ({
            id: ex.id,
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
          })),
          completed_sets: setTracking,
        },
        recorded_by: profile.id,
        notes: workout.notes || '',
      });

    const { error } = await supabase
      .from('athlete_workouts')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        rpe: feedback.rpe,
        energy_level: feedback.energy_level,
        pain_level: feedback.pain_level,
        mood: feedback.mood,
        feedback_notes: feedback.feedback_notes,
        feedback_submitted_at: new Date().toISOString(),
      })
      .eq('id', workout.id);

    if (!error) {
      // Create performance session record
      await supabase.from('performance_sessions').insert({
        athlete_id: profile.id,
        trainer_id: workout.trainer_id,
        workout_id: workout.workout_id,
        athlete_workout_id: workout.id,
        session_date: workout.scheduled_date,
        session_rpe: feedback.rpe,
        total_volume: totalVolume,
        total_sets: trainingLogs.length,
        total_reps: trainingLogs.reduce((sum, log) => sum + (log.reps_completed || 0), 0),
        notes: feedback.feedback_notes,
        completed_at: new Date().toISOString()
      });

      // Update ATP compliance
      updateATPComplianceForWorkout(profile.id, workout.scheduled_date).catch(err =>
        console.error('Error updating ATP compliance:', err)
      );

      if (feedback.rpe > 9 || feedback.pain_level === 'moderate' || feedback.pain_level === 'strong') {
        await supabase.from('notifications').insert({
          user_id: workout.trainer_id,
          type: 'training',
          title: language === 'es' ? 'Alerta de Entrenamiento' : 'Training Alert',
          message:
            language === 'es'
              ? `⚠️ ${profile.full_name || profile.email} reportó ${
                  feedback.rpe > 9 ? 'esfuerzo alto (RPE ' + feedback.rpe + ')' : ''
                }${feedback.rpe > 9 && (feedback.pain_level === 'moderate' || feedback.pain_level === 'strong') ? ' y ' : ''}${
                  feedback.pain_level === 'moderate' || feedback.pain_level === 'strong'
                    ? 'dolor/molestia ' + (feedback.pain_level === 'moderate' ? 'moderado' : 'fuerte')
                    : ''
                } en la sesión del ${workout.scheduled_date}. Por favor revisa los comentarios.`
              : `⚠️ ${profile.full_name || profile.email} reported ${
                  feedback.rpe > 9 ? 'high effort (RPE ' + feedback.rpe + ')' : ''
                }${feedback.rpe > 9 && (feedback.pain_level === 'moderate' || feedback.pain_level === 'strong') ? ' and ' : ''}${
                  feedback.pain_level === 'moderate' || feedback.pain_level === 'strong'
                    ? (feedback.pain_level === 'moderate' ? 'moderate' : 'strong') + ' pain/discomfort'
                    : ''
                } in session on ${workout.scheduled_date}. Please review feedback.`,
          link: `/athlete/${profile.id}`,
        });
      }

      // Trigger refresh of workout history
      window.dispatchEvent(new Event('workout-history-refresh'));

      onWorkoutUpdate();
      loadDailyWorkout();
    }
  };

  const handleFeedbackSkip = async () => {
    if (!workout?.id || !profile?.id) return;

    const trainingLogs = [];
    let totalVolume = 0;

    for (const exercise of exercises) {
      const maxSets = getTotalSetsForExercise(exercise);
      for (let setNum = 1; setNum <= maxSets; setNum++) {
        const tracking = getSetTracking(exercise.id, setNum);
        if (tracking.reps && tracking.weight) {
          totalVolume += tracking.reps * tracking.weight;
        }

        if (tracking.completed || tracking.reps || tracking.weight) {
          trainingLogs.push({
            athlete_id: profile.id,
            athlete_workout_id: workout.id,
            workout_exercise_id: exercise.workout_exercise_id,
            set_number: setNum,
            reps_completed: tracking.reps || 0,
            weight_used: tracking.weight || 0,
            rir: tracking.rir || null,
            notes: tracking.notes || null,
            logged_at: new Date().toISOString(),
          });
        }
      }
    }

    if (trainingLogs.length > 0) {
      const { error: deleteError } = await supabase
        .from('training_logs')
        .delete()
        .eq('athlete_workout_id', workout.id);

      if (deleteError) {
        console.error('Error deleting previous training logs:', deleteError);
      }

      await supabase.from('training_logs').insert(trainingLogs);
    }

    await supabase
      .from('measurement_history')
      .insert({
        user_id: profile.id,
        measurement_type: 'workout_completion',
        measurement_data: {
          workout_id: workout.workout_id,
          workout_name: workout.workouts?.name,
          scheduled_date: workout.scheduled_date,
          completed_at: new Date().toISOString(),
          total_volume: totalVolume,
          exercises: exercises.map(ex => ({
            id: ex.id,
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
          })),
          completed_sets: setTracking,
        },
        recorded_by: profile.id,
        notes: workout.notes || '',
      });

    const { error } = await supabase
      .from('athlete_workouts')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', workout.id);

    if (!error) {
      // Trigger refresh of workout history
      window.dispatchEvent(new Event('workout-history-refresh'));

      onWorkoutUpdate();
      loadDailyWorkout();
    }
  };

  const handleSkipWorkout = async () => {
    if (!workout?.id) return;

    const { error } = await supabase
      .from('athlete_workouts')
      .update({ status: 'skipped' })
      .eq('id', workout.id);

    if (!error) {
      onWorkoutUpdate();
      loadDailyWorkout();
    }
  };

  const handleEditWorkout = () => {
    if (!workout?.id) return;

    if (workout.status === 'pending') {
      sessionStorage.setItem('edit_workout_id', workout.id);
      sessionStorage.setItem('edit_scheduled_date', workout.scheduled_date);
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'workout-builder' }));
    }
  };

  const handleSaveChanges = async () => {
    if (!workout?.id || !profile?.id) return;

    const currentWorkoutId = workout.id;
    const currentIndex = selectedWorkoutIndex;

    try {
      const trainingLogs = [];

      for (const exercise of exercises) {
        const maxSets = getTotalSetsForExercise(exercise);
        for (let setNum = 1; setNum <= maxSets; setNum++) {
          const tracking = getSetTracking(exercise.id, setNum);

          if (tracking.completed || tracking.reps || tracking.weight) {
            trainingLogs.push({
              athlete_id: profile.id,
              athlete_workout_id: workout.id,
              workout_exercise_id: exercise.workout_exercise_id,
              set_number: setNum,
              reps_completed: tracking.reps || 0,
              weight_used: tracking.weight || 0,
              rir: tracking.rir || null,
              notes: tracking.notes || null,
              logged_at: new Date().toISOString(),
            });
          }
        }
      }

      if (trainingLogs.length > 0) {
        const { error: deleteError } = await supabase
          .from('training_logs')
          .delete()
          .eq('athlete_workout_id', workout.id);

        if (deleteError) throw deleteError;

        const { error: insertError } = await supabase
          .from('training_logs')
          .insert(trainingLogs);

        if (insertError) throw insertError;
      }

      const { error: updateError } = await supabase
        .from('athlete_workouts')
        .update({
          notes: additionalNotes || null
        })
        .eq('id', workout.id);

      if (updateError) throw updateError;

      success(language === 'es' ? 'Cambios guardados' : 'Changes saved');

      // Reload training logs to show updated data
      await loadTrainingLogs(workout.id, exercises);

      // Trigger refresh of workout history
      window.dispatchEvent(new Event('workout-history-refresh'));

      onWorkoutUpdate();
      await loadDailyWorkout();
    } catch (err: any) {
      console.error('Error saving changes:', err);
      error(err.message || (language === 'es' ? 'Error al guardar cambios' : 'Error saving changes'), 5000);
    }
  };

  const handleDeleteWorkout = async () => {
    if (!workout?.id) return;

    try {
      const { error: deleteError } = await supabase
        .from('athlete_workouts')
        .delete()
        .eq('id', workout.id);

      if (deleteError) throw deleteError;

      success(language === 'es' ? 'Entrenamiento eliminado' : 'Workout deleted');

      window.dispatchEvent(new Event('workout-history-refresh'));

      onWorkoutUpdate();
      loadDailyWorkout();
    } catch (err: any) {
      console.error('Error deleting workout:', err);
      error(err.message || (language === 'es' ? 'Error al eliminar entrenamiento' : 'Error deleting workout'), 5000);
    }
  };

  const updateSetTracking = (exerciseId: string, setNumber: number, field: keyof SetTracking, value: any) => {
    if (!workoutStartTime) setWorkoutStartTime(Date.now());
    const key = `${exerciseId}-${setNumber}`;
    setSetTracking(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  const getSetTracking = (exerciseId: string, setNumber: number): SetTracking => {
    const key = `${exerciseId}-${setNumber}`;
    return setTracking[key] || { completed: false };
  };

  const addSet = (exerciseId: string) => {
    setExercises(prevExercises =>
      prevExercises.map(ex => {
        if (ex.id === exerciseId) {
          if (ex.set_lines) {
            // For exercises with set_lines, start from the base total
            const baseTotal = ex.set_lines.reduce((sum, line) => sum + (line.sets || 0), 0);
            const currentActual = ex.actualSets || baseTotal;
            return { ...ex, actualSets: currentActual + 1 };
          } else {
            // For simple exercises, just increment
            return { ...ex, actualSets: (ex.actualSets || ex.sets) + 1 };
          }
        }
        return ex;
      })
    );
  };

  const removeSet = (exerciseId: string, setNumber: number) => {
    const exercise = exercises.find(ex => ex.id === exerciseId);
    if (!exercise) return;

    const maxSets = getTotalSetsForExercise(exercise);
    const minSets = exercise.set_lines
      ? exercise.set_lines.reduce((sum, line) => sum + (line.sets || 0), 0)
      : 1;

    if (maxSets <= minSets) return;

    // Clear tracking for this set
    const key = `${exerciseId}-${setNumber}`;
    setSetTracking(prev => {
      const newTracking = { ...prev };
      delete newTracking[key];

      // Reindex remaining sets
      for (let i = setNumber + 1; i <= maxSets; i++) {
        const oldKey = `${exerciseId}-${i}`;
        const newKey = `${exerciseId}-${i - 1}`;
        if (newTracking[oldKey]) {
          newTracking[newKey] = newTracking[oldKey];
          delete newTracking[oldKey];
        }
      }

      return newTracking;
    });

    setExercises(prevExercises =>
      prevExercises.map(ex => {
        if (ex.id === exerciseId) {
          if (ex.actualSets && ex.actualSets > 0) {
            return { ...ex, actualSets: ex.actualSets - 1 };
          }
        }
        return ex;
      })
    );
  };

  const calculateTotalVolume = (): number => {
    let total = 0;
    for (const exercise of exercises) {
      const maxSets = getTotalSetsForExercise(exercise);
      for (let setNum = 1; setNum <= maxSets; setNum++) {
        const tracking = getSetTracking(exercise.id, setNum);
        if (tracking.reps && tracking.weight) {
          total += tracking.reps * tracking.weight;
        }
      }
    }
    return total;
  };

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', options);
  };

  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return null;
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?]+)/);
    return videoId ? `https://www.youtube.com/embed/${videoId[1]}` : null;
  };

  const handleWorkoutChange = async (index: number) => {
    setSelectedWorkoutIndex(index);
    const selectedWorkout = allWorkouts[index];
    setWorkout(selectedWorkout);
    setAdditionalNotes(selectedWorkout?.notes || '');

    if (selectedWorkout?.workout_id) {
      const { data: exercisesData } = await supabase
        .from('workout_exercises')
        .select('id, order_index, sets, reps, rest_seconds, section_title, primary_value, secondary_value, primary_metric, secondary_metric, exercises(id, exercise, exercise_en, exercise_es, description, description_en, description_es, link)')
        .eq('workout_id', selectedWorkout.workout_id)
        .order('order_index');

      const formattedExercises = groupConsecutiveSameExercises(exercisesData || []);

      setExercises(formattedExercises);

      // Load training logs for this workout
      if (selectedWorkout?.id) {
        await loadTrainingLogs(selectedWorkout.id, formattedExercises);
      }
    } else {
      setExercises([]);
      setSetTracking({});
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-8 text-center">
        <Dumbbell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white dark:text-white mb-2">
          {language === 'es' ? 'Sin entrenamiento programado' : 'No Workout Scheduled'}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400">
          {formatDate(selectedDate)}
        </p>
        <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 mt-2">
          {language === 'es'
            ? 'No hay entrenamientos programados para este día.'
            : 'There are no workouts scheduled for this day.'}
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => {
              const formatDateLocal = (date: Date): string => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
              };
              sessionStorage.setItem('workout_scheduled_date', formatDateLocal(selectedDate));
              window.dispatchEvent(new CustomEvent('navigate', { detail: 'workout-builder' }));
            }}
            className="px-6 py-3 bg-[#514163] hover:bg-[#3d2f4d] text-white rounded-lg transition-colors flex items-center gap-2 justify-center"
          >
            <Dumbbell className="w-5 h-5" />
            {language === 'es' ? 'Planificar Entrenamiento Gym' : 'Plan Gym Workout'}
          </button>
          <button
            onClick={() => onOpenExtraTraining && onOpenExtraTraining()}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors flex items-center gap-2 justify-center"
          >
            <Activity className="w-5 h-5" />
            {language === 'es' ? 'Agregar Entrenamiento Extra' : 'Add Extra Training'}
          </button>
        </div>
      </div>
    );
  }

  const isCompleted = workout.status === 'completed';
  const isSkipped = workout.status === 'skipped';

  if (showSessionScreen && workout && exercises.length > 0) {
    return (
      <WorkoutSessionScreen
        workout={workout}
        exercises={exercises}
        setTracking={setTracking}
        onUpdateTracking={updateSetTracking}
        onComplete={async (feedback) => {
          await handleFeedbackSubmit(feedback);
        }}
        onPause={() => setShowSessionScreen(false)}
        workoutStartTime={workoutStartTime}
        onSetWorkoutStartTime={setWorkoutStartTime}
        onDismiss={() => setShowSessionScreen(false)}
      />
    );
  }

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
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
                {formatDate(selectedDate)}
              </p>
              <div className="relative">
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="p-1 text-gray-500 dark:text-gray-400 hover:text-[#514163] dark:hover:text-[#fdda36] transition-colors"
                  title={language === 'es' ? 'Cambiar fecha' : 'Change date'}
                >
                  <Calendar className="w-4 h-4" />
                </button>
                {showDatePicker && (
                  <div className="absolute top-full left-0 mt-2 z-10 bg-white dark:bg-gray-800 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg shadow-lg p-3">
                    <input
                      type="date"
                      value={newDate || workout.scheduled_date}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-900 text-gray-900 dark:text-white dark:text-white"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={async () => {
                          if (newDate && workout?.id) {
                            await supabase
                              .from('athlete_workouts')
                              .update({ scheduled_date: newDate })
                              .eq('id', workout.id);
                            setShowDatePicker(false);
                            onWorkoutUpdate();
                          }
                        }}
                        className="flex-1 px-3 py-1.5 bg-[#514163] text-white rounded-lg hover:bg-[#6d5581] text-sm"
                      >
                        {language === 'es' ? 'Guardar' : 'Save'}
                      </button>
                      <button
                        onClick={() => setShowDatePicker(false)}
                        className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
                      >
                        {language === 'es' ? 'Cancelar' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={async () => {
                  if (workout?.id) {
                    try {
                      await supabase
                        .from('athlete_workouts')
                        .delete()
                        .eq('id', workout.id);

                      success(language === 'es' ? 'Entrenamiento eliminado' : 'Workout deleted');
                      window.dispatchEvent(new Event('workout-history-refresh'));
                      onWorkoutUpdate();
                    } catch (err: any) {
                      error(err.message || (language === 'es' ? 'Error al eliminar' : 'Error deleting'), 5000);
                    }
                  }
                }}
                className="p-1 text-red-500 hover:text-red-700 transition-colors"
                title={language === 'es' ? 'Borrar sesión' : 'Delete session'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 mb-2">
              {allWorkouts.length > 1 && (
                <>
                  <span className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
                    {language === 'es' ? 'Entrenamiento:' : 'Workout:'}
                  </span>
                  {allWorkouts.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => handleWorkoutChange(index)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        selectedWorkoutIndex === index
                          ? 'bg-[#fdda36] text-[#514163]'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </>
              )}
              <button
                onClick={() => {
                  const formatDateLocal = (date: Date): string => {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                  };
                  sessionStorage.setItem('workout_scheduled_date', formatDateLocal(selectedDate));
                  window.dispatchEvent(new CustomEvent('navigate', { detail: 'workout-builder' }));
                }}
                className="flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium bg-[#514163] hover:bg-[#3d2f4d] text-white transition-colors"
                title={language === 'es' ? 'Planificar Gym' : 'Plan Gym'}
              >
                <Dumbbell className="w-4 h-4" />
                <span className="hidden lg:inline">{language === 'es' ? 'Planificar Gym' : 'Plan Gym'}</span>
                <span className="lg:hidden">{language === 'es' ? 'Gym' : 'Gym'}</span>
              </button>
              <button
                onClick={() => onOpenExtraTraining && onOpenExtraTraining()}
                className="flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium bg-orange-600 hover:bg-orange-700 text-white transition-colors"
                title={language === 'es' ? 'Extra Training' : 'Extra Training'}
              >
                <Activity className="w-4 h-4" />
                <span className="hidden lg:inline">{language === 'es' ? 'Agregar Extra' : 'Add Extra'}</span>
                <span className="lg:hidden">{language === 'es' ? 'Extra' : 'Extra'}</span>
              </button>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white">
                {workout.type === 'extra' || workout.type === 'external' || workout.type === 'endurance_plan'
                  ? workout.name
                  : workout.source === 'trainingpeaks'
                  ? (workout.external_title || 'TrainingPeaks Workout')
                  : (workout.workouts?.name || 'Workout')}
              </h2>
              {workout.source === 'trainingpeaks' && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-sm font-medium flex items-center gap-1.5">
                  <Activity className="w-4 h-4" />
                  TrainingPeaks
                </span>
              )}
              {workout.type === 'extra' && (
                <span className="px-3 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 rounded-full text-sm font-medium flex items-center gap-1.5">
                  <Dumbbell className="w-4 h-4" />
                  {language === 'es' ? 'Extra' : 'Extra'}
                </span>
              )}
              {workout.type === 'external' && (
                <span className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-full text-sm font-medium flex items-center gap-1.5">
                  <Activity className="w-4 h-4" />
                  Strava
                </span>
              )}
            </div>
            {((workout.source === 'trainingpeaks' && workout.raw_description) || workout.workouts?.description || workout.description) && (
              <div className="text-gray-600 dark:text-gray-400 dark:text-gray-400 whitespace-pre-wrap font-mono text-sm bg-gray-50 dark:bg-gray-900 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 dark:border-gray-700">
                {workout.type === 'extra' || workout.type === 'external' || workout.type === 'endurance_plan'
                  ? workout.description
                  : workout.source === 'trainingpeaks'
                  ? workout.raw_description
                  : workout.workouts?.description}
                {workout.duration && (
                  <div className="mt-2 text-gray-500 dark:text-gray-400">
                    {language === 'es' ? 'Duración: ' : 'Duration: '}{workout.duration}
                  </div>
                )}
                {workout.distance && (
                  <div className="mt-1 text-gray-500 dark:text-gray-400">
                    {language === 'es' ? 'Distancia: ' : 'Distance: '}{workout.distance} km
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            {isCompleted && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-400 text-sm font-medium">
                <Check className="w-4 h-4" />
                {language === 'es' ? 'Completado' : 'Completed'}
              </span>
            )}
            {isSkipped && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 text-sm font-medium">
                <X className="w-4 h-4" />
                {language === 'es' ? 'Omitido' : 'Skipped'}
              </span>
            )}
            {!isCompleted && !isSkipped && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fdda36] text-[#514163] text-sm font-medium">
                <Clock className="w-4 h-4" />
                {language === 'es' ? 'Pendiente' : 'Pending'}
              </span>
            )}
          </div>
        </div>

        {workout.type === 'workout' && (
        <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
          {workout.workouts?.duration_minutes && (
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4" />
              <span>{workout.workouts.duration_minutes} min</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4" />
            <span>{exercises.length} {language === 'es' ? 'ejercicios' : 'exercises'}</span>
          </div>
          {!isCompleted && !isSkipped && (
            <div className="flex items-center gap-2 font-semibold text-[#514163] dark:text-[#fdda36]">
              <Weight className="w-4 h-4" />
              <span>{calculateTotalVolume().toFixed(0)} kg {language === 'es' ? 'volumen' : 'volume'}</span>
            </div>
          )}
        </div>
        )}

        {workout.type === 'workout' && (
          <div className="flex gap-2 mt-6">
            {(workout.status === 'completed' || workout.status === 'in_progress') ? (
              <button
                onClick={handleSaveChanges}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white dark:bg-blue-500 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium"
              >
                <Save className="w-4 h-4" />
                {language === 'es' ? 'Guardar' : 'Save'}
              </button>
            ) : (
              <button
                onClick={handleEditWorkout}
                className="flex items-center justify-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors font-medium"
              >
                <Edit className="w-4 h-4" />
                {language === 'es' ? 'Editar' : 'Edit'}
              </button>
            )}
            {workout.status === 'completed' && (
              <button
                onClick={() => setShowShareCard(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-lg hover:from-cyan-600 hover:to-teal-600 transition-colors font-medium"
              >
                <Share2 className="w-4 h-4" />
                {language === 'es' ? 'Compartir' : 'Share'}
              </button>
            )}
            <button
              onClick={handleDeleteWorkout}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-red-600 text-red-600 dark:border-red-400 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
            >
              <Trash2 className="w-4 h-4" />
              {language === 'es' ? 'Eliminar' : 'Delete'}
            </button>
          </div>
        )}

        {!isCompleted && !isSkipped && workout.type === 'workout' && (
          <div className="flex gap-3 mt-3">
            {exercises.length > 0 && (
              <button
                onClick={() => {
                  setWorkoutStartTime(Date.now());
                  setShowSessionScreen(true);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#fdda36] hover:bg-[#f5cf25] text-gray-900 rounded-lg transition-colors font-semibold"
              >
                <Zap className="w-5 h-5" />
                {language === 'es' ? 'Iniciar Entrenamiento' : 'Start Workout'}
              </button>
            )}
            <button
              onClick={handleCompleteWorkout}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
            >
              <Check className="w-5 h-5" />
            </button>
            <button
              onClick={handleSkipWorkout}
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 transition-colors"
            >
              {language === 'es' ? 'Omitir' : 'Skip'}
            </button>
          </div>
        )}
      </div>

      {workout.type === 'workout' && !isCompleted && !isSkipped && (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          {language === 'es' ? 'Resumen del entrenamiento' : 'Workout summary'}
        </h3>

        {exercises.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 rounded-lg p-8 text-center border-2 border-dashed border-gray-300 dark:border-gray-600 dark:border-gray-600">
            {workout.source === 'trainingpeaks' ? (
              <>
                <Activity className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-2">
                  {language === 'es'
                    ? 'Este entrenamiento viene de TrainingPeaks'
                    : 'This workout comes from TrainingPeaks'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                  {language === 'es'
                    ? 'Lee la descripción arriba para ver los detalles del entrenamiento'
                    : 'Read the description above for workout details'}
                </p>
              </>
            ) : (
              <>
                <Dumbbell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400">
                  {language === 'es'
                    ? 'No hay ejercicios en este entrenamiento'
                    : 'No exercises in this workout'}
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            {(() => {
              const metricUnit = (metric: string | undefined) => {
                if (!metric) return language === 'es' ? 'reps' : 'reps';
                if (metric === 'reps') return language === 'es' ? 'reps' : 'reps';
                if (metric === 'kg') return 'kg';
                if (metric === 'lb') return 'lb';
                if (metric === 'percent') return '%';
                if (metric === 'time') return language === 'es' ? 'seg' : 'sec';
                if (metric === 'distance') return 'm';
                if (metric === 'calories') return 'kcal';
                return language === 'es' ? 'reps' : 'reps';
              };

              const sections: { title: string; exercises: typeof exercises }[] = [];
              exercises.forEach((ex) => {
                const title = ex.section_title || (language === 'es' ? 'Ejercicios' : 'Exercises');
                const last = sections[sections.length - 1];
                if (last && last.title === title) {
                  last.exercises.push(ex);
                } else {
                  sections.push({ title, exercises: [ex] });
                }
              });

              return sections.map((section, sIdx) => (
                <div key={sIdx} className="space-y-2">
                  <div className="flex items-center gap-3 mt-4 first:mt-0">
                    <div className="h-px flex-1 bg-gradient-to-r from-[#fdda36]/60 to-transparent" />
                    <span className="text-xs font-bold text-[#514163] dark:text-[#fdda36] uppercase tracking-widest whitespace-nowrap">
                      {section.title}
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-l from-[#fdda36]/60 to-transparent" />
                  </div>

                  {section.exercises.map((exercise, exIdx) => (
                    <div
                      key={exercise.id}
                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
                    >
                      <div className="flex items-start gap-3 p-3">
                        <div className="shrink-0 w-8 h-8 rounded-lg bg-[#fdda36]/15 border border-[#fdda36]/30 flex items-center justify-center mt-0.5">
                          <span className="text-[#514163] dark:text-[#fdda36] font-bold text-xs font-heading">
                            {exIdx + 1}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white text-sm leading-tight mb-1.5">
                            {exercise.name}
                          </p>

                          {exercise.set_lines ? (
                            <div className="space-y-1">
                              {exercise.set_lines.map((line, lineIdx) => (
                                <div key={lineIdx} className="flex flex-wrap items-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold bg-[#514163]/10 dark:bg-[#fdda36]/10 text-[#514163] dark:text-[#fdda36] rounded-md px-2 py-0.5">
                                    {line.sets} {language === 'es' ? 'series' : 'sets'}
                                  </span>
                                  <span className="text-gray-300 dark:text-gray-600 text-xs">×</span>
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold bg-[#514163]/10 dark:bg-[#fdda36]/10 text-[#514163] dark:text-[#fdda36] rounded-md px-2 py-0.5">
                                    {line.primary_value || line.reps || '10'} {metricUnit(line.primary_metric)}
                                  </span>
                                  {line.secondary_metric && line.secondary_value && (
                                    <>
                                      <span className="text-gray-300 dark:text-gray-600 text-xs">@</span>
                                      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-[#514163]/10 dark:bg-[#fdda36]/10 text-[#514163] dark:text-[#fdda36] rounded-md px-2 py-0.5">
                                        {line.secondary_value} {metricUnit(line.secondary_metric)}
                                      </span>
                                    </>
                                  )}
                                  {line.rest_seconds ? (
                                    <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 ml-1">
                                      <Clock className="w-3 h-3" />
                                      {line.rest_seconds}s
                                    </span>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-[#514163]/10 dark:bg-[#fdda36]/10 text-[#514163] dark:text-[#fdda36] rounded-md px-2 py-0.5">
                                {exercise.sets} {language === 'es' ? 'series' : 'sets'}
                              </span>
                              <span className="text-gray-300 dark:text-gray-600 text-xs">×</span>
                              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-[#514163]/10 dark:bg-[#fdda36]/10 text-[#514163] dark:text-[#fdda36] rounded-md px-2 py-0.5">
                                {exercise.primary_value || exercise.reps || '10'} {metricUnit(exercise.primary_metric)}
                              </span>
                              {exercise.secondary_metric && exercise.secondary_value && (
                                <>
                                  <span className="text-gray-300 dark:text-gray-600 text-xs">@</span>
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold bg-[#514163]/10 dark:bg-[#fdda36]/10 text-[#514163] dark:text-[#fdda36] rounded-md px-2 py-0.5">
                                    {exercise.secondary_value} {metricUnit(exercise.secondary_metric)}
                                  </span>
                                </>
                              )}
                              {exercise.rest_seconds ? (
                                <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 ml-1">
                                  <Clock className="w-3 h-3" />
                                  {exercise.rest_seconds}s
                                </span>
                              ) : null}
                            </div>
                          )}
                        </div>

                        {exercise.link && (
                          <button
                            onClick={() => setVideoModal({ url: exercise.link!, name: exercise.name, description: exercise.description })}
                            className="shrink-0 w-8 h-8 rounded-lg bg-[#514163]/10 dark:bg-[#fdda36]/10 flex items-center justify-center hover:bg-[#514163]/20 dark:hover:bg-[#fdda36]/20 transition-colors"
                          >
                            <Play className="w-3.5 h-3.5 text-[#514163] dark:text-[#fdda36]" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ));
            })()}
          </>
        )}

        {workout.type === 'workout' && !isCompleted && !isSkipped && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {language === 'es' ? 'Notas Adicionales' : 'Additional Notes'}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {language === 'es'
                ? 'Agrega notas sobre ejercicios adicionales que realizaste o cualquier observación del entrenamiento'
                : 'Add notes about additional exercises you performed or any workout observations'}
            </p>
            <textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder={language === 'es' ? 'Ej: Hice 15 min de cardio extra...' : 'E.g., Did 15 min extra cardio...'}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
            />
          </div>
        )}
      </div>
      )}

      <PostTrainingFeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSubmit={handleFeedbackSubmit}
        onSkip={handleFeedbackSkip}
        workoutData={getWorkoutShareData()}
      />

      {showShareCard && (
        <WorkoutShareCard
          workoutData={getWorkoutShareData()}
          onClose={() => setShowShareCard(false)}
        />
      )}

      <StrengthEstimator
        isOpen={showStrengthEstimator}
        onClose={() => setShowStrengthEstimator(false)}
        exerciseId={estimatorExerciseId}
        exerciseName={estimatorExerciseName}
        athleteId={profile?.id}
      />
      </div>

      {videoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={() => setVideoModal(null)}
        >
          <div
            className="relative w-full max-w-2xl bg-gray-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-gray-950 shrink-0">
              <span className="text-white font-semibold text-sm truncate pr-4">{videoModal.name}</span>
              <button
                onClick={() => setVideoModal(null)}
                className="shrink-0 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {(() => {
              const embedUrl = getYouTubeEmbedUrl(videoModal.url);
              if (embedUrl) {
                return (
                  <div className="aspect-video w-full shrink-0">
                    <iframe
                      src={embedUrl}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                );
              }
              return (
                <div className="aspect-video w-full shrink-0 flex flex-col items-center justify-center gap-4 bg-gray-800 p-6">
                  <Play className="w-12 h-12 text-white/40" />
                  <p className="text-white/60 text-sm text-center">
                    {language === 'es' ? 'Este video no puede mostrarse aqui.' : 'This video cannot be displayed here.'}
                  </p>
                  <a
                    href={videoModal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-[#fdda36] text-gray-900 rounded-lg text-sm font-medium hover:bg-[#fdda36]/90 transition-colors"
                  >
                    {language === 'es' ? 'Abrir en nueva pestana' : 'Open in new tab'}
                  </a>
                </div>
              );
            })()}

            {videoModal.description && (
              <div className="overflow-y-auto px-5 py-4 shrink">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  {language === 'es' ? 'Descripcion del ejercicio' : 'Exercise description'}
                </p>
                <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
                  {videoModal.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
