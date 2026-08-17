import { Trophy, Zap, Timer, ArrowUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { CMJJump, calculateFatigueIndex } from './CMJTypes';
import { useLanguage } from '../../../contexts/LanguageContext';

interface CMJResultsPanelProps {
  jumps: CMJJump[];
  bodyMassKg?: number;
}

export default function CMJResultsPanel({ jumps, bodyMassKg }: CMJResultsPanelProps) {
  const { language } = useLanguage();
  const validJumps = jumps.filter((j) => j.isValid);
  if (validJumps.length === 0) return null;

  const best = Math.max(...validJumps.map((j) => j.jumpHeightCm));
  const avg = validJumps.reduce((a, b) => a + b.jumpHeightCm, 0) / validJumps.length;
  const fatigueIndex = calculateFatigueIndex(validJumps);
  const bestJump = validJumps.find((j) => j.jumpHeightCm === best);
  const maxHeight = Math.max(best * 1.2, 60);

  const fatigueColor = fatigueIndex < 5 ? 'text-green-400' : fatigueIndex < 10 ? 'text-yellow-400' : 'text-red-400';
  const fatigueBg = fatigueIndex < 5 ? 'bg-green-500/10 border-green-500/20' : fatigueIndex < 10 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-red-500/10 border-red-500/20';

  const txt = {
    bestJump: language === 'es' ? 'Mejor salto' : 'Best jump',
    average: language === 'es' ? 'Promedio' : 'Average',
    flightBest: language === 'es' ? 'T. vuelo (mejor)' : 'Flight (best)',
    powerBest: language === 'es' ? 'Potencia (mejor)' : 'Power (best)',
    fatigueIndex: language === 'es' ? 'indice de fatiga' : 'fatigue index',
    fatigueGood: language === 'es' ? 'Rendimiento neuromuscular estable. Excelente.' : 'Stable neuromuscular performance. Excellent.',
    fatigueMedium: language === 'es' ? 'Fatiga moderada. Normal en protocolos de alta intensidad.' : 'Moderate fatigue. Normal in high-intensity protocols.',
    fatigueHigh: language === 'es' ? 'Fatiga significativa detectada. Considera reducir la carga.' : 'Significant fatigue detected. Consider reducing load.',
    progression: language === 'es' ? 'Evolucion por salto' : 'Jump progression',
    jumpDetail: language === 'es' ? 'Detalle de saltos' : 'Jump detail',
    methodology: language === 'es' ? 'Metodologia de calculo' : 'Calculation method',
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-900 border border-primary/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="text-xs text-gray-500">{txt.bestJump}</span>
          </div>
          <div className="text-2xl font-bold text-primary">{best.toFixed(1)}</div>
          <div className="text-xs text-gray-500 mt-0.5">cm</div>
        </div>

        <div className="bg-gray-900 border border-gray-700/50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUp className="w-4 h-4 text-gray-300" />
            <span className="text-xs text-gray-500">{txt.average}</span>
          </div>
          <div className="text-2xl font-bold text-gray-200">{avg.toFixed(1)}</div>
          <div className="text-xs text-gray-500 mt-0.5">cm</div>
        </div>

        {bestJump?.flightTimeMs && (
          <div className="bg-gray-900 border border-gray-700/50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Timer className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">{txt.flightBest}</span>
            </div>
            <div className="text-2xl font-bold text-gray-200">{bestJump.flightTimeMs.toFixed(0)}</div>
            <div className="text-xs text-gray-500 mt-0.5">ms</div>
          </div>
        )}

        {bestJump?.estimatedPowerW && bestJump.estimatedPowerW > 0 && (
          <div className="bg-gray-900 border border-orange-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-gray-500">{txt.powerBest}</span>
            </div>
            <div className="text-2xl font-bold text-orange-400">{bestJump.estimatedPowerW.toFixed(0)}</div>
            <div className="text-xs text-gray-500 mt-0.5">W</div>
          </div>
        )}
      </div>

      {validJumps.length >= 2 && (
        <div className={`flex items-center gap-3 p-3 rounded-2xl border ${fatigueBg}`}>
          {fatigueIndex < 5 ? (
            <CheckCircle className={`w-5 h-5 shrink-0 ${fatigueColor}`} />
          ) : (
            <AlertTriangle className={`w-5 h-5 shrink-0 ${fatigueColor}`} />
          )}
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-lg font-bold ${fatigueColor}`}>{fatigueIndex.toFixed(1)}%</span>
              <span className="text-xs text-gray-500">{txt.fatigueIndex}</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {fatigueIndex < 5 ? txt.fatigueGood : fatigueIndex < 10 ? txt.fatigueMedium : txt.fatigueHigh}
            </p>
          </div>
        </div>
      )}

      <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800/60">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          {txt.progression}
        </h4>
        <div className="flex items-end gap-2 h-20">
          {validJumps.map((jump, idx) => {
            const heightPct = (jump.jumpHeightCm / maxHeight) * 100;
            const isBest = jump.jumpHeightCm === best;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-[10px] text-gray-500">{jump.jumpHeightCm.toFixed(0)}</div>
                <div className="w-full flex items-end" style={{ height: '48px' }}>
                  <div
                    className={`w-full rounded-t-md transition-all ${
                      isBest ? 'bg-primary' : 'bg-gray-600'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <div className="text-[10px] text-gray-600">#{jump.jumpNumber}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{txt.jumpDetail}</h4>
        {validJumps.map((jump, idx) => {
          const isBest = jump.jumpHeightCm === best;
          return (
            <div
              key={idx}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm border transition-colors ${
                isBest
                  ? 'bg-primary/10 border-primary/20'
                  : 'bg-gray-900 border-gray-800/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold ${
                  isBest ? 'bg-primary/20 text-primary' : 'bg-gray-800 text-gray-400'
                }`}>
                  {jump.jumpNumber}
                </span>
                {isBest && <Trophy className="w-3 h-3 text-primary" />}
              </div>
              <div className="flex items-center gap-4">
                <span className={`font-semibold ${isBest ? 'text-primary' : 'text-gray-200'}`}>
                  {jump.jumpHeightCm.toFixed(1)} cm
                </span>
                <span className="text-gray-600 text-xs">{jump.flightTimeMs.toFixed(0)} ms</span>
                {jump.estimatedPowerW && jump.estimatedPowerW > 0 && (
                  <span className="text-orange-400/70 text-xs">{jump.estimatedPowerW.toFixed(0)} W</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-xs text-gray-600 bg-gray-900/60 rounded-xl p-3 border border-gray-800/40">
        <p className="font-medium text-gray-500 mb-1">{txt.methodology}</p>
        <p>h = (9.81 × t²) / 8 — Sayers et al. (1999)</p>
        {bodyMassKg && <p>P = 60.7 × h(cm) + 45.3 × mass(kg) − 2055</p>}
        <p>{language === 'es' ? 'Fatiga' : 'Fatigue'}: ((best − last) / best) × 100</p>
      </div>
    </div>
  );
}
