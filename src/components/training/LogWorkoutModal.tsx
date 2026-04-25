import { useState, useEffect } from 'react';
import {
  X, Check, SkipForward, Clock, Zap, RotateCcw, ChevronLeft, ChevronRight,
  CheckCircle2, Timer, Activity, Pencil, AlertTriangle, Save, Flame, Trophy,
  Heart, Share2, CheckCircle, BarChart3, ArrowLeftRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { type EnduranceWorkout, type WorkoutStep } from './EnduranceWorkoutCard';
import ActivityShareCard from './ActivityShareCard';

interface LogWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  workout: EnduranceWorkout;
  language: string;
  onSaved?: () => void;
  executedOnDate?: string;
  originalPlannedDay?: string;
}

type BlockState = 'pending' | 'done' | 'skipped' | 'modified';

interface BlockLog {
  stepId: string;
  state: BlockState;
  actualDurationSec: number;
  actualZone?: number;
  notes?: string;
}

type LogMode = 'blocks' | 'quick';
type Phase = 'log' | 'feedback' | 'summary';

const BRAND_YELLOW = '#fdda36';
const BRAND_PURPLE = '#514163';

const ZONE_COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#f97316', '#ef4444', '#a855f7', '#ec4899'];

const SPORT_COLORS: Record<string, string> = {
  cycling: '#06b6d4',
  running: '#22c55e',
  swimming: '#3b82f6',
  triathlon: '#f59e0b',
  rowing: '#8b5cf6',
  gravel: '#a3e635',
  mtb: '#f97316',
  trail_run: '#84cc16',
  default: '#06b6d4',
};

const STEP_COLORS: Record<string, { label: string; labelEs: string; dot: string; bg: string }> = {
  warmup:   { label: 'Warm Up',   labelEs: 'Entrada en calor', dot: 'bg-amber-400',   bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' },
  steady:   { label: 'Steady',    labelEs: 'Constante',         dot: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' },
  interval: { label: 'Interval',  labelEs: 'Intervalo',         dot: 'bg-red-500',     bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' },
  recovery: { label: 'Recovery',  labelEs: 'Recuperación',      dot: 'bg-cyan-500',    bg: 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800' },
  cooldown: { label: 'Cool Down', labelEs: 'Vuelta a la calma', dot: 'bg-green-400',   bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' },
};

function formatSecs(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return s === 0 ? `${m}m` : `${m}m ${s}s`;
  return `${s}s`;
}

function formatTarget(step: WorkoutStep): string {
  const parts: string[] = [];
  if (step.target_type === 'power') {
    if (step.target_percent_ftp != null) parts.push(`${step.target_percent_ftp}% FTP`);
    if (step.target_zone != null) parts.push(`Z${step.target_zone}`);
  } else if (step.target_type === 'hr') {
    if (step.target_zone != null) parts.push(`Z${step.target_zone}`);
    if (step.target_min_value != null && step.target_max_value != null)
      parts.push(`${step.target_min_value}–${step.target_max_value} bpm`);
  } else if (step.target_type === 'pace') {
    if (step.target_zone != null) parts.push(`Z${step.target_zone}`);
  } else if (step.target_type === 'rpe') {
    if (step.target_min_value != null && step.target_max_value != null)
      parts.push(`RPE ${step.target_min_value}–${step.target_max_value}`);
    else if (step.target_zone != null) parts.push(`RPE Z${step.target_zone}`);
  }
  return parts.join(' · ');
}

function expandSteps(steps: WorkoutStep[]): WorkoutStep[] {
  const groupedByRepeat = new Map<string, WorkoutStep[]>();
  steps.forEach(s => {
    if (s.repeat_group_id) {
      if (!groupedByRepeat.has(s.repeat_group_id)) groupedByRepeat.set(s.repeat_group_id, []);
      groupedByRepeat.get(s.repeat_group_id)!.push(s);
    }
  });

  const seen = new Set<string>();
  const expanded: WorkoutStep[] = [];
  steps.forEach(s => {
    if (s.repeat_group_id) {
      if (seen.has(s.repeat_group_id)) return;
      seen.add(s.repeat_group_id);
      const group = groupedByRepeat.get(s.repeat_group_id)!;
      const lead = group.find(g => g.repeat_times && g.repeat_times > 1) || group[0];
      const count = lead.repeat_times || 1;
      for (let r = 0; r < count; r++) {
        group.forEach(gs => expanded.push({ ...gs, id: `${gs.id}-rep${r}` }));
      }
    } else {
      expanded.push(s);
    }
  });
  return expanded;
}

export default function LogWorkoutModal({ isOpen, onClose, workout, language, onSaved, executedOnDate, originalPlannedDay }: LogWorkoutModalProps) {
  const { profile } = useAuth();
  const is_es = language === 'es';
  const sportColor = SPORT_COLORS[workout.sport || ''] || SPORT_COLORS.default;

  const expandedSteps = expandSteps(workout.steps || []);

  const initialBlocks = (): BlockLog[] =>
    expandedSteps.map(s => ({
      stepId: s.id,
      state: 'pending',
      actualDurationSec: s.duration_value || 0,
      actualZone: s.target_zone,
    }));

  const [phase, setPhase] = useState<Phase>('log');
  const [mode, setMode] = useState<LogMode>('blocks');
  const [blocks, setBlocks] = useState<BlockLog[]>(initialBlocks);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editDraftMin, setEditDraftMin] = useState('');
  const [editDraftSec, setEditDraftSec] = useState('');
  const [editDraftZone, setEditDraftZone] = useState('');
  const [editDraftNotes, setEditDraftNotes] = useState('');
  const [quickDurationMin, setQuickDurationMin] = useState(
    String(workout.estimated_duration_minutes || 60)
  );
  const [quickEffort, setQuickEffort] = useState<'easy' | 'moderate' | 'hard'>('moderate');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showShareCard, setShowShareCard] = useState(false);

  const [feedbackStep, setFeedbackStep] = useState(1);
  const [feedback, setFeedback] = useState({
    rpe: 6,
    energy_level: 'normal',
    pain_level: 'none',
    mood: 'normal',
    feedback_notes: '',
  });

  const [savedTotalSec, setSavedTotalSec] = useState(0);
  const [savedTimeInZones, setSavedTimeInZones] = useState<Record<string, number>>({});

  if (!isOpen) return null;

  const setBlock = (idx: number, patch: Partial<BlockLog>) =>
    setBlocks(prev => prev.map((b, i) => i === idx ? { ...b, ...patch } : b));

  const checkBlock = (idx: number) => {
    const cur = blocks[idx].state;
    setBlock(idx, { state: cur === 'done' ? 'pending' : 'done' });
  };

  const skipBlock = (idx: number) => {
    const cur = blocks[idx].state;
    setBlock(idx, { state: cur === 'skipped' ? 'pending' : 'skipped' });
  };

  const openEdit = (idx: number) => {
    const b = blocks[idx];
    setEditDraftMin(String(Math.floor(b.actualDurationSec / 60)));
    setEditDraftSec(String(b.actualDurationSec % 60));
    setEditDraftZone(b.actualZone != null ? String(b.actualZone) : '');
    setEditDraftNotes(b.notes || '');
    setEditingIdx(idx);
  };

  const saveEdit = () => {
    if (editingIdx == null) return;
    const min = parseInt(editDraftMin) || 0;
    const sec = parseInt(editDraftSec) || 0;
    setBlock(editingIdx, {
      state: 'modified',
      actualDurationSec: min * 60 + sec,
      actualZone: editDraftZone ? parseInt(editDraftZone) : undefined,
      notes: editDraftNotes || undefined,
    });
    setEditingIdx(null);
  };

  const checkAll = () =>
    setBlocks(prev => prev.map(b => b.state === 'skipped' ? b : { ...b, state: 'done' }));

  const totalDone = blocks.filter(b => b.state === 'done' || b.state === 'modified').length;
  const totalBlocks = blocks.length;
  const totalActualSec = blocks.filter(b => b.state !== 'skipped').reduce((s, b) => s + b.actualDurationSec, 0);

  const buildTimeInZones = (): Record<string, number> => {
    const zones: Record<string, number> = {};
    blocks.forEach((b, i) => {
      if (b.state === 'skipped') return;
      const zone = b.actualZone ?? expandedSteps[i]?.target_zone;
      if (zone) {
        const key = `z${zone}`;
        zones[key] = (zones[key] || 0) + b.actualDurationSec;
      }
    });
    return zones;
  };

  const handleContinueToFeedback = () => {
    setFeedbackStep(1);
    setPhase('feedback');
  };

  const handleSubmitFeedback = async () => {
    if (!profile?.id) return;
    setSaving(true);
    setError(null);
    try {
      let finalTotalSec = mode === 'quick' ? (parseInt(quickDurationMin) || 0) * 60 : totalActualSec;
      let finalTimeInZones = mode === 'quick' ? {} : buildTimeInZones();

      const intervals = mode === 'blocks' ? blocks.map((b, i) => ({
        step_type: expandedSteps[i]?.step_type,
        planned_duration_sec: expandedSteps[i]?.duration_value,
        actual_duration_sec: b.actualDurationSec,
        zone: b.actualZone ?? expandedSteps[i]?.target_zone,
        state: b.state,
        notes: b.notes,
      })) : [];

      const today = new Date().toISOString().split('T')[0];
      const actualExecutionDate = executedOnDate || today;

      const insertPayload: Record<string, unknown> = {
        athlete_id: profile.id,
        scheduled_date: actualExecutionDate,
        sport: workout.sport || 'other',
        workout_name: workout.name,
        duration_seconds: finalTotalSec,
        time_in_zones: finalTimeInZones,
        intervals,
        rpe: feedback.rpe,
        source: mode === 'blocks' ? 'manual_block_based' : 'quick_log',
        wellness: {
          energy_level: feedback.energy_level,
          pain_level: feedback.pain_level,
          mood: feedback.mood,
          notes: feedback.feedback_notes,
          ...(originalPlannedDay ? { original_planned_day: originalPlannedDay } : {}),
        },
      };

      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isRealUUID = workout.id && UUID_REGEX.test(workout.id);
      if (isRealUUID) insertPayload.planned_workout_id = workout.id;
      if (mode === 'quick') insertPayload.effort = quickEffort;

      // Parse endurance-plan-{uuid}-{index} IDs from external_endurance_plans
      const planMatch = workout.id?.match(/^endurance-plan-([0-9a-f-]{36})-(\d+)$/i);
      const planWeekId = planMatch ? planMatch[1] : null;
      const planDayIndex = planMatch ? parseInt(planMatch[2]) : null;
      if (planWeekId) insertPayload.plan_week_id = planWeekId;
      if (planDayIndex !== null) insertPayload.plan_day_index = planDayIndex;

      const { error: insertError } = await supabase.from('endurance_completed_workouts').insert(insertPayload);

      if (insertError) throw new Error(insertError.message || insertError.details || JSON.stringify(insertError));

      if (isRealUUID) {
        await supabase
          .from('external_endurance_workouts')
          .update({ status: 'completed' })
          .eq('id', workout.id);
      }

      // Mark the day as completed inside external_endurance_plans.plan_data.days[index]
      if (planWeekId && planDayIndex !== null) {
        const { data: planRow } = await supabase
          .from('external_endurance_plans')
          .select('plan_data')
          .eq('id', planWeekId)
          .maybeSingle();

        if (planRow?.plan_data?.days) {
          const days = [...planRow.plan_data.days];
          if (days[planDayIndex]) {
            days[planDayIndex] = { ...days[planDayIndex], completed: true };
            await supabase
              .from('external_endurance_plans')
              .update({ plan_data: { ...planRow.plan_data, days } })
              .eq('id', planWeekId);
          }
        }
      }

      setSavedTotalSec(finalTotalSec);
      setSavedTimeInZones(finalTimeInZones);
      onSaved?.();
      setPhase('summary');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (typeof err === 'object' && err !== null ? JSON.stringify(err) : 'Failed to save');
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const TOTAL_FEEDBACK_STEPS = 5;
  const showWarning = feedback.rpe > 9 || feedback.pain_level === 'moderate' || feedback.pain_level === 'strong';

  if (phase === 'feedback') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4">
        <div className="bg-white dark:bg-gray-900 w-full sm:max-w-lg sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden rounded-t-3xl">
          <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-5 pt-5 pb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {is_es ? 'Comentarios de la Sesión' : 'Session Feedback'}
              </h2>
              <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: TOTAL_FEEDBACK_STEPS }).map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i + 1 <= feedbackStep ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {is_es ? `Pregunta ${feedbackStep} de ${TOTAL_FEEDBACK_STEPS}` : `Question ${feedbackStep} of ${TOTAL_FEEDBACK_STEPS}`}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {feedbackStep === 1 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    {is_es ? '1. Esfuerzo general (RPE)' : '1. Overall Effort (RPE)'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {is_es ? '¿Qué tan dura fue esta sesión? (1-10)' : 'How hard did this session feel? (1-10)'}
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{is_es ? 'Muy fácil' : 'Very easy'}</span>
                    <span className="text-4xl font-bold" style={{ color: sportColor }}>{feedback.rpe}</span>
                    <span className="text-sm text-gray-500">{is_es ? 'Máximo' : 'Max effort'}</span>
                  </div>
                  <input type="range" min="1" max="10" value={feedback.rpe}
                    onChange={e => setFeedback({ ...feedback, rpe: parseInt(e.target.value) })}
                    className="w-full h-3 rounded-lg appearance-none cursor-pointer"
                    style={{ background: `linear-gradient(to right, ${sportColor} 0%, ${sportColor} ${((feedback.rpe - 1) / 9) * 100}%, #e5e7eb ${((feedback.rpe - 1) / 9) * 100}%, #e5e7eb 100%)` }}
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    {[1,2,3,4,5,6,7,8,9,10].map(n => <span key={n}>{n}</span>)}
                  </div>
                </div>
                {feedback.rpe > 9 && (
                  <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-orange-800 dark:text-orange-300">
                      {is_es ? 'Tu entrenador recibirá notificación de este esfuerzo elevado.' : 'Your coach will be notified about this high effort.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {feedbackStep === 2 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    {is_es ? '2. Nivel de energía' : '2. Energy Level'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {is_es ? '¿Cómo estuvo tu energía durante la sesión?' : 'How was your energy during the session?'}
                  </p>
                </div>
                {[
                  { value: 'very_low', en: 'Very low', es: 'Muy bajo', emoji: '😴' },
                  { value: 'low', en: 'Low', es: 'Bajo', emoji: '😕' },
                  { value: 'normal', en: 'Normal', es: 'Normal', emoji: '😐' },
                  { value: 'high', en: 'High', es: 'Alto', emoji: '😊' },
                  { value: 'very_high', en: 'Very high', es: 'Muy alto', emoji: '🔥' },
                ].map(o => (
                  <button key={o.value} onClick={() => setFeedback({ ...feedback, energy_level: o.value })}
                    className={`w-full p-3.5 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${feedback.energy_level === o.value ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                    <span className="text-2xl">{o.emoji}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{is_es ? o.es : o.en}</span>
                  </button>
                ))}
              </div>
            )}

            {feedbackStep === 3 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    {is_es ? '3. Sensaciones musculares' : '3. Muscle & Joint Feeling'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {is_es ? '¿Sentiste algún dolor o molestia inusual?' : 'Did you feel any pain or unusual discomfort?'}
                  </p>
                </div>
                {[
                  { value: 'none', en: 'None', es: 'Ninguno', emoji: '✅' },
                  { value: 'mild', en: 'Mild', es: 'Leve', emoji: '⚠️' },
                  { value: 'moderate', en: 'Moderate', es: 'Moderado', emoji: '🔶' },
                  { value: 'strong', en: 'Strong', es: 'Fuerte', emoji: '🚨' },
                ].map(o => (
                  <button key={o.value} onClick={() => setFeedback({ ...feedback, pain_level: o.value })}
                    className={`w-full p-3.5 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${feedback.pain_level === o.value ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                    <span className="text-2xl">{o.emoji}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{is_es ? o.es : o.en}</span>
                  </button>
                ))}
                {(feedback.pain_level === 'moderate' || feedback.pain_level === 'strong') && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-800 dark:text-red-300">
                      {is_es ? 'Tu entrenador recibirá notificación sobre este dolor.' : 'Your coach will be notified about this pain.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {feedbackStep === 4 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    {is_es ? '4. Estado de ánimo' : '4. Mood'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {is_es ? '¿Cómo estuvo tu ánimo y motivación?' : 'How was your mood and motivation?'}
                  </p>
                </div>
                {[
                  { value: 'very_low', en: 'Very low', es: 'Muy bajo', emoji: '😞' },
                  { value: 'low', en: 'Low', es: 'Bajo', emoji: '😐' },
                  { value: 'normal', en: 'Normal', es: 'Normal', emoji: '🙂' },
                  { value: 'high', en: 'High', es: 'Alto', emoji: '😄' },
                  { value: 'very_high', en: 'Very high', es: 'Muy alto', emoji: '🤩' },
                ].map(o => (
                  <button key={o.value} onClick={() => setFeedback({ ...feedback, mood: o.value })}
                    className={`w-full p-3.5 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${feedback.mood === o.value ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                    <span className="text-2xl">{o.emoji}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{is_es ? o.es : o.en}</span>
                  </button>
                ))}
              </div>
            )}

            {feedbackStep === 5 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    {is_es ? '5. Observaciones personales' : '5. Personal Notes'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {is_es ? 'Sueño, estrés, técnica, condiciones...' : 'Sleep, stress, technique, conditions...'}
                  </p>
                </div>
                <textarea
                  value={feedback.feedback_notes}
                  onChange={e => setFeedback({ ...feedback, feedback_notes: e.target.value })}
                  placeholder={is_es ? 'Ej: Dormí 7h, lluvia intensa en los últimos 5km...' : 'E.g., Slept 7h, heavy rain in the last 5km...'}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:border-transparent resize-none text-sm"
                  style={{ outline: 'none' }}
                  onFocus={e => (e.target.style.boxShadow = `0 0 0 2px ${sportColor}66`)}
                  onBlur={e => (e.target.style.boxShadow = 'none')}
                />
                {showWarning && (
                  <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                    <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      {is_es ? 'Tu entrenador recibirá notificación para revisar esta sesión.' : 'Your coach will receive a notification to review this session.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-sm">
                {error}
              </div>
            )}
          </div>

          <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4 flex gap-3">
            <button
              onClick={() => feedbackStep === 1 ? setPhase('log') : setFeedbackStep(s => s - 1)}
              className="flex items-center gap-1.5 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              <ChevronLeft className="w-4 h-4" />
              {is_es ? 'Anterior' : 'Back'}
            </button>
            {feedbackStep < TOTAL_FEEDBACK_STEPS ? (
              <button
                onClick={() => setFeedbackStep(s => s + 1)}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:opacity-90 transition-all font-semibold text-sm"
              >
                {is_es ? 'Siguiente' : 'Next'}
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmitFeedback}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-semibold text-sm disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    {is_es ? 'Guardando...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    {is_es ? 'Guardar Entrenamiento' : 'Save Workout'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'summary') {
    const zoneKeys = Object.keys(savedTimeInZones).sort();
    const totalZoneSec = zoneKeys.reduce((s, k) => s + savedTimeInZones[k], 0);

    const energyLabel = (v: string) => {
      const map: Record<string, { en: string; es: string }> = {
        very_low: { en: 'Very low', es: 'Muy bajo' },
        low: { en: 'Low', es: 'Bajo' },
        normal: { en: 'Normal', es: 'Normal' },
        high: { en: 'High', es: 'Alto' },
        very_high: { en: 'Very high', es: 'Muy alto' },
      };
      return is_es ? (map[v]?.es || v) : (map[v]?.en || v);
    };

    const moodLabel = (v: string) => {
      const map: Record<string, { en: string; es: string }> = {
        very_low: { en: 'Very low', es: 'Muy bajo' },
        low: { en: 'Low', es: 'Bajo' },
        normal: { en: 'Normal', es: 'Normal' },
        high: { en: 'High', es: 'Alto' },
        very_high: { en: 'Very high', es: 'Muy alto' },
      };
      return is_es ? (map[v]?.es || v) : (map[v]?.en || v);
    };

    if (showShareCard) {
      return (
        <ActivityShareCard
          activityData={{
            sportType: workout.sport || 'cycling',
            title: workout.name,
            distanceKm: 0,
            durationSeconds: savedTotalSec,
            elevationGainM: 0,
            date: workout.scheduled_date,
            gpsPoints: [],
          }}
          onClose={() => setShowShareCard(false)}
        />
      );
    }

    return (
      <SummaryScreen
        workout={workout}
        language={language}
        totalSec={savedTotalSec}
        timeInZones={savedTimeInZones}
        feedback={feedback}
        zoneKeys={zoneKeys}
        totalZoneSec={totalZoneSec}
        sportColor={sportColor}
        energyLabel={energyLabel}
        moodLabel={moodLabel}
        blocksCompleted={totalDone}
        totalBlocks={totalBlocks}
        mode={mode}
        quickEffort={quickEffort}
        blockLogs={blocks}
        expandedSteps={expandedSteps}
        onShare={() => setShowShareCard(true)}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh]">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: BRAND_YELLOW }}>
              <Activity className="w-5 h-5 text-gray-800" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                {is_es ? 'Registrar Entrenamiento' : 'Log Workout'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{workout.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {originalPlannedDay && (
          <div className="mx-5 mt-3 px-3 py-2 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 flex items-center gap-2 flex-shrink-0">
            <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
            <p className="text-[11px] text-cyan-700 dark:text-cyan-400 font-medium">
              {is_es
                ? `Ejecutado hoy en lugar del entreno del ${new Date(originalPlannedDay + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}`
                : `Executed today instead of ${new Date(originalPlannedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} workout`}
            </p>
          </div>
        )}

        <div className="flex gap-1 px-5 pt-3 pb-1 flex-shrink-0">
          {(['blocks', 'quick'] as LogMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                mode === m ? 'text-gray-800 shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
              style={mode === m ? { backgroundColor: BRAND_YELLOW } : {}}
            >
              {m === 'blocks' ? <Zap className="w-3.5 h-3.5" /> : <Timer className="w-3.5 h-3.5" />}
              {m === 'blocks' ? (is_es ? 'Por bloques' : 'Block mode') : (is_es ? 'Registro rápido' : 'Quick log')}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {mode === 'blocks' && (
            <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {totalDone}/{totalBlocks} {is_es ? 'bloques' : 'blocks'}
                </span>
                <button onClick={checkAll} className="text-xs font-semibold hover:underline" style={{ color: BRAND_PURPLE }}>
                  {is_es ? 'Marcar todos' : 'Check all'}
                </button>
              </div>
              <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mb-3">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: totalBlocks > 0 ? `${(totalDone / totalBlocks) * 100}%` : '0%', backgroundColor: BRAND_YELLOW }}
                />
              </div>

              {expandedSteps.map((step, idx) => {
                const block = blocks[idx];
                const colors = STEP_COLORS[step.step_type] || STEP_COLORS.steady;
                const label = is_es ? colors.labelEs : colors.label;
                const target = formatTarget(step);
                const duration = step.duration_type === 'time'
                  ? formatSecs(step.duration_value)
                  : `${(step.duration_value / 1000).toFixed(1)} km`;
                const isEditing = editingIdx === idx;

                return (
                  <div key={`${step.id}-${idx}`} className={`rounded-xl border p-3 transition-all ${colors.bg} ${block.state === 'done' ? 'opacity-70' : block.state === 'skipped' ? 'opacity-40' : ''}`}>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => checkBlock(idx)}
                        disabled={block.state === 'skipped'}
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                          block.state === 'done' || block.state === 'modified'
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : 'border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-transparent'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{label}</span>
                          {block.state === 'modified' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-semibold">
                              {is_es ? 'editado' : 'edited'}
                            </span>
                          )}
                          {block.state === 'skipped' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-semibold">
                              {is_es ? 'omitido' : 'skipped'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <Clock className="w-3 h-3" />
                            {block.state === 'modified' ? formatSecs(block.actualDurationSec) : duration}
                          </span>
                          {target && <span className="text-xs text-gray-500 dark:text-gray-400">{target}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => openEdit(idx)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-gray-700/60 transition-all">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => skipBlock(idx)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${block.state === 'skipped' ? 'text-red-500 bg-red-100 dark:bg-red-900/30' : 'text-gray-400 hover:text-red-400 hover:bg-white/60 dark:hover:bg-gray-700/60'}`}
                        >
                          <SkipForward className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="mt-3 pt-3 border-t border-white/50 dark:border-gray-700/50 space-y-2">
                        <div className="flex gap-2">
                          {[
                            { label: is_es ? 'Minutos' : 'Minutes', value: editDraftMin, onChange: setEditDraftMin, min: '0', max: undefined },
                            { label: is_es ? 'Segundos' : 'Seconds', value: editDraftSec, onChange: setEditDraftSec, min: '0', max: '59' },
                            { label: 'Zone', value: editDraftZone, onChange: setEditDraftZone, min: '1', max: '7' },
                          ].map(f => (
                            <div key={f.label} className="flex-1">
                              <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{f.label}</label>
                              <input
                                type="number" min={f.min} max={f.max} value={f.value}
                                onChange={e => f.onChange(e.target.value)}
                                placeholder="—"
                                className="w-full mt-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-800 dark:text-gray-200"
                              />
                            </div>
                          ))}
                        </div>
                        <input
                          type="text" value={editDraftNotes}
                          onChange={e => setEditDraftNotes(e.target.value)}
                          placeholder={is_es ? 'Notas (opcional)' : 'Notes (optional)'}
                          className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300"
                        />
                        <div className="flex gap-2">
                          <button onClick={saveEdit} className="flex-1 py-1.5 rounded-lg text-gray-800 text-xs font-semibold transition-colors flex items-center justify-center gap-1" style={{ backgroundColor: BRAND_YELLOW }}>
                            <Save className="w-3.5 h-3.5" />
                            {is_es ? 'Guardar' : 'Save'}
                          </button>
                          <button onClick={() => setEditingIdx(null)} className="px-4 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                            {is_es ? 'Cancelar' : 'Cancel'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {expandedSteps.length === 0 && (
                <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                  <Activity className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">{is_es ? 'Sin bloques definidos' : 'No blocks defined'}</p>
                  <p className="text-xs mt-1">{is_es ? 'Usa el registro rápido' : 'Use quick log instead'}</p>
                </div>
              )}
            </>
          )}

          {mode === 'quick' && (
            <div className="space-y-5 py-2">
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {is_es ? 'Duración total (minutos)' : 'Total duration (minutes)'}
                </label>
                <input
                  type="number" min="1" value={quickDurationMin}
                  onChange={e => setQuickDurationMin(e.target.value)}
                  className="w-full mt-2 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-2xl font-bold text-gray-800 dark:text-gray-200 text-center"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 block">
                  {is_es ? 'Nivel de esfuerzo' : 'Effort level'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'easy', label: is_es ? 'Suave' : 'Easy', color: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400' },
                    { id: 'moderate', label: is_es ? 'Moderado' : 'Moderate', color: 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400' },
                    { id: 'hard', label: is_es ? 'Intenso' : 'Hard', color: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400' },
                  ] as const).map(opt => (
                    <button
                      key={opt.id} onClick={() => setQuickEffort(opt.id)}
                      className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${quickEffort === opt.id ? opt.color + ' shadow-sm scale-[1.02]' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
          {mode === 'blocks' && totalBlocks > 0 && (
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{totalDone}/{totalBlocks}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-500" />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{formatSecs(totalActualSec)}</span>
              </div>
              {blocks.filter(b => b.state === 'skipped').length > 0 && (
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                    {blocks.filter(b => b.state === 'skipped').length} {is_es ? 'omitidos' : 'skipped'}
                  </span>
                </div>
              )}
            </div>
          )}
          <button
            onClick={handleContinueToFeedback}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all shadow-sm text-gray-800"
            style={{ backgroundColor: BRAND_YELLOW }}
          >
            <Save className="w-5 h-5" />
            {is_es ? 'Continuar' : 'Continue'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface SummaryScreenProps {
  workout: EnduranceWorkout;
  language: string;
  totalSec: number;
  timeInZones: Record<string, number>;
  feedback: { rpe: number; energy_level: string; pain_level: string; mood: string; feedback_notes: string };
  zoneKeys: string[];
  totalZoneSec: number;
  sportColor: string;
  energyLabel: (v: string) => string;
  moodLabel: (v: string) => string;
  blocksCompleted: number;
  totalBlocks: number;
  mode: LogMode;
  quickEffort: 'easy' | 'moderate' | 'hard';
  blockLogs: BlockLog[];
  expandedSteps: WorkoutStep[];
  onShare: () => void;
  onClose: () => void;
}

function SummaryScreen({
  workout, language, totalSec, timeInZones, feedback, zoneKeys, totalZoneSec,
  sportColor, energyLabel, moodLabel, blocksCompleted, totalBlocks, mode, quickEffort,
  blockLogs, expandedSteps,
  onShare, onClose
}: SummaryScreenProps) {
  const [visible, setVisible] = useState(false);
  const { theme } = useTheme();
  const is_es = language === 'es';

  const isDark = theme === 'dark';
  const invertedBg = isDark ? 'bg-white' : 'bg-neutral-900';
  const invertedBorder = isDark ? 'border-neutral-200' : 'border-white/10';
  const invertedText = isDark ? 'text-neutral-900' : 'text-white';
  const invertedSub = isDark ? 'text-neutral-500' : 'text-white/50';
  const invertedCard = isDark ? 'bg-neutral-100 border-neutral-200' : 'bg-white/6 border-white/10';
  const invertedCardSub = isDark ? 'text-neutral-500' : 'text-white/40';
  const invertedSep = isDark ? 'border-neutral-200' : 'border-white/8';

  const BRAND = '#fdda36';

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const intensityBlocks = mode === 'blocks'
    ? blockLogs
        .map((b, i) => ({
          zone: b.actualZone ?? expandedSteps[i]?.target_zone ?? 0,
          durationSec: b.actualDurationSec,
          stepType: expandedSteps[i]?.step_type ?? 'steady',
          state: b.state,
        }))
        .filter(b => b.state !== 'skipped' && b.durationSec > 0)
    : [];

  const maxDuration = Math.max(...intensityBlocks.map(b => b.durationSec), 1);

  const zoneBarColor = (zone: number) => ZONE_COLORS[zone - 1] || ZONE_COLORS[0];

  return (
    <div
      className={`fixed inset-0 backdrop-blur-sm flex items-end sm:items-center justify-center z-[80] transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{ background: 'rgba(0,0,0,0.65)' }}
    >
      <div
        className={`${invertedBg} w-full sm:max-w-lg sm:rounded-2xl shadow-2xl border ${invertedBorder} overflow-hidden flex flex-col max-h-[95vh] transition-transform duration-300 rounded-t-3xl ${visible ? 'translate-y-0' : 'translate-y-8'}`}
      >
        <div className="h-1 flex-shrink-0" style={{ background: `linear-gradient(90deg, transparent, ${BRAND}, transparent)` }} />

        <div className={`flex items-center justify-between px-5 py-4 border-b ${invertedSep} flex-shrink-0`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: BRAND + '22' }}>
              <Trophy className="w-5 h-5" style={{ color: BRAND }} />
            </div>
            <div>
              <h2 className={`text-base font-bold ${invertedText}`}>
                {is_es ? '¡Entrenamiento Completado!' : 'Workout Complete!'}
              </h2>
              <p className={`text-xs ${invertedSub} truncate max-w-[200px]`}>{workout.name}</p>
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-neutral-100 text-neutral-400' : 'hover:bg-white/8 text-white/40'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Key stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-2xl p-4 border ${invertedCard}`}>
              <div className="flex items-center gap-1.5 mb-2">
                <Clock className="w-3.5 h-3.5" style={{ color: BRAND }} />
                <span className="text-[11px] font-semibold" style={{ color: BRAND }}>{is_es ? 'Duración' : 'Duration'}</span>
              </div>
              <p className={`text-3xl font-black ${invertedText} leading-none`}>{formatDuration(totalSec)}</p>
            </div>

            <div className={`rounded-2xl p-4 border ${invertedCard}`}>
              <div className="flex items-center gap-1.5 mb-2">
                <Flame className="w-3.5 h-3.5" style={{ color: BRAND }} />
                <span className="text-[11px] font-semibold" style={{ color: BRAND }}>RPE</span>
              </div>
              <p className={`text-3xl font-black ${invertedText} leading-none`}>
                {feedback.rpe}
                <span className={`text-sm font-medium ${invertedSub} ml-1`}>/10</span>
              </p>
            </div>

            {mode === 'blocks' && totalBlocks > 0 && (
              <div className={`rounded-xl p-3.5 border flex items-center gap-3 ${invertedCard}`}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: BRAND + '22' }}>
                  <CheckCircle2 className="w-4 h-4" style={{ color: BRAND }} />
                </div>
                <div>
                  <p className={`text-[11px] ${invertedCardSub}`}>{is_es ? 'Bloques' : 'Blocks'}</p>
                  <p className={`text-lg font-bold ${invertedText} leading-tight`}>
                    {blocksCompleted}<span className={`text-xs ${invertedSub} ml-0.5`}>/{totalBlocks}</span>
                  </p>
                </div>
              </div>
            )}

            {mode === 'quick' && (
              <div className={`rounded-xl p-3.5 border flex items-center gap-3 ${invertedCard}`}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: BRAND + '22' }}>
                  <Zap className="w-4 h-4" style={{ color: BRAND }} />
                </div>
                <div>
                  <p className={`text-[11px] ${invertedCardSub}`}>{is_es ? 'Esfuerzo' : 'Effort'}</p>
                  <p className={`text-sm font-bold leading-tight ${invertedText}`}>
                    {is_es ? (quickEffort === 'easy' ? 'Suave' : quickEffort === 'moderate' ? 'Moderado' : 'Intenso') : (quickEffort === 'easy' ? 'Easy' : quickEffort === 'moderate' ? 'Moderate' : 'Hard')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Intensity by block chart (replaces pace/km for structured workouts) */}
          {intensityBlocks.length > 0 && (
            <div className={`rounded-2xl border ${invertedCard} p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4" style={{ color: BRAND }} />
                <h3 className={`text-xs font-bold uppercase tracking-widest ${invertedSub}`}>
                  {is_es ? 'Intensidad por bloque' : 'Intensity by block'}
                </h3>
              </div>
              <div className="flex items-end gap-1 h-20 mt-1">
                {intensityBlocks.map((b, i) => {
                  const heightPct = Math.max(8, (b.durationSec / maxDuration) * 100);
                  const color = b.zone > 0 ? zoneBarColor(b.zone) : BRAND;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                      <div
                        className="w-full rounded-t-sm transition-all duration-500"
                        style={{ height: `${heightPct}%`, background: color, opacity: 0.85 }}
                      />
                      {b.zone > 0 && (
                        <span className={`text-[8px] font-bold ${invertedSub}`}>Z{b.zone}</span>
                      )}
                      <div
                        className={`absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-1.5 py-1 rounded text-[9px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10`}
                        style={{ background: color, color: '#0a0a0a' }}
                      >
                        {formatSecs(b.durationSec)}{b.zone > 0 ? ` · Z${b.zone}` : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-1">
                <span className={`text-[9px] ${invertedSub}`}>{is_es ? 'Inicio' : 'Start'}</span>
                <span className={`text-[9px] ${invertedSub}`}>{is_es ? 'Fin' : 'End'}</span>
              </div>
            </div>
          )}

          {/* Time in Zones */}
          {zoneKeys.length > 0 && totalZoneSec > 0 && (
            <div className={`rounded-2xl border ${invertedCard} p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4" style={{ color: BRAND }} />
                <h3 className={`text-xs font-bold uppercase tracking-widest ${invertedSub}`}>
                  {is_es ? 'Tiempo en Zonas' : 'Time in Zones'}
                </h3>
              </div>
              <div className="space-y-2">
                {zoneKeys.map((key) => {
                  const secs = timeInZones[key];
                  const pct = totalZoneSec > 0 ? (secs / totalZoneSec) * 100 : 0;
                  const zoneNum = parseInt(key.replace('z', '')) - 1;
                  const color = ZONE_COLORS[zoneNum] || ZONE_COLORS[0];
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-[11px] font-bold w-12 flex-shrink-0" style={{ color }}>
                        {is_es ? `Zona ${zoneNum + 1}` : `Zone ${zoneNum + 1}`}
                      </span>
                      <div className={`flex-1 h-4 rounded-full overflow-hidden ${isDark ? 'bg-neutral-200' : 'bg-white/8'}`}>
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}cc, ${color})` }}
                        />
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[11px] font-bold w-8 text-right ${invertedText}`}>{Math.round(pct)}%</span>
                        <span className={`text-[10px] w-12 text-right ${invertedSub}`}>{formatSecs(secs)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Wellness */}
          <div className={`rounded-2xl border ${invertedCard} p-4`}>
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-4 h-4" style={{ color: BRAND }} />
              <h3 className={`text-xs font-bold uppercase tracking-widest ${invertedSub}`}>
                {is_es ? 'Cómo te sentiste' : 'How You Felt'}
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className={`text-2xl font-black ${invertedText}`}>{feedback.rpe}</div>
                <div className={`text-[10px] ${invertedSub}`}>RPE</div>
              </div>
              <div className="text-center">
                <div className={`text-xs font-bold ${invertedText} capitalize`}>{energyLabel(feedback.energy_level)}</div>
                <div className={`text-[10px] ${invertedSub}`}>{is_es ? 'Energía' : 'Energy'}</div>
              </div>
              <div className="text-center">
                <div className={`text-xs font-bold ${invertedText} capitalize`}>{moodLabel(feedback.mood)}</div>
                <div className={`text-[10px] ${invertedSub}`}>{is_es ? 'Ánimo' : 'Mood'}</div>
              </div>
            </div>
            {feedback.feedback_notes && (
              <p className={`mt-3 text-xs ${invertedSub} italic border-t ${invertedSep} pt-3`}>{feedback.feedback_notes}</p>
            )}
          </div>

          <p className={`text-center text-[10px] ${invertedSub}`}>
            {new Date().toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        <div className={`flex-shrink-0 px-5 pb-5 pt-3 space-y-2.5 border-t ${invertedSep} ${invertedBg}`}>
          <button
            onClick={onShare}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-bold text-sm transition-all hover:opacity-90 active:scale-[0.99]"
            style={{ background: BRAND, color: '#060810', boxShadow: `0 4px 20px ${BRAND}55` }}
          >
            <Share2 className="w-4 h-4" />
            {is_es ? 'Compartir Entrenamiento' : 'Share Workout'}
          </button>
          <button
            onClick={onClose}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium transition-all border ${invertedSep} ${isDark ? 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
          >
            <CheckCircle className="w-4 h-4" />
            {is_es ? 'Listo' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}
