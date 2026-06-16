import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, CheckCircle, AlertTriangle, Share2, Clock, TrendingUp, Dumbbell, Trophy } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import WorkoutShareCard from './training/WorkoutShareCard';

interface PostTrainingFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: FeedbackData) => Promise<void>;
  onSkip: () => void;
  workoutData?: {
    date: string;
    duration: number;
    totalVolume: number;
    bestSet: {
      exercise: string;
      weight: number;
      reps: number;
    } | null;
    exerciseCount?: number;
    setCount?: number;
    workoutName?: string;
  };
}

export interface FeedbackData {
  rpe: number;
  energy_level: 'very_low' | 'low' | 'normal' | 'high' | 'very_high';
  pain_level: 'none' | 'mild' | 'moderate' | 'strong';
  mood: 'very_low' | 'low' | 'normal' | 'high' | 'very_high';
  feedback_notes: string;
}

export default function PostTrainingFeedbackModal({ isOpen, onClose, onSubmit, onSkip, workoutData }: PostTrainingFeedbackModalProps) {
  const { language } = useLanguage();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);

  const [feedback, setFeedback] = useState<FeedbackData>({
    rpe: 5,
    energy_level: 'normal',
    pain_level: 'none',
    mood: 'normal',
    feedback_notes: '',
  });

  const totalSteps = 5;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit(feedback);
      setCompleted(true);
      // Auto-show share card after brief celebration delay (like Strava)
      if (workoutData) {
        setTimeout(() => setShowShareCard(true), 1800);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkipConfirm = () => {
    onSkip();
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setStep(1);
    setCompleted(false);
    setShowShareCard(false);
    setFeedback({
      rpe: 5,
      energy_level: 'normal',
      pain_level: 'none',
      mood: 'normal',
      feedback_notes: '',
    });
    setShowSkipConfirm(false);
  };

  if (!isOpen) return null;

  // Show share card if requested
  if (showShareCard && workoutData) {
    return <WorkoutShareCard workoutData={workoutData} onClose={() => { setShowShareCard(false); onClose(); resetForm(); }} />;
  }

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  // Show success screen after feedback submitted
  if (completed) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
          {/* Top bar */}
          <div className="h-1.5 bg-gradient-to-r from-green-400 via-emerald-500 to-green-400" />

          <div className="p-6">
            {/* Hero */}
            <div className="text-center mb-5">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trophy className="w-9 h-9 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {language === 'es' ? '¡Entrenamiento Completado!' : 'Workout Complete!'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {language === 'es' ? 'Feedback guardado. Sigue así.' : 'Feedback saved. Keep it up.'}
              </p>
            </div>

            {/* Workout stats */}
            {workoutData && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-5">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{language === 'es' ? 'Duración' : 'Duration'}</p>
                      <p className="text-base font-bold text-gray-900 dark:text-white">{formatDuration(workoutData.duration)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{language === 'es' ? 'Volumen Total' : 'Total Volume'}</p>
                      <p className="text-base font-bold text-gray-900 dark:text-white">{workoutData.totalVolume.toLocaleString()} kg</p>
                    </div>
                  </div>
                  {workoutData.exerciseCount !== undefined && (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                        <Dumbbell className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{language === 'es' ? 'Ejercicios' : 'Exercises'}</p>
                        <p className="text-base font-bold text-gray-900 dark:text-white">{workoutData.exerciseCount}</p>
                      </div>
                    </div>
                  )}
                  {workoutData.setCount !== undefined && (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-rose-100 dark:bg-rose-900/30 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{language === 'es' ? 'Series' : 'Sets'}</p>
                        <p className="text-base font-bold text-gray-900 dark:text-white">{workoutData.setCount}</p>
                      </div>
                    </div>
                  )}
                </div>

                {workoutData.bestSet && (
                  <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
                    <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide flex-shrink-0">
                      {language === 'es' ? 'Mejor' : 'Best'}
                    </span>
                    <span className="text-xs text-gray-700 dark:text-gray-300 truncate font-medium">{workoutData.bestSet.exercise}</span>
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex-shrink-0 ml-auto">
                      {workoutData.bestSet.weight}kg × {workoutData.bestSet.reps}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2.5">
              {workoutData && (
                <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
                  <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                    {language === 'es' ? 'Generando sticker para compartir...' : 'Generating share sticker...'}
                  </p>
                </div>
              )}
              <button
                onClick={() => workoutData && setShowShareCard(true)}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-[#fdda36] text-[#1a1625] font-bold rounded-xl hover:bg-[#ffd01a] transition-colors"
              >
                <Share2 className="w-5 h-5" />
                {language === 'es' ? 'Compartir Ahora' : 'Share Now'}
              </button>
              <button
                onClick={() => { onClose(); resetForm(); }}
                className="w-full px-5 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
              >
                {language === 'es' ? 'Cerrar' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const showWarning = feedback.rpe > 9 || feedback.pain_level === 'moderate' || feedback.pain_level === 'strong';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">
              {language === 'es' ? 'Comentarios de la Sesión' : 'Session Feedback'}
            </h2>
            <button
              onClick={() => setShowSkipConfirm(true)}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2">
            {[...Array(totalSteps)].map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full transition-all ${
                  i + 1 <= step ? 'bg-[#514163]' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 mt-2">
            {language === 'es' ? `Pregunta ${step} de ${totalSteps}` : `Question ${step} of ${totalSteps}`}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: RPE */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white dark:text-white mb-2">
                  {language === 'es' ? '1️⃣ Esfuerzo general' : '1️⃣ Overall Effort'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-1">
                  {language === 'es'
                    ? '¿Qué tan exigente sentiste esta sesión en general? (RPE 1-10)'
                    : 'How hard did this session feel overall? (RPE 1-10)'}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
                    {language === 'es' ? 'Muy fácil' : 'Very easy'}
                  </span>
                  <span className="text-3xl font-bold text-[#514163]">{feedback.rpe}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
                    {language === 'es' ? 'Máximo esfuerzo' : 'Maximum effort'}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={feedback.rpe}
                  onChange={(e) => setFeedback({ ...feedback, rpe: parseInt(e.target.value) })}
                  className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 slider"
                  style={{
                    background: `linear-gradient(to right, #514163 0%, #514163 ${((feedback.rpe - 1) / 9) * 100}%, #e5e7eb ${((feedback.rpe - 1) / 9) * 100}%, #e5e7eb 100%)`,
                  }}
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <span key={num}>{num}</span>
                  ))}
                </div>
              </div>

              {feedback.rpe > 9 && (
                <div className="flex items-start gap-2 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-orange-800 dark:text-orange-300">
                    {language === 'es'
                      ? 'Tu entrenador recibirá una notificación sobre este esfuerzo elevado.'
                      : 'Your coach will be notified about this high effort level.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Energy Level */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white dark:text-white mb-2">
                  {language === 'es' ? '2️⃣ Nivel de energía' : '2️⃣ Energy Level'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400">
                  {language === 'es'
                    ? '¿Cómo estuvo tu nivel de energía durante la sesión?'
                    : 'How was your energy during the session?'}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {[
                  { value: 'very_low', labelEN: 'Very low', labelES: 'Muy bajo', emoji: '😴' },
                  { value: 'low', labelEN: 'Low', labelES: 'Bajo', emoji: '😕' },
                  { value: 'normal', labelEN: 'Normal', labelES: 'Normal', emoji: '😐' },
                  { value: 'high', labelEN: 'High', labelES: 'Alto', emoji: '😊' },
                  { value: 'very_high', labelEN: 'Very high', labelES: 'Muy alto', emoji: '🔥' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFeedback({ ...feedback, energy_level: option.value as any })}
                    className={`p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${
                      feedback.energy_level === option.value
                        ? 'border-[#514163] bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 dark:border-gray-700 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-600'
                    }`}
                  >
                    <span className="text-3xl">{option.emoji}</span>
                    <div>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white block">
                        {language === 'es' ? option.labelES : option.labelEN}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                        {language === 'es' ? option.labelEN : option.labelES}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Pain Level */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white dark:text-white mb-2">
                  {language === 'es' ? '3️⃣ Sensaciones musculares y articulares' : '3️⃣ Muscle & Joint Feeling'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400">
                  {language === 'es'
                    ? '¿Sentiste algún dolor, molestia o fatiga inusual?'
                    : 'Did you feel any pain, discomfort, or unusual fatigue?'}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {[
                  { value: 'none', labelEN: 'No', labelES: 'No', emoji: '✅', color: 'green' },
                  { value: 'mild', labelEN: 'Mild', labelES: 'Leve', emoji: '⚠️', color: 'yellow' },
                  { value: 'moderate', labelEN: 'Moderate', labelES: 'Moderado', emoji: '🔶', color: 'orange' },
                  { value: 'strong', labelEN: 'Strong', labelES: 'Fuerte', emoji: '🚨', color: 'red' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFeedback({ ...feedback, pain_level: option.value as any })}
                    className={`p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${
                      feedback.pain_level === option.value
                        ? 'border-[#514163] bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 dark:border-gray-700 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-600'
                    }`}
                  >
                    <span className="text-3xl">{option.emoji}</span>
                    <div>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white block">
                        {language === 'es' ? option.labelES : option.labelEN}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                        {language === 'es' ? option.labelEN : option.labelES}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {(feedback.pain_level === 'moderate' || feedback.pain_level === 'strong') && (
                <div className="flex items-start gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800 dark:text-red-300">
                    {language === 'es'
                      ? 'Tu entrenador recibirá una notificación sobre este dolor o molestia.'
                      : 'Your coach will be notified about this pain or discomfort.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Mood */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white dark:text-white mb-2">
                  {language === 'es' ? '4️⃣ Estado de ánimo' : '4️⃣ Mood'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400">
                  {language === 'es'
                    ? '¿Cómo estuvo tu ánimo o motivación antes y después del entrenamiento?'
                    : 'How was your mood or motivation before and after training?'}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {[
                  { value: 'very_low', labelEN: 'Very low', labelES: 'Muy bajo', emoji: '😞' },
                  { value: 'low', labelEN: 'Low', labelES: 'Bajo', emoji: '😐' },
                  { value: 'normal', labelEN: 'Normal', labelES: 'Normal', emoji: '🙂' },
                  { value: 'high', labelEN: 'High', labelES: 'Alto', emoji: '😄' },
                  { value: 'very_high', labelEN: 'Very high', labelES: 'Muy alto', emoji: '🤩' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFeedback({ ...feedback, mood: option.value as any })}
                    className={`p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${
                      feedback.mood === option.value
                        ? 'border-[#514163] bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 dark:border-gray-700 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-600'
                    }`}
                  >
                    <span className="text-3xl">{option.emoji}</span>
                    <div>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white block">
                        {language === 'es' ? option.labelES : option.labelEN}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                        {language === 'es' ? option.labelEN : option.labelES}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Notes */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white dark:text-white mb-2">
                  {language === 'es' ? '5️⃣ Observaciones personales' : '5️⃣ Personal Notes'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400">
                  {language === 'es'
                    ? '¿Quieres dejar alguna nota sobre la sesión de hoy? (sueño, estrés, técnica, etc.)'
                    : 'Any notes you would like to share about today session? (sleep, stress, technique, etc.)'}
                </p>
              </div>

              <textarea
                value={feedback.feedback_notes}
                onChange={(e) => setFeedback({ ...feedback, feedback_notes: e.target.value })}
                placeholder={
                  language === 'es'
                    ? 'Ej: Dormí 6 horas, me sentí con mucha energía en las sentadillas...'
                    : 'E.g., Slept 6 hours, felt strong on squats...'
                }
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 dark:bg-gray-900 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#514163] focus:border-transparent resize-none"
              />

              {showWarning && (
                <div className="flex items-start gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    {language === 'es'
                      ? '✅ Tu entrenador recibirá una notificación sobre tu feedback para revisar la sesión.'
                      : '✅ Your coach will receive a notification about your feedback to review this session.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 dark:border-gray-700 p-6 rounded-b-2xl">
          <div className="flex gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                {language === 'es' ? 'Anterior' : 'Previous'}
              </button>
            )}

            {step < totalSteps ? (
              <button
                onClick={() => setStep(step + 1)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#514163] text-white rounded-lg hover:bg-[#6b5480] transition-colors font-medium"
              >
                {language === 'es' ? 'Siguiente' : 'Next'}
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-5 h-5" />
                {submitting
                  ? language === 'es'
                    ? 'Guardando...'
                    : 'Saving...'
                  : language === 'es'
                  ? 'Guardar comentarios'
                  : 'Save Feedback'}
              </button>
            )}
          </div>
        </div>

        {/* Skip confirmation modal */}
        {showSkipConfirm && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-2xl">
            <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl p-6 m-6 max-w-md">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white dark:text-white mb-3">
                {language === 'es' ? '¿Saltar comentarios?' : 'Skip feedback?'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-6">
                {language === 'es'
                  ? 'Tus comentarios ayudan a tu entrenador a ajustar mejor tu programa. ¿Seguro que quieres saltar?'
                  : 'Your feedback helps your coach adjust your program better. Are you sure you want to skip?'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSkipConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 dark:hover:bg-gray-700 transition-colors"
                >
                  {language === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  onClick={handleSkipConfirm}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  {language === 'es' ? 'Saltar de todos modos' : 'Skip anyway'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
