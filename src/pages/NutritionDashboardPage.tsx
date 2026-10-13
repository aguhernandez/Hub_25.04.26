import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { useProfessionalServiceAccess } from '../hooks/useProfessionalServiceAccess';
import ServiceAccessGate from '../components/ServiceAccessGate';
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
  Plus,
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
  UserCheck
} from 'lucide-react';
import NutritionAnamnesis from '../components/nutrition/NutritionAnamnesis';
import FoodDiaryWeekView from '../components/nutrition/FoodDiaryWeekView';
import ProNutritionView from '../components/nutrition/ProNutritionView';
import InteractivePlate from '../components/nutrition/InteractivePlate';

type Tab = 'dashboard' | 'diary' | 'anamnesis' | 'plate' | 'coaching';

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
  day_label?: string;
  date?: string | null;
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

export default function NutritionDashboardPage() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [satelliteData, setSatelliteData] = useState<SatelliteNutritionData | null>(null);
  const [satelliteLoading, setSatelliteLoading] = useState(false);
  const [satelliteError, setSatelliteError] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [diarySessions, setDiarySessions] = useState<DiarySession[]>([]);
  const [diaryLoading, setDiaryLoading] = useState(false);
  const [anamnesisData, setAnamnesisData] = useState<any>(null);
  const [anamnesisLoading, setAnamnesisLoading] = useState(false);
  const [showAnamnesisForm, setShowAnamnesisForm] = useState(false);
  const [selectedPlanDay, setSelectedPlanDay] = useState<number>(0);
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);

  const t = (en: string, es: string) => language === 'es' ? es : en;
  const nutritionAccess = useProfessionalServiceAccess('nutrition');

  useEffect(() => {
    if (profile) loadSatelliteData();
  }, [profile]);

  useEffect(() => {
    if (profile && activeTab === 'diary') loadDiarySessions();
  }, [profile, activeTab]);

  useEffect(() => {
    if (profile && activeTab === 'anamnesis') {
      setShowAnamnesisForm(false);
      loadAnamnesisData();
    }
  }, [profile, activeTab]);

  const loadSatelliteData = async () => {
    if (!profile) return;
    setSatelliteLoading(true);
    setSatelliteError(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const resp = await fetch(
        `${supabaseUrl}/functions/v1/nutrition-satellite-bridge/nutrition-summary?athlete_id=${profile.id}`,
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

  const loadDiarySessions = async () => {
    if (!profile) return;
    setDiaryLoading(true);
    try {
      const { data } = await supabase
        .from('food_diary_sessions')
        .select('*')
        .eq('athlete_id', profile.id)
        .order('start_date', { ascending: false })
        .limit(20);
      setDiarySessions(data || []);
    } catch {
    } finally {
      setDiaryLoading(false);
    }
  };

  const loadAnamnesisData = async () => {
    if (!profile) return;
    setAnamnesisLoading(true);
    try {
      const { data } = await supabase
        .from('nutrition_anamnesis')
        .select('*')
        .eq('athlete_id', profile.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setAnamnesisData(data);
    } catch {
    } finally {
      setAnamnesisLoading(false);
    }
  };

  const targets = satelliteData?.nutrition_targets || satelliteData?.active_plan;
  const adherence = satelliteData?.today_adherence;
  const lastDiary = satelliteData?.last_diary_session;

  const macroBar = (value: number, total: number, color: string) => {
    const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
    return (
      <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    );
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
      breakfast: Sun,
      mid_morning: Coffee,
      lunch: Utensils,
      afternoon: Coffee,
      dinner: Moon,
      pre_workout: Zap,
      post_workout: Zap,
      other_1: UtensilsCrossed,
      other_2: UtensilsCrossed,
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
      {/* Satellite status bar */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
        satelliteError
          ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400'
          : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400'
      }`}>
        <Satellite className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1">
          {satelliteError
            ? t('Nutrition satellite not connected. Data will appear here when the satellite sends it.', 'Satélite de nutrición no conectado. Los datos aparecerán aquí cuando el satélite los envíe.')
            : lastSyncTime
              ? t(`Data from nutrition satellite — last sync ${lastSyncTime.toLocaleTimeString()}`, `Datos del satélite de nutrición — última sincronización ${lastSyncTime.toLocaleTimeString()}`)
              : t('Connecting to nutrition satellite...', 'Conectando con el satélite de nutrición...')}
        </span>
        <button
          onClick={loadSatelliteData}
          disabled={satelliteLoading}
          className="p-1 rounded hover:bg-black/10 transition-colors"
          title={t('Refresh', 'Actualizar')}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${satelliteLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* --- PUSHED PLAN SECTION --- */}
      <ServiceAccessGate
        blocked={nutritionAccess.status === 'restricted' || nutritionAccess.status === 'blocked'}
        serviceType="nutrition"
        hasPendingPayment={nutritionAccess.hasPendingPayment}
        blurHeight="400px"
      >
      {pushedPlan ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Plan header */}
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
                  {new Date(pushedPlan.plan_date + 'T12:00:00').toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {' · '}{pushedPlan.plan_duration_days} {t('days', 'días')}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-3xl font-bold text-white">{pushedPlan.summary.target_kcal}</p>
                <p className="text-emerald-200 text-xs">kcal / {t('day', 'día')}</p>
              </div>
            </div>

            {/* Summary macros */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                { label: t('Protein', 'Proteínas'), value: pushedPlan.summary.target_protein_g, unit: 'g', color: 'bg-blue-400/30' },
                { label: t('Carbs', 'Carbos'), value: pushedPlan.summary.target_carbs_g, unit: 'g', color: 'bg-amber-400/30' },
                { label: t('Fat', 'Grasas'), value: pushedPlan.summary.target_fat_g, unit: 'g', color: 'bg-rose-400/30' },
              ].map(m => (
                <div key={m.label} className={`${m.color} rounded-xl p-3 text-center`}>
                  <p className="text-white font-bold text-lg">{m.value}<span className="text-xs font-normal ml-0.5">{m.unit}</span></p>
                  <p className="text-emerald-100 text-xs">{m.label}</p>
                </div>
              ))}
            </div>

            {pushedPlan.notes && (
              <p className="mt-3 text-emerald-100 text-xs italic border-t border-emerald-500/40 pt-3">{pushedPlan.notes}</p>
            )}
          </div>

          {/* Day selector */}
          <div className="px-4 pt-4 pb-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              {t('Select day', 'Seleccionar día')}
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {pushedPlan.plan_data.days.map((day: any, idx: number) => {
                const intensity = day.training_intensity;
                const isActive = idx === selectedPlanDay;
                const isCalendar = !!pushedPlan.plan_data.plan_mode && pushedPlan.plan_data.plan_mode === 'calendar';
                const todayIso = new Date().toISOString().split('T')[0];
                const isToday = isCalendar && day.date === todayIso;
                const dayKcal = day.day_targets?.target_kcal
                  ?? (day.meals?.length ? Math.round(day.meals.reduce((s: number, m: any) => s + (m.kcal ?? 0), 0)) : null);

                let topLabel: string;
                let bottomLabel: string | null = null;
                if (isCalendar && day.date) {
                  const d = new Date(day.date + 'T12:00:00');
                  topLabel = d.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { weekday: 'short' });
                  bottomLabel = d.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' });
                } else {
                  topLabel = day.day_label ?? (t('Day', 'Día') + ' ' + (day.day ?? idx + 1));
                }

                return (
                  <button
                    key={idx}
                    onClick={() => { setSelectedPlanDay(idx); setExpandedMeal(null); }}
                    className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-xl border-2 transition-all min-w-[72px] ${
                      isToday && isActive
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-300 dark:ring-emerald-700'
                        : isToday
                        ? 'border-emerald-400 bg-emerald-50/60 dark:bg-emerald-900/10 ring-1 ring-emerald-200 dark:ring-emerald-800'
                        : isActive
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-transparent bg-gray-50 dark:bg-gray-700/50 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    {isToday && (
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider leading-none mb-0.5">
                        {t('Today', 'Hoy')}
                      </span>
                    )}
                    <span className={`text-xs font-bold capitalize ${isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-300'}`}>
                      {topLabel}
                    </span>
                    {bottomLabel && (
                      <span className={`text-[11px] capitalize ${isActive ? 'text-emerald-600 dark:text-emerald-300' : 'text-gray-500 dark:text-gray-400'}`}>
                        {bottomLabel}
                      </span>
                    )}
                    {dayKcal !== null && (
                      <span className={`text-[10px] font-semibold ${isActive ? 'text-emerald-600 dark:text-emerald-300' : 'text-gray-400 dark:text-gray-500'}`}>
                        {dayKcal} kcal
                      </span>
                    )}
                    {intensity && (
                      <span className={`w-2 h-2 rounded-full mt-0.5 ${intensityConfig[intensity].dot}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected day detail */}
          {currentDay && (
            <div className="px-4 pb-5 space-y-4">
              {/* Day header */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base capitalize">{currentDay.day_name}</h3>
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

              {/* Meals */}
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
                            {meal.meal_time && (
                              <span className="text-xs text-gray-400">{meal.meal_time}</span>
                            )}
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
                                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                    {itemLabel(item)}
                                  </span>
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
        /* No pushed plan — show targets / waiting state */
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
                { label: t('Calories', 'Calorías'), value: targets.target_kcal, unit: 'kcal', icon: Flame, color: 'text-orange-500', bar: 'bg-orange-400' },
                { label: t('Protein', 'Proteínas'), value: targets.target_protein_g, unit: 'g', icon: Beef, color: 'text-blue-500', bar: 'bg-blue-400' },
                { label: t('Carbs', 'Carbohidratos'), value: targets.target_carbs_g, unit: 'g', icon: Wheat, color: 'text-amber-500', bar: 'bg-amber-400' },
                { label: t('Fat', 'Grasas'), value: targets.target_fat_g, unit: 'g', icon: Droplets, color: 'text-rose-500', bar: 'bg-rose-400' },
              ].map(item => (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{item.label}</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {item.value ?? '—'} <span className="text-xs font-normal text-gray-400">{item.unit}</span>
                  </p>
                  {adherence && item.label === t('Calories', 'Calorías') && (
                    macroBar(adherence.actual_kcal, item.value, item.bar)
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <Satellite className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">
                {t('Awaiting nutrition plan from satellite', 'Esperando plan nutricional del satélite')}
              </p>
            </div>
          )}
        </div>
      )}
      </ServiceAccessGate>

      {/* Adherence + Diary row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-[#fdda36]" />
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              {t("Today's Adherence", 'Adherencia de Hoy')}
            </h3>
          </div>
          {adherence ? (
            <div className="space-y-3">
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {Math.round(adherence.adherence_score ?? 0)}%
                </span>
                <span className="text-sm text-gray-400 mb-1">{t('adherence', 'adherencia')}</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#fdda36] transition-all"
                  style={{ width: `${Math.min(100, adherence.adherence_score ?? 0)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {adherence.actual_kcal} / {adherence.target_kcal} kcal
              </p>
            </div>
          ) : (
            <div className="text-center py-4">
              <AlertCircle className="w-7 h-7 text-gray-300 dark:text-gray-600 mx-auto mb-1.5" />
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {t('No adherence data for today', 'Sin datos de adherencia hoy')}
              </p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-[#fdda36]" />
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              {t('Last Diary Session', 'Último Diario')}
            </h3>
          </div>
          {lastDiary ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {lastDiary.status === 'finalized'
                  ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                  : <Clock className="w-4 h-4 text-amber-500" />}
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                  {lastDiary.status}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {new Date(lastDiary.session_date).toLocaleDateString(
                  language === 'es' ? 'es-ES' : 'en-US',
                  { month: 'short', day: 'numeric' }
                )}
              </p>
              <button
                onClick={() => setActiveTab('diary')}
                className="text-xs text-[#514163] dark:text-[#fdda36] hover:underline font-medium"
              >
                {t('View all diaries →', 'Ver todos los diarios →')}
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <BookOpen className="w-7 h-7 text-gray-300 dark:text-gray-600 mx-auto mb-1.5" />
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {t('No diary sessions yet', 'Sin sesiones de diario aún')}
              </p>
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
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          {t('24h Food Diary', 'Diario Alimentario 24h')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {t('Tap a day to view, add or edit your logs', 'Toca un día para ver, añadir o editar tus registros')}
        </p>
      </div>
      <FoodDiaryWeekView onChanged={() => { loadSatelliteData(); loadDiarySessions(); }} />
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'anamnesis':
        return (
          <div className="space-y-6">
            {anamnesisLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : anamnesisData && !showAnamnesisForm ? (
              <>
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <ClipboardList className="w-5 h-5 text-blue-500" />
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                          {t('Nutritional Anamnesis', 'Anamnesis Nutricional')}
                        </h2>
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
                    <button
                      onClick={() => setShowAnamnesisForm(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors"
                    >
                      {t('Edit', 'Editar')}
                    </button>
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
                      { label: t('Main Goal', 'Objetivo Principal'), value: anamnesisData.main_goal ? t(anamnesisData.main_goal.replace(/_/g, ' '), anamnesisData.main_goal.replace(/_/g, ' ')) : null },
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
                </div>

                {!anamnesisData.is_complete && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                        {t('Anamnesis incomplete', 'Anamnesis incompleta')}
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                        {t('Complete all 4 sections to get personalized nutrition recommendations.', 'Completa las 4 secciones para obtener recomendaciones nutricionales personalizadas.')}
                      </p>
                      <button onClick={() => setShowAnamnesisForm(true)} className="mt-2 text-xs font-semibold text-amber-800 dark:text-amber-300 underline">
                        {t('Continue editing →', 'Continuar editando →')}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : !anamnesisData && !showAnamnesisForm ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ClipboardList className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {t('No anamnesis recorded', 'Sin anamnesis registrada')}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mx-auto mb-6">
                  {t(
                    'Complete your nutritional assessment to receive personalized macro and calorie recommendations.',
                    'Completa tu evaluación nutricional para recibir recomendaciones personalizadas de macros y calorías.'
                  )}
                </p>
                <button
                  onClick={() => setShowAnamnesisForm(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {t('Start Anamnesis', 'Iniciar Anamnesis')}
                </button>
              </div>
            ) : null}

            {showAnamnesisForm && (
              <NutritionAnamnesis onSaveComplete={() => { setShowAnamnesisForm(false); loadAnamnesisData(); }} />
            )}
          </div>
        );
      case 'diary':
        return renderDiaryTab();
      case 'plate':
        return (
          <div>
            <InteractivePlate />
          </div>
        );
      case 'coaching':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-[#fdda36] to-[#f0c800] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <UserCheck className="w-8 h-8 text-[#514163]" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Nutrition 1:1
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mx-auto">
              {t(
                'Personalized nutritional guidance with a professional is coming soon. Your coach will be able to schedule dedicated nutrition sessions directly from here.',
                'El asesoramiento nutricional personalizado con un profesional estará disponible pronto. Tu coach podrá agendar sesiones de nutrición dedicadas directamente desde aquí.'
              )}
            </p>
          </div>
        );
      case 'dashboard':
      default:
        return renderDashboard();
    }
  };

  const isProfessional = profile?.role === 'trainer' || profile?.role === 'nutritionist' ||
    profile?.role === 'head_coach' || profile?.role === 'admin';
  if (isProfessional) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('Nutrition', 'Nutrición')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('Nutrition overview for your athletes', 'Vista nutricional de tus atletas')}
          </p>
        </div>
        <ProNutritionView />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('Nutrition', 'Nutrición')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('Food diary, assessment & plate guide', 'Diario alimentario, evaluación y guía de plato')}
        </p>
      </div>

      {/* Athlete quick actions — 4 buttons, no Dashboard, no New Diary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* 1. 24h Diary */}
          <button
            onClick={() => setActiveTab('diary')}
            className={`group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-lg border transition-all p-6 text-left ${
              activeTab === 'diary'
                ? 'border-emerald-500 dark:border-emerald-500'
                : 'border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500'
            }`}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-transparent dark:from-emerald-400/10 rounded-bl-full" />
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-900/40 dark:to-emerald-800/30 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6 text-white dark:text-emerald-400" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1">
                {t('24h Diary', 'Diario 24h')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('Log food with AI', 'Registra con IA')}
              </p>
            </div>
          </button>

          {/* 2. Anamnesis */}
          <button
            onClick={() => setActiveTab('anamnesis')}
            className={`group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-lg border transition-all p-6 text-left ${
              activeTab === 'anamnesis'
                ? 'border-blue-500 dark:border-blue-500'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500'
            }`}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-transparent dark:from-blue-400/10 rounded-bl-full" />
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-900/40 dark:to-blue-800/30 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ClipboardList className="w-6 h-6 text-white dark:text-blue-400" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1">
                {t('Anamnesis', 'Anamnesis')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('Nutritional assessment', 'Evaluación nutricional')}
              </p>
            </div>
          </button>

          {/* 3. Healthy Plate */}
          <button
            onClick={() => setActiveTab('plate')}
            className={`group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-lg border transition-all p-6 text-left ${
              activeTab === 'plate'
                ? 'border-amber-500 dark:border-amber-500'
                : 'border-gray-200 dark:border-gray-700 hover:border-amber-500 dark:hover:border-amber-500'
            }`}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/10 to-transparent dark:from-amber-400/10 rounded-bl-full" />
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 dark:from-amber-900/40 dark:to-amber-800/30 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Utensils className="w-6 h-6 text-white dark:text-amber-400" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1">
                {t('Healthy Plate', 'Plato Saludable')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('Harvard plate guide', 'Modelo Harvard')}
              </p>
            </div>
          </button>

          {/* 4. Nutrition 1:1 */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'services' }))}
            className={`group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-[#ffd700] dark:border-[#ffd700] hover:border-[#ffed4e] dark:hover:border-[#ffed4e] hover:shadow-xl hover:scale-105 transition-all p-6 text-left`}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#fdda36]/20 to-transparent dark:from-[#fdda36]/30 rounded-bl-full" />
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-[#fdda36] to-[#f0c800] rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <UserCheck className="w-6 h-6 text-[#514163]" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1">
                Nutrition 1:1
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('Nutritional guidance with a professional', 'Asesoramiento nutricional con un profesional')}
              </p>
            </div>
          </button>
        </div>

      {renderContent()}
    </div>
  );
}
