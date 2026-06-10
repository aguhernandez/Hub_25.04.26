import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Check, Calculator, Zap, ChevronRight, ChevronLeft,
  Dumbbell, Clock, X, Play, SkipForward, Activity,
  Pause, RotateCcw, Timer, RefreshCw, Repeat,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import PostTrainingFeedbackModal, { FeedbackData } from '../PostTrainingFeedbackModal';
import StrengthEstimator from './StrengthEstimator';
import WorkingMaxModal from './WorkingMaxModal';
import BarVelocityTracker from './barvelocity/BarVelocityTracker';
import CMJAssessment from './cmj/CMJAssessment';

interface SetLine {
  id: string;
  sets: number;
  reps: string | number;
  primary_value?: string;
  secondary_value?: string;
  primary_metric?: string;
  secondary_metric?: string;
  rest_seconds?: number;
}

interface Exercise {
  id: string;
  workout_exercise_id: string;
  name: string;
  description?: string;
  sets: number;
  reps: string | number;
  rest_seconds: number;
  link?: string;
  section_title?: string;
  actualSets?: number;
  primary_value?: string;
  secondary_value?: string;
  primary_metric?: string;
  secondary_metric?: string;
  set_lines?: SetLine[];
}

interface SetTracking {
  completed: boolean;
  reps?: number;
  weight?: number;
  velocity?: number;
  rir?: number;
  notes?: string;
}

interface WorkoutSection {
  title: string;
  exercises: Exercise[];
  isAssessment: boolean;
}

interface WorkoutSessionScreenProps {
  workout: any;
  exercises: Exercise[];
  setTracking: { [key: string]: SetTracking };
  onUpdateTracking: (exerciseId: string, setNumber: number, field: keyof SetTracking, value: any) => void;
  onComplete: (feedback: FeedbackData) => Promise<void>;
  onPause: () => void;
  workoutStartTime: number | null;
  onSetWorkoutStartTime: (t: number) => void;
  onDismiss?: () => void;
}

function groupIntoSections(exercises: Exercise[]): WorkoutSection[] {
  const sections: WorkoutSection[] = [];
  let currentTitle = '';
  let currentExercises: Exercise[] = [];

  exercises.forEach((ex) => {
    const title = ex.section_title || '';
    if (title !== currentTitle) {
      if (currentExercises.length > 0) {
        sections.push({
          title: currentTitle,
          exercises: currentExercises,
          isAssessment: currentTitle.toLowerCase().includes('assessment') ||
            currentTitle.toLowerCase().includes('evaluacion') ||
            currentTitle.toLowerCase().includes('evaluación'),
        });
      }
      currentTitle = title;
      currentExercises = [ex];
    } else {
      currentExercises.push(ex);
    }
  });

  if (currentExercises.length > 0) {
    sections.push({
      title: currentTitle,
      exercises: currentExercises,
      isAssessment: currentTitle.toLowerCase().includes('assessment') ||
        currentTitle.toLowerCase().includes('evaluacion') ||
        currentTitle.toLowerCase().includes('evaluación'),
    });
  }

  if (sections.length === 0 && exercises.length > 0) {
    sections.push({ title: '', exercises, isAssessment: false });
  }

  return sections;
}

interface LastPerf { weight: number; reps: number; date: string }

function getYouTubeThumbnail(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/);
  return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
}

function getTotalSets(exercise: Exercise): number {
  if (exercise.set_lines) {
    const base = exercise.set_lines.reduce((s, l) => s + (l.sets || 0), 0);
    const extra = exercise.actualSets ? Math.max(0, exercise.actualSets - base) : 0;
    return base + extra;
  }
  return exercise.actualSets || exercise.sets;
}

function metricLabel(metric: string | undefined, language: string): string {
  if (!metric) return 'reps';
  const map: Record<string, string> = {
    reps: 'reps',
    kg: 'kg',
    lb: 'lb',
    percent: '%',
    time: language === 'es' ? 'seg' : 'sec',
    distance: 'm',
    calories: 'kcal',
  };
  return map[metric] ?? 'reps';
}

function RestTimer({ seconds, onClose }: { seconds: number; onClose: () => void }) {
  const { language } = useLanguage();
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => setRemaining((r) => r - 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, remaining]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const pct = seconds > 0 ? ((seconds - remaining) / seconds) * 100 : 100;
  const done = remaining === 0;

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-3xl p-8 w-full max-w-xs text-center shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 font-body">
            {language === 'es' ? 'Tiempo de descanso' : 'Rest timer'}
          </p>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="relative w-32 h-32 mx-auto mb-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="#e5e7eb" className="dark:stroke-gray-700" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="54" fill="none"
              stroke={done ? '#22c55e' : '#fdda36'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 54}`}
              strokeDashoffset={`${2 * Math.PI * 54 * (1 - pct / 100)}`}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {done ? (
              <Check className="w-10 h-10 text-green-500" />
            ) : (
              <span className="text-3xl font-bold text-gray-900 dark:text-white font-heading">
                {mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : secs}
              </span>
            )}
          </div>
        </div>

        {done ? (
          <button
            onClick={onClose}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-semibold font-body transition-colors"
          >
            {language === 'es' ? 'Continuar' : 'Continue'}
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => setRunning((r) => !r)}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-white rounded-2xl font-semibold font-body transition-colors"
            >
              {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => { setRemaining(seconds); setRunning(true); }}
              className="p-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-semibold font-body transition-colors text-sm"
            >
              {language === 'es' ? 'Saltar' : 'Skip'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ExerciseCard({
  exercise,
  exerciseIndex,
  setTracking,
  onUpdateTracking,
  onStartTimer,
  language,
  athleteId,
  onOpenVideo,
  onOpenStrengthEstimator,
}: {
  exercise: Exercise;
  exerciseIndex: number;
  setTracking: { [key: string]: SetTracking };
  onUpdateTracking: (exerciseId: string, setNumber: number, field: keyof SetTracking, value: any) => void;
  onStartTimer: (seconds: number) => void;
  language: string;
  athleteId?: string;
  onOpenVideo: (url: string, name: string, description?: string) => void;
  onOpenStrengthEstimator: () => void;
}) {
  const totalSets = getTotalSets(exercise);

  const getTracking = (setNum: number): SetTracking =>
    setTracking[`${exercise.id}-${setNum}`] || { completed: false };

  const txt = {
    set: language === 'es' ? 'Serie' : 'Set',
    reps: language === 'es' ? 'Reps' : 'Reps',
    weight: language === 'es' ? 'Peso' : 'Weight',
    rir: 'RIR',
    sets: language === 'es' ? 'series' : 'sets',
  };

  const [lastPerf, setLastPerf] = useState<LastPerf | null>(null);
  const [workingMax, setWorkingMax] = useState<number | null>(null);
  const [workingMaxIsEstimated, setWorkingMaxIsEstimated] = useState(false);
  const [showWorkingMaxModal, setShowWorkingMaxModal] = useState(false);

  useEffect(() => {
    if (!athleteId || !exercise.workout_exercise_id) return;
    (async () => {
      const { data: logsData } = await supabase
        .from('training_logs')
        .select('weight_used, reps_completed, rir, logged_at, athlete_workout_id')
        .eq('workout_exercise_id', exercise.workout_exercise_id)
        .not('weight_used', 'is', null)
        .order('logged_at', { ascending: false })
        .limit(1);

      if (logsData && logsData.length > 0) {
        const log = logsData[0];
        if (log.weight_used > 0) {
          setLastPerf({ weight: log.weight_used, reps: log.reps_completed, date: log.logged_at });
        }
      }

      if (exercise.name) {
        const { data: estData } = await supabase
          .from('strength_estimates')
          .select('estimated_1rm, calculated_at')
          .eq('athlete_id', athleteId)
          .eq('exercise_name', exercise.name)
          .order('calculated_at', { ascending: false })
          .limit(1);

        if (estData && estData.length > 0) {
          setWorkingMax(estData[0].estimated_1rm);
          setWorkingMaxIsEstimated(false);
        } else if (logsData && logsData.length > 0) {
          const log = logsData[0];
          if (log.weight_used > 0) {
            let est: number | null = null;
            if (log.reps_completed && log.reps_completed > 0) {
              const totalReps = log.reps_completed + (log.rir !== null && log.rir !== undefined ? Math.min(Math.max(Math.round(log.rir), 0), 5) : 0);
              est = Math.round((log.weight_used * (1 + totalReps / 30)) * 10) / 10;
            }
            if (est !== null) {
              setWorkingMax(est);
              setWorkingMaxIsEstimated(true);
            }
          }
        }
      }
    })();
  }, [athleteId, exercise.workout_exercise_id, exercise.name]);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#fdda36]/20 border border-[#fdda36]/30 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[#514163] dark:text-[#fdda36] font-bold text-sm font-heading">{exerciseIndex + 1}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 dark:text-white text-base font-heading leading-tight mb-0.5">{exercise.name}</h4>
            {exercise.description && (
              <p className="text-xs text-gray-400 italic mb-1.5 line-clamp-1">{exercise.description}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {exercise.set_lines ? (
                exercise.set_lines.map((line, li) => (
                  <span key={li} className="inline-flex items-center gap-1 text-xs font-medium text-[#514163] dark:text-[#fdda36] bg-[#fdda36]/10 rounded-full px-2 py-0.5">
                    {line.sets} {txt.sets} × {line.primary_value || line.reps}{' '}
                    {metricLabel(line.primary_metric, language)}
                    {line.secondary_value && ` @ ${line.secondary_value} ${metricLabel(line.secondary_metric, language)}`}
                    {line.rest_seconds ? (
                      <>
                        <span className="text-gray-400 mx-0.5">·</span>
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-500 dark:text-gray-400">{line.rest_seconds}s</span>
                      </>
                    ) : null}
                  </span>
                ))
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[#514163] dark:text-[#fdda36] bg-[#fdda36]/10 rounded-full px-2 py-0.5">
                  {exercise.sets} {txt.sets} × {exercise.primary_value || exercise.reps}{' '}
                  {metricLabel(exercise.primary_metric, language)}
                  {exercise.secondary_value && ` @ ${exercise.secondary_value} ${metricLabel(exercise.secondary_metric, language)}`}
                  {exercise.rest_seconds > 0 && (
                    <>
                      <span className="text-gray-400 mx-0.5">·</span>
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-500 dark:text-gray-400">{exercise.rest_seconds}s</span>
                    </>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info bar: video thumbnail | Last | Working Max + calculator */}
      <div className="mx-4 mb-3 flex items-stretch rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60">
        {exercise.link ? (
          <button
            type="button"
            onClick={() => onOpenVideo(exercise.link!, exercise.name, exercise.description)}
            className="shrink-0 w-[72px] relative overflow-hidden bg-gray-900 hover:brightness-110 transition-all"
          >
            {getYouTubeThumbnail(exercise.link) ? (
              <img
                src={getYouTubeThumbnail(exercise.link)!}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800" />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center">
                <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
              </div>
            </div>
          </button>
        ) : (
          <div className="shrink-0 w-[72px] flex items-center justify-center bg-gray-200 dark:bg-gray-700/60">
            <Dumbbell className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>
        )}
        <div className="flex flex-1 divide-x divide-gray-200 dark:divide-gray-700 min-w-0">
          <div className="flex-1 px-3 py-2.5 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">
              {language === 'es' ? 'Ultima vez' : 'Last'}
            </p>
            {lastPerf ? (
              <p className="text-sm font-bold text-gray-800 dark:text-white leading-tight">
                {lastPerf.weight}<span className="text-xs font-normal text-gray-500 ml-0.5">kg</span>
                <span className="text-gray-400 mx-1">×</span>
                {lastPerf.reps}<span className="text-xs font-normal text-gray-500 ml-0.5">reps</span>
              </p>
            ) : (
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500">No data</p>
            )}
          </div>
          <div className="flex-1 px-3 py-2.5 min-w-0 flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => athleteId && setShowWorkingMaxModal(true)}
              className="min-w-0 text-left hover:opacity-75 transition-opacity"
              disabled={!athleteId}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">
                Working Max
              </p>
              {workingMax ? (
                <p className={`text-sm font-bold text-[#514163] dark:text-[#fdda36] leading-tight ${!workingMaxIsEstimated ? 'underline decoration-dotted underline-offset-2' : ''}`}>
                  {workingMaxIsEstimated ? '~' : ''}{workingMax}<span className="text-xs font-normal text-gray-500 ml-0.5">kg</span>
                </p>
              ) : (
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500">No data</p>
              )}
            </button>
            <button
              type="button"
              onClick={onOpenStrengthEstimator}
              className="shrink-0 w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-[#fdda36]/30 dark:hover:bg-[#fdda36]/20 transition-colors"
              title={language === 'es' ? 'Calculadora 1RM' : '1RM Calculator'}
            >
              <Calculator className="w-3.5 h-3.5 text-[#514163] dark:text-gray-300" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[280px] text-xs">
            <thead>
              <tr className="text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                <th className="text-left py-1.5 px-1 w-10">{txt.set}</th>
                <th className="text-center py-1.5 px-1">{txt.reps}</th>
                <th className="text-center py-1.5 px-1">{txt.weight}</th>
                <th className="text-center py-1.5 px-1 w-12">{txt.rir}</th>
                <th className="text-center py-1.5 px-1 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: totalSets }, (_, i) => {
                const setNum = i + 1;
                const tracking = getTracking(setNum);
                return (
                  <tr
                    key={setNum}
                    className={`border-t border-gray-100 dark:border-gray-700/40 ${tracking.completed ? 'opacity-50' : ''}`}
                  >
                    <td className="py-2 px-1">
                      <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-medium text-xs">
                        {setNum}
                      </span>
                    </td>
                    <td className="py-2 px-1">
                      <input
                        type="number"
                        min="0"
                        value={tracking.reps ?? ''}
                        onChange={(e) => onUpdateTracking(exercise.id, setNum, 'reps', e.target.value ? Number(e.target.value) : undefined)}
                        placeholder={String(exercise.primary_value || exercise.reps || '–')}
                        className="w-full text-center bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/40 rounded-lg py-1.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-[#514163] dark:focus:border-[#fdda36]/60 transition-colors placeholder-gray-300 dark:placeholder-gray-600"
                      />
                    </td>
                    <td className="py-2 px-1">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={tracking.weight ?? ''}
                        onChange={(e) => onUpdateTracking(exercise.id, setNum, 'weight', e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="0"
                        className="w-full text-center bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/40 rounded-lg py-1.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-[#514163] dark:focus:border-[#fdda36]/60 transition-colors placeholder-gray-300 dark:placeholder-gray-600"
                      />
                    </td>
                    <td className="py-2 px-1">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={tracking.rir ?? ''}
                        onChange={(e) => onUpdateTracking(exercise.id, setNum, 'rir', e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="–"
                        className="w-full text-center bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/40 rounded-lg py-1.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-[#514163] dark:focus:border-[#fdda36]/60 transition-colors placeholder-gray-300 dark:placeholder-gray-600"
                      />
                    </td>
                    <td className="py-2 px-1 text-center">
                      <button
                        onClick={() => {
                          onUpdateTracking(exercise.id, setNum, 'completed', !tracking.completed);
                          if (!tracking.completed && exercise.rest_seconds > 0) {
                            onStartTimer(exercise.rest_seconds);
                          }
                        }}
                        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                          tracking.completed
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                        }`}
                      >
                        {tracking.completed && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showWorkingMaxModal && athleteId && (
        <WorkingMaxModal
          exerciseName={exercise.name}
          athleteId={athleteId}
          currentMax={workingMax}
          onClose={() => setShowWorkingMaxModal(false)}
        />
      )}
    </div>
  );
}

export default function WorkoutSessionScreen({
  workout,
  exercises,
  setTracking,
  onUpdateTracking,
  onComplete,
  onPause,
  workoutStartTime,
  onSetWorkoutStartTime,
  onDismiss,
}: WorkoutSessionScreenProps) {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const [sectionIndex, setSectionIndex] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showStrengthEstimator, setShowStrengthEstimator] = useState(false);
  const [showVBT, setShowVBT] = useState(false);
  const [showCMJ, setShowCMJ] = useState(false);
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [showTimerHub, setShowTimerHub] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [videoModal, setVideoModal] = useState<{ url: string; name: string; description?: string } | null>(null);

  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?]+)/);
    return videoId ? `https://www.youtube.com/embed/${videoId[1]}` : null;
  };

  const sections = groupIntoSections(exercises);
  const currentSection = sections[sectionIndex];
  const isLastSection = sectionIndex >= sections.length - 1;

  useEffect(() => {
    if (!workoutStartTime) onSetWorkoutStartTime(Date.now());
    const startMs = workoutStartTime || Date.now();
    elapsedRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startMs) / 1000));
    }, 1000);
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current); };
  }, []);

  const formatElapsed = () => {
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleAdvance = () => {
    if (isLastSection) {
      setShowFeedback(true);
    } else {
      setSectionIndex((i) => i + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const txt = {
    section: language === 'es' ? 'Sección' : 'Section',
    of: language === 'es' ? 'de' : 'of',
    next: language === 'es' ? 'Siguiente sección' : 'Next section',
    finish: language === 'es' ? 'Terminar entrenamiento' : 'Finish workout',
    jump: language === 'es' ? 'Iniciar Jump Assessment' : 'Start Jump Assessment',
    skip: language === 'es' ? 'Saltar evaluación' : 'Skip assessment',
    pause: language === 'es' ? 'Pausar y salir' : 'Pause & exit',
    exercises: language === 'es' ? 'ejercicios' : 'exercises',
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-950 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <button
          onClick={onPause}
          className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-body hidden sm:inline text-gray-600 dark:text-gray-400">{txt.pause}</span>
        </button>

        <div className="flex-1 flex flex-col items-center px-4">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white font-heading truncate max-w-[200px]">
            {workout?.workouts?.name || workout?.name || 'Workout'}
          </h2>
          <div className="flex items-center gap-1.5 mt-1">
            {sections.map((_, i) => (
              <button
                key={i}
                onClick={() => setSectionIndex(i)}
                className={`transition-all rounded-full ${
                  i === sectionIndex
                    ? 'w-4 h-2 bg-[#fdda36]'
                    : i < sectionIndex
                    ? 'w-2 h-2 bg-[#fdda36]/40'
                    : 'w-2 h-2 bg-gray-300 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg px-2 py-1">
          <Clock className="w-3 h-3" />
          <span className="font-mono">{formatElapsed()}</span>
        </div>
      </div>

      {/* Floating tool buttons */}
      <div className="absolute right-3 top-20 flex flex-col gap-2 z-10">
        <button
          onClick={() => setShowVBT(true)}
          className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shadow-md hover:border-[#514163] dark:hover:border-[#fdda36]/40 hover:shadow-lg transition-all"
          title={language === 'es' ? 'Velocidad de barra' : 'Bar Velocity'}
        >
          <Zap className="w-[18px] h-[18px] text-[#514163] dark:text-gray-300" />
        </button>
      </div>

      {/* Main scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-32">
        {/* Section header */}
        {currentSection?.title ? (
          <div className="mb-5">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#fdda36]/30" />
              <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest font-body">
                {txt.section} {sectionIndex + 1} {txt.of} {sections.length}
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#fdda36]/30" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white font-heading mt-2 text-center">
              {currentSection.title}
            </h3>
            <p className="text-xs text-gray-400 text-center mt-1 font-body">
              {currentSection.exercises.length} {txt.exercises}
            </p>
          </div>
        ) : (
          <div className="mb-4 flex items-center gap-2">
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
            <span className="text-xs text-gray-400 font-body">
              {txt.section} {sectionIndex + 1} {txt.of} {sections.length}
            </span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
          </div>
        )}

        {/* Assessment section special UI */}
        {currentSection?.isAssessment ? (
          <div className="space-y-4">
            <div className="bg-[#fdda36]/10 border border-[#fdda36]/30 rounded-2xl p-6 text-center">
              <Activity className="w-12 h-12 text-[#514163] dark:text-[#fdda36] mx-auto mb-3" />
              <h4 className="text-lg font-bold text-gray-900 dark:text-white font-heading mb-1">
                {language === 'es' ? 'Evaluación de salto CMJ' : 'CMJ Jump Assessment'}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-body mb-5">
                {language === 'es'
                  ? 'Mide tu potencia neuromuscular con el Counter Movement Jump'
                  : 'Measure neuromuscular power with the Counter Movement Jump test'}
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setShowCMJ(true)}
                  className="flex items-center justify-center gap-2 py-3 px-6 bg-[#fdda36] hover:bg-[#f5cf25] text-gray-900 rounded-2xl font-semibold font-body transition-colors"
                >
                  <Activity className="w-5 h-5" />
                  {txt.jump}
                </button>
                <button
                  onClick={handleAdvance}
                  className="flex items-center justify-center gap-2 py-2.5 px-6 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-medium font-body transition-colors text-sm"
                >
                  <SkipForward className="w-4 h-4" />
                  {txt.skip}
                </button>
              </div>
            </div>

            {currentSection.exercises.length > 0 && (
              <div className="space-y-3">
                {currentSection.exercises.map((exercise, i) => (
                  <ExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    exerciseIndex={i}
                    setTracking={setTracking}
                    onUpdateTracking={onUpdateTracking}
                    onStartTimer={setRestTimer}
                    language={language}
                    athleteId={profile?.id}
                    onOpenVideo={(url, name, desc) => setVideoModal({ url, name, description: desc })}
                    onOpenStrengthEstimator={() => setShowStrengthEstimator(true)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {currentSection?.exercises.map((exercise, i) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                exerciseIndex={i}
                setTracking={setTracking}
                onUpdateTracking={onUpdateTracking}
                onStartTimer={setRestTimer}
                language={language}
                athleteId={profile?.id}
                onOpenVideo={(url, name, desc) => setVideoModal({ url, name, description: desc })}
                onOpenStrengthEstimator={() => setShowStrengthEstimator(true)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom navigation — 3 zones */}
      <div className="shrink-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg">
        <div className="flex items-stretch h-[72px] px-3 gap-2">
          {/* Back arrow */}
          <button
            onClick={() => {
              if (sectionIndex > 0) {
                setSectionIndex((i) => i - 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            disabled={sectionIndex === 0}
            className={`flex flex-col items-center justify-center gap-0.5 w-[72px] rounded-2xl transition-all ${
              sectionIndex === 0
                ? 'opacity-30 cursor-not-allowed'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95'
            }`}
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
              {language === 'es' ? 'Anterior' : 'Back'}
            </span>
          </button>

          {/* Timer hub — center */}
          <button
            onClick={() => setShowTimerHub(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#fdda36]/20 to-[#fdda36]/5 border-2 border-[#fdda36]/40 flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#514163] dark:text-[#fdda36]" />
              </div>
            </div>
            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Timer
            </span>
          </button>

          {/* Next / Finish arrow */}
          <button
            onClick={handleAdvance}
            className={`flex flex-col items-center justify-center gap-0.5 w-[72px] rounded-2xl transition-all active:scale-95 ${
              isLastSection
                ? 'bg-green-600 hover:bg-green-500 text-white'
                : 'hover:bg-[#fdda36]/10 dark:hover:bg-[#fdda36]/10'
            }`}
          >
            {isLastSection ? (
              <>
                <Check className="w-5 h-5" />
                <span className="text-[10px] font-semibold">
                  {language === 'es' ? 'Terminar' : 'Finish'}
                </span>
              </>
            ) : (
              <>
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                  {language === 'es' ? 'Siguiente' : 'Next'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modals */}
      {showTimerHub && (
        <TimerHub
          onClose={() => setShowTimerHub(false)}
          language={language}
          plannedRestSeconds={
            currentSection?.exercises
              .map(e => e.rest_seconds)
              .filter(s => s > 0)[0] || 60
          }
        />
      )}

      {restTimer !== null && (
        <RestTimerSelector
          onClose={() => setRestTimer(null)}
          language={language}
          initialSeconds={restTimer}
        />
      )}

      {showFeedback && (
        <PostTrainingFeedbackModal
          isOpen={showFeedback}
          onClose={() => { setShowFeedback(false); if (onDismiss) onDismiss(); }}
          onSubmit={async (feedback) => {
            await onComplete(feedback);
          }}
          onSkip={() => {
            setShowFeedback(false);
            onComplete({ rpe: 5, energy_level: 'normal', pain_level: 'none', mood: 'normal', feedback_notes: '' });
            if (onDismiss) onDismiss();
          }}
          workoutData={(() => {
            let totalVolume = 0;
            let bestSet: { exercise: string; weight: number; reps: number } | null = null;
            let completedSets = 0;
            const completedExercises = new Set<string>();

            for (const exercise of exercises) {
              const maxSets = getTotalSets(exercise);
              for (let setNum = 1; setNum <= maxSets; setNum++) {
                const key = `${exercise.workout_exercise_id}-${setNum}`;
                const tracking = setTracking[key];
                if (tracking?.reps && tracking?.weight) {
                  totalVolume += tracking.reps * tracking.weight;
                  completedSets++;
                  completedExercises.add(exercise.workout_exercise_id);
                  if (!bestSet || tracking.weight > bestSet.weight || (tracking.weight === bestSet.weight && tracking.reps > bestSet.reps)) {
                    bestSet = { exercise: exercise.name, weight: tracking.weight, reps: tracking.reps };
                  }
                }
              }
            }

            const durationMinutes = workoutStartTime
              ? Math.round((Date.now() - workoutStartTime) / 60000)
              : 60;

            return {
              date: workout?.scheduled_date || new Date().toISOString().split('T')[0],
              duration: durationMinutes,
              totalVolume,
              bestSet,
              exerciseCount: completedExercises.size,
              setCount: completedSets,
              workoutName: workout?.workouts?.name || workout?.name || undefined,
            };
          })()}
        />
      )}

      {showStrengthEstimator && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-screen px-4 py-8 flex items-start justify-center">
            <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-700 p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white font-heading">
                  {language === 'es' ? 'Calculadora 1RM' : '1RM Calculator'}
                </h3>
                <button onClick={() => setShowStrengthEstimator(false)} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <StrengthEstimator
                isOpen={true}
                exerciseId=""
                exerciseName=""
                onClose={() => setShowStrengthEstimator(false)}
              />
            </div>
          </div>
        </div>
      )}

      {showVBT && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-screen px-4 py-8 flex items-start justify-center">
            <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-700 p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white font-heading">
                  {language === 'es' ? 'Velocidad de barra' : 'Bar Velocity'}
                </h3>
                <button onClick={() => setShowVBT(false)} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <BarVelocityTracker onClose={() => setShowVBT(false)} />
            </div>
          </div>
        </div>
      )}

      {showCMJ && (
        <div className="fixed inset-0 z-[60] bg-gray-50 dark:bg-gray-950 overflow-y-auto">
          <div className="min-h-screen px-4 py-8">
            <CMJAssessment onClose={() => { setShowCMJ(false); handleAdvance(); }} />
          </div>
        </div>
      )}

      {videoModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75"
          onClick={() => setVideoModal(null)}
        >
          <div
            className="relative w-full max-w-2xl bg-gray-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-gray-950 shrink-0">
              <span className="text-white font-semibold text-sm truncate pr-4">{videoModal.name}</span>
              <button
                onClick={() => setVideoModal(null)}
                className="shrink-0 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {(() => {
              const embedUrl = getYouTubeEmbedUrl(videoModal.url);
              if (embedUrl) {
                return (
                  <div className="aspect-video w-full shrink-0">
                    <iframe
                      src={embedUrl}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                );
              }
              return (
                <div className="aspect-video w-full shrink-0 flex flex-col items-center justify-center gap-4 bg-gray-800 p-6">
                  <Play className="w-12 h-12 text-white/40" />
                  <p className="text-white/60 text-sm text-center">
                    {language === 'es' ? 'Este video no puede mostrarse aqui.' : 'This video cannot be displayed here.'}
                  </p>
                  <a
                    href={videoModal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-[#fdda36] text-gray-900 rounded-lg text-sm font-medium hover:bg-[#fdda36]/90 transition-colors"
                  >
                    {language === 'es' ? 'Abrir en nueva pestana' : 'Open in new tab'}
                  </a>
                </div>
              );
            })()}

            {videoModal.description && (
              <div className="overflow-y-auto px-5 py-4 shrink border-t border-white/10">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  {language === 'es' ? 'Descripcion del ejercicio' : 'Exercise description'}
                </p>
                <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
                  {videoModal.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RestTimerSelector({
  onClose,
  language,
  initialSeconds,
}: {
  onClose: () => void;
  language: string;
  initialSeconds: number;
}) {
  const [custom, setCustom] = useState(initialSeconds > 0 ? initialSeconds : 60);
  const [started, setStarted] = useState(initialSeconds > 0);

  if (started) {
    return <RestTimer seconds={custom} onClose={onClose} />;
  }

  const presets = [30, 60, 90, 120, 180, 240];

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <p className="font-semibold text-gray-900 dark:text-white font-heading">
            {language === 'es' ? 'Temporizador de descanso' : 'Rest timer'}
          </p>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {presets.map((s) => (
            <button
              key={s}
              onClick={() => { setCustom(s); setStarted(true); }}
              className={`py-2.5 rounded-xl text-sm font-semibold font-body transition-all border ${
                custom === s
                  ? 'bg-[#fdda36]/20 border-[#fdda36]/50 text-[#514163] dark:text-[#fdda36]'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {s >= 60 ? `${s / 60}:00` : `${s}s`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 mb-4">
          <input
            type="number"
            min="5"
            max="600"
            value={custom}
            onChange={(e) => setCustom(Number(e.target.value))}
            className="flex-1 text-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 text-gray-900 dark:text-white font-mono text-lg focus:outline-none focus:border-[#514163] dark:focus:border-[#fdda36]/60"
          />
          <span className="text-sm text-gray-400 font-body">{language === 'es' ? 'seg' : 'sec'}</span>
        </div>
        <button
          onClick={() => setStarted(true)}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#fdda36] hover:bg-[#f5cf25] text-gray-900 rounded-2xl font-bold font-body transition-colors"
        >
          <Play className="w-4 h-4" />
          {language === 'es' ? 'Iniciar' : 'Start'}
        </button>
      </div>
    </div>
  );
}

type TimerHubTab = 'rest' | 'stopwatch' | 'interval';

function TimerHub({
  onClose,
  language,
  plannedRestSeconds,
}: {
  onClose: () => void;
  language: string;
  plannedRestSeconds: number;
}) {
  const [tab, setTab] = useState<TimerHubTab>('rest');

  const tabs: { id: TimerHubTab; labelEs: string; labelEn: string; icon: React.ReactNode }[] = [
    { id: 'rest', labelEs: 'Descanso', labelEn: 'Rest', icon: <Timer className="w-4 h-4" /> },
    { id: 'stopwatch', labelEs: 'Cronometro', labelEn: 'Stopwatch', icon: <RefreshCw className="w-4 h-4" /> },
    { id: 'interval', labelEs: 'Intervalos', labelEn: 'Interval', icon: <Repeat className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-t-3xl sm:rounded-3xl w-full max-w-sm shadow-2xl pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <p className="font-semibold text-gray-900 dark:text-white font-heading text-base">
            {language === 'es' ? 'Temporizadores' : 'Timers'}
          </p>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 px-4 pt-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                tab === t.id
                  ? 'bg-[#fdda36]/20 text-[#514163] dark:text-[#fdda36] border border-[#fdda36]/50'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
              }`}
            >
              {t.icon}
              {language === 'es' ? t.labelEs : t.labelEn}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="px-5 py-4">
          {tab === 'rest' && <RestTimerTab language={language} plannedRestSeconds={plannedRestSeconds} />}
          {tab === 'stopwatch' && <StopwatchTab language={language} />}
          {tab === 'interval' && <IntervalTab language={language} />}
        </div>
      </div>
    </div>
  );
}

function RestTimerTab({ language, plannedRestSeconds }: { language: string; plannedRestSeconds: number }) {
  const [seconds, setSeconds] = useState(plannedRestSeconds > 0 ? plannedRestSeconds : 60);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running && remaining !== null && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r === null || r <= 1) {
            setRunning(false);
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, remaining]);

  const start = (s: number) => {
    setSeconds(s);
    setRemaining(s);
    setRunning(true);
  };

  const reset = () => {
    setRunning(false);
    setRemaining(null);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const presets = [30, 60, 90, 120, 180, 240];
  const total = seconds || 1;
  const rem = remaining ?? seconds;
  const pct = Math.max(0, Math.min(1, rem / total));
  const r = 42;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  const mins = Math.floor(rem / 60);
  const secs = rem % 60;

  if (running || (remaining !== null && remaining === 0)) {
    return (
      <div className="flex flex-col items-center gap-5 py-2">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-gray-100 dark:text-gray-800" />
            <circle
              cx="50" cy="50" r={r} fill="none"
              stroke={remaining === 0 ? '#22c55e' : '#fdda36'}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ}`}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold font-mono text-gray-900 dark:text-white tabular-nums">
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </span>
            {remaining === 0 && (
              <span className="text-xs font-semibold text-green-500">{language === 'es' ? 'Listo!' : 'Done!'}</span>
            )}
          </div>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-2xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          {language === 'es' ? 'Reiniciar' : 'Reset'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {plannedRestSeconds > 0 && (
        <button
          onClick={() => start(plannedRestSeconds)}
          className="w-full flex items-center justify-between px-4 py-3 bg-[#fdda36]/15 border border-[#fdda36]/40 rounded-2xl hover:bg-[#fdda36]/25 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-[#514163] dark:text-[#fdda36]" />
            <span className="text-sm font-semibold text-gray-800 dark:text-white">
              {language === 'es' ? 'Descanso planificado' : 'Planned rest'}
            </span>
          </div>
          <span className="text-sm font-bold text-[#514163] dark:text-[#fdda36]">
            {plannedRestSeconds >= 60 ? `${Math.floor(plannedRestSeconds / 60)}:${String(plannedRestSeconds % 60).padStart(2, '0')}` : `${plannedRestSeconds}s`}
          </span>
        </button>
      )}
      <div className="grid grid-cols-3 gap-2">
        {presets.map((s) => (
          <button
            key={s}
            onClick={() => start(s)}
            className="py-2.5 rounded-xl text-sm font-semibold font-body bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-[#fdda36]/50 hover:bg-[#fdda36]/10 transition-all"
          >
            {s >= 60 ? `${s / 60}:00` : `${s}s`}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="number"
          min="5"
          max="600"
          value={seconds}
          onChange={(e) => setSeconds(Number(e.target.value))}
          className="flex-1 text-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 text-gray-900 dark:text-white font-mono text-lg focus:outline-none focus:border-[#fdda36]/60"
        />
        <span className="text-sm text-gray-400 shrink-0">{language === 'es' ? 'seg' : 'sec'}</span>
        <button
          onClick={() => start(seconds)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#fdda36] hover:bg-[#f5cf25] text-gray-900 rounded-xl font-bold text-sm transition-colors shrink-0"
        >
          <Play className="w-4 h-4" />
          {language === 'es' ? 'Iniciar' : 'Start'}
        </button>
      </div>
    </div>
  );
}

function StopwatchTab({ language }: { language: string }) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);
  const baseRef = useRef<number>(0);

  useEffect(() => {
    if (running) {
      startRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        setElapsed(baseRef.current + Math.floor((Date.now() - startRef.current) / 1000));
      }, 200);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      baseRef.current = elapsed;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const reset = () => {
    setRunning(false);
    setElapsed(0);
    baseRef.current = 0;
  };

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl px-8 py-5 w-full text-center border border-gray-200 dark:border-gray-700">
        <span className="text-5xl font-bold font-mono text-gray-900 dark:text-white tabular-nums tracking-tight">
          {h > 0 && `${String(h).padStart(2, '0')}:`}{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
        </span>
      </div>
      <div className="flex gap-3 w-full">
        <button
          onClick={() => setRunning((r) => !r)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 ${
            running
              ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
              : 'bg-[#fdda36] hover:bg-[#f5cf25] text-gray-900'
          }`}
        >
          {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {running ? (language === 'es' ? 'Pausar' : 'Pause') : (language === 'es' ? 'Iniciar' : 'Start')}
        </button>
        <button
          onClick={reset}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function IntervalTab({ language }: { language: string }) {
  const [rounds, setRounds] = useState(5);
  const [workSecs, setWorkSecs] = useState(40);
  const [restSecs, setRestSecs] = useState(20);

  const [running, setRunning] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [phase, setPhase] = useState<'work' | 'rest' | 'done'>('work');
  const [remaining, setRemaining] = useState(workSecs);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSecondsPerRound = workSecs + restSecs;

  const start = () => {
    setRunning(true);
    setCurrentRound(1);
    setPhase('work');
    setRemaining(workSecs);
  };

  const reset = () => {
    setRunning(false);
    setPhase('work');
    setCurrentRound(1);
    setRemaining(workSecs);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r > 1) return r - 1;
        setPhase((p) => {
          if (p === 'work') {
            setRemaining(restSecs);
            return 'rest';
          } else {
            setCurrentRound((cr) => {
              if (cr >= rounds) {
                setRunning(false);
                setPhase('done');
                setRemaining(0);
                return cr;
              }
              setRemaining(workSecs);
              setPhase('work');
              return cr + 1;
            });
            return 'rest';
          }
        });
        return r;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, workSecs, restSecs, rounds]);

  const phaseDuration = phase === 'work' ? workSecs : restSecs;
  const pct = phase === 'done' ? 0 : Math.max(0, Math.min(1, remaining / phaseDuration));
  const r = 42;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const phaseColor = phase === 'work' ? '#fdda36' : '#60a5fa';

  if (running || phase === 'done') {
    return (
      <div className="flex flex-col items-center gap-4 py-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
            phase === 'work' ? 'bg-[#fdda36]/20 text-[#514163] dark:text-[#fdda36]' :
            phase === 'rest' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
            'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
          }`}>
            {phase === 'work' ? (language === 'es' ? 'Trabajo' : 'Work') :
             phase === 'rest' ? (language === 'es' ? 'Descanso' : 'Rest') :
             (language === 'es' ? 'Completado!' : 'Done!')}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            {language === 'es' ? `Vuelta ${currentRound} / ${rounds}` : `Round ${currentRound} / ${rounds}`}
          </span>
        </div>

        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-gray-100 dark:text-gray-800" />
            <circle
              cx="50" cy="50" r={r} fill="none"
              stroke={phase === 'done' ? '#22c55e' : phaseColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ}`}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold font-mono text-gray-900 dark:text-white tabular-nums">
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </span>
            {phase !== 'done' && (
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                {language === 'es' ? 'siguiente' : 'next'}: {phase === 'work'
                  ? `${language === 'es' ? 'desc' : 'rest'} ${restSecs}s`
                  : `${language === 'es' ? 'trab' : 'work'} ${workSecs}s`}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2 w-full">
          {phase !== 'done' && (
            <button
              onClick={() => setRunning((r) => !r)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {running ? (language === 'es' ? 'Pausar' : 'Pause') : (language === 'es' ? 'Reanudar' : 'Resume')}
            </button>
          )}
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-center">
            {language === 'es' ? 'Vueltas' : 'Rounds'}
          </label>
          <input
            type="number"
            min="1"
            max="50"
            value={rounds}
            onChange={(e) => setRounds(Math.max(1, Number(e.target.value)))}
            className="w-full text-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 text-gray-900 dark:text-white font-mono font-bold text-base focus:outline-none focus:border-[#fdda36]/60"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[#514163] dark:text-[#fdda36] text-center">
            {language === 'es' ? 'Trabajo (s)' : 'Work (s)'}
          </label>
          <input
            type="number"
            min="5"
            max="600"
            value={workSecs}
            onChange={(e) => setWorkSecs(Math.max(5, Number(e.target.value)))}
            className="w-full text-center bg-[#fdda36]/10 border border-[#fdda36]/40 rounded-xl py-2.5 text-gray-900 dark:text-white font-mono font-bold text-base focus:outline-none focus:border-[#fdda36]/70"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400 text-center">
            {language === 'es' ? 'Descanso (s)' : 'Rest (s)'}
          </label>
          <input
            type="number"
            min="0"
            max="300"
            value={restSecs}
            onChange={(e) => setRestSecs(Math.max(0, Number(e.target.value)))}
            className="w-full text-center bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl py-2.5 text-gray-900 dark:text-white font-mono font-bold text-base focus:outline-none focus:border-blue-400"
          />
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-3 border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{language === 'es' ? 'Total de trabajo' : 'Total work'}: <strong className="text-gray-700 dark:text-gray-200">{rounds * workSecs}s</strong></span>
          <span>{language === 'es' ? 'Total' : 'Total'}: <strong className="text-gray-700 dark:text-gray-200">{Math.floor(rounds * totalSecondsPerRound / 60)}:{String(rounds * totalSecondsPerRound % 60).padStart(2, '0')}</strong></span>
        </div>
      </div>

      <button
        onClick={start}
        className="w-full flex items-center justify-center gap-2 py-3 bg-[#fdda36] hover:bg-[#f5cf25] text-gray-900 rounded-2xl font-bold text-sm transition-colors active:scale-95"
      >
        <Play className="w-4 h-4" />
        {language === 'es' ? 'Iniciar intervalos' : 'Start intervals'}
      </button>
    </div>
  );
}
