import { useState, useEffect } from 'react';
import { Calculator, Lock, Unlock, RefreshCw, AlertCircle, Info } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';

interface OneRMLoadSelectorProps {
  exerciseId: string;
  exerciseName: string;
  athleteId?: string;
  currentLoad?: number;
  currentPercentage?: number;
  use1RMAutoLoad?: boolean;
  referenceMethod?: 'latest' | 'epley' | 'rir' | 'velocity' | 'baseline';
  isFrozen?: boolean;
  frozenValue?: number;
  frozenUnit?: string;
  onUpdate: (config: {
    use_1rm_auto_load: boolean;
    target_1rm_percentage?: number;
    reference_1rm_method?: string;
    calculated_load?: number;
    freeze_1rm_reference?: boolean;
    frozen_1rm_value?: number;
    frozen_1rm_unit?: string;
  }) => void;
}

interface OneRMData {
  estimated_1rm: number;
  unit: string;
  estimation_method: string;
  calculated_at: string;
}

export default function OneRMLoadSelector({
  exerciseId,
  exerciseName,
  athleteId,
  currentLoad,
  currentPercentage = 75,
  use1RMAutoLoad = false,
  referenceMethod = 'latest',
  isFrozen = false,
  frozenValue,
  frozenUnit,
  onUpdate,
}: OneRMLoadSelectorProps) {
  const { language } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(use1RMAutoLoad);
  const [oneRMData, setOneRMData] = useState<OneRMData | null>(null);
  const [loading, setLoading] = useState(false);
  const [percentage, setPercentage] = useState(currentPercentage);
  const [method, setMethod] = useState<'latest' | 'epley' | 'rir' | 'velocity' | 'baseline'>(referenceMethod);
  const [frozen, setFrozen] = useState(isFrozen);

  useEffect(() => {
    if (isExpanded && athleteId) {
      loadOneRM();
    }
  }, [isExpanded, athleteId, method, exerciseName]);

  const loadOneRM = async () => {
    if (!athleteId || !exerciseName) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_latest_1rm', {
        p_athlete_id: athleteId,
        p_exercise_name: exerciseName,
        p_method: method,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setOneRMData(data[0]);
      } else {
        setOneRMData(null);
      }
    } catch (error) {
      console.error('Error loading 1RM:', error);
      setOneRMData(null);
    } finally {
      setLoading(false);
    }
  };

  const calculateLoad = (oneRM: number, pct: number): number => {
    return Math.round((oneRM * pct / 100) * 10) / 10;
  };

  const handleToggleAutoLoad = (enabled: boolean) => {
    setIsExpanded(enabled);

    if (enabled && oneRMData) {
      const calculatedLoad = calculateLoad(oneRMData.estimated_1rm, percentage);
      onUpdate({
        use_1rm_auto_load: true,
        target_1rm_percentage: percentage,
        reference_1rm_method: method,
        calculated_load: calculatedLoad,
        freeze_1rm_reference: frozen,
        frozen_1rm_value: frozen ? oneRMData.estimated_1rm : undefined,
        frozen_1rm_unit: frozen ? oneRMData.unit : undefined,
      });
    } else {
      onUpdate({
        use_1rm_auto_load: false,
      });
    }
  };

  const handlePercentageChange = (newPercentage: number) => {
    setPercentage(newPercentage);

    if (oneRMData) {
      const calculatedLoad = calculateLoad(oneRMData.estimated_1rm, newPercentage);
      onUpdate({
        use_1rm_auto_load: true,
        target_1rm_percentage: newPercentage,
        reference_1rm_method: method,
        calculated_load: calculatedLoad,
        freeze_1rm_reference: frozen,
        frozen_1rm_value: frozen ? oneRMData.estimated_1rm : undefined,
        frozen_1rm_unit: frozen ? oneRMData.unit : undefined,
      });
    }
  };

  const handleMethodChange = (newMethod: 'latest' | 'epley' | 'rir' | 'velocity' | 'baseline') => {
    setMethod(newMethod);
  };

  const handleToggleFreeze = () => {
    const newFrozen = !frozen;
    setFrozen(newFrozen);

    if (oneRMData) {
      const calculatedLoad = calculateLoad(oneRMData.estimated_1rm, percentage);
      onUpdate({
        use_1rm_auto_load: true,
        target_1rm_percentage: percentage,
        reference_1rm_method: method,
        calculated_load: calculatedLoad,
        freeze_1rm_reference: newFrozen,
        frozen_1rm_value: newFrozen ? oneRMData.estimated_1rm : undefined,
        frozen_1rm_unit: newFrozen ? oneRMData.unit : undefined,
      });
    }
  };

  const getMethodLabel = (m: string): string => {
    if (m === 'latest') return language === 'es' ? 'Más reciente' : 'Latest';
    if (m === 'epley') return 'Epley';
    if (m === 'rir') return 'RIR';
    if (m === 'velocity') return language === 'es' ? 'Velocidad' : 'Velocity';
    if (m === 'baseline') return language === 'es' ? 'Referencia' : 'Baseline';
    return m;
  };

  if (!athleteId) {
    return null;
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 dark:border-gray-700 pt-3 mt-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-[#514163] dark:text-[#fdda36]" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white dark:text-white">
            {language === 'es' ? 'Carga automática basada en 1RM' : 'Auto load based on 1RM'}
          </span>
        </div>
        <button
          onClick={() => handleToggleAutoLoad(!isExpanded)}
          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
            isExpanded
              ? 'bg-[#514163] text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 dark:text-gray-300'
          }`}
        >
          {isExpanded ? (language === 'es' ? 'Activado' : 'Enabled') : (language === 'es' ? 'Manual' : 'Manual')}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-900 dark:bg-gray-900/50 rounded-lg">
          {loading ? (
            <div className="text-center py-4">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-gray-400" />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {language === 'es' ? 'Cargando 1RM...' : 'Loading 1RM...'}
              </p>
            </div>
          ) : oneRMData ? (
            <>
              <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-xs">
                  <p className="font-semibold text-blue-900 dark:text-blue-300">
                    {language === 'es' ? 'Referencia de 1RM:' : '1RM reference:'}
                  </p>
                  <p className="text-blue-800 dark:text-blue-400">
                    <strong>{oneRMData.estimated_1rm.toFixed(1)} {oneRMData.unit}</strong>
                    <span className="ml-2 text-[10px]">
                      ({getMethodLabel(oneRMData.estimation_method)})
                    </span>
                  </p>
                  <p className="text-[10px] text-blue-700 dark:text-blue-500">
                    {language === 'es' ? 'Última actualización:' : 'Last updated:'}{' '}
                    {new Date(oneRMData.calculated_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={handleToggleFreeze}
                  className={`p-1.5 rounded transition-colors ${
                    frozen
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 dark:text-gray-400'
                  }`}
                  title={
                    frozen
                      ? (language === 'es' ? 'Desbloquear valor de 1RM' : 'Unlock 1RM value')
                      : (language === 'es' ? 'Congelar valor de 1RM para este bloque' : 'Freeze 1RM value for this block')
                  }
                >
                  {frozen ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                  {language === 'es' ? 'Fuente de carga' : 'Load source'}
                </label>
                <select
                  value={method}
                  onChange={(e) => handleMethodChange(e.target.value as any)}
                  disabled={frozen}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white disabled:opacity-50"
                >
                  <option value="latest">{language === 'es' ? 'Más reciente (cualquier método)' : 'Latest (any method)'}</option>
                  <option value="baseline">{language === 'es' ? 'Referencia marcada' : 'Baseline reference'}</option>
                  <option value="epley">Epley</option>
                  <option value="rir">RIR</option>
                  <option value="velocity">{language === 'es' ? 'Velocidad' : 'Velocity'}</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300">
                    {language === 'es' ? 'Intensidad (%1RM)' : 'Intensity (%1RM)'}
                  </label>
                  <span className="text-sm font-bold text-[#514163] dark:text-[#fdda36]">
                    {percentage}%
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={percentage}
                  onChange={(e) => handlePercentageChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-1">
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="p-3 bg-gradient-to-r from-[#514163] to-[#6d5581] rounded-lg">
                <p className="text-xs text-white/80 mb-1">
                  {language === 'es' ? 'Carga calculada' : 'Calculated load'}
                </p>
                <p className="text-2xl font-bold text-white">
                  {calculateLoad(oneRMData.estimated_1rm, percentage).toFixed(1)}{' '}
                  <span className="text-sm">{oneRMData.unit}</span>
                </p>
                <p className="text-[10px] text-white/60 mt-1">
                  {percentage}% {language === 'es' ? 'de' : 'of'} {oneRMData.estimated_1rm.toFixed(1)} {oneRMData.unit}
                </p>
              </div>

              {frozen && (
                <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-[10px] text-yellow-800 dark:text-yellow-300">
                  <Lock className="w-3 h-3 flex-shrink-0" />
                  <p>
                    {language === 'es'
                      ? 'Valor de 1RM congelado para este bloque de entrenamiento'
                      : '1RM value frozen for this training block'}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded">
              <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-orange-800 dark:text-orange-300">
                <p className="font-semibold mb-1">
                  {language === 'es' ? 'No hay datos de 1RM' : 'No 1RM data available'}
                </p>
                <p>
                  {language === 'es'
                    ? 'Use el Estimador de Fuerza para calcular el 1RM de este ejercicio.'
                    : 'Use the Strength Estimator to calculate 1RM for this exercise.'}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={loadOneRM}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {language === 'es' ? 'Recalcular cargas' : 'Recalculate loads'}
          </button>
        </div>
      )}
    </div>
  );
}
