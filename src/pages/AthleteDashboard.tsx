import { useEffect, useState } from 'react';
import {
  Calendar,
  TrendingUp,
  Activity,
  Target,
  Zap,
  Dumbbell,
  Apple,
  MessageSquare,
  CheckCircle,
  Clock,
  Flame,
  Heart,
  Moon,
  Droplet,
  BookOpen,
  Bell,
  User,
  ChevronLeft,
  ChevronRight,
  Play,
  Timer,
  ChevronDown,
  ChevronUp,
  FileText,
  ClipboardList,
  Link2,
  Plus,
  Brain,
  Sparkles,
  GraduationCap,
  FlaskConical,
  Scan,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import ExternalPlannerWidget from '../components/planner/ExternalPlannerWidget';
import WellnessCheckinModal from '../components/training/wellness/WellnessCheckinModal';

interface AthleteDashboardProps {
  onNavigate?: (page: string) => void;
}

interface WorkoutAssignment {
  id: string;
  scheduled_date: string;
  status: string;
  source?: string;
  external_title?: string;
  raw_description?: string;
  workouts: {
    name: string;
    description: string | null;
  } | null;
}

interface DashboardStats {
  readinessScore: number;
  todayWorkouts: number;
  upcomingSessions: number;
  completedThisWeek: number;
  nutritionAdherence: number;
  sleepHours: number;
  stressLevel: number;
  hydration: number;
  unreadDigestArticles: number;
}

interface WeekDay {
  date: string;
  dayName: string;
  hasWorkout: boolean;
  status: 'completed' | 'pending' | 'rest';
  workoutCount: number;
}

interface NutritionMeal {
  id: string;
  meal_type: string;
  meal_name: string;
  meal_time: string | null;
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  items: Array<{
    id: string;
    name: string;
    quantity_g: number | null;
    unit: string;
    calories: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
  }>;
}

interface TodayNutritionData {
  planName: string | null;
  dayName: string | null;
  training_intensity: string | null;
  totalKcal: number | null;
  totalProtein: number | null;
  totalCarbs: number | null;
  totalFat: number | null;
  meals: NutritionMeal[];
  notes: string | null;
}

export default function AthleteDashboard({ onNavigate }: AthleteDashboardProps) {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [todayWorkouts, setTodayWorkouts] = useState<WorkoutAssignment[]>([]);
  const [weekView, setWeekView] = useState<WeekDay[]>([]);
  const [nextDaysView, setNextDaysView] = useState<any[]>([]);
  const [nextDaysOffset, setNextDaysOffset] = useState(1);
  const [trainerInfo, setTrainerInfo] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats>({
    readinessScore: 0,
    todayWorkouts: 0,
    upcomingSessions: 0,
    completedThisWeek: 0,
    nutritionAdherence: 0,
    sleepHours: 0,
    stressLevel: 0,
    hydration: 0,
    unreadDigestArticles: 0
  });
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState('');
  const [todayNutrition, setTodayNutrition] = useState<TodayNutritionData>({
    planName: null,
    dayName: null,
    training_intensity: null,
    totalKcal: null,
    totalProtein: null,
    totalCarbs: null,
    totalFat: null,
    meals: [],
    notes: null
  });
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set());
  const [todayHabits, setTodayHabits] = useState<any[]>([]);
  const [unreadDigestArticles, setUnreadDigestArticles] = useState<any[]>([]);
  const [nutritionSatelliteUrl, setNutritionSatelliteUrl] = useState<string | null>(null);
  const [satelliteUrls, setSatelliteUrls] = useState<Record<string, string>>({});
  const [showWellnessCheckin, setShowWellnessCheckin] = useState(false);
  const [wellnessChecked, setWellnessChecked] = useState(false);
  const [todayWellnessScore, setTodayWellnessScore] = useState<number | null>(null);
  const [wellnessData, setWellnessData] = useState<any>(null);

  const navigate = (page: string) => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: page }));
  };

  const openSatelliteWithToken = async (url: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-session-token`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        }
      );
      if (!response.ok) {
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }
      const data = await response.json();
      const finalUrl = data.success && data.token ? `${url}?session_token=${data.token}` : url;
      window.open(finalUrl, '_blank', 'noopener,noreferrer');
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

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

  const getDatePlusDays = (dateStr: string, days: number): string => {
    const date = parseDateStr(dateStr);
    date.setDate(date.getDate() + days);
    return formatDateLocal(date);
  };

  const openNutrition = () => {
    if (nutritionSatelliteUrl) {
      window.open(nutritionSatelliteUrl, '_blank', 'noopener,noreferrer');
    } else {
      navigate('nutrition-dashboard');
    }
  };

  useEffect(() => {
    if (profile) {
      loadDashboardData();
      loadTodayNutrition();
      loadTodayHabits();
      loadUnreadDigest();
      loadNutritionSatellite();
      loadAllSatellites();
      loadTodayWellness();
    }
  }, [profile, language]);

  useEffect(() => {
    if (profile) {
      loadNextDays();
    }
  }, [profile, nextDaysOffset]);

  const loadDashboardData = async () => {
    if (!profile) return;

    try {
      const today = formatDateLocal(new Date());
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = formatDateLocal(weekAgo);
      const weekAgoTimestamp = weekAgo.toISOString();

      const weekEnd = getDatePlusDays(today, 6);

      const [workoutsToday, upcomingWorkouts, completedWeek, weekWorkouts, trainerData, digestData, extraTrainingToday, externalActivitiesToday, completedExtraWeek, completedExternalWeek, enduranceToday, enduranceWeek, enduranceUpcoming, endurancePlansWeek, trainingLogsToday] = await Promise.all([
        supabase
          .from('athlete_workouts')
          .select('id, scheduled_date, status, source, external_title, raw_description, workouts(name, description)')
          .eq('athlete_id', profile.id)
          .eq('scheduled_date', today),
        supabase
          .from('athlete_workouts')
          .select('id', { count: 'exact', head: true })
          .eq('athlete_id', profile.id)
          .gte('scheduled_date', today)
          .eq('status', 'pending'),
        supabase
          .from('athlete_workouts')
          .select('id', { count: 'exact', head: true })
          .eq('athlete_id', profile.id)
          .gte('scheduled_date', weekAgoStr)
          .eq('status', 'completed'),
        supabase
          .from('athlete_workouts')
          .select('id, scheduled_date, status, source, external_title')
          .eq('athlete_id', profile.id)
          .gte('scheduled_date', today)
          .lte('scheduled_date', weekEnd),
        profile.assigned_trainer_id ? supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', profile.assigned_trainer_id)
          .maybeSingle() : Promise.resolve({ data: null }),
        supabase
          .from('digest_articles')
          .select('id', { count: 'exact', head: true })
          .eq('is_published', true)
          .gte('published_date', weekAgoStr),
        supabase
          .from('extra_training_logs')
          .select('*')
          .eq('athlete_id', profile.id)
          .eq('training_date', today),
        supabase
          .from('external_activities')
          .select('*')
          .eq('user_id', profile.id)
          .is('deleted_at', null)
          .gte('start_time', `${today}T00:00:00`)
          .lte('start_time', `${today}T23:59:59`),
        supabase
          .from('extra_training_logs')
          .select('id', { count: 'exact', head: true })
          .eq('athlete_id', profile.id)
          .gte('training_date', weekAgoStr),
        supabase
          .from('external_activities')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .is('deleted_at', null)
          .gte('start_time', weekAgoTimestamp),
        supabase
          .from('external_endurance_workouts')
          .select('id, name, sport, scheduled_date, estimated_duration_minutes, intensity_basis, status, description')
          .eq('athlete_id', profile.id)
          .eq('scheduled_date', today),
        supabase
          .from('external_endurance_workouts')
          .select('id, scheduled_date, status, name, sport')
          .eq('athlete_id', profile.id)
          .gte('scheduled_date', today)
          .lte('scheduled_date', weekEnd),
        supabase
          .from('external_endurance_workouts')
          .select('id', { count: 'exact', head: true })
          .eq('athlete_id', profile.id)
          .gte('scheduled_date', today)
          .eq('status', 'pending'),
        supabase
          .from('external_endurance_plans')
          .select('id, week_start_date, plan_name, plan_data, planner_source')
          .eq('athlete_id', profile.id)
          .gte('week_start_date', getDatePlusDays(today, -6))
          .lte('week_start_date', weekEnd),
        supabase
          .from('training_logs')
          .select('id, logged_at, athlete_workout_id')
          .eq('athlete_id', profile.id)
          .gte('logged_at', `${today}T00:00:00.000Z`)
          .lte('logged_at', `${today}T23:59:59.999Z`)
          .limit(100)
      ]);

      // Combine all today's activities
      const formattedExtraTraining = (extraTrainingToday.data || []).map((et: any) => ({
        id: `extra-${et.id}`,
        name: et.activity_name,
        description: et.notes || '',
        scheduled_date: et.training_date,
        status: 'completed',
        source: 'extra',
        type: 'extra'
      }));

      const formattedExternalActivities = (externalActivitiesToday.data || [])
        .filter((ex: any) => {
          const activityDate = ex.local_date
            ? String(ex.local_date).substring(0, 10)
            : formatDateLocal(new Date(ex.start_time));
          return activityDate === today;
        })
        .map((ex: any) => ({
          id: `external-${ex.id}`,
          name: ex.name || ex.sport_type || 'External Activity',
          description: ex.user_notes || '',
          scheduled_date: today,
          status: 'completed',
          source: ex.source || 'strava',
          type: 'external',
          duration: ex.duration_seconds ? `${Math.round(ex.duration_seconds / 60)} min` : '',
          distance: ex.distance_meters ? (ex.distance_meters / 1000).toFixed(2) : null
        }));

      const completedAthleteWorkoutIds = new Set(
        (workoutsToday.data || [])
          .filter((w: any) => w.status === 'completed')
          .map((w: any) => w.id)
      );
      const seenLogWorkoutIds = new Set<string>();
      const formattedTrainingLogs = (trainingLogsToday.data || [])
        .filter((log: any) => {
          const awId = log.athlete_workout_id;
          if (awId && completedAthleteWorkoutIds.has(awId)) return false;
          if (awId) {
            if (seenLogWorkoutIds.has(awId)) return false;
            seenLogWorkoutIds.add(awId);
          } else {
            if (seenLogWorkoutIds.has(log.id)) return false;
            seenLogWorkoutIds.add(log.id);
          }
          return true;
        })
        .map((log: any) => ({
          id: `log-${log.athlete_workout_id || log.id}`,
          name: 'Gym Session',
          description: '',
          scheduled_date: today,
          status: 'completed',
          source: 'gym',
          type: 'gym',
          workouts: null
        }));

      const formattedEnduranceToday = (enduranceToday.data || []).map((ew: any) => ({
        id: `endurance-${ew.id}`,
        name: ew.name || ew.sport || 'Endurance Workout',
        description: ew.description || '',
        scheduled_date: ew.scheduled_date,
        status: ew.status || 'pending',
        source: 'endurance',
        type: 'endurance',
        duration: ew.estimated_duration_minutes ? `${ew.estimated_duration_minutes} min` : '',
        sport: ew.sport
      }));

      // Extract workouts from external_endurance_plans.plan_data.days
      const planDays: any[] = [];
      for (const plan of (endurancePlansWeek.data || [])) {
        const days: any[] = plan.plan_data?.days || [];
        for (const day of days) {
          if (day.date) {
            planDays.push({
              id: `plan-${plan.id}-${day.date}`,
              name: day.name || day.sport || 'Endurance Workout',
              description: day.description || day.notes || '',
              scheduled_date: day.date,
              status: day.completed ? 'completed' : 'pending',
              source: 'endurance_plan',
              type: 'endurance',
              duration: day.planned_duration_minutes ? `${day.planned_duration_minutes} min` : '',
              sport: day.sport,
              planner_source: plan.planner_source
            });
          }
        }
      }

      const planDaysToday = planDays.filter(d => d.scheduled_date === today);
      const planDaysWeek = planDays.filter(d => d.scheduled_date >= today && d.scheduled_date <= weekEnd);

      const allTodayWorkouts = [
        ...(workoutsToday.data || []),
        ...formattedExtraTraining,
        ...formattedExternalActivities,
        ...formattedTrainingLogs,
        ...formattedEnduranceToday,
        ...planDaysToday
      ];

      setTodayWorkouts(allTodayWorkouts);
      setTrainerInfo(trainerData.data);

      const combinedWeekWorkouts = [
        ...(weekWorkouts.data || []),
        ...(enduranceWeek.data || []).map((ew: any) => ({
          id: `endurance-${ew.id}`,
          scheduled_date: ew.scheduled_date,
          status: ew.status || 'pending',
          source: 'endurance',
          external_title: ew.name || ew.sport || 'Endurance'
        })),
        ...planDaysWeek.map(d => ({
          id: d.id,
          scheduled_date: d.scheduled_date,
          status: d.status,
          source: 'endurance_plan',
          external_title: d.name
        }))
      ];

      const week = generateWeekView(today, combinedWeekWorkouts);
      setWeekView(week);

      const planPendingCount = planDays.filter(d => d.scheduled_date >= today && d.status === 'pending').length;
      const totalCompletedWeek = (completedWeek.count || 0) + (completedExtraWeek.count || 0) + (completedExternalWeek.count || 0);
      const totalUpcoming = (upcomingWorkouts.count || 0) + (enduranceUpcoming.count || 0) + planPendingCount;

      setStats(prev => ({
        ...prev,
        todayWorkouts: allTodayWorkouts.length,
        upcomingSessions: totalUpcoming,
        completedThisWeek: totalCompletedWeek,
        nutritionAdherence: 0,
        unreadDigestArticles: digestData.count || 0
      }));

      setAiInsight(prev => prev || generateAIInsight(0, (completedWeek.count || 0)));
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const generateWeekView = (today: string, workouts: any[]): WeekDay[] => {
    const week: WeekDay[] = [];
    const dayNames = language === 'es'
      ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < 7; i++) {
      const date = parseDateStr(today);
      date.setDate(date.getDate() + i);
      const dateStr = formatDateLocal(date);

      const dayWorkouts = workouts.filter(w => w.scheduled_date === dateStr);
      const hasWorkout = dayWorkouts.length > 0;
      const allCompleted = dayWorkouts.length > 0 && dayWorkouts.every(w => w.status === 'completed');
      const hasPending = dayWorkouts.some(w => w.status === 'pending');

      week.push({
        date: dateStr,
        dayName: dayNames[date.getDay()],
        hasWorkout,
        status: !hasWorkout ? 'rest' : allCompleted ? 'completed' : hasPending ? 'pending' : 'rest',
        workoutCount: dayWorkouts.length
      });
    }

    return week;
  };

  const loadTodayWellness = async () => {
    if (!profile) return;
    const today = formatDateLocal(new Date());
    const { data } = await supabase
      .from('wellness_checkins')
      .select('*')
      .eq('athlete_id', profile.id)
      .eq('checkin_date', today)
      .maybeSingle();

    if (data) {
      setWellnessChecked(true);
      setWellnessData(data);
      const score = data.wellness_score_100 ?? data.overall_score ?? 0;
      setTodayWellnessScore(score);
      setStats(prev => ({
        ...prev,
        readinessScore: Math.round(score),
        sleepHours: data.sleep_hours || 0,
        stressLevel: data.stress_level_10 || data.stress_level || 0,
        hydration: data.urine_color ? Math.max(0, Math.round(((8 - data.urine_color) / 7) * 100)) : (data.hydration === 'high' ? 100 : data.hydration === 'normal' ? 60 : 20),
      }));
      setAiInsight(generateReadinessInsight(Math.round(score), data));
    }
  };

  const generateReadinessInsight = (readiness: number, d: any): string => {
    const es = language === 'es';
    const fatigue = d?.fatigue_level_10 ?? d?.fatigue_level ?? 5;
    const avgSoreness = d?.lower_body_soreness && d?.upper_body_soreness
      ? Math.round((d.lower_body_soreness + d.upper_body_soreness + (d.back_soreness || 5)) / 3)
      : d?.muscle_soreness ?? 3;
    const soreness = avgSoreness;
    const sleep = d?.sleep_duration === '>8h' ? 8.5 : d?.sleep_duration === '7-8h' ? 7.5 : d?.sleep_duration === '6-7h' ? 6.5 : d?.sleep_hours || 7;
    const motivation = d?.motivation_10 ?? d?.motivation ?? 5;

    if (readiness >= 85) {
      return es
        ? `Excelente estado hoy. Con ${sleep}h de sueño y alta motivación (${motivation}/10), estás listo para una sesión de alta intensidad.`
        : `Excellent state today. With ${sleep}h of sleep and high motivation (${motivation}/10), you're ready for high-intensity work.`;
    } else if (readiness >= 70) {
      return es
        ? `Buena preparación. Fatiga moderada (${fatigue}/10). Enfócate en técnica y volumen controlado hoy.`
        : `Good readiness. Moderate fatigue (${fatigue}/10). Focus on technique and controlled volume today.`;
    } else if (readiness >= 50) {
      if (soreness >= 7) {
        return es
          ? `Dolor muscular elevado (${soreness}/10). Considera movilidad o trabajo de baja intensidad hoy.`
          : `High muscle soreness (${soreness}/10). Consider mobility work or low-intensity training today.`;
      }
      return es
        ? `Carga acumulada detectada. Sesión de recuperación activa recomendada hoy.`
        : `Accumulated load detected. Active recovery session recommended today.`;
    } else {
      return es
        ? `Fatiga alta y solo ${sleep}h de sueño. Prioriza descanso y recuperación hoy.`
        : `High fatigue and only ${sleep}h of sleep. Prioritize rest and recovery today.`;
    }
  };

  const generateAIInsight = (readiness: number, completed: number): string => {
    if (language === 'es') {
      if (readiness >= 85) {
        return 'Excelente recuperación. Hoy es perfecto para entrenar zonas de alta intensidad.';
      } else if (readiness >= 70) {
        return 'Buena preparación. Enfócate en técnica y volumen moderado.';
      } else if (readiness >= 50) {
        return 'Carga moderada detectada. Considera entrenamiento de recuperación activa.';
      } else {
        return 'Necesitas recuperación. Prioriza descanso y movilidad hoy.';
      }
    } else {
      if (readiness >= 85) {
        return 'Excellent recovery. Today is perfect for high-intensity zones.';
      } else if (readiness >= 70) {
        return 'Good readiness. Focus on technique and moderate volume.';
      } else if (readiness >= 50) {
        return 'Moderate load detected. Consider active recovery training.';
      } else {
        return 'Recovery needed. Prioritize rest and mobility today.';
      }
    }
  };

  const getReadinessColor = (score: number) => {
    if (score >= 85) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 50) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getDayColor = (status: string) => {
    if (status === 'completed') return 'bg-green-500';
    if (status === 'pending') return 'bg-yellow-500';
    return 'bg-gray-300 dark:bg-gray-600';
  };

  const loadTodayNutrition = async () => {
    if (!profile) return;

    const emptyState: TodayNutritionData = {
      planName: null, dayName: null, training_intensity: null,
      totalKcal: null, totalProtein: null, totalCarbs: null, totalFat: null,
      meals: [], notes: null
    };

    try {
      const today = formatDateLocal(new Date());
      const jsDay = new Date().getDay();
      const weekDayNumber = jsDay === 0 ? 7 : jsDay;

      // Read both plan sources in parallel — same logic as satellite bridge, no edge function call
      const [pushedResult, externalResult] = await Promise.all([
        supabase
          .from('nutrition_pushed_plans')
          .select('id, plan_date, plan_duration_days, plan_name, summary, plan_data, notes, created_at')
          .eq('athlete_id', profile.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('external_nutrition_plans')
          .select('id, plan_name, plan_date, summary, plan_data, notes, updated_at')
          .eq('athlete_id', profile.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      // Pick the most recent, same tie-breaking as satellite bridge
      let plan: any = pushedResult.data;
      const ext = externalResult.data;
      if (ext) {
        const extTs = new Date(ext.updated_at).getTime();
        const pushedTs = plan ? new Date(plan.created_at).getTime() : 0;
        if (extTs >= pushedTs) {
          plan = {
            plan_name: ext.plan_name || 'Plan Nutricional',
            plan_date: ext.plan_date,
            plan_duration_days: ext.plan_data?.days?.length || 7,
            summary: ext.summary,
            plan_data: ext.plan_data,
            notes: ext.notes,
            created_at: ext.updated_at,
          };
        }
      }

      if (plan) {
        const days: any[] = plan.plan_data?.days || [];
        const planMode = plan.plan_data?.plan_mode;

        let dayIndex: number;
        if (planMode === 'calendar') {
          dayIndex = days.findIndex((d: any) => d.date === today);
          if (dayIndex === -1) dayIndex = 0;
        } else if (plan.plan_duration_days === 7) {
          dayIndex = weekDayNumber - 1;
        } else {
          const startDate = parseDateStr(plan.plan_date);
          const todayDate = parseDateStr(today);
          const diff = Math.floor((todayDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          dayIndex = ((diff % plan.plan_duration_days) + plan.plan_duration_days) % plan.plan_duration_days;
        }

        const todayData = days[dayIndex] || days[0];

        if (todayData) {
          const rawMeals: any[] = todayData.meals || [];
          const computedKcal = rawMeals.reduce((s, m) => s + (m.kcal ?? 0), 0);
          const computedProtein = rawMeals.reduce((s, m) => s + (m.protein_g ?? 0), 0);
          const computedCarbs = rawMeals.reduce((s, m) => s + (m.carbs_g ?? 0), 0);
          const computedFat = rawMeals.reduce((s, m) => s + (m.fat_g ?? 0), 0);
          const dayTargets = todayData.day_targets
            ?? (computedKcal > 0 ? { target_kcal: computedKcal, target_protein_g: computedProtein, target_carbs_g: computedCarbs, target_fat_g: computedFat } : null)
            ?? plan.summary;

          setTodayNutrition({
            planName: plan.plan_name,
            dayName: todayData.day_name || null,
            training_intensity: todayData.training_intensity || null,
            totalKcal: dayTargets?.target_kcal ?? null,
            totalProtein: dayTargets?.target_protein_g ?? null,
            totalCarbs: dayTargets?.target_carbs_g ?? null,
            totalFat: dayTargets?.target_fat_g ?? null,
            meals: rawMeals.map((meal: any, idx: number) => ({
              id: `meal-${idx}`,
              meal_type: meal.meal_type || 'other',
              meal_name: meal.meal_name || meal.name || '',
              meal_time: meal.meal_time || null,
              kcal: meal.kcal ?? null,
              protein_g: meal.protein_g ?? null,
              carbs_g: meal.carbs_g ?? null,
              fat_g: meal.fat_g ?? null,
              items: (meal.items || []).map((item: any, iIdx: number) => ({
                id: `item-${idx}-${iIdx}`,
                name: item.name || item.food_name || '',
                quantity_g: item.quantity_g ?? null,
                unit: item.unit || 'g',
                calories: item.calories ?? null,
                protein_g: item.protein_g ?? null,
                carbs_g: item.carbs_g ?? null,
                fat_g: item.fat_g ?? null,
              }))
            })),
            notes: plan.notes || null
          });
          return;
        }
      }

      setTodayNutrition(emptyState);
    } catch {
      setTodayNutrition(emptyState);
    }
  };

  const loadTodayHabits = async () => {
    if (!profile) return;

    try {
      const today = formatDateLocal(new Date());

      const { data: habits } = await supabase
        .from('habits')
        .select('id, name, habit_type, target_value, unit')
        .eq('user_id', profile.id)
        .eq('is_active', true)
        .limit(3);

      if (!habits) return;

      const { data: logs } = await supabase
        .from('habit_logs')
        .select('habit_id, completed')
        .eq('user_id', profile.id)
        .eq('log_date', today);

      const habitsWithStatus = habits.map(habit => ({
        ...habit,
        completed: logs?.find(l => l.habit_id === habit.id)?.completed || false
      }));

      setTodayHabits(habitsWithStatus);
    } catch {
    }
  };

  const loadNutritionSatellite = async () => {
    try {
      const { data } = await supabase
        .from('satellites')
        .select('url')
        .eq('name', 'nutrition')
        .eq('is_active', true)
        .maybeSingle();
      if (data?.url) setNutritionSatelliteUrl(data.url);
    } catch {
      // silently ignore - will fall back to internal nutrition page
    }
  };

  const loadAllSatellites = async () => {
    try {
      const { data } = await supabase
        .from('satellites')
        .select('name, url')
        .eq('is_active', true);
      if (data) {
        const urls: Record<string, string> = {};
        data.forEach((s: { name: string; url: string }) => { urls[s.name] = s.url; });
        setSatelliteUrls(urls);
      }
    } catch {
      // silently ignore
    }
  };

  const loadUnreadDigest = async () => {
    if (!profile) return;

    try {
      const { data } = await supabase
        .from('digest_articles')
        .select('id, title, published_date')
        .eq('is_published', true)
        .eq('language', language === 'es' ? 'es' : 'en')
        .lte('published_date', new Date().toISOString().split('T')[0])
        .order('published_date', { ascending: false })
        .limit(3);

      if (!data) return;

      const { data: reads } = await supabase
        .from('digest_article_reads')
        .select('article_id')
        .eq('user_id', profile.id)
        .in('article_id', data.map(a => a.id));

      const unread = data.filter(article =>
        !reads?.some(r => r.article_id === article.id)
      );

      setUnreadDigestArticles(unread);
    } catch {
    }
  };

  const toggleMeal = (mealId: string) => {
    setExpandedMeals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(mealId)) {
        newSet.delete(mealId);
      } else {
        newSet.add(mealId);
      }
      return newSet;
    });
  };

  const loadNextDays = async () => {
    if (!profile) return;

    try {
      const todayDate = new Date();
      const startOffset = nextDaysOffset;
      const endOffset = nextDaysOffset + 4;

      const startDate = new Date(todayDate);
      startDate.setDate(startDate.getDate() + startOffset);
      const endDate = new Date(todayDate);
      endDate.setDate(endDate.getDate() + endOffset);
      const startStr = formatDateLocal(startDate);
      const endStr = formatDateLocal(endDate);

      const [workoutsRange, extraRange, externalRange, enduranceRange, endurancePlansRange] = await Promise.all([
        supabase
          .from('athlete_workouts')
          .select('id, scheduled_date, status, source, external_title, workouts(name)')
          .eq('athlete_id', profile.id)
          .gte('scheduled_date', startStr)
          .lte('scheduled_date', endStr),
        supabase
          .from('extra_training_logs')
          .select('*')
          .eq('athlete_id', profile.id)
          .gte('training_date', startStr)
          .lte('training_date', endStr),
        supabase
          .from('external_activities')
          .select('*')
          .eq('user_id', profile.id)
          .is('deleted_at', null)
          .gte('start_time', `${startStr}T00:00:00`)
          .lte('start_time', `${endStr}T23:59:59`),
        supabase
          .from('external_endurance_workouts')
          .select('id, name, sport, scheduled_date, estimated_duration_minutes, status')
          .eq('athlete_id', profile.id)
          .gte('scheduled_date', startStr)
          .lte('scheduled_date', endStr),
        supabase
          .from('external_endurance_plans')
          .select('id, week_start_date, plan_name, plan_data, planner_source')
          .eq('athlete_id', profile.id)
          .gte('week_start_date', getDatePlusDays(startStr, -6))
          .lte('week_start_date', endStr)
      ]);

      const planDaysAll: any[] = [];
      for (const plan of (endurancePlansRange.data || [])) {
        const days: any[] = plan.plan_data?.days || [];
        for (const day of days) {
          if (day.date && day.date >= startStr && day.date <= endStr) {
            planDaysAll.push({
              type: 'endurance',
              source: 'endurance_plan',
              name: day.name || day.sport || 'Endurance Workout',
              status: day.completed ? 'completed' : 'pending',
              scheduled_date: day.date
            });
          }
        }
      }

      const days = [];
      for (let i = startOffset; i <= endOffset; i++) {
        const date = new Date(todayDate);
        date.setDate(date.getDate() + i);
        const dateStr = formatDateLocal(date);

        const filteredExternal = (externalRange.data || []).filter((ex: any) => {
          const activityDate = ex.local_date
            ? String(ex.local_date).substring(0, 10)
            : formatDateLocal(new Date(ex.start_time));
          return activityDate === dateStr;
        });

        const allWorkouts = [
          ...(workoutsRange.data || []).filter((w: any) => w.scheduled_date === dateStr),
          ...(extraRange.data || []).filter((e: any) => e.training_date === dateStr).map((et: any) => ({ type: 'extra', name: et.activity_name })),
          ...filteredExternal.map((ex: any) => ({ type: 'external', name: ex.name || ex.sport_type })),
          ...(enduranceRange.data || []).filter((ew: any) => ew.scheduled_date === dateStr).map((ew: any) => ({ type: 'endurance', source: 'endurance', name: ew.name || ew.sport || 'Endurance', status: ew.status || 'pending', scheduled_date: ew.scheduled_date })),
          ...planDaysAll.filter(d => d.scheduled_date === dateStr)
        ];

        days.push({
          date: dateStr,
          dateObj: date,
          workouts: allWorkouts
        });
      }

      setNextDaysView(days);
    } catch {
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#fdda36] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'es' ? 'Cargando tu dashboard...' : 'Loading your dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* SECTION 1: PERFORMANCE SNAPSHOT */}
        <div className="relative overflow-hidden">
          <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8">

            {/* Greeting */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-[#514163] to-[#fdda36] bg-clip-text text-transparent">
                  {language === 'es' ? '¡Hola,' : 'Hello,'} {profile?.full_name?.split(' ')[0]}!
                </h1>
                <p className="mt-1 text-gray-500 dark:text-gray-400 text-sm">
                  {new Date().toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                <Flame className="w-4 h-4 text-orange-500" />
                {stats.completedThisWeek} {language === 'es' ? 'esta semana' : 'this week'}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

              {/* Readiness Score Gauge */}
              <div className="lg:col-span-2 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-700/50 dark:to-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-600 relative overflow-hidden">
                {!wellnessChecked && (
                  <div className="absolute inset-0 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-10 gap-3 p-4">
                    <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center">
                      <Heart className="w-6 h-6 text-rose-500" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 text-center">
                      {language === 'es' ? 'Completa tu check-in para ver tu readiness' : 'Complete your check-in to see readiness'}
                    </p>
                    <button
                      onClick={() => setShowWellnessCheckin(true)}
                      className="px-4 py-2 bg-[#fdda36] text-[#514163] rounded-xl font-bold text-sm hover:bg-[#ffd51a] transition-colors"
                    >
                      {language === 'es' ? 'Check-in de bienestar' : 'Wellness check-in'}
                    </button>
                  </div>
                )}
                <div className="relative w-40 h-40">
                  <svg className="transform -rotate-90 w-40 h-40">
                    <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="none" className="text-gray-200 dark:text-gray-700" />
                    <circle
                      cx="80" cy="80" r="70"
                      stroke="currentColor" strokeWidth="12" fill="none"
                      strokeDasharray={`${2 * Math.PI * 70}`}
                      strokeDashoffset={`${2 * Math.PI * 70 * (1 - stats.readinessScore / 100)}`}
                      className={getReadinessColor(stats.readinessScore)}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-4xl font-bold ${getReadinessColor(stats.readinessScore)}`}>
                      {stats.readinessScore}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-0.5">
                      {language === 'es' ? 'Readiness' : 'Readiness'}
                    </span>
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <span className={`text-base font-bold ${getReadinessColor(stats.readinessScore)}`}>
                    {stats.readinessScore >= 85 ? (language === 'es' ? 'Óptimo' : 'Optimal') :
                     stats.readinessScore >= 70 ? (language === 'es' ? 'Bueno' : 'Good') :
                     stats.readinessScore >= 50 ? (language === 'es' ? 'Moderado' : 'Moderate') :
                     stats.readinessScore > 0 ? (language === 'es' ? 'Bajo' : 'Low') : '–'}
                  </span>
                </div>
              </div>

              {/* Right column: Insight + Wellness card */}
              <div className="lg:col-span-3 flex flex-col gap-4">

                {/* Readiness insight banner */}
                {wellnessChecked ? (
                  <div className={`p-5 rounded-2xl border-2 flex items-start gap-4 ${
                    stats.readinessScore >= 85
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                      : stats.readinessScore >= 70
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
                      : stats.readinessScore >= 50
                      ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                  }`}>
                    <div className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center ${
                      stats.readinessScore >= 85 ? 'bg-green-500' :
                      stats.readinessScore >= 70 ? 'bg-yellow-500' :
                      stats.readinessScore >= 50 ? 'bg-orange-500' : 'bg-red-500'
                    }`}>
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                        {language === 'es' ? 'Estado del día' : "Today's status"}
                      </p>
                      <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                        {aiInsight}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center gap-4">
                    <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <Brain className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {language === 'es'
                        ? 'El readiness se calcula a partir de tu check-in diario de bienestar.'
                        : 'Readiness is calculated from your daily wellness check-in.'}
                    </p>
                  </div>
                )}

                {/* Wellness card — tap to open / shows today's metrics */}
                <button
                  onClick={() => setShowWellnessCheckin(true)}
                  className={`group relative overflow-hidden rounded-2xl border-2 p-5 text-left transition-all hover:shadow-md ${
                    wellnessChecked
                      ? 'bg-gradient-to-br from-rose-50 to-white dark:from-rose-900/10 dark:to-gray-800/80 border-rose-200 dark:border-rose-800 hover:border-rose-400 dark:hover:border-rose-600'
                      : 'bg-gradient-to-br from-rose-50 to-white dark:from-rose-900/20 dark:to-gray-800/80 border-rose-300 dark:border-rose-700 hover:border-rose-500 dark:hover:border-rose-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`relative w-9 h-9 rounded-xl flex items-center justify-center ${wellnessChecked ? 'bg-rose-500' : 'bg-rose-400'}`}>
                        {!wellnessChecked && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse" />
                        )}
                        <Heart className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {language === 'es' ? 'Bienestar de Hoy' : "Today's Wellness"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {wellnessChecked
                            ? (language === 'es' ? 'Toca para editar' : 'Tap to edit')
                            : (language === 'es' ? 'Sin completar — toca para registrar' : 'Incomplete — tap to record')}
                        </p>
                      </div>
                    </div>
                    {wellnessChecked && todayWellnessScore !== null ? (
                      <span className={`text-2xl font-black ${todayWellnessScore >= 70 ? 'text-green-600 dark:text-green-400' : todayWellnessScore >= 45 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                        {Math.round(todayWellnessScore)}<span className="text-sm font-semibold text-gray-400">/100</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30 px-2 py-1 rounded-full">
                        <Plus className="w-3 h-3" />
                        {language === 'es' ? 'Registrar' : 'Record'}
                      </span>
                    )}
                  </div>

                  {/* Metrics pills — shown only if check-in done */}
                  {wellnessChecked && wellnessData && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white/70 dark:bg-gray-700/50 rounded-lg p-2 text-center">
                        <Moon className="w-3.5 h-3.5 text-blue-500 mx-auto mb-0.5" />
                        <p className="text-xs font-bold text-gray-900 dark:text-white">
                          {wellnessData.sleep_duration ?? wellnessData.sleep_hours ?? '–'}
                          {!wellnessData.sleep_duration && wellnessData.sleep_hours ? 'h' : ''}
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{language === 'es' ? 'Sueño' : 'Sleep'}</p>
                      </div>
                      <div className="bg-white/70 dark:bg-gray-700/50 rounded-lg p-2 text-center">
                        <Zap className="w-3.5 h-3.5 text-yellow-500 mx-auto mb-0.5" />
                        <p className="text-xs font-bold text-gray-900 dark:text-white">
                          {wellnessData.fatigue_level_10 ?? wellnessData.fatigue_level ?? '–'}/10
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{language === 'es' ? 'Fatiga' : 'Fatigue'}</p>
                      </div>
                      <div className="bg-white/70 dark:bg-gray-700/50 rounded-lg p-2 text-center">
                        <Brain className="w-3.5 h-3.5 text-green-500 mx-auto mb-0.5" />
                        <p className="text-xs font-bold text-gray-900 dark:text-white">
                          {wellnessData.motivation_10 ?? wellnessData.motivation ?? '–'}/10
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{language === 'es' ? 'Motivación' : 'Motivation'}</p>
                      </div>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: TODAY'S TRAINING & NEXT TRAININGS */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Today's Training - 3/4 width on large screens */}
          <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-[#514163] to-[#3a2f4a] px-6 py-4">
              <div className="flex items-center gap-3">
                <Dumbbell className="w-6 h-6 text-[#fdda36]" />
                <h2 className="text-xl font-bold text-white">
                  {language === 'es' ? 'Entrenamiento de Hoy' : "Today's Training"}
                </h2>
              </div>
            </div>

            <div className="p-6">
              {todayWorkouts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                    <Moon className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {language === 'es' ? 'Día de Descanso' : 'Rest Day'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {language === 'es'
                      ? 'No hay entrenamientos programados para hoy. ¡Disfruta tu descanso!'
                      : 'No workouts scheduled for today. Enjoy your rest!'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayWorkouts.map((workout) => (
                    <div
                      key={workout.id}
                      onClick={() => navigate(workout.type === 'external' ? 'external-activities' : 'training')}
                      className="p-5 bg-gradient-to-br from-gray-50 to-white dark:from-gray-700/30 dark:to-gray-800/30 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-[#fdda36] dark:hover:border-[#fdda36] transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            {workout.type === 'external' ? (
                              <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            ) : workout.type === 'extra' ? (
                              <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                            ) : (
                              <Dumbbell className="w-5 h-5 text-[#514163] dark:text-[#fdda36]" />
                            )}
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-[#514163] dark:group-hover:text-[#fdda36] transition-colors">
                              {workout.type === 'external'
                                ? workout.name
                                : workout.type === 'extra'
                                ? workout.name
                                : workout.source === 'trainingpeaks' && workout.external_title
                                ? workout.external_title
                                : workout.workouts?.name || 'Workout'}
                            </h3>
                          </div>
                          {workout.duration && (
                            <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
                              <Timer className="w-4 h-4" />
                              <span>{workout.duration}</span>
                            </div>
                          )}
                          {workout.distance && (
                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
                              <Activity className="w-4 h-4" />
                              <span>{workout.distance} km</span>
                            </div>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          workout.status === 'completed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : workout.status === 'skipped'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-[#fdda36] text-[#514163]'
                        }`}>
                          {workout.status === 'completed'
                            ? (language === 'es' ? 'Completado' : 'Completed')
                            : workout.status === 'skipped'
                            ? (language === 'es' ? 'Omitido' : 'Skipped')
                            : (language === 'es' ? 'Pendiente' : 'Pending')}
                        </span>
                      </div>
                      {workout.status === 'pending' && (
                        <div className="mt-4 flex items-center gap-2 text-sm text-[#514163] dark:text-[#fdda36] font-medium">
                          <Play className="w-4 h-4" />
                          {language === 'es' ? 'Iniciar entrenamiento' : 'Start workout'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Next Trainings - 1/4 width on large screens */}
          <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-white" />
                  <h3 className="text-lg font-bold text-white">
                    {language === 'es' ? 'Próximos' : 'Next'}
                  </h3>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setNextDaysOffset(Math.max(1, nextDaysOffset - 5))}
                    disabled={nextDaysOffset <= 1}
                    className="p-1 rounded hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={() => setNextDaysOffset(nextDaysOffset + 5)}
                    className="p-1 rounded hover:bg-white/20 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {nextDaysView.map((day, idx) => (
                <div
                  key={idx}
                  onClick={() => navigate('training')}
                  className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {day.dateObj.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      day.workouts.length > 0
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                    }`}>
                      {day.workouts.length || '-'}
                    </span>
                  </div>
                  {day.workouts.length > 0 ? (
                    <div className="space-y-1">
                      {day.workouts.slice(0, 2).map((workout: any, widx: number) => (
                        <div key={widx} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                          {workout.type === 'external' ? (
                            <Activity className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          ) : workout.type === 'extra' ? (
                            <Flame className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                          ) : (
                            <Dumbbell className="w-3 h-3 text-[#514163] dark:text-[#fdda36]" />
                          )}
                          <span className="truncate">{workout.workouts?.name || workout.name || 'Workout'}</span>
                        </div>
                      ))}
                      {day.workouts.length > 2 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                          +{day.workouts.length - 2} {language === 'es' ? 'más' : 'more'}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Moon className="w-3 h-3" />
                      <span>{language === 'es' ? 'Descanso' : 'Rest'}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 3: NUTRITION */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Nutrition Content - 3/4 width */}
          <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Apple className="w-4 h-4 text-emerald-200" />
                    <span className="text-emerald-200 text-xs font-medium uppercase tracking-wider">
                      {language === 'es' ? 'Nutrición de Hoy' : "Today's Nutrition"}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    {todayNutrition.planName || (language === 'es' ? 'Plan del Día' : "Today's Plan")}
                  </h2>
                  {todayNutrition.dayName && (
                    <p className="text-emerald-200 text-sm mt-0.5 capitalize">{todayNutrition.dayName}</p>
                  )}
                  {todayNutrition.training_intensity && (() => {
                    const intensityLabels: Record<string, {es: string, en: string, cls: string}> = {
                      high: { es: 'Alta Intensidad', en: 'High Intensity', cls: 'bg-red-400/30 text-red-100' },
                      moderate: { es: 'Intensidad Moderada', en: 'Moderate Intensity', cls: 'bg-amber-400/30 text-amber-100' },
                      low: { es: 'Baja Intensidad', en: 'Low Intensity', cls: 'bg-green-400/30 text-green-100' },
                      rest: { es: 'Día de Descanso', en: 'Rest Day', cls: 'bg-blue-400/30 text-blue-100' },
                    };
                    const cfg = intensityLabels[todayNutrition.training_intensity] ?? intensityLabels.moderate;
                    return (
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${cfg.cls}`}>
                        {language === 'es' ? cfg.es : cfg.en}
                      </span>
                    );
                  })()}
                </div>
                {todayNutrition.totalKcal !== null && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-3xl font-bold text-white">{Math.round(todayNutrition.totalKcal)}</p>
                    <p className="text-emerald-200 text-xs">kcal / {language === 'es' ? 'día' : 'day'}</p>
                  </div>
                )}
              </div>

              {/* Macros summary */}
              {(todayNutrition.totalProtein !== null || todayNutrition.totalCarbs !== null || todayNutrition.totalFat !== null) && (
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {[
                    { label: language === 'es' ? 'Proteínas' : 'Protein', value: todayNutrition.totalProtein, color: 'bg-blue-400/30' },
                    { label: language === 'es' ? 'Carbos' : 'Carbs', value: todayNutrition.totalCarbs, color: 'bg-amber-400/30' },
                    { label: language === 'es' ? 'Grasas' : 'Fat', value: todayNutrition.totalFat, color: 'bg-rose-400/30' },
                  ].map(m => (
                    <div key={m.label} className={`${m.color} rounded-xl p-3 text-center`}>
                      <p className="text-white font-bold text-lg">{m.value !== null ? Math.round(m.value) : '—'}<span className="text-xs font-normal ml-0.5">g</span></p>
                      <p className="text-emerald-100 text-xs">{m.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Meals */}
            <div className="p-4 space-y-2">
              {todayNutrition.meals.length > 0 ? (
                <>
                  {todayNutrition.meals.map((meal) => {
                    const isExpanded = expandedMeals.has(meal.id);
                    const mealTypeLabels: Record<string, {es: string, en: string}> = {
                      breakfast: { es: 'Desayuno', en: 'Breakfast' },
                      morning_snack: { es: 'Snack Mañana', en: 'Morning Snack' },
                      lunch: { es: 'Almuerzo', en: 'Lunch' },
                      afternoon_snack: { es: 'Snack Tarde', en: 'Afternoon Snack' },
                      dinner: { es: 'Cena', en: 'Dinner' },
                      evening_snack: { es: 'Snack Noche', en: 'Evening Snack' },
                      other: { es: 'Comida', en: 'Meal' },
                    };
                    const typeLabel = mealTypeLabels[meal.meal_type]?.[language as 'es' | 'en'] || meal.meal_type;
                    return (
                      <div key={meal.id} className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
                        <button
                          onClick={() => toggleMeal(meal.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Apple className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900 dark:text-white text-sm">
                                {meal.meal_name || typeLabel}
                              </p>
                              {meal.meal_time && (
                                <span className="text-xs text-gray-400">{meal.meal_time.slice(0, 5)}</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {meal.kcal !== null ? `${Math.round(meal.kcal)} kcal` : typeLabel}
                              {meal.protein_g !== null && ` · P:${Math.round(meal.protein_g)}g`}
                              {meal.carbs_g !== null && ` · C:${Math.round(meal.carbs_g)}g`}
                              {meal.fat_g !== null && ` · G:${Math.round(meal.fat_g)}g`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {meal.kcal !== null && (
                              <span className="text-xs font-bold text-orange-500">{Math.round(meal.kcal)} kcal</span>
                            )}
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                        </button>

                        {isExpanded && meal.items.length > 0 && (
                          <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 space-y-2 bg-gray-50/50 dark:bg-gray-700/20">
                            {meal.items.map((item) => (
                              <div key={item.id} className="flex items-start justify-between gap-3 py-1.5 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.name}</p>
                                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    {item.quantity_g && <span>{item.quantity_g}{item.unit}</span>}
                                    {item.calories !== null && <span className="text-orange-500 font-medium">{item.calories} kcal</span>}
                                    {item.protein_g !== null && <span>P:{item.protein_g}g</span>}
                                    {item.carbs_g !== null && <span>C:{item.carbs_g}g</span>}
                                    {item.fat_g !== null && <span>G:{item.fat_g}g</span>}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="text-center py-10">
                  <Apple className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {language === 'es'
                      ? 'No hay plan de nutrición cargado para hoy'
                      : 'No nutrition plan loaded for today'}
                  </p>
                  <button
                    onClick={() => navigate('nutrition-dashboard')}
                    className="mt-4 px-6 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors text-sm"
                  >
                    {language === 'es' ? 'Ver Nutrición' : 'View Nutrition'}
                  </button>
                </div>
              )}

              {/* Nutritionist Notes */}
              {todayNutrition.notes && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 mt-2">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-1 text-sm">
                        {language === 'es' ? 'Notas del Nutricionista' : 'Nutritionist Notes'}
                      </h4>
                      <p className="text-sm text-blue-800 dark:text-blue-300">{todayNutrition.notes}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Satellite Quick Access */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
              {language === 'es' ? 'Acceso Rápido' : 'Quick Access'}
            </p>

            <div className="grid grid-cols-2 gap-4">
              {/* Endurance Planner */}
              <button
                onClick={() => satelliteUrls.endurance
                  ? openSatelliteWithToken(satelliteUrls.endurance)
                  : undefined}
                className="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all p-6 text-left"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-transparent dark:from-blue-500/20 rounded-bl-full" />
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-500/30 dark:to-blue-600/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base mb-1">
                    Endurance
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Planner
                  </p>
                </div>
              </button>

              {/* Nutrition & Race Planner */}
              <button
                onClick={() => satelliteUrls.nutrition
                  ? openSatelliteWithToken(satelliteUrls.nutrition)
                  : openNutrition()}
                className="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all p-6 text-left"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-transparent dark:from-emerald-500/20 rounded-bl-full" />
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-500/30 dark:to-emerald-600/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Apple className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base mb-1">
                    {language === 'es' ? 'Nutrición' : 'Nutrition'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {language === 'es' ? '& Carrera' : '& Race'}
                  </p>
                </div>
              </button>

              {/* Physiology Lab */}
              <button
                onClick={() => satelliteUrls.lab
                  ? openSatelliteWithToken(satelliteUrls.lab)
                  : undefined}
                className="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:border-red-500 dark:hover:border-red-500 transition-all p-6 text-left"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-red-500/10 to-transparent dark:from-red-500/20 rounded-bl-full" />
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 dark:from-red-500/30 dark:to-red-600/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <FlaskConical className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base mb-1">
                    {language === 'es' ? 'Laboratorio' : 'Physiology'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {language === 'es' ? 'Fisiológico' : 'Lab'}
                  </p>
                </div>
              </button>

              {/* Motion - Developing */}
              <div className="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 opacity-50 p-6 text-left cursor-not-allowed">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/10 to-transparent dark:from-amber-500/20 rounded-bl-full" />
                <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                    {language === 'es' ? 'Desarrollo' : 'Developing'}
                  </span>
                </div>
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 dark:from-amber-500/30 dark:to-amber-600/20 rounded-lg flex items-center justify-center mb-4">
                    <Scan className="w-6 h-6 text-white opacity-60" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base mb-1">
                    Motion
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {language === 'es' ? 'Biomecánica' : 'Biomechanics'}
                  </p>
                </div>
              </div>

              {/* Academy */}
              <button
                onClick={() => satelliteUrls.academy
                  ? openSatelliteWithToken(satelliteUrls.academy)
                  : undefined}
                className="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:border-sky-500 dark:hover:border-sky-500 transition-all p-6 text-left"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-sky-500/10 to-transparent dark:from-sky-500/20 rounded-bl-full" />
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-sky-600 dark:from-sky-500/30 dark:to-sky-600/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base mb-1">
                    Academy
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {language === 'es' ? 'Aprendizaje' : 'Learning'}
                  </p>
                </div>
              </button>

              {/* Performance - Developing */}
              <div className="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 opacity-50 p-6 text-left cursor-not-allowed">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#514163]/10 to-transparent dark:from-[#514163]/20 rounded-bl-full" />
                <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
                  <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                    {language === 'es' ? 'Desarrollo' : 'Developing'}
                  </span>
                </div>
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#514163] to-[#3a2f4a] dark:from-[#514163]/30 dark:to-[#3a2f4a]/20 rounded-lg flex items-center justify-center mb-4">
                    <TrendingUp className="w-6 h-6 text-white dark:text-[#fdda36] opacity-60" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base mb-1">
                    Performance
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {language === 'es' ? 'Análisis' : 'Analytics'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: CHAT, HABITS, DIGEST */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat with Trainer */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-[#514163] to-[#3a2f4a] px-4 sm:px-6 py-4">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-[#fdda36]" />
                <h3 className="font-bold text-white">
                  {language === 'es' ? 'Mensajes' : 'Messages'}
                </h3>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              {trainerInfo && (
                <div className="flex items-center gap-3 mb-4">
                  {trainerInfo.avatar_url ? (
                    <img
                      src={trainerInfo.avatar_url}
                      alt={trainerInfo.full_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#514163] flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">
                      {trainerInfo.full_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {language === 'es' ? 'Entrenador' : 'Trainer'}
                    </p>
                  </div>
                </div>
              )}
              <button
                onClick={() => navigate('chat')}
                className="w-full px-4 py-2 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                {language === 'es' ? 'Abrir Chat' : 'Open Chat'}
              </button>
            </div>
          </div>

          {/* Today's Habits */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-6 py-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-white" />
                <h3 className="font-bold text-white">
                  {language === 'es' ? 'Hábitos de Hoy' : "Today's Habits"}
                </h3>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              {todayHabits.length > 0 ? (
                <ul className="space-y-3 mb-4">
                  {todayHabits.map((habit) => (
                    <li key={habit.id} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                        habit.completed ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}>
                        {habit.completed && <CheckCircle className="w-4 h-4 text-white" />}
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                          {habit.name}
                        </span>
                        {habit.target_value && habit.unit && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Target: {habit.target_value} {habit.unit}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {language === 'es' ? 'No hay hábitos configurados' : 'No habits configured'}
                </p>
              )}
              <button
                onClick={() => navigate('habits')}
                className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                {language === 'es' ? 'Ver Todos' : 'View All'}
              </button>
            </div>
          </div>

          {/* Performance Pills */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-800 to-gray-700 px-4 sm:px-6 py-4">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-white" />
                <h3 className="font-bold text-white">
                  {language === 'es' ? 'Píldoras de Rendimiento' : 'Performance Pills'}
                </h3>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              {unreadDigestArticles.length > 0 ? (
                <ul className="space-y-3 mb-4">
                  {unreadDigestArticles.map((article) => (
                    <li
                      key={article.id}
                      onClick={() => navigate('digest')}
                      className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg cursor-pointer transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                        {article.title}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {language === 'es' ? 'No hay artículos sin leer' : 'No unread articles'}
                </p>
              )}
              <button
                onClick={() => onNavigate?.('base-academy')}
                className="w-full px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {language === 'es' ? 'Leer tus Píldoras de Rendimiento' : 'Read Your Performance Pills'}
              </button>
            </div>
          </div>
        </div>

      </div>

      {showWellnessCheckin && (
        <WellnessCheckinModal
          athleteId={profile?.id}
          onClose={() => setShowWellnessCheckin(false)}
          onComplete={(score) => {
            setTodayWellnessScore(score);
            setWellnessChecked(true);
            loadTodayWellness();
          }}
        />
      )}
    </div>
  );
}
