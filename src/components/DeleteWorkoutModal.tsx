import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export interface DeleteWorkoutModalProps {
  open: boolean;
  workoutName: string;
  workoutDate: string;
  workoutDuration: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteWorkoutModal({
  open,
  workoutName,
  workoutDate,
  workoutDuration,
  onConfirm,
  onCancel,
}: DeleteWorkoutModalProps) {
  const { language } = useLanguage();
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const isEs = language === 'es';

  const labels = {
    title: isEs ? 'Eliminar entrenamiento' : 'Delete workout',
    question: isEs
      ? '¿Estás seguro de que deseas eliminar este entrenamiento?'
      : 'Are you sure you want to delete this workout?',
    name: isEs ? 'Nombre' : 'Name',
    date: isEs ? 'Fecha' : 'Date',
    duration: isEs ? 'Duración' : 'Duration',
    cancel: isEs ? 'Cancelar' : 'Cancel',
    confirm: isEs ? 'Eliminar' : 'Delete',
    warning: isEs
      ? 'Esta acción no se puede deshacer.'
      : 'This action cannot be undone.',
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
        return;
      }
      if (e.key !== 'Tab') return;

      const modal = modalRef.current;
      if (!modal) return;

      const focusable = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onCancel],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => cancelBtnRef.current?.focus(), 50);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      clearTimeout(timer);
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCancel}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-workout-title"
        aria-describedby="delete-workout-desc"
        className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <h2
              id="delete-workout-title"
              className="text-lg font-bold text-gray-900 dark:text-white"
            >
              {labels.title}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={labels.cancel}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-2">
          <p
            id="delete-workout-desc"
            className="text-sm text-gray-600 dark:text-gray-400 mb-4"
          >
            {labels.question}
          </p>

          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2.5">
            <div className="flex items-start gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-500 w-20 flex-shrink-0 mt-0.5">
                {labels.name}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white flex-1">
                {workoutName}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-500 w-20 flex-shrink-0 mt-0.5">
                {labels.date}
              </span>
              <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                {workoutDate}
              </span>
            </div>
            {workoutDuration && (
              <div className="flex items-start gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-500 w-20 flex-shrink-0 mt-0.5">
                  {labels.duration}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                  {workoutDuration}
                </span>
              </div>
            )}
          </div>

          <p className="text-xs text-red-500 dark:text-red-400 mt-3 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            {labels.warning}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 px-6 py-5 mt-1">
          <button
            ref={cancelBtnRef}
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold text-sm transition-colors"
          >
            {labels.cancel}
          </button>
          <button
            ref={confirmBtnRef}
            onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {labels.confirm}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
