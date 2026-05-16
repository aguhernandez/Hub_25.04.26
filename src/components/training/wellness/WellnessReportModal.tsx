import { useLanguage } from '../../../contexts/LanguageContext';
import { X, Moon, Battery, Zap, Brain, Droplets, Heart, AlertTriangle, CheckCircle, Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import WellnessTagsSection from '../../tags/WellnessTagsSection';

interface WellnessEntry {
  id: string;
  checkin_date: string;
  sleep_duration?: string;
  sleep_quality_10?: number;
  sleep_quality?: number;
  fatigue_level_10?: number;
  fatigue_level?: number;
  lower_body_soreness?: number;
  upper_body_soreness?: number;
  back_soreness?: number;
  muscle_soreness?: number;
  stress_level_10?: number;
  stress_level?: number;
  motivation_10?: number;
  motivation?: number;
  prs?: number;
  illness_symptoms?: string[];
  urine_color?: number;
  hrv?: number;
  rhr?: number;
  general_notes?: string;
  wellness_score_100?: number;
  overall_score?: number;
  ready_to_train?: boolean;
}

interface WellnessReportModalProps {
  entry: WellnessEntry;
  athleteName?: string;
  onClose: () => void;
  onEdit?: () => void;
  currentUserId?: string;
  isTrainerOrAdmin?: boolean;
}

const ILLNESS_LABELS: Record<string, { es: string; en: string }> = {
  sore_throat: { es: 'Dolor de garganta', en: 'Sore throat' },
  cough: { es: 'Tos', en: 'Cough' },
  headache: { es: 'Dolor de cabeza', en: 'Headache' },
  fever: { es: 'Fiebre', en: 'Fever' },
  digestive: { es: 'Problemas digestivos', en: 'Digestive issues' },
};

const URINE_COLORS = [
  { value: 1, hex: '#FFFDE7', status: 'excellent', es: 'Muy claro', en: 'Pale straw' },
  { value: 2, hex: '#FFF9C4', status: 'excellent', es: 'Claro', en: 'Straw' },
  { value: 3, hex: '#FFF176', status: 'good', es: 'Amarillo pálido', en: 'Pale yellow' },
  { value: 4, hex: '#FFEE58', status: 'good', es: 'Amarillo', en: 'Yellow' },
  { value: 5, hex: '#FBC02D', status: 'caution', es: 'Amarillo oscuro', en: 'Dark yellow' },
  { value: 6, hex: '#F57F17', status: 'warning', es: 'Ámbar', en: 'Amber' },
  { value: 7, hex: '#BF360C', status: 'danger', es: 'Naranja', en: 'Orange' },
  { value: 8, hex: '#4E342E', status: 'danger', es: 'Marrón', en: 'Brown' },
];

function ScoreRing({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const pct = Math.min(100, Math.max(0, score));
  const r = size === 'lg' ? 40 : size === 'md' ? 30 : 22;
  const strokeW = size === 'lg' ? 6 : 4;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  const color = score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#f43f5e';
  const textSize = size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-base' : 'text-xs';
  const dim = (r + strokeW + 2) * 2;

  return (
    <div className="relative flex items-center justify-center" style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} className="-rotate-90">
        <circle cx={dim / 2} cy={dim / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={strokeW} className="dark:stroke-gray-700" />
        <circle
          cx={dim / 2} cy={dim / 2} r={r} fill="none"
          stroke={color} strokeWidth={strokeW}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`${textSize} font-bold`} style={{ color }}>{Math.round(pct)}</span>
      </div>
    </div>
  );
}

function MetricBar({ value, max = 10, inverted = false, label }: { value: number; max?: number; inverted?: boolean; label: string }) {
  const pct = (value / max) * 100;
  const good = inverted ? pct <= 40 : pct >= 60;
  const bad = inverted ? pct >= 70 : pct <= 30;
  const color = good ? 'bg-emerald-500' : bad ? 'bg-rose-500' : 'bg-amber-400';

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 dark:text-gray-400 w-28 flex-shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-semibold w-8 text-right ${
        good ? 'text-emerald-600 dark:text-emerald-400' : bad ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
      }`}>{value}/{max}</span>
    </div>
  );
}

export default function WellnessReportModal({ entry, athleteName, onClose, onEdit, currentUserId, isTrainerOrAdmin = false }: WellnessReportModalProps) {
  const { language } = useLanguage();
  const t = (es: string, en: string) => language === 'es' ? es : en;

  const score = entry.wellness_score_100 ?? (entry.overall_score ? entry.overall_score * 20 : 50);
  const sleepQ = entry.sleep_quality_10 ?? (entry.sleep_quality ? entry.sleep_quality * 2 : null);
  const fatigue = entry.fatigue_level_10 ?? (entry.fatigue_level ? entry.fatigue_level * 2 : null);
  const stress = entry.stress_level_10 ?? (entry.stress_level ? entry.stress_level * 2 : null);
  const motivation = entry.motivation_10 ?? (entry.motivation ? entry.motivation * 2 : null);
  const avgSoreness = entry.lower_body_soreness && entry.upper_body_soreness && entry.back_soreness
    ? Math.round((entry.lower_body_soreness + entry.upper_body_soreness + entry.back_soreness) / 3)
    : entry.muscle_soreness ? entry.muscle_soreness * 2 : null;

  const symptoms = entry.illness_symptoms ?? [];
  const urineInfo = URINE_COLORS.find(c => c.value === entry.urine_color);
  const dateLabel = new Date(entry.checkin_date + 'T12:00:00').toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  const scoreColor = score >= 70 ? 'text-emerald-600 dark:text-emerald-400'
    : score >= 45 ? 'text-amber-600 dark:text-amber-400'
    : 'text-rose-600 dark:text-rose-400';

  const scoreBg = score >= 70 ? 'from-emerald-500/10 to-emerald-500/5'
    : score >= 45 ? 'from-amber-500/10 to-amber-500/5'
    : 'from-rose-500/10 to-rose-500/5';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className={`bg-gradient-to-br ${scoreBg} border-b border-gray-100 dark:border-gray-800 px-5 pt-5 pb-4 flex-shrink-0`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-4">
              <ScoreRing score={score} size="lg" />
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white text-lg capitalize">{dateLabel}</h2>
                {athleteName && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{athleteName}</p>
                )}
                <div className={`inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  score >= 70 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                  : score >= 45 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                  : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
                }`}>
                  {score >= 70 ? <CheckCircle className="w-3 h-3" /> : score >= 45 ? <Minus className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  {score >= 70 ? t('Buena recuperación', 'Good recovery') : score >= 45 ? t('Recuperación moderada', 'Moderate recovery') : t('Baja recuperación', 'Low recovery')}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Alerts */}
          {(symptoms.length > 0 || (entry.urine_color && entry.urine_color >= 6)) && (
            <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-200 dark:border-rose-800 space-y-1.5">
              <p className="text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {t('Alertas', 'Alerts')}
              </p>
              {symptoms.length > 0 && (
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  {t('Síntomas:', 'Symptoms:')} {symptoms.map(s => language === 'es' ? ILLNESS_LABELS[s]?.es : ILLNESS_LABELS[s]?.en).join(', ')}
                </p>
              )}
              {entry.urine_color && entry.urine_color >= 6 && (
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  {t('Deshidratación detectada (color orina:', 'Dehydration detected (urine color:')} {entry.urine_color}/8)
                </p>
              )}
            </div>
          )}

          {/* Sleep */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Moon className="w-4 h-4 text-[#514163] dark:text-[#fdda36]" />
              {t('Sueño', 'Sleep')}
            </h3>
            <div className="flex items-center gap-4">
              {entry.sleep_duration && (
                <div className="flex-1 text-center bg-white dark:bg-gray-700 rounded-lg py-2 px-3">
                  <p className="text-lg font-bold text-[#514163] dark:text-[#fdda36]">{entry.sleep_duration}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('Duración', 'Duration')}</p>
                </div>
              )}
              {sleepQ !== null && (
                <div className="flex-1">
                  <MetricBar value={sleepQ} max={10} label={t('Calidad', 'Quality')} />
                </div>
              )}
            </div>
          </div>

          {/* Fatigue & Recovery */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Battery className="w-4 h-4 text-[#514163] dark:text-[#fdda36]" />
              {t('Fatiga & Recuperación', 'Fatigue & Recovery')}
            </h3>
            <div className="space-y-2">
              {fatigue !== null && <MetricBar value={fatigue} max={10} label={t('Fatiga', 'Fatigue')} />}
              {motivation !== null && <MetricBar value={motivation} max={10} label={t('Motivación', 'Motivation')} />}
              {entry.prs !== null && entry.prs !== undefined && <MetricBar value={entry.prs} max={10} label="PRS" />}
            </div>
          </div>

          {/* DOMS */}
          {(entry.lower_body_soreness || entry.upper_body_soreness || entry.back_soreness || avgSoreness) && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#514163] dark:text-[#fdda36]" />
                {t('Dolor Muscular (DOMS)', 'Muscle Soreness (DOMS)')}
              </h3>
              <div className="space-y-2">
                {entry.lower_body_soreness && <MetricBar value={entry.lower_body_soreness} max={10} inverted label={t('Tren inferior', 'Lower body')} />}
                {entry.upper_body_soreness && <MetricBar value={entry.upper_body_soreness} max={10} inverted label={t('Tren superior', 'Upper body')} />}
                {entry.back_soreness && <MetricBar value={entry.back_soreness} max={10} inverted label={t('Espalda', 'Back')} />}
                {!entry.lower_body_soreness && avgSoreness && <MetricBar value={avgSoreness} max={10} inverted label={t('Promedio', 'Average')} />}
              </div>
            </div>
          )}

          {/* CNS / Stress */}
          {stress !== null && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Brain className="w-4 h-4 text-[#514163] dark:text-[#fdda36]" />
                {t('Estrés mental', 'Mental stress')}
              </h3>
              <MetricBar value={stress} max={10} inverted label={t('Nivel de estrés', 'Stress level')} />
            </div>
          )}

          {/* Hydration */}
          {entry.urine_color && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
                <Droplets className="w-4 h-4 text-[#514163] dark:text-[#fdda36]" />
                {t('Hidratación', 'Hydration')}
              </h3>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full border-2 border-gray-200 dark:border-gray-600 flex-shrink-0"
                  style={{ backgroundColor: urineInfo?.hex ?? '#fff' }}
                />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {t('Color', 'Color')} {entry.urine_color}/8 — {language === 'es' ? urineInfo?.es : urineInfo?.en}
                  </p>
                  <p className={`text-xs ${
                    entry.urine_color <= 3 ? 'text-emerald-600 dark:text-emerald-400'
                    : entry.urine_color <= 5 ? 'text-amber-600 dark:text-amber-400'
                    : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {entry.urine_color <= 3 ? t('Bien hidratado', 'Well hydrated')
                    : entry.urine_color <= 5 ? t('Hidratación aceptable — bebe más', 'Acceptable — drink more')
                    : t('Deshidratado — bebe agua inmediatamente', 'Dehydrated — drink water now')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* HRV / RHR */}
          {(entry.hrv || entry.rhr) && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
                <Heart className="w-4 h-4 text-[#514163] dark:text-[#fdda36]" />
                {t('Sistema Nervioso Autónomo', 'Autonomic Nervous System')}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {entry.hrv && (
                  <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
                    <Activity className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{entry.hrv}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">HRV (ms)</p>
                  </div>
                )}
                {entry.rhr && (
                  <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
                    <Heart className="w-4 h-4 text-rose-500 mx-auto mb-1" />
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{entry.rhr}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('FC Reposo', 'Resting HR')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {entry.general_notes && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">{t('Notas', 'Notes')}</p>
              <p className="text-sm text-blue-800 dark:text-blue-200">{entry.general_notes}</p>
            </div>
          )}

          {/* Tags */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
            <WellnessTagsSection
              checkinId={entry.id}
              language={language}
              currentUserId={currentUserId}
              isTrainerOrAdmin={isTrainerOrAdmin}
              canCreate={isTrainerOrAdmin}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 flex-shrink-0">
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {t('Editar', 'Edit')}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-[#514163] text-white text-sm font-semibold hover:bg-[#3d3251] transition-colors"
          >
            {t('Cerrar', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
}
