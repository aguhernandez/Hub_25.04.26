import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  CheckCircle, AlertTriangle, XCircle, Loader2, Zap,
  TrendingUp, Clock, Activity, ChevronDown, ChevronUp, Satellite
} from 'lucide-react';
import { type ActivityRecorderData } from './ActivityRecorder';
import { type EnduranceWorkout } from './EnduranceWorkoutCard';

export interface AnalysisResult {
  final_score: number;
  classification: 'green' | 'yellow' | 'red';
  insights: string[];
  quick_feedback: string;
  duration_pct: number;
  intensity_deviation: 'on_target' | 'slightly_above' | 'slightly_below' | 'above' | 'below';
  source: 'satellite' | 'local_fallback';
  updated_fitness?: number;
  updated_fatigue?: number;
}

interface WorkoutAnalysisPanelProps {
  activityData: ActivityRecorderData;
  activityId?: string | null;
  plannedWorkout?: EnduranceWorkout | null;
}

function computeQuickFeedback(
  data: ActivityRecorderData,
  planned: EnduranceWorkout | null | undefined,
  language: string
): { feedback: string; durationPct: number; intensityDev: AnalysisResult['intensity_deviation'] } {
  const durationPct = planned?.duration_minutes
    ? Math.round((data.durationSeconds / 60 / planned.duration_minutes) * 100)
    : 100;

  const distPct = planned?.distance_km && data.distanceKm > 0
    ? Math.round((data.distanceKm / planned.distance_km) * 100)
    : null;

  let intensityDev: AnalysisResult['intensity_deviation'] = 'on_target';
  if (data.feedback?.rpe) {
    const rpe = data.feedback.rpe;
    if (rpe >= 9) intensityDev = 'above';
    else if (rpe >= 7) intensityDev = 'slightly_above';
    else if (rpe <= 3) intensityDev = 'below';
    else if (rpe <= 5) intensityDev = 'slightly_below';
    else intensityDev = 'on_target';
  }

  const lines: string[] = [];
  const es = language === 'es';

  if (planned) {
    if (durationPct >= 95 && durationPct <= 110) {
      lines.push(es
        ? `Completaste el ${durationPct}% de la duración planificada.`
        : `You completed ${durationPct}% of the planned duration.`);
    } else if (durationPct > 110) {
      lines.push(es
        ? `Superaste la duración planeada en un ${durationPct - 100}%.`
        : `You exceeded planned duration by ${durationPct - 100}%.`);
    } else {
      lines.push(es
        ? `Alcanzaste el ${durationPct}% de la duración planificada.`
        : `You reached ${durationPct}% of the planned duration.`);
    }
    if (distPct !== null) {
      if (distPct >= 95) {
        lines.push(es ? `Distancia objetivo cumplida (${distPct}%).` : `Target distance achieved (${distPct}%).`);
      } else {
        lines.push(es ? `Completaste el ${distPct}% de la distancia objetivo.` : `You completed ${distPct}% of the target distance.`);
      }
    }
  }

  if (intensityDev === 'above') {
    lines.push(es ? 'La intensidad fue notablemente superior a lo planeado.' : 'Intensity was notably higher than planned.');
  } else if (intensityDev === 'slightly_above') {
    lines.push(es ? 'La intensidad fue ligeramente superior a lo planeado.' : 'Your intensity was slightly higher than planned.');
  } else if (intensityDev === 'slightly_below') {
    lines.push(es ? 'La intensidad estuvo ligeramente por debajo de lo planeado.' : 'Your intensity was slightly below planned.');
  } else if (intensityDev === 'below') {
    lines.push(es ? 'La intensidad estuvo por debajo del objetivo.' : 'Intensity was below the target.');
  }

  return {
    feedback: lines.join(' ') || (es ? 'Sesión completada.' : 'Session completed.'),
    durationPct,
    intensityDev,
  };
}

function computeLocalFallback(
  data: ActivityRecorderData,
  planned: EnduranceWorkout | null | undefined,
  language: string
): AnalysisResult {
  const { feedback: quickFeedback, durationPct, intensityDev } = computeQuickFeedback(data, planned, language);

  let score = 70;
  if (durationPct >= 95 && durationPct <= 110) score += 15;
  else if (durationPct >= 80) score += 5;
  else score -= 10;

  if (intensityDev === 'on_target') score += 10;
  else if (intensityDev === 'slightly_above' || intensityDev === 'slightly_below') score += 5;
  else score -= 5;

  if (data.feedback?.pain_level === 'strong') score -= 20;
  else if (data.feedback?.pain_level === 'moderate') score -= 10;

  score = Math.min(100, Math.max(0, score));

  const classification: AnalysisResult['classification'] = score >= 80 ? 'green' : score >= 55 ? 'yellow' : 'red';

  const es = language === 'es';
  const insights: string[] = [];
  if (data.distanceKm > 0) {
    insights.push(es
      ? `Cubriste ${data.distanceKm.toFixed(2)} km en esta sesión.`
      : `You covered ${data.distanceKm.toFixed(2)} km this session.`);
  }
  if (data.feedback?.rpe) {
    insights.push(es
      ? `RPE declarado: ${data.feedback.rpe}/10.`
      : `Reported RPE: ${data.feedback.rpe}/10.`);
  }

  return {
    final_score: score,
    classification,
    insights,
    quick_feedback: quickFeedback,
    duration_pct: durationPct,
    intensity_deviation: intensityDev,
    source: 'local_fallback',
  };
}

const CLASSIFICATION_STYLES = {
  green: {
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    text: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    icon: CheckCircle,
    labelEN: 'On Track',
    labelES: 'En Objetivo',
    glow: '#10b981',
  },
  yellow: {
    bg: 'bg-amber-500/10 border-amber-500/30',
    text: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: AlertTriangle,
    labelEN: 'Needs Attention',
    labelES: 'Atención Requerida',
    glow: '#f59e0b',
  },
  red: {
    bg: 'bg-red-500/10 border-red-500/30',
    text: 'text-red-400',
    badge: 'bg-red-500/20 text-red-300 border-red-500/40',
    icon: XCircle,
    labelEN: 'High Stress',
    labelES: 'Alta Tensión',
    glow: '#ef4444',
  },
};

export default function WorkoutAnalysisPanel({ activityData, activityId, plannedWorkout }: WorkoutAnalysisPanelProps) {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const es = language === 'es';

  const [status, setStatus] = useState<'idle' | 'quick' | 'waiting' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [showInsights, setShowInsights] = useState(false);
  const hasFired = useRef(false);

  useEffect(() => {
    if (hasFired.current) return;
    hasFired.current = true;
    runAnalysis();
  }, []);

  const saveResultToDB = async (r: AnalysisResult) => {
    if (!profile?.id) return;
    try {
      await supabase.from('workout_analysis_results').insert({
        athlete_id: profile.id,
        activity_id: activityId ?? null,
        planned_workout_id: activityData.planned_workout_id ?? null,
        final_score: r.final_score,
        classification: r.classification,
        insights: r.insights,
        quick_feedback: r.quick_feedback,
        duration_pct: r.duration_pct,
        intensity_deviation: r.intensity_deviation,
        satellite_response_raw: r.source === 'satellite' ? r : null,
        source: r.source,
      });
    } catch {}
  };

  const runAnalysis = async () => {
    setStatus('quick');
    const local = computeLocalFallback(activityData, plannedWorkout, language);
    setResult(local);

    if (!plannedWorkout && !activityData.feedback) {
      setStatus('done');
      await saveResultToDB(local);
      return;
    }

    setStatus('waiting');

    try {
      const supabaseUrl = (supabase as any).supabaseUrl as string;
      const supabaseAnonKey = (supabase as any).supabaseKey as string;

      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token ?? supabaseAnonKey;

      const payload = {
        planned_workout: plannedWorkout ?? null,
        completed_workout: {
          duration: activityData.durationSeconds,
          distance: activityData.distanceKm,
          gps_data: activityData.gpsPoints.slice(0, 100),
          pace: activityData.distanceKm > 0
            ? (activityData.durationSeconds / 60) / activityData.distanceKm
            : null,
          zones_distribution: null,
        },
        wellness: activityData.feedback ?? null,
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`${supabaseUrl}/functions/v1/post-workout-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        const satellite = await res.json();
        if (satellite?.classification) {
          const merged: AnalysisResult = {
            final_score: satellite.final_score ?? local.final_score,
            classification: satellite.classification,
            insights: satellite.insights?.length ? satellite.insights : local.insights,
            quick_feedback: local.quick_feedback,
            duration_pct: local.duration_pct,
            intensity_deviation: local.intensity_deviation,
            source: 'satellite',
            updated_fitness: satellite.updated_fitness,
            updated_fatigue: satellite.updated_fatigue,
          };
          setResult(merged);
          setStatus('done');
          await saveResultToDB(merged);
          return;
        }
      }
    } catch {}

    setStatus('done');
    await saveResultToDB(local);
  };

  if (status === 'idle') return null;

  const classStyle = result ? CLASSIFICATION_STYLES[result.classification] : null;
  const ClassIcon = classStyle?.icon ?? Loader2;

  return (
    <div className="rounded-2xl border border-white/8 overflow-hidden" style={{ background: '#ffffff06' }}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-white/8">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#fdda3615' }}>
          <Activity className="w-3.5 h-3.5" style={{ color: '#fdda36' }} />
        </div>
        <span className="text-xs font-bold text-white/60 uppercase tracking-widest">
          {es ? 'Análisis de Sesión' : 'Session Analysis'}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {(status === 'waiting') && (
            <span className="flex items-center gap-1 text-[10px] text-white/30">
              <Loader2 className="w-3 h-3 animate-spin" />
              {es ? 'Analizando...' : 'Analyzing...'}
            </span>
          )}
          {status === 'done' && result?.source === 'satellite' && (
            <span className="flex items-center gap-1 text-[10px] text-white/30">
              <Satellite className="w-3 h-3 text-emerald-400" />
              {es ? 'Satélite' : 'Satellite'}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Quick Feedback - always shown immediately */}
        {result?.quick_feedback && (
          <div className="flex items-start gap-2.5 rounded-xl p-3.5" style={{ background: '#fdda3608', border: '1px solid #fdda3618' }}>
            <Zap className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#fdda36' }} />
            <p className="text-sm text-white/75 leading-relaxed">{result.quick_feedback}</p>
          </div>
        )}

        {/* Loading shimmer while waiting for satellite */}
        {status === 'waiting' && (
          <div className="space-y-2 animate-pulse">
            <div className="h-14 rounded-xl bg-white/5" />
            <div className="h-8 rounded-lg bg-white/4 w-3/4" />
          </div>
        )}

        {/* Classification Badge */}
        {status === 'done' && result && classStyle && (
          <>
            <div
              className={`rounded-xl p-4 border flex items-center gap-3.5 ${classStyle.bg}`}
              style={{ boxShadow: `0 0 20px ${classStyle.glow}18` }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: classStyle.glow + '22' }}
              >
                <ClassIcon className="w-6 h-6" style={{ color: classStyle.glow }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold uppercase tracking-widest mb-0.5 ${classStyle.text}`}>
                  {es ? classStyle.labelES : classStyle.labelEN}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${result.final_score}%`, background: classStyle.glow }}
                    />
                  </div>
                  <span className={`text-sm font-black flex-shrink-0 ${classStyle.text}`}>
                    {Math.round(result.final_score)}
                  </span>
                </div>
              </div>
            </div>

            {/* Metrics pills */}
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/6 border border-white/10">
                <Clock className="w-3 h-3 text-white/40" />
                <span className="text-[11px] font-semibold text-white/60">
                  {result.duration_pct}% {es ? 'duración' : 'duration'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/6 border border-white/10">
                <TrendingUp className="w-3 h-3 text-white/40" />
                <span className="text-[11px] font-semibold text-white/60">
                  {es
                    ? {
                        on_target: 'Intensidad ideal',
                        slightly_above: 'Algo más intensa',
                        slightly_below: 'Algo menos intensa',
                        above: 'Muy intensa',
                        below: 'Baja intensidad',
                      }[result.intensity_deviation]
                    : {
                        on_target: 'On-target intensity',
                        slightly_above: 'Slightly intense',
                        slightly_below: 'Slightly easy',
                        above: 'High intensity',
                        below: 'Low intensity',
                      }[result.intensity_deviation]
                  }
                </span>
              </div>
              {result.updated_fitness !== undefined && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  <span className="text-[11px] font-semibold text-emerald-300">
                    Fitness {result.updated_fitness > 0 ? '+' : ''}{result.updated_fitness?.toFixed(1)}
                  </span>
                </div>
              )}
            </div>

            {/* Insights collapsible */}
            {result.insights.length > 0 && (
              <div className="rounded-xl overflow-hidden border border-white/8">
                <button
                  onClick={() => setShowInsights(v => !v)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-white/4 transition-colors"
                >
                  <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">
                    {es ? 'Insights' : 'Insights'} ({result.insights.length})
                  </span>
                  {showInsights
                    ? <ChevronUp className="w-3.5 h-3.5 text-white/30" />
                    : <ChevronDown className="w-3.5 h-3.5 text-white/30" />}
                </button>
                {showInsights && (
                  <div className="border-t border-white/8 px-3.5 py-2.5 space-y-1.5">
                    {result.insights.map((ins, i) => (
                      <p key={i} className="text-xs text-white/60 leading-relaxed flex items-start gap-2">
                        <span className="text-white/20 flex-shrink-0">•</span>
                        {ins}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
