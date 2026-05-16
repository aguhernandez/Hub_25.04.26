import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { supabase } from '../../../lib/supabase';
import {
  X, Moon, Battery, Zap, Brain, Droplets, Heart,
  AlertTriangle, CheckCircle, ChevronRight, ChevronLeft
} from 'lucide-react';
import WellnessTagsSection from '../../tags/WellnessTagsSection';

interface WellnessData {
  sleep_duration: string;
  sleep_quality_10: number;
  fatigue_level_10: number;
  lower_body_soreness: number;
  upper_body_soreness: number;
  back_soreness: number;
  stress_level_10: number;
  motivation_10: number;
  prs: number;
  illness_symptoms: string[];
  illness_other_text: string;
  urine_color: number;
  hrv: number | null;
  rhr: number | null;
  general_notes: string;
}

interface WellnessCheckinModalProps {
  onClose: () => void;
  onComplete: (score: number) => void;
  athleteId?: string;
}

const SLEEP_OPTIONS = [
  { value: '<5h', label: '< 5h' },
  { value: '5-6h', label: '5–6h' },
  { value: '6-7h', label: '6–7h' },
  { value: '7-8h', label: '7–8h' },
  { value: '>8h', label: '> 8h' },
];

const ILLNESS_SYMPTOMS = [
  { key: 'sore_throat', es: 'Dolor de garganta', en: 'Sore throat' },
  { key: 'cough', es: 'Tos', en: 'Cough' },
  { key: 'headache', es: 'Dolor de cabeza', en: 'Headache' },
  { key: 'fever', es: 'Fiebre', en: 'Fever' },
  { key: 'digestive', es: 'Problemas digestivos', en: 'Digestive issues' },
];

const URINE_COLORS = [
  { value: 1, hex: '#FFFDE7', label: 'Pale straw', labelEs: 'Muy claro', status: 'excellent' },
  { value: 2, hex: '#FFF9C4', label: 'Straw', labelEs: 'Claro', status: 'excellent' },
  { value: 3, hex: '#FFF176', label: 'Pale yellow', labelEs: 'Amarillo pálido', status: 'good' },
  { value: 4, hex: '#FFEE58', label: 'Yellow', labelEs: 'Amarillo', status: 'good' },
  { value: 5, hex: '#FBC02D', label: 'Dark yellow', labelEs: 'Amarillo oscuro', status: 'caution' },
  { value: 6, hex: '#F57F17', label: 'Amber', labelEs: 'Ámbar', status: 'warning' },
  { value: 7, hex: '#BF360C', label: 'Orange', labelEs: 'Naranja', status: 'danger' },
  { value: 8, hex: '#4E342E', label: 'Brown', labelEs: 'Marrón', status: 'danger' },
];

const TOTAL_STEPS = 6;

function computeWellnessScore(d: WellnessData): number {
  const sleepDurationScore = {
    '<5h': 2, '5-6h': 5, '6-7h': 7, '7-8h': 10, '>8h': 9
  }[d.sleep_duration] ?? 5;

  const avgSoreness = (d.lower_body_soreness + d.upper_body_soreness + d.back_soreness) / 3;
  const illnessPenalty = d.illness_symptoms.length * 5;
  const urinePenalty = d.urine_color > 4 ? (d.urine_color - 4) * 3 : 0;

  const positives =
    d.sleep_quality_10 * 0.18 +
    d.motivation_10 * 0.15 +
    d.prs * 0.20 +
    sleepDurationScore * 0.12;

  // fatigue_level_10 is now 10=no fatigue, 1=exhausted — invert for penalty calculation
  const negatives =
    (11 - d.fatigue_level_10) * 0.14 +
    d.stress_level_10 * 0.10 +
    avgSoreness * 0.11;

  const raw = (positives / (0.18 + 0.15 + 0.20 + 0.12)) * 10
            - (negatives / (0.14 + 0.10 + 0.11)) * 10;

  const normalized = Math.max(0, Math.min(100, (raw + 10) * 5 - illnessPenalty - urinePenalty));
  return Math.round(normalized * 10) / 10;
}

function getScoreColor(score: number) {
  if (score >= 70) return { bg: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-400', label: { es: 'Buena recuperación', en: 'Good recovery' } };
  if (score >= 45) return { bg: 'bg-amber-400', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-400', label: { es: 'Recuperación moderada', en: 'Moderate recovery' } };
  return { bg: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', ring: 'ring-rose-400', label: { es: 'Baja recuperación', en: 'Low recovery' } };
}

function SliderField({
  label, value, onChange, min = 1, max = 10, lowLabel, highLabel, inverted = false
}: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; lowLabel?: string; highLabel?: string; inverted?: boolean;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const dotColor = inverted
    ? pct < 40 ? 'bg-emerald-500' : pct < 70 ? 'bg-amber-400' : 'bg-rose-500'
    : pct < 40 ? 'bg-rose-500' : pct < 70 ? 'bg-amber-400' : 'bg-emerald-500';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className={`text-lg font-bold ${inverted
          ? value <= 4 ? 'text-emerald-600 dark:text-emerald-400' : value <= 7 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
          : value >= 7 ? 'text-emerald-600 dark:text-emerald-400' : value >= 4 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
        }`}>{value}</span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700"
          style={{
            background: `linear-gradient(to right, ${dotColor.includes('emerald') ? '#10b981' : dotColor.includes('amber') ? '#f59e0b' : '#f43f5e'} 0%, ${dotColor.includes('emerald') ? '#10b981' : dotColor.includes('amber') ? '#f59e0b' : '#f43f5e'} ${pct}%, #e5e7eb ${pct}%, #e5e7eb 100%)`
          }}
        />
      </div>
      {(lowLabel || highLabel) && (
        <div className="flex justify-between text-xs text-gray-400">
          <span>{lowLabel}</span>
          <span>{highLabel}</span>
        </div>
      )}
    </div>
  );
}

export default function WellnessCheckinModal({ onClose, onComplete, athleteId }: WellnessCheckinModalProps) {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [existingData, setExistingData] = useState<any>(null);
  const [checkinId, setCheckinId] = useState<string | null>(null);

  const targetId = athleteId || profile?.id;

  const [data, setData] = useState<WellnessData>({
    sleep_duration: '7-8h',
    sleep_quality_10: 7,
    fatigue_level_10: 3,
    lower_body_soreness: 2,
    upper_body_soreness: 2,
    back_soreness: 2,
    stress_level_10: 3,
    motivation_10: 7,
    prs: 7,
    illness_symptoms: [],
    illness_other_text: '',
    urine_color: 3,
    hrv: null,
    rhr: null,
    general_notes: '',
  });

  const t = (es: string, en: string) => language === 'es' ? es : en;

  useEffect(() => {
    checkExisting();
  }, [targetId]);

  const checkExisting = async () => {
    if (!targetId) return;
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('wellness_checkins')
      .select('*')
      .eq('athlete_id', targetId)
      .eq('checkin_date', today)
      .maybeSingle();

    if (existing) {
      setAlreadyDone(true);
      setExistingData(existing);
      setCheckinId(existing.id);
      if (existing.sleep_duration) setData(prev => ({ ...prev, sleep_duration: existing.sleep_duration }));
      if (existing.sleep_quality_10) setData(prev => ({ ...prev, sleep_quality_10: existing.sleep_quality_10 }));
      if (existing.fatigue_level_10) setData(prev => ({ ...prev, fatigue_level_10: existing.fatigue_level_10 }));
      if (existing.lower_body_soreness) setData(prev => ({ ...prev, lower_body_soreness: existing.lower_body_soreness }));
      if (existing.upper_body_soreness) setData(prev => ({ ...prev, upper_body_soreness: existing.upper_body_soreness }));
      if (existing.back_soreness) setData(prev => ({ ...prev, back_soreness: existing.back_soreness }));
      if (existing.stress_level_10) setData(prev => ({ ...prev, stress_level_10: existing.stress_level_10 }));
      if (existing.motivation_10) setData(prev => ({ ...prev, motivation_10: existing.motivation_10 }));
      if (existing.prs != null) setData(prev => ({ ...prev, prs: existing.prs }));
      if (existing.illness_symptoms) setData(prev => ({ ...prev, illness_symptoms: existing.illness_symptoms || [] }));
      if (existing.illness_other_text) setData(prev => ({ ...prev, illness_other_text: existing.illness_other_text || '' }));
      if (existing.urine_color) setData(prev => ({ ...prev, urine_color: existing.urine_color }));
      if (existing.hrv) setData(prev => ({ ...prev, hrv: existing.hrv }));
      if (existing.rhr) setData(prev => ({ ...prev, rhr: existing.rhr }));
      if (existing.general_notes) setData(prev => ({ ...prev, general_notes: existing.general_notes }));
    }
  };

  const toggleSymptom = (key: string) => {
    setData(prev => ({
      ...prev,
      illness_symptoms: prev.illness_symptoms.includes(key)
        ? prev.illness_symptoms.filter(s => s !== key)
        : [...prev.illness_symptoms, key]
    }));
  };

  const handleSubmit = async () => {
    if (!targetId) return;
    setLoading(true);

    const score = computeWellnessScore(data);
    const today = new Date().toISOString().split('T')[0];

    try {
      const { data: upserted, error } = await supabase
        .from('wellness_checkins')
        .upsert({
          athlete_id: targetId,
          checkin_date: today,
          sleep_duration: data.sleep_duration,
          sleep_quality: Math.round(data.sleep_quality_10 / 2),
          sleep_quality_10: data.sleep_quality_10,
          fatigue_level: Math.round(data.fatigue_level_10 / 2),
          fatigue_level_10: data.fatigue_level_10,
          muscle_soreness: Math.round((data.lower_body_soreness + data.upper_body_soreness + data.back_soreness) / 6),
          lower_body_soreness: data.lower_body_soreness,
          upper_body_soreness: data.upper_body_soreness,
          back_soreness: data.back_soreness,
          stress_level: Math.round(data.stress_level_10 / 2),
          stress_level_10: data.stress_level_10,
          motivation: Math.round(data.motivation_10 / 2),
          motivation_10: data.motivation_10,
          prs: data.prs,
          illness_symptoms: data.illness_symptoms,
          illness_other_text: data.illness_other_text || null,
          urine_color: data.urine_color,
          hrv: data.hrv,
          rhr: data.rhr,
          general_notes: data.general_notes || null,
          wellness_score_100: score,
          ready_to_train: data.prs >= 5 && data.fatigue_level_10 >= 5,
        }, { onConflict: 'athlete_id,checkin_date' })
        .select('id')
        .single();

      if (error) throw error;
      if (upserted?.id) setCheckinId(upserted.id);

      onComplete(score);
    } catch (err) {
      console.error('Error saving wellness:', err);
    } finally {
      setLoading(false);
    }
  };

  const score = computeWellnessScore(data);
  const scoreColor = getScoreColor(score);

  const steps = [
    {
      title: t('Sueño', 'Sleep'),
      icon: <Moon className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('Duración del sueño', 'Sleep duration')}
            </p>
            <div className="grid grid-cols-5 gap-2">
              {SLEEP_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setData(d => ({ ...d, sleep_duration: opt.value }))}
                  className={`py-3 rounded-xl text-sm font-semibold transition-all ${
                    data.sleep_duration === opt.value
                      ? 'bg-[#514163] text-white shadow-md scale-105'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <SliderField
            label={t('Calidad del sueño', 'Sleep quality')}
            value={data.sleep_quality_10}
            onChange={v => setData(d => ({ ...d, sleep_quality_10: v }))}
            lowLabel={t('Muy mala', 'Very poor')}
            highLabel={t('Excelente', 'Excellent')}
          />
        </div>
      )
    },
    {
      title: t('Fatiga & Energía', 'Fatigue & Energy'),
      icon: <Battery className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <SliderField
            label={t('Fatiga general', 'General fatigue')}
            value={data.fatigue_level_10}
            onChange={v => setData(d => ({ ...d, fatigue_level_10: v }))}
            lowLabel={t('Agotado', 'Exhausted')}
            highLabel={t('Sin fatiga', 'No fatigue')}
          />
          <SliderField
            label={t('Motivación para entrenar', 'Motivation to train')}
            value={data.motivation_10}
            onChange={v => setData(d => ({ ...d, motivation_10: v }))}
            lowLabel={t('Sin ganas', 'No motivation')}
            highLabel={t('Muy motivado', 'Very motivated')}
          />
          <SliderField
            label={t('Estado de Recuperación Percibida (PRS)', 'Perceived Recovery Status (PRS)')}
            value={data.prs}
            onChange={v => setData(d => ({ ...d, prs: v }))}
            min={0}
            lowLabel={t('Sin recuperar', 'Not recovered')}
            highLabel={t('Totalmente recuperado', 'Fully recovered')}
          />
        </div>
      )
    },
    {
      title: t('Dolor Muscular', 'Muscle Soreness'),
      icon: <Zap className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
            {t('Agujetas / DOMS — 1 = sin dolor, 10 = dolor severo', 'DOMS — 1 = no pain, 10 = severe pain')}
          </p>
          <SliderField
            label={t('Tren inferior (piernas, glúteos)', 'Lower body (legs, glutes)')}
            value={data.lower_body_soreness}
            onChange={v => setData(d => ({ ...d, lower_body_soreness: v }))}
            inverted
            lowLabel="1" highLabel="10"
          />
          <SliderField
            label={t('Tren superior (pecho, brazos, hombros)', 'Upper body (chest, arms, shoulders)')}
            value={data.upper_body_soreness}
            onChange={v => setData(d => ({ ...d, upper_body_soreness: v }))}
            inverted
            lowLabel="1" highLabel="10"
          />
          <SliderField
            label={t('Espalda y core', 'Back & core')}
            value={data.back_soreness}
            onChange={v => setData(d => ({ ...d, back_soreness: v }))}
            inverted
            lowLabel="1" highLabel="10"
          />
        </div>
      )
    },
    {
      title: t('Estrés & SNC', 'Stress & CNS'),
      icon: <Brain className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <SliderField
            label={t('Estrés mental', 'Mental stress')}
            value={data.stress_level_10}
            onChange={v => setData(d => ({ ...d, stress_level_10: v }))}
            inverted
            lowLabel={t('Sin estrés', 'No stress')}
            highLabel={t('Muy estresado', 'Very stressed')}
          />
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              {t('Síntomas de enfermedad', 'Illness symptoms')}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {ILLNESS_SYMPTOMS.map(s => (
                <button
                  key={s.key}
                  onClick={() => toggleSymptom(s.key)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all text-left ${
                    data.illness_symptoms.includes(s.key)
                      ? 'border-rose-400 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    data.illness_symptoms.includes(s.key)
                      ? 'border-rose-500 bg-rose-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {data.illness_symptoms.includes(s.key) && (
                      <CheckCircle className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <span className="text-sm">{language === 'es' ? s.es : s.en}</span>
                </button>
              ))}
            </div>
            {/* Other symptom */}
            <div className="mt-2">
              <label className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-text">
                <div className="w-4 h-4 rounded border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center flex-shrink-0">
                  {data.illness_other_text.trim() && (
                    <CheckCircle className="w-3 h-3 text-rose-500" />
                  )}
                </div>
                <input
                  type="text"
                  value={data.illness_other_text}
                  onChange={e => setData(d => ({ ...d, illness_other_text: e.target.value }))}
                  placeholder={t('Otro (describir brevemente)', 'Other (briefly describe)')}
                  className="flex-1 text-sm bg-transparent text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 outline-none"
                  maxLength={120}
                />
              </label>
            </div>
            {(data.illness_symptoms.length > 0 || data.illness_other_text.trim()) && (
              <p className="mt-2 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {data.illness_symptoms.length + (data.illness_other_text.trim() ? 1 : 0)} {t('síntoma(s) registrado(s)', 'symptom(s) reported')}
              </p>
            )}
          </div>
        </div>
      )
    },
    {
      title: t('Hidratación', 'Hydration'),
      icon: <Droplets className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('Escala de color de orina de Armstrong — selecciona el color más parecido al tuyo esta mañana',
               'Armstrong urine color scale — select the closest color to yours this morning')}
          </p>
          <div className="grid grid-cols-4 gap-2">
            {URINE_COLORS.map(c => (
              <button
                key={c.value}
                onClick={() => setData(d => ({ ...d, urine_color: c.value }))}
                className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                  data.urine_color === c.value
                    ? 'border-[#514163] scale-105 shadow-lg'
                    : 'border-transparent hover:border-gray-300'
                }`}
              >
                <div className="h-12 w-full" style={{ backgroundColor: c.hex }} />
                <div className="bg-white dark:bg-gray-800 py-1 px-1 text-center">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{c.value}</span>
                </div>
                {data.urine_color === c.value && (
                  <div className="absolute top-1 right-1 w-4 h-4 bg-[#514163] rounded-full flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-emerald-600">
              <span className="w-3 h-3 rounded-full bg-yellow-100 border border-gray-200 inline-block" />
              {t('Bien hidratado (1–3)', 'Well hydrated (1–3)')}
            </span>
            <span className="flex items-center gap-1 text-amber-600">
              <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
              {t('Beber más (4–5)', 'Drink more (4–5)')}
            </span>
            <span className="flex items-center gap-1 text-rose-600">
              <span className="w-3 h-3 rounded-full bg-red-800 inline-block" />
              {t('Deshidratado (6–8)', 'Dehydrated (6–8)')}
            </span>
          </div>
          {data.urine_color >= 6 && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-200 dark:border-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <p className="text-xs text-rose-700 dark:text-rose-300">
                {t('Nivel de deshidratación elevado. Bebe agua antes de entrenar.',
                   'High dehydration level. Drink water before training.')}
              </p>
            </div>
          )}
        </div>
      )
    },
    {
      title: t('Sistema Nervioso & Notas', 'Nervous System & Notes'),
      icon: <Heart className="w-5 h-5" />,
      content: (
        <div className="space-y-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('Opcional — introduce tus datos de VFC y FCR si los tienes disponibles.',
               'Optional — enter your HRV and RHR data if available.')}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t('VFC — Variabilidad FC (ms)', 'HRV — Heart Rate Variability (ms)')}
              </label>
              <input
                type="number"
                min={0}
                max={200}
                value={data.hrv ?? ''}
                onChange={e => setData(d => ({ ...d, hrv: e.target.value ? Number(e.target.value) : null }))}
                placeholder="ej. 65"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#514163]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t('FCR — FC en Reposo (lpm)', 'RHR — Resting Heart Rate (bpm)')}
              </label>
              <input
                type="number"
                min={30}
                max={120}
                value={data.rhr ?? ''}
                onChange={e => setData(d => ({ ...d, rhr: e.target.value ? Number(e.target.value) : null }))}
                placeholder="ej. 48"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#514163]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t('Notas adicionales (opcional)', 'Additional notes (optional)')}
            </label>
            <textarea
              value={data.general_notes}
              onChange={e => setData(d => ({ ...d, general_notes: e.target.value }))}
              rows={3}
              placeholder={t('¿Algo que quieras registrar hoy?', 'Anything you want to note today?')}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#514163] resize-none"
            />
          </div>
          {checkinId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t('Etiquetas del día', 'Day Tags')}
              </label>
              <WellnessTagsSection
                checkinId={checkinId}
                currentUserId={profile?.id}
                isTrainerOrAdmin={profile?.role === 'trainer' || profile?.role === 'admin'}
                language={language}
              />
            </div>
          )}
          <div className={`p-4 rounded-xl border-2 ${scoreColor.ring} bg-white dark:bg-gray-800`}>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {t('Puntuación de bienestar calculada', 'Calculated wellness score')}
            </p>
            <div className="flex items-center justify-between">
              <span className={`text-3xl font-bold ${scoreColor.text}`}>{score.toFixed(0)}/100</span>
              <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                score >= 70 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                : score >= 45 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
              }`}>
                {language === 'es' ? scoreColor.label.es : scoreColor.label.en}
              </span>
            </div>
          </div>
        </div>
      )
    }
  ];

  const currentStep = steps[step];
  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#514163] to-[#3d3251] px-5 pt-5 pb-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 rounded-lg">
                {currentStep.icon}
              </div>
              <div>
                <h2 className="text-white font-bold text-lg leading-tight">
                  {t('Control de Bienestar', 'Wellness Check-in')}
                </h2>
                <p className="text-white/70 text-xs">
                  {alreadyDone ? t('Editando registro de hoy', 'Editing today\'s entry') : t('Registro de hoy', 'Today\'s entry')}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-white/70">
              <span>{currentStep.title}</span>
              <span>{step + 1}/{TOTAL_STEPS}</span>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#fdda36] rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-0.5 rounded-full transition-all ${
                    i <= step ? 'bg-[#fdda36]' : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-[#514163] dark:text-[#fdda36]">{currentStep.icon}</span>
              {currentStep.title}
            </h3>
          </div>
          {currentStep.content}
        </div>

        {/* Footer nav */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3 flex-shrink-0 bg-white dark:bg-gray-900">
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('Atrás', 'Back')}
          </button>

          {step < TOTAL_STEPS - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#514163] text-white text-sm font-semibold hover:bg-[#3d3251] transition-colors"
            >
              {t('Siguiente', 'Next')}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#fdda36] text-[#514163] text-sm font-bold hover:bg-[#f0ca00] transition-colors disabled:opacity-60"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-[#514163] border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {t('Guardar registro', 'Save check-in')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
