import { useState, useEffect } from 'react';
import { X, Moon, Zap, Brain, Dumbbell, Droplets, Heart, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface WellnessCheckinProps {
  onClose: () => void;
  onComplete?: (score: number) => void;
  athleteId?: string;
}

interface CheckinData {
  sleep_quality: number;
  sleep_hours: number;
  stress_level: number;
  fatigue_level: number;
  muscle_soreness: number;
  motivation: number;
  hydration: 'low' | 'normal' | 'high';
  nutrition_quality: number;
  injury_notes: string;
  general_notes: string;
  ready_to_train: boolean;
}

const defaultCheckin: CheckinData = {
  sleep_quality: 3,
  sleep_hours: 7,
  stress_level: 3,
  fatigue_level: 3,
  muscle_soreness: 3,
  motivation: 3,
  hydration: 'normal',
  nutrition_quality: 3,
  injury_notes: '',
  general_notes: '',
  ready_to_train: true,
};

interface RatingProps {
  value: number;
  onChange: (v: number) => void;
  low: string;
  high: string;
  colorType?: 'positive' | 'negative';
}

function RatingScale({ value, onChange, low, high, colorType = 'positive' }: RatingProps) {
  const getColor = (n: number) => {
    if (colorType === 'negative') {
      if (n <= 2) return value >= n ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400';
      if (n === 3) return value >= n ? 'bg-yellow-500 border-yellow-500 text-white' : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400';
      return value >= n ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400';
    }
    if (n <= 2) return value >= n ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400';
    if (n === 3) return value >= n ? 'bg-yellow-500 border-yellow-500 text-white' : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400';
    return value >= n ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400';
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 dark:text-gray-400 w-16 text-right">{low}</span>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`w-9 h-9 rounded-lg border-2 font-bold text-sm transition-all ${getColor(n)}`}
          >
            {n}
          </button>
        ))}
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400 w-16">{high}</span>
    </div>
  );
}

export default function WellnessCheckin({ onClose, onComplete, athleteId }: WellnessCheckinProps) {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [data, setData] = useState<CheckinData>(defaultCheckin);
  const [loading, setLoading] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [existingScore, setExistingScore] = useState<number | null>(null);

  const targetId = athleteId || profile?.id;
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    checkExistingCheckin();
  }, [targetId]);

  const checkExistingCheckin = async () => {
    if (!targetId) return;
    const { data: existing } = await supabase
      .from('wellness_checkins')
      .select('*')
      .eq('athlete_id', targetId)
      .eq('checkin_date', today)
      .maybeSingle();

    if (existing) {
      setAlreadyDone(true);
      setExistingScore(existing.overall_score);
      setData({
        sleep_quality: existing.sleep_quality || 3,
        sleep_hours: existing.sleep_hours || 7,
        stress_level: existing.stress_level || 3,
        fatigue_level: existing.fatigue_level || 3,
        muscle_soreness: existing.muscle_soreness || 3,
        motivation: existing.motivation || 3,
        hydration: existing.hydration || 'normal',
        nutrition_quality: existing.nutrition_quality || 3,
        injury_notes: existing.injury_notes || '',
        general_notes: existing.general_notes || '',
        ready_to_train: existing.ready_to_train ?? true,
      });
    }
  };

  const computeLocalScore = () => {
    const positive = (data.sleep_quality + data.motivation + data.nutrition_quality + (data.hydration === 'high' ? 5 : data.hydration === 'normal' ? 3 : 1)) / 4;
    const negative = (data.stress_level + data.fatigue_level + data.muscle_soreness) / 3;
    return Math.round(((positive + (6 - negative)) / 2) * 20) / 20;
  };

  const estimatedScore = computeLocalScore();

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'text-green-600 dark:text-green-400';
    if (score >= 3) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreLabel = (score: number) => {
    if (language === 'es') {
      if (score >= 4.5) return 'Excelente — listo para entrenar fuerte';
      if (score >= 4) return 'Muy bueno — buen día para entrenar';
      if (score >= 3) return 'Regular — entrenamiento moderado';
      if (score >= 2) return 'Bajo — considera reducir la carga';
      return 'Muy bajo — descanso recomendado';
    }
    if (score >= 4.5) return 'Excellent — ready for hard training';
    if (score >= 4) return 'Very good — great training day';
    if (score >= 3) return 'Fair — moderate training';
    if (score >= 2) return 'Low — consider reducing load';
    return 'Very low — rest recommended';
  };

  const handleSave = async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      const payload = {
        athlete_id: targetId,
        checkin_date: today,
        sleep_quality: data.sleep_quality,
        sleep_hours: data.sleep_hours,
        stress_level: data.stress_level,
        fatigue_level: data.fatigue_level,
        muscle_soreness: data.muscle_soreness,
        motivation: data.motivation,
        hydration: data.hydration,
        nutrition_quality: data.nutrition_quality,
        injury_notes: data.injury_notes || null,
        general_notes: data.general_notes || null,
        ready_to_train: data.ready_to_train,
      };

      const { error } = await supabase
        .from('wellness_checkins')
        .upsert(payload, { onConflict: 'athlete_id,checkin_date' });

      if (error) throw error;

      onComplete?.(estimatedScore);
      onClose();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const set = (key: keyof CheckinData, value: any) => setData((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {language === 'es' ? 'Cuestionario de Bienestar' : 'Wellness Check-in'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {language === 'es' ? `Hoy, ${new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}` : `Today, ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {alreadyDone && (
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <p className="text-xs text-green-700 dark:text-green-300">
                {language === 'es' ? `Ya completaste el cuestionario hoy (puntaje: ${existingScore?.toFixed(1)}/5). Puedes editarlo.` : `You already completed today's check-in (score: ${existingScore?.toFixed(1)}/5). You can edit it.`}
              </p>
            </div>
          )}

          {/* Sleep */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {language === 'es' ? 'Sueño' : 'Sleep'}
              </h3>
            </div>
            <div className="pl-6 space-y-3">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  {language === 'es' ? 'Calidad del sueño' : 'Sleep quality'}
                </p>
                <RatingScale value={data.sleep_quality} onChange={(v) => set('sleep_quality', v)} low={language === 'es' ? 'Mala' : 'Poor'} high={language === 'es' ? 'Excelente' : 'Excellent'} />
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {language === 'es' ? 'Horas dormidas' : 'Hours slept'}
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={3}
                    max={12}
                    step={0.5}
                    value={data.sleep_hours}
                    onChange={(e) => set('sleep_hours', parseFloat(e.target.value))}
                    className="flex-1 accent-[#fdda36]"
                  />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white w-12 text-right">{data.sleep_hours}h</span>
                </div>
              </div>
            </div>
          </div>

          {/* Energy / Fatigue */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {language === 'es' ? 'Energía y Fatiga' : 'Energy & Fatigue'}
              </h3>
            </div>
            <div className="pl-6 space-y-3">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  {language === 'es' ? 'Nivel de fatiga' : 'Fatigue level'}
                </p>
                <RatingScale value={data.fatigue_level} onChange={(v) => set('fatigue_level', v)} low={language === 'es' ? 'Sin fatiga' : 'No fatigue'} high={language === 'es' ? 'Agotado' : 'Exhausted'} colorType="negative" />
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  {language === 'es' ? 'Dolor muscular' : 'Muscle soreness'}
                </p>
                <RatingScale value={data.muscle_soreness} onChange={(v) => set('muscle_soreness', v)} low={language === 'es' ? 'Sin dolor' : 'No soreness'} high={language === 'es' ? 'Muy dolorido' : 'Very sore'} colorType="negative" />
              </div>
            </div>
          </div>

          {/* Mental */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-green-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {language === 'es' ? 'Estado Mental' : 'Mental State'}
              </h3>
            </div>
            <div className="pl-6 space-y-3">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  {language === 'es' ? 'Nivel de estrés' : 'Stress level'}
                </p>
                <RatingScale value={data.stress_level} onChange={(v) => set('stress_level', v)} low={language === 'es' ? 'Relajado' : 'Relaxed'} high={language === 'es' ? 'Muy estresado' : 'Very stressed'} colorType="negative" />
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  {language === 'es' ? 'Motivación' : 'Motivation'}
                </p>
                <RatingScale value={data.motivation} onChange={(v) => set('motivation', v)} low={language === 'es' ? 'Baja' : 'Low'} high={language === 'es' ? 'Alta' : 'High'} />
              </div>
            </div>
          </div>

          {/* Nutrition & Hydration */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-cyan-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {language === 'es' ? 'Nutrición e Hidratación' : 'Nutrition & Hydration'}
              </h3>
            </div>
            <div className="pl-6 space-y-3">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  {language === 'es' ? 'Calidad nutricional (ayer)' : 'Nutrition quality (yesterday)'}
                </p>
                <RatingScale value={data.nutrition_quality} onChange={(v) => set('nutrition_quality', v)} low={language === 'es' ? 'Mala' : 'Poor'} high={language === 'es' ? 'Excelente' : 'Excellent'} />
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  {language === 'es' ? 'Hidratación' : 'Hydration'}
                </p>
                <div className="flex gap-2">
                  {(['low', 'normal', 'high'] as const).map((h) => (
                    <button
                      key={h}
                      onClick={() => set('hydration', h)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                        data.hydration === h
                          ? h === 'low' ? 'bg-red-500 border-red-500 text-white' : h === 'normal' ? 'bg-yellow-500 border-yellow-500 text-white' : 'bg-cyan-500 border-cyan-500 text-white'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      {h === 'low' ? (language === 'es' ? 'Baja' : 'Low') : h === 'normal' ? (language === 'es' ? 'Normal' : 'Normal') : (language === 'es' ? 'Alta' : 'High')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Ready to train */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {language === 'es' ? '¿Listo para entrenar?' : 'Ready to train?'}
              </span>
            </div>
            <button
              onClick={() => set('ready_to_train', !data.ready_to_train)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${data.ready_to_train ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${data.ready_to_train ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Injury notes */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {language === 'es' ? 'Lesiones o molestias (opcional)' : 'Injuries or discomfort (optional)'}
            </label>
            <textarea
              value={data.injury_notes}
              onChange={(e) => set('injury_notes', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#fdda36] resize-none"
              placeholder={language === 'es' ? 'Ej: dolor en rodilla izquierda' : 'E.g.: left knee pain'}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {language === 'es' ? 'Notas adicionales (opcional)' : 'Additional notes (optional)'}
            </label>
            <textarea
              value={data.general_notes}
              onChange={(e) => set('general_notes', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#fdda36] resize-none"
              placeholder={language === 'es' ? 'Cualquier comentario...' : 'Any comments...'}
            />
          </div>
        </div>

        {/* Footer with score + save */}
        <div className="p-5 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {language === 'es' ? 'Puntaje estimado de preparación' : 'Estimated readiness score'}
              </p>
              <p className={`text-2xl font-bold ${getScoreColor(estimatedScore)}`}>
                {estimatedScore.toFixed(1)}<span className="text-sm text-gray-400">/5</span>
              </p>
            </div>
            <div className="text-right max-w-[55%]">
              {!data.ready_to_train && (
                <div className="flex items-center gap-1 justify-end mb-1">
                  <AlertCircle className="w-3 h-3 text-orange-500" />
                  <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                    {language === 'es' ? 'Marcado como no listo' : 'Marked as not ready'}
                  </span>
                </div>
              )}
              <p className={`text-xs font-medium ${getScoreColor(estimatedScore)}`}>
                {getScoreLabel(estimatedScore)}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 py-2.5 bg-[#fdda36] text-[#514163] rounded-xl font-bold hover:bg-[#ffd51a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Heart className="w-4 h-4" />
              {loading ? (language === 'es' ? 'Guardando...' : 'Saving...') : (language === 'es' ? 'Guardar check-in' : 'Save check-in')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
