import { useState, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Copy, X, Calendar as CalendarIcon, Check, ChevronLeft, ChevronRight, Loader2, AlertCircle, CalendarRange } from 'lucide-react';

interface DuplicateWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDuplicate: (targetDates: string[]) => Promise<void>;
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
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const t = (es: string, en: string) => language === 'es' ? es : en;

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseDateStr = (str: string): Date => {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
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

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isOriginalDate = (date: Date) => {
    return formatDate(date) === currentDate;
  };

  const isSelected = (date: Date) => {
    return selectedDates.has(formatDate(date));
  };

  const isInPreviewRange = (date: Date): boolean => {
    if (!rangeStart) return false;
    const dateStr = formatDate(date);
    return dateStr >= rangeStart && dateStr <= formatDate(new Date());
  };

  const handleDayClick = (date: Date) => {
    const dateStr = formatDate(date);
    setErrorMsg(null);

    if (isOriginalDate(date)) return;

    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) {
        next.delete(dateStr);
      } else {
        next.add(dateStr);
      }
      return next;
    });
    setRangeStart(null);
  };

  const handleRangeStartClick = (date: Date) => {
    const dateStr = formatDate(date);
    if (isOriginalDate(date)) return;
    setErrorMsg(null);

    if (rangeStart === dateStr) {
      setRangeStart(null);
      return;
    }
    setRangeStart(dateStr);
  };

  const handleRangeEndClick = (date: Date) => {
    if (!rangeStart) return;
    if (isOriginalDate(date)) return;
    setErrorMsg(null);

    const start = parseDateStr(rangeStart);
    const end = date;
    const [from, to] = start <= end ? [start, end] : [end, start];

    setSelectedDates((prev) => {
      const next = new Set(prev);
      const cursor = new Date(from);
      while (cursor <= to) {
        const ds = formatDate(cursor);
        if (ds !== currentDate) {
          next.add(ds);
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      return next;
    });
    setRangeStart(null);
  };

  const handleDayClickWrapper = (date: Date) => {
    if (rangeStart) {
      handleRangeEndClick(date);
    } else {
      handleDayClick(date);
    }
  };

  const clearAll = () => {
    setSelectedDates(new Set());
    setRangeStart(null);
    setErrorMsg(null);
  };

  const handleDuplicate = async () => {
    if (selectedDates.size === 0) {
      setErrorMsg(t('Selecciona al menos un día', 'Select at least one day'));
      return;
    }

    setDuplicating(true);
    setErrorMsg(null);
    try {
      const sortedDates = Array.from(selectedDates).sort();
      await onDuplicate(sortedDates);
      setSelectedDates(new Set());
      setRangeStart(null);
      onClose();
    } catch (err) {
      console.error('Error duplicating workout:', err);
      setErrorMsg(t('Error al duplicar el entrenamiento', 'Error duplicating workout'));
    } finally {
      setDuplicating(false);
    }
  };

  const handleClose = () => {
    if (duplicating) return;
    setSelectedDates(new Set());
    setRangeStart(null);
    setErrorMsg(null);
    onClose();
  };

  const sortedSelectedList = useMemo(() => {
    return Array.from(selectedDates).sort();
  }, [selectedDates]);

  const days = getDaysInMonth(currentMonth);
  const weekDays = language === 'es'
    ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const formatLongDate = (dateStr: string) => {
    const d = parseDateStr(dateStr);
    return d.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div className="flex items-center gap-3">
            <Copy className="w-6 h-6 text-[#514163] dark:text-[#fdda36]" />
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('Duplicar Entrenamiento', 'Duplicate Workout')}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {workoutName}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={duplicating}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Info banner */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-300">
              {t(
                'Selecciona uno o varios días. El entrenamiento se copiará idéntico (mismo horario, ejercicios, series y notas) a todos los días elegidos.',
                'Select one or more days. The workout will be copied identically (same time, exercises, sets, and notes) to all selected days.'
              )}
            </p>
          </div>

          {/* Range mode hint */}
          {rangeStart && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-300">
                {t(
                  `Rango iniciado en ${formatLongDate(rangeStart)}. Toca el día final del rango.`,
                  `Range started on ${formatLongDate(rangeStart)}. Tap the end day of the range.`
                )}
              </p>
              <button
                onClick={() => setRangeStart(null)}
                className="ml-auto text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline"
              >
                {t('Cancelar rango', 'Cancel range')}
              </button>
            </div>
          )}

          {/* Calendar */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                {currentMonth.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map(day => (
                <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2">
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
                const original = isOriginalDate(date);
                const preview = rangeStart && !selected && isInPreviewRange(date) && !original;

                return (
                  <button
                    key={idx}
                    onClick={() => handleDayClickWrapper(date)}
                    onContextMenu={(e) => { e.preventDefault(); handleRangeStartClick(date); }}
                    disabled={original}
                    title={original ? t('Día original', 'Original day') : rangeStart ? t('Fin del rango', 'End of range') : t('Seleccionar día', 'Select day')}
                    className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all relative ${
                      original
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        : selected
                        ? 'bg-[#514163] text-white ring-2 ring-[#fdda36]'
                        : preview
                        ? 'bg-[#fdda36]/40 text-[#514163] ring-1 ring-[#fdda36]'
                        : today
                        ? 'bg-[#fdda36] text-[#514163] hover:ring-2 hover:ring-[#514163]'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    {selected && <Check className="w-3 h-3 absolute top-0.5 right-0.5 text-[#fdda36]" />}
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-[#514163] ring-1 ring-[#fdda36]" />
                {t('Seleccionado', 'Selected')}
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-gray-200 dark:bg-gray-700" />
                {t('Día original', 'Original day')}
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-[#fdda36]" />
                {t('Hoy', 'Today')}
              </div>
            </div>
          </div>

          {/* Range helper */}
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <CalendarRange className="w-3.5 h-3.5" />
            {t(
              'Consejo: clic derecho (o mantén) en un día para iniciar un rango, luego toca el día final.',
              'Tip: right-click (or long-press) a day to start a range, then tap the end day.'
            )}
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Selected days summary */}
          {sortedSelectedList.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm">
                  <CalendarIcon className="w-4 h-4 text-[#514163] dark:text-[#fdda36]" />
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {sortedSelectedList.length} {t('día(s) seleccionado(s)', 'day(s) selected')}
                  </span>
                </div>
                <button
                  onClick={clearAll}
                  disabled={duplicating}
                  className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                >
                  {t('Limpiar todo', 'Clear all')}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {sortedSelectedList.map(ds => (
                  <span
                    key={ds}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-[#514163]/10 dark:bg-[#fdda36]/10 text-[#514163] dark:text-[#fdda36] rounded-full text-xs font-medium"
                  >
                    {formatLongDate(ds)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-6 pt-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
          <button
            onClick={handleClose}
            disabled={duplicating}
            className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
          >
            {t('Cancelar', 'Cancel')}
          </button>
          <button
            onClick={handleDuplicate}
            disabled={duplicating || selectedDates.size === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#514163] text-white rounded-lg hover:bg-[#6d5581] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {duplicating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('Duplicando...', 'Duplicating...')}
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                {t('Duplicar', 'Duplicate')} {selectedDates.size > 0 && `(${selectedDates.size})`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
