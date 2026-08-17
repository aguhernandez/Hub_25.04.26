import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, TrendingUp, TrendingDown, Dumbbell, Calendar, Minus, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';

interface ExerciseStatsPanelProps {
  exerciseId: string;
  exerciseName: string;
  athleteId?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface SessionLog {
  date: string;
  weight: number;
  sets: number;
  reps: number;
  volume: number;
}

interface ExerciseOption {
  id: string;
  name: string;
}

export default function ExerciseStatsPanel({
  exerciseId,
  exerciseName,
  athleteId,
  isOpen,
  onClose,
}: ExerciseStatsPanelProps) {
  const { language } = useLanguage();
  const t = (es: string, en: string) => (language === 'es' ? es : en);

  const [currentExerciseId, setCurrentExerciseId] = useState(exerciseId);
  const [currentExerciseName, setCurrentExerciseName] = useState(exerciseName);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ExerciseOption[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [relatedExercise, setRelatedExercise] = useState<{ name: string; maxWeight: number; date: string } | null>(null);

  const fetchExerciseHistory = useCallback(async (exId: string, exName: string, athId?: string) => {
    if (!athId) {
      setSessions([]);
      setRelatedExercise(null);
      return;
    }

    setLoading(true);
    try {
      const { data: logs } = await supabase
        .from('training_logs')
        .select(`
          weight_used,
          reps_completed,
          set_number,
          logged_at,
          workout_exercise_id,
          workout_exercises!inner (
            exercise_id,
            custom_exercise_name,
            exercises (
              id,
              exercise
            )
          )
        `)
        .eq('athlete_id', athId)
        .not('weight_used', 'is', null)
        .order('logged_at', { ascending: false })
        .limit(1000);

      if (!logs) {
        setSessions([]);
        setRelatedExercise(null);
        return;
      }

      const matchLogs = logs.filter((log: any) => {
        const we = log.workout_exercises;
        if (!we) return false;
        const logExId = we.exercise_id || we.exercises?.id;
        const logExName = we.exercises?.exercise || we.custom_exercise_name || '';
        return logExId === exId || logExName === exName;
      });

      const sessionMap = new Map<string, SessionLog>();
      matchLogs.forEach((log: any) => {
        const dateKey = new Date(log.logged_at).toLocaleDateString('en-CA');
        const weight = parseFloat(log.weight_used) || 0;
        const reps = log.reps_completed || 0;
        const existing = sessionMap.get(dateKey);
        if (existing) {
          existing.sets += 1;
          existing.volume += weight * reps;
          if (weight > existing.weight) existing.weight = weight;
          existing.reps += reps;
        } else {
          sessionMap.set(dateKey, {
            date: dateKey,
            weight,
            sets: 1,
            reps,
            volume: weight * reps,
          });
        }
      });

      const sessionList = Array.from(sessionMap.values()).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setSessions(sessionList);

      if (sessionList.length === 0) {
        const baseName = exName.replace(/^(tempo|pause|paused|slow|controlled|banded|deficit)\s+/i, '').trim();
        if (baseName && baseName.toLowerCase() !== exName.toLowerCase()) {
          const relatedLogs = logs.filter((log: any) => {
            const we = log.workout_exercises;
            if (!we) return false;
            const logExName = (we.exercises?.exercise || we.custom_exercise_name || '').toLowerCase();
            return logExName === baseName.toLowerCase();
          });

          if (relatedLogs.length > 0) {
            let maxW = 0;
            let maxDate = '';
            relatedLogs.forEach((log: any) => {
              const w = parseFloat(log.weight_used) || 0;
              if (w > maxW) {
                maxW = w;
                maxDate = new Date(log.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              }
            });
            if (maxW > 0) {
              setRelatedExercise({ name: baseName, maxWeight: maxW, date: maxDate });
            } else {
              setRelatedExercise(null);
            }
          } else {
            setRelatedExercise(null);
          }
        } else {
          setRelatedExercise(null);
        }
      } else {
        setRelatedExercise(null);
      }
    } catch {
      setSessions([]);
      setRelatedExercise(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCurrentExerciseId(exerciseId);
      setCurrentExerciseName(exerciseName);
      setSearchTerm('');
      setShowSearchDropdown(false);
      fetchExerciseHistory(exerciseId, exerciseName, athleteId);
    }
  }, [isOpen, exerciseId, exerciseName, athleteId, fetchExerciseHistory]);

  useEffect(() => {
    if (!searchTerm.trim() || searchTerm.trim().length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('exercises')
        .select('id, exercise, exercise_en, exercise_es')
        .or(`exercise.ilike.%${searchTerm}%,exercise_en.ilike.%${searchTerm}%,exercise_es.ilike.%${searchTerm}%`)
        .limit(15);

      if (data) {
        const results = data.map((e: any) => ({
          id: e.id,
          name: language === 'es' ? (e.exercise_es || e.exercise) : (e.exercise_en || e.exercise),
        }));
        setSearchResults(results);
        setShowSearchDropdown(true);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm, language]);

  const selectExercise = (ex: ExerciseOption) => {
    setCurrentExerciseId(ex.id);
    setCurrentExerciseName(ex.name);
    setSearchTerm('');
    setShowSearchDropdown(false);
    fetchExerciseHistory(ex.id, ex.name, athleteId);
  };

  const comparatives = useMemo(() => {
    if (sessions.length === 0) return null;

    const sorted = [...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const best = sorted.reduce((max, s) => (s.weight > max.weight ? s : max), sorted[0]);
    const last = sessions[0];
    const first = sorted[0];

    const improvement = first.weight > 0
      ? ((last.weight - first.weight) / first.weight) * 100
      : 0;

    const totalVolume = sorted.reduce((sum, s) => sum + s.volume, 0);
    const avgWeight = sorted.reduce((sum, s) => sum + s.weight, 0) / sorted.length;

    return { best, last, first, improvement, totalVolume, avgWeight, sessionCount: sorted.length };
  }, [sessions]);

  const chartData = useMemo(() => {
    if (sessions.length === 0) return null;
    const sorted = [...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const weights = sorted.map(s => s.weight);
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);
    const range = maxW - minW || 1;

    return sorted.map((s, i) => ({
      ...s,
      index: i,
      heightPercent: ((s.weight - minW) / range) * 100,
      isMax: s.weight === maxW,
    }));
  }, [sessions]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/40 z-[100] transition-opacity"
        onClick={onClose}
      />
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white dark:bg-gray-900 shadow-2xl z-[101] flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <Dumbbell className="w-5 h-5 text-[#fdda36] flex-shrink-0" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                {currentExerciseName}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
              aria-label={t('Cerrar', 'Close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => searchTerm.trim().length >= 2 && setShowSearchDropdown(true)}
                placeholder={t('Buscar otro ejercicio...', 'Search another exercise...')}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36] focus:border-transparent"
              />
            </div>
            {showSearchDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto z-10">
                {searchResults.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => selectExercise(ex)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
                  >
                    {ex.name}
                  </button>
                ))}
              </div>
            )}
            {showSearchDropdown && searchResults.length === 0 && searchTerm.trim().length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 text-sm text-gray-500 dark:text-gray-400 z-10">
                {t('No se encontraron ejercicios', 'No exercises found')}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {!athleteId && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{t('Selecciona un atleta para ver estadísticas', 'Select an athlete to view stats')}</p>
            </div>
          )}

          {athleteId && loading && (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
              ))}
            </div>
          )}

          {athleteId && !loading && sessions.length === 0 && !relatedExercise && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium mb-1">{t('Sin datos aún', 'No data yet')}</p>
              <p className="text-xs">{t('Busca o compara manualmente con otros ejercicios', 'Search or compare manually with other exercises')}</p>
            </div>
          )}

          {/* Related Exercise Reference */}
          {athleteId && !loading && relatedExercise && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <ArrowRight className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
                    {t('Ejercicio relacionado', 'Related exercise')}
                  </h3>
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    {t(
                      `Basado en datos de "${relatedExercise.name}": referencia estimada`,
                      `Based on "${relatedExercise.name}" data: estimated reference`
                    )}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
                      {relatedExercise.maxWeight} kg
                    </span>
                    <span className="text-xs text-blue-600 dark:text-blue-400">
                      ({relatedExercise.date})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Progress Chart */}
          {athleteId && !loading && chartData && chartData.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#fdda36]" />
                {t('Progreso de peso', 'Weight progress')}
              </h3>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <div className="flex items-end justify-between gap-1 h-40">
                  {chartData.map((point) => (
                    <div
                      key={point.index}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative"
                    >
                      <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 dark:bg-gray-700 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10 pointer-events-none">
                        {point.weight}kg
                      </div>
                      <div
                        className={`w-full max-w-[32px] rounded-t transition-all ${
                          point.isMax
                            ? 'bg-[#fdda36]'
                            : 'bg-blue-400 dark:bg-blue-500'
                        } hover:opacity-80`}
                        style={{ height: `${Math.max(point.heightPercent, 4)}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>{formatDate(chartData[0].date)}</span>
                  <span>{formatDate(chartData[chartData.length - 1].date)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Comparatives */}
          {athleteId && !loading && comparatives && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#fdda36]" />
                {t('Comparativas', 'Comparatives')}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <p className="text-xs text-green-700 dark:text-green-400 mb-1">{t('Mejor sesión', 'Best session')}</p>
                  <p className="text-xl font-bold text-green-900 dark:text-green-200">{comparatives.best.weight} kg</p>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-1">{formatDate(comparatives.best.date)}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-xs text-blue-700 dark:text-blue-400 mb-1">{t('Última sesión', 'Last session')}</p>
                  <p className="text-xl font-bold text-blue-900 dark:text-blue-200">{comparatives.last.weight} kg</p>
                  <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">{formatDate(comparatives.last.date)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{t('Promedio', 'Average')}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{comparatives.avgWeight.toFixed(1)} kg</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{t('Volumen total', 'Total volume')}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{Math.round(comparatives.totalVolume).toLocaleString()} kg</p>
                </div>
              </div>
              {comparatives.sessionCount >= 2 && (
                <div className={`mt-3 flex items-center gap-2 p-3 rounded-lg ${
                  comparatives.improvement > 0
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                    : comparatives.improvement < 0
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}>
                  {comparatives.improvement > 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : comparatives.improvement < 0 ? (
                    <TrendingDown className="w-4 h-4" />
                  ) : (
                    <Minus className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">
                    {comparatives.improvement > 0
                      ? t(`Mejora del ${comparatives.improvement.toFixed(1)}%`, `${comparatives.improvement.toFixed(1)}% improvement`)
                      : comparatives.improvement < 0
                      ? t(`Descenso del ${Math.abs(comparatives.improvement).toFixed(1)}%`, `${Math.abs(comparatives.improvement).toFixed(1)}% decrease`)
                      : t('Sin cambios', 'No change')}
                  </span>
                  <span className="text-xs opacity-70">
                    ({comparatives.sessionCount} {t('sesiones', 'sessions')})
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Historical Log */}
          {athleteId && !loading && sessions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-[#fdda36]" />
                {t('Historial de sesiones', 'Session history')}
              </h3>
              <div className="space-y-2">
                {sessions.map((session, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#fdda36]/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-[#514163]">
                          {session.sets}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {session.weight} kg
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(session.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {session.sets} × {session.reps} {t('reps', 'reps')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {Math.round(session.volume).toLocaleString()} kg {t('vol', 'vol')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
