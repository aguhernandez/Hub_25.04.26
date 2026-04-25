import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAthlete } from '../contexts/AthleteContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import {
  Apple,
  BookOpen,
  ClipboardList,
  Utensils,
  BarChart3,
  Flame,
  Beef,
  Wheat,
  Droplets,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  Satellite,
  RefreshCw,
  Eye,
  ChevronRight,
  X,
  TrendingUp,
  ChevronDown,
  Coffee,
  UtensilsCrossed,
  Zap,
  Moon,
  Sun,
  Pill,
  Search,
  User,
  Users,
  ChevronLeft,
} from 'lucide-react';

type Tab = 'dashboard' | 'diary' | 'anamnesis';

interface PlanItem {
  item_type: 'food' | 'recipe' | 'supplement' | 'product';
  food_name?: string;
  recipe_name?: string;
  product_name?: string;
  brand?: string;
  supplement_type?: string;
  quantity_g?: number;
  servings?: number;
  serving_unit?: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  ingredients?: { name: string; quantity_g?: number; unit?: string }[];
}

interface PlanMeal {
  meal_type: string;
  meal_name: string;
  meal_time?: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  items: PlanItem[];
}

interface PlanDay {
  day: number;
  day_name: string;
  training_intensity: 'green' | 'yellow' | 'red' | null;
  day_targets: {
    target_kcal: number;
    target_protein_g: number;
    target_carbs_g: number;
    target_fat_g: number;
  } | null;
  meals: PlanMeal[];
}

interface PushedPlan {
  id: string;
  plan_name: string;
  plan_date: string;
  plan_duration_days: number;
  status: string;
  created_at: string;
  summary: {
    target_kcal: number;
    target_protein_g: number;
    target_carbs_g: number;
    target_fat_g: number;
    avg_daily_kcal?: number;
  };
  plan_data: {
    days: PlanDay[];
  };
  notes?: string;
}

interface SatelliteNutritionData {
  active_plan: {
    plan_name: string;
    target_kcal: number;
    target_protein_g: number;
    target_carbs_g: number;
    target_fat_g: number;
    status: string;
  } | null;
  today_adherence: {
    adherence_score: number;
    actual_kcal: number;
    target_kcal: number;
    date: string;
  } | null;
  last_diary_session: {
    id: string;
    session_date: string;
    status: string;
  } | null;
  nutrition_targets: {
    target_kcal: number;
    target_protein_g: number;
    target_carbs_g: number;
    target_fat_g: number;
    updated_at: string;
  } | null;
  pushed_plan: PushedPlan | null;
}

interface AthleteOption {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string;
  sport: string | null;
}

interface DiarySession {
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
  completed_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  adherence_score: number | null;
}

interface DiaryEntry {
  id: string;
  entry_time: string;
  meal_type: string;
  food_description: string;
  estimated_calories: number;
  estimated_carbs_g: number;
  estimated_protein_g: number;
  estimated_fat_g: number;
  additional_notes: string;
}

export default function TrainerAthleteNutritionPage() {
  const { profile } = useAuth();
  const { selectedAthleteId, selectedAthleteName } = useAthlete();
  const { language } = useLanguage();

  const [athletes, setAthletes] = useState<AthleteOption[]>([]);
  const [athletesLoading, setAthletesLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewAthleteId, setViewAthleteId] = useState<string | null>(selectedAthleteId);
  const [viewAthleteName, setViewAthleteName] = useState<string | null>(selectedAthleteName);
  const [viewAthleteAvatar, setViewAthleteAvatar] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [satelliteData, setSatelliteData] = useState<SatelliteNutritionData | null>(null);
  const [satelliteLoading, setSatelliteLoading] = useState(false);
  const [satelliteError, setSatelliteError] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [selectedPlanDay, setSelectedPlanDay] = useState<number>(0);
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);

  const [diarySessions, setDiarySessions] = useState<DiarySession[]>([]);
  const [diaryLoading, setDiaryLoading] = useState(false);
  const [selectedDiarySession, setSelectedDiarySession] = useState<DiarySession | null>(null);
  const [selectedSessionEntries, setSelectedSessionEntries] = useState<DiaryEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);

  const [anamnesisData, setAnamnesisData] = useState<any>(null);
  const [anamnesisLoading, setAnamnesisLoading] = useState(false);

  const t = (en: string, es: string) => language === 'es' ? es : en;

  useEffect(() => {
    loadAthletes();
  }, [profile]);

  useEffect(() => {
    if (viewAthleteId) {
      setSatelliteData(null);
      setDiarySessions([]);
      setAnamnesisData(null);
      setActiveTab('dashboard');
      setSelectedPlanDay(0);
      setExpandedMeal(null);
      loadSatelliteData(viewAthleteId);
    }
  }, [viewAthleteId]);

  useEffect(() => {
    if (viewAthleteId && activeTab === 'diary') loadDiarySessions(viewAthleteId);
  }, [viewAthleteId, activeTab]);

  useEffect(() => {
    if (viewAthleteId && activeTab === 'anamnesis') loadAnamnesisData(viewAthleteId);
  }, [viewAthleteId, activeTab]);

  const loadAthletes = async () => {
    if (!profile) return;
    setAthletesLoading(true);
    try {
      const { data: direct } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email, sport')
        .eq('assigned_trainer_id', profile.id)
        .eq('role', 'athlete')
        .order('full_name');

      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('athlete_id, teams!inner(coach_id)')
        .eq('teams.coach_id', profile.id);

      const teamAthleteIds = (teamMembers || []).map((m: any) => m.athlete_id);
      const directIds = (direct || []).map(a => a.id);
      const allIds = [...new Set([...directIds, ...teamAthleteIds])];

      let all: AthleteOption[] = direct || [];

      if (teamAthleteIds.length > 0) {
        const newIds = teamAthleteIds.filter(id => !directIds.includes(id));
        if (newIds.length > 0) {
          const { data: teamAthletes } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, email, sport')
            .in('id', newIds)
            .eq('role', 'athlete')
            .order('full_name');
          all = [...all, ...(teamAthletes || [])];
        }
      }

      all.sort((a, b) => a.full_name.localeCompare(b.full_name));
      setAthletes(all);

      if (viewAthleteId && !all.find(a => a.id === viewAthleteId)) {
        setViewAthleteId(null);
        setViewAthleteName(null);
      }
      if (viewAthleteId) {
        const found = all.find(a => a.id === viewAthleteId);
        if (found) setViewAthleteAvatar(found.avatar_url);
      }
    } catch {
    } finally {
      setAthletesLoading(false);
    }
  };

  const loadSatelliteData = async (athleteId: string) => {
    setSatelliteLoading(true);
    setSatelliteError(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const resp = await fetch(
        `${supabaseUrl}/functions/v1/nutrition-satellite-bridge/nutrition-summary?athlete_id=${athleteId}`,
        { headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' } }
      );
      if (!resp.ok) throw new Error('Satellite unavailable');
      const data = await resp.json();
      setSatelliteData(data);
      setLastSyncTime(new Date());
    } catch {
      setSatelliteError(true);
    } finally {
      setSatelliteLoading(false);
    }
  };

  const loadDiarySessions = async (athleteId: string) => {
    setDiaryLoading(true);
    try {
      const { data } = await supabase
        .from('food_diary_sessions')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('start_date', { ascending: false })
        .limit(30);
      setDiarySessions(data || []);
    } catch {
    } finally {
      setDiaryLoading(false);
    }
  };

  const loadSessionEntries = async (sessionId: string) => {
    setEntriesLoading(true);
    try {
      const { data } = await supabase
        .from('food_diary_entries')
        .select('*')
        .eq('session_id', sessionId)
        .order('entry_time', { ascending: true });
      setSelectedSessionEntries(data || []);
    } catch {
    } finally {
      setEntriesLoading(false);
    }
  };

  const openSession = async (session: DiarySession) => {
    setSelectedDiarySession(session);
    await loadSessionEntries(session.id);
  };

  const loadAnamnesisData = async (athleteId: string) => {
    setAnamnesisLoading(true);
    try {
      const { data } = await supabase
        .from('nutrition_anamnesis')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setAnamnesisData(data);
    } catch {
    } finally {
      setAnamnesisLoading(false);
    }
  };

  const selectAthlete = (athlete: AthleteOption) => {
    setViewAthleteId(athlete.id);
    setViewAthleteName(athlete.full_name);
    setViewAthleteAvatar(athlete.avatar_url);
    setSearchQuery('');
  };

  const clearAthlete = () => {
    setViewAthleteId(null);
    setViewAthleteName(null);
    setViewAthleteAvatar(null);
    setSatelliteData(null);
  };

  const mealTypeLabel = (type: string) => {
    const labels: Record<string, { es: string; en: string }> = {
      breakfast: { es: 'Desayuno', en: 'Breakfast' },
      lunch: { es: 'Almuerzo', en: 'Lunch' },
      dinner: { es: 'Cena', en: 'Dinner' },
      snack: { es: 'Snack', en: 'Snack' },
      other: { es: 'Otro', en: 'Other' },
    };
    return labels[type]?.[language as 'es' | 'en'] ?? type;
  };

  const intensityConfig = {
    green: { label: t('Low load', 'Carga baja'), bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
    yellow: { label: t('Moderate', 'Moderado'), bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
    red: { label: t('High / Race', 'Alta / Comp.'), bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-400', dot: 'bg-rose-500' },
  };

  const mealIcon = (type: string) => {
    const icons: Record<string, any> = {
      breakfast: Sun, mid_morning: Coffee, lunch: Utensils, afternoon: Coffee,
      dinner: Moon, pre_workout: Zap, post_workout: Zap, other_1: UtensilsCrossed, other_2: UtensilsCrossed,
    };
    return icons[type] || Utensils;
  };

  const itemLabel = (item: PlanItem) => {
    if (item.item_type === 'food') return item.food_name ?? '';
    if (item.item_type === 'recipe') return item.recipe_name ?? '';
    if (item.item_type === 'supplement') return `${item.product_name}${item.brand ? ` (${item.brand})` : ''}`;
    if (item.item_type === 'product') return `${item.product_name}${item.brand ? ` — ${item.brand}` : ''}`;
    return '';
  };

  const itemTypeBadge = (type: string) => {
    const cfg: Record<string, { label: string; cls: string }> = {
      food: { label: t('Food', 'Alimento'), cls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
      recipe: { label: t('Recipe', 'Receta'), cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
      supplement: { label: t('Supplement', 'Suplemento'), cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
      product: { label: t('Product', 'Producto'), cls: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' },
    };
    const c = cfg[type] ?? cfg.food;
    return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${c.cls}`}>{c.label}</span>;
  };

  const filteredAthletes = athletes.filter(a =>
    a.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const targets = satelliteData?.nutrition_targets || satelliteData?.active_plan;
  const adherence = satelliteData?.today_adherence;
  const lastDiary = satelliteData?.last_diary_session;

  const renderAthleteSelector = () => (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder={t('Search athlete...', 'Buscar atleta...')}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#514163]/30 focus:border-[#514163] transition-all"
        />
      </div>

      {athletesLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-7 h-7 border-2 border-[#514163] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredAthletes.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-10 text-center">
          <Users className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {searchQuery
              ? t('No athletes match your search', 'Ningún atleta coincide con la búsqueda')
              : t('No athletes assigned yet', 'Sin atletas asignados aún')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAthletes.map(athlete => (
            <button
              key={athlete.id}
              onClick={() => selectAthlete(athlete)}
              className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[#514163] dark:hover:border-[#514163] p-4 text-left transition-all hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden bg-gradient-to-br from-[#514163] to-[#3a2f4a]">
                  {athlete.avatar_url ? (
                    <img src={athlete.avatar_url} alt={athlete.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm truncate group-hover:text-[#514163] dark:group-hover:text-[#fdda36] transition-colors">
                    {athlete.full_name}
                  </p>
                  {athlete.sport && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{athlete.sport}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-[#514163] dark:group-hover:text-[#fdda36] transition-colors flex-shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderDashboard = () => {
    const pushedPlan = satelliteData?.pushed_plan;
    const currentDay = pushedPlan?.plan_data?.days?.[selectedPlanDay] ?? null;

    const computedDayTotals = currentDay?.meals?.length
      ? {
          target_kcal: Math.round(currentDay.meals.reduce((s: number, m: any) => s + (m.kcal ?? 0), 0)),
          target_protein_g: Math.round(currentDay.meals.reduce((s: number, m: any) => s + (m.protein_g ?? 0), 0)),
          target_carbs_g: Math.round(currentDay.meals.reduce((s: number, m: any) => s + (m.carbs_g ?? 0), 0)),
          target_fat_g: Math.round(currentDay.meals.reduce((s: number, m: any) => s + (m.fat_g ?? 0), 0)),
        }
      : null;

    const dayTargets = currentDay?.day_targets ?? computedDayTotals ?? pushedPlan?.summary ?? null;

    return (
      <div className="space-y-6">
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
          satelliteError
            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400'
            : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400'
        }`}>
          <Satellite className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">
            {satelliteError
              ? t('Nutrition satellite not connected.', 'Satélite de nutrición no conectado.')
              : lastSyncTime
                ? t(`Data from nutrition satellite — last sync ${lastSyncTime.toLocaleTimeString()}`, `Datos del satélite — última sync ${lastSyncTime.toLocaleTimeString()}`)
                : t('Connecting to nutrition satellite...', 'Conectando con el satélite...')}
          </span>
          <button
            onClick={() => viewAthleteId && loadSatelliteData(viewAthleteId)}
            disabled={satelliteLoading}
            className="p-1 rounded hover:bg-black/10 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${satelliteLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {pushedPlan ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Satellite className="w-4 h-4 text-emerald-200" />
                    <span className="text-emerald-200 text-xs font-medium uppercase tracking-wider">
                      {t('Nutrition Plan — Satellite', 'Plan Nutricional — Satélite')}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white">{pushedPlan.plan_name}</h2>
                  <p className="text-emerald-200 text-sm mt-0.5">
                    {new Date(pushedPlan.plan_date + 'T12:00:00').toLocaleDateString(
                      language === 'es' ? 'es-ES' : 'en-US',
                      { day: 'numeric', month: 'long', year: 'numeric' }
                    )}
                    {' · '}{pushedPlan.plan_duration_days} {t('days', 'días')}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-3xl font-bold text-white">{pushedPlan.summary.target_kcal}</p>
                  <p className="text-emerald-200 text-xs">kcal / {t('day', 'día')}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4">
                {[
                  { label: t('Protein', 'Proteínas'), value: pushedPlan.summary.target_protein_g, color: 'bg-blue-400/30' },
                  { label: t('Carbs', 'Carbos'), value: pushedPlan.summary.target_carbs_g, color: 'bg-amber-400/30' },
                  { label: t('Fat', 'Grasas'), value: pushedPlan.summary.target_fat_g, color: 'bg-rose-400/30' },
                ].map(m => (
                  <div key={m.label} className={`${m.color} rounded-xl p-3 text-center`}>
                    <p className="text-white font-bold text-lg">{m.value}<span className="text-xs font-normal ml-0.5">g</span></p>
                    <p className="text-emerald-100 text-xs">{m.label}</p>
                  </div>
                ))}
              </div>

              {pushedPlan.notes && (
                <p className="mt-3 text-emerald-100 text-xs italic border-t border-emerald-500/40 pt-3">{pushedPlan.notes}</p>
              )}
            </div>

            <div className="px-4 pt-4 pb-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                {t('Select day', 'Seleccionar día')}
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {pushedPlan.plan_data.days.map((day: any, idx: number) => {
                  const intensity = day.training_intensity;
                  const isActive = idx === selectedPlanDay;
                  const dayKcal = day.day_targets?.target_kcal
                    ?? (day.meals?.length ? Math.round(day.meals.reduce((s: number, m: any) => s + (m.kcal ?? 0), 0)) : null);
                  return (
                    <button
                      key={idx}
                      onClick={() => { setSelectedPlanDay(idx); setExpandedMeal(null); }}
                      className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-xl border-2 transition-all min-w-[80px] ${
                        isActive
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                          : 'border-transparent bg-gray-50 dark:bg-gray-700/50 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <span className={`text-xs font-bold ${isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {t('Day', 'Día')} {day.day}
                      </span>
                      {dayKcal !== null && (
                        <span className={`text-[11px] font-semibold ${isActive ? 'text-emerald-600 dark:text-emerald-300' : 'text-gray-500 dark:text-gray-400'}`}>
                          {dayKcal} kcal
                        </span>
                      )}
                      {intensity && <span className={`w-2 h-2 rounded-full mt-0.5 ${intensityConfig[intensity].dot}`} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {currentDay && (
              <div className="px-4 pb-5 space-y-4">
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-base">{currentDay.day_name}</h3>
                    {currentDay.training_intensity && (
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${intensityConfig[currentDay.training_intensity].bg} ${intensityConfig[currentDay.training_intensity].text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${intensityConfig[currentDay.training_intensity].dot}`} />
                        {intensityConfig[currentDay.training_intensity].label}
                      </span>
                    )}
                  </div>
                  {dayTargets && (
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{dayTargets.target_kcal} <span className="text-xs font-normal text-gray-400">kcal</span></p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        P:{dayTargets.target_protein_g}g · C:{dayTargets.target_carbs_g}g · G:{dayTargets.target_fat_g}g
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {currentDay.meals.map((meal, mIdx) => {
                    const mealKey = `${selectedPlanDay}-${mIdx}`;
                    const isExpanded = expandedMeal === mealKey;
                    const MealIcon = mealIcon(meal.meal_type);

                    return (
                      <div key={mIdx} className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setExpandedMeal(isExpanded ? null : mealKey)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <MealIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900 dark:text-white text-sm">{meal.meal_name}</p>
                              {meal.meal_time && <span className="text-xs text-gray-400">{meal.meal_time}</span>}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {meal.kcal} kcal · P:{meal.protein_g}g · C:{meal.carbs_g}g · G:{meal.fat_g}g
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs font-bold text-orange-500">{meal.kcal} kcal</span>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 space-y-2 bg-gray-50/50 dark:bg-gray-700/20">
                            {meal.items.map((item, iIdx) => (
                              <div key={iIdx} className="flex items-start justify-between gap-3 py-2 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                    {itemTypeBadge(item.item_type)}
                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{itemLabel(item)}</span>
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 dark:text-gray-400">
                                    {item.quantity_g && <span>{item.quantity_g}g</span>}
                                    {item.servings && item.item_type === 'recipe' && <span>{item.servings} {t('serving', 'porción')}</span>}
                                    {item.serving_unit && item.item_type !== 'recipe' && <span>1 {item.serving_unit}</span>}
                                    <span className="text-orange-500 font-medium">{item.calories} kcal</span>
                                    <span>P:{item.protein_g}g</span>
                                    <span>C:{item.carbs_g}g</span>
                                    <span>G:{item.fat_g}g</span>
                                  </div>
                                  {item.item_type === 'recipe' && item.ingredients && item.ingredients.length > 0 && (
                                    <div className="mt-1.5 pl-2 border-l-2 border-blue-200 dark:border-blue-700 space-y-0.5">
                                      {item.ingredients.map((ing, ingIdx) => (
                                        <p key={ingIdx} className="text-xs text-gray-500 dark:text-gray-400">
                                          {ing.name}{ing.quantity_g ? ` — ${ing.quantity_g}${ing.unit ?? 'g'}` : ''}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                  {item.item_type === 'supplement' && item.brand && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                                      <Pill className="w-3 h-3" /> {item.brand} · {item.supplement_type}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                {t('Nutrition Targets', 'Objetivos Nutricionales')}
              </h2>
              {satelliteData?.active_plan && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                  {satelliteData.active_plan.plan_name}
                </span>
              )}
            </div>

            {targets ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: t('Calories', 'Calorías'), value: targets.target_kcal, unit: 'kcal', icon: Flame, color: 'text-orange-500' },
                  { label: t('Protein', 'Proteínas'), value: targets.target_protein_g, unit: 'g', icon: Beef, color: 'text-blue-500' },
                  { label: t('Carbs', 'Carbohidratos'), value: targets.target_carbs_g, unit: 'g', icon: Wheat, color: 'text-amber-500' },
                  { label: t('Fat', 'Grasas'), value: targets.target_fat_g, unit: 'g', icon: Droplets, color: 'text-rose-500' },
                ].map(item => (
                  <div key={item.label} className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <item.icon className={`w-4 h-4 ${item.color}`} />
                      <span className="text-xs text-gray-500 dark:text-gray-400">{item.label}</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {item.value ?? '—'} <span className="text-xs font-normal text-gray-400">{item.unit}</span>
                    </p>
                  </div>
                ))}
              </div>
            ) : satelliteLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                <Satellite className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">{t('No nutrition plan has been pushed for this athlete yet', 'Aún no se ha enviado ningún plan nutricional para este atleta')}</p>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-[#fdda36]" />
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{t("Today's Adherence", 'Adherencia de Hoy')}</h3>
            </div>
            {adherence ? (
              <div className="space-y-3">
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">{Math.round(adherence.adherence_score ?? 0)}%</span>
                  <span className="text-sm text-gray-400 mb-1">{t('adherence', 'adherencia')}</span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[#fdda36] transition-all" style={{ width: `${Math.min(100, adherence.adherence_score ?? 0)}%` }} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{adherence.actual_kcal} / {adherence.target_kcal} kcal</p>
              </div>
            ) : (
              <div className="text-center py-4">
                <AlertCircle className="w-7 h-7 text-gray-300 dark:text-gray-600 mx-auto mb-1.5" />
                <p className="text-xs text-gray-400 dark:text-gray-500">{t('No adherence data for today', 'Sin datos de adherencia hoy')}</p>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4 text-[#fdda36]" />
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{t('Last Diary Session', 'Último Diario')}</h3>
            </div>
            {lastDiary ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {lastDiary.status === 'completed'
                    ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                    : <Clock className="w-4 h-4 text-amber-500" />}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{lastDiary.status}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {new Date(lastDiary.session_date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric' })}
                </p>
                <button onClick={() => setActiveTab('diary')} className="text-xs text-[#514163] dark:text-[#fdda36] hover:underline font-medium">
                  {t('View all diaries →', 'Ver todos los diarios →')}
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <BookOpen className="w-7 h-7 text-gray-300 dark:text-gray-600 mx-auto mb-1.5" />
                <p className="text-xs text-gray-400 dark:text-gray-500">{t('No diary sessions yet', 'Sin sesiones de diario aún')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderDiaryTab = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('24-48h Food Diary', 'Diario Alimentario 24-48h')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('Diary sessions logged by the athlete', 'Sesiones de diario registradas por el atleta')}</p>
      </div>

      {diaryLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : diarySessions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('No diaries yet', 'Sin diarios aún')}</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {t('This athlete has not logged any diary sessions yet.', 'Este atleta todavía no ha registrado ninguna sesión de diario.')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {diarySessions.map(session => (
            <button
              key={session.id}
              onClick={() => openSession(session)}
              className="w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-600 p-4 text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    session.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
                  }`}>
                    {session.status === 'completed'
                      ? <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      : <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">
                      {new Date(session.start_date + 'T12:00:00').toLocaleDateString(
                        language === 'es' ? 'es-ES' : 'en-US',
                        { weekday: 'long', day: 'numeric', month: 'long' }
                      )}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{session.period_hours}h {t('period', 'período')}</span>
                      {session.status === 'completed' && (
                        <>
                          <span className="text-gray-300 dark:text-gray-600">·</span>
                          <span className="text-xs font-medium text-orange-600 dark:text-orange-400">{session.total_calories} kcal</span>
                          <span className="text-xs text-blue-600 dark:text-blue-400">{session.total_protein_g}g P</span>
                          <span className="text-xs text-amber-600 dark:text-amber-400">{session.total_carbs_g}g C</span>
                          <span className="text-xs text-rose-600 dark:text-rose-400">{session.total_fat_g}g G</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {session.reviewed_at && (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                      <CheckCircle className="w-3 h-3" />
                      {t('Reviewed', 'Revisado')}
                      {session.adherence_score && ` ${session.adherence_score}/100`}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedDiarySession && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={() => setSelectedDiarySession(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-emerald-500 to-green-600 text-white p-5 rounded-t-2xl flex items-center justify-between z-10">
                <div>
                  <h2 className="text-xl font-bold">
                    {t('Food Diary', 'Diario Alimentario')} — {new Date(selectedDiarySession.start_date + 'T12:00:00').toLocaleDateString(
                      language === 'es' ? 'es-ES' : 'en-US',
                      { day: 'numeric', month: 'long', year: 'numeric' }
                    )}
                  </h2>
                  <p className="text-green-100 text-sm mt-0.5">
                    {selectedDiarySession.period_hours}h {t('period', 'período')} · {viewAthleteName}
                  </p>
                </div>
                <button onClick={() => setSelectedDiarySession(null)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {selectedDiarySession.status === 'completed' && (
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'kcal', value: selectedDiarySession.total_calories, bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400' },
                      { label: 'CHO', value: `${selectedDiarySession.total_carbs_g}g`, bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400' },
                      { label: 'PRO', value: `${selectedDiarySession.total_protein_g}g`, bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' },
                      { label: 'FAT', value: `${selectedDiarySession.total_fat_g}g`, bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-600 dark:text-rose-400' },
                    ].map(m => (
                      <div key={m.label} className={`${m.bg} rounded-xl p-3 text-center`}>
                        <p className={`text-xl font-bold ${m.text}`}>{m.value}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{m.label}</p>
                      </div>
                    ))}
                  </div>
                )}

                {selectedDiarySession.reviewed_at && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                    <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                      {t('Reviewed by coach', 'Revisado por el coach')}
                      {selectedDiarySession.adherence_score && ` — ${t('Adherence', 'Adherencia')}: ${selectedDiarySession.adherence_score}/100`}
                    </span>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">
                    {t('Logged Meals', 'Comidas Registradas')}
                  </h3>
                  {entriesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : selectedSessionEntries.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
                      {t('No entries in this session', 'Sin entradas en esta sesión')}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {selectedSessionEntries.map(entry => (
                        <div key={entry.id} className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{entry.entry_time}</span>
                              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                                {mealTypeLabel(entry.meal_type)}
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">≈ {entry.estimated_calories} kcal</span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{entry.food_description}</p>
                          <div className="flex gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>{entry.estimated_carbs_g}g CHO</span>
                            <span>{entry.estimated_protein_g}g PRO</span>
                            <span>{entry.estimated_fat_g}g FAT</span>
                          </div>
                          {entry.additional_notes && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 italic">{entry.additional_notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderAnamnesisTab = () => (
    <div className="space-y-4">
      {anamnesisLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : anamnesisData ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ClipboardList className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('Nutritional Anamnesis', 'Anamnesis Nutricional')}</h2>
                {anamnesisData.is_complete && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                    {t('Complete', 'Completa')}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('Last updated', 'Última actualización')}: {new Date(anamnesisData.updated_at).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: t('Age', 'Edad'), value: anamnesisData.age ? `${anamnesisData.age} ${t('years', 'años')}` : null },
              { label: t('Sex', 'Sexo'), value: anamnesisData.sex ? (anamnesisData.sex === 'male' ? t('Male', 'Masculino') : t('Female', 'Femenino')) : null },
              { label: t('Height', 'Altura'), value: anamnesisData.height_cm ? `${anamnesisData.height_cm} cm` : null },
              { label: t('Weight', 'Peso'), value: anamnesisData.weight_kg ? `${anamnesisData.weight_kg} kg` : null },
              { label: t('Sport', 'Deporte'), value: anamnesisData.sport || null },
              { label: t('Training Frequency', 'Frecuencia de Entrenamiento'), value: anamnesisData.training_frequency || null },
              { label: t('Activity Level', 'Nivel de Actividad'), value: anamnesisData.activity_level || null },
              { label: t('Main Goal', 'Objetivo Principal'), value: anamnesisData.main_goal ? anamnesisData.main_goal.replace(/_/g, ' ') : null },
              { label: t('Dietary Pattern', 'Patrón Dietético'), value: anamnesisData.dietary_preferences || null },
            ].filter(item => item.value).map(item => (
              <div key={item.label} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{item.label}</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{item.value}</p>
              </div>
            ))}
          </div>

          {(anamnesisData.allergies_intolerances || anamnesisData.medical_conditions) && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {anamnesisData.allergies_intolerances && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Allergies/Intolerances', 'Alergias/Intolerancias')}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{anamnesisData.allergies_intolerances}</p>
                </div>
              )}
              {anamnesisData.medical_conditions && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Medical Conditions', 'Condiciones Médicas')}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{anamnesisData.medical_conditions}</p>
                </div>
              )}
            </div>
          )}

          {anamnesisData.nutrition_goals && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Nutrition Goals', 'Objetivos Nutricionales')}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{anamnesisData.nutrition_goals}</p>
            </div>
          )}

          {!anamnesisData.is_complete && (
            <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {t('Anamnesis is incomplete. The athlete has not filled all sections.', 'La anamnesis está incompleta. El atleta no ha completado todas las secciones.')}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('No anamnesis recorded', 'Sin anamnesis registrada')}</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {t('This athlete has not completed their nutritional assessment yet.', 'Este atleta aún no ha completado su evaluación nutricional.')}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('Athlete Nutrition', 'Nutrición del Atleta')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('View nutrition plans and food diaries for your athletes', 'Visualiza planes nutricionales y diarios de tus atletas')}
        </p>
      </div>

      {!viewAthleteId ? (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[#514163] to-[#3a2f4a] rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white">{t('Select an Athlete', 'Seleccionar Atleta')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {athletes.length} {athletes.length === 1 ? t('athlete', 'atleta') : t('athletes', 'atletas')}
                </p>
              </div>
            </div>
            {renderAthleteSelector()}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button
              onClick={clearAthlete}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-300 dark:hover:border-gray-500 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              {t('All Athletes', 'Todos los Atletas')}
            </button>

            <div className="flex items-center gap-3 flex-1">
              <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#514163] to-[#3a2f4a] flex-shrink-0">
                {viewAthleteAvatar ? (
                  <img src={viewAthleteAvatar} alt={viewAthleteName ?? ''} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-white" />
                )}
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white">{viewAthleteName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('Nutrition overview', 'Vista nutricional')}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-sm border transition-all p-5 text-left ${
                activeTab === 'dashboard'
                  ? 'border-[#514163] dark:border-[#514163]'
                  : 'border-gray-200 dark:border-gray-700 hover:border-[#514163] dark:hover:border-[#514163]'
              }`}
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-[#514163]/10 to-transparent rounded-bl-full" />
              <div className="relative">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform ${
                  activeTab === 'dashboard' ? 'bg-gradient-to-br from-[#514163] to-[#3a2f4a]' : 'bg-gradient-to-br from-[#514163] to-[#3a2f4a] dark:from-[#514163]/30 dark:to-[#3a2f4a]/20'
                }`}>
                  <BarChart3 className="w-5 h-5 text-white dark:text-[#fdda36]" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-0.5">{t('Dashboard', 'Panel')}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('Plan & targets', 'Plan y objetivos')}</p>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('diary')}
              className={`group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-sm border transition-all p-5 text-left ${
                activeTab === 'diary'
                  ? 'border-emerald-500 dark:border-emerald-500'
                  : 'border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500'
              }`}
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-bl-full" />
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-900/40 dark:to-emerald-800/30 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-5 h-5 text-white dark:text-emerald-400" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-0.5">{t('Food Diary', 'Diario')}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('24-48h sessions', 'Sesiones 24-48h')}</p>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('anamnesis')}
              className={`group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-sm border transition-all p-5 text-left ${
                activeTab === 'anamnesis'
                  ? 'border-blue-500 dark:border-blue-500'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500'
              }`}
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full" />
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-900/40 dark:to-blue-800/30 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <ClipboardList className="w-5 h-5 text-white dark:text-blue-400" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-0.5">{t('Anamnesis', 'Anamnesis')}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('Assessment', 'Evaluación')}</p>
              </div>
            </button>
          </div>

          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'diary' && renderDiaryTab()}
          {activeTab === 'anamnesis' && renderAnamnesisTab()}
        </div>
      )}
    </div>
  );
}
