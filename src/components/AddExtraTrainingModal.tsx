import { useState } from 'react';
import { X, Plus, Loader2, Activity } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';

interface AddExtraTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  athleteId: string;
  selectedDate?: string;
  onSuccess?: () => void;
}

export default function AddExtraTrainingModal({
  isOpen,
  onClose,
  athleteId,
  selectedDate,
  onSuccess
}: AddExtraTrainingModalProps) {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    activity_name: '',
    duration: '',
    notes: '',
    training_date: selectedDate || new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.activity_name.trim()) {
      alert(language === 'es' ? 'Por favor ingresa el nombre de la actividad' : 'Please enter the activity name');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('extra_training_logs')
        .insert({
          athlete_id: athleteId,
          activity_name: formData.activity_name.trim(),
          duration: formData.duration.trim() || null,
          notes: formData.notes.trim() || null,
          training_date: formData.training_date
        });

      if (error) throw error;

      setFormData({
        activity_name: '',
        duration: '',
        notes: '',
        training_date: selectedDate || new Date().toISOString().split('T')[0]
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving extra training:', error);
      alert(language === 'es' ? 'Error al guardar el entrenamiento' : 'Error saving training');
    } finally {
      setLoading(false);
    }
  };

  const activitySuggestions = [
    { es: 'Natación', en: 'Swimming' },
    { es: 'Running', en: 'Running' },
    { es: 'Ciclismo', en: 'Cycling' },
    { es: 'Yoga', en: 'Yoga' },
    { es: 'Pilates', en: 'Pilates' },
    { es: 'Fútbol', en: 'Soccer' },
    { es: 'Basketball', en: 'Basketball' },
    { es: 'Caminata', en: 'Walking' }
  ];

  const t = (key: string) => {
    const translations: Record<string, { es: string; en: string }> = {
      title: { es: 'Agregar Entrenamiento Extra', en: 'Add Extra Training' },
      subtitle: { es: 'Registra actividades fuera del gimnasio', en: 'Log activities outside the gym' },
      activityName: { es: 'Nombre de la actividad', en: 'Activity name' },
      activityPlaceholder: { es: 'Ej: Natación, Running, Yoga...', en: 'E.g: Swimming, Running, Yoga...' },
      duration: { es: 'Duración/Cantidad', en: 'Duration/Quantity' },
      durationPlaceholder: { es: 'Ej: 20 min, 5km, 10 piletas...', en: 'E.g: 20 min, 5km, 10 laps...' },
      notes: { es: 'Notas (opcional)', en: 'Notes (optional)' },
      notesPlaceholder: { es: 'Detalles adicionales...', en: 'Additional details...' },
      date: { es: 'Fecha', en: 'Date' },
      suggestions: { es: 'Sugerencias', en: 'Suggestions' },
      cancel: { es: 'Cancelar', en: 'Cancel' },
      save: { es: 'Guardar', en: 'Save' },
      saving: { es: 'Guardando...', en: 'Saving...' }
    };
    return translations[key]?.[language] || key;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white dark:text-white flex items-center gap-2">
              <Activity className="w-6 h-6 text-[#514163]" />
              {t('title')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 mt-1">
              {t('subtitle')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Activity Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              {t('activityName')} *
            </label>
            <input
              type="text"
              value={formData.activity_name}
              onChange={(e) => setFormData({ ...formData, activity_name: e.target.value })}
              placeholder={t('activityPlaceholder')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36] focus:border-transparent"
              required
            />

            {/* Suggestions */}
            <div className="mt-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 dark:text-gray-400 mb-2">{t('suggestions')}:</p>
              <div className="flex flex-wrap gap-2">
                {activitySuggestions.map((activity, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setFormData({ ...formData, activity_name: activity[language] })}
                    className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-800 dark:bg-gray-700 hover:bg-[#fdda36] dark:hover:bg-[#fdda36] hover:text-[#514163] text-gray-700 dark:text-gray-300 dark:text-gray-300 rounded-full transition-colors"
                  >
                    {activity[language]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              {t('duration')}
            </label>
            <input
              type="text"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              placeholder={t('durationPlaceholder')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36] focus:border-transparent"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              {t('date')}
            </label>
            <input
              type="date"
              value={formData.training_date}
              onChange={(e) => setFormData({ ...formData, training_date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36] focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              {t('notes')}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={t('notesPlaceholder')}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36] focus:border-transparent resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 dark:hover:bg-gray-700 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#fdda36] text-[#514163] rounded-lg font-medium hover:bg-[#fce45c] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('saving')}
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
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
