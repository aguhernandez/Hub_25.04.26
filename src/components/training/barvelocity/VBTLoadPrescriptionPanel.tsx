import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import {
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  Zap,
  BarChart2,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { BarRep } from './BarVelocityTypes';
import { LV1RMEstimate } from './LVProfile';
import {
  TrainingGoal,
  SetFeedback,
  GOAL_PROFILES,
  DECISION_CONFIG,
  FATIGUE_CONFIG,
  initialLoad,
  evaluateSet,
  updateSessionModifier,
  repFeedback,
  roundToPlate,
} from './VBTLoadPrescription';

interface VBTLoadPrescriptionPanelProps {
  /** Reps from current live set */
  currentReps: BarRep[];
  /** Current load in kg */
  loadKg: number;
  /** Estimated 1RM from LV profile (may be null if insufficient data) */
  estimate: LV1RMEstimate | null;
  /** Called when panel recommends a load change — parent can update load input */
  onLoadChange?: (newLoadKg: number) => void;
  /** Whether live tracking is active */
  isLive?: boolean;
}

const GOALS: TrainingGoal[] = ['strength', 'power', 'hypertrophy'];

export default function VBTLoadPrescriptionPanel({
  currentReps,
  loadKg,
  estimate,
  onLoadChange,
  isLive = false,
}: VBTLoadPrescriptionPanelProps) {
  const { isDark } = useTheme();
  const { language } = useLanguage();

  const [goal, setGoal] = useState<TrainingGoal>('strength');
  const [sessionModifier, setSessionModifier] = useState(1.0);
  const [setHistory, setSetHistory] = useState<SetFeedback[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [lastProcessedReps, setLastProcessedReps] = useState(0);
  const stopAlertRef = useRef(false);

  const profile = GOAL_PROFILES[goal];
  const est1RM = estimate?.estimated1RMkg ?? null;

  // ── Initial load recommendation
  const recommendedInitialLoad = est1RM ? initialLoad(goal, est1RM) : null;

  // ── Real-time per-rep feedback
  const validReps = currentReps.filter((r) => r.isValid && r.meanConcentricVelocityMs > 0);
  const liveRepFB = repFeedback(validReps, goal, language);

  // ── Auto stop alert when critical fatigue hits
  useEffect(() => {
    if (liveRepFB.stopSet && !stopAlertRef.current) {
      stopAlertRef.current = true;
    } else if (!liveRepFB.stopSet) {
      stopAlertRef.current = false;
    }
  }, [liveRepFB.stopSet]);

  // Reset stop alert when reps reset
  useEffect(() => {
    if (currentReps.length === 0) {
      stopAlertRef.current = false;
      setLastProcessedReps(0);
    }
  }, [currentReps.length]);

  // ── Compute set-end feedback when set finishes (reps stop growing)
  const computeSetFeedback = useCallback(() => {
    if (!est1RM || validReps.length < 2 || loadKg <= 0) return null;
    const best = Math.max(...validReps.map((r) => r.meanConcentricVelocityMs));
    const meanV = validReps.reduce((s, r) => s + r.meanConcentricVelocityMs, 0) / validReps.length;
    const lastV = validReps[validReps.length - 1].meanConcentricVelocityMs;
    const lossPct = best > 0 ? ((best - lastV) / best) * 100 : 0;

    return evaluateSet(
      meanV, best, lossPct, loadKg, est1RM, goal, sessionModifier
    );
  }, [validReps, loadKg, est1RM, goal, sessionModifier]);

  // ── Record set feedback when user ends set (reps > 0 and not live)
  useEffect(() => {
    if (isLive) return;
    if (validReps.length > 0 && validReps.length !== lastProcessedReps) {
      const fb = computeSetFeedback();
      if (fb) {
        setSetHistory((prev) => {
          const next = [...prev, fb];
          const newMod = updateSessionModifier(next, sessionModifier);
          setSessionModifier(newMod);
          return next;
        });
        setLastProcessedReps(validReps.length);
      }
    }
  }, [isLive, validReps.length, lastProcessedReps, computeSetFeedback, sessionModifier]);

  // Latest set feedback
  const latestSetFB = setHistory[setHistory.length - 1] ?? null;

  // Current set feedback (live mode only)
  const liveSetFB = isLive && est1RM && validReps.length >= 1
    ? (() => {
        const best = Math.max(...validReps.map((r) => r.meanConcentricVelocityMs));
        const meanV = validReps.reduce((s, r) => s + r.meanConcentricVelocityMs, 0) / validReps.length;
        const lastV = validReps[validReps.length - 1].meanConcentricVelocityMs;
        const lossPct = best > 0 ? ((best - lastV) / best) * 100 : 0;
        return evaluateSet(meanV, best, lossPct, loadKg, est1RM, goal, sessionModifier);
      })()
    : null;

  const activeFB = isLive ? liveSetFB : latestSetFB;

  // ── Text
  const txt = {
    title: language === 'es' ? 'Prescripcion de Carga' : 'Load Prescription',
    goal: language === 'es' ? 'Objetivo' : 'Goal',
    est1RM: language === 'es' ? '1RM estimado' : 'Est. 1RM',
    noEstimate: language === 'es'
      ? 'Necesitas 3+ series con carga para estimar el 1RM'
      : 'Need 3+ sets with load to estimate 1RM',
    initialLoad: language === 'es' ? 'Carga inicial recomendada' : 'Recommended initial load',
    useThis: language === 'es' ? 'Usar esta carga' : 'Use this load',
    targetZone: language === 'es' ? 'Zona objetivo' : 'Target zone',
    stopThreshold: language === 'es' ? 'Umbral de parada' : 'Stop threshold',
    repRange: language === 'es' ? 'Rango de reps' : 'Rep range',
    nextLoad: language === 'es' ? 'Carga siguiente' : 'Next load',
    repsRemaining: language === 'es' ? 'Reps estimadas' : 'Est. reps',
    fatigueStatus: language === 'es' ? 'Fatiga' : 'Fatigue',
    velLoss: language === 'es' ? 'Perdida vel.' : 'Vel. loss',
    sessionMod: language === 'es' ? 'Modificador sesion' : 'Session modifier',
    history: language === 'es' ? 'Historial de series' : 'Set history',
    setNum: language === 'es' ? 'Serie' : 'Set',
    applyLoad: language === 'es' ? 'Aplicar carga' : 'Apply load',
    resetSession: language === 'es' ? 'Nueva sesion' : 'New session',
    liveRep: language === 'es' ? 'Rep actual' : 'Live rep',
    velocity: language === 'es' ? 'Velocidad' : 'Velocity',
    fatigueCutoff: language === 'es' ? 'Fatiga de corte' : 'Fatigue cutoff',
  };

  const bg = isDark ? 'bg-gray-900' : 'bg-white';
  const border = isDark ? 'border-gray-800' : 'border-gray-200';
  const cardBg = isDark ? 'bg-gray-800/60 border-gray-700/40' : 'bg-gray-50 border-gray-200';
  const textPri = isDark ? 'text-white' : 'text-gray-900';
  const textSec = isDark ? 'text-gray-400' : 'text-gray-500';

  const decisionIcon = (d: string) => {
    if (d === 'increase') return <TrendingUp className="w-5 h-5" />;
    if (d === 'decrease') return <TrendingDown className="w-5 h-5" />;
    if (d === 'stop_set') return <AlertOctagon className="w-5 h-5" />;
    return <Minus className="w-5 h-5" />;
  };

  return (
    <div className={`rounded-2xl border overflow-hidden ${bg} ${border}`}>
      {/* ── Header */}
      <button
        onClick={() => setCollapsed((p) => !p)}
        className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${
          isDark ? 'hover:bg-gray-800/40' : 'hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <span className={`text-sm font-bold ${textPri}`}>{txt.title}</span>
          {isLive && liveRepFB.stopSet && (
            <span className="flex items-center gap-1 text-xs font-bold text-red-400 animate-pulse">
              <AlertOctagon className="w-3.5 h-3.5" />
              STOP
            </span>
          )}
          {isLive && !liveRepFB.stopSet && validReps.length > 0 && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: DECISION_CONFIG[liveRepFB.action].bg,
                color: DECISION_CONFIG[liveRepFB.action].color,
              }}
            >
              {language === 'es'
                ? DECISION_CONFIG[liveRepFB.action].labelEs
                : DECISION_CONFIG[liveRepFB.action].labelEn}
            </span>
          )}
        </div>
        {collapsed ? <ChevronDown className={`w-4 h-4 ${textSec}`} /> : <ChevronUp className={`w-4 h-4 ${textSec}`} />}
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-4">
          {/* ── Goal selector */}
          <div>
            <label className={`text-xs font-medium block mb-2 ${textSec}`}>{txt.goal}</label>
            <div className="grid grid-cols-3 gap-2">
              {GOALS.map((g) => {
                const p = GOAL_PROFILES[g];
                const active = goal === g;
                return (
                  <button
                    key={g}
                    onClick={() => setGoal(g)}
                    className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-xs font-medium transition-all ${
                      active
                        ? 'border-current'
                        : isDark ? 'border-gray-700/40 text-gray-400 hover:border-gray-600' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                    style={active ? { borderColor: p.color, backgroundColor: `${p.color}10`, color: p.color } : {}}
                  >
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: active ? p.color : '#6b7280' }} />
                    {language === 'es' ? p.labelEs : p.labelEn}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Goal profile info */}
          <div className={`grid grid-cols-3 gap-2 text-xs`}>
            <div className={`rounded-xl p-2.5 border text-center ${cardBg}`}>
              <div className={`${textSec} mb-0.5`}>{txt.targetZone}</div>
              <div className={`font-bold ${textPri}`}>{profile.velocityZone.min}–{profile.velocityZone.max}</div>
              <div className={`${textSec}`}>m/s</div>
            </div>
            <div className={`rounded-xl p-2.5 border text-center ${cardBg}`}>
              <div className={`${textSec} mb-0.5`}>{txt.fatigueCutoff}</div>
              <div className="font-bold text-orange-400">{profile.fatigueCutoffPct}%</div>
              <div className={`${textSec}`}>{language === 'es' ? 'perdida' : 'loss'}</div>
            </div>
            <div className={`rounded-xl p-2.5 border text-center ${cardBg}`}>
              <div className={`${textSec} mb-0.5`}>{txt.repRange}</div>
              <div className={`font-bold ${textPri}`}>{profile.repRange.min}–{profile.repRange.max}</div>
              <div className={`${textSec}`}>reps</div>
            </div>
          </div>

          {/* ── 1RM + initial load */}
          {!est1RM ? (
            <div className={`flex items-start gap-2 p-3 rounded-xl border ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
              <BarChart2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-400">{txt.noEstimate}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className={`rounded-xl p-3 border ${isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
                <div className={`text-xs ${textSec} mb-1`}>{txt.est1RM}</div>
                <div className="text-2xl font-bold text-red-400">{est1RM.toFixed(1)}</div>
                <div className={`text-xs ${textSec}`}>kg</div>
              </div>
              <div className={`rounded-xl p-3 border ${cardBg}`}>
                <div className={`text-xs ${textSec} mb-1`}>{txt.initialLoad}</div>
                <div className={`text-2xl font-bold ${textPri}`}>{recommendedInitialLoad}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs ${textSec}`}>kg</span>
                  {onLoadChange && recommendedInitialLoad && (
                    <button
                      onClick={() => onLoadChange(recommendedInitialLoad)}
                      className="text-xs text-primary font-semibold hover:opacity-80 transition-opacity"
                    >
                      {txt.useThis}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Live rep-level feedback (live mode only) */}
          {isLive && validReps.length > 0 && (
            <div
              className="rounded-xl p-3 border transition-all"
              style={{
                backgroundColor: DECISION_CONFIG[liveRepFB.action].bg,
                borderColor: `${DECISION_CONFIG[liveRepFB.action].color}40`,
              }}
            >
              <div className="flex items-center gap-3">
                <div style={{ color: DECISION_CONFIG[liveRepFB.action].color }}>
                  {decisionIcon(liveRepFB.action)}
                </div>
                <div className="flex-1">
                  <div
                    className="text-base font-bold"
                    style={{ color: DECISION_CONFIG[liveRepFB.action].color }}
                  >
                    {language === 'es'
                      ? DECISION_CONFIG[liveRepFB.action].labelEs
                      : DECISION_CONFIG[liveRepFB.action].labelEn}
                  </div>
                  {liveRepFB.message && (
                    <p className={`text-xs mt-0.5 ${textSec}`}>{liveRepFB.message}</p>
                  )}
                </div>
                <div className="text-right">
                  <div
                    className="text-sm font-bold"
                    style={{ color: FATIGUE_CONFIG[liveRepFB.fatigueStatus].color }}
                  >
                    {language === 'es'
                      ? FATIGUE_CONFIG[liveRepFB.fatigueStatus].labelEs
                      : FATIGUE_CONFIG[liveRepFB.fatigueStatus].labelEn}
                  </div>
                  <div className={`text-xs ${textSec}`}>-{liveRepFB.velocityLossPct.toFixed(1)}%</div>
                </div>
              </div>

              {/* Velocity loss bar */}
              <div className={`mt-2.5 rounded-full h-1.5 overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(liveRepFB.velocityLossPct / profile.fatigueCutoffPct * 100, 100)}%`,
                    backgroundColor: DECISION_CONFIG[liveRepFB.action].color,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] mt-0.5">
                <span className={textSec}>0%</span>
                <span className={textSec}>{txt.fatigueCutoff}: {profile.fatigueCutoffPct}%</span>
              </div>
            </div>
          )}

          {/* ── Set-end next load recommendation */}
          {activeFB && activeFB.decision !== 'stop_set' && (
            <div className={`rounded-xl p-3 border space-y-3 ${isDark ? 'bg-gray-800/60 border-gray-700/40' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${textSec}`}>{txt.nextLoad}</span>
                <div
                  className="flex items-center gap-1.5 text-sm font-bold px-2 py-1 rounded-lg"
                  style={{
                    backgroundColor: DECISION_CONFIG[activeFB.decision].bg,
                    color: DECISION_CONFIG[activeFB.decision].color,
                  }}
                >
                  {decisionIcon(activeFB.decision)}
                  {language === 'es'
                    ? DECISION_CONFIG[activeFB.decision].labelEs
                    : DECISION_CONFIG[activeFB.decision].labelEn}
                </div>
              </div>
              <div className="flex items-end gap-4">
                <div>
                  <div className={`text-3xl font-bold ${textPri}`}>{activeFB.nextLoadKg}</div>
                  <div className={`text-xs ${textSec}`}>kg</div>
                </div>
                <div className="pb-1">
                  <div
                    className="text-lg font-semibold"
                    style={{ color: DECISION_CONFIG[activeFB.decision].color }}
                  >
                    {activeFB.adjustmentPct > 0 ? '+' : ''}{activeFB.adjustmentPct.toFixed(1)}%
                  </div>
                  <div className={`text-xs ${textSec}`}>{language === 'es' ? 'ajuste' : 'adjustment'}</div>
                </div>
                <div className="pb-1 ml-auto">
                  <div className={`text-lg font-semibold ${textPri}`}>{activeFB.repsRemainingEstimate}</div>
                  <div className={`text-xs ${textSec}`}>{txt.repsRemaining}</div>
                </div>
              </div>
              {onLoadChange && (
                <button
                  onClick={() => onLoadChange(activeFB.nextLoadKg)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-colors"
                  style={{
                    backgroundColor: DECISION_CONFIG[activeFB.decision].bg,
                    color: DECISION_CONFIG[activeFB.decision].color,
                    border: `1px solid ${DECISION_CONFIG[activeFB.decision].color}40`,
                  }}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  {txt.applyLoad} → {activeFB.nextLoadKg} kg
                </button>
              )}
            </div>
          )}

          {/* ── STOP SET alert */}
          {activeFB?.decision === 'stop_set' && (
            <div className="rounded-xl p-4 border border-red-500/40 bg-red-500/10 text-center space-y-1.5">
              <AlertOctagon className="w-8 h-8 text-red-400 mx-auto" />
              <div className="text-base font-bold text-red-400">
                {language === 'es' ? DECISION_CONFIG.stop_set.labelEs : DECISION_CONFIG.stop_set.labelEn}
              </div>
              <p className="text-xs text-red-400/80">
                {language === 'es'
                  ? `Perdida de velocidad ${activeFB.velocityLossPct.toFixed(1)}% supera el umbral de ${profile.fatigueCutoffPct}%`
                  : `Velocity loss ${activeFB.velocityLossPct.toFixed(1)}% exceeds ${profile.fatigueCutoffPct}% threshold`}
              </p>
            </div>
          )}

          {/* ── Session modifier */}
          {setHistory.length >= 2 && (
            <div className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${cardBg}`}>
              <span className={textSec}>{txt.sessionMod}</span>
              <span
                className="font-bold"
                style={{ color: sessionModifier > 1 ? '#22c55e' : sessionModifier < 1 ? '#f97316' : '#94a3b8' }}
              >
                ×{sessionModifier.toFixed(3)}
                {sessionModifier > 1.01 ? ' ↑' : sessionModifier < 0.99 ? ' ↓' : ''}
              </span>
            </div>
          )}

          {/* ── Set history */}
          {setHistory.length > 0 && (
            <div className="space-y-1.5">
              <p className={`text-xs font-medium uppercase tracking-wide ${textSec}`}>{txt.history}</p>
              <div className={`rounded-xl border overflow-hidden ${border}`}>
                <table className="w-full text-xs">
                  <thead>
                    <tr className={isDark ? 'bg-gray-800/80 text-gray-400' : 'bg-gray-100 text-gray-600'}>
                      <th className="text-left px-3 py-2">{txt.setNum}</th>
                      <th className="text-right px-3 py-2">{language === 'es' ? 'Carga' : 'Load'}</th>
                      <th className="text-right px-3 py-2">m/s</th>
                      <th className="text-right px-3 py-2">{language === 'es' ? 'Perdida' : 'Loss'}</th>
                      <th className="text-right px-3 py-2">{language === 'es' ? 'Decision' : 'Decision'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {setHistory.map((fb, i) => {
                      const dc = DECISION_CONFIG[fb.decision];
                      return (
                        <tr
                          key={i}
                          className={`border-t ${isDark ? 'border-gray-700/30' : 'border-gray-200'}`}
                        >
                          <td className={`px-3 py-2 ${textPri}`}>#{i + 1}</td>
                          <td className={`px-3 py-2 text-right ${textPri}`}>{loadKg} kg</td>
                          <td className="px-3 py-2 text-right font-bold text-primary">
                            {fb.actualMeanVelocity.toFixed(2)}
                          </td>
                          <td
                            className="px-3 py-2 text-right font-semibold"
                            style={{ color: FATIGUE_CONFIG[fb.fatigueStatus].color }}
                          >
                            -{fb.velocityLossPct.toFixed(1)}%
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span
                              className="px-1.5 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: dc.bg, color: dc.color }}
                            >
                              {language === 'es' ? dc.labelEs : dc.labelEn}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Reset session */}
          {setHistory.length > 0 && (
            <button
              onClick={() => {
                setSetHistory([]);
                setSessionModifier(1.0);
                setLastProcessedReps(0);
                stopAlertRef.current = false;
              }}
              className={`flex items-center gap-2 text-xs ${textSec} hover:opacity-80 transition-opacity`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {txt.resetSession}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
