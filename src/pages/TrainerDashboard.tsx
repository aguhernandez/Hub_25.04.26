import { useEffect, useState } from 'react';
import { Users, Calendar, TrendingUp, Activity, AlertCircle, Dumbbell, MessageSquare, Brain, Apple, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { useAthlete } from '../contexts/AthleteContext';

interface AthleteAlert {
  id: string;
  full_name: string;
  avatar_url: string | null;
  remaining_sessions: number;
}

export default function TrainerDashboard() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const { setSelectedAthlete } = useAthlete();

  const navigate = (page: string) => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: page }));
  };

  const [stats, setStats] = useState({
    totalAthletes: 0,
    activePrograms: 0,
    todayWorkouts: 0,
    athletesNeedingAttention: 0,
  });
  const [athleteAlerts, setAthleteAlerts] = useState<AthleteAlert[]>([]);
  const [expandedAthleteId, setExpandedAthleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [profile]);

  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const loadStats = async () => {
    if (!profile) return;

    try {
      const [athletesRes, programsRes, workoutsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('assigned_trainer_id', profile.id)
          .eq('role', 'athlete'),
        supabase
          .from('training_programs')
          .select('id', { count: 'exact', head: true })
          .eq('created_by', profile.id),
        supabase
          .from('athlete_workouts')
          .select('id', { count: 'exact', head: true })
          .eq('scheduled_date', formatDateLocal(new Date())),
      ]);

      const athletes = athletesRes.data || [];

      const athletesWithAlerts = await Promise.all(
        athletes.map(async (athlete) => {
          const today = formatDateLocal(new Date());
          const { count } = await supabase
            .from('athlete_workouts')
            .select('*', { count: 'exact', head: true })
            .eq('athlete_id', athlete.id)
            .gte('scheduled_date', today)
            .eq('status', 'pending');

          return {
            ...athlete,
            remaining_sessions: count || 0
          };
        })
      );

      const needsAttention = athletesWithAlerts.filter(a => a.remaining_sessions < 3);

      setStats({
        totalAthletes: athletes.length,
        activePrograms: programsRes.count || 0,
        todayWorkouts: workoutsRes.count || 0,
        athletesNeedingAttention: needsAttention.length,
      });

      setAthleteAlerts(needsAttention.sort((a, b) => a.remaining_sessions - b.remaining_sessions));
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-8000 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#fdda36] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'es' ? 'Cargando dashboard...' : 'Loading dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-5 dark:from-gray-900 dark:via-gray-900 dark:to-gray-8000 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#514163]/10 via-[#fdda36]/10 to-[#514163]/10 dark:from-[#514163]/20 dark:via-[#fdda36]/20 dark:to-[#514163]/20 animate-pulse" />

          <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8">
            <div className="mb-6">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-[#514163] to-[#fdda36] bg-clip-text text-transparent">
                {language === 'es' ? '¡Hola,' : 'Hello,'} {profile?.full_name?.split(' ')[0]}! 👋
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400 text-lg">
                {language === 'es' ? 'Panel de Entrenador' : 'Trainer Dashboard'}
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-800/50 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-600 rounded-lg">
                    <Users className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {language === 'es' ? 'Atletas Totales' : 'Total Athletes'}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats.totalAthletes}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-gray-800/50 rounded-xl border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-600 rounded-lg">
                    <Activity className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {language === 'es' ? 'Programas Activos' : 'Active Programs'}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats.activePrograms}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-gray-800/50 rounded-xl border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-600 rounded-lg">
                    <Calendar className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {language === 'es' ? 'Entrenamientos Hoy' : 'Workouts Today'}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats.todayWorkouts}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gradient-to-br from-red-50 to-white dark:from-red-900/20 dark:to-gray-800/50 rounded-xl border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-600 rounded-lg">
                    <AlertCircle className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {language === 'es' ? 'Requieren Atención' : 'Need Attention'}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats.athletesNeedingAttention}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Athlete Alerts - MAIN FEATURE */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-white" />
                <h2 className="text-xl font-bold text-white">
                  {language === 'es' ? '⚠️ Atletas que Requieren Planificación' : '⚠️ Athletes Needing Planning'}
                </h2>
              </div>
              <p className="text-red-100 text-sm mt-1">
                {language === 'es'
                  ? 'Atletas con menos de 3 sesiones programadas'
                  : 'Athletes with less than 3 scheduled sessions'}
              </p>
            </div>

            <div className="p-6">
              {athleteAlerts.length === 0 ? (
                <div className="text-center py-12">
                  <Brain className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 font-medium">
                    {language === 'es'
                      ? '¡Excelente! Todos tus atletas tienen planificación suficiente.'
                      : 'Great! All your athletes have sufficient planning.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {athleteAlerts.map((athlete) => (
                    <div
                      key={athlete.id}
                      className="p-5 bg-gradient-to-r from-red-50 to-white dark:from-red-900/10 dark:to-gray-800/50 rounded-xl border-2 border-red-200 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          {athlete.avatar_url ? (
                            <img
                              src={athlete.avatar_url}
                              alt={athlete.full_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-lg">
                              {athlete.full_name?.charAt(0) || '?'}
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900 dark:text-white">
                              {athlete.full_name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                athlete.remaining_sessions === 0
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                  : athlete.remaining_sessions === 1
                                  ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              }`}>
                                {athlete.remaining_sessions} {language === 'es' ? 'sesiones restantes' : 'sessions left'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => setExpandedAthleteId(expandedAthleteId === athlete.id ? null : athlete.id)}
                          className="px-4 py-2 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors flex items-center gap-2"
                        >
                          {expandedAthleteId === athlete.id ? (
                            <>
                              <ChevronUp className="w-4 h-4" />
                              {language === 'es' ? 'Ocultar' : 'Hide'}
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4" />
                              {language === 'es' ? 'Ver Opciones' : 'Options'}
                            </>
                          )}
                        </button>
                      </div>

                      {expandedAthleteId === athlete.id && (
                        <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800 grid grid-cols-3 gap-2">
                          <button
                            onClick={() => {
                              setSelectedAthlete(athlete.id, athlete.full_name);
                              navigate('training');
                            }}
                            className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex flex-col items-center gap-1 text-xs font-medium"
                          >
                            <Calendar className="w-5 h-5" />
                            {language === 'es' ? 'Calendario' : 'Calendar'}
                          </button>

                          <button
                            onClick={() => {
                              setSelectedAthlete(athlete.id, athlete.full_name);
                              navigate('nutrition-dashboard');
                            }}
                            className="px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors flex flex-col items-center gap-1 text-xs font-medium"
                          >
                            <Apple className="w-5 h-5" />
                            {language === 'es' ? 'Nutrición' : 'Nutrition'}
                          </button>

                          <button
                            onClick={() => {
                              setSelectedAthlete(athlete.id, athlete.full_name);
                              navigate('habits');
                            }}
                            className="px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors flex flex-col items-center gap-1 text-xs font-medium"
                          >
                            <CheckCircle className="w-5 h-5" />
                            {language === 'es' ? 'Hábitos' : 'Habits'}
                          </button>

                          <button
                            onClick={() => {
                              setSelectedAthlete(athlete.id, athlete.full_name);
                              navigate('performance');
                            }}
                            className="px-3 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors flex flex-col items-center gap-1 text-xs font-medium"
                          >
                            <TrendingUp className="w-5 h-5" />
                            {language === 'es' ? 'Performance' : 'Performance'}
                          </button>

                          <button
                            onClick={() => navigate('chat')}
                            className="col-span-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 text-xs font-medium"
                          >
                            <MessageSquare className="w-4 h-4" />
                            {language === 'es' ? 'Mensaje' : 'Message'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-[#fdda36]" />
                {language === 'es' ? 'Acciones Rápidas' : 'Quick Actions'}
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('my-athletes')}
                  className="w-full p-4 bg-gradient-to-r from-[#514163] to-[#3a2f4a] text-white rounded-lg hover:from-[#3a2f4a] hover:to-[#514163] transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5" />
                    <span className="font-medium">
                      {language === 'es' ? 'Mis Atletas' : 'My Athletes'}
                    </span>
                  </div>
                  <span className="text-xs bg-white/20 px-2 py-1 rounded">
                    {stats.totalAthletes}
                  </span>
                </button>

                <button
                  onClick={() => navigate('workout-builder')}
                  className="w-full p-4 bg-gradient-to-r from-[#fdda36] to-[#ffd51a] text-[#514163] rounded-lg hover:from-[#ffd51a] hover:to-[#fdda36] transition-all flex items-center gap-3 font-medium"
                >
                  <Dumbbell className="w-5 h-5" />
                  {language === 'es' ? 'Crear Workout' : 'Create Workout'}
                </button>

                <button
                  onClick={() => navigate('program-builder')}
                  className="w-full p-4 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex items-center gap-3 font-medium"
                >
                  <TrendingUp className="w-5 h-5" />
                  {language === 'es' ? 'Crear Programa' : 'Create Program'}
                </button>

                <button
                  onClick={() => navigate('chat')}
                  className="w-full p-4 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex items-center gap-3 font-medium"
                >
                  <MessageSquare className="w-5 h-5" />
                  {language === 'es' ? 'Mensajes' : 'Messages'}
                </button>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-br from-[#514163] to-[#3a2f4a] rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-start gap-3">
                <Brain className="w-6 h-6 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-lg mb-2">
                    💡 {language === 'es' ? 'Consejo Pro' : 'Pro Tip'}
                  </h3>
                  <p className="text-white/90 text-sm leading-relaxed">
                    {language === 'es'
                      ? 'Mantén siempre al menos 5-7 días de planificación para cada atleta. Esto te permite anticipar cambios y mantener la progresión óptima.'
                      : 'Always maintain at least 5-7 days of planning for each athlete. This allows you to anticipate changes and maintain optimal progression.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* This Week Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
            📊 {language === 'es' ? 'Esta Semana' : 'This Week'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-700/30 dark:to-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {language === 'es' ? 'Sesiones Programadas' : 'Scheduled Sessions'}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stats.todayWorkouts}
                  </p>
                </div>
                <Calendar className="w-12 h-12 text-[#514163] dark:text-[#fdda36] opacity-50" />
              </div>
            </div>

            <div className="p-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-700/30 dark:to-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {language === 'es' ? 'Atletas Activos' : 'Active Athletes'}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stats.totalAthletes}
                  </p>
                </div>
                <Users className="w-12 h-12 text-[#514163] dark:text-[#fdda36] opacity-50" />
              </div>
            </div>

            <div className="p-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-700/30 dark:to-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {language === 'es' ? 'Programas' : 'Programs'}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stats.activePrograms}
                  </p>
                </div>
                <Activity className="w-12 h-12 text-[#514163] dark:text-[#fdda36] opacity-50" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
