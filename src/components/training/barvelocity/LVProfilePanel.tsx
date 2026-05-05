import { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import {
  TrendingUp,
  Zap,
  Target,
  Activity,
  Info,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { BarRep } from './BarVelocityTypes';
import {
  LVDataPoint,
  LVRegressionResult,
  LV1RMEstimate,
  linearRegression,
  estimate1RM,
  filterOutliers,
  getMVT,
  pct1RMColor,
  pct1RMLabel,
  MIN_POINTS,
  MVT_PRESETS,
} from './LVProfile';
import LoadVelocityProfileChart from './LoadVelocityProfileChart';

interface LVProfilePanelProps {
  /** Reps from the current set (live or post-analysis) */
  currentReps: BarRep[];
  loadKg: number;
  exerciseName: string;
  /** If true, panel is in real-time mode (live tracking) */
  isLive?: boolean;
  /** Called whenever the estimate updates — lets parent access it */
  onEstimateChange?: (est: LV1RMEstimate | null) => void;
}

interface StoredLVPoint {
  load_kg: number;
  mean_velocity_ms: number;
  session_date: string;
  exercise_name: string;
}

export default function LVProfilePanel({
  currentReps,
  loadKg,
  exerciseName,
  isLive = false,
  onEstimateChange,
}: LVProfilePanelProps) {
  const { isDark } = useTheme();
  const { language } = useLanguage();
  const { user } = useAuth();

  const [historicPoints, setHistoricPoints] = useState<LVDataPoint[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showChart, setShowChart] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [mvtOverride, setMvtOverride] = useState<number | null>(null);
  const prevLoadRef = useRef<number>(0);

  // ── Fetch historic load-velocity data from Supabase
  useEffect(() => {
    if (!user || !exerciseName) { setLoadingHistory(false); return; }
    const fetch = async () => {
      const { data } = await (supabase as any)
        .from('bar_velocity_sessions')
        .select('load_kg, mean_concentric_velocity_ms, session_date, exercise_name')
        .eq('athlete_id', user.id)
        .ilike('exercise_name', `%${exerciseName.split(' ')[0]}%`)
        .not('load_kg', 'is', null)
        .not('mean_concentric_velocity_ms', 'is', null)
        .order('session_date', { ascending: false })
        .limit(30);

      if (data) {
        const pts: LVDataPoint[] = (data as StoredLVPoint[]).map((d) => ({
          loadKg: d.load_kg,
          meanVelocityMs: d.mean_velocity_ms,
          label: new Date(d.session_date).toLocaleDateString(),
        }));
        setHistoricPoints(filterOutliers(pts));
      }
      setLoadingHistory(false);
    };
    fetch();
  }, [user, exerciseName]);

  // ── Build current-set points from reps
  const currentSetPoints: LVDataPoint[] = currentReps
    .filter((r) => r.isValid && r.meanConcentricVelocityMs > 0 && loadKg > 0)
    .map((r) => ({
      loadKg,
      meanVelocityMs: r.meanConcentricVelocityMs,
      label: `Rep ${r.repNumber}`,
    }));

  // ── Merge historic + current-set points, deduplicate by load (use mean velocity per load)
  const mergePoints = useCallback((): LVDataPoint[] => {
    const all = [...historicPoints];
    // Add current-set as the aggregate (mean velocity at current load)
    if (currentSetPoints.length > 0 && loadKg > 0) {
      const meanV = currentSetPoints.reduce((s, p) => s + p.meanVelocityMs, 0) / currentSetPoints.length;
      // Remove any existing point at exactly this load from history (current session replaces)
      const filtered = all.filter((p) => Math.abs(p.loadKg - loadKg) > 1);
      filtered.push({ loadKg, meanVelocityMs: meanV, label: language === 'es' ? 'Actual' : 'Current' });
      return filterOutliers(filtered);
    }
    return all;
  }, [historicPoints, currentSetPoints, loadKg, language]);

  const allPoints = mergePoints();

  // ── Regression + 1RM
  const mvt = mvtOverride ?? getMVT(exerciseName);
  const reg: LVRegressionResult = linearRegression(allPoints);
  const est: LV1RMEstimate | null = allPoints.length >= MIN_POINTS
    ? estimate1RM(allPoints, loadKg, exerciseName)
    : null;

  // Override MVT if user changed it
  const estWithOverride: LV1RMEstimate | null = est && mvtOverride
    ? (() => {
        if (!reg.valid || reg.a >= 0) return null;
        const rm = (mvtOverride - reg.b) / reg.a;
        if (rm <= 0 || rm > 1000) return null;
        return {
          ...est,
          estimated1RMkg: Math.round(rm * 10) / 10,
          currentPct1RM: Math.min(Math.round((loadKg / rm) * 1000) / 10, 120),
          mvt: mvtOverride,
        };
      })()
    : est;

  // ── Propagate estimate to parent
  useEffect(() => {
    onEstimateChange?.(estWithOverride);
  }, [estWithOverride, onEstimateChange]);

  // ── Latest rep (for live feedback)
  const latestRep = isLive && currentReps.length > 0
    ? currentReps[currentReps.length - 1]
    : null;
  const latestPoint: LVDataPoint | null = latestRep && loadKg > 0
    ? { loadKg, meanVelocityMs: latestRep.meanConcentricVelocityMs }
    : null;

  const pct = estWithOverride ? estWithOverride.currentPct1RM : null;
  const pctColor = pct != null ? pct1RMColor(pct) : '#94a3b8';
  const pctLabel = pct != null ? pct1RMLabel(pct, language) : '';

  const txt = {
    title: language === 'es' ? 'Perfil Carga-Velocidad' : 'Load-Velocity Profile',
    est1RM: language === 'es' ? '1RM estimado' : 'Est. 1RM',
    pct1RM: language === 'es' ? '% 1RM actual' : 'Current %1RM',
    mvtLabel: language === 'es' ? 'Umbral min. vel. (MVT)' : 'Min velocity threshold (MVT)',
    r2Label: 'R²',
    dataPoints: language === 'es' ? 'Puntos de datos' : 'Data points',
    slope: language === 'es' ? 'Pendiente' : 'Slope',
    needMore: language === 'es'
      ? `Necesitas ${MIN_POINTS - allPoints.length} serie(s) mas con carga para estimar el 1RM`
      : `Need ${MIN_POINTS - allPoints.length} more set(s) with load to estimate 1RM`,
    regressionWeak: language === 'es'
      ? 'Regresion debil (R² < 0.5). Agrega mas series con diferentes cargas.'
      : 'Weak regression (R² < 0.5). Add more sets with different loads.',
    slopePositive: language === 'es'
      ? 'Pendiente positiva detectada — verifica los datos.'
      : 'Positive slope detected — check data quality.',
    liveVel: language === 'es' ? 'Velocidad actual' : 'Live velocity',
    chart: language === 'es' ? 'Grafico perfil' : 'Profile chart',
    infoTitle: language === 'es' ? 'Como funciona' : 'How it works',
    infoText: language === 'es'
      ? 'Cada serie con carga registrada genera un punto en el perfil. La regresion lineal predice el 1RM interpolando hasta el umbral minimo de velocidad (MVT) del ejercicio.'
      : 'Each set with load logged generates a point in the profile. Linear regression predicts 1RM by interpolating to the minimum velocity threshold (MVT) of the exercise.',
    mvtPresets: language === 'es' ? 'MVT por ejercicio (referencia)' : 'MVT by exercise (reference)',
    resetMvt: language === 'es' ? 'Restablecer MVT' : 'Reset MVT',
  };

  const bg = isDark ? 'bg-gray-900' : 'bg-white';
  const border = isDark ? 'border-gray-800' : 'border-gray-200';
  const cardBg = isDark ? 'bg-gray-800/60 border-gray-700/40' : 'bg-gray-50 border-gray-200';
  const textSec = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`rounded-2xl border p-4 space-y-4 ${bg} ${border}`}>
      {/* ── Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{txt.title}</h3>
          {isLive && (
            <span className="flex items-center gap-1 text-xs text-green-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        <button
          onClick={() => setShowInfo((p) => !p)}
          className={`p-1 rounded ${textSec} hover:opacity-80`}
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Info panel */}
      {showInfo && (
        <div className={`rounded-xl p-3 border text-xs space-y-3 ${cardBg}`}>
          <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>{txt.infoText}</p>
          <div>
            <p className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{txt.mvtPresets}</p>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(MVT_PRESETS)
                .filter(([k]) => k !== 'default')
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <span className={`capitalize ${textSec}`}>{k}</span>
                    <span className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{v} m/s</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Live velocity + %1RM big display */}
      {isLive && latestRep && (
        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-xl p-3 border ${isDark ? 'bg-gray-800/60 border-gray-700/40' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <Activity className="w-3.5 h-3.5 text-primary" />
              <span className={`text-xs ${textSec}`}>{txt.liveVel}</span>
            </div>
            <div className="text-2xl font-bold text-primary">
              {latestRep.meanConcentricVelocityMs.toFixed(3)}
            </div>
            <div className={`text-xs ${textSec}`}>m/s</div>
          </div>
          <div
            className="rounded-xl p-3 border"
            style={{ background: `${pctColor}12`, borderColor: `${pctColor}30` }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Target className="w-3.5 h-3.5" style={{ color: pctColor }} />
              <span className={`text-xs ${textSec}`}>{txt.pct1RM}</span>
            </div>
            {pct != null ? (
              <>
                <div className="text-2xl font-bold" style={{ color: pctColor }}>{pct.toFixed(1)}%</div>
                <div className="text-xs font-medium" style={{ color: pctColor }}>{pctLabel}</div>
              </>
            ) : (
              <div className={`text-sm ${textSec}`}>—</div>
            )}
          </div>
        </div>
      )}

      {/* ── 1RM + %1RM summary (non-live) */}
      {!isLive && (
        <div className="grid grid-cols-3 gap-3">
          <div className={`rounded-xl p-3 border ${isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="w-3.5 h-3.5 text-red-400" />
              <span className={`text-xs ${textSec}`}>{txt.est1RM}</span>
            </div>
            {estWithOverride ? (
              <>
                <div className="text-xl font-bold text-red-400">{estWithOverride.estimated1RMkg}</div>
                <div className={`text-xs ${textSec}`}>kg</div>
              </>
            ) : (
              <div className={`text-sm ${textSec}`}>—</div>
            )}
          </div>

          <div
            className="rounded-xl p-3 border"
            style={{ background: `${pctColor}12`, borderColor: `${pctColor}30` }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Target className="w-3.5 h-3.5" style={{ color: pctColor }} />
              <span className={`text-xs ${textSec}`}>{txt.pct1RM}</span>
            </div>
            {pct != null ? (
              <>
                <div className="text-xl font-bold" style={{ color: pctColor }}>{pct.toFixed(1)}%</div>
                <div className="text-xs font-medium" style={{ color: pctColor }}>{pctLabel}</div>
              </>
            ) : (
              <div className={`text-sm ${textSec}`}>—</div>
            )}
          </div>

          <div className={`rounded-xl p-3 border ${cardBg}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <Activity className="w-3.5 h-3.5 text-primary" />
              <span className={`text-xs ${textSec}`}>{txt.dataPoints}</span>
            </div>
            <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{allPoints.length}</div>
            <div className={`text-xs ${textSec}`}>/{MIN_POINTS} min</div>
          </div>
        </div>
      )}

      {/* ── Regression stats */}
      {reg.valid && (
        <div className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg border ${cardBg}`}>
          <span className={textSec}>{txt.r2Label} = <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{reg.r2.toFixed(3)}</span></span>
          <span className={textSec}>{txt.slope} = <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{reg.a.toFixed(4)} m/s/kg</span></span>
          <span className={textSec}>{txt.mvtLabel} = <span className="font-semibold text-orange-400">{mvt.toFixed(2)} m/s</span></span>
        </div>
      )}

      {/* ── Quality warnings */}
      {allPoints.length < MIN_POINTS && (
        <div className={`flex items-start gap-2 p-3 rounded-xl border ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
          <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-400">{txt.needMore}</p>
        </div>
      )}
      {allPoints.length >= MIN_POINTS && !reg.valid && reg.r2 < 0.5 && (
        <div className={`flex items-start gap-2 p-3 rounded-xl border ${isDark ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-yellow-50 border-yellow-200'}`}>
          <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-400">{txt.regressionWeak}</p>
        </div>
      )}
      {reg.a >= 0 && allPoints.length >= 2 && (
        <div className={`flex items-start gap-2 p-3 rounded-xl border ${isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-400">{txt.slopePositive}</p>
        </div>
      )}

      {/* ── MVT override */}
      <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${cardBg}`}>
        <span className={`text-xs shrink-0 ${textSec}`}>{txt.mvtLabel}</span>
        <input
          type="range"
          min="0.05"
          max="0.60"
          step="0.01"
          value={mvtOverride ?? mvt}
          onChange={(e) => setMvtOverride(parseFloat(e.target.value))}
          className="flex-1 accent-primary"
        />
        <span className="text-xs font-semibold text-orange-400 w-14 text-right">
          {(mvtOverride ?? mvt).toFixed(2)} m/s
        </span>
        {mvtOverride !== null && (
          <button
            onClick={() => setMvtOverride(null)}
            className={`p-1 rounded ${textSec} hover:opacity-80`}
            title={txt.resetMvt}
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* ── Chart toggle + chart */}
      <div>
        <button
          onClick={() => setShowChart((p) => !p)}
          className={`flex items-center gap-2 text-xs font-medium w-full mb-2 ${textSec} hover:opacity-80`}
        >
          {showChart ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {txt.chart}
        </button>
        {showChart && (
          <LoadVelocityProfileChart
            points={allPoints}
            regression={reg.valid ? reg : null}
            estimate={estWithOverride}
            currentPoint={isLive ? latestPoint : null}
            height={220}
          />
        )}
      </div>

      {/* ── Rep-level feedback table (live mode) */}
      {isLive && currentReps.length > 0 && (
        <div className="space-y-1.5">
          <p className={`text-xs font-medium uppercase tracking-wide ${textSec}`}>
            {language === 'es' ? 'Reps en vivo' : 'Live reps'}
          </p>
          <div className={`rounded-xl border overflow-hidden ${border}`}>
            <table className="w-full text-xs">
              <thead>
                <tr className={`${isDark ? 'bg-gray-800/80 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                  <th className="text-left px-3 py-2">Rep</th>
                  <th className="text-right px-3 py-2">m/s</th>
                  <th className="text-right px-3 py-2">%1RM</th>
                  <th className="text-right px-3 py-2">1RM est.</th>
                </tr>
              </thead>
              <tbody>
                {currentReps
                  .filter((r) => r.isValid)
                  .map((r) => {
                    const repEst = estWithOverride
                      ? {
                          pct: Math.min((loadKg / estWithOverride.estimated1RMkg) * 100, 120),
                          rm: estWithOverride.estimated1RMkg,
                        }
                      : null;
                    const color = repEst ? pct1RMColor(repEst.pct) : '#94a3b8';
                    const isLatest = r.repNumber === currentReps[currentReps.length - 1]?.repNumber;
                    return (
                      <tr
                        key={r.repNumber}
                        className={`border-t ${isDark ? 'border-gray-700/30' : 'border-gray-200'} ${
                          isLatest ? (isDark ? 'bg-primary/10' : 'bg-amber-50') : ''
                        }`}
                      >
                        <td className={`px-3 py-2 font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                          #{r.repNumber}
                          {isLatest && <span className="ml-1 text-primary">←</span>}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-primary">
                          {r.meanConcentricVelocityMs.toFixed(3)}
                        </td>
                        <td className="px-3 py-2 text-right font-bold" style={{ color }}>
                          {repEst ? `${repEst.pct.toFixed(1)}%` : '—'}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-red-400">
                          {repEst ? `${repEst.rm} kg` : '—'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default LVProfilePanel