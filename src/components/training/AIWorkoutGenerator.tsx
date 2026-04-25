import { useState } from 'react';
import { X, Sparkles, Loader2, Save, ChevronDown, ChevronUp, Check, RefreshCw, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface AISetLine {
  sets: number;
  reps: string;
  primary_value: string;
  primary_metric: string;
  secondary_value?: string;
  secondary_metric?: string;
  rest_seconds: number;
  rir?: number;
  notes?: string;
}

interface AIWorkoutExercise {
  exercise_id: string;
  exercise_name: string;
  set_lines: AISetLine[];
  primary_metric: string;
  secondary_metric?: string;
  notes: string;
  order_index: number;
  section_tag?: string;
}

interface GeneratedWorkout {
  name: string;
  description: string;
  exercises: AIWorkoutExercise[];
  week?: number;
  day?: number;
}

interface AIWorkoutGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  onWorkoutSaved: () => void;
}

const MUSCLE_FOCUS_OPTIONS = [
  { value: 'legs', labelEs: 'Piernas', labelEn: 'Legs' },
  { value: 'push', labelEs: 'Empuje (Pecho/Hombros/Tric)', labelEn: 'Push (Chest/Shoulders/Tri)' },
  { value: 'pull', labelEs: 'Jalon (Espalda/Biceps)', labelEn: 'Pull (Back/Biceps)' },
  { value: 'upper', labelEs: 'Tren Superior', labelEn: 'Upper Body' },
  { value: 'lower', labelEs: 'Tren Inferior', labelEn: 'Lower Body' },
  { value: 'full_body', labelEs: 'Cuerpo Completo', labelEn: 'Full Body' },
  { value: 'back', labelEs: 'Espalda', labelEn: 'Back' },
  { value: 'chest', labelEs: 'Pecho', labelEn: 'Chest' },
];

const SESSION_TYPES = [
  { value: 'hypertrophy', labelEs: 'Hipertrofia (6-12 reps)', labelEn: 'Hypertrophy (6-12 reps)' },
  { value: 'strength', labelEs: 'Fuerza (1-5 reps, carga alta)', labelEn: 'Strength (1-5 reps, heavy load)' },
  { value: 'power', labelEs: 'Potencia (explosivo)', labelEn: 'Power (explosive)' },
  { value: 'endurance', labelEs: 'Resistencia muscular (15+ reps)', labelEn: 'Muscular Endurance (15+ reps)' },
];

const DURATION_OPTIONS = [45, 60, 75, 90];

const BLOCK_WEEKS_OPTIONS = [
  { value: 0, labelEs: '1 sesion', labelEn: '1 session' },
  { value: 1, labelEs: '1 semana', labelEn: '1 week' },
  { value: 2, labelEs: '2 semanas', labelEn: '2 weeks' },
  { value: 4, labelEs: '4 semanas', labelEn: '4 weeks' },
];

const SESSIONS_PER_WEEK_OPTIONS = [1, 2, 3, 4, 5, 6];

const SECTION_CONFIG: Record<string, { labelEs: string; labelEn: string; color: string; bgColor: string; borderColor: string }> = {
  mobility: {
    labelEs: 'Movilidad & Stretching',
    labelEn: 'Mobility & Stretching',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  warmup: {
    labelEs: 'Circuito de Calentamiento',
    labelEn: 'Warm-Up Circuit',
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  main_work: {
    labelEs: 'Trabajo Principal',
    labelEn: 'Main Work',
    color: 'text-gray-900 dark:text-white',
    bgColor: 'bg-gray-50 dark:bg-gray-700/50',
    borderColor: 'border-gray-200 dark:border-gray-700',
  },
  secondary_work: {
    labelEs: 'Trabajo Secundario',
    labelEn: 'Secondary Work',
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-50 dark:bg-gray-700/30',
    borderColor: 'border-gray-200 dark:border-gray-700',
  },
};

function getSectionLabel(tag: string | undefined, language: string): string {
  if (!tag) return '';
  const cfg = SECTION_CONFIG[tag];
  if (!cfg) return tag;
  return language === 'es' ? cfg.labelEs : cfg.labelEn;
}

function WorkoutPreview({ workout, language }: { workout: GeneratedWorkout; language: string }) {
  const [expandedExercises, setExpandedExercises] = useState<Set<number>>(new Set([0, 1, 2, 3]));

  const toggleExercise = (idx: number) => {
    setExpandedExercises(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const sections = ['mobility', 'warmup', 'main_work', 'secondary_work'];
  const grouped: Record<string, AIWorkoutExercise[]> = {};
  sections.forEach(s => { grouped[s] = []; });

  workout.exercises.forEach(ex => {
    const tag = ex.section_tag || 'main_work';
    if (!grouped[tag]) grouped[tag] = [];
    grouped[tag].push(ex);
  });

  const globalIdx = (tag: string, localIdx: number) => {
    let offset = 0;
    for (const s of sections) {
      if (s === tag) return offset + localIdx;
      offset += grouped[s].length;
    }
    return localIdx;
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">{workout.name}</h3>
            {workout.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{workout.description}</p>
            )}
          </div>
          <span className="flex-shrink-0 text-xs bg-[#fdda36] text-[#514163] px-2 py-0.5 rounded-full font-bold">
            {workout.exercises.length} {language === 'es' ? 'ejercicios' : 'exercises'}
          </span>
        </div>
      </div>

      {sections.map(tag => {
        const exercises = grouped[tag];
        if (!exercises || exercises.length === 0) return null;
        const cfg = SECTION_CONFIG[tag];
        const label = getSectionLabel(tag, language);

        return (
          <div key={tag}>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${cfg.bgColor} border ${cfg.borderColor} mb-2`}>
              <span className={`text-xs font-bold uppercase tracking-wide ${cfg.color}`}>{label}</span>
              <span className={`text-xs ${cfg.color} opacity-70`}>· {exercises.length} {language === 'es' ? 'ejercicios' : 'exercises'}</span>
            </div>
            <div className="space-y-1.5 pl-1">
              {exercises.map((ex, localIdx) => {
                const gIdx = globalIdx(tag, localIdx);
                return (
                  <div key={gIdx} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleExercise(gIdx)}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          tag === 'mobility' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                          tag === 'warmup' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                          tag === 'main_work' ? 'bg-[#514163] text-white' :
                          'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                        }`}>
                          {localIdx + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white text-sm">{ex.exercise_name}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {ex.set_lines.reduce((t, l) => t + l.sets, 0)} {language === 'es' ? 'series' : 'sets'}
                          </p>
                        </div>
                      </div>
                      {expandedExercises.has(gIdx) ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    </button>

                    {expandedExercises.has(gIdx) && (
                      <div className="p-3 space-y-1.5 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                        {ex.set_lines.map((line, lineIdx) => (
                          <div key={lineIdx} className="flex items-center gap-2 text-sm bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                            <span className="font-bold text-gray-900 dark:text-white min-w-[60px]">
                              {line.sets} × {line.primary_value}
                            </span>
                            <span className="text-gray-400 text-xs">{line.primary_metric}</span>
                            {line.secondary_value && (
                              <span className="font-semibold text-[#514163] dark:text-[#fdda36] text-xs">
                                @ {line.secondary_value} {line.secondary_metric}
                              </span>
                            )}
                            <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
                              {line.rir !== undefined && line.rir !== null && <span>RIR {line.rir}</span>}
                              {line.rest_seconds > 0 && <span>{line.rest_seconds}s</span>}
                              {line.notes && <span className="italic">{line.notes}</span>}
                            </div>
                          </div>
                        ))}
                        {ex.notes && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 italic px-1 pt-0.5">{ex.notes}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MiniCalendar({ value, onChange, language }: { value: string; onChange: (d: string) => void; language: string }) {
  const today = new Date();
  const initial = value ? new Date(value + 'T00:00:00') : today;
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const selected = value ? new Date(value + 'T00:00:00') : null;

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString(
    language === 'es' ? 'es-ES' : 'en-US',
    { month: 'long', year: 'numeric' }
  );

  const dayHeaders = language === 'es'
    ? ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do']
    : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const startOffset = (firstDay + 6) % 7;
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (d: number) => {
    const t = new Date();
    return t.getFullYear() === viewYear && t.getMonth() === viewMonth && t.getDate() === d;
  };
  const isSelected = (d: number) => {
    if (!selected) return false;
    return selected.getFullYear() === viewYear && selected.getMonth() === viewMonth && selected.getDate() === d;
  };
  const isPast = (d: number) => {
    const dt = new Date(viewYear, viewMonth, d);
    dt.setHours(0, 0, 0, 0);
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return dt < t;
  };

  const handleSelect = (d: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    onChange(`${viewYear}-${mm}-${dd}`);
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <button type="button" onClick={prevMonth} className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 capitalize">{monthName}</span>
        <button type="button" onClick={nextMonth} className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>
      <div className="p-2">
        <div className="grid grid-cols-7 mb-1">
          {dayHeaders.map(h => (
            <div key={h} className="text-center text-[10px] font-semibold text-gray-400 dark:text-gray-500 py-1">{h}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const sel = isSelected(d);
            const tod = isToday(d);
            const past = isPast(d);
            return (
              <button
                key={i}
                type="button"
                onClick={() => !past && handleSelect(d)}
                className={`w-full aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all
                  ${sel ? 'bg-[#514163] text-white shadow-sm' : ''}
                  ${!sel && tod ? 'border border-[#514163] dark:border-[#fdda36] text-[#514163] dark:text-[#fdda36] font-bold' : ''}
                  ${!sel && !tod && past ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : ''}
                  ${!sel && !tod && !past ? 'text-gray-700 dark:text-gray-300 hover:bg-[#514163]/10 dark:hover:bg-[#fdda36]/10 cursor-pointer' : ''}
                `}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function AIWorkoutGenerator({
  isOpen,
  onClose,
  selectedDate,
  onWorkoutSaved,
}: AIWorkoutGeneratorProps) {
  const { language } = useLanguage();
  const { profile } = useAuth();

  const [muscleFocus, setMuscleFocus] = useState<string[]>([]);
  const [sessionType, setSessionType] = useState('hypertrophy');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [blockWeeks, setBlockWeeks] = useState<number>(1);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [startDate, setStartDate] = useState<string>(selectedDate);

  const [generating, setGenerating] = useState(false);
  const [generatedWorkout, setGeneratedWorkout] = useState<GeneratedWorkout | null>(null);
  const [generatedWorkouts, setGeneratedWorkouts] = useState<GeneratedWorkout[]>([]);
  const [isMultiMode, setIsMultiMode] = useState(false);
  const [activeWorkoutIndex, setActiveWorkoutIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState('');

  const toggleMuscleFocus = (value: string) => {
    setMuscleFocus(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const isSingleSession = blockWeeks === 0;
  const effectiveWeeks = isSingleSession ? 1 : blockWeeks;
  const totalSessions = isSingleSession ? 1 : effectiveWeeks * sessionsPerWeek;

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setGeneratedWorkout(null);
    setGeneratedWorkouts([]);
    setSaved(false);
    setActiveWorkoutIndex(0);

    if (totalSessions > 1) {
      setGeneratingProgress(language === 'es'
        ? `Generando plan de ${totalSessions} sesiones (${sessionsPerWeek}x/semana × ${effectiveWeeks} sem)...`
        : `Generating ${totalSessions}-session plan (${sessionsPerWeek}x/week × ${effectiveWeeks} wks)...`
      );
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-ai-workout', {
        body: {
          muscle_focus: muscleFocus.length > 0 ? muscleFocus : undefined,
          session_type: sessionType,
          duration_minutes: durationMinutes,
          block_weeks: effectiveWeeks,
          sessions_per_week: isSingleSession ? 1 : sessionsPerWeek,
          available_equipment: 'full_gym',
          language,
        },
      });

      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || 'Generation failed');

      if (data.mode === 'multi') {
        setIsMultiMode(true);
        setGeneratedWorkouts(data.workouts || []);
      } else {
        setIsMultiMode(false);
        setGeneratedWorkout(data.workout);
      }
    } catch (err: any) {
      console.error('AI workout generation error:', err);
      setError(
        language === 'es'
          ? 'Error generando el entrenamiento. Por favor, intentalo de nuevo.'
          : 'Error generating workout. Please try again.'
      );
    } finally {
      setGenerating(false);
      setGeneratingProgress('');
    }
  };

  const saveWorkout = async (workout: GeneratedWorkout, date: string) => {
    if (!profile?.id) throw new Error('No profile');

    const { data: w, error: wErr } = await supabase
      .from('workouts')
      .insert({
        name: workout.name,
        description: workout.description,
        trainer_id: profile.id,
      })
      .select()
      .single();

    if (wErr) throw wErr;

    const exercisesToInsert: any[] = [];
    workout.exercises.forEach((ex, exerciseIndex) => {
      ex.set_lines.forEach((line, lineIndex) => {
        exercisesToInsert.push({
          workout_id: w.id,
          exercise_id: ex.exercise_id,
          sets: line.sets,
          reps: line.reps,
          primary_value: line.primary_value ?? line.reps,
          secondary_value: line.secondary_value ?? null,
          rest_seconds: line.rest_seconds,
          notes: lineIndex === 0 ? ex.notes : '',
          superset_group: null,
          order_index: exerciseIndex * 100 + lineIndex,
          primary_metric: ex.primary_metric,
          secondary_metric: ex.secondary_metric ?? null,
          section_title: ex.section_tag
            ? getSectionLabel(ex.section_tag, language)
            : null,
        });
      });
    });

    if (exercisesToInsert.length > 0) {
      const { error: exErr } = await supabase.from('workout_exercises').insert(exercisesToInsert);
      if (exErr) throw exErr;
    }

    const { error: assignErr } = await supabase.from('athlete_workouts').insert({
      athlete_id: profile.id,
      trainer_id: (profile as any).assigned_trainer_id || null,
      workout_id: w.id,
      scheduled_date: date,
      assignment_type: 'individual',
      status: 'pending',
    });

    if (assignErr) throw assignErr;
  };

  const getDateForSession = (weekNum: number, dayNum: number): string => {
    const base = new Date(startDate + 'T00:00:00');
    const weekOffset = (weekNum - 1) * 7;
    const dayOffset = dayNum - 1;
    const d = new Date(base);
    d.setDate(d.getDate() + weekOffset + dayOffset);
    return d.toISOString().split('T')[0];
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isMultiMode && generatedWorkouts.length > 0) {
        for (const w of generatedWorkouts) {
          const date = getDateForSession(w.week || 1, w.day || 1);
          await saveWorkout(w, date);
        }
      } else if (generatedWorkout) {
        await saveWorkout(generatedWorkout, startDate);
      }

      setSaved(true);
      onWorkoutSaved();
      setTimeout(() => { handleClose(); }, 1500);
    } catch (err: any) {
      console.error('Error saving AI workout:', err);
      setError(
        language === 'es'
          ? 'Error guardando el entrenamiento.'
          : 'Error saving workout.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setGeneratedWorkout(null);
    setGeneratedWorkouts([]);
    setIsMultiMode(false);
    setError(null);
    setSaved(false);
    setMuscleFocus([]);
    setSessionType('hypertrophy');
    setDurationMinutes(60);
    setBlockWeeks(1);
    setSessionsPerWeek(3);
    setStartDate(selectedDate);
    setGenerating(false);
    setActiveWorkoutIndex(0);
    onClose();
  };

  if (!isOpen) return null;

  const displayDate = new Date(startDate + 'T00:00:00').toLocaleDateString(
    language === 'es' ? 'es-ES' : 'en-US',
    { weekday: 'long', month: 'long', day: 'numeric' }
  );

  const hasResult = isMultiMode ? generatedWorkouts.length > 0 : !!generatedWorkout;
  const activeWorkout = isMultiMode ? generatedWorkouts[activeWorkoutIndex] : generatedWorkout;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">

        <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#514163] to-[#3a2f4a] rounded-xl flex items-center justify-center shadow-md">
                <Sparkles className="w-5 h-5 text-[#fdda36]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {language === 'es' ? 'Generar con IA' : 'Generate with AI'}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {language === 'es' ? 'Generador de entrenamientos inteligente' : 'Intelligent workout generator'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {!hasResult && !generating && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'es' ? 'Enfoque muscular' : 'Muscle focus'}
                </label>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                  {language === 'es' ? 'Opcional — la IA selecciona automaticamente' : 'Optional — AI auto-selects if none chosen'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {MUSCLE_FOCUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleMuscleFocus(opt.value)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        muscleFocus.includes(opt.value)
                          ? 'bg-[#514163] text-white shadow-md scale-105'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {language === 'es' ? opt.labelEs : opt.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Tipo de sesion' : 'Session type'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SESSION_TYPES.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setSessionType(type.value)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 text-left transition-all ${
                        sessionType === type.value
                          ? 'border-[#514163] bg-[#514163]/5 dark:bg-[#514163]/15'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        sessionType === type.value ? 'border-[#514163] bg-[#514163]' : 'border-gray-400 dark:border-gray-500'
                      }`}>
                        {sessionType === type.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {language === 'es' ? type.labelEs : type.labelEn}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Duracion objetivo' : 'Target duration'}
                </label>
                <div className="flex gap-2">
                  {DURATION_OPTIONS.map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                        durationMinutes === mins
                          ? 'bg-[#514163] text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'es' ? 'Sesiones por semana' : 'Sessions per week'}
                </label>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                  {language === 'es'
                    ? 'La IA genera un entrenamiento distinto por cada sesion'
                    : 'AI generates a different workout for each session'}
                </p>
                <div className="flex gap-2">
                  {SESSIONS_PER_WEEK_OPTIONS.map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setSessionsPerWeek(n)}
                      className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                        sessionsPerWeek === n
                          ? 'bg-[#514163] text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {n}x
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'es' ? 'Fecha de inicio del bloque' : 'Block start date'}
                </label>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                  {language === 'es'
                    ? 'La semana 1 arranca desde este dia.'
                    : 'Week 1 starts from this day.'}
                </p>
                <MiniCalendar value={startDate} onChange={setStartDate} language={language} />
                {startDate && (
                  <p className="mt-2 text-xs text-[#514163] dark:text-[#fdda36] font-semibold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {language === 'es' ? 'Inicia el ' : 'Starting '}{displayDate}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'es' ? 'Duracion del bloque' : 'Training block length'}
                </label>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                  {language === 'es'
                    ? 'La IA ajusta la periodizacion segun la fase del bloque'
                    : 'AI adjusts periodization based on block phase'}
                </p>
                <div className="flex gap-2">
                  {BLOCK_WEEKS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setBlockWeeks(opt.value)}
                      className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                        blockWeeks === opt.value
                          ? 'bg-[#514163] text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {language === 'es' ? opt.labelEs : opt.labelEn}
                    </button>
                  ))}
                </div>
                {totalSessions > 1 && startDate && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-[#514163] dark:text-[#fdda36] font-medium bg-[#514163]/5 dark:bg-[#fdda36]/10 rounded-lg px-3 py-2">
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>
                      {(() => {
                        const endD = new Date(startDate + 'T00:00:00');
                        endD.setDate(endD.getDate() + effectiveWeeks * 7 - 1);
                        const endStr = endD.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' });
                        const startStr = new Date(startDate + 'T00:00:00').toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' });
                        return language === 'es'
                          ? `${totalSessions} entrenamientos del ${startStr} al ${endStr}`
                          : `${totalSessions} workouts from ${startStr} to ${endStr}`;
                      })()}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  {language === 'es'
                    ? 'Cada sesion incluye movilidad, circuito de calentamiento, trabajo principal y trabajo secundario. La IA analizara tu historial, niveles de RPE, wellness y la biblioteca de ejercicios.'
                    : 'Each session includes mobility, warm-up circuit, main work, and secondary work. AI will analyze your history, RPE levels, wellness, and exercise library.'}
                </p>
              </div>
            </>
          )}

          {generating && (
            <div className="py-16 text-center">
              <div className="w-16 h-16 border-4 border-[#514163]/20 border-t-[#514163] rounded-full animate-spin mx-auto mb-6" />
              <p className="text-gray-700 dark:text-gray-300 font-semibold text-lg">
                {language === 'es' ? 'Generando entrenamientos...' : 'Generating workouts...'}
              </p>
              {generatingProgress && (
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">{generatingProgress}</p>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {totalSessions > 1
                  ? (language === 'es' ? `Esto puede tomar ${totalSessions * 10}-${totalSessions * 20} segundos` : `This may take ${totalSessions * 10}-${totalSessions * 20} seconds`)
                  : (language === 'es' ? 'Esto puede tomar 10-20 segundos' : 'This may take 10-20 seconds')
                }
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</p>
              <button
                onClick={() => { setError(null); setGeneratedWorkout(null); setGeneratedWorkouts([]); }}
                className="mt-2 text-xs text-red-600 dark:text-red-400 underline hover:no-underline"
              >
                {language === 'es' ? 'Volver a configurar' : 'Back to configuration'}
              </button>
            </div>
          )}

          {hasResult && !generating && (
            <div className="space-y-4">
              {isMultiMode && generatedWorkouts.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {language === 'es'
                        ? `${generatedWorkouts.length} entrenamientos generados`
                        : `${generatedWorkouts.length} workouts generated`}
                    </p>
                    <span className="text-xs text-gray-400">
                      {language === 'es'
                        ? `${sessionsPerWeek}x/sem × ${blockWeeks} semanas`
                        : `${sessionsPerWeek}x/week × ${blockWeeks} weeks`}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {generatedWorkouts.map((w, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveWorkoutIndex(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          activeWorkoutIndex === idx
                            ? 'bg-[#514163] text-white shadow-md'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {language === 'es' ? `S${w.week} D${w.day}` : `W${w.week} D${w.day}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeWorkout && <WorkoutPreview workout={activeWorkout} language={language} />}

              <button
                type="button"
                onClick={() => { setGeneratedWorkout(null); setGeneratedWorkouts([]); setError(null); setSaved(false); setIsMultiMode(false); }}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-[#514163] dark:hover:text-[#fdda36] transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {language === 'es' ? 'Cambiar configuracion y regenerar' : 'Change config and regenerate'}
              </button>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-5 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl">
          {saved && (
            <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-2 text-green-800 dark:text-green-300">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium text-sm">
                {isMultiMode
                  ? (language === 'es' ? `${generatedWorkouts.length} entrenamientos guardados exitosamente` : `${generatedWorkouts.length} workouts saved successfully`)
                  : (language === 'es' ? 'Entrenamiento guardado exitosamente' : 'Workout saved successfully')
                }
              </span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium text-sm"
            >
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </button>

            {!hasResult ? (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#514163] text-white rounded-xl hover:bg-[#3d3149] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold text-sm shadow-md"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {language === 'es' ? 'Generando...' : 'Generating...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {totalSessions > 1
                      ? (language === 'es' ? `Generar ${totalSessions} Entrenamientos` : `Generate ${totalSessions} Workouts`)
                      : (language === 'es' ? 'Generar Entrenamiento' : 'Generate Workout')
                    }
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || saved}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold text-sm shadow-md"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {language === 'es' ? 'Guardando...' : 'Saving...'}
                  </>
                ) : saved ? (
                  <>
                    <Check className="w-4 h-4" />
                    {language === 'es' ? 'Guardado' : 'Saved'}
                  </>
                ) : isMultiMode ? (
                  <>
                    <Save className="w-4 h-4" />
                    {language === 'es'
                      ? `Guardar ${generatedWorkouts.length} entrenamientos`
                      : `Save ${generatedWorkouts.length} workouts`}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {language === 'es' ? `Guardar para el ${displayDate}` : `Save for ${displayDate}`}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
