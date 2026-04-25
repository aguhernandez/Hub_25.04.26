import { Trophy, Zap, Activity, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { BarRep, calcVelocityLoss, getVBTZone, VBT_ZONES } from './BarVelocityTypes';
import BarVelocityChart from './BarVelocityChart';

interface BarVelocityResultsPanelProps {
  reps: BarRep[];
  loadKg?: number;
  exerciseName?: string;
}

export default function BarVelocityResultsPanel({
  reps,
  loadKg,
  exerciseName,
}: BarVelocityResultsPanelProps) {
  const { language } = useLanguage();
  const [expandedRep, setExpandedRep] = useState<number | null>(null);

  const txt = {
    peakVel: language === 'es' ? 'Vel. pico (mejor rep)' : 'Peak vel. (best rep)',
    meanVel: language === 'es' ? 'Vel. media concentrica' : 'Mean concentric vel.',
    avgPower: language === 'es' ? 'Potencia promedio' : 'Average power',
    vbtZone: language === 'es' ? 'Zona VBT' : 'VBT Zone',
    velocityLoss: language === 'es' ? 'perdida de velocidad' : 'velocity loss',
    minLoss: language === 'es' ? 'Perdida minima. Serie de alta calidad neuromuscular.' : 'Minimal loss. High-quality neuromuscular set.',
    modLoss: language === 'es' ? 'Perdida moderada. Considera terminar la serie aqui.' : 'Moderate loss. Consider ending the set here.',
    sigLoss: language === 'es' ? 'Perdida significativa. Alta fatiga acumulada.' : 'Significant loss. High accumulated fatigue.',
    velProfile: language === 'es' ? 'Perfil de velocidad — toda la serie' : 'Velocity profile — full set',
    repEvolution: language === 'es' ? 'Evolucion de velocidad por rep' : 'Velocity by rep',
    repDetail: language === 'es' ? 'Detalle por repeticion' : 'Rep detail',
    concentric: language === 'es' ? 'Concentrica' : 'Concentric',
    eccentric: language === 'es' ? 'Excentrica' : 'Eccentric',
    displacement: language === 'es' ? 'Desplaz.' : 'Displ.',
    estimatedPower: language === 'es' ? 'Potencia estimada:' : 'Estimated power:',
    vbtRef: language === 'es' ? 'Zonas VBT de referencia' : 'VBT reference zones',
    formula: language === 'es'
      ? 'Potencia: P = F × v = (masa × 9.81) × vel. media concentrica'
      : 'Power: P = F × v = (mass × 9.81) × mean concentric vel.',
  };

  const validReps = reps.filter((r) => r.isValid && r.meanConcentricVelocityMs > 0);
  if (validReps.length === 0) return null;

  const bestRep = validReps.reduce((a, b) =>
    a.peakVelocityMs > b.peakVelocityMs ? a : b
  );
  const meanV = validReps.reduce((s, r) => s + r.meanConcentricVelocityMs, 0) / validReps.length;
  const velocityLoss = calcVelocityLoss(validReps);
  const bestZone = getVBTZone(bestRep.meanConcentricVelocityMs);
  const zoneLabel = language === 'es' ? bestZone.labelEs : bestZone.labelEn;
  const avgPowerReps = validReps.filter((r) => r.estimatedPowerW);
  const avgPower = avgPowerReps.length > 0
    ? avgPowerReps.reduce((s, r) => s + (r.estimatedPowerW || 0), 0) / avgPowerReps.length
    : 0;

  const lossColor = velocityLoss < 10 ? 'text-green-400' : velocityLoss < 20 ? 'text-yellow-400' : 'text-red-400';
  const lossBg = velocityLoss < 10 ? 'bg-green-500/10 border-green-500/20' : velocityLoss < 20 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-red-500/10 border-red-500/20';

  const allSamples = validReps.flatMap((r) => r.velocitySamples);

  return (
    <div className="space-y-4 font-body">
      {exerciseName && (
        <div className="text-center">
          <h3 className="text-base font-heading font-bold text-white">{exerciseName}</h3>
          {loadKg && <p className="text-sm text-gray-400">{loadKg} kg — {validReps.length} reps</p>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="text-xs text-gray-400">{txt.peakVel}</span>
          </div>
          <div className="text-2xl font-bold text-primary">{bestRep.peakVelocityMs.toFixed(2)}</div>
          <div className="text-xs text-gray-400">m/s</div>
        </div>

        <div className="bg-gradient-to-br from-gray-700/30 to-gray-800/20 border border-gray-700/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-gray-300" />
            <span className="text-xs text-gray-400">{txt.meanVel}</span>
          </div>
          <div className="text-2xl font-bold text-gray-200">{meanV.toFixed(2)}</div>
          <div className="text-xs text-gray-400">m/s</div>
        </div>

        {avgPower > 0 && (
          <div className="bg-gradient-to-br from-orange-500/15 to-red-500/10 border border-orange-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-gray-400">{txt.avgPower}</span>
            </div>
            <div className="text-2xl font-bold text-orange-400">{avgPower.toFixed(0)}</div>
            <div className="text-xs text-gray-400">W</div>
          </div>
        )}

        <div
          className="rounded-xl p-4 border"
          style={{ background: `${bestZone.color}15`, borderColor: `${bestZone.color}30` }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: bestZone.color }} />
            <span className="text-xs text-gray-400">{txt.vbtZone}</span>
          </div>
          <div className="text-sm font-bold text-white">{zoneLabel}</div>
          <div className="text-xs text-gray-400 mt-0.5">{bestZone.min}–{bestZone.max === 3.0 ? '+' : bestZone.max} m/s</div>
        </div>
      </div>

      {validReps.length >= 2 && (
        <div className={`flex items-center gap-3 p-3 rounded-xl border ${lossBg}`}>
          {velocityLoss < 10 ? (
            <CheckCircle className={`w-5 h-5 shrink-0 ${lossColor}`} />
          ) : (
            <AlertTriangle className={`w-5 h-5 shrink-0 ${lossColor}`} />
          )}
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-lg font-bold ${lossColor}`}>{velocityLoss.toFixed(1)}%</span>
              <span className="text-xs text-gray-400">{txt.velocityLoss}</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {velocityLoss < 10 ? txt.minLoss : velocityLoss < 20 ? txt.modLoss : txt.sigLoss}
            </p>
          </div>
        </div>
      )}

      {allSamples.length > 5 && (
        <div className="bg-gray-900/60 rounded-xl p-3 border border-gray-700/30">
          <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
            {txt.velProfile}
          </h4>
          <BarVelocityChart samples={allSamples} height={110} />
        </div>
      )}

      <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/30">
        <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
          {txt.repEvolution}
        </h4>
        <div className="flex items-end gap-2 h-20">
          {validReps.map((rep, idx) => {
            const maxV = Math.max(...validReps.map((r) => r.meanConcentricVelocityMs));
            const pct = (rep.meanConcentricVelocityMs / (maxV * 1.15)) * 100;
            const zone = getVBTZone(rep.meanConcentricVelocityMs);
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-xs text-gray-400">{rep.meanConcentricVelocityMs.toFixed(2)}</div>
                <div className="w-full flex items-end" style={{ height: '52px' }}>
                  <div
                    className="w-full rounded-t-md transition-all"
                    style={{
                      height: `${pct}%`,
                      background: `linear-gradient(to top, ${zone.color}cc, ${zone.color})`,
                    }}
                  />
                </div>
                <div className="text-xs text-gray-500">R{rep.repNumber}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide">{txt.repDetail}</h4>
        {validReps.map((rep) => {
          const zone = getVBTZone(rep.meanConcentricVelocityMs);
          const zoneL = language === 'es' ? zone.labelEs : zone.labelEn;
          const isExpanded = expandedRep === rep.repNumber;
          return (
            <div
              key={rep.repNumber}
              className="bg-gray-800/50 border border-gray-700/30 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setExpandedRep(isExpanded ? null : rep.repNumber)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-700/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: zone.color }} />
                  <span className="text-sm text-gray-200 font-medium">Rep #{rep.repNumber}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-primary">{rep.meanConcentricVelocityMs.toFixed(2)} m/s</span>
                  <span className="text-xs text-gray-500">{language === 'es' ? 'pico:' : 'peak:'} {rep.peakVelocityMs.toFixed(2)}</span>
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </div>
              </button>
              {isExpanded && (
                <div className="px-3 pb-3 border-t border-gray-700/30 pt-2 space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-gray-900/50 rounded-lg p-2">
                      <div className="text-gray-400 mb-0.5">{txt.concentric}</div>
                      <div className="font-semibold text-gray-200">{(rep.concentricDurationMs / 1000).toFixed(2)}s</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-2">
                      <div className="text-gray-400 mb-0.5">{txt.eccentric}</div>
                      <div className="font-semibold text-gray-200">{(rep.eccentricDurationMs / 1000).toFixed(2)}s</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-2">
                      <div className="text-gray-400 mb-0.5">{txt.displacement}</div>
                      <div className="font-semibold text-gray-200">{rep.displacementMm.toFixed(0)} mm</div>
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
                  <div className="text-xs" style={{ color: zone.color }}>
                    {zoneL}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-800/60">
        <p className="text-xs font-medium text-gray-400 mb-2">{txt.vbtRef}</p>
        <div className="grid grid-cols-1 gap-1">
          {VBT_ZONES.map((z) => {
            const zLabel = language === 'es' ? z.labelEs : z.labelEn;
            return (
              <div key={z.labelEn} className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: z.color }} />
                <span className="text-gray-300 w-32">{zLabel}</span>
                <span className="text-gray-500">{z.min}–{z.max === 3.0 ? '+' : z.max} m/s</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mt-2">{txt.formula}</p>
      </div>
    </div>
  );
}
