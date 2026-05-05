import { Trophy, Zap, Activity, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, TrendingDown, Info } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { BarRep, calcVelocityLoss, getVBTZone, VBT_ZONES } from './BarVelocityTypes';
import BarVelocityChart from './BarVelocityChart';
import VBTVelocityLossGraph, { repFatigueColor, repFatigueLabel, FATIGUE_THRESHOLDS } from './VBTVelocityLossGraph';

interface BarVelocityResultsPanelProps {
  reps: BarRep[];
  loadKg?: number;
  exerciseName?: string;
}

function estimated1RM(meanVelocity: number, loadKg: number): number | null {
  // Gonzalez-Badillo & Sanchez-Medina formula (general approximation)
  // At 1RM, minimum velocity threshold ≈ 0.17 m/s
  const v1rm = 0.17;
  if (meanVelocity <= v1rm) return loadKg;
  // Linear regression approach: load / (1 - (v - v1rm) / vMax)
  const vMax = 1.3; // assumed max velocity (bodyweight)
  const ratio = (meanVelocity - v1rm) / (vMax - v1rm);
  return Math.round(loadKg / Math.max(0.01, 1 - ratio * 0.85));
}

export default function BarVelocityResultsPanel({
  reps,
  loadKg,
  exerciseName,
}: BarVelocityResultsPanelProps) {
  const { language } = useLanguage();
  const { isDark } = useTheme();
  const [expandedRep, setExpandedRep] = useState<number | null>(null);
  const [hoveredRep, setHoveredRep] = useState<BarRep | null>(null);
  const [showThresholdInfo, setShowThresholdInfo] = useState(false);

  const txt = {
    peakVel: language === 'es' ? 'Vel. pico (mejor rep)' : 'Peak vel. (best rep)',
    meanVel: language === 'es' ? 'Vel. media concentrica' : 'Mean concentric vel.',
    avgPower: language === 'es' ? 'Potencia promedio' : 'Average power',
    vbtZone: language === 'es' ? 'Zona VBT' : 'VBT Zone',
    velocityLoss: language === 'es' ? 'perdida de velocidad' : 'velocity loss',
    minLoss: language === 'es' ? 'Perdida minima. Serie de alta calidad neuromuscular.' : 'Minimal loss. High-quality neuromuscular set.',
    modLoss: language === 'es' ? 'Perdida moderada. Considera terminar la serie aqui.' : 'Moderate loss. Consider ending the set here.',
    sigLoss: language === 'es' ? 'Perdida significativa. Alta fatiga acumulada.' : 'Significant loss. High accumulated fatigue.',
    velChart: language === 'es' ? 'Velocidad por repeticion' : 'Velocity per rep',
    velProfile: language === 'es' ? 'Perfil de velocidad — toda la serie' : 'Velocity profile — full set',
    repDetail: language === 'es' ? 'Detalle por repeticion' : 'Rep detail',
    concentric: language === 'es' ? 'Concentrica' : 'Concentric',
    eccentric: language === 'es' ? 'Excentrica' : 'Eccentric',
    displacement: language === 'es' ? 'Desplaz.' : 'Displ.',
    estimatedPower: language === 'es' ? 'Potencia estimada:' : 'Estimated power:',
    vbtRef: language === 'es' ? 'Zonas VBT de referencia' : 'VBT reference zones',
    formula: language === 'es'
      ? 'Potencia: P = F × v = (masa × 9.81) × vel. media concentrica'
      : 'Power: P = F × v = (mass × 9.81) × mean concentric vel.',
    validReps: language === 'es' ? 'Reps validas' : 'Valid reps',
    bestRep: language === 'es' ? 'Mejor rep' : 'Best rep',
    totalLoss: language === 'es' ? 'Perdida total' : 'Total loss',
    est1RM: language === 'es' ? '1RM estimado' : 'Est. 1RM',
    thresholds: language === 'es' ? 'Umbrales de fatiga' : 'Fatigue thresholds',
    low: language === 'es' ? 'Baja' : 'Low',
    moderate: language === 'es' ? 'Moderada' : 'Moderate',
    high: language === 'es' ? 'Alta' : 'High',
    hoverHint: language === 'es' ? 'Toca un punto para ver detalle' : 'Tap a point for details',
    fatigueWarning: language === 'es' ? 'Reps fatigadas detectadas' : 'Fatigued reps detected',
    fatigueTagged: language === 'es' ? 'fatigada' : 'fatigued',
  };

  const validReps = reps.filter((r) => r.isValid && r.meanConcentricVelocityMs > 0);
  if (validReps.length === 0) return null;

  const bestRep = validReps.reduce((a, b) =>
    a.meanConcentricVelocityMs > b.meanConcentricVelocityMs ? a : b
  );
  const bestVelocity = bestRep.meanConcentricVelocityMs;
  const meanV = validReps.reduce((s, r) => s + r.meanConcentricVelocityMs, 0) / validReps.length;
  const velocityLoss = calcVelocityLoss(validReps);
  const bestZone = getVBTZone(bestRep.meanConcentricVelocityMs);
  const zoneLabel = language === 'es' ? bestZone.labelEs : bestZone.labelEn;
  const avgPowerReps = validReps.filter((r) => r.estimatedPowerW);
  const avgPower = avgPowerReps.length > 0
    ? avgPowerReps.reduce((s, r) => s + (r.estimatedPowerW || 0), 0) / avgPowerReps.length
    : 0;

  const rm1 = loadKg && loadKg > 0 ? estimated1RM(meanV, loadKg) : null;

  const lossColor = velocityLoss < 10 ? 'text-green-400' : velocityLoss < 20 ? 'text-yellow-400' : 'text-red-400';
  const lossBg = velocityLoss < 10 ? 'bg-green-500/10 border-green-500/20' : velocityLoss < 20 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-red-500/10 border-red-500/20';

  const allSamples = validReps.flatMap((r) => r.velocitySamples);

  // Tag fatigued reps
  const repsWithFatigue = validReps.map((rep) => {
    const lossPct = bestVelocity > 0 ? ((bestVelocity - rep.meanConcentricVelocityMs) / bestVelocity) * 100 : 0;
    return { ...rep, lossPct, isFatigued: lossPct >= FATIGUE_THRESHOLDS.low };
  });
  const fatigued = repsWithFatigue.filter((r) => r.isFatigued);

  const bg = isDark ? 'bg-gray-900' : 'bg-white';
  const border = isDark ? 'border-gray-800/60' : 'border-gray-200';
  const textSec = isDark ? 'text-gray-400' : 'text-gray-600';

  return (
    <div className="space-y-4 font-body">
      {exerciseName && (
        <div className="text-center">
          <h3 className={`text-base font-heading font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{exerciseName}</h3>
          {loadKg && <p className={`text-sm ${textSec}`}>{loadKg} kg — {validReps.length} reps</p>}
        </div>
      )}

      {/* ── Summary grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`rounded-xl p-4 border ${isDark ? 'bg-gradient-to-br from-primary/15 to-primary/5 border-primary/20' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-primary" />
            <span className={`text-xs ${textSec}`}>{txt.peakVel}</span>
          </div>
          <div className="text-2xl font-bold text-primary">{bestRep.peakVelocityMs.toFixed(2)}</div>
          <div className={`text-xs ${textSec}`}>m/s</div>
        </div>

        <div className={`rounded-xl p-4 border ${isDark ? 'bg-gray-800/40 border-gray-700/30' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Activity className={`w-4 h-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
            <span className={`text-xs ${textSec}`}>{txt.meanVel}</span>
          </div>
          <div className={`text-2xl font-bold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{meanV.toFixed(2)}</div>
          <div className={`text-xs ${textSec}`}>m/s</div>
        </div>

        {avgPower > 0 && (
          <div className={`rounded-xl p-4 border ${isDark ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50 border-orange-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-orange-400" />
              <span className={`text-xs ${textSec}`}>{txt.avgPower}</span>
            </div>
            <div className="text-2xl font-bold text-orange-400">{avgPower.toFixed(0)}</div>
            <div className={`text-xs ${textSec}`}>W</div>
          </div>
        )}

        <div
          className="rounded-xl p-4 border"
          style={{ background: `${bestZone.color}12`, borderColor: `${bestZone.color}30` }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: bestZone.color }} />
            <span className={`text-xs ${textSec}`}>{txt.vbtZone}</span>
          </div>
          <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{zoneLabel}</div>
          <div className={`text-xs ${textSec} mt-0.5`}>{bestZone.min}–{bestZone.max === 3.0 ? '+' : bestZone.max} m/s</div>
        </div>

        <div className={`rounded-xl p-4 border ${isDark ? 'bg-gray-800/40 border-gray-700/30' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className={`text-xs ${textSec}`}>{txt.validReps}</span>
          </div>
          <div className={`text-2xl font-bold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{validReps.length}</div>
          {fatigued.length > 0 && (
            <div className="text-xs text-yellow-400 mt-0.5">{fatigued.length} {txt.fatigueTagged}</div>
          )}
        </div>

        {rm1 && (
          <div className={`rounded-xl p-4 border ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-blue-400" />
              <span className={`text-xs ${textSec}`}>{txt.est1RM}</span>
            </div>
            <div className="text-2xl font-bold text-blue-400">{rm1}</div>
            <div className={`text-xs ${textSec}`}>kg</div>
          </div>
        )}
      </div>

      {/* ── Velocity loss alert */}
      {validReps.length >= 2 && (
        <div className={`flex items-start gap-3 p-3 rounded-xl border ${lossBg}`}>
          {velocityLoss < 10 ? (
            <CheckCircle className={`w-5 h-5 shrink-0 mt-0.5 ${lossColor}`} />
          ) : (
            <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${lossColor}`} />
          )}
          <div className="flex-1">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-lg font-bold ${lossColor}`}>{velocityLoss.toFixed(1)}%</span>
              <span className={`text-xs ${textSec}`}>{txt.velocityLoss}</span>
            </div>
            <p className={`text-xs ${textSec} mt-0.5`}>
              {velocityLoss < 10 ? txt.minLoss : velocityLoss < 20 ? txt.modLoss : txt.sigLoss}
            </p>
          </div>
          <button
            onClick={() => setShowThresholdInfo((p) => !p)}
            className={`p-1 rounded ${textSec} hover:opacity-80`}
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {showThresholdInfo && (
        <div className={`rounded-xl p-3 border text-xs space-y-1.5 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
          <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{txt.thresholds}</p>
          {[
            { pct: FATIGUE_THRESHOLDS.low, label: txt.low, color: '#facc15' },
            { pct: FATIGUE_THRESHOLDS.moderate, label: txt.moderate, color: '#f59e0b' },
            { pct: FATIGUE_THRESHOLDS.high, label: txt.high, color: '#ef4444' },
          ].map((t) => (
            <div key={t.pct} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
              <span style={{ color: t.color }}>{t.label}</span>
              <span className={textSec}>≥ {t.pct}% {language === 'es' ? 'de perdida de velocidad' : 'velocity loss'}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Fatigued reps warning */}
      {fatigued.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-orange-400">{txt.fatigueWarning}</p>
            <p className={`text-xs ${textSec} mt-0.5`}>
              Reps: {fatigued.map((r) => `#${r.repNumber} (-${r.lossPct.toFixed(0)}%)`).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* ── Interactive velocity loss graph */}
      <div className={`rounded-xl p-3 border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between mb-2">
          <h4 className={`text-xs font-semibold uppercase tracking-wide ${textSec}`}>{txt.velChart}</h4>
          <span className={`text-xs ${textSec} opacity-60`}>{txt.hoverHint}</span>
        </div>
        <VBTVelocityLossGraph reps={validReps} onRepHover={setHoveredRep} />
      </div>

      {/* Hovered rep quick stats */}
      {hoveredRep && (
        <div className={`rounded-xl p-3 border transition-all ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Rep #{hoveredRep.repNumber}
            </span>
            {(() => {
              const lp = bestVelocity > 0
                ? ((bestVelocity - hoveredRep.meanConcentricVelocityMs) / bestVelocity) * 100
                : 0;
              return (
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${repFatigueColor(lp)}20`,
                    color: repFatigueColor(lp),
                  }}
                >
                  {repFatigueLabel(lp, language)}
                </span>
              );
            })()}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
            <div>
              <span className={textSec}>{language === 'es' ? 'Media' : 'Mean'}</span>
              <div className="font-bold text-primary">{hoveredRep.meanConcentricVelocityMs.toFixed(3)} m/s</div>
            </div>
            <div>
              <span className={textSec}>{language === 'es' ? 'Pico' : 'Peak'}</span>
              <div className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{hoveredRep.peakVelocityMs.toFixed(3)} m/s</div>
            </div>
            <div>
              <span className={textSec}>{language === 'es' ? 'Desplaz.' : 'Displ.'}</span>
              <div className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{hoveredRep.displacementMm.toFixed(0)} mm</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Full velocity sample profile */}
      {allSamples.length > 5 && (
        <div className={`rounded-xl p-3 border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
          <h4 className={`text-xs font-medium uppercase tracking-wide mb-2 ${textSec}`}>
            {txt.velProfile}
          </h4>
          <BarVelocityChart samples={allSamples} height={110} />
        </div>
      )}

      {/* ── Rep-by-rep detail */}
      <div className="space-y-1.5">
        <h4 className={`text-xs font-medium uppercase tracking-wide ${textSec}`}>{txt.repDetail}</h4>
        {repsWithFatigue.map((rep) => {
          const zone = getVBTZone(rep.meanConcentricVelocityMs);
          const zoneL = language === 'es' ? zone.labelEs : zone.labelEn;
          const isExpanded = expandedRep === rep.repNumber;
          const fatigueColor = repFatigueColor(rep.lossPct);
          const isBest = rep.repNumber === bestRep.repNumber;

          return (
            <div
              key={rep.repNumber}
              className={`border rounded-xl overflow-hidden ${
                isDark ? 'bg-gray-800/50 border-gray-700/30' : 'bg-gray-50 border-gray-200'
              } ${isBest ? 'ring-1 ring-primary/30' : ''}`}
            >
              <button
                onClick={() => setExpandedRep(isExpanded ? null : rep.repNumber)}
                className={`w-full flex items-center justify-between px-3 py-2.5 transition-colors ${
                  isDark ? 'hover:bg-gray-700/20' : 'hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: fatigueColor }}
                  />
                  <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                    Rep #{rep.repNumber}
                  </span>
                  {isBest && (
                    <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                      {language === 'es' ? 'MEJOR' : 'BEST'}
                    </span>
                  )}
                  {rep.isFatigued && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ backgroundColor: `${fatigueColor}20`, color: fatigueColor }}
                    >
                      {repFatigueLabel(rep.lossPct, language)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-primary">{rep.meanConcentricVelocityMs.toFixed(2)} m/s</span>
                  {rep.lossPct > 0 && (
                    <span className="text-xs" style={{ color: fatigueColor }}>
                      -{rep.lossPct.toFixed(0)}%
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className={`w-3.5 h-3.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  ) : (
                    <ChevronDown className={`w-3.5 h-3.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  )}
                </div>
              </button>
              {isExpanded && (
                <div className={`px-3 pb-3 border-t pt-2 space-y-2 ${isDark ? 'border-gray-700/30' : 'border-gray-200'}`}>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className={`rounded-lg p-2 ${isDark ? 'bg-gray-900/50' : 'bg-white'}`}>
                      <div className={`mb-0.5 ${textSec}`}>{txt.concentric}</div>
                      <div className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{(rep.concentricDurationMs / 1000).toFixed(2)}s</div>
                    </div>
                    <div className={`rounded-lg p-2 ${isDark ? 'bg-gray-900/50' : 'bg-white'}`}>
                      <div className={`mb-0.5 ${textSec}`}>{txt.eccentric}</div>
                      <div className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{(rep.eccentricDurationMs / 1000).toFixed(2)}s</div>
                    </div>
                    <div className={`rounded-lg p-2 ${isDark ? 'bg-gray-900/50' : 'bg-white'}`}>
                      <div className={`mb-0.5 ${textSec}`}>{txt.displacement}</div>
                      <div className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{rep.displacementMm.toFixed(0)} mm</div>
                    </div>
                  </div>
                  {rep.estimatedPowerW && rep.estimatedPowerW > 0 && (
                    <div className="flex items-center gap-2 text-xs text-orange-400">
                      <Zap className="w-3.5 h-3.5" />
                      {txt.estimatedPower} <span className="font-bold">{rep.estimatedPowerW.toFixed(0)} W</span>
                    </div>
                  )}
                  {rep.velocitySamples.length > 3 && (
                    <BarVelocityChart samples={rep.velocitySamples} height={80} />
                  )}
                  <div className="text-xs" style={{ color: zone.color }}>{zoneL}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── VBT zones reference */}
      <div className={`rounded-xl p-3 border ${isDark ? 'bg-gray-900/50 border-gray-800/60' : 'bg-gray-50 border-gray-200'}`}>
        <p className={`text-xs font-medium mb-2 ${textSec}`}>{txt.vbtRef}</p>
        <div className="grid grid-cols-1 gap-1">
          {VBT_ZONES.map((z) => {
            const zLabel = language === 'es' ? z.labelEs : z.labelEn;
            return (
              <div key={z.labelEn} className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: z.color }} />
                <span className={`w-32 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{zLabel}</span>
                <span className={textSec}>{z.min}–{z.max === 3.0 ? '+' : z.max} m/s</span>
              </div>
            );
          })}
        </div>
        <p className={`text-xs mt-2 ${textSec}`}>{txt.formula}</p>
      </div>
    </div>
  );
}
