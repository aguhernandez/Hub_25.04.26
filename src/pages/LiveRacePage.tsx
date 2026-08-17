import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import {
  buildFuelSchedule,
  formatElapsed,
  getActiveAlert,
  type RacePlan,
  type FuelAlert,
} from '../utils/fuelSchedule';
import {
  Play, Pause, Square, ChevronLeft, Zap, Droplets, FlaskConical,
  Coffee, CheckCircle2, AlertCircle, Clock, Bike, Activity,
  Flag, ChevronRight, X,
} from 'lucide-react';

interface LiveRacePageProps {
  planId: string | null;
  onBack: () => void;
}

type RaceStatus = 'pre' | 'active' | 'paused' | 'finished' | 'abandoned';

const SPORT_ICON: Record<string, typeof Bike> = {
  cycling: Bike,
  running: Activity,
  triathlon: Activity,
  swimming: Droplets,
  other: Activity,
};

export default function LiveRacePage({ planId, onBack }: LiveRacePageProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = (es: string, en: string) => language === 'es' ? es : en;

  const [plan, setPlan] = useState<RacePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [status, setStatus] = useState<RaceStatus>('pre');
  const [elapsed, setElapsed] = useState(0); // seconds
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<FuelAlert[]>([]);
  const [activeAlert, setActiveAlert] = useState<FuelAlert | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [postNotes, setPostNotes] = useState('');
  const [showFinishModal, setShowFinishModal] = useState(false);

  // Running totals
  const [totals, setTotals] = useState({ carbs_g: 0, fluid_ml: 0, sodium_mg: 0, caffeine_mg: 0, calories: 0 });

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const persistRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alertSoundRef = useRef<boolean>(false);

  // ── Load plan ──────────────────────────────────────────────────────────────
  useEffect(() => {
    loadPlan();
  }, [planId, user]);

  const loadPlan = async () => {
    setLoading(true);
    setError('');
    try {
      let query = supabase.from('race_plans').select('*');
      if (planId) {
        query = query.eq('id', planId);
      } else {
        query = query.eq('athlete_id', user!.id).eq('is_active', true).order('created_at', { ascending: false }).limit(1);
      }
      const { data, error: err } = await query.maybeSingle();
      if (err) throw err;
      if (!data) {
        setError(t('No hay ningún plan de carrera activo.', 'No active race plan found.'));
        return;
      }
      setPlan(data as RacePlan);
      setAlerts(buildFuelSchedule(data as RacePlan));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Tick ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'active') {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }
    tickRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [status]);

  // ── Alert check ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'active') return;
    const elapsedMin = elapsed / 60;
    const next = getActiveAlert(alerts, elapsedMin);
    if (next && next !== activeAlert) {
      setActiveAlert(next);
      alertSoundRef.current = true;
    }
  }, [elapsed, alerts, status]);

  // ── Persist session every 15s ──────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'active' || !sessionId) return;
    persistRef.current = setInterval(() => {
      persistSession();
    }, 15000);
    return () => { if (persistRef.current) clearInterval(persistRef.current); };
  }, [status, sessionId, elapsed, stepIndex, alerts]);

  const persistSession = useCallback(async () => {
    if (!sessionId) return;
    await supabase.from('race_sessions').update({
      elapsed_sec: elapsed,
      status: 'active',
      acknowledged_alerts: alerts
        .map((a, i) => a.acknowledged ? i : null)
        .filter(i => i !== null),
      updated_at: new Date().toISOString(),
    }).eq('id', sessionId);
  }, [sessionId, elapsed, alerts]);

  // ── Start race ─────────────────────────────────────────────────────────────
  const handleStart = async () => {
    if (!plan || !user) return;
    try {
      const { data, error: err } = await supabase
        .from('race_sessions')
        .insert({
          athlete_id: user.id,
          race_plan_id: plan.id,
          status: 'active',
          elapsed_sec: 0,
          distance_km: 0,
          acknowledged_alerts: [],
        })
        .select('id')
        .single();
      if (err) throw err;
      setSessionId(data.id);
      setStatus('active');
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handlePause = async () => {
    setStatus('paused');
    if (tickRef.current) clearInterval(tickRef.current);
    if (sessionId) {
      await supabase.from('race_sessions').update({ status: 'paused', elapsed_sec: elapsed }).eq('id', sessionId);
    }
  };

  const handleResume = async () => {
    setStatus('active');
    if (sessionId) {
      await supabase.from('race_sessions').update({ status: 'active' }).eq('id', sessionId);
    }
  };

  const handleFinish = async () => {
    setStatus('finished');
    if (tickRef.current) clearInterval(tickRef.current);
    if (persistRef.current) clearInterval(persistRef.current);
    if (sessionId) {
      await supabase.from('race_sessions').update({
        status: 'finished',
        ended_at: new Date().toISOString(),
        elapsed_sec: elapsed,
        carbs_consumed_g: totals.carbs_g,
        fluid_consumed_ml: totals.fluid_ml,
        sodium_consumed_mg: totals.sodium_mg,
        caffeine_consumed_mg: totals.caffeine_mg,
        acknowledged_alerts: alerts.map((a, i) => a.acknowledged ? i : null).filter(i => i !== null),
      }).eq('id', sessionId);
    }
    setShowFinishModal(false);
  };

  const handleAbandon = async () => {
    setStatus('abandoned');
    if (tickRef.current) clearInterval(tickRef.current);
    if (persistRef.current) clearInterval(persistRef.current);
    if (sessionId) {
      await supabase.from('race_sessions').update({
        status: 'abandoned',
        ended_at: new Date().toISOString(),
        elapsed_sec: elapsed,
      }).eq('id', sessionId);
    }
  };

  const acknowledgeAlert = (alert: FuelAlert) => {
    setAlerts(prev => prev.map(a =>
      a === alert ? { ...a, acknowledged: true } : a
    ));
    setTotals(prev => ({
      carbs_g: prev.carbs_g + alert.carbs_g,
      fluid_ml: prev.fluid_ml + alert.fluid_ml,
      sodium_mg: prev.sodium_mg + alert.sodium_mg,
      caffeine_mg: prev.caffeine_mg + alert.caffeine_mg,
      calories: prev.calories + alert.calories,
    }));
    setStepIndex(prev => prev + 1);
    setActiveAlert(null);
  };

  const skipAlert = (alert: FuelAlert) => {
    setAlerts(prev => prev.map(a =>
      a === alert ? { ...a, acknowledged: true } : a
    ));
    setActiveAlert(null);
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const elapsedMin = elapsed / 60;
  const totalMin = plan?.expected_duration_min ?? 60;
  const progressPct = Math.min(100, (elapsedMin / totalMin) * 100);
  const nextAlerts = alerts.filter(a => !a.acknowledged && a.time_min > 0).slice(0, 3);
  const SportIcon = SPORT_ICON[plan?.sport ?? 'other'] ?? Activity;

  // ── Render: loading ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#070A0F' }}>
        <div className="w-8 h-8 border-2 border-[#fdda36]/30 border-t-[#fdda36] rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 px-6" style={{ background: '#070A0F' }}>
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-white/60 text-center">{error || t('Plan no encontrado', 'Plan not found')}</p>
        <button onClick={onBack} className="flex items-center gap-2 text-[#fdda36] text-sm">
          <ChevronLeft className="w-4 h-4" />
          {t('Volver', 'Back')}
        </button>
      </div>
    );
  }

  // ── Render: finished / abandoned ───────────────────────────────────────────
  if (status === 'finished' || status === 'abandoned') {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center gap-6 px-6"
        style={{ background: 'linear-gradient(155deg, #070A0F 0%, #0D1A0A 100%)' }}
      >
        <div className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: status === 'finished' ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)', border: `2px solid ${status === 'finished' ? '#4ade80' : '#ef4444'}` }}>
          {status === 'finished'
            ? <Flag className="w-9 h-9 text-green-400" />
            : <X className="w-9 h-9 text-red-400" />}
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-1">
            {status === 'finished' ? t('¡Carrera completada!', 'Race finished!') : t('Carrera abandonada', 'Race abandoned')}
          </h2>
          <p className="text-white/40">{plan.race_name}</p>
        </div>

        {/* Summary */}
        <div className="w-full max-w-sm rounded-2xl p-5 space-y-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <SummaryRow icon={Clock} label={t('Tiempo total', 'Total time')} value={formatElapsed(elapsed)} color="#fdda36" />
          <SummaryRow icon={Zap} label={t('Carbohidratos', 'Carbohydrates')} value={`${totals.carbs_g} g`} color="#4ade80" />
          <SummaryRow icon={Droplets} label={t('Líquidos', 'Fluids')} value={`${Math.round(totals.fluid_ml / 100) / 10} L`} color="#38bdf8" />
          <SummaryRow icon={FlaskConical} label={t('Sodio', 'Sodium')} value={`${totals.sodium_mg} mg`} color="#fb923c" />
          {totals.caffeine_mg > 0 && <SummaryRow icon={Coffee} label={t('Cafeína', 'Caffeine')} value={`${totals.caffeine_mg} mg`} color="#a78bfa" />}
        </div>

        <button
          onClick={onBack}
          className="w-full max-w-sm py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #fdda36 0%, #f5c400 100%)', color: '#1a1428' }}
        >
          <ChevronLeft className="w-5 h-5" />
          {t('Volver al entrenamiento', 'Back to training')}
        </button>
      </div>
    );
  }

  // ── Render: pre-race ───────────────────────────────────────────────────────
  if (status === 'pre') {
    return (
      <div
        className="fixed inset-0 flex flex-col"
        style={{ background: 'linear-gradient(155deg, #070A0F 0%, #0A1014 100%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-12 pb-4">
          <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <ChevronLeft className="w-5 h-5 text-white/60" />
          </button>
          <span className="text-xs font-medium text-white/30 uppercase tracking-widest">
            {t('Plan de carrera', 'Race plan')}
          </span>
          <div className="w-9" />
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-5">
          {/* Race header */}
          <div className="rounded-2xl p-5 text-center" style={{ background: 'rgba(253,218,54,0.06)', border: '1px solid rgba(253,218,54,0.15)' }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(253,218,54,0.12)' }}>
              <SportIcon className="w-7 h-7 text-[#fdda36]" />
            </div>
            <h1 className="text-xl font-bold text-white mb-1">{plan.race_name}</h1>
            <div className="flex items-center justify-center gap-3 text-sm text-white/40">
              {plan.distance_km && <span>{plan.distance_km} km</span>}
              {plan.distance_km && plan.expected_duration_min && <span>·</span>}
              {plan.expected_duration_min && <span>{plan.expected_duration_min} min</span>}
              {plan.scheduled_date && <><span>·</span><span>{plan.scheduled_date}</span></>}
            </div>
          </div>

          {/* Fuel summary */}
          <div className="grid grid-cols-2 gap-3">
            <FuelCard icon={Zap} label={t('Carbs/hora', 'Carbs/hr')} value={`${plan.carbs_g_per_hour ?? '—'} g`} color="#4ade80" />
            <FuelCard icon={Droplets} label={t('Líquido/hora', 'Fluid/hr')} value={`${plan.fluid_l_per_hour ?? '—'} L`} color="#38bdf8" />
            <FuelCard icon={FlaskConical} label={t('Sodio/hora', 'Sodium/hr')} value={`${plan.sodium_mg_per_hour ?? '—'} mg`} color="#fb923c" />
            {(plan.caffeine_total_mg ?? 0) > 0 && (
              <FuelCard icon={Coffee} label={t('Cafeína total', 'Total caffeine')} value={`${plan.caffeine_total_mg} mg`} color="#a78bfa" />
            )}
          </div>

          {/* Alert schedule preview */}
          {alerts.filter(a => a.time_min > 0).length > 0 && (
            <div className="rounded-2xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">
                {t('Alertas programadas', 'Scheduled alerts')} ({alerts.filter(a => a.time_min > 0).length})
              </p>
              {alerts.filter(a => a.time_min > 0).slice(0, 5).map((a, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-12 text-right">
                    <span className="text-xs font-mono text-[#fdda36]/70">{a.time_min}′</span>
                  </div>
                  <div className="flex-1 text-xs text-white/50">{a.label}</div>
                </div>
              ))}
              {alerts.filter(a => a.time_min > 0).length > 5 && (
                <p className="text-xs text-white/25 text-center pt-1">
                  +{alerts.filter(a => a.time_min > 0).length - 5} {t('más', 'more')}
                </p>
              )}
            </div>
          )}

          {plan.notes && (
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs text-white/40 leading-relaxed">{plan.notes}</p>
            </div>
          )}
        </div>

        {/* Start button */}
        <div className="px-4 pb-10 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={handleStart}
            className="w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-98"
            style={{ background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)', color: '#052e16' }}
          >
            <Play className="w-6 h-6 fill-current" />
            {t('Iniciar carrera', 'Start race')}
          </button>
        </div>
      </div>
    );
  }

  // ── Render: active / paused ────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: '#070A0F' }}>

      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 pt-12 pb-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
          <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
            {status === 'active' ? t('En carrera', 'Racing') : t('Pausado', 'Paused')}
          </span>
        </div>
        <span className="text-xs text-white/30 truncate max-w-[160px]">{plan.race_name}</span>
        <button
          onClick={() => setShowFinishModal(true)}
          className="text-xs text-white/30 hover:text-red-400 transition-colors"
        >
          {t('Finalizar', 'Finish')}
        </button>
      </div>

      {/* Elapsed clock */}
      <div className="flex flex-col items-center py-8">
        <span
          className="font-mono font-bold tabular-nums"
          style={{ fontSize: '56px', lineHeight: 1, color: status === 'active' ? '#fdda36' : 'rgba(253,218,54,0.4)' }}
        >
          {formatElapsed(elapsed)}
        </span>
        <div className="mt-3 w-64 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #4ade80, #fdda36)' }}
          />
        </div>
        <p className="mt-2 text-xs text-white/25">
          {Math.round(elapsedMin)}/{totalMin} min · {Math.round(progressPct)}%
        </p>
      </div>

      {/* Active alert banner */}
      {activeAlert && (
        <div
          className="mx-4 rounded-2xl p-4 mb-4"
          style={{ background: 'rgba(253,218,54,0.1)', border: '2px solid rgba(253,218,54,0.4)' }}
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(253,218,54,0.2)' }}>
              <Zap className="w-5 h-5 text-[#fdda36]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm">{activeAlert.label}</p>
              <div className="flex gap-3 mt-1 text-xs text-white/40">
                {activeAlert.fluid_ml > 0 && <span>{activeAlert.fluid_ml} ml</span>}
                {activeAlert.sodium_mg > 0 && <span>{activeAlert.sodium_mg} mg Na</span>}
                {activeAlert.caffeine_mg > 0 && <span>{activeAlert.caffeine_mg} mg cafeína</span>}
              </div>
              {activeAlert.notes && <p className="text-xs text-white/30 mt-1">{activeAlert.notes}</p>}
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => acknowledgeAlert(activeAlert)}
              className="flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5"
              style={{ background: '#4ade80', color: '#052e16' }}
            >
              <CheckCircle2 className="w-4 h-4" />
              {t('Tomado', 'Done')}
            </button>
            <button
              onClick={() => skipAlert(activeAlert)}
              className="px-4 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/60 transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              {t('Omitir', 'Skip')}
            </button>
          </div>
        </div>
      )}

      {/* Running totals */}
      <div className="mx-4 grid grid-cols-4 gap-2 mb-4">
        <MiniStat label={t('Carbs', 'Carbs')} value={`${totals.carbs_g}g`} color="#4ade80" />
        <MiniStat label={t('Agua', 'Fluid')} value={`${Math.round(totals.fluid_ml / 100) / 10}L`} color="#38bdf8" />
        <MiniStat label={t('Sodio', 'Sodium')} value={`${totals.sodium_mg}mg`} color="#fb923c" />
        <MiniStat label={t('Cal', 'Cal')} value={`${totals.calories}`} color="#fdda36" />
      </div>

      {/* Next alerts */}
      {nextAlerts.length > 0 && (
        <div className="mx-4 flex-1 overflow-y-auto space-y-2 mb-4">
          <p className="text-xs font-medium text-white/25 uppercase tracking-wider mb-2">
            {t('Próximas alertas', 'Upcoming alerts')}
          </p>
          {nextAlerts.map((a, i) => {
            const minsUntil = Math.max(0, Math.round(a.time_min - elapsedMin));
            return (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="w-10 text-center">
                  <span className="text-xs font-mono text-white/30">{a.time_min}′</span>
                </div>
                <div className="flex-1 text-xs text-white/50 truncate">{a.label}</div>
                <div className="text-xs font-medium" style={{ color: minsUntil <= 5 ? '#fdda36' : 'rgba(255,255,255,0.25)' }}>
                  -{minsUntil}′
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Controls */}
      <div className="px-4 pb-10 pt-3 flex gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {status === 'active' ? (
          <button
            onClick={handlePause}
            className="flex-1 py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-2"
            style={{ background: 'rgba(253,218,54,0.12)', border: '1px solid rgba(253,218,54,0.25)', color: '#fdda36' }}
          >
            <Pause className="w-5 h-5" />
            {t('Pausar', 'Pause')}
          </button>
        ) : (
          <button
            onClick={handleResume}
            className="flex-1 py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-2"
            style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }}
          >
            <Play className="w-5 h-5 fill-current" />
            {t('Reanudar', 'Resume')}
          </button>
        )}
        <button
          onClick={() => setShowFinishModal(true)}
          className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <Square className="w-5 h-5 text-red-400" />
        </button>
      </div>

      {/* Finish modal */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div
            className="w-full max-w-sm rounded-t-3xl p-6 space-y-4"
            style={{ background: '#111318', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="w-10 h-1 rounded-full mx-auto" style={{ background: 'rgba(255,255,255,0.2)' }} />
            <h3 className="text-lg font-bold text-white text-center">
              {t('¿Finalizar carrera?', 'Finish race?')}
            </h3>
            <p className="text-sm text-white/40 text-center">
              {t('Tiempo transcurrido', 'Elapsed time')}: {formatElapsed(elapsed)}
            </p>
            <textarea
              value={postNotes}
              onChange={e => setPostNotes(e.target.value)}
              placeholder={t('Notas post-carrera (opcional)', 'Post-race notes (optional)')}
              rows={3}
              className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 resize-none focus:outline-none focus:border-white/20"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <div className="space-y-2">
              <button
                onClick={handleFinish}
                className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)', color: '#052e16' }}
              >
                <Flag className="w-4 h-4" />
                {t('Finalizar carrera', 'Finish race')}
              </button>
              <button
                onClick={handleAbandon}
                className="w-full py-3 rounded-xl text-sm text-red-400/70 hover:text-red-400 transition-colors"
              >
                {t('Abandonar carrera', 'Abandon race')}
              </button>
              <button
                onClick={() => setShowFinishModal(false)}
                className="w-full py-3 rounded-xl text-sm text-white/30 hover:text-white/60 transition-colors"
              >
                {t('Cancelar', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function FuelCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-3.5 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-white/35">{label}</p>
        <p className="text-sm font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-2 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <p className="text-xs font-semibold" style={{ color }}>{value}</p>
      <p className="text-xs text-white/30 mt-0.5">{label}</p>
    </div>
  );
}

function SummaryRow({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <span className="flex-1 text-sm text-white/50">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}
