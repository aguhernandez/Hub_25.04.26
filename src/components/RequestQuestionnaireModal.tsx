import { useState, useEffect } from 'react';
import { X, ClipboardList, Calendar, Loader2, Utensils, Heart, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export type QuestionnaireType = 'wellness' | 'food_diary_24h' | 'anamnesis';

export const QUESTIONNAIRE_LABELS: Record<QuestionnaireType, { es: string; en: string }> = {
  wellness: { es: 'Cuestionario de Bienestar', en: 'Wellness Check-in' },
  food_diary_24h: { es: 'Registro 24h de comidas', en: '24h Food Record' },
  anamnesis: { es: 'Anamnesis', en: 'Anamnesis' },
};

interface ScheduledQuestionnaire {
  id: string;
  athlete_id: string;
  professional_id: string;
  questionnaire_type: QuestionnaireType;
  scheduled_date: string;
  status: 'pending' | 'completed';
  note: string | null;
}

interface RequestQuestionnaireModalProps {
  isOpen: boolean;
  onClose: () => void;
  athleteId: string;
  athleteName: string;
  preselectedDate?: string;
  onScheduled?: () => void;
}

export default function RequestQuestionnaireModal({
  isOpen,
  onClose,
  athleteId,
  athleteName,
  preselectedDate,
  onScheduled,
}: RequestQuestionnaireModalProps) {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const t = (es: string, en: string) => (language === 'es' ? es : en);

  const [questionnaireType, setQuestionnaireType] = useState<QuestionnaireType | null>(null);
  const [scheduledDate, setScheduledDate] = useState(preselectedDate || new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upcoming, setUpcoming] = useState<ScheduledQuestionnaire[]>([]);

  useEffect(() => {
    if (isOpen) {
      setQuestionnaireType(null);
      setScheduledDate(preselectedDate || new Date().toISOString().split('T')[0]);
      setNote('');
      setError(null);
      loadUpcoming();
    }
  }, [isOpen, athleteId, preselectedDate]);

  const loadUpcoming = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('scheduled_questionnaires')
      .select('*')
      .eq('athlete_id', athleteId)
      .eq('status', 'pending')
      .gte('scheduled_date', today)
      .order('scheduled_date', { ascending: true });
    setUpcoming((data as ScheduledQuestionnaire[]) || []);
  };

  const handleSchedule = async () => {
    if (!questionnaireType || !scheduledDate) return;
    setSaving(true);
    setError(null);
    try {
      const professionalId = profile?.id;
      if (!professionalId) throw new Error('no-session');

      const { error: insertError } = await supabase
        .from('scheduled_questionnaires')
        .insert({
          athlete_id: athleteId,
          professional_id: professionalId,
          questionnaire_type: questionnaireType,
          scheduled_date: scheduledDate,
          note: note.trim() || null,
          status: 'pending',
        });
      if (insertError) throw insertError;

      onScheduled?.();
      onClose();
    } catch (err) {
      console.error('Error scheduling questionnaire:', err);
      setError(t('No se pudo programar el cuestionario. Intenta de nuevo.', 'Could not schedule the questionnaire. Try again.'));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const typeIcons: Record<QuestionnaireType, JSX.Element> = {
    wellness: <Heart className="w-5 h-5" />,
    food_diary_24h: <Utensils className="w-5 h-5" />,
    anamnesis: <FileText className="w-5 h-5" />,
  };

  const typeColors: Record<QuestionnaireType, string> = {
    wellness: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 text-emerald-700 dark:text-emerald-300',
    food_diary_24h: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 hover:border-orange-400 text-orange-700 dark:text-orange-300',
    anamnesis: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:border-blue-400 text-blue-700 dark:text-blue-300',
  };

  const selectedColor = 'border-[#514163] dark:border-[#fdda36] ring-2 ring-[#fdda36]/40';

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingList = upcoming.filter(q => q.scheduled_date >= todayStr);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-5 flex items-start justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#fdda36]/20 border border-[#fdda36]/40 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-[#514163] dark:text-[#fdda36]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                {t('Solicitar Cuestionario', 'Request Questionnaire')}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t('Programa un cuestionario para', 'Schedule a questionnaire for')}{' '}
                <span className="font-semibold text-gray-700 dark:text-gray-200">{athleteName || t('el atleta', 'the athlete')}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Step 1: questionnaire type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2.5">
              1. {t('Selecciona el cuestionario', 'Select the questionnaire')}
            </label>
            <div className="space-y-2">
              {(Object.keys(QUESTIONNAIRE_LABELS) as QuestionnaireType[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setQuestionnaireType(key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${typeColors[key]} ${
                    questionnaireType === key ? selectedColor : ''
                  }`}
                >
                  <span className="flex-shrink-0">{typeIcons[key]}</span>
                  <span className="text-sm font-medium">{QUESTIONNAIRE_LABELS[key][language]}</span>
                  {questionnaireType === key && (
                    <span className="ml-auto w-5 h-5 rounded-full bg-[#514163] dark:bg-[#fdda36] flex items-center justify-center flex-shrink-0">
                      <span className="w-2 h-2 rounded-full bg-white dark:bg-[#514163]" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: date */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="w-3.5 h-3.5" />
              2. {t('Fecha para completarlo', 'Date to complete it')}
            </label>
            <input
              type="date"
              value={scheduledDate}
              min={todayStr}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36] focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
              {t('El atleta verá este cuestionario en su calendario ese día.', 'The athlete will see this questionnaire on their calendar that day.')}
            </p>
          </div>

          {/* Optional note */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {t('Nota (opcional)', 'Note (optional)')}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 300))}
              rows={2}
              maxLength={300}
              placeholder={t('Ej: Complétalo antes del entrenamiento', 'E.g. Complete it before the workout')}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#fdda36] focus:border-transparent resize-none"
            />
          </div>

          {/* Upcoming pending requests */}
          {upcomingList.length > 0 && (
            <div className="rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700 p-3.5">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                {t('Programados pendientes', 'Pending scheduled')}
              </p>
              <ul className="space-y-1.5">
                {upcomingList.map((q) => (
                  <li key={q.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-200">
                      {QUESTIONNAIRE_LABELS[q.questionnaire_type]?.[language] || q.questionnaire_type}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 text-xs font-medium">{q.scheduled_date}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              {error}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            {t('Cancelar', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleSchedule}
            disabled={!questionnaireType || !scheduledDate || saving}
            className="flex-1 px-4 py-2.5 bg-[#fdda36] text-[#514163] rounded-lg font-semibold hover:bg-[#fce45c] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Calendar className="w-4 h-4" />
                {t('Programar', 'Schedule')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
