import { useState, useEffect, useCallback } from 'react';
import { X, Sofa, StickyNote, Loader2, Save, Trash2, Calendar } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export interface CalendarEventItem {
  id: string;
  athlete_id: string;
  created_by: string;
  type: 'rest_day' | 'note';
  description: string | null;
  event_date: string;
  created_at: string;
  updated_at: string | null;
  creator_name?: string | null;
  creator_role?: string | null;
}

interface CalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  athleteId: string;
  eventType: 'rest_day' | 'note';
  selectedDate?: string;
  existingEvent?: CalendarEventItem | null;
  onSuccess?: () => void;
}

const MAX_CHARS = 300;

export default function CalendarEventModal({
  isOpen,
  onClose,
  athleteId,
  eventType,
  selectedDate,
  existingEvent,
  onSuccess,
}: CalendarEventModalProps) {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [creatorRole, setCreatorRole] = useState<string | null>(null);

  const isEditMode = !!existingEvent;

  useEffect(() => {
    if (!isOpen) return;
    if (existingEvent) {
      setDescription(existingEvent.description || '');
      setEventDate(existingEvent.event_date);
      setCreatorName(existingEvent.creator_name || null);
      setCreatorRole(existingEvent.creator_role || null);
    } else {
      setDescription('');
      setEventDate(selectedDate || new Date().toISOString().split('T')[0]);
      setCreatorName(profile?.full_name || null);
      setCreatorRole(profile?.role || null);
    }
  }, [isOpen, existingEvent, selectedDate, profile]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventDate) return;
    setLoading(true);
    try {
      if (isEditMode && existingEvent) {
        const { error } = await supabase
          .from('calendar_events')
          .update({
            description: description.trim() || null,
            event_date: eventDate,
          })
          .eq('id', existingEvent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('calendar_events')
          .insert({
            athlete_id: athleteId,
            created_by: profile?.id,
            type: eventType,
            description: description.trim() || null,
            event_date: eventDate,
          });
        if (error) throw error;
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error saving calendar event:', err);
      alert(language === 'es' ? 'Error al guardar' : 'Error saving');
    } finally {
      setLoading(false);
    }
  }, [eventDate, description, isEditMode, existingEvent, athleteId, profile, eventType, onSuccess, onClose, language]);

  const handleDelete = useCallback(async () => {
    if (!existingEvent) return;
    if (!confirm(language === 'es' ? '¿Eliminar este evento?' : 'Delete this event?')) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', existingEvent.id);
      if (error) throw error;
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error deleting calendar event:', err);
      alert(language === 'es' ? 'Error al eliminar' : 'Error deleting');
    } finally {
      setLoading(false);
    }
  }, [existingEvent, onSuccess, onClose, language]);

  const t = (key: string) => {
    const translations: Record<string, { es: string; en: string }> = {
      restDayTitle: { es: 'Día de Descanso', en: 'Rest Day' },
      noteTitle: { es: 'Nota', en: 'Note' },
      restDaySubtitle: { es: 'Registra un día de descanso para el atleta', en: 'Log a rest day for the athlete' },
      noteSubtitle: { es: 'Añade una nota al calendario', en: 'Add a note to the calendar' },
      date: { es: 'Fecha', en: 'Date' },
      description: { es: 'Descripción', en: 'Description' },
      descriptionPlaceholderRest: { es: 'Ej: Me siento cansado, necesito descansar...', en: 'E.g: I feel tired, need to rest...' },
      descriptionPlaceholderNote: { es: 'Ej: Recordar revisar calzado...', en: 'E.g: Remember to check footwear...' },
      cancel: { es: 'Cancelar', en: 'Cancel' },
      save: { es: 'Guardar', en: 'Save' },
      saving: { es: 'Guardando...', en: 'Saving...' },
      delete: { es: 'Eliminar', en: 'Delete' },
      createdBy: { es: 'Creado por', en: 'Created by' },
      coach: { es: 'Entrenador', en: 'Coach' },
      athlete: { es: 'Atleta', en: 'Athlete' },
      chars: { es: 'caracteres', en: 'characters' },
    };
    return translations[key]?.[language] || key;
  };

  if (!isOpen) return null;

  const isRestDay = eventType === 'rest_day';
  const icon = isRestDay ? <Sofa className="w-5 h-5" /> : <StickyNote className="w-5 h-5" />;
  const accentColor = isRestDay ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400';
  const accentBg = isRestDay ? 'bg-teal-50 dark:bg-teal-900/20' : 'bg-amber-50 dark:bg-amber-900/20';
  const accentBorder = isRestDay ? 'border-teal-200 dark:border-teal-800' : 'border-amber-200 dark:border-amber-800';
  const placeholder = isRestDay ? t('descriptionPlaceholderRest') : t('descriptionPlaceholderNote');

  const creatorLabel = creatorRole === 'trainer' || creatorRole === 'nutritionist'
    ? t('coach')
    : creatorRole === 'head_coach'
      ? t('coach')
      : t('athlete');

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accentBg} ${accentBorder} border`}>
              <span className={accentColor}>{icon}</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {isRestDay ? t('restDayTitle') : t('noteTitle')}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isRestDay ? t('restDaySubtitle') : t('noteSubtitle')}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Date */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {t('date')}
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36] focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t('description')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, MAX_CHARS))}
              placeholder={placeholder}
              rows={4}
              maxLength={MAX_CHARS}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#fdda36] focus:border-transparent resize-none"
            />
            <div className="flex justify-end mt-1">
              <span className={`text-xs ${description.length >= MAX_CHARS ? 'text-red-500' : 'text-gray-400'}`}>
                {description.length}/{MAX_CHARS} {t('chars')}
              </span>
            </div>
          </div>

          {/* Creator info */}
          {creatorName && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#fdda36] to-[#514163] flex items-center justify-center text-white text-xs font-bold">
                {creatorName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('createdBy')}</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {creatorName} <span className="text-gray-400 dark:text-gray-500">· {creatorLabel}</span>
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              {t('cancel')}
            </button>
            {isEditMode && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-3 py-2 border border-red-300 dark:border-red-700 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#fdda36] text-[#514163] rounded-lg font-medium hover:bg-[#fce45c] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {t('save')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
