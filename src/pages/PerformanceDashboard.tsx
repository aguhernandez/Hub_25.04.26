import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { getExerciseName } from '../utils/exerciseI18n';
import WorkoutFrequencyHeatmap from '../components/performance/WorkoutFrequencyHeatmap';
import StrengthProgressionChart from '../components/performance/StrengthProgressionChart';
import ExerciseSelector from '../components/performance/ExerciseSelector';
// v2.0 - Fixed exercises column name issue
import {
  TrendingUp,
  Activity,
  Zap,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Download,
  Filter,
  Calendar,
  Users,
  Dumbbell,
  Search,
  Eye,
  EyeOff,
  Clock,
  Mountain,
  Heart,
  ChevronRight
} from 'lucide-react';

interface PerformanceSummary {
  total_sessions: number;
  total_volume: number;
  avg_session_volume: number;
  avg_session_rpe: number;
  acwr: number;
  acwr_status: string;
  fatigue_index: number;
  velocity_drop_pct: number;
  one_rm_trend_pct: number;
}

interface PerformanceInsight {
  id: string;
  insight_type: string;
  severity: string;
  title: string;
  message: string;
  data: any;
  status: string;
  created_at: string;
}

interface RecentSession {
  id: string;
  session_date: string;
  session_type: 'gym' | 'external';
  // Gym session fields
  total_volume?: number;
  session_rpe?: number;
  duration_minutes?: number;
  // External activity fields
  name?: string;
  sport_type?: string;
  source?: string;
  duration_seconds?: number;
  distance_meters?: number;
  elevation_gain_meters?: number;
  average_heartrate?: number;
  average_power?: number;
  user_rpe?: number;
}

export default function PerformanceDashboard() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [selectedAthlete, setSelectedAthlete] = useState<string>('');
  const [athletes, setAthletes] = useState<any[]>([]);
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [insights, setInsights] = useState<PerformanceInsight[]>([]);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<RecentSession | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'load' | 'fatigue' | 'strength'>('overview');
  const [dateRange, setDateRange] = useState(28);
  const [workoutData, setWorkoutData] = useState<any[]>([]);
  const [exercisesList, setExercisesList] = useState<any[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>('');
  const [exerciseLogs, setExerciseLogs] = useState<any[]>([]);
  const [allExercisesLogs, setAllExercisesLogs] = useState<{ exerciseId: string; exerciseName: string; logs: any[] }[]>([]);
  const [strengthTimeFilter, setStrengthTimeFilter] = useState<'1m' | '3m' | '6m' | '1y'>('3m');
  const [selectedStrengthExercise, setSelectedStrengthExercise] = useState<string>('');
  const [strengthExerciseSearch, setStrengthExerciseSearch] = useState<string>('');
  const [showStrengthExerciseDropdown, setShowStrengthExerciseDropdown] = useState(false);

  // Privacy settings
  const [privacySettings, setPrivacySettings] = useState({
    show_key_metrics: true,
    show_workout_frequency: true,
    show_strength_progression: true,
    show_insights: true,
    show_recent_sessions: true
  });

  const isTrainerOrAdmin = profile?.role === 'trainer' || profile?.role === 'admin';
  const targetAthleteId = selectedAthlete || (profile?.role === 'athlete' ? profile.id : '');
  const showPrivacyControls = profile?.id === targetAthleteId && profile?.role === 'athlete';

  useEffect(() => {
    if (isTrainerOrAdmin) {
      loadAthletes();
    }
  }, []);

  useEffect(() => {
    if (targetAthleteId) {
      loadPerformanceData();
      loadWorkoutFrequencyData();
      loadExercisesList();
      loadPrivacySettings();
    }
  }, [targetAthleteId, dateRange]);

  useEffect(() => {
    if (selectedExercise && targetAthleteId) {
      loadExerciseLogs();
    }
  }, [selectedExercise, targetAthleteId, strengthTimeFilter]);

  useEffect(() => {
    console.log('🔄 useEffect triggered for strength logs - targetAthleteId:', targetAthleteId);
    if (targetAthleteId) {
      console.log('✅ Loading all exercises logs...');
      loadAllExercisesLogs();
    } else {
      console.log('⚠️ Skipping load - no targetAthleteId');
    }
  }, [targetAthleteId, strengthTimeFilter]);

  const loadAthletes = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'athlete')
      .order('full_name');
    setAthletes(data || []);
  };

  const loadPerformanceData = async () => {
    setLoading(true);
    console.log('🔄 Starting to load performance data for athlete:', targetAthleteId);
    try {
      const [summaryData, insightsData, sessionsData] = await Promise.all([
        loadSummary(),
        loadInsights(),
        loadRecentSessions()
      ]);

      console.log('📦 All data loaded:', { summaryData, insightsData: insightsData.length, sessionsData: sessionsData.length });

      setSummary(summaryData);
      setInsights(insightsData);
      setRecentSessions(sessionsData);

      console.log('✅ State updated. Summary is now:', summaryData ? 'SET' : 'NULL');
    } catch (error) {
      console.error('❌ Error loading performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async (): Promise<PerformanceSummary | null> => {
    console.log('🔍 Loading summary for athlete:', targetAthleteId, 'days:', dateRange);

    const { data, error } = await supabase.rpc('get_performance_summary', {
      p_athlete_id: targetAthleteId,
      p_days: dateRange
    });

    if (error) {
      console.error('❌ Error loading summary:', error);
      return null;
    }

    console.log('✅ Summary data received:', data);

    // Always return the first row since function always returns exactly one row
    const summaryData = data?.[0] || null;
    console.log('📊 Parsed summary:', summaryData);

    return summaryData;
  };

  const loadInsights = async (): Promise<PerformanceInsight[]> => {
    const { data, error } = await supabase
      .from('performance_insights')
      .select('*')
      .eq('athlete_id', targetAthleteId)
      .in('status', ['new', 'read'])
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error loading insights:', error);
      return [];
    }

    return data || [];
  };

  const loadRecentSessions = async (): Promise<RecentSession[]> => {
    // Load gym sessions
    const { data: gymSessions, error: gymError } = await supabase
      .from('performance_sessions')
      .select('id, session_date, total_volume, session_rpe, duration_minutes, athlete_workout_id')
      .eq('athlete_id', targetAthleteId)
      .order('session_date', { ascending: false })
      .limit(15);

    if (gymError) {
      console.error('Error loading gym sessions:', gymError);
    }

    // Load external activities
    const { data: externalActivities, error: externalError } = await supabase
      .from('external_activities')
      .select('id, start_time, name, sport_type, source, duration_seconds, distance_meters, elevation_gain_meters, average_heartrate, average_power, user_rpe')
      .eq('user_id', targetAthleteId)
      .is('deleted_at', null)
      .order('start_time', { ascending: false })
      .limit(15);

    if (externalError) {
      console.error('Error loading external activities:', externalError);
    }

    // Combine and format both types of sessions
    const allSessions: RecentSession[] = [];

    // Add gym sessions
    if (gymSessions) {
      gymSessions.forEach(session => {
        allSessions.push({
          id: session.id,
          session_date: session.session_date,
          session_type: 'gym',
          total_volume: session.total_volume,
          session_rpe: session.session_rpe,
          duration_minutes: session.duration_minutes,
          athlete_workout_id: session.athlete_workout_id,
        } as any);
      });
    }

    // Add external activities
    if (externalActivities) {
      externalActivities.forEach(activity => {
        allSessions.push({
          id: activity.id,
          session_date: activity.start_time,
          session_type: 'external',
          name: activity.name,
          sport_type: activity.sport_type,
          source: activity.source,
          duration_seconds: activity.duration_seconds,
          distance_meters: activity.distance_meters,
          elevation_gain_meters: activity.elevation_gain_meters,
          average_heartrate: activity.average_heartrate,
          average_power: activity.average_power,
          user_rpe: activity.user_rpe,
        });
      });
    }

    // Sort all sessions by date descending and return top 10
    allSessions.sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime());
    return allSessions.slice(0, 10);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'optimal':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'caution':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'high_injury_risk':
      case 'detraining_risk':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'optimal') return <CheckCircle className="w-5 h-5" />;
    if (status === 'caution') return <AlertTriangle className="w-5 h-5" />;
    return <AlertTriangle className="w-5 h-5" />;
  };

  const getStatusLabel = (status: string): string => {
    const labels: { [key: string]: { en: string; es: string } } = {
      optimal: { en: 'Optimal', es: 'Óptimo' },
      caution: { en: 'Caution', es: 'Precaución' },
      high_injury_risk: { en: 'High Risk', es: 'Alto Riesgo' },
      detraining_risk: { en: 'Detraining Risk', es: 'Riesgo de Desentrenamiento' },
      insufficient_data: { en: 'Insufficient Data', es: 'Datos Insuficientes' }
    };
    return labels[status]?.[language] || status;
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'info':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'critical':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    }
  };

  const dismissInsight = async (insightId: string) => {
    await supabase
      .from('performance_insights')
      .update({ status: 'dismissed' })
      .eq('id', insightId);

    setInsights(insights.filter(i => i.id !== insightId));
  };

  const loadPrivacySettings = async () => {
    const { data } = await supabase
      .from('athlete_profile_details')
      .select('show_key_metrics, show_workout_frequency, show_strength_progression, show_insights, show_recent_sessions')
      .eq('athlete_id', targetAthleteId)
      .maybeSingle();

    if (data) {
      setPrivacySettings({
        show_key_metrics: data.show_key_metrics ?? true,
        show_workout_frequency: data.show_workout_frequency ?? true,
        show_strength_progression: data.show_strength_progression ?? true,
        show_insights: data.show_insights ?? true,
        show_recent_sessions: data.show_recent_sessions ?? true
      });
    }
  };

  const togglePrivacy = async (field: keyof typeof privacySettings) => {
    const newValue = !privacySettings[field];
    setPrivacySettings({ ...privacySettings, [field]: newValue });

    // Check if athlete_profile_details record exists
    const { data: existing } = await supabase
      .from('athlete_profile_details')
      .select('id')
      .eq('athlete_id', targetAthleteId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('athlete_profile_details')
        .update({ [field]: newValue })
        .eq('athlete_id', targetAthleteId);
    } else {
      await supabase
        .from('athlete_profile_details')
        .insert({
          athlete_id: targetAthleteId,
          [field]: newValue
        });
    }
  };

  // Helper functions for external activities
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDistance = (meters: number): string => {
    const km = meters / 1000;
    return `${km.toFixed(2)} km`;
  };

  const getSportIcon = (sportType: string): string => {
    const icons: { [key: string]: string } = {
      'run': '🏃',
      'ride': '🚴',
      'swim': '🏊',
      'walk': '🚶',
      'hike': '🥾',
      'workout': '💪',
      'yoga': '🧘',
      'other': '🏋️'
    };
    return icons[sportType.toLowerCase()] || icons['other'];
  };

  const loadWorkoutFrequencyData = async () => {
    const dateLimit = new Date(Date.now() - 84 * 24 * 60 * 60 * 1000).toISOString();
    const dateLimitDate = dateLimit.split('T')[0];

    const { data: workouts, error: workoutsError } = await supabase
      .from('athlete_workouts')
      .select('scheduled_date, status, workouts(name), external_title')
      .eq('athlete_id', targetAthleteId)
      .eq('status', 'completed')
      .gte('scheduled_date', dateLimitDate)
      .order('scheduled_date', { ascending: false });

    const { data: extraTrainings, error: extraError } = await supabase
      .from('extra_training_logs')
      .select('training_date, activity_name, duration')
      .eq('athlete_id', targetAthleteId)
      .gte('training_date', dateLimitDate)
      .order('training_date', { ascending: false });

    const { data: externalActivities, error: externalError } = await supabase
      .from('external_activities')
      .select('start_time, name, sport_type, duration_seconds, deleted_at')
      .eq('user_id', targetAthleteId)
      .is('deleted_at', null)
      .gte('start_time', dateLimit)
      .order('start_time', { ascending: false });

    if (workoutsError) {
      console.error('❌ Error loading workouts:', workoutsError);
    } else {
      console.log('✅ Workouts loaded:', workouts?.length || 0, 'for athlete:', targetAthleteId);
    }

    if (extraError) {
      console.error('❌ Error loading extra trainings:', extraError);
    } else {
      console.log('✅ Extra trainings loaded:', extraTrainings?.length || 0);
    }

    if (externalError) {
      console.error('❌ Error loading external activities:', externalError);
    } else {
      console.log('✅ External activities loaded:', externalActivities?.length || 0);
    }

    const formattedWorkouts = workouts ? workouts.map(item => ({
      date: item.scheduled_date,
      workout_name: item.external_title || (item.workouts as any)?.name || 'Workout'
    })) : [];

    const formattedExtras = extraTrainings ? extraTrainings.map(item => ({
      date: item.training_date,
      workout_name: item.duration ? `${item.activity_name} (${item.duration})` : item.activity_name
    })) : [];

    const formattedExternal = externalActivities ? externalActivities.map(item => {
      const date = new Date(item.start_time);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const durationMin = item.duration_seconds ? Math.round(item.duration_seconds / 60) : null;
      const workoutName = item.name || item.sport_type || 'External Activity';
      return {
        date: dateStr,
        workout_name: durationMin ? `${workoutName} (${durationMin} min)` : workoutName
      };
    }) : [];

    console.log('📊 Total workout data points:', formattedWorkouts.length + formattedExtras.length + formattedExternal.length);
    setWorkoutData([...formattedWorkouts, ...formattedExtras, ...formattedExternal]);
  };

  const loadExercisesList = async () => {
    console.log('🏋️ Loading exercises for athlete:', targetAthleteId);

    const { data, error } = await supabase.rpc('get_athlete_exercises_with_counts', {
      p_athlete_id: targetAthleteId
    });

    if (error) {
      console.log('⚠️ RPC function failed, loading all exercises:', error.message);
    } else if (data && data.length > 0) {
      console.log('✅ Loaded', data.length, 'exercises with workout history');
      setExercisesList(data);
      if (!selectedExercise) {
        setSelectedExercise(data[0].id);
        setSelectedExerciseName(data[0].name);
      }
      return;
    }

    // Fallback: load all exercises
    console.log('📋 Loading all exercises as fallback...');
    const { data: allExercises, error: exercisesError } = await supabase
      .from('exercises')
      .select('id, exercise, exercise_en, exercise_es, category')
      .order('exercise_en', { ascending: true })
      .limit(500);

    if (exercisesError) {
      console.error('❌ Error loading exercises:', exercisesError);
      setExercisesList([]);
      return;
    }

    if (allExercises && allExercises.length > 0) {
      console.log('✅ Loaded', allExercises.length, 'total exercises');
      const exercisesWithCount = allExercises.map(ex => ({
        id: ex.id,
        name: getExerciseName(ex, language),
        category: ex.category,
        sessionCount: 0
      }));
      setExercisesList(exercisesWithCount);
      if (!selectedExercise) {
        setSelectedExercise(exercisesWithCount[0].id);
        setSelectedExerciseName(exercisesWithCount[0].name);
      }
    } else {
      console.log('⚠️ No exercises found in database');
      setExercisesList([]);
    }
  };

  const loadExerciseLogs = async () => {
    if (!selectedExercise) {
      setExerciseLogs([]);
      return;
    }

    console.log('📊 Loading exercise logs for:', selectedExercise);

    const daysMap = { '1m': 30, '3m': 90, '6m': 180, '1y': 365 };
    const days = daysMap[strengthTimeFilter];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('training_logs')
      .select(`
        logged_at,
        weight_used,
        reps_completed,
        rir,
        set_number,
        athlete_id,
        workout_exercise_id,
        workout_exercises!inner(
          exercise_id,
          exercises!inner(id, exercise)
        )
      `)
      .eq('athlete_id', targetAthleteId)
      .gte('logged_at', startDate.toISOString())
      .order('logged_at', { ascending: true });

    if (error) {
      console.error('Error loading exercise logs:', error);
      setExerciseLogs([]);
      return;
    }

    if (!data || data.length === 0) {
      console.log('No training logs found for athlete:', targetAthleteId);
      setExerciseLogs([]);
      return;
    }

    const filtered = data.filter((log: any) => {
      const exerciseId = log.workout_exercises?.exercises?.id || log.workout_exercises?.exercise_id;
      return exerciseId === selectedExercise;
    });

    console.log('Filtered logs for exercise:', selectedExercise, filtered.length);

    const groupedBySets = filtered.reduce((acc: any[], log: any) => {
      const dateKey = log.logged_at.split('T')[0];
      const existing = acc.find(item => item.date.split('T')[0] === dateKey);

      if (existing) {
        if ((log.weight_used || 0) > existing.weight) {
          existing.weight = log.weight_used || 0;
          existing.reps = log.reps_completed || 0;
          existing.rir = log.rir;
        }
      } else {
        acc.push({
          date: log.logged_at,
          weight: log.weight_used || 0,
          reps: log.reps_completed || 0,
          rir: log.rir
        });
      }
      return acc;
    }, []);

    console.log('Grouped exercise logs:', groupedBySets.length);
    setExerciseLogs(groupedBySets);
  };

  const loadAllExercisesLogs = async () => {
    if (!targetAthleteId) {
      setAllExercisesLogs([]);
      return;
    }

    console.log('📊 Loading logs for all exercises with activity');

    const daysMap = { '1m': 30, '3m': 90, '6m': 180, '1y': 365 };
    const days = daysMap[strengthTimeFilter];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // First, get all training logs with workout_exercise info
    const { data: rawData, error } = await supabase
      .from('training_logs')
      .select(`
        logged_at,
        weight_used,
        reps_completed,
        rir,
        set_number,
        athlete_id,
        workout_exercise_id,
        athlete_workout_id,
        workout_exercises(
          exercise_id
        )
      `)
      .eq('athlete_id', targetAthleteId)
      .gte('logged_at', startDate.toISOString())
      .order('logged_at', { ascending: true });

    // Filter out logs without exercise_id in JavaScript
    const data = rawData?.filter((log: any) => log.workout_exercises?.exercise_id) || [];

    if (error) {
      console.error('Error loading all exercise logs:', error);
      setAllExercisesLogs([]);
      return;
    }

    if (!data || data.length === 0) {
      console.log('❌ No training logs found for athlete:', targetAthleteId);
      setAllExercisesLogs([]);
      return;
    }

    console.log('✅ Found', data.length, 'training logs');
    console.log('Sample log structure:', JSON.stringify(data[0], null, 2));

    // Get unique exercise IDs
    const exerciseIds = Array.from(new Set(
      data
        .map((log: any) => log.workout_exercises?.exercise_id)
        .filter(Boolean)
    ));

    console.log('📋 Unique exercise IDs:', exerciseIds);

    // Fetch exercise names
    const { data: exercises, error: exercisesError } = await supabase
      .from('exercises')
      .select('id, exercise, exercise_en, exercise_es')
      .in('id', exerciseIds);

    if (exercisesError) {
      console.error('Error loading exercise names:', exercisesError);
    }

    const exerciseNamesMap = new Map(
      exercises?.map(ex => [ex.id, getExerciseName(ex, language)]) || []
    );

    console.log('📋 Exercise names:', Object.fromEntries(exerciseNamesMap));

    // Group by exercise, keeping the best set (highest estimated 1RM) per workout session per day
    const exerciseMap = new Map<string, { exerciseName: string; logs: any[] }>();
    let skippedLogs = 0;

    const calcOneRM = (weight: number, reps: number, rir?: number | null) => {
      if (!weight || weight <= 0 || !reps || reps <= 0) return weight || 0;
      const totalReps = reps + (rir !== null && rir !== undefined ? Math.min(Math.max(Math.round(rir), 0), 5) : 0);
      return Math.round(weight * (1 + totalReps / 30) * 10) / 10;
    };

    data.forEach((log: any, index: number) => {
      const exerciseId = log.workout_exercises?.exercise_id;
      const exerciseName = exerciseNamesMap.get(exerciseId) || 'Unknown Exercise';

      if (index < 3) {
        console.log(`Log ${index} - exerciseId:`, exerciseId, 'exerciseName:', exerciseName);
      }

      if (!exerciseId) {
        skippedLogs++;
        return;
      }

      if (!exerciseMap.has(exerciseId)) {
        exerciseMap.set(exerciseId, { exerciseName, logs: [] });
      }

      const exerciseData = exerciseMap.get(exerciseId)!;
      const w = log.weight_used || 0;
      const r = log.reps_completed || 0;
      const rir = log.rir ?? null;

      if (w <= 0 || r <= 0) return;

      const oneRM = calcOneRM(w, r, rir);

      // Group by athlete_workout_id (session) — each session gets one entry (best set)
      const sessionKey = log.athlete_workout_id || log.logged_at.split('T')[0];
      const existingLog = exerciseData.logs.find((l: any) => l.sessionKey === sessionKey);

      if (existingLog) {
        if (oneRM > existingLog.estimatedOneRM) {
          existingLog.weight = w;
          existingLog.reps = r;
          existingLog.rir = rir;
          existingLog.estimatedOneRM = oneRM;
        }
      } else {
        exerciseData.logs.push({
          date: log.logged_at,
          weight: w,
          reps: r,
          rir: rir,
          estimatedOneRM: oneRM,
          sessionKey,
        });
      }
    });

    // Convert to array and filter exercises with at least 1 data point
    const exercisesWithLogs = Array.from(exerciseMap.entries())
      .map(([exerciseId, data]) => ({
        exerciseId,
        exerciseName: data.exerciseName,
        logs: data.logs
      }))
      .filter(ex => ex.logs.length >= 1)
      .sort((a, b) => b.logs.length - a.logs.length); // Sort by number of sessions descending

    console.log('📊 Total logs processed:', data.length);
    console.log('📊 Skipped logs (no exercise ID):', skippedLogs);
    console.log('📊 Exercise Map size:', exerciseMap.size);
    console.log('📊 Exercises after filtering:', exercisesWithLogs.length);
    if (exercisesWithLogs.length > 0) {
      console.log('📊 Exercises with logs:', exercisesWithLogs.map(ex => `${ex.exerciseName} (${ex.logs.length} logs)`));
    }
    console.log('✅ Loaded logs for', exercisesWithLogs.length, 'exercises with activity');
    setAllExercisesLogs(exercisesWithLogs);
  };

  // Auto-select first exercise when exercises are loaded
  useEffect(() => {
    if (allExercisesLogs.length > 0 && !selectedStrengthExercise) {
      setSelectedStrengthExercise(allExercisesLogs[0].exerciseId);
    }
  }, [allExercisesLogs]);

  const handleExportPDF = () => {
    window.print();
  };

  // Get max stats for main exercises
  const getMaxForExercise = (exerciseName: string) => {
    const exercise = allExercisesLogs.find(ex =>
      ex.exerciseName.toLowerCase().includes(exerciseName.toLowerCase())
    );

    if (!exercise || exercise.logs.length === 0) {
      return null;
    }

    let maxWeight = 0;
    let maxReps = 0;
    let maxRir = null;

    exercise.logs.forEach((log: any) => {
      const weight = parseFloat(log.weight) || 0;
      const reps = parseInt(log.reps) || 0;
      const rir = log.rir !== null && log.rir !== undefined ? parseInt(log.rir) : null;

      if (weight > maxWeight || (weight === maxWeight && reps > maxReps)) {
        maxWeight = weight;
        maxReps = reps;
        maxRir = rir;
      }
    });

    return { weight: maxWeight, reps: maxReps, rir: maxRir };
  };

  if (!targetAthleteId && profile?.role === 'athlete') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-400">
          {language === 'es' ? 'Cargando datos...' : 'Loading data...'}
        </p>
      </div>
    );
  }

  if (!targetAthleteId && isTrainerOrAdmin) {
    return (
      <div className="space-y-6 pt-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="w-8 h-8 text-[#fdda36]" />
          {language === 'es' ? 'Panel de Rendimiento' : 'Performance Dashboard'}
        </h1>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {language === 'es' ? 'Selecciona un atleta para ver su rendimiento' : 'Select an athlete to view their performance'}
          </p>
          <select
            value={selectedAthlete}
            onChange={(e) => setSelectedAthlete(e.target.value)}
            className="w-full max-w-md mx-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          >
            <option value="">{language === 'es' ? 'Seleccionar atleta...' : 'Select athlete...'}</option>
            {athletes.map(athlete => (
              <option key={athlete.id} value={athlete.id}>
                {athlete.full_name || athlete.email}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="w-8 h-8 text-[#fdda36]" />
          {language === 'es' ? 'Panel de Rendimiento' : 'Performance Dashboard'}
        </h1>

        <div className="flex items-center gap-3">
          {isTrainerOrAdmin && (
            <select
              value={selectedAthlete}
              onChange={(e) => setSelectedAthlete(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
            >
              <option value="">{language === 'es' ? 'Seleccionar atleta' : 'Select athlete'}</option>
              {athletes.map(athlete => (
                <option key={athlete.id} value={athlete.id}>
                  {athlete.full_name || athlete.email}
                </option>
              ))}
            </select>
          )}

          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
          >
            <option value={7}>{language === 'es' ? 'Últimos 7 días' : 'Last 7 days'}</option>
            <option value={14}>{language === 'es' ? 'Últimos 14 días' : 'Last 14 days'}</option>
            <option value={28}>{language === 'es' ? 'Últimos 28 días' : 'Last 28 days'}</option>
            <option value={90}>{language === 'es' ? 'Últimos 90 días' : 'Last 90 days'}</option>
          </select>

          <button className="flex items-center gap-2 px-4 py-2 bg-[#514163] text-white rounded-lg hover:bg-[#6d5581] transition-colors text-sm font-medium">
            <Download className="w-4 h-4" />
            {language === 'es' ? 'Exportar' : 'Export'}
          </button>
        </div>
      </div>

      {(() => {
        console.log('🎨 Rendering PerformanceDashboard - loading:', loading, 'summary:', summary);
        return null;
      })()}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Activity className="w-12 h-12 text-gray-400 animate-pulse mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {language === 'es' ? 'Cargando datos de rendimiento...' : 'Loading performance data...'}
            </p>
          </div>
        </div>
      ) : summary ? (
        <>
          {/* Key Metrics Cards */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {language === 'es' ? 'Métricas Clave' : 'Key Metrics'}
              </h3>
              {showPrivacyControls && (
                <button
                  onClick={() => togglePrivacy('show_key_metrics')}
                  className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {privacySettings.show_key_metrics ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  <span className="text-sm font-medium">
                    {privacySettings.show_key_metrics ? (language === 'es' ? 'Público' : 'Public') : (language === 'es' ? 'Privado' : 'Private')}
                  </span>
                </button>
              )}
            </div>
            <div className={privacySettings.show_key_metrics ? '' : 'opacity-30 blur-sm pointer-events-none relative'}>
              {!privacySettings.show_key_metrics && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <p className="text-gray-500 dark:text-gray-400 text-center bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-lg">
                    {language === 'es' ? 'Sección oculta para otros usuarios' : 'Section hidden from other users'}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* ACWR Card */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {language === 'es' ? 'Ratio ACWR' : 'ACWR Ratio'}
                </span>
                <BarChart3 className="w-5 h-5 text-[#514163] dark:text-[#fdda36]" />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {summary.acwr.toFixed(2)}
              </p>
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(summary.acwr_status)}`}>
                {getStatusIcon(summary.acwr_status)}
                {getStatusLabel(summary.acwr_status)}
              </div>
            </div>

            {/* Fatigue Index Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {language === 'es' ? 'Índice de Fatiga' : 'Fatigue Index'}
                </span>
                <Zap className="w-5 h-5 text-[#514163] dark:text-[#fdda36]" />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {summary.fatigue_index.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {summary.fatigue_index > 1.2
                  ? (language === 'es' ? 'Alta carga reciente' : 'High recent load')
                  : summary.fatigue_index < 0.8
                  ? (language === 'es' ? 'Carga reducida' : 'Reduced load')
                  : (language === 'es' ? 'Balance normal' : 'Normal balance')}
              </p>
            </div>

            {/* 1RM Trend Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {language === 'es' ? 'Tendencia 1RM' : '1RM Trend'}
                </span>
                <TrendingUp className="w-5 h-5 text-[#514163] dark:text-[#fdda36]" />
              </div>
              <p className={`text-3xl font-bold mb-2 ${
                summary.one_rm_trend_pct > 0
                  ? 'text-green-600 dark:text-green-400'
                  : summary.one_rm_trend_pct < 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-900 dark:text-white'
              }`}>
                {summary.one_rm_trend_pct > 0 ? '+' : ''}{summary.one_rm_trend_pct.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {language === 'es' ? 'vs semanas previas' : 'vs previous weeks'}
              </p>
            </div>

            {/* Total Volume Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {language === 'es' ? 'Volumen Total' : 'Total Volume'}
                </span>
                <Activity className="w-5 h-5 text-[#514163] dark:text-[#fdda36]" />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {(summary.total_volume / 1000).toFixed(1)}
                <span className="text-lg ml-1">{language === 'es' ? 't' : 't'}</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {summary.total_sessions} {language === 'es' ? 'sesiones' : 'sessions'}
              </p>
            </div>
          </div>
            </div>
          </div>

          {/* Workout Frequency Heatmap */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {language === 'es' ? 'Frecuencia de Entrenamiento' : 'Workout Frequency'}
              </h3>
              {showPrivacyControls && (
                <button
                  onClick={() => togglePrivacy('show_workout_frequency')}
                  className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {privacySettings.show_workout_frequency ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  <span className="text-sm font-medium">
                    {privacySettings.show_workout_frequency ? (language === 'es' ? 'Público' : 'Public') : (language === 'es' ? 'Privado' : 'Private')}
                  </span>
                </button>
              )}
            </div>
            <div className={privacySettings.show_workout_frequency ? '' : 'opacity-30 blur-sm pointer-events-none relative'}>
              {!privacySettings.show_workout_frequency && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <p className="text-gray-500 dark:text-gray-400 text-center bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-lg">
                    {language === 'es' ? 'Sección oculta para otros usuarios' : 'Section hidden from other users'}
                  </p>
                </div>
              )}
              <WorkoutFrequencyHeatmap
                athleteId={targetAthleteId}
                workoutData={workoutData}
              />
            </div>
          </div>

          {/* Strength Progression Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Dumbbell className="w-6 h-6 text-[#fdda36]" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {language === 'es' ? 'Progresión de Fuerza' : 'Strength Progression'}
                </h2>
              </div>
              {showPrivacyControls && (
                <button
                  onClick={() => togglePrivacy('show_strength_progression')}
                  className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {privacySettings.show_strength_progression ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  <span className="text-sm font-medium">
                    {privacySettings.show_strength_progression ? (language === 'es' ? 'Público' : 'Public') : (language === 'es' ? 'Privado' : 'Private')}
                  </span>
                </button>
              )}
            </div>

            <div className={privacySettings.show_strength_progression ? '' : 'opacity-30 blur-sm pointer-events-none relative'}>
              {!privacySettings.show_strength_progression && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <p className="text-gray-500 dark:text-gray-400 text-center bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-lg">
                    {language === 'es' ? 'Sección oculta para otros usuarios' : 'Section hidden from other users'}
                  </p>
                </div>
              )}

            {/* Main Exercises Max Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {[
                { name: 'Back Squat', key: 'squat' },
                { name: 'Deadlift', key: 'deadlift' },
                { name: 'Bench Press', key: 'bench' },
                { name: 'Hang Clean', key: 'clean' },
                { name: 'Lying Barbell Row', key: 'row' },
                { name: 'Overhead Press', key: 'ohp' }
              ].map((exercise) => {
                const maxStats = getMaxForExercise(exercise.name);
                return (
                  <div
                    key={exercise.key}
                    className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                  >
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      {exercise.name}
                    </h3>
                    {maxStats ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                          {maxStats.weight}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">kg</span>
                        <span className="text-lg text-gray-700 dark:text-gray-300">×</span>
                        <span className="text-xl font-semibold text-gray-900 dark:text-white">
                          {maxStats.reps}
                        </span>
                        {maxStats.rir !== null && (
                          <>
                            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                              RIR
                            </span>
                            <span className="text-lg font-semibold text-[#fdda36]">
                              {maxStats.rir}
                            </span>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="text-2xl font-bold text-gray-400 dark:text-gray-500">
                        -
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Time Filter Buttons */}
            <div className="flex justify-end mb-6">
              <div className="flex flex-col gap-2">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {language === 'es' ? 'Período' : 'Time Period'}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(['1m', '3m', '6m', '1y'] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setStrengthTimeFilter(period)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        strengthTimeFilter === period
                          ? 'bg-[#fdda36] text-gray-900'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {period === '1m' && (language === 'es' ? '1m' : '1m')}
                      {period === '3m' && (language === 'es' ? '3m' : '3m')}
                      {period === '6m' && (language === 'es' ? '6m' : '6m')}
                      {period === '1y' && (language === 'es' ? '1a' : '1y')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Strength Charts - Exercise Selector */}
            {allExercisesLogs.length > 0 ? (
              <div className="space-y-6">
                {/* Exercise Search & Selector */}
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder={language === 'es' ? 'Buscar ejercicio...' : 'Search exercise...'}
                      value={strengthExerciseSearch}
                      onChange={(e) => setStrengthExerciseSearch(e.target.value)}
                      onFocus={() => setShowStrengthExerciseDropdown(true)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#fdda36] focus:border-transparent"
                    />
                  </div>

                  {/* Dropdown List */}
                  {showStrengthExerciseDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowStrengthExerciseDropdown(false)}
                      />
                      <div className="absolute z-20 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-80 overflow-y-auto">
                        {allExercisesLogs
                          .filter(ex =>
                            ex.exerciseName.toLowerCase().includes(strengthExerciseSearch.toLowerCase())
                          )
                          .map((exercise) => (
                            <button
                              key={exercise.exerciseId}
                              onClick={() => {
                                setSelectedStrengthExercise(exercise.exerciseId);
                                setStrengthExerciseSearch('');
                                setShowStrengthExerciseDropdown(false);
                              }}
                              className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                                selectedStrengthExercise === exercise.exerciseId
                                  ? 'bg-[#fdda36]/10 dark:bg-[#fdda36]/20'
                                  : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {exercise.exerciseName}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  {exercise.logs.length} {language === 'es' ? 'registros' : 'logs'}
                                </span>
                              </div>
                            </button>
                          ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Selected Exercise Chart */}
                {selectedStrengthExercise && (() => {
                  const exercise = allExercisesLogs.find(ex => ex.exerciseId === selectedStrengthExercise);
                  return exercise ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                      <StrengthProgressionChart
                        exerciseName={exercise.exerciseName}
                        logs={exercise.logs}
                        timeFilter={strengthTimeFilter}
                      />
                    </div>
                  ) : null;
                })()}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{language === 'es' ? 'No hay datos de ejercicios registrados en este período' : 'No exercise data logged in this period'}</p>
              </div>
            )}

            {/* Export PDF Button */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-[#514163] text-white rounded-lg hover:bg-[#6d5581] transition-colors font-medium"
              >
                <Download className="w-4 h-4" />
                {language === 'es' ? 'Exportar como PDF' : 'Export as PDF'}
              </button>
            </div>
            </div>
          </div>

          {/* Insights Section */}
          {insights.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {language === 'es' ? 'Insights y Alertas' : 'Insights & Alerts'}
                </h2>
                {showPrivacyControls && (
                  <button
                    onClick={() => togglePrivacy('show_insights')}
                    className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {privacySettings.show_insights ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    <span className="text-sm font-medium">
                      {privacySettings.show_insights ? (language === 'es' ? 'Público' : 'Public') : (language === 'es' ? 'Privado' : 'Private')}
                    </span>
                  </button>
                )}
              </div>
              <div className={privacySettings.show_insights ? '' : 'opacity-30 blur-sm pointer-events-none relative'}>
                {!privacySettings.show_insights && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <p className="text-gray-500 dark:text-gray-400 text-center bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-lg">
                      {language === 'es' ? 'Sección oculta para otros usuarios' : 'Section hidden from other users'}
                    </p>
                  </div>
                )}
              <div className="space-y-3">
                {insights.map((insight) => (
                  <div
                    key={insight.id}
                    className={`p-4 rounded-lg border ${getSeverityColor(insight.severity)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{insight.title}</h3>
                        <p className="text-sm opacity-90">{insight.message}</p>
                        <p className="text-xs opacity-60 mt-2">
                          {new Date(insight.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => dismissInsight(insight.id)}
                        className="text-xs px-2 py-1 rounded hover:bg-black/10 transition-colors"
                      >
                        {language === 'es' ? 'Descartar' : 'Dismiss'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              </div>
            </div>
          )}

          {/* Recent Sessions */}
          {recentSessions.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {language === 'es' ? 'Sesiones Recientes' : 'Recent Sessions'}
                </h2>
                {showPrivacyControls && (
                  <button
                    onClick={() => togglePrivacy('show_recent_sessions')}
                    className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {privacySettings.show_recent_sessions ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    <span className="text-sm font-medium">
                      {privacySettings.show_recent_sessions ? (language === 'es' ? 'Público' : 'Public') : (language === 'es' ? 'Privado' : 'Private')}
                    </span>
                  </button>
                )}
              </div>
              <div className={privacySettings.show_recent_sessions ? '' : 'opacity-30 blur-sm pointer-events-none relative'}>
                {!privacySettings.show_recent_sessions && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <p className="text-gray-500 dark:text-gray-400 text-center bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-lg">
                      {language === 'es' ? 'Sección oculta para otros usuarios' : 'Section hidden from other users'}
                    </p>
                  </div>
                )}
              <div className="space-y-3">
                {recentSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => {
                      setSelectedSession(session);
                      setShowSessionModal(true);
                    }}
                    className="w-full p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-[#514163] dark:hover:border-[#fdda36] hover:shadow-md transition-all cursor-pointer bg-white dark:bg-gray-900"
                  >
                    {session.session_type === 'gym' ? (
                      // Gym Session Layout
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#514163] dark:bg-[#fdda36]/20 flex items-center justify-center">
                            <Dumbbell className="w-5 h-5 text-white dark:text-[#fdda36]" />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {language === 'es' ? 'Entrenamiento de Fuerza' : 'Strength Training'}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(session.session_date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
                                day: 'numeric',
                                month: 'short'
                              })}
                              {session.duration_minutes && (
                                <>
                                  <span>•</span>
                                  <Clock className="w-3.5 h-3.5" />
                                  {session.duration_minutes} min
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                              {((session.total_volume || 0) / 1000).toFixed(1)}
                              <span className="text-sm ml-0.5">t</span>
                            </p>
                            {session.session_rpe && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                RPE {session.session_rpe}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    ) : (
                      // External Activity Layout
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center text-2xl">
                            {getSportIcon(session.sport_type || 'other')}
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {session.name || session.sport_type}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(session.session_date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
                                day: 'numeric',
                                month: 'short'
                              })}
                              {session.source && (
                                <>
                                  <span>•</span>
                                  <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded text-xs font-medium">
                                    {session.source}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right space-y-0.5">
                            {session.duration_seconds && (
                              <div className="flex items-center gap-1.5 text-sm text-gray-900 dark:text-white">
                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                <span className="font-semibold">{formatDuration(session.duration_seconds)}</span>
                              </div>
                            )}
                            {session.distance_meters && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {formatDistance(session.distance_meters)}
                              </div>
                            )}
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Activity className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {language === 'es' ? 'Sin datos de rendimiento' : 'No Performance Data'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'es'
              ? 'Completa sesiones de entrenamiento para ver tu análisis de rendimiento'
              : 'Complete training sessions to see your performance analysis'}
          </p>
        </div>
      )}

      {/* Session Details Modal */}
      {showSessionModal && selectedSession && (
        <SessionDetailsModal
          session={selectedSession}
          onClose={() => setShowSessionModal(false)}
          language={language}
          formatDuration={formatDuration}
          formatDistance={formatDistance}
          getSportIcon={getSportIcon}
        />
      )}
    </div>
  );
}

// Session Details Modal Component
interface SessionDetailsModalProps {
  session: RecentSession;
  onClose: () => void;
  language: string;
  formatDuration: (seconds: number) => string;
  formatDistance: (meters: number) => string;
  getSportIcon: (sportType: string) => string;
}

function SessionDetailsModal({ session, onClose, language, formatDuration, formatDistance, getSportIcon }: SessionDetailsModalProps) {
  const [exerciseLogs, setExerciseLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session.session_type === 'gym') {
      loadExerciseLogs();
    } else {
      setLoading(false);
    }
  }, [session.id]);

  const loadExerciseLogs = async () => {
    setLoading(true);

    const athleteWorkoutId = (session as any).athlete_workout_id;

    if (!athleteWorkoutId) {
      setExerciseLogs([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('training_logs')
      .select(`
        weight_used,
        reps_completed,
        rir,
        set_number,
        logged_at,
        workout_exercise_id,
        workout_exercises(
          exercise_id,
          exercises(id, exercise, exercise_en, exercise_es)
        )
      `)
      .eq('athlete_workout_id', athleteWorkoutId)
      .order('set_number', { ascending: true });

    if (!error && data && data.length > 0) {
      const exerciseMap = new Map<string, any>();
      data.forEach((log: any) => {
        const ex = log.workout_exercises?.exercises;
        if (!ex) return;
        const exId = ex.id;
        const exName = language === 'es'
          ? (ex.exercise_es || ex.exercise || ex.exercise_en || 'Sin nombre')
          : (ex.exercise_en || ex.exercise || 'Unnamed');
        if (!exerciseMap.has(exId)) {
          exerciseMap.set(exId, {
            exercise_name: exName,
            sets: 0,
            max_weight: 0,
            total_reps: 0,
            rir_values: [] as number[],
          });
        }
        const entry = exerciseMap.get(exId)!;
        if ((log.weight_used || 0) > 0 || (log.reps_completed || 0) > 0) {
          entry.sets += 1;
          entry.total_reps += log.reps_completed || 0;
          if ((log.weight_used || 0) > entry.max_weight) entry.max_weight = log.weight_used;
          if (log.rir !== null && log.rir !== undefined) entry.rir_values.push(log.rir);
        }
      });
      setExerciseLogs(Array.from(exerciseMap.values()));
    } else {
      setExerciseLogs([]);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {session.session_type === 'gym' ? (
          // Gym Session Details
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-[#514163] dark:bg-[#fdda36]/20 flex items-center justify-center">
                  <Dumbbell className="w-6 h-6 text-white dark:text-[#fdda36]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {language === 'es' ? 'Entrenamiento de Fuerza' : 'Strength Training'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(session.session_date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Session Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{language === 'es' ? 'Volumen Total' : 'Total Volume'}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {((session.total_volume || 0) / 1000).toFixed(1)} t
                </p>
              </div>
              {session.duration_minutes && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{language === 'es' ? 'Duración' : 'Duration'}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {session.duration_minutes} min
                  </p>
                </div>
              )}
              {session.session_rpe && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">RPE</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {session.session_rpe}/10
                  </p>
                </div>
              )}
            </div>

            {/* Exercise List */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {language === 'es' ? 'Ejercicios' : 'Exercises'}
              </h4>
              {loading ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {language === 'es' ? 'Cargando ejercicios...' : 'Loading exercises...'}
                </div>
              ) : exerciseLogs.length > 0 ? (
                exerciseLogs.map((log, index) => (
                  <div key={index} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p className="font-medium text-gray-900 dark:text-white mb-2">
                      {log.exercise_name}
                    </p>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      {log.sets > 0 && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">{language === 'es' ? 'Series:' : 'Sets:'}</span>
                          <span className="ml-1 font-semibold text-gray-900 dark:text-white">{log.sets}</span>
                        </div>
                      )}
                      {log.total_reps > 0 && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">{language === 'es' ? 'Reps tot:' : 'Total reps:'}</span>
                          <span className="ml-1 font-semibold text-gray-900 dark:text-white">{log.total_reps}</span>
                        </div>
                      )}
                      {log.max_weight > 0 && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">{language === 'es' ? 'Máx:' : 'Max:'}</span>
                          <span className="ml-1 font-semibold text-gray-900 dark:text-white">{log.max_weight} kg</span>
                        </div>
                      )}
                      {log.rir_values?.length > 0 && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">RIR:</span>
                          <span className="ml-1 font-semibold text-gray-900 dark:text-white">
                            {Math.round(log.rir_values.reduce((s: number, v: number) => s + v, 0) / log.rir_values.length)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {language === 'es' ? 'No hay ejercicios registrados' : 'No exercises recorded'}
                </p>
              )}
            </div>
          </>
        ) : (
          // External Activity Details
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center text-3xl">
                  {getSportIcon(session.sport_type || 'other')}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {session.name || session.sport_type}
                  </h3>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(session.session_date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    {session.source && (
                      <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded text-xs font-medium">
                        {session.source}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Metrics */}
            <div className="grid grid-cols-2 gap-4">
              {session.duration_seconds && (
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {language === 'es' ? 'Duración' : 'Duration'}
                    </p>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {formatDuration(session.duration_seconds)}
                  </p>
                </div>
              )}

              {session.distance_meters && (
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-gray-400" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {language === 'es' ? 'Distancia' : 'Distance'}
                    </p>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {formatDistance(session.distance_meters)}
                  </p>
                </div>
              )}

              {session.elevation_gain_meters && (
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Mountain className="w-4 h-4 text-gray-400" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {language === 'es' ? 'Desnivel' : 'Elevation Gain'}
                    </p>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {Math.round(session.elevation_gain_meters)} m
                  </p>
                </div>
              )}

              {session.average_heartrate && (
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Heart className="w-4 h-4 text-gray-400" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {language === 'es' ? 'FC Promedio' : 'Avg Heart Rate'}
                    </p>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {session.average_heartrate} bpm
                  </p>
                </div>
              )}

              {session.average_power && (
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-gray-400" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {language === 'es' ? 'Potencia Promedio' : 'Avg Power'}
                    </p>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {Math.round(session.average_power)} W
                  </p>
                </div>
              )}

              {session.user_rpe && (
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-gray-400" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">RPE</p>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {session.user_rpe}/10
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="mt-6 w-full bg-[#514163] hover:bg-[#3a2f4a] text-white rounded-lg py-2 font-medium transition-colors"
        >
          {language === 'es' ? 'Cerrar' : 'Close'}
        </button>
      </div>
    </div>
  );
}
