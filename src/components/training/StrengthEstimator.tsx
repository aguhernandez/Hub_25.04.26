import { useState, useEffect, useRef } from 'react';
import { X, Calculator, TrendingUp, Save, BarChart3, Check, Zap, Target, Activity, Search, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { getExerciseName } from '../../utils/exerciseI18n';

interface StrengthEstimatorProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseId?: string;
  exerciseName?: string;
  athleteId?: string;
  onApplyToSession?: (percentages: { [key: number]: number }) => void;
}

interface LoadPercentage {
  percentage: number;
  label_en: string;
  label_es: string;
  color: string;
}

interface HistoryPoint {
  date: string;
  oneRM: number;
  method: string;
  is_baseline: boolean;
}

type EstimationMethod = 'epley' | 'rir' | 'velocity';

const LOAD_PERCENTAGES: LoadPercentage[] = [
  { percentage: 50, label_en: 'Technique / Warm-up', label_es: 'Técnica / Calentamiento', color: 'from-green-400 to-green-500' },
  { percentage: 60, label_en: 'Base endurance', label_es: 'Resistencia base', color: 'from-yellow-400 to-yellow-500' },
  { percentage: 70, label_en: 'Strength development', label_es: 'Desarrollo de fuerza', color: 'from-orange-400 to-orange-500' },
  { percentage: 80, label_en: 'Heavy load', label_es: 'Carga pesada', color: 'from-red-400 to-red-500' },
  { percentage: 90, label_en: 'Very heavy', label_es: 'Muy pesado', color: 'from-purple-400 to-purple-500' },
  { percentage: 100, label_en: 'Maximum', label_es: 'Máximo', color: 'from-gray-700 to-gray-900' },
];

const RIR_PERCENTAGES: { [key: number]: number } = {
  0: 100, // Failure
  1: 96,
  2: 92,
  3: 88,
  4: 84,
  5: 80,
};

const VELOCITY_RANGES: { min: number; max: number; percentage: number }[] = [
  { min: 0.16, max: 0.20, percentage: 100 },
  { min: 0.30, max: 0.35, percentage: 90 },
  { min: 0.45, max: 0.50, percentage: 80 },
  { min: 0.65, max: 0.70, percentage: 70 },
  { min: 0.80, max: 0.85, percentage: 60 },
  { min: 0.95, max: 1.00, percentage: 50 },
];

export default function StrengthEstimator({
  isOpen,
  onClose,
  exerciseId,
  exerciseName: initialExerciseName,
  athleteId,
  onApplyToSession,
}: StrengthEstimatorProps) {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const [method, setMethod] = useState<EstimationMethod>('epley');
  const [weight, setWeight] = useState<number>(0);
  const [reps, setReps] = useState<number>(1);
  const [epleyRir, setEpleyRir] = useState<number>(0);
  const [rir, setRir] = useState<number>(0);
  const [velocity, setVelocity] = useState<number>(0);
  const [unit, setUnit] = useState<'kg' | 'lb'>('kg');
  const [oneRM, setOneRM] = useState<number>(0);
  const [showSaved, setShowSaved] = useState(false);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>(initialExerciseName || '');
  const [exercises, setExercises] = useState<{ id: string; name: string }[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState<string>('');
  const [showExerciseDropdown, setShowExerciseDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const targetAthleteId = athleteId || profile?.id;

  useEffect(() => {
    if (isOpen) {
      loadExercises();
      if (selectedExerciseName && targetAthleteId) {
        loadHistory();
      }
    }
  }, [isOpen, selectedExerciseName, targetAthleteId]);

  useEffect(() => {
    if (initialExerciseName) setSelectedExerciseName(initialExerciseName);
  }, [initialExerciseName]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowExerciseDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (weight > 0) {
      let calculated = 0;

      if (method === 'epley' && reps > 0) {
        calculated = calculateEpley(weight, reps + epleyRir);
      } else if (method === 'rir') {
        calculated = calculateRIR(weight, rir);
      } else if (method === 'velocity' && velocity > 0) {
        calculated = calculateVelocity(weight, velocity);
      }

      setOneRM(calculated);
    } else {
      setOneRM(0);
    }
  }, [weight, reps, epleyRir, rir, velocity, method]);

  const loadExercises = async () => {
    const { data } = await supabase
      .from('exercises')
      .select('id, exercise, exercise_en, exercise_es')
      .order('exercise_en');

    if (data) {
      setExercises(data.map((e) => ({ id: e.id, name: getExerciseName(e, language) })));
    }
  };

  const loadHistory = async () => {
    if (!selectedExerciseName || !targetAthleteId) return;

    const { data } = await supabase
      .from('strength_estimates')
      .select('estimated_1rm, calculated_at, estimation_method, is_baseline')
      .eq('athlete_id', targetAthleteId)
      .eq('exercise_name', selectedExerciseName)
      .order('calculated_at', { ascending: true });

    if (data) {
      setHistory(
        data.map((item) => ({
          date: new Date(item.calculated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          oneRM: item.estimated_1rm,
          method: item.estimation_method || 'epley',
          is_baseline: item.is_baseline,
        }))
      );
    }
  };

  const calculateEpley = (w: number, r: number): number => {
    if (r === 1) return w;
    return w * (1 + 0.0333 * r);
  };

  const calculateRIR = (w: number, rirValue: number): number => {
    const percentage = RIR_PERCENTAGES[rirValue];
    if (!percentage) return 0;
    return (w / percentage) * 100;
  };

  const calculateVelocity = (w: number, vel: number): number => {
    const range = VELOCITY_RANGES.find(r => vel >= r.min && vel <= r.max);
    if (!range) {
      const closest = VELOCITY_RANGES.reduce((prev, curr) => {
        const prevDist = Math.min(Math.abs(vel - prev.min), Math.abs(vel - prev.max));
        const currDist = Math.min(Math.abs(vel - curr.min), Math.abs(vel - curr.max));
        return currDist < prevDist ? curr : prev;
      });
      return (w / closest.percentage) * 100;
    }
    return (w / range.percentage) * 100;
  };

  const calculateLoad = (percentage: number): number => {
    return (oneRM * percentage) / 100;
  };

  const filteredExercises = exercises.filter(ex =>
    ex.name.toLowerCase().includes(exerciseSearch.toLowerCase())
  ).slice(0, 50);

  const getMethodLabel = (m: EstimationMethod): string => {
    if (m === 'epley') return language === 'es' ? 'Epley' : 'Epley';
    if (m === 'rir') return 'RIR';
    return language === 'es' ? 'Velocidad' : 'Velocity';
  };

  const getMethodColor = (m: string): string => {
    if (m === 'epley') return 'bg-blue-500';
    if (m === 'rir') return 'bg-purple-500';
    return 'bg-green-500';
  };

  const handleSave = async (isBaseline: boolean = false) => {
    if (!selectedExerciseName || !targetAthleteId || oneRM === 0) return;

    const insertData: any = {
      athlete_id: targetAthleteId,
      trainer_id: profile?.role === 'trainer' ? profile.id : null,
      exercise_name: selectedExerciseName,
      weight_lifted: weight,
      estimated_1rm: oneRM,
      unit: unit,
      is_baseline: isBaseline,
      estimation_method: method,
      formula_used: method === 'epley' ? `${weight} × (1 + 0.0333 × ${reps})` :
                     method === 'rir' ? `${weight} / ${RIR_PERCENTAGES[rir]}%` :
                     `${weight} / ${VELOCITY_RANGES.find(r => velocity >= r.min && velocity <= r.max)?.percentage || '?'}%`,
    };

    if (method === 'epley') {
      insertData.reps_performed = reps;
    } else if (method === 'rir') {
      insertData.rir = rir;
    } else if (method === 'velocity') {
      insertData.mean_velocity = velocity;
    }

    const { error } = await supabase.from('strength_estimates').insert(insertData);

    if (!error) {
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 3000);
      loadHistory();
    }
  };

  const handleApply = () => {
    if (onApplyToSession && oneRM > 0) {
      const percentages: { [key: number]: number } = {};
      LOAD_PERCENTAGES.forEach((load) => {
        percentages[load.percentage] = calculateLoad(load.percentage);
      });
      onApplyToSession(percentages);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full my-8">
        <div className="sticky top-0 bg-white dark:bg-gray-800 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700 p-6 rounded-t-2xl z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Calculator className="w-7 h-7 text-[#514163] dark:text-[#fdda36]" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">
                  {language === 'es' ? 'Estimador de 1RM' : '1RM Estimator'}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
                  {language === 'es' ? 'Métodos: Epley / RIR / Velocidad' : 'Methods: Epley / RIR / Velocity'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setMethod('epley')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                method === 'epley'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-800 dark:bg-gray-700 text-gray-700 dark:text-gray-300 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Activity className="w-5 h-5" />
              <div className="text-left">
                <div className="text-sm font-bold">Epley</div>
                <div className="text-xs opacity-80">{language === 'es' ? 'Por reps' : 'By reps'}</div>
              </div>
            </button>

            <button
              onClick={() => setMethod('rir')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                method === 'rir'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-800 dark:bg-gray-700 text-gray-700 dark:text-gray-300 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Target className="w-5 h-5" />
              <div className="text-left">
                <div className="text-sm font-bold">RIR</div>
                <div className="text-xs opacity-80">{language === 'es' ? 'En reserva' : 'In reserve'}</div>
              </div>
            </button>

            <button
              onClick={() => setMethod('velocity')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                method === 'velocity'
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-800 dark:bg-gray-700 text-gray-700 dark:text-gray-300 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Zap className="w-5 h-5" />
              <div className="text-left">
                <div className="text-sm font-bold">{language === 'es' ? 'Velocidad' : 'Velocity'}</div>
                <div className="text-xs opacity-80">m/s</div>
              </div>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {!exerciseId && (
            <div ref={dropdownRef} className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {language === 'es' ? 'Ejercicio' : 'Exercise'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={selectedExerciseName || exerciseSearch}
                  onChange={(e) => {
                    setExerciseSearch(e.target.value);
                    setSelectedExerciseName('');
                    setShowExerciseDropdown(true);
                  }}
                  onFocus={() => setShowExerciseDropdown(true)}
                  placeholder={language === 'es' ? 'Buscar ejercicio...' : 'Search exercise...'}
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#514163] focus:border-transparent"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                </div>
              </div>

              {showExerciseDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {filteredExercises.length > 0 ? (
                    <>
                      {filteredExercises.map((ex) => (
                        <button
                          key={ex.id}
                          type="button"
                          onClick={() => {
                            setSelectedExerciseName(ex.name);
                            setExerciseSearch('');
                            setShowExerciseDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                        >
                          {ex.name}
                        </button>
                      ))}
                      {exercises.length > 50 && filteredExercises.length === 50 && (
                        <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 text-center border-t border-gray-200 dark:border-gray-700">
                          {language === 'es' ? 'Mostrando primeros 50 resultados. Refina tu búsqueda.' : 'Showing first 50 results. Refine your search.'}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      {language === 'es' ? 'No se encontraron ejercicios' : 'No exercises found'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className={`p-4 rounded-lg border-2 ${
            method === 'epley' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' :
            method === 'rir' ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800' :
            'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          }`}>
            <h3 className={`font-semibold mb-2 ${
              method === 'epley' ? 'text-blue-900 dark:text-blue-300' :
              method === 'rir' ? 'text-purple-900 dark:text-purple-300' :
              'text-green-900 dark:text-green-300'
            }`}>
              {method === 'epley' && (language === 'es' ? '📘 Fórmula de Epley' : '📘 Epley Formula')}
              {method === 'rir' && (language === 'es' ? '🎯 Método RIR' : '🎯 RIR Method')}
              {method === 'velocity' && (language === 'es' ? '⚡ Velocidad (Badillo & Sánchez-Medina)' : '⚡ Velocity (Badillo & Sánchez-Medina)')}
            </h3>
            <p className={`text-sm ${
              method === 'epley' ? 'text-blue-800 dark:text-blue-400' :
              method === 'rir' ? 'text-purple-800 dark:text-purple-400' :
              'text-green-800 dark:text-green-400'
            }`}>
              {method === 'epley' && (language === 'es'
                ? 'Basado en peso y repeticiones completadas'
                : 'Based on weight and reps completed')}
              {method === 'rir' && (language === 'es'
                ? 'Basado en repeticiones en reserva antes del fallo'
                : 'Based on reps in reserve before failure')}
              {method === 'velocity' && (language === 'es'
                ? 'Basado en velocidad media de la barra'
                : 'Based on mean bar velocity')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {language === 'es' ? 'Peso levantado' : 'Load lifted'}
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={weight || ''}
                onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-center text-lg font-semibold"
                placeholder="0"
              />
            </div>

            {method === 'epley' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'es' ? 'Repeticiones' : 'Repetitions'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={reps || ''}
                    onChange={(e) => setReps(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-center text-lg font-semibold"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    RIR
                  </label>
                  <select
                    value={epleyRir}
                    onChange={(e) => setEpleyRir(parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-center text-lg font-semibold"
                  >
                    <option value={0}>0</option>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                    <option value={5}>5</option>
                  </select>
                </div>
              </>
            )}

            {method === 'rir' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  RIR (0-5)
                </label>
                <select
                  value={rir}
                  onChange={(e) => setRir(parseInt(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-center text-lg font-semibold"
                >
                  <option value={0}>0 - {language === 'es' ? 'Fallo' : 'Failure'}</option>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                  <option value={5}>5</option>
                </select>
              </div>
            )}

            {method === 'velocity' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Velocidad (m/s)' : 'Velocity (m/s)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="2"
                  value={velocity || ''}
                  onChange={(e) => setVelocity(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-center text-lg font-semibold"
                  placeholder="0.00"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {language === 'es' ? 'Unidad' : 'Unit'}
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setUnit('kg')}
                  className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                    unit === 'kg'
                      ? 'bg-[#514163] text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  kg
                </button>
                <button
                  onClick={() => setUnit('lb')}
                  className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                    unit === 'lb'
                      ? 'bg-[#514163] text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  lb
                </button>
              </div>
            </div>
          </div>

          {method === 'rir' && (
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800 space-y-3">
              <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
                <span className="text-amber-500 text-sm mt-0.5">!</span>
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-snug">
                  {language === 'es'
                    ? 'Solo es preciso en series menores a 6 repeticiones'
                    : 'Only accurate in sets of fewer than 6 repetitions'}
                </p>
              </div>
              <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-300">
                {language === 'es' ? 'Tabla RIR' : 'RIR Table'}
              </h4>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                {Object.entries(RIR_PERCENTAGES).map(([rirVal, pct]) => (
                  <div key={rirVal} className="bg-white dark:bg-gray-800 rounded p-2 text-center">
                    <div className="font-bold text-purple-600 dark:text-purple-400">RIR {rirVal}</div>
                    <div className="text-gray-600 dark:text-gray-400">{pct}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {method === 'velocity' && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <h4 className="text-sm font-semibold text-green-900 dark:text-green-300 mb-2">
                {language === 'es' ? '📊 Rangos de Velocidad' : '📊 Velocity Ranges'}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                {VELOCITY_RANGES.map((range, idx) => (
                  <div key={idx} className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded p-2 text-center">
                    <div className="font-bold text-green-600 dark:text-green-400">{range.min}-{range.max} m/s</div>
                    <div className="text-gray-600 dark:text-gray-400 dark:text-gray-400">{range.percentage}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {oneRM > 0 && (
            <>
              <div className={`rounded-xl p-6 border-2 ${
                method === 'epley' ? 'bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-800 border-blue-200 dark:border-blue-800' :
                method === 'rir' ? 'bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-gray-800 border-purple-200 dark:border-purple-800' :
                'bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-gray-800 border-green-200 dark:border-green-800'
              }`}>
                <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-2">
                  {language === 'es' ? `1RM estimado (${getMethodLabel(method)})` : `Estimated 1RM (${getMethodLabel(method)})`}
                </p>
                <p className="text-5xl font-bold text-[#514163] dark:text-[#fdda36]">
                  {oneRM.toFixed(1)} <span className="text-2xl">{unit}</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-2">
                  {method === 'epley' && (epleyRir > 0
                    ? `${weight} × (1 + 0.0333 × (${reps} + ${epleyRir})) = ${oneRM.toFixed(1)}`
                    : `${weight} × (1 + 0.0333 × ${reps}) = ${oneRM.toFixed(1)}`)}
                  {method === 'rir' && `${weight} ÷ ${RIR_PERCENTAGES[rir]}% = ${oneRM.toFixed(1)}`}
                  {method === 'velocity' && `${weight} ÷ ${VELOCITY_RANGES.find(r => velocity >= r.min && velocity <= r.max)?.percentage || '?'}% ≈ ${oneRM.toFixed(1)}`}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 dark:border-gray-700 overflow-hidden">
                <div className="p-4 bg-gray-50 dark:bg-gray-900 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white dark:text-white">
                    {language === 'es' ? 'Cargas de entrenamiento por %' : 'Training loads by %'}
                  </h3>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {LOAD_PERCENTAGES.map((load) => {
                    const calculatedLoad = calculateLoad(load.percentage);
                    return (
                      <div key={load.percentage} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 dark:hover:bg-gray-700/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">{load.percentage}%</span>
                            <span className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
                              {language === 'es' ? load.label_es : load.label_en}
                            </span>
                          </div>
                          <span className="text-xl font-bold text-[#514163] dark:text-[#fdda36]">
                            {calculatedLoad.toFixed(1)} {unit}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full bg-gradient-to-r ${load.color} transition-all`}
                            style={{ width: `${load.percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {history.length > 0 && (
                <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white dark:text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      {language === 'es' ? 'Progreso' : 'Progress'}
                    </h3>
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className="text-sm text-[#514163] dark:text-[#fdda36] hover:underline"
                    >
                      {showHistory ? (language === 'es' ? 'Ocultar' : 'Hide') : (language === 'es' ? 'Ver' : 'Show')}
                    </button>
                  </div>

                  {showHistory && (
                    <div className="h-48 flex items-end justify-between gap-2">
                      {history.slice(-10).map((point, idx) => {
                        const maxRM = Math.max(...history.map((h) => h.oneRM));
                        const height = (point.oneRM / maxRM) * 100;
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                            <div className="relative w-full group">
                              <div
                                className={`w-full rounded-t-lg transition-all ${
                                  point.is_baseline ? 'bg-gradient-to-t from-yellow-400 to-yellow-500' :
                                  `${getMethodColor(point.method)} bg-gradient-to-t`
                                }`}
                                style={{ height: `${height}%`, minHeight: '12px' }}
                              />
                              <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                {point.oneRM.toFixed(1)} {unit}<br/>
                                <span className="text-[10px]">{getMethodLabel(point.method as EstimationMethod)}</span>
                              </div>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">{point.date}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-800 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 dark:border-gray-700 p-6 rounded-b-2xl">
          {showSaved && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-green-800 dark:text-green-300">
              <Check className="w-5 h-5" />
              <span className="font-medium">
                {language === 'es' ? 'Datos guardados correctamente' : 'Data saved successfully'}
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleSave(false)}
              disabled={oneRM === 0 || !selectedExerciseName}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {language === 'es' ? 'Guardar' : 'Save'}
            </button>

            <button
              onClick={() => handleSave(true)}
              disabled={oneRM === 0 || !selectedExerciseName}
              className="flex items-center gap-2 px-4 py-2.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <BarChart3 className="w-5 h-5" />
              {language === 'es' ? 'Usar como referencia' : 'Use as reference'}
            </button>

            {onApplyToSession && (
              <button
                onClick={handleApply}
                disabled={oneRM === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#514163] text-white rounded-lg hover:bg-[#6d5581] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-5 h-5" />
                {language === 'es' ? 'Aplicar a la sesión' : 'Apply to session'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
