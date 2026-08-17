import { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Minus } from 'lucide-react';

interface PlanVsActualChartProps {
  atpId: string;
  startWeek?: number;
  endWeek?: number;
}

interface WeekData {
  week_number: number;
  week_start_date: string;
  planned_sessions: number;
  planned_tonnage: number;
  actual_sessions: number;
  actual_tonnage: number;
  compliance_percentage: number;
  status: string;
}

export default function PlanVsActualChart({ atpId, startWeek = 1, endWeek = 52 }: PlanVsActualChartProps) {
  const { language } = useLanguage();
  const [weekData, setWeekData] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'sessions' | 'tonnage'>('sessions');

  useEffect(() => {
    loadData();
  }, [atpId, startWeek, endWeek]);

  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from('atp_weekly_aggregates')
        .select('*')
        .eq('atp_id', atpId)
        .gte('week_number', startWeek)
        .lte('week_number', endWeek)
        .order('week_number');

      if (error) throw error;
      setWeekData(data || []);
    } catch (error) {
      console.error('Error loading plan vs actual:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMaxValue = () => {
    if (viewMode === 'sessions') {
      return Math.max(...weekData.map(w => Math.max(w.planned_sessions, w.actual_sessions)), 10);
    } else {
      return Math.max(...weekData.map(w => Math.max(w.planned_tonnage, w.actual_tonnage)), 1000);
    }
  };

  const getStatusIcon = (status: string, compliance: number) => {
    if (status === 'not_started') return <Minus className="w-4 h-4 text-gray-400" />;
    if (compliance >= 95 && compliance <= 105) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (compliance < 70) return <TrendingDown className="w-4 h-4 text-red-500" />;
    if (compliance > 140) return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    if (compliance < 95) return <TrendingDown className="w-4 h-4 text-yellow-500" />;
    return <TrendingUp className="w-4 h-4 text-blue-500" />;
  };

  const getStatusColor = (status: string, compliance: number) => {
    if (status === 'not_started') return 'bg-gray-100 dark:bg-gray-800 dark:bg-gray-800';
    if (compliance >= 95 && compliance <= 105) return 'bg-green-50 dark:bg-green-900/20';
    if (compliance < 70) return 'bg-red-50 dark:bg-red-900/20';
    if (compliance > 140) return 'bg-orange-50 dark:bg-orange-900/20';
    if (compliance < 95) return 'bg-yellow-50 dark:bg-yellow-900/20';
    return 'bg-blue-50 dark:bg-blue-900/20';
  };

  const calculateOverallCompliance = () => {
    const completedWeeks = weekData.filter(w => w.actual_sessions > 0);
    if (completedWeeks.length === 0) return 0;
    const totalCompliance = completedWeeks.reduce((sum, w) => sum + w.compliance_percentage, 0);
    return Math.round(totalCompliance / completedWeeks.length);
  };

  const t = (key: string) => {
    const translations: any = {
      'plan_vs_actual': language === 'es' ? 'Plan vs Ejecución' : 'Plan vs Actual',
      'sessions': language === 'es' ? 'Sesiones' : 'Sessions',
      'tonnage': language === 'es' ? 'Tonelaje' : 'Tonnage',
      'week': language === 'es' ? 'Sem' : 'Wk',
      'planned': language === 'es' ? 'Planificado' : 'Planned',
      'actual': language === 'es' ? 'Real' : 'Actual',
      'compliance': language === 'es' ? 'Cumplimiento' : 'Compliance',
      'overall_compliance': language === 'es' ? 'Cumplimiento General' : 'Overall Compliance',
      'no_data': language === 'es' ? 'No hay datos de entrenamiento aún' : 'No training data yet'
    };
    return translations[key] || key;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-[#fdda36] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const maxValue = getMaxValue();
  const overallCompliance = calculateOverallCompliance();

  return (
    <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-[#fdda36]" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white dark:text-white">
            {t('plan_vs_actual')}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('sessions')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              viewMode === 'sessions'
                ? 'bg-[#fdda36] text-[#514163]'
                : 'bg-gray-100 dark:bg-gray-800 dark:bg-gray-700 text-gray-700 dark:text-gray-300 dark:text-gray-300'
            }`}
          >
            {t('sessions')}
          </button>
          <button
            onClick={() => setViewMode('tonnage')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              viewMode === 'tonnage'
                ? 'bg-[#fdda36] text-[#514163]'
                : 'bg-gray-100 dark:bg-gray-800 dark:bg-gray-700 text-gray-700 dark:text-gray-300 dark:text-gray-300'
            }`}
          >
            {t('tonnage')}
          </button>
        </div>
      </div>

      {/* Overall Compliance Badge */}
      <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-[#514163] to-[#6d5383] text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90">{t('overall_compliance')}</p>
            <p className="text-3xl font-bold">{overallCompliance}%</p>
          </div>
          {getStatusIcon('', overallCompliance)}
        </div>
      </div>

      {weekData.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400 dark:text-gray-400 dark:text-gray-400 py-8">{t('no_data')}</p>
      ) : (
        <div className="space-y-3">
          {weekData.map((week) => {
            const plannedValue = viewMode === 'sessions' ? week.planned_sessions : week.planned_tonnage;
            const actualValue = viewMode === 'sessions' ? week.actual_sessions : week.actual_tonnage;
            const plannedPercent = (plannedValue / maxValue) * 100;
            const actualPercent = (actualValue / maxValue) * 100;

            return (
              <div
                key={week.week_number}
                className={`p-3 rounded-lg transition-all ${getStatusColor(week.status, week.compliance_percentage)}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-300 min-w-[60px]">
                    {t('week')} {week.week_number}
                  </span>
                  {getStatusIcon(week.status, week.compliance_percentage)}
                  <span className="text-xs text-gray-600 dark:text-gray-400 dark:text-gray-400">
                    {Math.round(week.compliance_percentage)}% {t('compliance')}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 ml-auto">
                    {new Date(week.week_start_date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>

                {/* Dual bars */}
                <div className="space-y-1.5">
                  {/* Planned bar */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-400 w-16">{t('planned')}</span>
                    <div className="flex-1 h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#514163] flex items-center justify-end pr-2 transition-all"
                        style={{ width: `${plannedPercent}%` }}
                      >
                        {plannedValue > 0 && (
                          <span className="text-xs font-semibold text-white">
                            {viewMode === 'sessions' ? plannedValue : `${Math.round(plannedValue)}kg`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actual bar */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-400 w-16">{t('actual')}</span>
                    <div className="flex-1 h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#fdda36] flex items-center justify-end pr-2 transition-all"
                        style={{ width: `${actualPercent}%` }}
                      >
                        {actualValue > 0 && (
                          <span className="text-xs font-semibold text-[#514163]">
                            {viewMode === 'sessions' ? actualValue : `${Math.round(actualValue)}kg`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 dark:border-gray-700 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#514163] rounded"></div>
          <span className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-400">{t('planned')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#fdda36] rounded"></div>
          <span className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-400">{t('actual')}</span>
        </div>
      </div>
    </div>
  );
}
