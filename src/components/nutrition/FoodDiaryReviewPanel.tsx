import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import {
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Eye,
  Filter,
  Loader,
  TrendingUp,
  User,
  X
} from 'lucide-react';

interface FoodDiaryEntry {
  id: string;
  entry_time: string;
  meal_type: string;
  entry_method: string;
  food_description: string;
  estimated_calories: number;
  estimated_carbs_g: number;
  estimated_protein_g: number;
  estimated_fat_g: number;
  additional_notes: string;
}

interface FoodDiarySession {
  id: string;
  athlete_id: string;
  period_hours: number;
  start_date: string;
  day_of_week: string;
  status: string;
  total_calories: number;
  total_carbs_g: number;
  total_protein_g: number;
  total_fat_g: number;
  completed_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  adherence_score: number | null;
  entries: FoodDiaryEntry[];
  athlete_profile?: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
}

export default function FoodDiaryReviewPanel() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [sessions, setSessions] = useState<FoodDiarySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'reviewed'>('pending');
  const [selectedSession, setSelectedSession] = useState<FoodDiarySession | null>(null);
  const [reviewing, setReviewing] = useState(false);

  const mealTypeLabels: Record<string, string> = {
    breakfast: language === 'es' ? 'Desayuno' : 'Breakfast',
    lunch: language === 'es' ? 'Almuerzo' : 'Lunch',
    dinner: language === 'es' ? 'Cena' : 'Dinner',
    snack: language === 'es' ? 'Snack' : 'Snack',
    other: language === 'es' ? 'Otro' : 'Other'
  };

  useEffect(() => {
    if (profile) {
      loadSessions();
    }
  }, [profile, filterStatus]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('food_diary_sessions')
        .select(`
          *,
          athlete_profile:profiles!food_diary_sessions_athlete_id_fkey(
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      // Filter by review status
      if (filterStatus === 'pending') {
        query = query.is('reviewed_by', null);
      } else if (filterStatus === 'reviewed') {
        query = query.not('reviewed_by', 'is', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Load entries for each session
      const sessionsWithEntries = await Promise.all(
        (data || []).map(async (session) => {
          const { data: entries } = await supabase
            .from('food_diary_entries')
            .select('*')
            .eq('session_id', session.id)
            .order('entry_time', { ascending: true });

          return {
            ...session,
            entries: entries || []
          };
        })
      );

      setSessions(sessionsWithEntries);
    } catch (error: any) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsReviewed = async (sessionId: string, adherenceScore: number) => {
    setReviewing(true);
    try {
      const { error } = await supabase
        .from('food_diary_sessions')
        .update({
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
          adherence_score: adherenceScore
        })
        .eq('id', sessionId);

      if (error) throw error;

      await loadSessions();
      setSelectedSession(null);

      alert(language === 'es'
        ? '✅ Diario revisado y marcado'
        : '✅ Diary reviewed and marked');
    } catch (error: any) {
      console.error('Error reviewing session:', error);
      alert(error.message);
    } finally {
      setReviewing(false);
    }
  };

  const exportToCSV = (session: FoodDiarySession) => {
    const headers = language === 'es'
      ? ['Hora', 'Tipo de Comida', 'Descripción', 'Calorías', 'Carbohidratos (g)', 'Proteínas (g)', 'Grasas (g)', 'Notas', 'Método']
      : ['Time', 'Meal Type', 'Description', 'Calories', 'Carbs (g)', 'Protein (g)', 'Fat (g)', 'Notes', 'Method'];
    const rows = session.entries.map(entry => [
      entry.entry_time,
      entry.meal_type,
      entry.food_description.replace(/\n/g, ' | '),
      entry.estimated_calories,
      entry.estimated_carbs_g,
      entry.estimated_protein_g,
      entry.estimated_fat_g,
      entry.additional_notes || '',
      entry.entry_method
    ]);

    // Add totals row
    rows.push([
      'TOTAL',
      '',
      '',
      session.total_calories,
      session.total_carbs_g,
      session.total_protein_g,
      session.total_fat_g,
      '',
      ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `food_diary_${session.athlete_profile?.first_name}_${session.start_date}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {language === 'es' ? '📋 Revisar Diarios Alimentarios' : '📋 Review Food Diaries'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            {language === 'es'
              ? 'Revisa los diarios completados por tus atletas'
              : 'Review completed diaries from your athletes'}
          </p>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filterStatus === 'pending'
                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-2 border-orange-500'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-2 border-transparent'
            }`}
          >
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {language === 'es' ? 'Pendientes' : 'Pending'}
            </span>
          </button>
          <button
            onClick={() => setFilterStatus('reviewed')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filterStatus === 'reviewed'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-2 border-green-500'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-2 border-transparent'
            }`}
          >
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {language === 'es' ? 'Revisados' : 'Reviewed'}
            </span>
          </button>
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filterStatus === 'all'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-2 border-blue-500'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-2 border-transparent'
            }`}
          >
            <span className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              {language === 'es' ? 'Todos' : 'All'}
            </span>
          </button>
        </div>
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-xl">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'es' ? 'No hay diarios disponibles' : 'No diaries available'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                {/* Athlete Info */}
                <div className="flex items-start gap-4 flex-1">
                  <div className="flex-shrink-0">
                    {session.athlete_profile?.avatar_url ? (
                      <img
                        src={session.athlete_profile.avatar_url}
                        alt="Athlete"
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <User className="w-6 h-6 text-green-600" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {session.athlete_profile?.first_name} {session.athlete_profile?.last_name}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {session.start_date} ({session.day_of_week})
                      </span>
                      <span>• {session.period_hours}h</span>
                      <span>• {session.entries.length} {language === 'es' ? 'comidas' : 'meals'}</span>
                    </div>

                    {/* Macros Summary */}
                    <div className="flex gap-4 mt-3">
                      <div className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg text-sm font-medium">
                        {session.total_calories} kcal
                      </div>
                      <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-medium">
                        {session.total_carbs_g}g CHO
                      </div>
                      <div className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium">
                        {session.total_protein_g}g PRO
                      </div>
                      <div className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-lg text-sm font-medium">
                        {session.total_fat_g}g FAT
                      </div>
                    </div>

                    {/* Review Status */}
                    {session.reviewed_at && (
                      <div className="mt-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600 dark:text-green-400">
                          {language === 'es' ? 'Revisado' : 'Reviewed'} •
                          {session.adherence_score && ` ${session.adherence_score}/100`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedSession(session)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    {language === 'es' ? 'Ver' : 'View'}
                  </button>
                  <button
                    onClick={() => exportToCSV(session)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title={language === 'es' ? 'Exportar CSV' : 'Export CSV'}
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedSession && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            onClick={() => setSelectedSession(null)}
          ></div>

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-t-2xl flex items-center justify-between z-10">
                <div>
                  <h2 className="text-2xl font-bold">
                    {selectedSession.athlete_profile?.first_name} {selectedSession.athlete_profile?.last_name}
                  </h2>
                  <p className="text-green-100 text-sm mt-1">
                    {selectedSession.start_date} • {selectedSession.period_hours}h • {selectedSession.day_of_week}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Totals */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                    <div className="text-3xl font-bold text-orange-600">{selectedSession.total_calories}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">kcal</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <div className="text-3xl font-bold text-blue-600">{selectedSession.total_carbs_g}g</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">CHO</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                    <div className="text-3xl font-bold text-red-600">{selectedSession.total_protein_g}g</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">PRO</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                    <div className="text-3xl font-bold text-yellow-600">{selectedSession.total_fat_g}g</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">FAT</div>
                  </div>
                </div>

                {/* Entries Timeline */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    {language === 'es' ? 'Comidas Registradas' : 'Logged Meals'}
                  </h3>
                  <div className="space-y-3">
                    {selectedSession.entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-green-600">
                              {entry.entry_time}
                            </span>
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
                              {mealTypeLabels[entry.meal_type]}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line mb-2">
                          {entry.food_description}
                        </p>
                        <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400">
                          <span>≈ {entry.estimated_calories} kcal</span>
                          <span>{entry.estimated_carbs_g}g CHO</span>
                          <span>{entry.estimated_protein_g}g PRO</span>
                          <span>{entry.estimated_fat_g}g FAT</span>
                        </div>
                        {entry.additional_notes && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                            💬 {entry.additional_notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Review Actions */}
                {!selectedSession.reviewed_at && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                    <h4 className="font-bold text-gray-900 dark:text-white mb-4">
                      {language === 'es' ? 'Marcar como Revisado' : 'Mark as Reviewed'}
                    </h4>
                    <div className="flex gap-3">
                      {[80, 85, 90, 95, 100].map(score => (
                        <button
                          key={score}
                          onClick={() => markAsReviewed(selectedSession.id, score)}
                          disabled={reviewing}
                          className="flex-1 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {reviewing ? <Loader className="w-5 h-5 animate-spin mx-auto" /> : score}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 text-center mt-2">
                      {language === 'es'
                        ? 'Selecciona un score de adherencia (80-100)'
                        : 'Select an adherence score (80-100)'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
