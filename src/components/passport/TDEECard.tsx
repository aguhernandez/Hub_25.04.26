import { useState, useEffect, useCallback } from 'react';
import {
  Flame, Calendar, TrendingUp, Activity, Dumbbell, Bike,
  RefreshCw, ChevronRight, ChevronDown,
} from 'lucide-react';
import {
  calculateTDEEForDateRange,
  fetchBodyMetrics,
  getWeekDateRange,
  type TDEEWeeklySummary,
  type TDEEDayResult,
  type BodyMetrics,
} from '../../utils/tdeeCalculator';
import type { BiologicalPassport } from '../../types/biologicalPassport.types';
import { supabase } from '../../lib/supabase';

interface TDEECardProps {
  athleteId: string;
  passport: BiologicalPassport | null;
}

export default function TDEECard({ athleteId, passport }: TDEECardProps) {
  const [summary, setSummary] = useState<TDEEWeeklySummary | null>(null);
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');

  const loadTDEE = useCallback(async () => {
    if (!athleteId) return;
    setLoading(true);
    setError(null);
    try {
      const metrics = await fetchBodyMetrics(athleteId, passport);
      if (!metrics) {
        setError('No body measurements found. TDEE requires at least one of: biological passport, anthropometry, or bioimpedance.');
        setBodyMetrics(null);
        setSummary(null);
        return;
      }
      setBodyMetrics(metrics);

      const { data: profile } = await supabase
        .from('profiles')
        .select('date_of_birth, gender')
        .eq('id', athleteId)
        .maybeSingle();

      if (!profile?.date_of_birth) {
        setError('Date of birth is missing from the athlete profile');
        return;
      }

      const { start, end } = getWeekDateRange();
      const result = await calculateTDEEForDateRange(
        athleteId,
        passport,
        profile,
        start,
        end
      );
      setSummary(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to calculate TDEE');
    } finally {
      setLoading(false);
    }
  }, [athleteId, passport]);

  useEffect(() => {
    loadTDEE();
  }, [loadTDEE]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800">
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">Daily Caloric Need (TDEE)</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800">
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">Daily Caloric Need (TDEE)</h3>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {error || 'TDEE requires body measurements (passport, anthropometry, or bioimpedance) and date of birth.'}
        </p>
      </div>
    );
  }

  const fmt = (n: number) => Math.round(n).toLocaleString();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800">
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Daily Caloric Need (TDEE)</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">Based on planned training this week</p>
          </div>
        </div>
        <button
          onClick={loadTDEE}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Recalculate"
        >
          <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>

      {/* View toggle */}
      <div className="flex gap-1 mb-4 p-1 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
        <button
          onClick={() => setViewMode('daily')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            viewMode === 'daily'
              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <Calendar className="w-3 h-3" />
          Daily
        </button>
        <button
          onClick={() => setViewMode('weekly')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            viewMode === 'weekly'
              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <TrendingUp className="w-3 h-3" />
          Weekly Avg
        </button>
      </div>

      {viewMode === 'weekly' ? (
        /* Weekly summary view */
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800">
              <p className="text-xs text-orange-600 dark:text-orange-400 mb-0.5">Avg Daily TDEE</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {fmt(summary.avgTDEELow)}–{fmt(summary.avgTDEEHigh)}
              </p>
              <p className="text-xs text-gray-400">kcal/day range</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-0.5">Training EAT</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{fmt(summary.totalEAT)}</p>
              <p className="text-xs text-gray-400">kcal total this week</p>
            </div>
          </div>
          <div className="flex items-center gap-4 pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs text-gray-600 dark:text-gray-300">
                <span className="font-semibold">{summary.trainingDays}</span> training days
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-600 dark:text-gray-300">
                <span className="font-semibold">{summary.restDays}</span> rest days
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Daily breakdown view */
        <div className="space-y-2">
          {summary.daily.map((day) => (
            <DayRow
              key={day.date}
              day={day}
              expanded={expandedDay === day.date}
              onToggle={() => setExpandedDay(expandedDay === day.date ? null : day.date)}
            />
          ))}
        </div>
      )}

      {/* BMR + NEAT info footer */}
      {summary.daily.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-gray-400">BMR</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{fmt(summary.daily[0].bmr)}</p>
              <p className="text-xs text-gray-400">kcal</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">NEAT Base</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{fmt(summary.daily[0].neatBase)}</p>
              <p className="text-xs text-gray-400">kcal/day</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Method</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {bodyMetrics?.leanMassKg ? 'Cunningham' : 'Mifflin-St Jeor'}
              </p>
              <p className="text-xs text-gray-400">
                {bodyMetrics?.source === 'biological_passport' ? 'Lab passport'
                  : bodyMetrics?.source === 'anthropometry' ? 'ISAK anthropometry'
                  : bodyMetrics?.source === 'bioimpedance' ? 'Bioimpedance'
                  : '—'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DayRow({
  day,
  expanded,
  onToggle,
}: {
  day: TDEEDayResult;
  expanded: boolean;
  onToggle: () => void;
}) {
  const dateLabel = new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const isTraining = day.sessions.length > 0;

  return (
    <div
      className={`rounded-xl border transition-colors ${
        isTraining
          ? 'border-orange-100 dark:border-orange-800/50 bg-orange-50/30 dark:bg-orange-900/10'
          : 'border-gray-100 dark:border-gray-700'
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-xl transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`text-xs font-semibold ${isTraining ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400'}`}>
            {dateLabel}
          </span>
          {isTraining && (
            <div className="flex items-center gap-1">
              {day.sessions.some(s => s.source === 'endurance') && <Bike className="w-3 h-3 text-sky-500" />}
              {day.sessions.some(s => s.source === 'gym') && <Dumbbell className="w-3 h-3 text-violet-500" />}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {Math.round(day.tdeeLow)}–{Math.round(day.tdeeHigh)}
          </span>
          <span className="text-xs text-gray-400">kcal</span>
          {isTraining && (
            expanded
              ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          )}
        </div>
      </button>

      {expanded && isTraining && (
        <div className="px-3 pb-3 space-y-2">
          {day.sessions.map((session, i) => (
            <div key={i} className="flex items-start justify-between text-xs pt-2 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-1.5 min-w-0">
                {session.source === 'endurance' ? (
                  <Bike className="w-3 h-3 text-sky-500 shrink-0" />
                ) : (
                  <Dumbbell className="w-3 h-3 text-violet-500 shrink-0" />
                )}
                <span className="text-gray-600 dark:text-gray-300 truncate">{session.name}</span>
              </div>
              <div className="text-right shrink-0 ml-2">
                <span className="font-semibold text-gray-900 dark:text-white">+{Math.round(session.kcal)}</span>
                <span className="text-gray-400 ml-1">kcal</span>
                {session.zoneBreakdown && session.zoneBreakdown.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 justify-end">
                    {session.zoneBreakdown.map(zb => (
                      <span
                        key={zb.zone}
                        className="px-1.5 py-0.5 rounded text-xs font-medium bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300"
                      >
                        Z{zb.zone}: {Math.round(zb.kcal)} kcal
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div className="flex justify-between text-xs pt-2 border-t border-gray-100 dark:border-gray-700">
            <span className="text-gray-400">Base (BMR+NEAT)</span>
            <span className="font-semibold text-gray-600 dark:text-gray-300">{Math.round(day.neatBase)} kcal</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Training (EAT)</span>
            <span className="font-semibold text-orange-500">+{Math.round(day.eat)} kcal</span>
          </div>
        </div>
      )}
    </div>
  );
}
