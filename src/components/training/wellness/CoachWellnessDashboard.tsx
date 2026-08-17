import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { supabase } from '../../../lib/supabase';
import { Heart, AlertTriangle, TrendingUp, TrendingDown, Users, Calendar, ChevronDown, X, Activity, Moon, Zap, Brain } from 'lucide-react';

interface WellnessEntry {
  id: string;
  athlete_id: string;
  athlete_name?: string;
  checkin_date: string;
  wellness_score_100: number | null;
  overall_score: number | null;
  sleep_quality_10: number | null;
  fatigue_level_10: number | null;
  stress_level_10: number | null;
  motivation_10: number | null;
  prs: number | null;
  lower_body_soreness: number | null;
  upper_body_soreness: number | null;
  back_soreness: number | null;
  urine_color: number | null;
  hrv: number | null;
  rhr: number | null;
  illness_symptoms: string[] | null;
  notes: string | null;
}

interface AthleteWellnessSummary {
  id: string;
  name: string;
  avatar_url: string | null;
  latestEntry: WellnessEntry | null;
  trend: 'up' | 'down' | 'stable' | null;
  avgScore7d: number | null;
  hasAlert: boolean;
}

interface CoachWellnessDashboardProps {
  onClose: () => void;
}

const SCORE_COLORS = {
  high: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500' },
  medium: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', dot: 'bg-amber-400' },
  low: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800', dot: 'bg-rose-500' },
  none: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-500 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700', dot: 'bg-gray-400' },
};

function getScoreLevel(score: number | null): keyof typeof SCORE_COLORS {
  if (score === null) return 'none';
  if (score >= 70) return 'high';
  if (score >= 45) return 'medium';
  return 'low';
}

function getEffectiveScore(entry: WellnessEntry | null): number | null {
  if (!entry) return null;
  return entry.wellness_score_100 ?? (entry.overall_score != null ? entry.overall_score * 20 : null);
}

function ScoreRingSmall({ score }: { score: number | null }) {
  const level = getScoreLevel(score);
  const colors = SCORE_COLORS[level];
  const radius = 18;
  const circ = 2 * Math.PI * radius;
  const offset = score != null ? circ - (score / 100) * circ : circ;
  const strokeColor = level === 'high' ? '#10b981' : level === 'medium' ? '#f59e0b' : level === 'low' ? '#f43f5e' : '#9ca3af';

  return (
    <div className="relative w-12 h-12 flex-shrink-0">
      <svg viewBox="0 0 44 44" className="w-full h-full -rotate-90">
        <circle cx="22" cy="22" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-gray-200 dark:text-gray-700" />
        {score != null && (
          <circle
            cx="22" cy="22" r={radius} fill="none"
            stroke={strokeColor} strokeWidth="4"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-xs font-bold ${colors.text}`}>
          {score != null ? score.toFixed(0) : '—'}
        </span>
      </div>
    </div>
  );
}

function MetricMiniBar({ value, max = 10, inverted = false, label }: { value: number | null; max?: number; inverted?: boolean; label: string }) {
  if (value == null) return null;
  const pct = Math.min(100, (value / max) * 100);
  const effective = inverted ? 100 - pct : pct;
  const color = effective >= 70 ? 'bg-emerald-500' : effective >= 45 ? 'bg-amber-400' : 'bg-rose-500';

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 dark:text-gray-400 w-20 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-5 text-right">{value}</span>
    </div>
  );
}

export default function CoachWellnessDashboard({ onClose }: CoachWellnessDashboardProps) {
  const { user } = useAuth();
  const { language } = useLanguage();

  const [athletes, setAthletes] = useState<AthleteWellnessSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAthlete, setSelectedAthlete] = useState<string | null>(null);
  const [athleteHistory, setAthleteHistory] = useState<WellnessEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [dateRange, setDateRange] = useState<'7d' | '14d' | '30d'>('7d');
  const [filterAlert, setFilterAlert] = useState(false);

  useEffect(() => {
    if (user) loadDashboard();
  }, [user, dateRange]);

  const loadDashboard = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: directData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('assigned_trainer_id', user.id)
        .eq('role', 'athlete');

      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('athlete_id, teams!inner(coach_id)')
        .eq('teams.coach_id', user.id);

      const allIds = new Set<string>();
      const allProfiles = new Map<string, { id: string; full_name: string; avatar_url: string | null }>();

      (directData || []).forEach((p: any) => {
        allIds.add(p.id);
        allProfiles.set(p.id, p);
      });

      if (teamMembers && teamMembers.length > 0) {
        const teamIds = teamMembers.map((tm: any) => tm.athlete_id).filter((id: string) => !allIds.has(id));
        if (teamIds.length > 0) {
          const { data: teamProfiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', teamIds);
          (teamProfiles || []).forEach((p: any) => {
            allIds.add(p.id);
            allProfiles.set(p.id, p);
          });
        }
      }

      const ids = Array.from(allIds);
      if (ids.length === 0) {
        setAthletes([]);
        setLoading(false);
        return;
      }

      const days = dateRange === '7d' ? 7 : dateRange === '14d' ? 14 : 30;
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      const fromStr = fromDate.toISOString().split('T')[0];

      const { data: entries } = await supabase
        .from('wellness_checkins')
        .select('*')
        .in('athlete_id', ids)
        .gte('checkin_date', fromStr)
        .order('checkin_date', { ascending: false });

      const entriesByAthlete = new Map<string, WellnessEntry[]>();
      (entries || []).forEach((e: any) => {
        if (!entriesByAthlete.has(e.athlete_id)) entriesByAthlete.set(e.athlete_id, []);
        entriesByAthlete.get(e.athlete_id)!.push(e);
      });

      const summaries: AthleteWellnessSummary[] = ids.map((id) => {
        const profile = allProfiles.get(id)!;
        const athleteEntries = entriesByAthlete.get(id) || [];
        const latest = athleteEntries[0] || null;
        const latestScore = getEffectiveScore(latest);
        const scores = athleteEntries.map((e) => getEffectiveScore(e)).filter((s): s is number => s != null);
        const avgScore7d = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

        let trend: 'up' | 'down' | 'stable' | null = null;
        if (scores.length >= 3) {
          const recent = scores.slice(0, Math.ceil(scores.length / 2));
          const older = scores.slice(Math.ceil(scores.length / 2));
          const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
          const avgOlder = older.reduce((a, b) => a + b, 0) / older.length;
          const diff = avgRecent - avgOlder;
          trend = diff > 5 ? 'up' : diff < -5 ? 'down' : 'stable';
        }

        const hasAlert =
          (latest?.illness_symptoms && latest.illness_symptoms.length > 0) ||
          (latestScore !== null && latestScore < 40) ||
          (latest?.urine_color !== null && latest?.urine_color !== undefined && latest.urine_color >= 6) ||
          false;

        return {
          id,
          name: profile.full_name,
          avatar_url: profile.avatar_url,
          latestEntry: latest,
          trend,
          avgScore7d,
          hasAlert: !!hasAlert,
        };
      });

      summaries.sort((a, b) => {
        if (a.hasAlert && !b.hasAlert) return -1;
        if (!a.hasAlert && b.hasAlert) return 1;
        const sa = getEffectiveScore(a.latestEntry) ?? 999;
        const sb = getEffectiveScore(b.latestEntry) ?? 999;
        return sa - sb;
      });

      setAthletes(summaries);
    } catch (err) {
      console.error('Error loading wellness dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAthleteHistory = async (athleteId: string) => {
    setHistoryLoading(true);
    setSelectedAthlete(athleteId);
    const days = dateRange === '7d' ? 7 : dateRange === '14d' ? 14 : 30;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const fromStr = fromDate.toISOString().split('T')[0];

    const { data } = await supabase
      .from('wellness_checkins')
      .select('*')
      .eq('athlete_id', athleteId)
      .gte('checkin_date', fromStr)
      .order('checkin_date', { ascending: true });

    setAthleteHistory(data || []);
    setHistoryLoading(false);
  };

  const selectedAthleteData = athletes.find((a) => a.id === selectedAthlete);
  const displayAthletes = filterAlert ? athletes.filter((a) => a.hasAlert) : athletes;
  const alertCount = athletes.filter((a) => a.hasAlert).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4">
      <div className="w-full max-w-5xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {language === 'es' ? 'Panel de Bienestar' : 'Wellness Dashboard'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {language === 'es' ? `${athletes.length} atletas monitoreados` : `${athletes.length} athletes monitored`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Date range selector */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-1">
              {(['7d', '14d', '30d'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setDateRange(r)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    dateRange === r
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            {alertCount > 0 && (
              <button
                onClick={() => setFilterAlert(!filterAlert)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterAlert
                    ? 'bg-rose-500 text-white'
                    : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900/50'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                {alertCount} {language === 'es' ? 'alertas' : 'alerts'}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex" style={{ minHeight: '500px' }}>
          {/* Left: Athlete list */}
          <div className="w-full md:w-80 lg:w-96 border-r border-gray-200 dark:border-gray-700 overflow-y-auto" style={{ maxHeight: '80vh' }}>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : displayAthletes.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                {filterAlert
                  ? language === 'es' ? 'Sin alertas activas' : 'No active alerts'
                  : language === 'es' ? 'Sin atletas con check-ins' : 'No athletes with check-ins'}
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {displayAthletes.map((athlete) => {
                  const score = getEffectiveScore(athlete.latestEntry);
                  const level = getScoreLevel(score);
                  const colors = SCORE_COLORS[level];
                  const isSelected = selectedAthlete === athlete.id;

                  return (
                    <button
                      key={athlete.id}
                      onClick={() => loadAthleteHistory(athlete.id)}
                      className={`w-full text-left px-4 py-3 transition-colors flex items-center gap-3 ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <ScoreRingSmall score={score} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {athlete.name}
                          </span>
                          {athlete.hasAlert && (
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {athlete.latestEntry ? (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(athlete.latestEntry.checkin_date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                              {language === 'es' ? 'Sin datos' : 'No data'}
                            </span>
                          )}
                          {athlete.avgScore7d !== null && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${colors.bg} ${colors.text}`}>
                              avg {athlete.avgScore7d.toFixed(0)}
                            </span>
                          )}
                          {athlete.trend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
                          {athlete.trend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-rose-500" />}
                        </div>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isSelected ? '-rotate-90' : 'rotate-0'}`} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Detail panel */}
          <div className="flex-1 overflow-y-auto p-6" style={{ maxHeight: '80vh' }}>
            {!selectedAthlete ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {language === 'es' ? 'Selecciona un atleta para ver su historial' : 'Select an athlete to view their history'}
                </p>
              </div>
            ) : historyLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Athlete header */}
                <div className="flex items-center gap-4">
                  {selectedAthleteData?.avatar_url ? (
                    <img src={selectedAthleteData.avatar_url} className="w-12 h-12 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg">
                      {selectedAthleteData?.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedAthleteData?.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {athleteHistory.length} {language === 'es' ? `check-ins en los últimos ${dateRange}` : `check-ins in the last ${dateRange}`}
                    </p>
                  </div>
                </div>

                {athleteHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                    {language === 'es' ? 'Sin check-ins en este período' : 'No check-ins in this period'}
                  </div>
                ) : (
                  <>
                    {/* Score timeline */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        {language === 'es' ? 'Puntuación de Bienestar' : 'Wellness Score Timeline'}
                      </h4>
                      <div className="flex items-end gap-1.5 h-20">
                        {athleteHistory.map((entry) => {
                          const sc = getEffectiveScore(entry);
                          const level = getScoreLevel(sc);
                          const colors = SCORE_COLORS[level];
                          const heightPct = sc != null ? Math.max(10, sc) : 5;

                          return (
                            <div key={entry.id} className="flex-1 flex flex-col items-center gap-1 group relative">
                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                {sc != null ? `${sc.toFixed(0)}/100` : '—'} · {new Date(entry.checkin_date).toLocaleDateString()}
                              </div>
                              <div
                                className={`w-full rounded-t-sm ${colors.dot} transition-all`}
                                style={{ height: `${heightPct}%` }}
                              />
                              <span className="text-xs text-gray-400 dark:text-gray-600 hidden sm:block">
                                {new Date(entry.checkin_date).getDate()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Latest entry detail */}
                    {(() => {
                      const latest = athleteHistory[athleteHistory.length - 1];
                      const score = getEffectiveScore(latest);
                      return (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {language === 'es' ? 'Último check-in' : 'Latest check-in'} — {new Date(latest.checkin_date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </h4>
                            <ScoreRingSmall score={score} />
                          </div>

                          {/* Alerts */}
                          {latest.illness_symptoms && latest.illness_symptoms.length > 0 && (
                            <div className="flex items-start gap-2 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg">
                              <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
                                  {language === 'es' ? 'Síntomas reportados' : 'Symptoms reported'}
                                </p>
                                <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
                                  {latest.illness_symptoms.join(', ')}
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Sleep */}
                            <div>
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                                <Moon className="w-3.5 h-3.5" />
                                {language === 'es' ? 'Sueño' : 'Sleep'}
                              </p>
                              <MetricMiniBar value={latest.sleep_quality_10} label={language === 'es' ? 'Calidad' : 'Quality'} />
                            </div>

                            {/* Fatigue & Energy */}
                            <div>
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                                <Zap className="w-3.5 h-3.5" />
                                {language === 'es' ? 'Energía' : 'Energy'}
                              </p>
                              <MetricMiniBar value={latest.fatigue_level_10} label={language === 'es' ? 'Fatiga' : 'Fatigue'} />
                              <MetricMiniBar value={latest.motivation_10} label={language === 'es' ? 'Motivación' : 'Motivation'} />
                            </div>

                            {/* DOMS */}
                            <div>
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                                <Activity className="w-3.5 h-3.5" />
                                DOMS
                              </p>
                              <MetricMiniBar value={latest.lower_body_soreness} label={language === 'es' ? 'MMII' : 'Lower'} inverted />
                              <MetricMiniBar value={latest.upper_body_soreness} label={language === 'es' ? 'MMSS' : 'Upper'} inverted />
                              <MetricMiniBar value={latest.back_soreness} label={language === 'es' ? 'Espalda' : 'Back'} inverted />
                            </div>

                            {/* CNS */}
                            <div>
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                                <Brain className="w-3.5 h-3.5" />
                                {language === 'es' ? 'CNS / Estrés' : 'CNS / Stress'}
                              </p>
                              <MetricMiniBar value={latest.stress_level_10} label={language === 'es' ? 'Estrés' : 'Stress'} inverted />
                              <MetricMiniBar value={latest.prs} label={language === 'es' ? 'PRS' : 'PRS'} />
                            </div>
                          </div>

                          {/* HRV / RHR */}
                          {(latest.hrv != null || latest.rhr != null) && (
                            <div className="flex items-center gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                              {latest.hrv != null && (
                                <div className="text-center">
                                  <p className="text-xs text-gray-500 dark:text-gray-400">HRV</p>
                                  <p className="text-lg font-bold text-gray-900 dark:text-white">{latest.hrv} <span className="text-xs font-normal text-gray-500">ms</span></p>
                                </div>
                              )}
                              {latest.rhr != null && (
                                <div className="text-center">
                                  <p className="text-xs text-gray-500 dark:text-gray-400">RHR</p>
                                  <p className="text-lg font-bold text-gray-900 dark:text-white">{latest.rhr} <span className="text-xs font-normal text-gray-500">bpm</span></p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Notes */}
                          {latest.notes && (
                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                {language === 'es' ? 'Notas' : 'Notes'}
                              </p>
                              <p className="text-sm text-gray-700 dark:text-gray-300 italic">&ldquo;{latest.notes}&rdquo;</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Week-by-week avg if 14d or 30d */}
                    {dateRange !== '7d' && athleteHistory.length >= 2 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                          {language === 'es' ? 'Tendencia' : 'Trend'}
                        </h4>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: language === 'es' ? 'Min' : 'Min', value: Math.min(...athleteHistory.map((e) => getEffectiveScore(e) ?? 100)) },
                            { label: language === 'es' ? 'Prom' : 'Avg', value: Math.round(athleteHistory.reduce((s, e) => s + (getEffectiveScore(e) ?? 0), 0) / athleteHistory.filter((e) => getEffectiveScore(e) != null).length) },
                            { label: language === 'es' ? 'Max' : 'Max', value: Math.max(...athleteHistory.map((e) => getEffectiveScore(e) ?? 0)) },
                          ].map(({ label, value }) => {
                            const level = getScoreLevel(value);
                            const colors = SCORE_COLORS[level];
                            return (
                              <div key={label} className={`text-center p-3 rounded-xl ${colors.bg}`}>
                                <p className={`text-2xl font-bold ${colors.text}`}>{value}</p>
                                <p className={`text-xs ${colors.text} opacity-80`}>{label}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
