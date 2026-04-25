import { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { Trophy, Plus, Edit2, Trash2, X, Calendar } from 'lucide-react';

interface Event {
  id: string;
  atp_id: string;
  week_number: number;
  event_date: string;
  event_type: string;
  title: string;
  description: string | null;
  priority: 'A' | 'B' | 'C' | null;
  icon: string;
}

interface EventManagerProps {
  atpId: string;
  weekNumber: number;
  weekStartDate: string;
  weekEndDate: string;
}

const PRIORITY_COLORS = {
  A: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-200', border: 'border-red-500' },
  B: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-200', border: 'border-yellow-500' },
  C: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-200', border: 'border-blue-500' }
};

const EVENT_TYPES = [
  { value: 'competition', en: 'Competition', es: 'Competición' },
  { value: 'test', en: 'Test/Assessment', es: 'Evaluación' },
  { value: 'camp', en: 'Training Camp', es: 'Concentración' },
  { value: 'other', en: 'Other', es: 'Otro' }
];

export default function EventManager({ atpId, weekNumber, weekStartDate, weekEndDate }: EventManagerProps) {
  const { language } = useLanguage();
  const [events, setEvents] = useState<Event[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    event_date: weekStartDate,
    event_type: 'competition',
    title: '',
    description: '',
    priority: null as 'A' | 'B' | 'C' | null
  });

  useEffect(() => {
    loadEvents();
  }, [atpId, weekNumber]);

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('atp_events')
        .select('*')
        .eq('atp_id', atpId)
        .eq('week_number', weekNumber)
        .order('event_date');

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const handleCreateEvent = async () => {
    if (!formData.title || !formData.event_date) {
      alert(language === 'es' ? 'Por favor completa los campos requeridos' : 'Please fill required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('atp_events')
        .insert({
          atp_id: atpId,
          week_number: weekNumber,
          event_date: formData.event_date,
          event_type: formData.event_type,
          title: formData.title,
          description: formData.description || null,
          priority: formData.priority,
          icon: '🏆'
        });

      if (error) throw error;

      loadEvents();
      setShowAddModal(false);
      setFormData({
        event_date: weekStartDate,
        event_type: 'competition',
        title: '',
        description: '',
        priority: null
      });
    } catch (error: any) {
      console.error('Error creating event:', error);
      alert(error.message);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm(language === 'es' ? '¿Eliminar este evento?' : 'Delete this event?')) return;

    try {
      const { error } = await supabase
        .from('atp_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      loadEvents();
    } catch (error: any) {
      console.error('Error deleting event:', error);
      alert(error.message);
    }
  };

  const t = (key: string) => {
    const translations: any = {
      'events_title': language === 'es' ? 'Eventos & Competiciones' : 'Events & Competitions',
      'add_event': language === 'es' ? 'Agregar Evento' : 'Add Event',
      'no_events': language === 'es' ? 'No hay eventos programados para esta semana' : 'No events scheduled for this week',
      'event_details': language === 'es' ? 'Detalles del Evento' : 'Event Details',
      'event_type': language === 'es' ? 'Tipo de Evento' : 'Event Type',
      'event_name': language === 'es' ? 'Nombre del Evento' : 'Event Name',
      'event_date': language === 'es' ? 'Fecha' : 'Date',
      'priority': language === 'es' ? 'Prioridad' : 'Priority',
      'priority_a': language === 'es' ? 'A - Máxima prioridad (Objetivo principal)' : 'A - Highest priority (Main goal)',
      'priority_b': language === 'es' ? 'B - Prioridad media (Objetivo secundario)' : 'B - Medium priority (Secondary goal)',
      'priority_c': language === 'es' ? 'C - Prioridad baja (Preparación)' : 'C - Low priority (Preparation)',
      'no_priority': language === 'es' ? 'Sin prioridad' : 'No priority',
      'description': language === 'es' ? 'Descripción' : 'Description',
      'cancel': language === 'es' ? 'Cancelar' : 'Cancel',
      'create': language === 'es' ? 'Crear' : 'Create'
    };
    return translations[key] || key;
  };

  return (
    <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[#fdda36]" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white">
            {t('events_title')}
          </h3>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#fdda36] text-[#514163] rounded-lg hover:bg-[#ffd51a] transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          {t('add_event')}
        </button>
      </div>

      {events.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400 dark:text-gray-400 py-4 text-sm">
          {t('no_events')}
        </p>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <div
              key={event.id}
              className={`flex items-center gap-3 p-3 rounded-lg border-l-4 ${
                event.priority ? PRIORITY_COLORS[event.priority].bg : 'bg-gray-50 dark:bg-gray-900 dark:bg-gray-700'
              } ${
                event.priority ? PRIORITY_COLORS[event.priority].border : 'border-gray-300 dark:border-gray-600 dark:border-gray-600'
              }`}
            >
              <span className="text-2xl">{event.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 dark:text-white dark:text-white">
                    {event.title}
                  </p>
                  {event.priority && (
                    <span className={`px-2 py-0.5 text-xs font-bold rounded ${PRIORITY_COLORS[event.priority].text}`}>
                      {event.priority}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
                  {new Date(event.event_date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short'
                  })}
                  {event.description && ` • ${event.description}`}
                </p>
              </div>
              <button
                onClick={() => handleDeleteEvent(event.id)}
                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white dark:text-white">
                {t('event_details')}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                  {t('event_type')}
                </label>
                <select
                  value={formData.event_type}
                  onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {language === 'es' ? type.es : type.en}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                  {t('event_name')} *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={language === 'es' ? 'Campeonato Nacional' : 'National Championship'}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                  {t('event_date')} *
                </label>
                <input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  min={weekStartDate}
                  max={weekEndDate}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                  {t('priority')}
                </label>
                <select
                  value={formData.priority || ''}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'A' | 'B' | 'C' | null || null })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                >
                  <option value="">{t('no_priority')}</option>
                  <option value="A">{t('priority_a')}</option>
                  <option value="B">{t('priority_b')}</option>
                  <option value="C">{t('priority_c')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                  {t('description')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleCreateEvent}
                  className="flex-1 px-4 py-2 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors"
                >
                  {t('create')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
