import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Copy, X, Calendar as CalendarIcon } from 'lucide-react';

interface DuplicateWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDuplicate: (targetDate: string) => Promise<void>;
  workoutName: string;
  currentDate: string;
}

export default function DuplicateWorkoutModal({
  isOpen,
  onClose,
  onDuplicate,
  workoutName,
  currentDate
}: DuplicateWorkoutModalProps) {
  const { language } = useLanguage();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [duplicating, setDuplicating] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  if (!isOpen) return null;

  const handleDuplicate = async () => {
    if (!selectedDate) {
      alert(language === 'es' ? 'Por favor selecciona una fecha' : 'Please select a date');
      return;
    }

    setDuplicating(true);
    try {
      await onDuplicate(selectedDate);
      onClose();
    } catch (error) {
      console.error('Error duplicating workout:', error);
      alert(language === 'es' ? 'Error al duplicar el entrenamiento' : 'Error duplicating workout');
    } finally {
      setDuplicating(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentMonth(newMonth);
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return formatDate(date) === selectedDate;
  };

  const days = getDaysInMonth(currentMonth);
  const weekDays = language === 'es'
    ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <Copy className="w-6 h-6 text-[#514163] dark:text-[#fdda36]" />
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white dark:text-white">
                {language === 'es' ? 'Duplicar Entrenamiento' : 'Duplicate Workout'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 mt-1">
                {workoutName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-300">
              {language === 'es'
                ? 'Este entrenamiento se duplicará con todos sus ejercicios, series, repeticiones y notas.'
                : 'This workout will be duplicated with all its exercises, sets, reps, and notes.'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-3">
              {language === 'es' ? 'Selecciona la fecha de destino' : 'Select target date'}
            </label>

            <div className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  ←
                </button>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white">
                  {currentMonth.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
                    month: 'long',
                    year: 'numeric'
                  })}
                </h3>
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  →
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map(day => (
                  <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {days.map((date, idx) => {
                  if (!date) {
                    return <div key={`empty-${idx}`} className="aspect-square" />;
                  }

                  const today = isToday(date);
                  const selected = isSelected(date);

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(formatDate(date))}
                      className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                        selected
                          ? 'bg-[#514163] text-white ring-2 ring-[#fdda36]'
                          : today
                          ? 'bg-[#fdda36] text-[#514163]'
                          : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white dark:text-white'
                      }`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              {selectedDate && (
                <div className="mt-4 p-3 bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarIcon className="w-4 h-4 text-[#514163] dark:text-[#fdda36]" />
                    <span className="text-gray-600 dark:text-gray-400 dark:text-gray-400">
                      {language === 'es' ? 'Fecha seleccionada:' : 'Selected date:'}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white dark:text-white">
                      {(() => {
                        const [year, month, day] = selectedDate.split('-').map(Number);
                        const localDate = new Date(year, month - 1, day);
                        return localDate.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        });
                      })()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 dark:border-gray-700">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </button>
            <button
              onClick={handleDuplicate}
              disabled={duplicating || !selectedDate}
              className="flex-1 px-4 py-2 bg-[#514163] text-white rounded-lg hover:bg-[#6d5581] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {duplicating
                ? (language === 'es' ? 'Duplicando...' : 'Duplicating...')
                : (language === 'es' ? 'Duplicar' : 'Duplicate')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
