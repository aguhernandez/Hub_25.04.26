import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import { Package, Calendar, DollarSign, Video, Target, Users, ShoppingCart, Check, X, Crown, Trash2, CreditCard as Edit2, Plus, Search, Filter, ChevronRight, Dumbbell, Clock, Star, UserPlus, BookOpen, TrendingUp, ExternalLink } from 'lucide-react';

interface ProgramProduct {
  id: string;
  trainer_id: string | null;
  title: string;
  description: string;
  duration_weeks: number | null;
  is_membership: boolean;
  price: number;
  currency: string;
  is_published: boolean;
  category: string;
  difficulty_level: string;
  includes_zoom_sessions: boolean;
  zoom_frequency: string | null;
  zoom_session_duration: number | null;
  max_participants: number | null;
  thumbnail_url: string | null;
  image_url?: string | null;
  sport?: string | null;
  is_platform_program?: boolean;
  trainer?: { full_name: string } | null;
  stripe_product_id?: string | null;
  stripe_price_id?: string | null;
  checkout_url?: string | null;
  title_es?: string | null;
  title_en?: string | null;
  description_es?: string | null;
  description_en?: string | null;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  intermediate: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  advanced: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  elite: 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900',
};

const formatDateLocal = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function ProgramsMarketplacePage() {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const { toast, hideToast, success, error: showError } = useToast();

  const [programs, setPrograms] = useState<ProgramProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'platform' | 'trainer'>('all');

  const [selectedProgram, setSelectedProgram] = useState<ProgramProduct | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [purchasing, setPurchasing] = useState(false);

  const isTrainer = profile?.role === 'trainer';
  const isAdmin = profile?.role === 'admin';
  const isAthleteRole = profile?.role === 'athlete';
  const canManage = isTrainer || isAdmin;

  useEffect(() => {
    if (user && profile) loadPrograms();
  }, [user, profile]);

  const loadPrograms = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('program_products')
        .select(`*, trainer:profiles!program_products_trainer_id_fkey(full_name)`)
        .order('created_at', { ascending: false });

      if (profile?.role === 'athlete') {
        query = query.eq('is_published', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPrograms(data || []);
    } catch (err) {
      console.error('Error loading programs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPrograms = useMemo(() => {
    return programs.filter(p => {
      if (p.is_membership) return false;
      if (search && !p.title.toLowerCase().includes(search.toLowerCase()) &&
          !p.description?.toLowerCase().includes(search.toLowerCase())) return false;
      if (difficultyFilter !== 'all' && p.difficulty_level !== difficultyFilter) return false;
      if (sourceFilter === 'platform' && p.trainer_id !== null && !p.is_platform_program) return false;
      if (sourceFilter === 'trainer' && p.trainer_id === null) return false;
      return true;
    });
  }, [programs, search, difficultyFilter, sourceFilter]);

  const handlePurchase = async () => {
    if (!selectedProgram || !startDate) {
      showError(language === 'es' ? 'Por favor selecciona una fecha de inicio' : 'Please select a start date');
      return;
    }
    setPurchasing(true);
    try {
      const start = new Date(startDate + 'T12:00:00');
      let endDate = null;
      if (!selectedProgram.is_membership && selectedProgram.duration_weeks) {
        endDate = new Date(start);
        endDate.setDate(endDate.getDate() + selectedProgram.duration_weeks * 7);
      }

      const { data: purchase, error: purchaseError } = await supabase
        .from('program_purchases')
        .insert({
          program_product_id: selectedProgram.id,
          athlete_id: user?.id,
          start_date: startDate,
          end_date: endDate ? formatDateLocal(endDate) : null,
          price_paid: selectedProgram.price,
          currency: selectedProgram.currency,
          status: 'active',
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      await copyProgramWorkoutsToAthlete(selectedProgram.id, startDate, user!.id);

      if (selectedProgram.includes_zoom_sessions && purchase) {
        await scheduleZoomAppointments(purchase.id, selectedProgram, startDate, false);
      }

      setShowPurchaseModal(false);
      setShowDetailModal(false);
      setSelectedProgram(null);
      setStartDate('');
      success(language === 'es'
        ? '¡Programa activado! Se agregó a tu calendario.'
        : 'Program activated! Added to your calendar.');
    } catch (err: any) {
      console.error('Purchase error:', err);
      showError(err.message || 'Error');
    } finally {
      setPurchasing(false);
    }
  };

  const copyProgramWorkoutsToAthlete = async (programId: string, startDateStr: string, athleteId: string) => {
    const { data: weeks } = await supabase
      .from('program_weeks')
      .select(`id, week_number, program_days(id, day_number, day_name, program_day_workouts(*, exercise:exercises(id, exercise)))`)
      .eq('program_product_id', programId)
      .order('week_number');

    if (!weeks || weeks.length === 0) return;

    const start = new Date(startDateStr + 'T12:00:00');

    for (const week of weeks as any[]) {
      const weekOffset = (week.week_number - 1) * 7;
      for (const day of (week.program_days || [])) {
        if (!day.program_day_workouts || day.program_day_workouts.length === 0) continue;

        const dayDate = new Date(start);
        dayDate.setDate(dayDate.getDate() + weekOffset + (day.day_number - 1));

        const { data: newWorkout, error: wErr } = await supabase
          .from('workouts')
          .insert({
            name: day.day_name || `Week ${week.week_number} - Day ${day.day_number}`,
            description: `${selectedProgram?.title || 'Program'} — Week ${week.week_number}`,
            athlete_id: athleteId,
            scheduled_date: formatDateLocal(dayDate),
            status: 'pending',
          })
          .select()
          .single();

        if (wErr || !newWorkout) continue;

        await supabase.from('athlete_workouts').insert({
          athlete_id: athleteId,
          workout_id: newWorkout.id,
          scheduled_date: formatDateLocal(dayDate),
          status: 'pending',
          source: 'program',
        });

        const exercises = day.program_day_workouts.map((pdw: any, idx: number) => ({
          workout_id: newWorkout.id,
          exercise_id: pdw.exercise_id,
          sets: pdw.sets || 3,
          reps: pdw.reps || '8-10',
          rest_seconds: pdw.rest_seconds || 90,
          notes: pdw.notes || null,
          order_index: idx,
          primary_metric: pdw.primary_metric || null,
          secondary_metric: pdw.secondary_metric || null,
          primary_value: pdw.primary_value || pdw.load || null,
          rir: pdw.rir || null,
        }));

        if (exercises.length > 0) {
          await supabase.from('workout_exercises').insert(exercises);
        }
      }
    }
  };

  const scheduleZoomAppointments = async (
    referenceId: string, program: ProgramProduct, startDateStr: string, isSubscription: boolean
  ) => {
    if (!program.zoom_frequency) return;
    const start = new Date(startDateStr + 'T10:00:00');
    const duration = program.duration_weeks || 4;
    let frequency = 7;
    if (program.zoom_frequency === 'biweekly') frequency = 14;
    if (program.zoom_frequency === 'monthly') frequency = 30;
    const appointments = [];
    for (let i = 0; i < Math.floor((duration * 7) / frequency); i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i * frequency);
      appointments.push({
        trainer_id: program.trainer_id,
        athlete_id: user?.id,
        subscription_id: isSubscription ? referenceId : null,
        purchase_id: !isSubscription ? referenceId : null,
        scheduled_date: d.toISOString(),
        duration_minutes: program.zoom_session_duration || 60,
        status: 'scheduled',
      });
    }
    if (appointments.length > 0) {
      await supabase.from('zoom_appointments').insert(appointments);
    }
  };

  const handleDeleteProgram = async (programId: string) => {
    if (!window.confirm(language === 'es' ? '¿Eliminar este programa?' : 'Delete this program?')) return;
    try {
      const { error } = await supabase.from('program_products').delete().eq('id', programId);
      if (error) throw error;
      success(language === 'es' ? 'Programa eliminado' : 'Program deleted');
      loadPrograms();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const openProgram = (program: ProgramProduct) => {
    setSelectedProgram(program);
    setShowDetailModal(true);
    setStartDate(formatDateLocal(new Date()));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#fdda36] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <Toast toast={toast} onHide={hideToast} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-[#fdda36]" />
            {language === 'es' ? 'Programas de Entrenamiento' : 'Training Programs'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isAthleteRole
              ? language === 'es' ? 'Adquiere programas y cárgalos a tu calendario' : 'Get programs and load them to your calendar'
              : language === 'es' ? 'Gestiona y asigna programas a tus atletas' : 'Manage and assign programs to your athletes'}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'program-builder' }))}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#514163] text-white rounded-xl hover:bg-[#3a2f4a] transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            {language === 'es' ? 'Crear Programa' : 'Create Program'}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={language === 'es' ? 'Buscar programas...' : 'Search programs...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
          />
        </div>
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {(['all', 'platform', 'trainer'] as const).map(f => (
            <button
              key={f}
              onClick={() => setSourceFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                sourceFilter === f
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {f === 'all' ? (language === 'es' ? 'Todos' : 'All')
                : f === 'platform' ? 'Asciende'
                : language === 'es' ? 'Mi Entrenador' : 'My Trainer'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {(['all', 'beginner', 'intermediate', 'advanced', 'elite'] as const).map(d => (
            <button
              key={d}
              onClick={() => setDifficultyFilter(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                difficultyFilter === d
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {d === 'all' ? (language === 'es' ? 'Nivel' : 'Level') : d}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {filteredPrograms.length} {language === 'es' ? 'programas disponibles' : 'programs available'}
      </div>

      {/* Programs Grid */}
      {filteredPrograms.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-16 text-center">
          <Package className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {language === 'es' ? 'No hay programas disponibles' : 'No programs available'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {canManage
              ? language === 'es' ? 'Crea tu primer programa' : 'Create your first program'
              : language === 'es' ? 'Pronto habrá nuevos programas' : 'New programs coming soon'}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredPrograms.map(program => (
            <ProgramCard
              key={program.id}
              program={program}
              canManage={canManage}
              isAdmin={isAdmin}
              userId={user?.id}
              language={language}
              onOpen={() => openProgram(program)}
              onEdit={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'program-builder-detail', programId: program.id } }))}
              onDelete={() => handleDeleteProgram(program.id)}
            />
          ))}
        </div>
      )}

      {/* Detail / Purchase Modal */}
      {showDetailModal && selectedProgram && (
        <ProgramDetailModal
          program={selectedProgram}
          canManage={canManage}
          isAdmin={isAdmin}
          isAthleteRole={isAthleteRole}
          userId={user?.id}
          language={language}
          startDate={startDate}
          setStartDate={setStartDate}
          purchasing={purchasing}
          onClose={() => { setShowDetailModal(false); setSelectedProgram(null); }}
          onPurchase={handlePurchase}
          onAssign={() => { setShowDetailModal(false); setShowAssignModal(true); }}
          onEdit={() => {
            setShowDetailModal(false);
            window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'program-builder-detail', programId: selectedProgram.id } }));
          }}
          onDelete={() => { handleDeleteProgram(selectedProgram.id); setShowDetailModal(false); }}
        />
      )}

      {/* Assign to Athlete/Team Modal */}
      {showAssignModal && selectedProgram && (
        <AssignProgramModal
          program={selectedProgram}
          language={language}
          onClose={() => { setShowAssignModal(false); setSelectedProgram(null); }}
          onAssigned={(msg) => { success(msg); setShowAssignModal(false); setSelectedProgram(null); }}
          onError={showError}
          copyWorkouts={copyProgramWorkoutsToAthlete}
        />
      )}
    </div>
  );
}

function getLocalizedTitle(program: ProgramProduct, language: string): string {
  if (language === 'es') return program.title_es || program.title;
  return program.title_en || program.title;
}

function getLocalizedDescription(program: ProgramProduct, language: string): string {
  if (language === 'es') return program.description_es || program.description;
  return program.description_en || program.description;
}

// ─── ProgramCard ────────────────────────────────────────────────────────────
function ProgramCard({
  program, canManage, isAdmin, userId, language, onOpen, onEdit, onDelete
}: {
  program: ProgramProduct;
  canManage: boolean;
  isAdmin: boolean;
  userId?: string;
  language: string;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const canEdit = isAdmin || program.trainer_id === userId;

  return (
    <div
      className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer flex flex-col"
      onClick={onOpen}
    >
      {/* Thumbnail */}
      <div className="relative h-40 overflow-hidden flex-shrink-0">
        {program.thumbnail_url || program.image_url ? (
          <img
            src={program.thumbnail_url || program.image_url!}
            alt={program.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#514163] via-[#3a2f4a] to-[#1a1525] flex items-center justify-center">
            <Dumbbell className="w-14 h-14 text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {/* Duration badge */}
        <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-lg">
          {program.duration_weeks}w
        </div>
        {/* Price badge */}
        <div className="absolute bottom-3 left-3">
          {program.price === 0 ? (
            <span className="bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
              {language === 'es' ? 'Gratis' : 'Free'}
            </span>
          ) : (
            <span className="bg-[#fdda36] text-[#514163] text-xs font-bold px-2.5 py-1 rounded-lg">
              {program.price} {program.currency}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-snug line-clamp-2 flex-1">
            {getLocalizedTitle(program, language)}
          </h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 flex-1">
          {getLocalizedDescription(program, language)}
        </p>
        <div className="flex items-center gap-2 flex-wrap mt-auto pt-2">
          {program.difficulty_level && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${DIFFICULTY_COLORS[program.difficulty_level] || DIFFICULTY_COLORS.intermediate}`}>
              {program.difficulty_level}
            </span>
          )}
          {program.includes_zoom_sessions && (
            <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
              <Video className="w-3 h-3" /> Zoom
            </span>
          )}
        </div>
        {canEdit && (
          <div
            className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={onEdit}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              {language === 'es' ? 'Editar' : 'Edit'}
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ProgramDetailModal ──────────────────────────────────────────────────────
function ProgramDetailModal({
  program, canManage, isAdmin, isAthleteRole, userId, language,
  startDate, setStartDate, purchasing,
  onClose, onPurchase, onAssign, onEdit, onDelete
}: {
  program: ProgramProduct;
  canManage: boolean;
  isAdmin: boolean;
  isAthleteRole: boolean;
  userId?: string;
  language: string;
  startDate: string;
  setStartDate: (d: string) => void;
  purchasing: boolean;
  onClose: () => void;
  onPurchase: () => void;
  onAssign: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const canEdit = isAdmin || program.trainer_id === userId;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Hero */}
        <div className="relative h-52 overflow-hidden rounded-t-2xl">
          {program.thumbnail_url || program.image_url ? (
            <img src={program.thumbnail_url || program.image_url!} alt={program.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#514163] to-[#1a1525] flex items-center justify-center">
              <Dumbbell className="w-20 h-20 text-white/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <button onClick={onClose} className="absolute top-3 right-3 p-2 bg-black/40 backdrop-blur-sm rounded-xl text-white hover:bg-black/60 transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-4 left-5 right-5">
            <h2 className="text-2xl font-bold text-white">{getLocalizedTitle(program, language)}</h2>
            <p className="text-white/70 text-sm mt-0.5">
              {program.trainer_id ? program.trainer?.full_name : 'Asciende'}
            </p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Key stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 text-center">
              <Clock className="w-5 h-5 text-gray-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-900 dark:text-white">{program.duration_weeks}w</p>
              <p className="text-xs text-gray-500">{language === 'es' ? 'Semanas' : 'Weeks'}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 text-center">
              <TrendingUp className="w-5 h-5 text-gray-500 mx-auto mb-1" />
              <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">{program.difficulty_level || '—'}</p>
              <p className="text-xs text-gray-500">{language === 'es' ? 'Nivel' : 'Level'}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 text-center">
              <DollarSign className="w-5 h-5 text-gray-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {program.price === 0 ? (language === 'es' ? 'Gratis' : 'Free') : `${program.price} ${program.currency}`}
              </p>
              <p className="text-xs text-gray-500">{language === 'es' ? 'Precio' : 'Price'}</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{language === 'es' ? 'Descripción' : 'Description'}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{getLocalizedDescription(program, language)}</p>
          </div>

          {/* Features */}
          <div className="flex flex-wrap gap-2">
            {program.includes_zoom_sessions && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                <Video className="w-3.5 h-3.5" />
                {language === 'es' ? 'Incluye Zoom' : 'Includes Zoom'} ({program.zoom_frequency})
              </div>
            )}
            {program.category && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-400">
                <Target className="w-3.5 h-3.5" />
                {program.category}
              </div>
            )}
          </div>

          {/* Start date (athlete purchasing) */}
          {isAthleteRole && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {language === 'es' ? 'Fecha de inicio del programa' : 'Program start date'}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                min={formatDateLocal(new Date())}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                {language === 'es'
                  ? 'Todos los entrenamientos se cargarán automáticamente en tu calendario'
                  : 'All workouts will be automatically loaded into your calendar'}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            {isAthleteRole && program.price > 0 && program.checkout_url ? (
              <a
                href={program.checkout_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#fdda36] text-[#514163] font-bold rounded-xl hover:bg-[#ffd51a] transition-colors"
              >
                <ExternalLink className="w-5 h-5" />
                {language === 'es' ? 'Pagar con Stripe' : 'Pay with Stripe'}
              </a>
            ) : isAthleteRole ? (
              <button
                onClick={onPurchase}
                disabled={purchasing || !startDate}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#fdda36] text-[#514163] font-bold rounded-xl hover:bg-[#ffd51a] transition-colors disabled:opacity-50"
              >
                {purchasing ? (
                  <div className="w-5 h-5 border-2 border-[#514163] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    {program.price === 0
                      ? language === 'es' ? 'Activar Gratis' : 'Activate Free'
                      : language === 'es' ? 'Comprar y Activar' : 'Buy & Activate'}
                  </>
                )}
              </button>
            ) : null}
            {canManage && (
              <>
                <button
                  onClick={onAssign}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors"
                >
                  <UserPlus className="w-5 h-5" />
                  {language === 'es' ? 'Asignar a Atleta' : 'Assign to Athlete'}
                </button>
                {canEdit && (
                  <button
                    onClick={onEdit}
                    className="flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    {language === 'es' ? 'Editar' : 'Edit'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AssignProgramModal ──────────────────────────────────────────────────────
function AssignProgramModal({
  program, language, onClose, onAssigned, onError, copyWorkouts
}: {
  program: ProgramProduct;
  language: string;
  onClose: () => void;
  onAssigned: (msg: string) => void;
  onError: (msg: string) => void;
  copyWorkouts: (programId: string, startDate: string, athleteId: string) => Promise<void>;
}) {
  const { user, profile } = useAuth();
  const [athletes, setAthletes] = useState<{ id: string; full_name: string; avatar_url: string | null }[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string; member_count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'athlete' | 'team'>('athlete');
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [startDate, setStartDate] = useState(formatDateLocal(new Date()));
  const [assigning, setAssigning] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadAthletes();
  }, []);

  const loadAthletes = async () => {
    setLoading(true);
    try {
      const { data: directAthletes } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('assigned_trainer_id', user!.id)
        .eq('role', 'athlete');

      const { data: teamData } = await supabase
        .from('teams')
        .select('id, name, team_members(count)')
        .eq('coach_id', user!.id);

      setAthletes(directAthletes || []);
      setTeams((teamData || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        member_count: t.team_members?.[0]?.count || 0,
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAthletes = athletes.filter(a =>
    a.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleAthlete = (id: string) => {
    setSelectedAthletes(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleAssign = async () => {
    if (mode === 'athlete' && selectedAthletes.length === 0) {
      onError(language === 'es' ? 'Selecciona al menos un atleta' : 'Select at least one athlete');
      return;
    }
    if (mode === 'team' && !selectedTeam) {
      onError(language === 'es' ? 'Selecciona un equipo' : 'Select a team');
      return;
    }
    if (!startDate) {
      onError(language === 'es' ? 'Selecciona fecha de inicio' : 'Select a start date');
      return;
    }

    setAssigning(true);
    try {
      let athleteIds = selectedAthletes;

      if (mode === 'team') {
        const { data: members } = await supabase
          .from('team_members')
          .select('athlete_id')
          .eq('team_id', selectedTeam);
        athleteIds = (members || []).map((m: any) => m.athlete_id);
      }

      for (const athleteId of athleteIds) {
        await supabase.from('athlete_programs').upsert({
          athlete_id: athleteId,
          program_product_id: program.id,
          trainer_id: user!.id,
          start_date: startDate,
          assigned_date: formatDateLocal(new Date()),
          status: 'active',
        }, { onConflict: 'athlete_id,program_product_id,assigned_date' });

        await copyWorkouts(program.id, startDate, athleteId);
      }

      onAssigned(
        language === 'es'
          ? `Programa asignado a ${athleteIds.length} atleta(s)`
          : `Program assigned to ${athleteIds.length} athlete(s)`
      );
    } catch (err: any) {
      console.error(err);
      onError(err.message || 'Error assigning program');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {language === 'es' ? 'Asignar Programa' : 'Assign Program'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{program.title}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Mode toggle */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => { setMode('athlete'); setSelectedTeam(''); }}
              className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                mode === 'athlete'
                  ? 'bg-[#514163] text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Users className="w-4 h-4" />
              {language === 'es' ? 'Atletas' : 'Athletes'}
            </button>
            {teams.length > 0 && (
              <button
                onClick={() => { setMode('team'); setSelectedAthletes([]); }}
                className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors border-l border-gray-200 dark:border-gray-700 ${
                  mode === 'team'
                    ? 'bg-[#514163] text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Target className="w-4 h-4" />
                Teams
              </button>
            )}
          </div>

          {/* Start date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {language === 'es' ? 'Fecha de inicio' : 'Start date'}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36] text-sm"
            />
          </div>

          {mode === 'athlete' ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={language === 'es' ? 'Buscar atleta...' : 'Search athlete...'}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
                />
              </div>
              {loading ? (
                <div className="flex justify-center py-6">
                  <div className="w-6 h-6 border-2 border-[#fdda36] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredAthletes.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
                  {language === 'es' ? 'Sin atletas asignados' : 'No assigned athletes'}
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {filteredAthletes.map(athlete => (
                    <button
                      key={athlete.id}
                      onClick={() => toggleAthlete(athlete.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                        selectedAthletes.includes(athlete.id)
                          ? 'border-[#514163] bg-[#514163]/5 dark:bg-[#514163]/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      {athlete.avatar_url ? (
                        <img src={athlete.avatar_url} className="w-9 h-9 rounded-full object-cover" alt="" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#514163] to-[#3a2f4a] flex items-center justify-center text-white text-sm font-bold">
                          {athlete.full_name.charAt(0)}
                        </div>
                      )}
                      <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{athlete.full_name}</span>
                      {selectedAthletes.includes(athlete.id) && (
                        <Check className="w-4 h-4 text-[#514163] dark:text-[#fdda36]" />
                      )}
                    </button>
                  ))}
                </div>
              )}
              {selectedAthletes.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  {selectedAthletes.length} {language === 'es' ? 'atleta(s) seleccionado(s)' : 'athlete(s) selected'}
                </p>
              )}
            </>
          ) : (
            <div className="space-y-2">
              {teams.map(team => (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeam(team.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                    selectedTeam === team.id
                      ? 'border-[#514163] bg-[#514163]/5 dark:bg-[#514163]/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{team.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{team.member_count} {language === 'es' ? 'miembros' : 'members'}</p>
                  </div>
                  {selectedTeam === team.id && (
                    <Check className="w-4 h-4 text-[#514163] dark:text-[#fdda36]" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {language === 'es' ? 'Cancelar' : 'Cancel'}
          </button>
          <button
            onClick={handleAssign}
            disabled={assigning || (mode === 'athlete' ? selectedAthletes.length === 0 : !selectedTeam)}
            className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {assigning ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                {language === 'es' ? 'Asignar Programa' : 'Assign Program'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
