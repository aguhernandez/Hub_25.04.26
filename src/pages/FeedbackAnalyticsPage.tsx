import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import {
  TrendingUp,
  Activity,
  AlertTriangle,
  Heart,
  Battery,
  Filter,
  Download,
  Calendar,
  Users,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  CheckCircle,
  BarChart3,
} from 'lucide-react';

interface FeedbackData {
  athlete_id: string;
  athlete_name: string;
  scheduled_date: string;
  completed_at: string;
  rpe: number | null;
  energy_level: string | null;
  pain_level: string | null;
  mood: string | null;
  feedback_notes: string | null;
}

interface AthleteStats {
  athlete_id: string;
  athlete_name: string;
  last_rpe: number | null;
  avg_rpe: number;
  pain_reported: boolean;
  pain_sessions: number;
  avg_energy: number;
  last_session_date: string;
  consecutive_high_rpe: number;
  consecutive_pain: number;
}

interface OverviewStats {
  avg_rpe_7d: number;
  avg_rpe_30d: number;
  pain_pct_7d: number;
  pain_pct_30d: number;
  avg_energy_7d: number;
  avg_energy_30d: number;
  avg_mood_7d: number;
  avg_mood_30d: number;
}

interface TrendDataPoint {
  date: string;
  rpe: number;
  pain: number;
  energy: number;
  mood: number;
}

export default function FeedbackAnalyticsPage() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [feedbackData, setFeedbackData] = useState<FeedbackData[]>([]);
  const [athleteStats, setAthleteStats] = useState<AthleteStats[]>([]);
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [alerts, setAlerts] = useState<AthleteStats[]>([]);

  const [selectedAthlete, setSelectedAthlete] = useState<string>('all');
  const [dateRange, setDateRange] = useState<number>(30);
  const [selectedMetric, setSelectedMetric] = useState<'rpe' | 'energy' | 'pain' | 'mood'>('rpe');
  const [expandedAthlete, setExpandedAthlete] = useState<string | null>(null);
  const [athletes, setAthletes] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (profile?.id) {
      loadAthletes();
      loadFeedbackData();
    }
  }, [profile?.id, dateRange, selectedAthlete]);

  const loadAthletes = async () => {
    if (!profile?.id) return;

    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('assigned_trainer_id', profile.id);

    if (data) {
      setAthletes(
        data.map((a) => ({
          id: a.id,
          name: a.full_name || a.email || 'Unknown',
        }))
      );
    }
  };

  const loadFeedbackData = async () => {
    if (!profile?.id) return;
    setLoading(true);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange);

    let query = supabase
      .from('athlete_workouts')
      .select(
        `
        athlete_id,
        scheduled_date,
        completed_at,
        rpe,
        energy_level,
        pain_level,
        mood,
        feedback_notes,
        profiles!athlete_workouts_athlete_id_fkey (
          full_name,
          email
        )
      `
      )
      .eq('trainer_id', profile.id)
      .eq('status', 'completed')
      .gte('completed_at', startDate.toISOString())
      .order('completed_at', { ascending: true });

    if (selectedAthlete !== 'all') {
      query = query.eq('athlete_id', selectedAthlete);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading feedback:', error);
      setLoading(false);
      return;
    }

    const formatted: FeedbackData[] =
      data?.map((item: any) => ({
        athlete_id: item.athlete_id,
        athlete_name: item.profiles?.full_name || item.profiles?.email || 'Unknown',
        scheduled_date: item.scheduled_date,
        completed_at: item.completed_at,
        rpe: item.rpe,
        energy_level: item.energy_level,
        pain_level: item.pain_level,
        mood: item.mood,
        feedback_notes: item.feedback_notes,
      })) || [];

    setFeedbackData(formatted);
    calculateStats(formatted);
    setLoading(false);
  };

  const calculateStats = (data: FeedbackData[]) => {
    const athleteMap = new Map<string, FeedbackData[]>();
    data.forEach((item) => {
      if (!athleteMap.has(item.athlete_id)) {
        athleteMap.set(item.athlete_id, []);
      }
      athleteMap.get(item.athlete_id)!.push(item);
    });

    const stats: AthleteStats[] = [];
    const alertList: AthleteStats[] = [];

    athleteMap.forEach((sessions, athleteId) => {
      const sortedSessions = sessions.sort(
        (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
      );

      const rpeValues = sessions.filter((s) => s.rpe !== null).map((s) => s.rpe!);
      const avgRpe = rpeValues.length > 0 ? rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length : 0;

      const painSessions = sessions.filter(
        (s) => s.pain_level === 'moderate' || s.pain_level === 'strong'
      ).length;

      const energyMap = { very_low: 1, low: 2, normal: 3, high: 4, very_high: 5 };
      const energyValues = sessions
        .filter((s) => s.energy_level)
        .map((s) => energyMap[s.energy_level as keyof typeof energyMap] || 3);
      const avgEnergy =
        energyValues.length > 0 ? energyValues.reduce((a, b) => a + b, 0) / energyValues.length : 3;

      let consecutiveHighRpe = 0;
      let consecutivePain = 0;
      for (let i = 0; i < Math.min(3, sortedSessions.length); i++) {
        if (sortedSessions[i].rpe && sortedSessions[i].rpe! > 9) consecutiveHighRpe++;
        if (
          sortedSessions[i].pain_level === 'moderate' ||
          sortedSessions[i].pain_level === 'strong'
        )
          consecutivePain++;
      }

      const athleteStat: AthleteStats = {
        athlete_id: athleteId,
        athlete_name: sortedSessions[0].athlete_name,
        last_rpe: sortedSessions[0].rpe,
        avg_rpe: avgRpe,
        pain_reported: painSessions > 0,
        pain_sessions: painSessions,
        avg_energy: avgEnergy,
        last_session_date: sortedSessions[0].completed_at,
        consecutive_high_rpe: consecutiveHighRpe,
        consecutive_pain: consecutivePain,
      };

      stats.push(athleteStat);

      if (consecutiveHighRpe >= 2 || consecutivePain >= 2) {
        alertList.push(athleteStat);
      }
    });

    setAthleteStats(stats);
    setAlerts(alertList);

    calculateOverview(data);
    calculateTrends(data);
  };

  const calculateOverview = (data: FeedbackData[]) => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const data7d = data.filter((d) => new Date(d.completed_at) >= sevenDaysAgo);
    const data30d = data.filter((d) => new Date(d.completed_at) >= thirtyDaysAgo);

    const energyMap = { very_low: 1, low: 2, normal: 3, high: 4, very_high: 5 };
    const moodMap = { very_low: 1, low: 2, normal: 3, high: 4, very_high: 5 };

    const calcAvgRpe = (arr: FeedbackData[]) => {
      const rpes = arr.filter((d) => d.rpe !== null).map((d) => d.rpe!);
      return rpes.length > 0 ? rpes.reduce((a, b) => a + b, 0) / rpes.length : 0;
    };

    const calcPainPct = (arr: FeedbackData[]) => {
      const painCount = arr.filter(
        (d) => d.pain_level === 'moderate' || d.pain_level === 'strong'
      ).length;
      return arr.length > 0 ? (painCount / arr.length) * 100 : 0;
    };

    const calcAvgEnergy = (arr: FeedbackData[]) => {
      const energies = arr
        .filter((d) => d.energy_level)
        .map((d) => energyMap[d.energy_level as keyof typeof energyMap] || 3);
      return energies.length > 0 ? energies.reduce((a, b) => a + b, 0) / energies.length : 3;
    };

    const calcAvgMood = (arr: FeedbackData[]) => {
      const moods = arr
        .filter((d) => d.mood)
        .map((d) => moodMap[d.mood as keyof typeof moodMap] || 3);
      return moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : 3;
    };

    setOverviewStats({
      avg_rpe_7d: calcAvgRpe(data7d),
      avg_rpe_30d: calcAvgRpe(data30d),
      pain_pct_7d: calcPainPct(data7d),
      pain_pct_30d: calcPainPct(data30d),
      avg_energy_7d: calcAvgEnergy(data7d),
      avg_energy_30d: calcAvgEnergy(data30d),
      avg_mood_7d: calcAvgMood(data7d),
      avg_mood_30d: calcAvgMood(data30d),
    });
  };

  const calculateTrends = (data: FeedbackData[]) => {
    const dateMap = new Map<string, { rpe: number[]; pain: number[]; energy: number[]; mood: number[] }>();

    const energyMap = { very_low: 1, low: 2, normal: 3, high: 4, very_high: 5 };
    const moodMap = { very_low: 1, low: 2, normal: 3, high: 4, very_high: 5 };
    const painMap = { none: 0, mild: 1, moderate: 2, strong: 3 };

    data.forEach((d) => {
      const date = new Date(d.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!dateMap.has(date)) {
        dateMap.set(date, { rpe: [], pain: [], energy: [], mood: [] });
      }

      const point = dateMap.get(date)!;
      if (d.rpe) point.rpe.push(d.rpe);
      if (d.pain_level) point.pain.push(painMap[d.pain_level as keyof typeof painMap] || 0);
      if (d.energy_level) point.energy.push(energyMap[d.energy_level as keyof typeof energyMap] || 3);
      if (d.mood) point.mood.push(moodMap[d.mood as keyof typeof moodMap] || 3);
    });

    const trends: TrendDataPoint[] = Array.from(dateMap.entries()).map(([date, values]) => ({
      date,
      rpe: values.rpe.length > 0 ? values.rpe.reduce((a, b) => a + b, 0) / values.rpe.length : 0,
      pain: values.pain.length > 0 ? values.pain.reduce((a, b) => a + b, 0) / values.pain.length : 0,
      energy: values.energy.length > 0 ? values.energy.reduce((a, b) => a + b, 0) / values.energy.length : 3,
      mood: values.mood.length > 0 ? values.mood.reduce((a, b) => a + b, 0) / values.mood.length : 3,
    }));

    setTrendData(trends);
  };

  const exportCSV = () => {
    const headers = ['Athlete,Date,RPE,Energy,Pain,Mood,Notes'];
    const rows = feedbackData.map((d) =>
      [
        d.athlete_name,
        new Date(d.completed_at).toLocaleDateString(),
        d.rpe || '',
        d.energy_level || '',
        d.pain_level || '',
        d.mood || '',
        `"${d.feedback_notes || ''}"`,
      ].join(',')
    );

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedback-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getStatusColor = (value: number, type: 'rpe' | 'pain' | 'energy' | 'mood'): string => {
    if (type === 'rpe') {
      if (value >= 9) return 'text-red-600 dark:text-red-400';
      if (value >= 7) return 'text-orange-600 dark:text-orange-400';
      return 'text-green-600 dark:text-green-400';
    }
    if (type === 'pain') {
      if (value >= 25) return 'text-red-600 dark:text-red-400';
      if (value >= 10) return 'text-orange-600 dark:text-orange-400';
      return 'text-green-600 dark:text-green-400';
    }
    if (type === 'energy' || type === 'mood') {
      if (value >= 4) return 'text-green-600 dark:text-green-400';
      if (value >= 2.5) return 'text-orange-600 dark:text-orange-400';
      return 'text-red-600 dark:text-red-400';
    }
    return 'text-gray-600 dark:text-gray-400';
  };

  const getStatusEmoji = (avgRpe: number, painPct: number): string => {
    if (avgRpe >= 9 || painPct >= 25) return '🔴';
    if (avgRpe >= 7 || painPct >= 10) return '🟡';
    return '🟢';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-[#514163] dark:text-[#fdda36]" />
              {language === 'es' ? 'Análisis de Feedback' : 'Feedback Analytics'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {language === 'es'
                ? 'Análisis detallado del feedback post-entrenamiento de tus atletas'
                : 'Detailed analysis of your athletes post-training feedback'}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {language === 'es' ? 'Filtros' : 'Filters'}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                {language === 'es' ? 'Atleta' : 'Athlete'}
              </label>
              <select
                value={selectedAthlete}
                onChange={(e) => setSelectedAthlete(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                <option value="all">{language === 'es' ? 'Todos los atletas' : 'All athletes'}</option>
                {athletes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                {language === 'es' ? 'Rango de Fechas' : 'Date Range'}
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                <option value={7}>{language === 'es' ? 'Últimos 7 días' : 'Last 7 days'}</option>
                <option value={30}>{language === 'es' ? 'Últimos 30 días' : 'Last 30 days'}</option>
                <option value={90}>{language === 'es' ? 'Últimos 90 días' : 'Last 90 days'}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Activity className="w-4 h-4 inline mr-1" />
                {language === 'es' ? 'Métrica' : 'Metric'}
              </label>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                <option value="rpe">RPE</option>
                <option value="energy">{language === 'es' ? 'Energía' : 'Energy'}</option>
                <option value="pain">{language === 'es' ? 'Dolor' : 'Pain'}</option>
                <option value="mood">{language === 'es' ? 'Ánimo' : 'Mood'}</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-[#514163] text-white rounded-lg hover:bg-[#6d5581] transition-colors"
            >
              <Download className="w-4 h-4" />
              {language === 'es' ? 'Exportar CSV' : 'Export CSV'}
            </button>
          </div>
        </div>

        {/* Overview Summary */}
        {overviewStats && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-[#514163] dark:text-[#fdda36]" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {language === 'es' ? 'Resumen General' : 'Overview Summary'}
              </h2>
              <span className="text-2xl ml-2">
                {getStatusEmoji(overviewStats.avg_rpe_7d, overviewStats.pain_pct_7d)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-gray-800 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {language === 'es' ? 'RPE Promedio' : 'Average RPE'}
                  </span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className={`text-3xl font-bold ${getStatusColor(overviewStats.avg_rpe_7d, 'rpe')}`}>
                    {overviewStats.avg_rpe_7d.toFixed(1)}
                  </span>
                  <span className="text-sm text-gray-500">
                    7d / <span className="text-gray-400">{overviewStats.avg_rpe_30d.toFixed(1)}</span> 30d
                  </span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-white dark:from-red-900/20 dark:to-gray-800 rounded-lg p-4 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {language === 'es' ? '% Sesiones con Dolor' : '% Sessions with Pain'}
                  </span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className={`text-3xl font-bold ${getStatusColor(overviewStats.pain_pct_7d, 'pain')}`}>
                    {overviewStats.pain_pct_7d.toFixed(0)}%
                  </span>
                  <span className="text-sm text-gray-500">
                    7d / <span className="text-gray-400">{overviewStats.pain_pct_30d.toFixed(0)}%</span> 30d
                  </span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <Battery className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {language === 'es' ? 'Energía Promedio' : 'Average Energy'}
                  </span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className={`text-3xl font-bold ${getStatusColor(overviewStats.avg_energy_7d, 'energy')}`}>
                    {overviewStats.avg_energy_7d.toFixed(1)}
                  </span>
                  <span className="text-sm text-gray-500">
                    7d / <span className="text-gray-400">{overviewStats.avg_energy_30d.toFixed(1)}</span> 30d
                  </span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {language === 'es' ? 'Ánimo Promedio' : 'Average Mood'}
                  </span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className={`text-3xl font-bold ${getStatusColor(overviewStats.avg_mood_7d, 'mood')}`}>
                    {overviewStats.avg_mood_7d.toFixed(1)}
                  </span>
                  <span className="text-sm text-gray-500">
                    7d / <span className="text-gray-400">{overviewStats.avg_mood_30d.toFixed(1)}</span> 30d
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Visual Trends */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-[#514163] dark:text-[#fdda36]" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {language === 'es' ? 'Tendencias Visuales' : 'Visual Trends'}
            </h2>
          </div>

          {trendData.length > 0 ? (
            <div className="space-y-6">
              <div className="h-64 flex items-end justify-between gap-2">
                {trendData.slice(-14).map((point, idx) => {
                  const maxValue = selectedMetric === 'rpe' ? 10 : selectedMetric === 'pain' ? 3 : 5;
                  const value = point[selectedMetric];
                  const height = (value / maxValue) * 100;

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                      <div className="relative w-full group">
                        <div
                          className="w-full bg-gradient-to-t from-[#514163] to-[#6d5581] dark:from-[#fdda36] dark:to-[#ffd51a] rounded-t-lg transition-all hover:opacity-80 cursor-pointer"
                          style={{ height: `${height}%`, minHeight: '8px' }}
                          title={`${point.date}: ${value.toFixed(1)}`}
                        />
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          {value.toFixed(1)}
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 rotate-0 text-center">
                        {point.date.split(' ')[1]}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                {language === 'es' ? 'Últimos 14 días' : 'Last 14 days'}
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-12">
              {language === 'es' ? 'No hay datos suficientes para mostrar tendencias' : 'Not enough data to show trends'}
            </p>
          )}
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl shadow-sm border-2 border-red-200 dark:border-red-800 p-6">
            <div className="flex items-center gap-2 mb-6">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <h2 className="text-lg font-semibold text-red-900 dark:text-red-300">
                {language === 'es' ? 'Alertas' : 'Alerts'}
              </h2>
              <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
                {alerts.length}
              </span>
            </div>

            <div className="space-y-3">
              {alerts.map((athlete) => (
                <div
                  key={athlete.athlete_id}
                  className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-red-200 dark:border-red-800"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        {athlete.athlete_name}
                      </h3>
                      <div className="space-y-1 text-sm">
                        {athlete.consecutive_high_rpe >= 2 && (
                          <p className="text-red-700 dark:text-red-400">
                            🔴 {language === 'es' ? 'RPE alto en' : 'High RPE in'} {athlete.consecutive_high_rpe}{' '}
                            {language === 'es' ? 'sesiones consecutivas' : 'consecutive sessions'}
                          </p>
                        )}
                        {athlete.consecutive_pain >= 2 && (
                          <p className="text-red-700 dark:text-red-400">
                            🔴 {language === 'es' ? 'Dolor reportado en' : 'Pain reported in'}{' '}
                            {athlete.consecutive_pain} {language === 'es' ? 'sesiones consecutivas' : 'consecutive sessions'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                        <MessageCircle className="w-5 h-5" />
                      </button>
                      <button className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors">
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Athlete Details Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              {language === 'es' ? 'Detalle por Atleta' : 'Athlete Details'}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {language === 'es' ? 'Atleta' : 'Athlete'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {language === 'es' ? 'Último RPE' : 'Last RPE'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {language === 'es' ? '¿Dolor?' : 'Pain?'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {language === 'es' ? 'Energía Prom.' : 'Avg Energy'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {language === 'es' ? 'Última Sesión' : 'Last Session'}
                  </th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {athleteStats.map((athlete) => {
                  const isExpanded = expandedAthlete === athlete.athlete_id;
                  const athleteFeedback = feedbackData
                    .filter((f) => f.athlete_id === athlete.athlete_id)
                    .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
                    .slice(0, 5);

                  return (
                    <>
                      <tr key={athlete.athlete_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setExpandedAthlete(isExpanded ? null : athlete.athlete_id)}
                            className="font-medium text-gray-900 dark:text-white hover:text-[#514163] dark:hover:text-[#fdda36] transition-colors text-left"
                          >
                            {athlete.athlete_name}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          {athlete.last_rpe ? (
                            <span className={`font-bold ${getStatusColor(athlete.last_rpe, 'rpe')}`}>
                              {athlete.last_rpe}/10
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {athlete.pain_reported ? (
                            <span className="text-red-600 dark:text-red-400 font-medium">
                              ✓ ({athlete.pain_sessions})
                            </span>
                          ) : (
                            <span className="text-green-600 dark:text-green-400">✗</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-medium ${getStatusColor(athlete.avg_energy, 'energy')}`}>
                            {athlete.avg_energy.toFixed(1)}/5
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {new Date(athlete.last_session_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setExpandedAthlete(isExpanded ? null : athlete.athlete_id)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50">
                            <div className="space-y-3">
                              <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-3">
                                {language === 'es' ? 'Últimas 5 Sesiones' : 'Last 5 Sessions'}
                              </h4>
                              {athleteFeedback.map((feedback, idx) => (
                                <div
                                  key={idx}
                                  className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                      {new Date(feedback.completed_at).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                      })}
                                    </span>
                                    <div className="flex items-center gap-3 text-sm">
                                      {feedback.rpe && (
                                        <span className={getStatusColor(feedback.rpe, 'rpe')}>
                                          RPE: {feedback.rpe}
                                        </span>
                                      )}
                                      {feedback.pain_level && feedback.pain_level !== 'none' && (
                                        <span className="text-red-600 dark:text-red-400 capitalize">
                                          Pain: {feedback.pain_level}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {feedback.feedback_notes && (
                                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                                      "{feedback.feedback_notes}"
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>

            {athleteStats.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-12">
                {language === 'es' ? 'No hay datos de feedback disponibles' : 'No feedback data available'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
