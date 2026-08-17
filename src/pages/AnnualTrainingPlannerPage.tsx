import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { Calendar, Plus, CreditCard as Edit2, Trash2, Download, Eye, Users, TrendingUp, Target, Activity, AlertCircle, Check, ChevronLeft, ChevronRight, Layers, X } from 'lucide-react';
import WeeklyPlanEditor from '../components/atp/WeeklyPlanEditor';
import PlanVsActualChart from '../components/atp/PlanVsActualChart';
import MacrocycleEditor from '../components/atp/MacrocycleEditor';
import { recalculateATPCompliance } from '../utils/atpIntegration';
import ATPPlanTagsSection from '../components/tags/ATPPlanTagsSection';

interface AnnualTrainingPlan {
  id: string;
  athlete_id: string | null;
  team_id: string | null;
  year: number;
  title: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  notes: string | null;
  athlete?: { full_name: string };
  team?: { name: string };
}

interface Macrocycle {
  id: string;
  phase_type: string;
  start_week: number;
  end_week: number;
  title: string | null;
  description: string | null;
  color: string;
}

interface WeeklyLoad {
  id: string;
  week_number: number;
  start_date: string;
  end_date: string;
  focus: string | null;
  estimated_load: number;
  relative_load_percent: number | null;
  num_sessions: number;
  key_exercises: string[] | null;
  notes: string | null;
  has_plan: boolean;
  actual_load: number | null;
}

interface Event {
  id: string;
  week_number: number;
  event_date: string;
  event_type: string;
  title: string;
  description: string | null;
  icon: string;
  priority?: 'A' | 'B' | 'C' | null;
}

const PHASE_COLORS = {
  general_prep: '#60a5fa',
  specific_prep: '#34d399',
  pre_comp: '#fbbf24',
  competition: '#f87171',
  transition: '#9ca3af'
};

const PHASE_NAMES = {
  en: {
    general_prep: 'General Preparation',
    specific_prep: 'Specific Preparation',
    pre_comp: 'Pre-Competition',
    competition: 'Competition',
    transition: 'Transition / Off-Season'
  },
  es: {
    general_prep: 'Preparación General',
    specific_prep: 'Preparación Específica',
    pre_comp: 'Precompetición',
    competition: 'Competición',
    transition: 'Transición'
  }
};

export default function AnnualTrainingPlannerPage() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [atps, setAtps] = useState<AnnualTrainingPlan[]>([]);
  const [selectedATP, setSelectedATP] = useState<AnnualTrainingPlan | null>(null);
  const [macrocycles, setMacrocycles] = useState<Macrocycle[]>([]);
  const [weeklyLoads, setWeeklyLoads] = useState<WeeklyLoad[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showWeekDetail, setShowWeekDetail] = useState<number | null>(null);
  const [showMacroEditor, setShowMacroEditor] = useState(false);
  const [viewStartWeek, setViewStartWeek] = useState(1);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [formEvents, setFormEvents] = useState<Array<{date: string, title: string, priority: 'A' | 'B' | 'C'}>>([]);

  const [formData, setFormData] = useState({
    athlete_id: '',
    team_id: '',
    year: new Date().getFullYear(),
    title: '',
    start_date: '',
    end_date: '',
    notes: ''
  });

  useEffect(() => {
    if (profile?.id) {
      loadATPs();
      if (profile?.role === 'trainer' || profile?.role === 'admin') {
        loadAthletes();
      }
    }
  }, [profile]);

  useEffect(() => {
    if (selectedATP) {
      loadATPDetails(selectedATP.id);
    }
  }, [selectedATP]);

  const loadATPs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('annual_training_plans')
        .select(`
          *,
          athlete:profiles!annual_training_plans_athlete_id_fkey(full_name),
          team:teams(name)
        `);

      // Athletes see their own ATPs
      if (profile?.role === 'athlete') {
        query = query.eq('athlete_id', profile.id);
      } else if (profile?.role === 'trainer') {
        // Trainers see ATPs they created
        query = query.eq('coach_id', profile.id);
      }
      // Admins see all (no filter)

      query = query
        .order('year', { ascending: false })
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setAtps(data || []);
      if (data && data.length > 0 && !selectedATP) {
        setSelectedATP(data[0]);
      }
    } catch (error) {
      console.error('Error loading ATPs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAthletes = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'athlete')
      .or(`assigned_trainer_id.eq.${profile?.id}`)
      .order('full_name');
    setAthletes(data || []);
  };

  const loadATPDetails = async (atpId: string) => {
    try {
      const [macroRes, loadRes, eventRes] = await Promise.all([
        supabase.from('atp_macrocycles').select('*').eq('atp_id', atpId).order('start_week'),
        supabase.from('atp_weekly_loads').select('*').eq('atp_id', atpId).order('week_number'),
        supabase.from('atp_events').select('*').eq('atp_id', atpId).order('week_number')
      ]);

      setMacrocycles(macroRes.data || []);
      setWeeklyLoads(loadRes.data || []);
      setEvents(eventRes.data || []);
    } catch (error) {
      console.error('Error loading ATP details:', error);
    }
  };

  const handleCreateATP = async () => {
    // For athletes, no athlete_id validation needed (they create for themselves)
    const isAthlete = profile?.role === 'athlete';
    if (!formData.title || !formData.start_date) {
      alert(language === 'es' ? 'Por favor completa los campos requeridos' : 'Please fill required fields');
      return;
    }

    if (!isAthlete && (!formData.athlete_id && !formData.team_id)) {
      alert(language === 'es' ? 'Por favor selecciona un atleta o equipo' : 'Please select an athlete or team');
      return;
    }

    try {
      const startDate = new Date(formData.start_date);
      const endDate = formData.end_date
        ? new Date(formData.end_date)
        : new Date(startDate.getFullYear(), 11, 31);

      const { data: atp, error: atpError } = await supabase
        .from('annual_training_plans')
        .insert({
          ...formData,
          athlete_id: isAthlete ? profile.id : (formData.athlete_id || null),
          team_id: formData.team_id || null,
          coach_id: isAthlete ? null : profile?.id,
          end_date: endDate.toISOString().split('T')[0]
        })
        .select()
        .single();

      if (atpError) throw atpError;

      // Create 52 weeks
      const weeklyLoadsToInsert = [];
      for (let week = 1; week <= 52; week++) {
        const weekStart = new Date(startDate);
        weekStart.setDate(weekStart.getDate() + (week - 1) * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        weeklyLoadsToInsert.push({
          atp_id: atp.id,
          week_number: week,
          start_date: weekStart.toISOString().split('T')[0],
          end_date: weekEnd.toISOString().split('T')[0],
          estimated_load: 0,
          num_sessions: 0
        });
      }

      await supabase.from('atp_weekly_loads').insert(weeklyLoadsToInsert);

      // Create events if any
      if (formEvents.length > 0) {
        const eventsToInsert = formEvents.map((evt) => {
          const eventDate = new Date(evt.date);
          const weekNum = Math.ceil((eventDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
          return {
            atp_id: atp.id,
            week_number: Math.max(1, Math.min(52, weekNum)),
            event_date: evt.date,
            event_type: 'competition',
            title: evt.title,
            priority: evt.priority,
            icon: '🏆'
          };
        });
        await supabase.from('atp_events').insert(eventsToInsert);
      }

      setShowCreateModal(false);
      resetForm();
      setFormEvents([]);

      // Show success notification
      setNotification({
        message: language === 'es' ? 'Plan anual creado exitosamente' : 'Annual plan created successfully',
        type: 'success'
      });
      setTimeout(() => setNotification(null), 1500);

      await loadATPs();

      // Auto-select the newly created ATP
      setSelectedATP(atp);
    } catch (error: any) {
      console.error('Error creating ATP:', error);
      setNotification({
        message: error.message,
        type: 'error'
      });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const getMacrocycleAtWeek = (week: number): Macrocycle | null => {
    return macrocycles.find(m => week >= m.start_week && week <= m.end_week) || null;
  };

  const getWeekLoad = (week: number): WeeklyLoad | undefined => {
    return weeklyLoads.find(w => w.week_number === week);
  };

  const getEventAtWeek = (week: number): Event | undefined => {
    return events.find(e => e.week_number === week);
  };

  const getMaxLoad = () => {
    if (weeklyLoads.length === 0) return 100;
    return Math.max(...weeklyLoads.map(w => w.estimated_load), 100);
  };

  const resetForm = () => {
    setFormData({
      athlete_id: '',
      team_id: '',
      year: new Date().getFullYear(),
      title: '',
      start_date: '',
      end_date: '',
      notes: ''
    });
  };

  const renderWeekBlock = (week: number) => {
    const macro = getMacrocycleAtWeek(week);
    const load = getWeekLoad(week);
    const event = getEventAtWeek(week);
    const maxLoad = getMaxLoad();
    const loadPercent = load ? (load.estimated_load / maxLoad) * 100 : 0;

    return (
      <button
        key={week}
        onClick={() => setShowWeekDetail(week)}
        className="relative flex flex-col items-center p-2 rounded border border-gray-200 dark:border-gray-700 hover:border-[#fdda36] transition-all min-w-[60px] group"
        style={{
          backgroundColor: macro ? `${macro.color}20` : 'transparent'
        }}
      >
        <div className="text-xs font-semibold text-gray-900 dark:text-white mb-1">
          W{week}
        </div>
        {load && (
          <>
            <div className="w-full h-12 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
              <div
                className="h-full bg-[#fdda36] transition-all"
                style={{ height: `${loadPercent}%` }}
              />
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {load.num_sessions}s
            </div>
          </>
        )}
        {event && (
          <div className="absolute top-1 right-1 text-lg">{event.icon}</div>
        )}
        {load?.has_plan && (
          <Check className="absolute top-1 left-1 w-3 h-3 text-green-600" />
        )}
      </button>
    );
  };

  // ATP now available for all users (athletes, trainers, admins)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#fdda36] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[1800px] mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'training' }))}
            className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={language === 'es' ? 'Volver a Entrenamientos' : 'Back to Training'}
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Calendar className="w-8 h-8 text-[#fdda36]" />
              {language === 'es' ? 'Planificador Anual de Entrenamiento' : 'Annual Training Planner'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {language === 'es'
                ? 'Periodización y planificación de temporada completa'
                : 'Full season periodization and planning'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          {language === 'es' ? 'Nuevo ATP' : 'New ATP'}
        </button>
      </div>

      {/* ATP Selection */}
      {atps.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {language === 'es' ? 'Seleccionar ATP' : 'Select ATP'}
              </label>
              <select
                value={selectedATP?.id || ''}
                onChange={(e) => {
                  const atp = atps.find(a => a.id === e.target.value);
                  setSelectedATP(atp || null);
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
              >
                {atps.map((atp) => (
                  <option key={atp.id} value={atp.id}>
                    {atp.title} - {atp.year} ({atp.athlete?.full_name || atp.team?.name})
                  </option>
                ))}
              </select>
            </div>
            {selectedATP && (
              <button
                onClick={() => setShowMacroEditor(true)}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <Layers className="w-4 h-4" />
                {language === 'es' ? 'Editar Fases' : 'Edit Phases'}
              </button>
            )}
          </div>
          {selectedATP && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <ATPPlanTagsSection
                planId={selectedATP.id}
                language={language}
                canEdit={profile?.role === 'trainer' || profile?.role === 'admin'}
              />
            </div>
          )}
        </div>
      )}

      {selectedATP ? (
        <>
          {/* Timeline Navigation */}
          <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <button
              onClick={() => setViewStartWeek(Math.max(1, viewStartWeek - 12))}
              disabled={viewStartWeek === 1}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {language === 'es' ? 'Semanas' : 'Weeks'} {viewStartWeek} - {Math.min(52, viewStartWeek + 11)}
            </span>
            <button
              onClick={() => setViewStartWeek(Math.min(41, viewStartWeek + 12))}
              disabled={viewStartWeek >= 41}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Timeline */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="overflow-x-auto">
              <div className="flex gap-2 min-w-max">
                {Array.from({ length: 12 }, (_, i) => viewStartWeek + i)
                  .filter(week => week <= 52)
                  .map(week => renderWeekBlock(week))}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-[#fdda36]" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {language === 'es' ? 'Carga Total' : 'Total Load'}
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {weeklyLoads.reduce((sum, w) => sum + w.estimated_load, 0).toFixed(0)}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-[#fdda36]" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {language === 'es' ? 'Sesiones Totales' : 'Total Sessions'}
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {weeklyLoads.reduce((sum, w) => sum + w.num_sessions, 0)}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-[#fdda36]" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {language === 'es' ? 'Macrociclos' : 'Macrocycles'}
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {macrocycles.length}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-[#fdda36]" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {language === 'es' ? 'Eventos' : 'Events'}
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {events.length}
              </div>
            </div>
          </div>

          {/* Plan vs Actual Chart */}
          {selectedATP && (
            <PlanVsActualChart
              atpId={selectedATP.id}
              startWeek={Math.max(1, viewStartWeek - 4)}
              endWeek={Math.min(52, viewStartWeek + 15)}
            />
          )}
        </>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {language === 'es' ? 'No hay ATPs todavía' : 'No ATPs yet'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {language === 'es'
              ? 'Crea tu primer Plan Anual de Entrenamiento'
              : 'Create your first Annual Training Plan'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            {language === 'es' ? 'Crear ATP' : 'Create ATP'}
          </button>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {language === 'es' ? 'Crear Nuevo ATP' : 'Create New ATP'}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Título' : 'Title'} *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={language === 'es' ? 'Ej: Temporada 2025' : 'e.g., 2025 Season'}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Atleta' : 'Athlete'}
                </label>
                <select
                  value={formData.athlete_id}
                  onChange={(e) => setFormData({ ...formData, athlete_id: e.target.value, team_id: '' })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
                >
                  <option value="">{language === 'es' ? 'Seleccionar atleta' : 'Select athlete'}</option>
                  {athletes.map((athlete) => (
                    <option key={athlete.id} value={athlete.id}>
                      {athlete.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'es' ? 'Año' : 'Year'}
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'es' ? 'Fecha de Inicio' : 'Start Date'} *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Notas' : 'Notes'}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36] resize-none"
                />
              </div>

              {/* Competitions/Events Section */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {language === 'es' ? 'Competiciones Principales' : 'Main Competitions'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setFormEvents([...formEvents, { date: formData.start_date || new Date().toISOString().split('T')[0], title: '', priority: 'A' }]);
                    }}
                    className="px-3 py-1 text-sm bg-[#fdda36] text-[#514163] rounded-lg hover:bg-[#ffd51a] transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    {language === 'es' ? 'Agregar' : 'Add'}
                  </button>
                </div>
                <div className="space-y-2">
                  {formEvents.map((evt, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <input
                        type="date"
                        value={evt.date}
                        onChange={(e) => {
                          const newEvents = [...formEvents];
                          newEvents[idx].date = e.target.value;
                          setFormEvents(newEvents);
                        }}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      />
                      <input
                        type="text"
                        value={evt.title}
                        onChange={(e) => {
                          const newEvents = [...formEvents];
                          newEvents[idx].title = e.target.value;
                          setFormEvents(newEvents);
                        }}
                        placeholder={language === 'es' ? 'Nombre' : 'Name'}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      />
                      <select
                        value={evt.priority}
                        onChange={(e) => {
                          const newEvents = [...formEvents];
                          newEvents[idx].priority = e.target.value as 'A' | 'B' | 'C';
                          setFormEvents(newEvents);
                        }}
                        className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setFormEvents(formEvents.filter((_, i) => i !== idx));
                        }}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  ))}
                  {formEvents.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                      {language === 'es' ? 'Opcional: Agrega las competiciones principales (A=Objetivo, B=Secundario, C=Preparación)' : 'Optional: Add main competitions (A=Main Goal, B=Secondary, C=Preparation)'}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  {language === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  onClick={handleCreateATP}
                  className="flex-1 px-4 py-2 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors"
                >
                  {language === 'es' ? 'Crear ATP' : 'Create ATP'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Macrocycle Editor */}
      {showMacroEditor && selectedATP && (
        <MacrocycleEditor
          atpId={selectedATP.id}
          athleteId={selectedATP.athlete_id || ''}
          onClose={() => setShowMacroEditor(false)}
          onUpdate={() => {
            loadATPDetails(selectedATP.id);
          }}
        />
      )}

      {/* Weekly Plan Editor */}
      {showWeekDetail && selectedATP && (
        <WeeklyPlanEditor
          atpId={selectedATP.id}
          weekNumber={showWeekDetail}
          weekData={getWeekLoad(showWeekDetail)!}
          macrocycle={getMacrocycleAtWeek(showWeekDetail)}
          athleteId={selectedATP.athlete_id!}
          onClose={() => setShowWeekDetail(null)}
          onUpdate={() => {
            loadATPDetails(selectedATP.id);
          }}
        />
      )}

      {/* Success/Error Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className={`px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 ${
            notification.type === 'success'
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
          }`}>
            {notification.type === 'success' ? (
              <Check className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
