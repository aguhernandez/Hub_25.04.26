import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAthlete } from '../contexts/AthleteContext';
import { supabase } from '../lib/supabase';
import WorkoutHistory from '../components/WorkoutHistory';
import TrainingCalendar from '../components/TrainingCalendar';
import DailyWorkoutView from '../components/DailyWorkoutView';
import DuplicateWorkoutModal from '../components/DuplicateWorkoutModal';
import AddExtraTrainingModal from '../components/AddExtraTrainingModal';
import StrengthEstimator from '../components/training/StrengthEstimator';
import AIWorkoutGenerator from '../components/training/AIWorkoutGenerator';
import WellnessCheckinModal from '../components/training/wellness/WellnessCheckinModal';
import WellnessReportModal from '../components/training/wellness/WellnessReportModal';
import CoachWellnessDashboard from '../components/training/wellness/CoachWellnessDashboard';
import CMJAssessment from '../components/training/cmj/CMJAssessment';
import BarVelocityTracker from '../components/training/barvelocity/BarVelocityTracker';
import EnduranceWorkoutCard, { type EnduranceWorkout } from '../components/training/EnduranceWorkoutCard';
import LogWorkoutModal from '../components/training/LogWorkoutModal';
import WorkoutReassignModal from '../components/training/WorkoutReassignModal';
import GPSActivityDetailModal from '../components/training/GPSActivityDetailModal';
import TrainerAthleteSelector from '../components/training/TrainerAthleteSelector';
import { getExerciseName } from '../utils/exerciseI18n';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { useMembership } from '../hooks/useMembership';
import WorkoutTagsSection from '../components/tags/WorkoutTagsSection';
import { Dumbbell, Calendar, Plus, Play, ChevronLeft, ChevronRight, TrendingUp, Clock, Weight, History, Copy, Activity, Clipboard, MoreVertical, GripVertical, Trash2, X, CreditCard as Edit, Calculator, RotateCw, Sparkles, Heart, Zap, BarChart2, Users, ChevronDown, BookOpen, CheckCircle2, Flag } from 'lucide-react';

interface Exercise {
  id: string;
  exercise: string;
  link?: string;
}

interface SetLine {
  id: string;
  sets: number;
  reps: string;
  primary_value?: string;
  secondary_value?: string;
  primary_metric?: string;
  secondary_metric?: string;
  rir?: number;
  rpe?: number;
  rest_seconds?: number;
  notes?: string;
}

interface WorkoutExercise {
  id: string;
  exercise: Exercise;
  sets: number;
  reps: string;
  rest_seconds?: number;
  notes?: string;
  superset_group?: number;
  order_index: number;
  primary_metric?: string;
  secondary_metric?: string;
  primary_value?: string;
  secondary_value?: string;
  rir?: number;
  rpe?: number;
  set_lines?: SetLine[];
  actual_performance?: Array<{
    set_number: number;
    reps_completed: number;
    weight_used: number;
    rir?: number;
    bar_speed?: number;
  }>;
}

interface Workout {
  id: string;
  workout_id?: string;
  name: string;
  description: string;
  scheduled_date: string;
  status: string;
  exercises: WorkoutExercise[];
  type?: string;
}

interface TrainingLog {
  id: string;
  set_number: number;
  reps: number;
  weight: number;
  rir?: number;
  bar_velocity?: number;
  notes?: string;
}

type CalendarView = 'day' | 'week' | 'month';

export default function TrainingPage() {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const { toast, showToast, hideToast, success, error } = useToast();
  const { selectedAthleteId, selectedAthleteName, clearSelectedAthlete } = useAthlete();
  const effectiveAthleteId = profile?.role === 'trainer' && selectedAthleteId ? selectedAthleteId : profile?.id;
  const { canAccessAIWorkouts, canAccessAssessments } = useMembership();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<CalendarView>('week');
  const [loading, setLoading] = useState(true);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'history'>('calendar');
  const [totalVolume, setTotalVolume] = useState(0);
  const [copiedWorkout, setCopiedWorkout] = useState<Workout | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [workoutToDuplicate, setWorkoutToDuplicate] = useState<Workout | null>(null);
  const [contextMenuWorkout, setContextMenuWorkout] = useState<string | null>(null);
  const [showExtraTrainingModal, setShowExtraTrainingModal] = useState(false);
  const [showMonthlyDayModal, setShowMonthlyDayModal] = useState(false);
  const [showAddMenuForDate, setShowAddMenuForDate] = useState<string | null>(null);
  const [showQuickActionMenu, setShowQuickActionMenu] = useState(false);
  const [showFAB, setShowFAB] = useState(false);
  const [showAssessmentMenu, setShowAssessmentMenu] = useState(false);
  const [showAssessmentUpgradeModal, setShowAssessmentUpgradeModal] = useState(false);
  const [showStrengthEstimator, setShowStrengthEstimator] = useState(false);
  const [estimatorExerciseId, setEstimatorExerciseId] = useState<string>('');
  const [estimatorExerciseName, setEstimatorExerciseName] = useState<string>('');
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showAIUpgradeModal, setShowAIUpgradeModal] = useState(false);
  const [showWellnessCheckin, setShowWellnessCheckin] = useState(false);
  const [todayWellnessScore, setTodayWellnessScore] = useState<number | null>(null);
  const [wellnessChecked, setWellnessChecked] = useState(false);
  const [wellnessEntries, setWellnessEntries] = useState<any[]>([]);
  const [selectedWellnessEntry, setSelectedWellnessEntry] = useState<any | null>(null);
  const [showCMJAssessment, setShowCMJAssessment] = useState(false);
  const [showBarVelocity, setShowBarVelocity] = useState(false);
  const [activePlan, setActivePlan] = useState<{ id: string; race_name: string } | null>(null);
  const [showCoachWellness, setShowCoachWellness] = useState(false);
  const [selectedEnduranceWorkout, setSelectedEnduranceWorkout] = useState<EnduranceWorkout | null>(null);
  const [selectedRacePlan, setSelectedRacePlan] = useState<any | null>(null);
  const [logWorkoutTarget, setLogWorkoutTarget] = useState<EnduranceWorkout | null>(null);
  const [reassignSourceWorkout, setReassignSourceWorkout] = useState<EnduranceWorkout | null>(null);
  const [logReassignTarget, setLogReassignTarget] = useState<{ workout: EnduranceWorkout; executedOnDate: string; originalPlannedDay: string } | null>(null);
  const [selectedGPSActivity, setSelectedGPSActivity] = useState<{ id: string | null; data: any } | null>(null);

  useEffect(() => {
    loadWorkouts();
    loadWellnessEntries();
  }, [profile?.id, selectedAthleteId, selectedDate, calendarView]);

  useEffect(() => {
    if (profile?.id) checkTodayWellness();
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;
    const athleteId = effectiveAthleteId;
    supabase
      .from('race_plans')
      .select('id, race_name')
      .eq('athlete_id', athleteId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setActivePlan(data ?? null));
  }, [profile?.id, effectiveAthleteId]);

  const checkTodayWellness = async () => {
    const today = formatDateLocal(new Date());
    const { data } = await supabase
      .from('wellness_checkins')
      .select('wellness_score_100, overall_score')
      .eq('athlete_id', effectiveAthleteId)
      .eq('checkin_date', today)
      .maybeSingle();
    if (data) {
      const sc = data.wellness_score_100 ?? (data.overall_score ? data.overall_score * 20 : null);
      setTodayWellnessScore(sc);
      setWellnessChecked(true);
    }
  };

  const loadWellnessEntries = async () => {
    if (!effectiveAthleteId) return;
    const startDate = getDateRangeStart();
    const endDate = getDateRangeEnd();
    const startStr = formatDateLocal(startDate);
    const endStr = formatDateLocal(endDate);
    const { data } = await supabase
      .from('wellness_checkins')
      .select('*')
      .eq('athlete_id', effectiveAthleteId)
      .gte('checkin_date', startStr)
      .lte('checkin_date', endStr);
    setWellnessEntries(data || []);
  };

  useEffect(() => {
    if (profile?.id) {
      calculateTotalVolume();
    }
  }, [workouts, calendarView, selectedDate]);

  useEffect(() => {
    const handleWorkoutRefresh = () => {
      calculateTotalVolume();
      loadWorkouts();
    };

    window.addEventListener('workout-history-refresh', handleWorkoutRefresh);
    return () => window.removeEventListener('workout-history-refresh', handleWorkoutRefresh);
  }, [profile?.id, selectedDate, calendarView]);

  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseDateStr = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const getEnduranceColor = (workout: any): { border: string; bg: string; text: string } => {
    const SESSION_COLORS: Record<string, string> = {
      easy: '#10B981', endurance: '#3B82F6', tempo: '#F59E0B',
      threshold: '#F97316', vo2max: '#EF4444', sprint: '#F43F5E',
      recovery: '#9CA3AF', strength: '#8B5CF6', race: '#EAB308',
    };
    const DIFF_MAP: Record<string, string> = {
      red: '#EF4444', yellow: '#F59E0B', green: '#10B981',
      blue: '#3B82F6', orange: '#F97316', gray: '#9CA3AF', grey: '#9CA3AF',
    };
    let color = '#06B6D4';
    const sources = [workout.notes || '', workout.description || ''];
    for (const src of sources) {
      const m = src.match(/DIFFICULTY[:\s]+\w+\s*\((\w+)\)/i);
      if (m && DIFF_MAP[m[1].toLowerCase()]) { color = DIFF_MAP[m[1].toLowerCase()]; break; }
    }
    if (color === '#06B6D4' && workout.session_type && SESSION_COLORS[workout.session_type]) {
      color = SESSION_COLORS[workout.session_type];
    }
    const palette: Record<string, { bg: string; text: string }> = {
      '#10B981': { bg: 'bg-emerald-100 dark:bg-emerald-900/20', text: 'text-emerald-800 dark:text-emerald-300' },
      '#3B82F6': { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-800 dark:text-blue-300' },
      '#F59E0B': { bg: 'bg-amber-100 dark:bg-amber-900/20', text: 'text-amber-800 dark:text-amber-300' },
      '#F97316': { bg: 'bg-orange-100 dark:bg-orange-900/20', text: 'text-orange-800 dark:text-orange-300' },
      '#EF4444': { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-800 dark:text-red-300' },
      '#F43F5E': { bg: 'bg-rose-100 dark:bg-rose-900/20', text: 'text-rose-800 dark:text-rose-300' },
      '#9CA3AF': { bg: 'bg-gray-100 dark:bg-gray-700/40', text: 'text-gray-700 dark:text-gray-300' },
      '#8B5CF6': { bg: 'bg-violet-100 dark:bg-violet-900/20', text: 'text-violet-800 dark:text-violet-300' },
      '#EAB308': { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-800 dark:text-yellow-300' },
      '#06B6D4': { bg: 'bg-cyan-100 dark:bg-cyan-900/20', text: 'text-cyan-800 dark:text-cyan-300' },
    };
    const p = palette[color] || palette['#06B6D4'];
    return { border: color, bg: p.bg, text: p.text };
  };

  const parseStepsFromDescription = (description: string): any[] => {
    const stepsMatch = description.match(/Steps:\n([\s\S]*?)(?:\n\nPlanned impulse:|$)/);
    if (!stepsMatch) return [];
    const lines = stepsMatch[1].split('\n').filter(l => l.trim());
    let idCounter = 0;
    return lines.map(line => {
      // Match: "warmup: 10min @ 3-3 RPE" or "interval: 30s @ 8-8 RPE" or "cooldown: 10min @ Z2"
      const match = line.match(/^(\w+):\s+(\d+)(min|s|km|m)?\s+@\s+(.+)$/i);
      if (!match) return null;
      const [, stepType, durationStr, unit, targetStr] = match;
      const normalizedType = stepType.toLowerCase();
      const stepTypeMap: Record<string, string> = {
        warmup: 'warmup', warm: 'warmup', wu: 'warmup',
        interval: 'interval', int: 'interval',
        recovery: 'recovery', rec: 'recovery',
        cooldown: 'cooldown', cd: 'cooldown', cool: 'cooldown',
        steady: 'steady', endurance: 'steady', base: 'steady',
      };
      const mappedType = stepTypeMap[normalizedType] || 'steady';
      const durationVal = parseInt(durationStr);
      // Convert to seconds: min→×60, s→×1, default→×60
      const durationSeconds = (unit?.toLowerCase() === 's') ? durationVal : durationVal * 60;

      let targetType: string = 'rpe';
      let targetZone: number | undefined;
      let targetPercentFtp: number | undefined;
      let targetMin: number | undefined;
      let targetMax: number | undefined;

      if (targetStr.match(/Z\d/i)) {
        const zMatch = targetStr.match(/Z(\d)/i);
        if (zMatch) {
          const zoneNum = parseInt(zMatch[1]);
          if (targetStr.match(/FTP|power|watt/i)) {
            targetType = 'power';
          } else if (targetStr.match(/HR|bpm|heart/i)) {
            targetType = 'hr';
          } else if (targetStr.match(/pace|min\/km/i)) {
            targetType = 'pace';
          } else {
            targetType = 'hr';
          }
          targetZone = zoneNum;
        }
      } else if (targetStr.match(/\d+%\s*FTP/i)) {
        const pctMatch = targetStr.match(/(\d+)%/);
        if (pctMatch) {
          targetType = 'power';
          targetPercentFtp = parseInt(pctMatch[1]);
        }
      } else {
        // Handle RPE formats: "RPE 8", "8-8 RPE", "3-3 RPE", "8 RPE"
        const rpeAfter = targetStr.match(/RPE\s*(\d+)/i);
        const rpeBefore = targetStr.match(/(\d+)(?:-(\d+))?\s*RPE/i);
        if (rpeAfter) {
          targetType = 'rpe';
          const rpeVal = parseInt(rpeAfter[1]);
          targetMin = rpeVal;
          targetMax = rpeVal;
        } else if (rpeBefore) {
          targetType = 'rpe';
          targetMin = parseInt(rpeBefore[1]);
          targetMax = rpeBefore[2] ? parseInt(rpeBefore[2]) : targetMin;
        }
      }

      return {
        id: `parsed-${idCounter++}`,
        order: idCounter,
        step_type: mappedType,
        duration_type: 'time',
        duration_value: durationSeconds,
        target_type: targetType,
        target_zone: targetZone,
        target_percent_ftp: targetPercentFtp,
        target_min_value: targetMin,
        target_max_value: targetMax,
      };
    }).filter(Boolean);
  };

  const loadWorkouts = async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // For monthly view, load ALL historical data (past 2 years + future 6 months)
      // For day/week view, use the specific range
      let startDateStr: string;
      let endDateStr: string;

      if (calendarView === 'month') {
        // Load from 2 years ago to 6 months in the future
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
        const sixMonthsAhead = new Date();
        sixMonthsAhead.setMonth(sixMonthsAhead.getMonth() + 6);

        startDateStr = formatDateLocal(twoYearsAgo);
        endDateStr = formatDateLocal(sixMonthsAhead);
      } else {
        const startDate = getDateRangeStart();
        const endDate = getDateRangeEnd();
        startDateStr = formatDateLocal(startDate);
        endDateStr = formatDateLocal(endDate);
      }

      console.log('📅 Loading data range:', startDateStr, 'to', endDateStr);

      // Load programmed workouts
      const { data: athleteWorkoutsData, error: workoutsError } = await supabase
        .from('athlete_workouts')
        .select(`
          id,
          scheduled_date,
          status,
          source,
          external_id,
          external_title,
          raw_description,
          workouts (
            id,
            name,
            description,
            duration_minutes,
            workout_exercises (id)
          )
        `)
        .eq('athlete_id', effectiveAthleteId)
        .gte('scheduled_date', startDateStr)
        .lte('scheduled_date', endDateStr)
        .order('scheduled_date', { ascending: true });

      if (workoutsError) throw workoutsError;

      // Load extra training logs
      const { data: extraTrainingData, error: extraError } = await supabase
        .from('extra_training_logs')
        .select('*')
        .eq('athlete_id', effectiveAthleteId)
        .gte('training_date', startDateStr)
        .lte('training_date', endDateStr)
        .order('training_date', { ascending: true });

      if (extraError) throw extraError;

      // Load external activities - load all, filter locally to avoid timezone issues
      const { data: allExternalData, error: externalError } = await supabase
        .from('external_activities')
        .select('*')
        .eq('user_id', effectiveAthleteId)
        .order('start_time', { ascending: false });

      if (externalError) throw externalError;

      // Filter external activities by date range using local_date (plain date, no timezone)
      const externalData = allExternalData?.filter((activity: any) => {
        const activityDate = activity.local_date
          ? String(activity.local_date).substring(0, 10)
          : String(activity.start_time).substring(0, 10);
        return activityDate >= startDateStr && activityDate <= endDateStr;
      }) || [];

      // Load completed workouts from training_logs (gym sessions)
      const { data: completedLogsData, error: logsError } = await supabase
        .from('training_logs')
        .select(`
          id,
          athlete_workout_id,
          workout_exercise_id,
          weight_used,
          reps_completed,
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

      if (logsError) throw logsError;

      // Group training logs by date and workout
      const logsByDate = new Map<string, Set<string>>();
      const workoutDetailsMap = new Map<string, any>();
      const workoutStatsMap = new Map<string, { totalVolume: number; exerciseIds: Set<string> }>();

      completedLogsData?.forEach((log: any) => {
        const logDate = String(log.logged_at).substring(0, 10);
        if (logDate >= startDateStr && logDate <= endDateStr) {
          const workoutId = log.athlete_workout_id;
          if (!logsByDate.has(logDate)) {
            logsByDate.set(logDate, new Set());
          }
          logsByDate.get(logDate)!.add(workoutId);

          if (log.athlete_workouts?.workouts && !workoutDetailsMap.has(workoutId)) {
            workoutDetailsMap.set(workoutId, {
              id: workoutId,
              name: log.athlete_workouts.workouts.name,
              description: log.athlete_workouts.workouts.description,
              workout_id: log.athlete_workouts.workouts.id,
              date: logDate
            });
          }

          // Accumulate volume and exercise count per workout
          if (!workoutStatsMap.has(workoutId)) {
            workoutStatsMap.set(workoutId, { totalVolume: 0, exerciseIds: new Set() });
          }
          const stats = workoutStatsMap.get(workoutId)!;
          const weight = Number(log.weight_used) || 0;
          const reps = Number(log.reps_completed) || 0;
          stats.totalVolume += weight * reps;
          if (log.workout_exercise_id) {
            stats.exerciseIds.add(log.workout_exercise_id);
          }
        }
      });

      // Format programmed workouts
      const programmedWorkoutIds = new Set<string>();
      const formattedWorkouts = athleteWorkoutsData?.map((aw: any) => {
        programmedWorkoutIds.add(aw.id);
        const stats = workoutStatsMap.get(aw.id);
        const plannedExerciseCount = aw.workouts?.workout_exercises?.length || 0;
        return {
          id: aw.id,
          workout_id: aw.workouts?.id,
          name: aw.source === 'trainingpeaks' ? (aw.external_title || 'TrainingPeaks Workout') : (aw.workouts?.name || 'Workout'),
          description: aw.source === 'trainingpeaks' ? (aw.raw_description || '') : (aw.workouts?.description || ''),
          scheduled_date: aw.scheduled_date,
          status: aw.status,
          source: aw.source || 'asciende',
          external_id: aw.external_id,
          exercises: [],
          type: 'workout',
          totalVolume: stats?.totalVolume || 0,
          exerciseCount: stats?.exerciseIds.size || plannedExerciseCount,
        };
      }) || [];

      // Format completed workouts from training_logs that are NOT already in programmed workouts
      const formattedCompletedWorkouts: any[] = [];
      workoutDetailsMap.forEach((workout) => {
        if (!programmedWorkoutIds.has(workout.id)) {
          const stats = workoutStatsMap.get(workout.id);
          formattedCompletedWorkouts.push({
            id: workout.id,
            workout_id: workout.workout_id,
            name: workout.name || 'Completed Workout',
            description: workout.description || '',
            scheduled_date: workout.date,
            status: 'completed',
            source: 'asciende',
            exercises: [],
            type: 'workout',
            totalVolume: stats?.totalVolume || 0,
            exerciseCount: stats?.exerciseIds.size || 0,
          });
        }
      });

      // Format extra training logs
      const formattedExtra = extraTrainingData?.map((et: any) => ({
        id: `extra-${et.id}`,
        name: et.activity_name,
        description: et.notes || '',
        scheduled_date: et.training_date,
        status: 'completed',
        source: 'extra',
        duration: et.duration,
        exercises: [],
        type: 'extra'
      })) || [];

      // Format external activities with correct local date
      const formattedExternal = externalData?.map((ex: any) => ({
        id: `external-${ex.id}`,
        external_activity_id: ex.id,
        name: ex.name || ex.sport_type || 'External Activity',
        description: ex.user_notes || '',
        scheduled_date: ex.local_date
          ? String(ex.local_date).substring(0, 10)
          : String(ex.start_time).substring(0, 10),
        status: 'completed',
        source: ex.source || 'strava',
        duration: ex.duration_seconds ? `${Math.round(ex.duration_seconds / 60)} min` : '',
        distance: ex.distance_meters ? (ex.distance_meters / 1000).toFixed(2) : null,
        exercises: [],
        type: 'external',
        raw_data: ex
      })) || [];

      // Load endurance individual workouts (with steps) from external planners
      const { data: enduranceWorkoutsData } = await supabase
        .from('external_endurance_workouts')
        .select('id, name, sport, sub_discipline, description, intensity_basis, scheduled_date, scheduled_time, estimated_duration_minutes, estimated_impulse, status, steps, planner_source')
        .eq('athlete_id', effectiveAthleteId)
        .gte('scheduled_date', startDateStr)
        .lte('scheduled_date', endDateStr);

      const formattedEndurancePlans: any[] = (enduranceWorkoutsData || []).map((ew: any) => ({
        id: `endurance-workout-${ew.id}`,
        name: ew.name || (language === 'es' ? 'Sesión Endurance' : 'Endurance Session'),
        description: ew.description || `${ew.planner_source}${ew.estimated_duration_minutes ? ` · ${ew.estimated_duration_minutes}min` : ''}`,
        scheduled_date: String(ew.scheduled_date).substring(0, 10),
        status: ew.status || 'planned',
        source: 'endurance_planner',
        exercises: [],
        type: 'endurance_plan',
        endurance_workout_data: ew,
        planner_source: ew.planner_source,
      }));

      // Load weekly summary plans — fetch any week that could overlap with our viewport
      // A week starting up to 6 days before startDate could still have days inside the range
      const enduranceFrom = parseDateStr(startDateStr);
      enduranceFrom.setDate(enduranceFrom.getDate() - 6);
      const { data: endurancePlansData } = await supabase
        .from('external_endurance_plans')
        .select('id, week_start_date, plan_name, planner_source, summary, plan_data')
        .eq('athlete_id', effectiveAthleteId)
        .gte('week_start_date', formatDateLocal(enduranceFrom))
        .lte('week_start_date', endDateStr);

      endurancePlansData?.forEach((ep: any) => {
        const days: any[] = ep.plan_data?.days || ep.summary?.workouts || [];
        days.forEach((w: any, i: number) => {
          if (!w.date) return;
          const scheduledDate = String(w.date).substring(0, 10);
          if (scheduledDate < startDateStr || scheduledDate > endDateStr) return;

          const rawDescription: string = w.description || '';
          const sport: string = w.sport || 'cycling';
          const duration: number = w.planned_duration_minutes || w.duration_min || 0;
          const tss = w.planned_tss || w.tss || null;
          const sessionType: string = w.session_type || '';

          // Extract name: use w.name if present, else use the first paragraph of description
          // (everything before the first blank line or before "Steps:")
          let name: string = w.name || '';
          if (!name) {
            const firstParagraph = rawDescription.split('\n\n')[0].trim();
            const firstLine = firstParagraph.split('\n')[0].trim();
            name = firstLine || sport;
          }

          // Parse structured steps from the description text
          const parsedSteps = parseStepsFromDescription(rawDescription);

          // Clean description: remove the first paragraph (used as name) and Steps block
          // Keep only the middle paragraphs that aren't the name or steps
          const paragraphs = rawDescription.split('\n\n');
          const middleParagraphs = paragraphs.filter((p, idx) => {
            if (idx === 0) return false; // first paragraph = name
            if (p.trim().startsWith('Steps:')) return false;
            if (p.trim().startsWith('Planned impulse:')) return false;
            if (p.trim().startsWith('Intensity basis:')) return false;
            return p.trim().length > 0;
          });
          const cleanDescription = middleParagraphs.join('\n\n').trim() || undefined;

          formattedEndurancePlans.push({
            id: `endurance-plan-${ep.id}-${i}`,
            name,
            description: cleanDescription,
            scheduled_date: scheduledDate,
            status: w.completed ? 'completed' : 'planned',
            source: 'endurance_planner',
            exercises: [],
            type: 'endurance_plan',
            planner_source: ep.planner_source,
            estimated_duration_minutes: duration,
            estimated_impulse: tss || undefined,
            sport,
            session_type: sessionType || undefined,
            target_zones: (w.target_zones || []).map((z: number) => {
              const basis = w.intensity_basis || 'zone';
              if (basis === 'rpe') return `RPE ${z}`;
              if (basis === 'power') return `Z${z}`;
              if (basis === 'hr') return `Z${z}`;
              return `Z${z}`;
            }),
            rpe: w.rpe || undefined,
            notes: w.notes || undefined,
            plan_week_id: ep.id,
            parsed_steps: parsedSteps,
          });
        });
      });

      // Load race plans — show on their race_date or scheduled_date
      const { data: racePlansData } = await supabase
        .from('race_plans')
        .select('id, race_name, sport, race_date, scheduled_date, expected_duration_min, distance_km, is_active, created_at')
        .eq('athlete_id', effectiveAthleteId)
        .order('created_at', { ascending: false });

      const formattedRacePlans: any[] = (racePlansData || []).map((rp: any) => {
        const dateStr = (rp.race_date || rp.scheduled_date || '').substring(0, 10);
        return {
          id: `race-plan-${rp.id}`,
          race_plan_id: rp.id,
          name: rp.race_name || (language === 'es' ? 'Carrera' : 'Race'),
          description: [
            rp.distance_km ? `${rp.distance_km} km` : '',
            rp.expected_duration_min ? `${Math.floor(rp.expected_duration_min / 60)}h${rp.expected_duration_min % 60 > 0 ? String(rp.expected_duration_min % 60).padStart(2, '0') : ''}` : '',
          ].filter(Boolean).join(' · '),
          scheduled_date: dateStr,
          status: 'planned',
          source: 'race_plan',
          sport: rp.sport || 'triathlon',
          is_active: rp.is_active,
          type: 'race_plan',
          exercises: [],
        };
      }).filter((rp: any) => rp.scheduled_date >= startDateStr && rp.scheduled_date <= endDateStr);

      // Combine all activities
      const allActivities = [
        ...formattedWorkouts,
        ...formattedCompletedWorkouts,
        ...formattedExtra,
        ...formattedExternal,
        ...formattedEndurancePlans,
        ...formattedRacePlans
      ].sort((a, b) => {
        return parseDateStr(a.scheduled_date).getTime() - parseDateStr(b.scheduled_date).getTime();
      });

      console.log('📊 Loaded activities:', {
        programmed: formattedWorkouts.length,
        completed: formattedCompletedWorkouts.length,
        extra: formattedExtra.length,
        external: formattedExternal.length,
        endurancePlans: formattedEndurancePlans.length,
        total: allActivities.length,
        dateRange: `${startDateStr} to ${endDateStr}`,
        endurancePlanDates: formattedEndurancePlans.map(e => `${e.scheduled_date} - ${e.name}`),
        rawEndurancePlansFromDB: endurancePlansData?.map(ep => ({
          week: ep.week_start_date,
          dayDates: (ep.plan_data?.days || []).map((d: any) => d.date)
        }))
      });

      setWorkouts(allActivities);
    } catch (error) {
      console.error('Error loading workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkoutDetails = async (workoutId: string) => {
    try {
      const { data, error } = await supabase
        .from('workout_exercises')
        .select(`
          id,
          sets,
          reps,
          rest_seconds,
          notes,
          superset_group,
          order_index,
          primary_metric,
          secondary_metric,
          primary_value,
          secondary_value,
          rir,
          rpe,
          exercise_id,
          exercises (
            id,
            exercise,
            exercise_en,
            exercise_es,
            link
          )
        `)
        .eq('workout_id', workoutId)
        .order('order_index', { ascending: true });

      if (error) throw error;

      // Group exercises that have the same exercise_id consecutively
      const grouped: any[] = [];
      const tempGroups = new Map<string, any[]>();

      data?.forEach((ex: any, index: number) => {
        const exerciseId = ex.exercises?.id || ex.exercise_id;
        const prevEx = index > 0 ? data[index - 1] : null;
        const prevExerciseId = prevEx?.exercises?.id || prevEx?.exercise_id;

        // If same exercise as previous, add to existing group
        if (exerciseId === prevExerciseId && grouped.length > 0) {
          const lastGroup = grouped[grouped.length - 1];
          if (!lastGroup.set_lines) {
            lastGroup.set_lines = [{
              id: lastGroup.id,
              sets: lastGroup.sets,
              reps: lastGroup.reps,
              primary_value: lastGroup.primary_value,
              secondary_value: lastGroup.secondary_value,
              primary_metric: lastGroup.primary_metric,
              secondary_metric: lastGroup.secondary_metric,
              rir: lastGroup.rir,
              rpe: lastGroup.rpe,
              rest_seconds: lastGroup.rest_seconds,
              notes: lastGroup.notes
            }];
          }
          lastGroup.set_lines.push({
            id: ex.id,
            sets: ex.sets,
            reps: ex.reps,
            primary_value: ex.primary_value,
            secondary_value: ex.secondary_value,
            primary_metric: ex.primary_metric,
            secondary_metric: ex.secondary_metric,
            rir: ex.rir,
            rpe: ex.rpe,
            rest_seconds: ex.rest_seconds,
            notes: ex.notes
          });
        } else {
          // New exercise group
          grouped.push({...ex});
        }
      });

      return grouped;
    } catch (error) {
      console.error('Error loading workout details:', error);
      return [];
    }
  };

  const getDateRangeStart = () => {
    const date = new Date(selectedDate);
    if (calendarView === 'day') {
      date.setHours(0, 0, 0, 0);
      return date;
    } else if (calendarView === 'week') {
      const day = date.getDay();
      date.setDate(date.getDate() - day);
      date.setHours(0, 0, 0, 0);
      return date;
    } else {
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      return date;
    }
  };

  const getDateRangeEnd = () => {
    const date = new Date(selectedDate);
    if (calendarView === 'day') {
      date.setHours(23, 59, 59, 999);
      return date;
    } else if (calendarView === 'week') {
      const day = date.getDay();
      date.setDate(date.getDate() + (6 - day));
      date.setHours(23, 59, 59, 999);
      return date;
    } else {
      date.setMonth(date.getMonth() + 1);
      date.setDate(0);
      date.setHours(23, 59, 59, 999);
      return date;
    }
  };

  const getVisibleWorkouts = () => {
    const startDate = getDateRangeStart();
    const endDate = getDateRangeEnd();
    const startStr = formatDateLocal(startDate);
    const endStr = formatDateLocal(endDate);

    return workouts.filter(w => {
      return w.scheduled_date >= startStr && w.scheduled_date <= endStr;
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const date = new Date(selectedDate);
    if (calendarView === 'day') {
      date.setDate(date.getDate() + (direction === 'next' ? 1 : -1));
    } else if (calendarView === 'week') {
      date.setDate(date.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      date.setMonth(date.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setSelectedDate(date);
  };

  const getWorkoutsForDate = (date: Date) => {
    const dateStr = formatDateLocal(date);
    return workouts.filter(w => w.scheduled_date === dateStr);
  };

  const renderWeekView = () => {
    const weekDays = [];
    const startDate = getDateRangeStart();

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      weekDays.push(date);
    }

    return (
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex md:grid md:grid-cols-7 gap-2 md:gap-3 min-w-max md:min-w-0">
          {weekDays.map((date, idx) => {
            const dayWorkouts = getWorkoutsForDate(date);
            const isToday = date.toDateString() === new Date().toDateString();

            return (
              <div
                key={idx}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, date)}
                onClick={(e) => {
                  if (!(e.target as HTMLElement).closest('button') && !(e.target as HTMLElement).closest('[draggable="true"]')) {
                    setSelectedDate(date);
                    setShowMonthlyDayModal(true);
                  }
                }}
                className={`min-h-40 md:min-h-32 p-3 md:p-3 rounded-lg border-2 transition-colors w-[160px] md:w-auto flex-shrink-0 group/weekday cursor-pointer ${
                  isToday
                    ? 'border-[#fdda36] bg-[#fdda36]/5'
                    : draggedWorkout && draggedWorkout.scheduled_date !== formatDateLocal(date)
                    ? 'border-[#514163] bg-[#514163]/5 border-dashed'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}
              >
              <div className="text-center mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 text-center">
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className={`text-2xl font-bold ${
                      isToday ? 'text-[#514163]' : 'text-gray-900 dark:text-white'
                    }`}>
                      {date.getDate()}
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAddMenuForDate(showAddMenuForDate === formatDateLocal(date) ? null : formatDateLocal(date));
                      }}
                      className="opacity-0 md:group-hover/weekday:opacity-100 opacity-100 md:opacity-0 transition-opacity p-1 hover:bg-[#514163] hover:text-white rounded"
                      title={language === 'es' ? 'Agregar entrenamiento' : 'Add workout'}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    {showAddMenuForDate === formatDateLocal(date) && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowAddMenuForDate(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[220px]">
                          <button
                            onClick={() => {
                              setShowAddMenuForDate(null);
                              setSelectedDate(date);
                              sessionStorage.setItem('workout_scheduled_date', formatDateLocal(date));
                              window.dispatchEvent(new CustomEvent('navigate', { detail: 'workout-builder' }));
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-gray-700 dark:text-gray-300"
                          >
                            <Dumbbell className="w-4 h-4" />
                            {language === 'es' ? 'Planificar Entrenamiento Gym' : 'Plan Gym Workout'}
                          </button>
                          <button
                            onClick={() => {
                              setShowAddMenuForDate(null);
                              setSelectedDate(date);
                              setShowExtraTrainingModal(true);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-gray-700 dark:text-gray-300"
                          >
                            <Activity className="w-4 h-4" />
                            {language === 'es' ? 'Agregar Entrenamiento Extra' : 'Add Extra Training'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5 md:space-y-1">
                {(() => {
                  const dateStr = formatDateLocal(date);
                  const we = wellnessEntries.find(e => e.checkin_date === dateStr);
                  if (we) {
                    const sc = we.wellness_score_100 ?? (we.overall_score ? we.overall_score * 20 : 50);
                    const wc = sc >= 70 ? { light: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' } : sc >= 45 ? { light: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-400' } : { light: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300', dot: 'bg-rose-500' };
                    return (
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedWellnessEntry(we); }}
                        className={`w-full flex items-center justify-between px-2 py-1 rounded-lg ${wc.light} transition-opacity hover:opacity-80 text-xs mb-1`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Heart className={`w-3 h-3 ${wc.text}`} />
                          <span className={`font-semibold ${wc.text}`}>{Math.round(sc)}/100</span>
                        </div>
                      </button>
                    );
                  }
                  return null;
                })()}
                {dayWorkouts.map(workout => (
                  <div key={workout.id} className="relative group">
                    {workout.type === 'endurance_plan' ? (
                      <div
                        onClick={(e) => { e.stopPropagation(); openWorkoutModal(workout); }}
                        className={`w-full text-xs p-2 pl-3 rounded text-left relative ${getEnduranceColor(workout).bg} ${getEnduranceColor(workout).text} border-l-2 transition-colors cursor-pointer`}
                        style={{ borderLeftColor: getEnduranceColor(workout).border }}
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          <Activity className="w-3 h-3 flex-shrink-0 opacity-60" />
                          <span className="font-semibold truncate">{workout.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 opacity-70 flex-wrap">
                          {(workout as any).estimated_duration_minutes > 0 && (
                            <span>{(workout as any).estimated_duration_minutes >= 60
                              ? `${Math.floor((workout as any).estimated_duration_minutes / 60)}h${(workout as any).estimated_duration_minutes % 60 > 0 ? `${(workout as any).estimated_duration_minutes % 60}m` : ''}`
                              : `${(workout as any).estimated_duration_minutes}min`}</span>
                          )}
                          {(workout as any).target_zones?.length > 0 && (
                            <span>· {(workout as any).target_zones.join(' ')}</span>
                          )}
                        </div>
                        {workout.status === 'completed' && (
                          <CheckCircle2 className="absolute bottom-1 right-1 w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
                        )}
                      </div>
                    ) : (
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, workout)}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('.grip-handle')) return;
                        openWorkoutModal(workout);
                      }}
                      className={`w-full text-xs md:text-xs p-2.5 md:p-2 pl-7 md:pl-6 rounded text-left transition-all cursor-pointer relative ${
                        draggedWorkout?.id === workout.id
                          ? 'opacity-50 scale-95'
                          : workout.status === 'completed'
                          ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400'
                          : workout.status === 'skipped'
                          ? 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700/50 dark:text-neutral-400'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/30'
                      }`}
                    >
                      <div className="grip-handle absolute left-1.5 md:left-1 top-1/2 -translate-y-1/2 cursor-move">
                        <GripVertical className="w-3.5 h-3.5 md:w-3 md:h-3 opacity-40" />
                      </div>
                      <span className="line-clamp-2">{workout.name}</span>
                      {workout.status === 'completed' && (
                        <CheckCircle2 className="absolute bottom-1 right-1 w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
                      )}
                    </div>
                    )}
                    {workout.type !== 'race_plan' && workout.source !== 'race_plan' && (
                    <button
                      onClick={() => setContextMenuWorkout(contextMenuWorkout === workout.id ? null : workout.id)}
                      className="absolute top-1 right-1 p-1 opacity-0 group-hover:opacity-100 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded transition-opacity"
                    >
                      <MoreVertical className="w-3 h-3" />
                    </button>
                    )}
                    {contextMenuWorkout === workout.id && workout.type !== 'race_plan' && (
                      <div className="absolute right-0 top-8 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[160px]">
                        <button
                          onClick={() => handleEditWorkout(workout)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-gray-700 dark:text-gray-300"
                        >
                          <Edit className="w-3 h-3" />
                          {language === 'es' ? 'Editar' : 'Edit'}
                        </button>
                        <button
                          onClick={() => handleCopyWorkout(workout)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-gray-700 dark:text-gray-300"
                        >
                          <Copy className="w-3 h-3" />
                          {language === 'es' ? 'Copiar' : 'Copy'}
                        </button>
                        <button
                          onClick={() => handleDuplicateWorkout(workout)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-gray-700 dark:text-gray-300"
                        >
                          <Copy className="w-3 h-3" />
                          {language === 'es' ? 'Duplicar...' : 'Duplicate...'}
                        </button>
                        <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                        <button
                          onClick={() => handleDeleteWorkout(workout)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 text-left text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                          {language === 'es' ? 'Eliminar' : 'Delete'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {copiedWorkout && (
                  <button
                    onClick={() => handlePasteWorkout(formatDateLocal(date))}
                    className="w-full text-xs p-2 rounded text-left transition-colors bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/30 flex items-center gap-1"
                  >
                    <Clipboard className="w-3 h-3" />
                    {language === 'es' ? 'Pegar' : 'Paste'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>
    );
  };

  const openWorkoutModal = async (workout: Workout) => {
    // Race plan items — load full plan and open GPS recorder with fuel alerts
    if ((workout as any).type === 'race_plan') {
      const planId = (workout as any).race_plan_id;
      if (!planId) return;
      const { data: fullPlan } = await supabase
        .from('race_plans')
        .select('*')
        .eq('id', planId)
        .maybeSingle();
      if (!fullPlan) return;
      setSelectedRacePlan(fullPlan);
      return;
    }

    // If it's an external activity, check if it's a GPS activity first
    if (workout.type === 'external') {
      const raw = (workout as any).raw_data;
      if ((workout as any).source === 'asciende_gps' || raw?.source === 'asciende_gps') {
        setSelectedGPSActivity({ id: (workout as any).external_activity_id ?? null, data: workout });
        return;
      }
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'external-activities' }));
      return;
    }

    // Endurance plan items — show the detail card modal
    if ((workout as any).type === 'endurance_plan') {
      const raw = (workout as any).endurance_workout_data;
      const w = workout as any;
      // DEBUG: log all available data to console
      console.log('[EndurancePlan] raw object:', raw);
      console.log('[EndurancePlan] w.description:', w.description);
      console.log('[EndurancePlan] raw?.description:', raw?.description);
      // Normalize: raw plan-day objects have description+steps in one text blob; db rows have steps as a jsonb array
      // Use raw?.description (full original text) first; w.description is already pre-cleaned so use as fallback
      const rawDescription: string = raw?.description || '';
      const steps: any[] = raw?.steps || w.parsed_steps || (rawDescription ? parseStepsFromDescription(rawDescription) : []);

      // Build display description:
      // If raw has full description text, parse out the meaningful paragraphs (skip Steps/metadata blocks and the name line)
      // If raw has no description, use w.description (already cleaned during calendar load)
      let cleanedDescription: string | undefined;
      if (rawDescription) {
        const paragraphs = rawDescription.split('\n\n');
        // Heuristic: if first paragraph is a single short line that matches the workout name, skip it
        const workoutName: string = (raw?.name || w.name || '').toLowerCase().trim();
        const filtered = paragraphs.filter((p, idx) => {
          const t = p.trim();
          if (!t) return false;
          if (t.startsWith('Steps:')) return false;
          if (t.startsWith('Planned impulse:')) return false;
          if (t.startsWith('Intensity basis:')) return false;
          // Skip first paragraph if it's just the name
          if (idx === 0 && workoutName && t.toLowerCase() === workoutName) return false;
          return true;
        });
        cleanedDescription = filtered.join('\n\n').trim() || undefined;
      } else {
        cleanedDescription = w.description || undefined;
      }

      const intensityBasis: string = raw?.intensity_basis || w.intensity_basis || 'zone';
      const formatZone = (z: any): string => {
        if (typeof z === 'string') return z; // already formatted
        if (intensityBasis === 'rpe') return `RPE ${z}`;
        return `Z${z}`;
      };
      const rawZones = raw?.target_zones || w.target_zones;
      const formattedZones = Array.isArray(rawZones) ? rawZones.map(formatZone) : undefined;

      if (raw) {
        setSelectedEnduranceWorkout({
          id: raw.id || w.id,
          name: raw.name || w.name,
          sport: raw.sport || w.sport || 'cycling',
          sub_discipline: raw.sub_discipline || w.sub_discipline,
          description: cleanedDescription,
          intensity_basis: intensityBasis,
          scheduled_date: raw.scheduled_date || w.scheduled_date,
          estimated_duration_minutes: raw.estimated_duration_minutes || raw.planned_duration_minutes || raw.duration_min || w.estimated_duration_minutes || 0,
          estimated_impulse: raw.estimated_impulse || raw.planned_tss || raw.tss || w.estimated_impulse,
          status: raw.status || w.status || 'planned',
          steps,
          planner_source: raw.planner_source || w.planner_source || '',
          session_type: raw.session_type || w.session_type,
          target_zones: formattedZones,
          rpe: raw.rpe || w.rpe,
          notes: raw.notes || w.notes,
        } as EnduranceWorkout);
      } else {
        setSelectedEnduranceWorkout({
          id: w.id,
          name: w.name,
          sport: w.sport || 'cycling',
          sub_discipline: w.sub_discipline,
          description: cleanedDescription,
          intensity_basis: intensityBasis,
          scheduled_date: w.scheduled_date,
          estimated_duration_minutes: w.estimated_duration_minutes || 0,
          estimated_impulse: w.estimated_impulse,
          status: w.status || 'planned',
          steps,
          planner_source: w.planner_source || '',
          session_type: w.session_type,
          target_zones: formattedZones,
          rpe: w.rpe,
          notes: w.notes,
        } as EnduranceWorkout);
      }
      return;
    }

    // For workout type, show the daily workout view in a modal
    // Set the selected date to the workout's scheduled date
    setSelectedDate(parseDateStr(workout.scheduled_date));
    setShowMonthlyDayModal(true);
  };

  const groupExercisesBySupersets = (exercises: WorkoutExercise[]) => {
    const groups: { [key: string]: WorkoutExercise[] } = {};

    exercises.forEach(ex => {
      const key = ex.superset_group || `single_${ex.id}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(ex);
    });

    return Object.values(groups);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400';
      case 'pending':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'skipped':
        return 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700/50 dark:text-neutral-400';
      default:
        return 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700/50 dark:text-neutral-400';
    }
  };

  const handleWorkoutMove = async (workoutId: string, newDate: string) => {
    try {
      const { error } = await supabase
        .from('athlete_workouts')
        .update({ scheduled_date: newDate })
        .eq('id', workoutId);

      if (!error) {
        await loadWorkouts();
      }
    } catch (error) {
      console.error('Error moving workout:', error);
    }
  };

  const calculateTotalVolume = async () => {
    if (!profile?.id) return;

    const startDate = getDateRangeStart();
    const endDate = getDateRangeEnd();

    const { data: logs } = await supabase
      .from('training_logs')
      .select('weight_used, reps_completed')
      .eq('athlete_id', effectiveAthleteId)
      .gte('logged_at', startDate.toISOString())
      .lte('logged_at', endDate.toISOString());

    if (logs) {
      const volume = logs.reduce((total, log) => {
        return total + ((log.weight_used || 0) * (log.reps_completed || 0));
      }, 0);
      setTotalVolume(volume);
    }
  };

  const handleCopyWorkout = async (workout: Workout) => {
    const exercises = await loadWorkoutDetails(workout.workout_id);
    setCopiedWorkout({
      ...workout,
      exercises: exercises.map((ex: any) => ({
        id: ex.id,
        exercise: ex.exercises,
        sets: ex.sets,
        reps: ex.reps,
        rest_seconds: ex.rest_seconds,
        notes: ex.notes,
        superset_group: ex.superset_group,
        order_index: ex.order_index
      }))
    });
    setContextMenuWorkout(null);
    success(language === 'es' ? 'Entrenamiento copiado' : 'Workout copied');
  };

  const deepCopyWorkoutToDate = async (sourceWorkoutId: string, targetDate: string, athleteId: string, trainerId?: string): Promise<void> => {
    const { data: originalWorkout, error: wErr } = await supabase
      .from('workouts')
      .select('name, description, duration_minutes, difficulty, trainer_id')
      .eq('id', sourceWorkoutId)
      .maybeSingle();
    if (wErr) throw wErr;

    const { data: newWorkout, error: nwErr } = await supabase
      .from('workouts')
      .insert({
        trainer_id: trainerId ?? originalWorkout?.trainer_id ?? null,
        name: originalWorkout?.name || '',
        description: originalWorkout?.description ?? null,
        duration_minutes: originalWorkout?.duration_minutes ?? null,
        difficulty: originalWorkout?.difficulty ?? null,
      })
      .select('id')
      .single();
    if (nwErr) throw nwErr;

    const { data: originalExercises, error: exErr } = await supabase
      .from('workout_exercises')
      .select('exercise_id, custom_exercise_name, custom_exercise_video_url, sets, reps, rest_seconds, notes, superset_group, order_index, primary_metric, secondary_metric, set_lines, section_title, use_1rm_auto_load, target_1rm_percentage, reference_1rm_method, calculated_load, rir, rpe, primary_value, secondary_value')
      .eq('workout_id', sourceWorkoutId)
      .order('order_index');
    if (exErr) throw exErr;

    if (originalExercises && originalExercises.length > 0) {
      const { error: insertExErr } = await supabase
        .from('workout_exercises')
        .insert(originalExercises.map(ex => ({ ...ex, workout_id: newWorkout.id })));
      if (insertExErr) throw insertExErr;
    }

    const { error: awErr } = await supabase
      .from('athlete_workouts')
      .insert({
        athlete_id: athleteId,
        workout_id: newWorkout.id,
        scheduled_date: targetDate,
        status: 'pending',
        ...(trainerId && { trainer_id: trainerId }),
      });
    if (awErr) throw awErr;
  };

  const handlePasteWorkout = async (targetDate: string) => {
    if (!copiedWorkout || !effectiveAthleteId) return;

    try {
      const isTrainer = profile?.role === 'trainer' && selectedAthleteId;
      await deepCopyWorkoutToDate(
        copiedWorkout.workout_id,
        targetDate,
        effectiveAthleteId,
        isTrainer ? profile.id : undefined
      );
      success(language === 'es' ? 'Entrenamiento pegado exitosamente' : 'Workout pasted successfully');
      setCopiedWorkout(null);
      await loadWorkouts();
    } catch (err) {
      console.error('Error pasting workout:', err);
      error(language === 'es' ? 'Error al pegar el entrenamiento' : 'Error pasting workout');
    }
  };

  const handleDuplicateWorkout = (workout: Workout) => {
    setWorkoutToDuplicate(workout);
    setShowDuplicateModal(true);
    setContextMenuWorkout(null);
  };

  const executeDuplicate = async (targetDate: string) => {
    if (!workoutToDuplicate || !effectiveAthleteId) return;

    try {
      const isTrainer = profile?.role === 'trainer' && selectedAthleteId;
      await deepCopyWorkoutToDate(
        workoutToDuplicate.workout_id,
        targetDate,
        effectiveAthleteId,
        isTrainer ? profile.id : undefined
      );
      success(language === 'es' ? 'Entrenamiento duplicado exitosamente' : 'Workout duplicated successfully');
      await loadWorkouts();
      setShowDuplicateModal(false);
      setWorkoutToDuplicate(null);
    } catch (err) {
      console.error('Error duplicating workout:', err);
      throw err;
    }
  };

  const handleEditWorkout = async (workout: Workout) => {
    setContextMenuWorkout(null);

    if (workout.status === 'completed' || workout.status === 'in_progress') {
      setCalendarView('day');
      setSelectedDate(parseDateStr(workout.scheduled_date));
    } else {
      sessionStorage.setItem('edit_workout_id', workout.id);
      sessionStorage.setItem('edit_scheduled_date', workout.scheduled_date);
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'workout-builder' }));
    }
  };

  const handleDeleteWorkout = async (workout: Workout) => {
    setContextMenuWorkout(null);

    try {
      const { error: deleteError } = await supabase
        .from('athlete_workouts')
        .delete()
        .eq('id', workout.id);

      if (deleteError) throw deleteError;

      success(language === 'es' ? 'Entrenamiento eliminado' : 'Workout deleted');
      await loadWorkouts();
      await calculateTotalVolume();
    } catch (err) {
      console.error('Error deleting workout:', err);
      error(language === 'es' ? 'Error al eliminar' : 'Error deleting workout');
    }
  };

  const [draggedWorkout, setDraggedWorkout] = useState<Workout | null>(null);

  const handleDragStart = (e: React.DragEvent, workout: Workout) => {
    setDraggedWorkout(workout);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', workout.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (draggedWorkout) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    if (!draggedWorkout) return;

    const targetDateStr = formatDateLocal(targetDate);
    const currentDateStr = draggedWorkout.scheduled_date;

    if (targetDateStr !== currentDateStr) {
      await handleWorkoutMove(draggedWorkout.id, targetDateStr);
    }

    setDraggedWorkout(null);
  };

  const handleDragEnd = () => {
    setDraggedWorkout(null);
  };

  if (profile?.role === 'trainer' && !selectedAthleteId) {
    return (
      <>
        {toast && (
          <Toast message={toast.message} type={toast.type} duration={toast.duration} onClose={hideToast} />
        )}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Dumbbell className="w-8 h-8 text-[#fdda36]" />
              {t('menu.training')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
              {language === 'es'
                ? 'Selecciona un atleta para gestionar su planificación'
                : 'Select an athlete to manage their training plan'}
            </p>
          </div>
          <TrainerAthleteSelector
            onAthleteSelected={(_id, _name) => {
              loadWorkouts();
            }}
          />
        </div>
      </>
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
      {profile?.role === 'trainer' && selectedAthleteId && selectedAthleteName && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <button
            onClick={() => { clearSelectedAthlete(); }}
            className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
          >
            <Users className="w-4 h-4" />
            {language === 'es' ? 'Volver a lista' : 'Back to list'}
          </button>
          <div className="w-px h-4 bg-blue-200 dark:bg-blue-700" />
          <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
          <p className="text-sm text-blue-700 dark:text-blue-300 flex-1">
            {language === 'es' ? `Viendo calendario de` : `Viewing calendar of`}
            <span className="font-semibold ml-1">{selectedAthleteName}</span>
          </p>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'programs-marketplace' }))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 dark:bg-blue-700 text-white text-xs font-medium hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            {language === 'es' ? 'Cargar Programa' : 'Load Program'}
          </button>
          <button
            onClick={() => setShowCoachWellness(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
          >
            <Heart className="w-3.5 h-3.5" />
            {language === 'es' ? 'Panel Bienestar' : 'Wellness Panel'}
          </button>
        </div>
      )}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('menu.training')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Track your workouts and progress
        </p>
      </div>

      {/* QUICK ACTIONS — Wellness · Assessment · Plan con IA · Coaching */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

        {/* 1. Wellness */}
        <button
          onClick={() => setShowWellnessCheckin(true)}
          className={`group relative overflow-hidden rounded-xl shadow-lg border-2 transition-all p-6 text-left ${
            wellnessChecked
              ? todayWellnessScore !== null && todayWellnessScore >= 70
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 dark:border-emerald-600'
                : todayWellnessScore !== null && todayWellnessScore >= 45
                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-400 dark:border-amber-600'
                : todayWellnessScore !== null
                ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-400 dark:border-rose-600'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              : 'bg-white dark:bg-gray-800 border-dashed border-gray-300 dark:border-gray-600 hover:border-emerald-400 dark:hover:border-emerald-500'
          }`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-transparent dark:from-emerald-400/10 rounded-bl-full" />
          <div className="relative">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${
              wellnessChecked && todayWellnessScore !== null
                ? todayWellnessScore >= 70
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                  : todayWellnessScore >= 45
                  ? 'bg-gradient-to-br from-amber-400 to-amber-500'
                  : 'bg-gradient-to-br from-rose-500 to-rose-600'
                : 'bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-900/40 dark:to-teal-800/30'
            }`}>
              <Heart className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1">
              {language === 'es' ? 'Bienestar' : 'Wellness'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {wellnessChecked && todayWellnessScore !== null
                ? `${todayWellnessScore.toFixed(0)}/100 — ${
                    todayWellnessScore >= 70
                      ? language === 'es' ? 'Listo para entrenar' : 'Ready to train'
                      : todayWellnessScore >= 45
                      ? language === 'es' ? 'Moderado' : 'Moderate'
                      : language === 'es' ? 'Recuperación recomendada' : 'Recovery recommended'
                  }`
                : language === 'es' ? 'Check-in diario de recuperación' : 'Daily recovery check-in'}
            </p>
          </div>
        </button>

        {/* 2. Assessment */}
        <div className="relative flex flex-col">
          <button
            onClick={() => setShowAssessmentMenu(!showAssessmentMenu)}
            className={`flex-1 w-full group relative overflow-hidden rounded-xl shadow-lg border-2 transition-all p-6 text-left ${
              showAssessmentMenu
                ? 'bg-cyan-600 border-cyan-600'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-cyan-500 dark:hover:border-cyan-500'
            }`}
          >
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br rounded-bl-full ${
              showAssessmentMenu ? 'from-white/10 to-transparent' : 'from-cyan-500/10 to-transparent dark:from-cyan-400/10'
            }`} />
            <div className="relative">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${
                showAssessmentMenu
                  ? 'bg-white/20'
                  : 'bg-gradient-to-br from-cyan-500 to-cyan-600 dark:from-cyan-900/40 dark:to-cyan-800/30'
              }`}>
                <Zap className={`w-6 h-6 ${showAssessmentMenu ? 'text-white' : 'text-white dark:text-cyan-400'}`} />
              </div>
              <h3 className={`font-bold text-lg mb-1 ${showAssessmentMenu ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                {language === 'es' ? 'Assessment' : 'Assessment'}
              </h3>
              <p className={`text-sm ${showAssessmentMenu ? 'text-white/70' : 'text-gray-600 dark:text-gray-400'}`}>
                {language === 'es' ? 'Mide tu rendimiento' : 'Measure performance'}
              </p>
            </div>
          </button>

          {showAssessmentMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowAssessmentMenu(false)} />
              <div className="absolute left-0 right-0 top-full mt-2 z-20">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-4">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-1">
                    {language === 'es' ? 'Selecciona una evaluación' : 'Choose an assessment'}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        setShowAssessmentMenu(false);
                        if (canAccessAssessments) {
                          setShowCMJAssessment(true);
                        } else {
                          setShowAssessmentUpgradeModal(true);
                        }
                      }}
                      className="group relative flex flex-col items-center gap-2 p-4 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 hover:bg-cyan-500 transition-all border border-cyan-200 dark:border-cyan-800 hover:border-cyan-500"
                    >
                      {!canAccessAssessments && (
                        <div className="absolute top-2 right-2 bg-[#fdda36] text-[#514163] text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-tight uppercase tracking-wide">
                          PRO
                        </div>
                      )}
                      <div className="w-10 h-10 rounded-lg bg-cyan-500 group-hover:bg-white/20 flex items-center justify-center transition-colors">
                        <Zap className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-center">
                        <span className="block text-xs font-semibold text-cyan-600 dark:text-cyan-300 group-hover:text-white leading-tight">Jump Assessment</span>
                        <span className="block text-xs text-cyan-500/70 dark:text-cyan-400/60 group-hover:text-white/70 leading-tight mt-0.5">CMJ · altura · potencia</span>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setShowAssessmentMenu(false);
                        if (canAccessAssessments) {
                          setShowBarVelocity(true);
                        } else {
                          setShowAssessmentUpgradeModal(true);
                        }
                      }}
                      className="group relative flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-600 transition-all border border-blue-200 dark:border-blue-800 hover:border-blue-600"
                    >
                      {!canAccessAssessments && (
                        <div className="absolute top-2 right-2 bg-[#fdda36] text-[#514163] text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-tight uppercase tracking-wide">
                          PRO
                        </div>
                      )}
                      <div className="w-10 h-10 rounded-lg bg-blue-600 group-hover:bg-white/20 flex items-center justify-center transition-colors">
                        <BarChart2 className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-center">
                        <span className="block text-xs font-semibold text-blue-600 dark:text-blue-300 group-hover:text-white leading-tight">Bar Velocity</span>
                        <span className="block text-xs text-blue-500/70 dark:text-blue-400/60 group-hover:text-white/70 leading-tight mt-0.5">VBT · velocidad · zonas</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 3. Plan con IA — visible para todos, paywall para Inicia */}
        <button
          onClick={() => canAccessAIWorkouts ? setShowAIGenerator(true) : setShowAIUpgradeModal(true)}
          className="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-[#514163]/30 dark:border-[#514163]/50 hover:border-[#514163] dark:hover:border-[#514163] hover:shadow-xl hover:scale-[1.02] transition-all p-6 text-left"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#514163]/10 to-transparent dark:from-[#514163]/20 rounded-bl-full" />
          {!canAccessAIWorkouts && (
            <div className="absolute top-3 right-3 bg-[#fdda36] text-[#514163] text-[10px] font-bold px-2 py-0.5 rounded-full leading-tight uppercase tracking-wide">
              {language === 'es' ? 'Upgrade' : 'Upgrade'}
            </div>
          )}
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-[#514163] to-[#3a2f4a] rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md">
              <Sparkles className="w-6 h-6 text-[#fdda36]" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1">
              {language === 'es' ? 'Planificar con IA' : 'Plan with AI'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {language === 'es' ? 'Personalizado para ti' : 'Personalized for you'}
            </p>
          </div>
        </button>

        {/* 4. Coaching 1:1 */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'services' }))}
          className="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-[#ffd700] dark:border-[#ffd700] hover:border-[#ffed4e] dark:hover:border-[#ffed4e] hover:shadow-xl hover:scale-[1.02] transition-all p-6 text-left"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#fdda36]/20 to-transparent dark:from-[#fdda36]/30 rounded-bl-full" />
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-[#fdda36] to-[#ffd700] dark:from-[#fdda36]/40 dark:to-[#ffd700]/30 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Activity className="w-6 h-6 text-[#514163] dark:text-white" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1">
              {language === 'es' ? 'Coaching 1:1' : 'Coaching 1:1'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              {language === 'es' ? 'Planes individualizados' : 'Individualized plans'}
            </p>
          </div>
        </button>
      </div>


      {/* AI Upgrade Modal — inline, no dependency extra */}
      {showAIUpgradeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="relative bg-gradient-to-br from-[#514163] to-[#3a2f4a] p-6 pb-8">
              <button
                onClick={() => setShowAIUpgradeModal(false)}
                className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-14 h-14 bg-[#fdda36]/20 rounded-2xl flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-[#fdda36]" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">
                {language === 'es' ? 'Planificar con IA' : 'Plan with AI'}
              </h2>
              <p className="text-white/70 text-sm">
                {language === 'es'
                  ? 'Necesitás al menos el plan Intermedio para acceder a esta función completa.'
                  : 'You need at least the Intermediate plan to access the full feature.'}
              </p>
            </div>

            {/* Free tier info */}
            <div className="px-6 py-5">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 mb-5">
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-3">
                  {language === 'es' ? 'Disponible en plan Inicia' : 'Available on Inicia plan'}
                </p>
                <ul className="space-y-2">
                  {[
                    language === 'es' ? '1 programa generado por IA al mes' : '1 AI-generated program per month',
                    language === 'es' ? 'Duración de 7 días' : '7-day duration',
                    language === 'es' ? 'Editable manualmente después' : 'Manually editable afterwards',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-emerald-800 dark:text-emerald-300">
                      <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-xs text-center text-gray-500 dark:text-gray-400 mb-4">
                {language === 'es'
                  ? 'Con Intermedio o Pro: planes ilimitados, mayor duración y ajuste por rendimiento real.'
                  : 'With Intermediate or Pro: unlimited plans, longer durations, and real performance adjustments.'}
              </p>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setShowAIUpgradeModal(false);
                    setShowAIGenerator(true);
                  }}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-colors text-sm"
                >
                  {language === 'es' ? 'Usar versión gratuita (7 días)' : 'Use free version (7 days)'}
                </button>
                <button
                  onClick={() => {
                    setShowAIUpgradeModal(false);
                    window.dispatchEvent(new CustomEvent('navigate', { detail: 'memberships-marketplace' }));
                  }}
                  className="w-full py-3 rounded-xl bg-[#514163] hover:bg-[#3a2f4a] text-white font-semibold transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-[#fdda36]" />
                  {language === 'es' ? 'Ver plan Intermedio' : 'See Intermediate plan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assessment Upgrade Modal */}
      {showAssessmentUpgradeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="relative bg-gradient-to-br from-cyan-600 to-blue-700 p-6 pb-8">
              <button
                onClick={() => setShowAssessmentUpgradeModal(false)}
                className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center mb-4">
                <Activity className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">
                {language === 'es' ? 'Evaluaciones de Rendimiento' : 'Performance Assessments'}
              </h2>
              <p className="text-white/70 text-sm">
                {language === 'es'
                  ? 'Necesitás el plan Intermedio o superior para acceder a las evaluaciones CMJ y Bar Velocity.'
                  : 'You need Intermediate plan or higher to access CMJ and Bar Velocity assessments.'}
              </p>
            </div>

            <div className="px-6 py-5">
              <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-xl p-4 mb-5">
                <p className="text-xs font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wide mb-3">
                  {language === 'es' ? 'Incluido en Intermediate y Pro' : 'Included in Intermediate & Pro'}
                </p>
                <ul className="space-y-2">
                  {[
                    language === 'es' ? 'Jump Assessment (CMJ) — altura y potencia' : 'Jump Assessment (CMJ) — height & power',
                    language === 'es' ? 'Bar Velocity (VBT) — perfiles de velocidad' : 'Bar Velocity (VBT) — velocity profiles',
                    language === 'es' ? 'Historial completo de evaluaciones' : 'Full assessment history',
                    language === 'es' ? 'Prescripción de carga por velocidad' : 'Velocity-based load prescription',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-cyan-800 dark:text-cyan-300">
                      <div className="w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => {
                  setShowAssessmentUpgradeModal(false);
                  window.dispatchEvent(new CustomEvent('navigate', { detail: 'memberships-marketplace' }));
                }}
                className="w-full py-3 rounded-xl bg-[#514163] hover:bg-[#3a2f4a] text-white font-semibold transition-colors text-sm flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-[#fdda36]" />
                {language === 'es' ? 'Ver planes disponibles' : 'See available plans'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'atp' }))}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors bg-[#514163] text-white hover:bg-[#3a2f4a]"
          >
            <Calendar className="w-4 h-4" />
            {language === 'es' ? 'Plan Anual' : 'Annual Plan'}
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'calendar'
                ? 'bg-[#fdda36] text-[#514163]'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <Calendar className="w-4 h-4" />
            {language === 'es' ? 'Calendario' : 'Calendar'}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-[#fdda36] text-[#514163]'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <History className="w-4 h-4" />
            History
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'external-activities' }))}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'strava'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            title={language === 'es' ? 'Sincronizar Strava' : 'Sync Strava'}
          >
            <RotateCw className="w-4 h-4" />
            Strava
          </button>
        </div>
      </div>

      {activeTab === 'calendar' && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCalendarView('day')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              calendarView === 'day'
                ? 'bg-[#fdda36] text-[#514163]'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setCalendarView('week')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              calendarView === 'week'
                ? 'bg-[#fdda36] text-[#514163]'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setCalendarView('month')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              calendarView === 'month'
                ? 'bg-[#fdda36] text-[#514163]'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Month
          </button>
        </div>
      )}

      {activeTab === 'calendar' && (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {getVisibleWorkouts().length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {getVisibleWorkouts().filter(w => w.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {getVisibleWorkouts().filter(w => w.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <Weight className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Volume</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {totalVolume.toFixed(0)} kg
              </p>
            </div>
          </div>
        </div>
      </div>
      )}

      {activeTab === 'calendar' ? (
        <>
          {calendarView === 'month' ? (
            <>
              <TrainingCalendar
                workouts={workouts}
                selectedDate={selectedDate}
                onDaySelect={(date) => {
                  const isSameDay = selectedDate.toDateString() === date.toDateString();
                  if (isSameDay) {
                    setShowMonthlyDayModal(true);
                  } else {
                    setSelectedDate(date);
                  }
                }}
                onWorkoutMove={handleWorkoutMove}
                onWorkoutClick={openWorkoutModal}
                onWorkoutEdit={handleEditWorkout}
                onWorkoutDuplicate={handleDuplicateWorkout}
                onWorkoutDelete={(workoutId) => {
                  const workout = workouts.find(w => w.id === workoutId);
                  if (workout) {
                    handleDeleteWorkout(workout);
                  }
                }}
                onAddWorkout={(date) => {
                  setSelectedDate(date);
                  const formatDateLocal = (d: Date): string => {
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                  };
                  sessionStorage.setItem('workout_scheduled_date', formatDateLocal(date));
                  window.dispatchEvent(new CustomEvent('navigate', { detail: 'workout-builder' }));
                }}
                onAddExtraTraining={(date) => {
                  setSelectedDate(date);
                  setShowExtraTrainingModal(true);
                }}
                wellnessEntries={wellnessEntries}
                onWellnessClick={(entry) => setSelectedWellnessEntry(entry)}
              />
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedDate.toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                      ...(calendarView === 'day' && { day: 'numeric', weekday: 'long' })
                    })}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigateDate('prev')}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <button
                      onClick={() => setSelectedDate(new Date())}
                      className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      Today
                    </button>
                    <button
                      onClick={() => navigateDate('next')}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {loading ? (
                  <div className="py-12 text-center">
                    <div className="w-12 h-12 border-4 border-[#fdda36] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Loading workouts...</p>
                  </div>
                ) : calendarView === 'week' ? (
                  renderWeekView()
                ) : (
                  <DailyWorkoutView
                    selectedDate={selectedDate}
                    athleteId={effectiveAthleteId}
                    onWorkoutUpdate={loadWorkouts}
                    onOpenExtraTraining={() => setShowExtraTrainingModal(true)}
                  />
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <WorkoutHistory />
      )}

      {selectedGPSActivity && (
        <GPSActivityDetailModal
          activityId={selectedGPSActivity.id}
          activityData={selectedGPSActivity.data}
          onClose={() => setSelectedGPSActivity(null)}
        />
      )}

      {showWorkoutModal && selectedWorkout && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedWorkout.name}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {selectedWorkout.description}
                  </p>
                  <span className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedWorkout.status)}`}>
                    {selectedWorkout.status}
                  </span>
                </div>
                <button
                  onClick={() => setShowWorkoutModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {selectedWorkout.workout_id && (
                <div className="pb-2 border-b border-gray-200 dark:border-gray-700">
                  <WorkoutTagsSection
                    workoutId={selectedWorkout.workout_id}
                    language={language}
                    currentUserId={profile?.id}
                    isTrainerOrAdmin={profile?.role === 'trainer' || profile?.role === 'admin'}
                    canCreate={profile?.role === 'trainer' || profile?.role === 'admin'}
                  />
                </div>
              )}
              {selectedWorkout.exercises.length > 0 ? (
                groupExercisesBySupersets(selectedWorkout.exercises).map((group, groupIdx) => (
                  <div
                    key={groupIdx}
                    className={`p-4 rounded-lg ${
                      group.length > 1
                        ? 'bg-orange-50 dark:bg-orange-900/10 border-2 border-orange-200 dark:border-orange-800'
                        : 'bg-gray-50 dark:bg-gray-700/50'
                    }`}
                  >
                    {group.length > 1 && (
                      <div className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-2">
                        SUPERSET
                      </div>
                    )}
                    {group.map((ex) => (
                      <div key={ex.id} className="mb-3 last:mb-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                          {getExerciseName(ex.exercises, language)}
                        </h3>

                        {ex.actual_performance && ex.actual_performance.length > 0 ? (
                          <div className="space-y-2">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                              Planificado: {ex.sets} sets × {ex.reps} reps
                              {ex.rest_seconds && ` • ${ex.rest_seconds}s rest`}
                            </div>
                            <div className="space-y-1.5">
                              {ex.actual_performance.map((set) => (
                                <div
                                  key={set.set_number}
                                  className="flex items-center justify-between text-sm bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-600"
                                >
                                  <span className="font-medium text-gray-700 dark:text-gray-300">
                                    Set {set.set_number}
                                  </span>
                                  <div className="flex items-center gap-3">
                                    <span className="font-bold text-[#514163] dark:text-[#fdda36]">
                                      {set.weight_used} kg × {set.reps_completed} reps
                                    </span>
                                    {set.rir !== undefined && set.rir !== null && (
                                      <span className="text-xs text-gray-600 dark:text-gray-400">
                                        RIR: {set.rir}
                                      </span>
                                    )}
                                    {set.bar_speed && (
                                      <span className="text-xs text-gray-600 dark:text-gray-400">
                                        {set.bar_speed.toFixed(2)} m/s
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {ex.set_lines ? (
                              // Multiple lines - show each separately
                              ex.set_lines.map((line, lineIdx) => (
                                <div key={lineIdx} className="space-y-1">
                                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <span className="font-semibold">{line.sets} sets</span>
                                    <span>×</span>
                                    <span className="font-semibold">
                                      {line.primary_value || line.reps}
                                      {line.primary_metric && ` ${
                                        line.primary_metric === 'reps' ? 'reps' :
                                        line.primary_metric === 'kg' ? 'kg' :
                                        line.primary_metric === 'lb' ? 'lb' :
                                        line.primary_metric === 'percent' ? '%' :
                                        line.primary_metric === 'time' ? 's' :
                                        line.primary_metric === 'distance' ? 'm' :
                                        line.primary_metric === 'calories' ? 'kcal' :
                                        'reps'
                                      }`}
                                    </span>
                                    {line.secondary_metric && line.secondary_value && (
                                      <>
                                        <span className="text-gray-400">@</span>
                                        <span className="font-semibold">
                                          {line.secondary_value}
                                          {` ${
                                            line.secondary_metric === 'reps' ? 'reps' :
                                            line.secondary_metric === 'kg' ? 'kg' :
                                            line.secondary_metric === 'lb' ? 'lb' :
                                            line.secondary_metric === 'percent' ? '%' :
                                            line.secondary_metric === 'time' ? 's' :
                                            line.secondary_metric === 'distance' ? 'm' :
                                            line.secondary_metric === 'calories' ? 'kcal' :
                                            'reps'
                                          }`}
                                        </span>
                                      </>
                                    )}
                                    {line.rest_seconds && (
                                      <>
                                        <span>•</span>
                                        <span>{line.rest_seconds}s rest</span>
                                      </>
                                    )}
                                  </div>
                                  {(line.rir !== null && line.rir !== undefined) || (line.rpe !== null && line.rpe !== undefined) ? (
                                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                      {line.rir !== null && line.rir !== undefined && (
                                        <span>RIR {line.rir}</span>
                                      )}
                                      {line.rpe !== null && line.rpe !== undefined && (
                                        <span>RPE {line.rpe}</span>
                                      )}
                                    </div>
                                  ) : null}
                                  {line.notes && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">{line.notes}</p>
                                  )}
                                </div>
                              ))
                            ) : (
                              // Single line - show normally
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                  <span className="font-semibold">{ex.sets} sets</span>
                                  <span>×</span>
                                  <span className="font-semibold">
                                    {ex.primary_value || ex.reps}
                                    {ex.primary_metric && ` ${
                                      ex.primary_metric === 'reps' ? 'reps' :
                                      ex.primary_metric === 'kg' ? 'kg' :
                                      ex.primary_metric === 'lb' ? 'lb' :
                                      ex.primary_metric === 'percent' ? '%' :
                                      ex.primary_metric === 'time' ? 's' :
                                      ex.primary_metric === 'distance' ? 'm' :
                                      ex.primary_metric === 'calories' ? 'kcal' :
                                      'reps'
                                    }`}
                                  </span>
                                  {ex.secondary_metric && ex.secondary_value && (
                                    <>
                                      <span className="text-gray-400">@</span>
                                      <span className="font-semibold">
                                        {ex.secondary_value}
                                        {` ${
                                          ex.secondary_metric === 'reps' ? 'reps' :
                                          ex.secondary_metric === 'kg' ? 'kg' :
                                          ex.secondary_metric === 'lb' ? 'lb' :
                                          ex.secondary_metric === 'percent' ? '%' :
                                          ex.secondary_metric === 'time' ? 's' :
                                          ex.secondary_metric === 'distance' ? 'm' :
                                          ex.secondary_metric === 'calories' ? 'kcal' :
                                          'reps'
                                        }`}
                                      </span>
                                    </>
                                  )}
                                  {ex.rest_seconds && (
                                    <>
                                      <span>•</span>
                                      <span>{ex.rest_seconds}s rest</span>
                                    </>
                                  )}
                                </div>
                                {(ex.rir !== null && ex.rir !== undefined) || (ex.rpe !== null && ex.rpe !== undefined) ? (
                                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                    {ex.rir !== null && ex.rir !== undefined && (
                                      <span>RIR {ex.rir}</span>
                                    )}
                                    {ex.rpe !== null && ex.rpe !== undefined && (
                                      <span>RPE {ex.rpe}</span>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </div>
                        )}

                        {ex.notes && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-2">
                            {ex.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-600 dark:text-gray-400 py-8">
                  No exercises in this workout
                </p>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-6">
              <div className="space-y-3">
                {selectedWorkout.type === 'workout' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        handleEditWorkout(selectedWorkout);
                        setShowWorkoutModal(false);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors font-medium"
                    >
                      <Edit className="w-4 h-4" />
                      {language === 'es' ? 'Editar' : 'Edit'}
                    </button>
                    <button
                      onClick={async () => {
                        await handleDeleteWorkout(selectedWorkout);
                        setShowWorkoutModal(false);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 border border-red-600 text-red-600 dark:border-red-400 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      {language === 'es' ? 'Eliminar' : 'Delete'}
                    </button>
                  </div>
                )}

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

                <div className="flex gap-3">
                  {selectedWorkout.status === 'pending' && (
                    <button
                      onClick={async () => {
                        const workoutId = workouts.find(w => w.name === selectedWorkout.name)?.id;
                        if (workoutId) {
                          await supabase
                            .from('athlete_workouts')
                            .update({ status: 'in_progress' })
                            .eq('id', workoutId);
                          await loadWorkouts();
                        }
                        setCalendarView('day');
                        setSelectedDate(parseDateStr(selectedWorkout.scheduled_date));
                        setShowWorkoutModal(false);
                      }}
                      className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {language === 'es' ? 'Iniciar Entrenamiento' : 'Start Workout'}
                    </button>
                  )}
                  {selectedWorkout.status !== 'completed' && (
                    <button
                      onClick={async () => {
                        const workoutId = workouts.find(w => w.name === selectedWorkout.name)?.id;
                        if (workoutId) {
                          await supabase
                            .from('athlete_workouts')
                            .update({
                              status: 'completed',
                              completed_at: new Date().toISOString()
                            })
                            .eq('id', workoutId);
                          await loadWorkouts();
                        }
                        setShowWorkoutModal(false);
                      }}
                      className="flex-1 px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      {language === 'es' ? 'Marcar como Completado' : 'Mark as Complete'}
                    </button>
                  )}
                  <button
                    onClick={() => setShowWorkoutModal(false)}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    {language === 'es' ? 'Cerrar' : 'Close'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <DuplicateWorkoutModal
        isOpen={showDuplicateModal}
        onClose={() => {
          setShowDuplicateModal(false);
          setWorkoutToDuplicate(null);
        }}
        onDuplicate={executeDuplicate}
        workoutName={workoutToDuplicate?.name || ''}
        currentDate={workoutToDuplicate?.scheduled_date || ''}
      />

      <AddExtraTrainingModal
        isOpen={showExtraTrainingModal}
        onClose={() => setShowExtraTrainingModal(false)}
        athleteId={profile?.id || ''}
        selectedDate={formatDateLocal(selectedDate)}
        onSuccess={() => {
          loadWorkouts();
        }}
      />

      {/* Monthly Day Modal */}
      {showMonthlyDayModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedDate.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h2>
              <button
                onClick={() => setShowMonthlyDayModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <DailyWorkoutView
                selectedDate={selectedDate}
                athleteId={effectiveAthleteId}
                onWorkoutUpdate={loadWorkouts}
                onOpenExtraTraining={() => {
                  setShowMonthlyDayModal(false);
                  setShowExtraTrainingModal(true);
                }}
              />
            </div>
          </div>
        </div>
      )}

      <StrengthEstimator
        isOpen={showStrengthEstimator}
        onClose={() => setShowStrengthEstimator(false)}
        exerciseId={estimatorExerciseId}
        exerciseName={estimatorExerciseName}
        athleteId={profile?.id}
      />

      <AIWorkoutGenerator
        isOpen={showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
        selectedDate={formatDateLocal(selectedDate)}
        isFreeTier={!canAccessAIWorkouts}
        onWorkoutSaved={() => {
          loadWorkouts();
          success(language === 'es' ? 'Entrenamiento generado y guardado' : 'Workout generated and saved');
        }}
      />

      {showWellnessCheckin && (
        <WellnessCheckinModal
          athleteId={effectiveAthleteId}
          onClose={() => setShowWellnessCheckin(false)}
          onComplete={(score) => {
            setTodayWellnessScore(score);
            setWellnessChecked(true);
            loadWellnessEntries();
            success(language === 'es' ? `Bienestar registrado (${score.toFixed(0)}/100)` : `Wellness saved (${score.toFixed(0)}/100)`);
          }}
        />
      )}

      {selectedWellnessEntry && (
        <WellnessReportModal
          entry={selectedWellnessEntry}
          onClose={() => setSelectedWellnessEntry(null)}
          onEdit={() => {
            setSelectedWellnessEntry(null);
            setShowWellnessCheckin(true);
          }}
          currentUserId={profile?.id}
          isTrainerOrAdmin={profile?.role === 'trainer' || profile?.role === 'admin'}
        />
      )}

      {showCoachWellness && (
        <CoachWellnessDashboard onClose={() => setShowCoachWellness(false)} />
      )}

      {showCMJAssessment && (
        <CMJAssessment onClose={() => setShowCMJAssessment(false)} />
      )}

      {showBarVelocity && (
        <BarVelocityTracker onClose={() => setShowBarVelocity(false)} />
      )}

      {selectedEnduranceWorkout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 bg-cyan-50 dark:bg-cyan-900/30 border-b border-cyan-200 dark:border-cyan-800 rounded-t-2xl">
              <p className="text-sm font-semibold text-cyan-800 dark:text-cyan-300">
                {language === 'es' ? 'Entrenamiento Endurance' : 'Endurance Workout'}
              </p>
              <button
                onClick={() => setSelectedEnduranceWorkout(null)}
                className="p-1.5 rounded-lg hover:bg-cyan-100 dark:hover:bg-cyan-800/50 transition-colors"
              >
                <X className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
              </button>
            </div>
            <EnduranceWorkoutCard
              workout={selectedEnduranceWorkout}
              language={language}
              initialExpanded={true}
              showFitExport={true}
              onStartWorkout={() => {
                const w = selectedEnduranceWorkout;
                setSelectedEnduranceWorkout(null);
                const event = new CustomEvent('openActivityRecorder', {
                  detail: { plannedWorkout: w },
                });
                window.dispatchEvent(event);
              }}
              onLogWorkout={() => {
                const w = selectedEnduranceWorkout;
                setSelectedEnduranceWorkout(null);
                setLogWorkoutTarget(w);
              }}
              onLogDifferentWorkout={() => {
                const w = selectedEnduranceWorkout;
                setSelectedEnduranceWorkout(null);
                setReassignSourceWorkout(w);
              }}
            />
          </div>
        </div>
      )}

      {selectedRacePlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl bg-white dark:bg-neutral-800">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  {language === 'es' ? 'Plan de Carrera' : 'Race Plan'}
                </p>
              </div>
              <button
                onClick={() => setSelectedRacePlan(null)}
                className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-800/50 transition-colors"
              >
                <X className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Race identity */}
              <div>
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{selectedRacePlan.race_name}</h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedRacePlan.sport && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-medium capitalize">{selectedRacePlan.sport}</span>
                  )}
                  {selectedRacePlan.race_date && (
                    <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs">{selectedRacePlan.race_date}</span>
                  )}
                  {selectedRacePlan.distance_km && (
                    <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs">{selectedRacePlan.distance_km} km</span>
                  )}
                  {selectedRacePlan.expected_duration_min && (
                    <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs">{Math.floor(selectedRacePlan.expected_duration_min / 60)}h {selectedRacePlan.expected_duration_min % 60}min</span>
                  )}
                </div>
              </div>

              {/* Fuel summary */}
              <div className="grid grid-cols-3 gap-3">
                {selectedRacePlan.carbs_g_per_hour != null && (
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{selectedRacePlan.carbs_g_per_hour}g</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{language === 'es' ? 'Carbos/h' : 'Carbs/h'}</p>
                  </div>
                )}
                {selectedRacePlan.fluid_l_per_hour != null && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{selectedRacePlan.fluid_l_per_hour}L</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{language === 'es' ? 'Fluido/h' : 'Fluid/h'}</p>
                  </div>
                )}
                {selectedRacePlan.caffeine_total_mg != null && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{selectedRacePlan.caffeine_total_mg}mg</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{language === 'es' ? 'Cafeína' : 'Caffeine'}</p>
                  </div>
                )}
              </div>

              {/* Segments */}
              {Array.isArray(selectedRacePlan.segments) && selectedRacePlan.segments.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">{language === 'es' ? 'Segmentos' : 'Segments'}</p>
                  <div className="space-y-1.5">
                    {selectedRacePlan.segments.map((seg: any, i: number) => (
                      <div key={i} className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-700/50 rounded-lg px-3 py-2 text-sm">
                        <span className="font-medium text-neutral-800 dark:text-neutral-200 capitalize">{seg.name || seg.sport || seg.segment}</span>
                        <div className="flex gap-3 text-neutral-500 dark:text-neutral-400 text-xs">
                          {seg.distance_km && <span>{seg.distance_km}km</span>}
                          {seg.duration_min && <span>{seg.duration_min}min</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pre-comp notes */}
              {selectedRacePlan.pre_comp_notes && (
                <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">{language === 'es' ? 'Notas previas' : 'Pre-race notes'}</p>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300">{selectedRacePlan.pre_comp_notes}</p>
                </div>
              )}

              {/* Fuel alerts preview */}
              {selectedRacePlan.carbs_g_per_hour != null && selectedRacePlan.expected_duration_min != null && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">
                    {language === 'es' ? 'Alertas de combustible activadas' : 'Fuel alerts enabled'}
                  </p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {language === 'es'
                      ? 'Durante la carrera recibirás recordatorios sonoros para consumir carbohidratos, fluidos y cafeína en los momentos óptimos.'
                      : 'During the race you will receive audio reminders to consume carbohydrates, fluids and caffeine at optimal times.'}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 pb-5">
              <button
                onClick={() => setSelectedRacePlan(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  const plan = selectedRacePlan;
                  setSelectedRacePlan(null);
                  window.dispatchEvent(new CustomEvent('openActivityRecorder', { detail: { racePlan: plan } }));
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors"
              >
                <Play className="w-4 h-4" />
                {language === 'es' ? 'Iniciar GPS' : 'Start GPS'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {logWorkoutTarget && (
        <LogWorkoutModal
          isOpen={true}
          onClose={() => {
            setLogWorkoutTarget(null);
            loadWorkouts();
          }}
          workout={logWorkoutTarget}
          language={language}
          onSaved={() => {
            loadWorkouts();
          }}
        />
      )}

      {reassignSourceWorkout && (
        <WorkoutReassignModal
          isOpen={true}
          onClose={() => setReassignSourceWorkout(null)}
          originalWorkout={reassignSourceWorkout}
          language={language}
          athleteId={effectiveAthleteId!}
          onSelect={(selectedWorkout, originalPlannedDay) => {
            const today = new Date().toISOString().split('T')[0];
            setReassignSourceWorkout(null);
            setLogReassignTarget({
              workout: selectedWorkout,
              executedOnDate: today,
              originalPlannedDay,
            });
          }}
        />
      )}

      {logReassignTarget && (
        <LogWorkoutModal
          isOpen={true}
          onClose={() => {
            setLogReassignTarget(null);
            loadWorkouts();
          }}
          workout={logReassignTarget.workout}
          language={language}
          executedOnDate={logReassignTarget.executedOnDate}
          originalPlannedDay={logReassignTarget.originalPlannedDay}
          onSaved={() => {
            loadWorkouts();
          }}
        />
      )}

      {/* FAB — Floating Action Button */}
      {!showCMJAssessment && !showBarVelocity && showFAB && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowFAB(false)}
        />
      )}

      {/* FAB options */}
      {!showCMJAssessment && !showBarVelocity && (
      <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3">
        {showFAB && (
          <>
            {/* ATP */}
            <div className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
              <span className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm font-semibold px-4 py-2 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 whitespace-nowrap">
                {language === 'es' ? 'Plan Anual (ATP)' : 'Annual Training Plan'}
              </span>
              <button
                onClick={() => {
                  setShowFAB(false);
                  window.dispatchEvent(new CustomEvent('navigate', { detail: 'atp' }));
                }}
                className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-[#514163] dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all hover:scale-110"
              >
                <Calendar className="w-5 h-5" />
              </button>
            </div>

            {/* Add Extra Training */}
            <div className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
              <span className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm font-semibold px-4 py-2 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 whitespace-nowrap">
                {language === 'es' ? 'Agregar Entrenamiento' : 'Add Extra Training'}
              </span>
              <button
                onClick={() => {
                  setShowFAB(false);
                  setShowExtraTrainingModal(true);
                }}
                className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-[#514163] dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all hover:scale-110"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Record GPS — highlighted */}
            <div className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: '120ms' }}>
              <span className="relative bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm font-bold px-4 py-2 rounded-full shadow-lg border-2 border-[#fdda36] whitespace-nowrap">
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#fdda36] animate-ping" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#fdda36]" />
                {language === 'es' ? 'Grabar GPS' : 'Record GPS'}
              </span>
              <button
                onClick={() => {
                  setShowFAB(false);
                  window.dispatchEvent(new CustomEvent('openActivityRecorder', { detail: {} }));
                }}
                className="w-12 h-12 rounded-full bg-[#fdda36] shadow-lg flex items-center justify-center text-[#514163] hover:bg-[#ffd51a] transition-all hover:scale-110"
              >
                <Activity className="w-5 h-5" />
              </button>
            </div>

            {/* GYM Workout — highlighted */}
            <div className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: '180ms' }}>
              <span className="relative bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm font-bold px-4 py-2 rounded-full shadow-lg border-2 border-[#fdda36] whitespace-nowrap">
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#fdda36] animate-ping" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#fdda36]" />
                {language === 'es' ? 'GYM Workout' : 'GYM Workout'}
              </span>
              <button
                onClick={() => {
                  setShowFAB(false);
                  window.dispatchEvent(new CustomEvent('navigate', { detail: 'workout-builder' }));
                }}
                className="w-12 h-12 rounded-full bg-[#fdda36] shadow-lg flex items-center justify-center text-[#514163] hover:bg-[#ffd51a] transition-all hover:scale-110"
              >
                <Dumbbell className="w-5 h-5" />
              </button>
            </div>
          </>
        )}

        {/* Main FAB button */}
        <button
          onClick={() => setShowFAB(prev => !prev)}
          className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${
            showFAB
              ? 'bg-[#514163] rotate-45 scale-110'
              : 'bg-[#fdda36] hover:bg-[#ffd51a] hover:scale-110'
          }`}
          aria-label={language === 'es' ? 'Acciones de entrenamiento' : 'Training actions'}
        >
          <Plus className={`w-7 h-7 ${showFAB ? 'text-white' : 'text-[#514163]'}`} strokeWidth={2.5} />
        </button>
      </div>
      )}

      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(12px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.2s ease-out both;
        }
      `}</style>
    </>
  );
}
