import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  Utensils,
  Activity,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Circle,
  TrendingUp,
  Calendar,
  RefreshCw,
  Link2,
  Flame
} from 'lucide-react';

interface ExternalNutritionPlan {
  id: string;
  plan_date: string;
  plan_name: string | null;
  planner_source: string;
  summary: {
    target_kcal?: number;
    target_protein_g?: number;
    target_carbs_g?: number;
    target_fat_g?: number;
    fuel_day_type?: 'green' | 'yellow' | 'red';
    meals?: Array<{ name: string; time?: string; kcal?: number; completed?: boolean }>;
  };
  adherence_data: {
    adherence_score?: number;
    actual_kcal?: number;
  };
  updated_at: string;
}

interface ExternalEndurancePlan {
  id: string;
  week_start_date: string;
  plan_name: string | null;
  planner_source: string;
  summary: {
    total_hours?: number;
    total_tss?: number;
    sessions?: number;
    workouts?: Array<{ date: string; name: string; duration_min?: number; tss?: number; type?: string }>;
  };
  updated_at: string;
}

interface Props {
  athleteId: string;
  compact?: boolean;
}

const FUEL_COLORS = {
  green: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  yellow: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  red: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
};

type ActiveTab = 'nutrition' | 'endurance';

export default function ExternalPlannerWidget({ athleteId, compact = false }: Props) {
  const { language } = useLanguage();
  const [tab, setTab] = useState<ActiveTab>('nutrition');
  const [nutritionPlans, setNutritionPlans] = useState<ExternalNutritionPlan[]>([]);
  const [endurancePlans, setEndurancePlans] = useState<ExternalEndurancePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [athleteId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const from = new Date(today);
      from.setDate(from.getDate() - 7);
      const to = new Date(today);
      to.setDate(to.getDate() + 14);
      const fmtLocal = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };
      const fromStr = fmtLocal(from);
      const toStr = fmtLocal(to);

      const [nutritionRes, enduranceRes] = await Promise.all([
        supabase
          .from('external_nutrition_plans')
          .select('id, plan_date, plan_name, planner_source, summary, adherence_data, updated_at')
          .eq('athlete_id', athleteId)
          .gte('plan_date', fromStr)
          .lte('plan_date', toStr)
          .order('plan_date', { ascending: false }),
        supabase
          .from('external_endurance_plans')
          .select('id, week_start_date, plan_name, planner_source, summary, updated_at')
          .eq('athlete_id', athleteId)
          .gte('week_start_date', fromStr)
          .order('week_start_date', { ascending: false })
          .limit(4),
      ]);

      setNutritionPlans((nutritionRes.data as ExternalNutritionPlan[]) || []);
      setEndurancePlans((enduranceRes.data as ExternalEndurancePlan[]) || []);
    } catch (e) {
      console.error('ExternalPlannerWidget error:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
    const label = d.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' });
    if (diff === 0) return language === 'es' ? `Hoy · ${label}` : `Today · ${label}`;
    if (diff === 1) return language === 'es' ? `Mañana · ${label}` : `Tomorrow · ${label}`;
    if (diff === -1) return language === 'es' ? `Ayer · ${label}` : `Yesterday · ${label}`;
    return label;
  };

  const formatWeek = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const end = new Date(d);
    end.setDate(end.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return `${d.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', opts)} – ${end.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', opts)}`;
  };

  const hasData = nutritionPlans.length > 0 || endurancePlans.length > 0;

  if (!loading && !hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-500 text-center">
        <Link2 className="w-8 h-8 mb-2 opacity-30" />
        <p className="text-sm">{language === 'es' ? 'Sin datos de planners externos' : 'No data from external planners'}</p>
        <p className="text-xs mt-1">{language === 'es' ? 'Cuando el Nutrition o Endurance Planner envíen datos, aparecerán aquí.' : 'When Nutrition or Endurance Planner push data, it will appear here.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setTab('nutrition')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${tab === 'nutrition' ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          <Utensils className="w-4 h-4" />
          {language === 'es' ? 'Nutrición' : 'Nutrition'}
          {nutritionPlans.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
              {nutritionPlans.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('endurance')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${tab === 'endurance' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          <Activity className="w-4 h-4" />
          {language === 'es' ? 'Endurance' : 'Endurance'}
          {endurancePlans.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              {endurancePlans.length}
            </span>
          )}
        </button>
        <button onClick={loadData} className="ml-auto p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-16">
          <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : tab === 'nutrition' ? (
        <NutritionTab
          plans={nutritionPlans}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
          formatDate={formatDate}
          language={language}
          compact={compact}
        />
      ) : (
        <EnduranceTab
          plans={endurancePlans}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
          formatWeek={formatWeek}
          language={language}
          compact={compact}
        />
      )}
    </div>
  );
}

function NutritionTab({ plans, expandedId, setExpandedId, formatDate, language, compact }: {
  plans: ExternalNutritionPlan[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  formatDate: (d: string) => string;
  language: string;
  compact: boolean;
}) {
  if (plans.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-sm">
        <Utensils className="w-7 h-7 mx-auto mb-2 opacity-30" />
        {language === 'es' ? 'Sin planes nutricionales recibidos del planner' : 'No nutrition plans received from planner'}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {plans.map(plan => {
        const fuel = plan.summary?.fuel_day_type ? FUEL_COLORS[plan.summary.fuel_day_type] : null;
        const isExpanded = expandedId === plan.id;
        const adherence = plan.adherence_data?.adherence_score;

        return (
          <div key={plan.id} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setExpandedId(isExpanded ? null : plan.id)}
              className="w-full px-4 py-3 flex items-center gap-3 text-left bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              {fuel && <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${fuel.dot}`} />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(plan.plan_date)}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{plan.planner_source}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {plan.summary?.target_kcal && (
                  <span className="text-xs text-orange-500 font-medium flex items-center gap-0.5">
                    <Flame className="w-3 h-3" />
                    {plan.summary.target_kcal} kcal
                  </span>
                )}
                {adherence != null && (
                  <span className={`text-xs font-semibold ${adherence >= 80 ? 'text-emerald-600' : adherence >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                    {Math.round(adherence)}%
                  </span>
                )}
                {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 pb-3 pt-1 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                {(plan.summary?.target_kcal || plan.summary?.target_protein_g) && (
                  <div className="grid grid-cols-4 gap-2 py-2 mb-3">
                    <MacroCell label="Kcal" value={plan.summary?.target_kcal} unit="" color="text-orange-500" />
                    <MacroCell label="Prot" value={plan.summary?.target_protein_g} unit="g" color="text-red-500" />
                    <MacroCell label="Carb" value={plan.summary?.target_carbs_g} unit="g" color="text-amber-500" />
                    <MacroCell label={language === 'es' ? 'Grasa' : 'Fat'} value={plan.summary?.target_fat_g} unit="g" color="text-blue-500" />
                  </div>
                )}

                {plan.summary?.meals && plan.summary.meals.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      {language === 'es' ? 'Comidas' : 'Meals'}
                    </p>
                    {plan.summary.meals.map((meal, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {meal.completed
                          ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          : <Circle className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 flex-shrink-0" />}
                        <span className="text-xs text-gray-700 dark:text-gray-300 flex-1 truncate">{meal.name}</span>
                        {meal.time && <span className="text-xs text-gray-400">{meal.time}</span>}
                        {meal.kcal && <span className="text-xs text-gray-400">{meal.kcal} kcal</span>}
                      </div>
                    ))}
                  </div>
                )}

                {plan.adherence_data?.actual_kcal && (
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2 text-xs text-gray-500">
                    <TrendingUp className="w-3.5 h-3.5" />
                    {language === 'es' ? 'Consumido: ' : 'Consumed: '}
                    <span className="font-medium text-gray-700 dark:text-gray-300">{plan.adherence_data.actual_kcal} kcal</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function EnduranceTab({ plans, expandedId, setExpandedId, formatWeek, language, compact }: {
  plans: ExternalEndurancePlan[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  formatWeek: (d: string) => string;
  language: string;
  compact: boolean;
}) {
  if (plans.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-sm">
        <Activity className="w-7 h-7 mx-auto mb-2 opacity-30" />
        {language === 'es' ? 'Sin planes de endurance recibidos del planner' : 'No endurance plans received from planner'}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {plans.map(plan => {
        const isExpanded = expandedId === plan.id;
        return (
          <div key={plan.id} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setExpandedId(isExpanded ? null : plan.id)}
              className="w-full px-4 py-3 flex items-center gap-3 text-left bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {language === 'es' ? 'Semana ' : 'Week '}{formatWeek(plan.week_start_date)}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{plan.planner_source}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {plan.summary?.total_hours != null && (
                  <span className="text-xs text-blue-500 font-medium">{plan.summary.total_hours}h</span>
                )}
                {plan.summary?.total_tss != null && (
                  <span className="text-xs text-gray-400">TSS {plan.summary.total_tss}</span>
                )}
                {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 pb-3 pt-1 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-3 gap-2 py-2 mb-3">
                  <SummaryCell label={language === 'es' ? 'Horas' : 'Hours'} value={plan.summary?.total_hours?.toFixed(1)} unit="h" color="text-blue-500" />
                  <SummaryCell label="TSS" value={plan.summary?.total_tss} unit="" color="text-orange-500" />
                  <SummaryCell label={language === 'es' ? 'Sesiones' : 'Sessions'} value={plan.summary?.sessions} unit="" color="text-emerald-500" />
                </div>

                {plan.summary?.workouts && plan.summary.workouts.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                      {language === 'es' ? 'Sesiones' : 'Sessions'}
                    </p>
                    {plan.summary.workouts.map((w, i) => (
                      <div key={i} className="flex items-center gap-2 py-1 border-b border-gray-100 dark:border-gray-800 last:border-0">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">{w.date}</span>
                        <span className="text-xs text-gray-900 dark:text-white flex-1 truncate font-medium">{w.name}</span>
                        {w.duration_min && <span className="text-xs text-gray-400 flex-shrink-0">{w.duration_min}min</span>}
                        {w.tss && <span className="text-xs text-orange-400 flex-shrink-0">TSS {w.tss}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MacroCell({ label, value, unit, color }: { label: string; value?: number; unit: string; color: string }) {
  return (
    <div className="text-center">
      <p className={`text-sm font-semibold ${color}`}>{value != null ? value : '—'}<span className="text-xs font-normal">{unit}</span></p>
      <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
    </div>
  );
}

function SummaryCell({ label, value, unit, color }: { label: string; value?: string | number; unit: string; color: string }) {
  return (
    <div className="text-center">
      <p className={`text-sm font-semibold ${color}`}>{value != null ? value : '—'}<span className="text-xs font-normal">{unit}</span></p>
      <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
    </div>
  );
}
