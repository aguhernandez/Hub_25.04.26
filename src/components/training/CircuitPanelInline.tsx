import { useState, useEffect } from 'react';
import { Plus, Trash2, Search, Play, RotateCcw, Timer, MoveUp, MoveDown, Save, Layers, X, Check, BookOpen } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getExerciseName } from '../../utils/exerciseI18n';

interface Exercise {
  id: string;
  exercise: string;
  exercise_en?: string | null;
  exercise_es?: string | null;
  category?: string;
  type?: string;
  equipment?: string;
  link?: string;
}

interface CircuitExerciseItem {
  exercise_id: string;
  exercise_name: string;
  exercise_link?: string;
  reps: string;
  notes: string;
  order_index: number;
}

interface Section {
  id: string;
  title: string;
  emoji: string;
  color: string;
  isEditing: boolean;
}

interface CircuitPanelInlineProps {
  language: string;
  exercises: Exercise[];
  sections: Section[];
  selectedSection: string;
  onCircuitAdded: (circuit: {
    circuit_id: string;
    circuit_name: string;
    circuit_type: string;
    rounds: number;
    amrap_minutes: number;
    exercises: CircuitExerciseItem[];
  }) => void;
}

type PanelView = 'create' | 'library';

export default function CircuitPanelInline({
  language,
  exercises,
  onCircuitAdded,
}: CircuitPanelInlineProps) {
  const { profile } = useAuth();
  const [view, setView] = useState<PanelView>('create');

  // Create form state
  const [circuitName, setCircuitName] = useState('');
  const [circuitDescription, setCircuitDescription] = useState('');
  const [circuitType, setCircuitType] = useState<'rounds' | 'amrap'>('rounds');
  const [rounds, setRounds] = useState(3);
  const [amrapMinutes, setAmrapMinutes] = useState(10);
  const [circuitExercises, setCircuitExercises] = useState<CircuitExerciseItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Exercise picker state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedExercise, setSelectedExercise] = useState('');
  const [selectedExerciseReps, setSelectedExerciseReps] = useState('10');
  const [showVideoFor, setShowVideoFor] = useState<string | null>(null);

  // Library state
  const [savedCircuits, setSavedCircuits] = useState<any[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [savingOnly, setSavingOnly] = useState(false);
  const [saveOnlySuccess, setSaveOnlySuccess] = useState(false);

  useEffect(() => {
    if (view === 'library') loadCircuitLibrary();
  }, [view]);

  const loadCircuitLibrary = async () => {
    setLoadingLibrary(true);
    const { data } = await supabase
      .from('circuits')
      .select(`
        id, name, description, circuit_type, rounds, amrap_minutes, created_at,
        circuit_exercises (
          id, exercise_id, order_index, reps, notes,
          exercises (id, exercise, exercise_en, exercise_es, link)
        )
      `)
      .order('created_at', { ascending: false });
    setSavedCircuits(data || []);
    setLoadingLibrary(false);
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? `https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=1&rel=0` : null;
  };

  const addExerciseToCircuit = () => {
    if (!selectedExercise) return;
    const ex = exercises.find(e => e.id === selectedExercise);
    if (!ex) return;
    setCircuitExercises(prev => [
      ...prev,
      {
        exercise_id: ex.id,
        exercise_name: getExerciseName(ex, language),
        exercise_link: ex.link,
        reps: selectedExerciseReps,
        notes: '',
        order_index: prev.length,
      },
    ]);
    setSelectedExercise('');
    setSelectedExerciseReps('10');
    setSearchTerm('');
  };

  const removeExercise = (idx: number) =>
    setCircuitExercises(prev => prev.filter((_, i) => i !== idx).map((ex, i) => ({ ...ex, order_index: i })));

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const updated = [...circuitExercises];
    [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
    setCircuitExercises(updated.map((ex, i) => ({ ...ex, order_index: i })));
  };

  const moveDown = (idx: number) => {
    if (idx === circuitExercises.length - 1) return;
    const updated = [...circuitExercises];
    [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
    setCircuitExercises(updated.map((ex, i) => ({ ...ex, order_index: i })));
  };

  const updateField = (idx: number, field: 'reps' | 'notes', value: string) =>
    setCircuitExercises(prev => prev.map((ex, i) => i === idx ? { ...ex, [field]: value } : ex));

  const persistCircuit = async () => {
    setSaveError('');
    const { data: circuit, error: circuitError } = await supabase
      .from('circuits')
      .insert({
        name: circuitName.trim(),
        description: circuitDescription.trim(),
        circuit_type: circuitType,
        rounds,
        amrap_minutes: amrapMinutes,
        created_by: profile!.id,
      })
      .select()
      .single();

    if (circuitError) throw circuitError;

    const exRows = circuitExercises.map(ex => ({
      circuit_id: circuit.id,
      exercise_id: ex.exercise_id,
      order_index: ex.order_index,
      reps: ex.reps,
      notes: ex.notes,
    }));

    const { error: exError } = await supabase.from('circuit_exercises').insert(exRows);
    if (exError) throw exError;

    return circuit;
  };

  const saveAndAdd = async () => {
    if (!circuitName.trim() || circuitExercises.length === 0) return;
    setSaving(true);
    setSaveError('');
    try {
      const circuit = await persistCircuit();
      onCircuitAdded({
        circuit_id: circuit.id,
        circuit_name: circuit.name,
        circuit_type: circuitType,
        rounds,
        amrap_minutes: amrapMinutes,
        exercises: circuitExercises,
      });
      resetForm();
    } catch (err: any) {
      setSaveError(err.message || (language === 'es' ? 'Error al guardar' : 'Error saving'));
    } finally {
      setSaving(false);
    }
  };

  const saveOnly = async () => {
    if (!circuitName.trim() || circuitExercises.length === 0) return;
    setSavingOnly(true);
    setSaveError('');
    try {
      await persistCircuit();
      setSaveOnlySuccess(true);
      setTimeout(() => setSaveOnlySuccess(false), 2500);
      resetForm();
      setView('library');
      loadCircuitLibrary();
    } catch (err: any) {
      setSaveError(err.message || (language === 'es' ? 'Error al guardar' : 'Error saving'));
    } finally {
      setSavingOnly(false);
    }
  };

  const resetForm = () => {
    setCircuitName('');
    setCircuitDescription('');
    setCircuitType('rounds');
    setRounds(3);
    setAmrapMinutes(10);
    setCircuitExercises([]);
    setSaveError('');
  };

  const addExistingCircuit = (circuit: any) => {
    const exList: CircuitExerciseItem[] = (circuit.circuit_exercises || [])
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((ce: any, i: number) => ({
        exercise_id: ce.exercise_id,
        exercise_name: getExerciseName(ce.exercises, language),
        exercise_link: ce.exercises?.link,
        reps: ce.reps,
        notes: ce.notes || '',
        order_index: i,
      }));

    onCircuitAdded({
      circuit_id: circuit.id,
      circuit_name: circuit.name,
      circuit_type: circuit.circuit_type,
      rounds: circuit.rounds,
      amrap_minutes: circuit.amrap_minutes,
      exercises: exList,
    });
  };

  const filteredExercises = exercises.filter(ex => {
    const name = getExerciseName(ex, language).toLowerCase();
    return name.includes(searchTerm.toLowerCase()) && (!categoryFilter || ex.category === categoryFilter);
  });

  const selectedEx = exercises.find(e => e.id === selectedExercise);
  const embedUrl = selectedEx?.link ? getYouTubeEmbedUrl(selectedEx.link) : null;

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-700/50 rounded-xl">
        <button
          onClick={() => setView('create')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
            view === 'create'
              ? 'bg-white dark:bg-gray-800 text-[#514163] dark:text-[#fdda36] shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Plus className="w-4 h-4" />
          {language === 'es' ? 'Crear Circuito' : 'Create Circuit'}
        </button>
        <button
          onClick={() => setView('library')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
            view === 'library'
              ? 'bg-white dark:bg-gray-800 text-[#514163] dark:text-[#fdda36] shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          {language === 'es' ? 'Mis Circuitos' : 'My Circuits'}
        </button>
      </div>

      {view === 'create' ? (
        <div className="space-y-5">
          {/* Name + description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                {language === 'es' ? 'Nombre *' : 'Name *'}
              </label>
              <input
                type="text"
                value={circuitName}
                onChange={e => setCircuitName(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#fdda36]/50 focus:border-[#fdda36] outline-none transition"
                placeholder={language === 'es' ? 'Nombre del circuito' : 'Circuit name'}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                {language === 'es' ? 'Descripción' : 'Description'}
              </label>
              <input
                type="text"
                value={circuitDescription}
                onChange={e => setCircuitDescription(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#fdda36]/50 focus:border-[#fdda36] outline-none transition"
                placeholder={language === 'es' ? 'Descripción opcional' : 'Optional description'}
              />
            </div>
          </div>

          {/* Circuit type cards */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              {language === 'es' ? 'Tipo de Circuito' : 'Circuit Type'}
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Rounds */}
              <div
                onClick={() => setCircuitType('rounds')}
                className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
                  circuitType === 'rounds'
                    ? 'border-[#514163] dark:border-[#fdda36] bg-[#514163]/5 dark:bg-[#fdda36]/5'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`p-2 rounded-lg ${circuitType === 'rounds' ? 'bg-[#514163] dark:bg-[#fdda36]' : 'bg-gray-100 dark:bg-gray-700'}`}>
                    <RotateCcw className={`w-4 h-4 ${circuitType === 'rounds' ? 'text-white dark:text-[#514163]' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${circuitType === 'rounds' ? 'text-[#514163] dark:text-[#fdda36]' : 'text-gray-700 dark:text-gray-300'}`}>
                      {language === 'es' ? 'Rondas Fijas' : 'Fixed Rounds'}
                    </p>
                    <p className="text-xs text-gray-400">{language === 'es' ? 'Repetir X veces' : 'Repeat X times'}</p>
                  </div>
                </div>
                {circuitType === 'rounds' && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#514163]/20 dark:border-[#fdda36]/20">
                    <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">{language === 'es' ? 'Rondas:' : 'Rounds:'}</span>
                    <input
                      type="number"
                      value={rounds}
                      onChange={e => setRounds(Math.max(1, parseInt(e.target.value) || 1))}
                      onClick={e => e.stopPropagation()}
                      className="w-16 px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      min={1}
                    />
                  </div>
                )}
              </div>

              {/* AMRAP */}
              <div
                onClick={() => setCircuitType('amrap')}
                className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
                  circuitType === 'amrap'
                    ? 'border-orange-400 dark:border-orange-400 bg-orange-50 dark:bg-orange-900/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`p-2 rounded-lg ${circuitType === 'amrap' ? 'bg-orange-500' : 'bg-gray-100 dark:bg-gray-700'}`}>
                    <Timer className={`w-4 h-4 ${circuitType === 'amrap' ? 'text-white' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${circuitType === 'amrap' ? 'text-orange-600 dark:text-orange-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      AMRAP
                    </p>
                    <p className="text-xs text-gray-400">{language === 'es' ? 'Máximas rondas en tiempo' : 'Max rounds in time'}</p>
                  </div>
                </div>
                {circuitType === 'amrap' && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-orange-200 dark:border-orange-800">
                    <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">{language === 'es' ? 'Minutos:' : 'Minutes:'}</span>
                    <input
                      type="number"
                      value={amrapMinutes}
                      onChange={e => setAmrapMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                      onClick={e => e.stopPropagation()}
                      className="w-16 px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      min={1}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Add exercise section */}
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {language === 'es' ? 'Ejercicios del circuito' : 'Circuit exercises'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Left: search + pick */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder={language === 'es' ? 'Buscar ejercicio...' : 'Search exercise...'}
                    className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="">{language === 'es' ? 'Todas las categorías' : 'All categories'}</option>
                  {Array.from(new Set(exercises.map(e => e.category).filter(Boolean))).sort().map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <select
                  value={selectedExercise}
                  onChange={e => setSelectedExercise(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  size={5}
                >
                  <option value="">{language === 'es' ? 'Seleccionar...' : 'Select...'}</option>
                  {filteredExercises.map(ex => (
                    <option key={ex.id} value={ex.id}>{getExerciseName(ex, language)}</option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap font-medium">
                    {language === 'es' ? 'Reps/Duración:' : 'Reps/Duration:'}
                  </label>
                  <input
                    type="text"
                    value={selectedExerciseReps}
                    onChange={e => setSelectedExerciseReps(e.target.value)}
                    className="w-20 px-2 py-1.5 text-sm text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    placeholder="10"
                  />
                  <button
                    onClick={addExerciseToCircuit}
                    disabled={!selectedExercise}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#514163] text-white text-sm font-semibold rounded-lg hover:bg-[#6d5581] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {language === 'es' ? 'Añadir' : 'Add'}
                  </button>
                </div>
              </div>

              {/* Right: video preview */}
              <div>
                {selectedEx?.link ? (
                  <div className="rounded-xl overflow-hidden border-2 border-[#fdda36]">
                    <div className="relative aspect-video bg-gray-900">
                      {showVideoFor === selectedExercise && embedUrl ? (
                        <div className="relative w-full h-full">
                          <iframe src={embedUrl} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                          <button onClick={() => setShowVideoFor(null)} className="absolute top-2 right-2 p-1 bg-black/70 text-white rounded-full">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => setShowVideoFor(selectedExercise)}
                          className="w-full h-full bg-gradient-to-br from-[#514163] to-[#6d5581] flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity group"
                        >
                          <div className="text-center">
                            <Play className="w-10 h-10 text-white opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all mx-auto mb-1" />
                            <p className="text-white text-xs opacity-70">{language === 'es' ? 'Ver video' : 'Watch video'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900 px-3 py-1.5">
                      <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{getExerciseName(selectedEx, language)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 aspect-video flex flex-col items-center justify-center gap-2 bg-gray-50 dark:bg-gray-800/50">
                    <Layers className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                    <p className="text-xs text-gray-400">{language === 'es' ? 'Selecciona un ejercicio' : 'Select an exercise'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Added exercises list */}
          {circuitExercises.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {circuitExercises.length} {circuitExercises.length === 1 ? (language === 'es' ? 'ejercicio' : 'exercise') : (language === 'es' ? 'ejercicios' : 'exercises')}
                </p>
              </div>
              {circuitExercises.map((ex, idx) => (
                <div key={idx} className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveUp(idx)} disabled={idx === 0} className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors">
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => moveDown(idx)} disabled={idx === circuitExercises.length - 1} className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors">
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="w-6 h-6 flex items-center justify-center text-[10px] font-bold text-white bg-[#514163] dark:bg-[#fdda36] dark:text-[#514163] rounded-full flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{ex.exercise_name}</p>
                    <input
                      type="text"
                      value={ex.notes}
                      onChange={e => updateField(idx, 'notes', e.target.value)}
                      className="mt-1 w-full text-xs px-2 py-0.5 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400"
                      placeholder={language === 'es' ? 'Notas...' : 'Notes...'}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-xs text-gray-400">{language === 'es' ? 'x' : 'x'}</span>
                    <input
                      type="text"
                      value={ex.reps}
                      onChange={e => updateField(idx, 'reps', e.target.value)}
                      className="w-14 px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-semibold"
                    />
                  </div>
                  {ex.exercise_link && (
                    <a href={ex.exercise_link} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-300 hover:text-[#514163] dark:hover:text-[#fdda36] transition-colors">
                      <Play className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button onClick={() => removeExercise(idx)} className="p-1.5 text-red-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {saveError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
              {saveError}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center flex-1">
              {!circuitName.trim()
                ? (language === 'es' ? 'Escribe un nombre para el circuito' : 'Enter a circuit name')
                : circuitExercises.length === 0
                ? (language === 'es' ? 'Agrega al menos un ejercicio' : 'Add at least one exercise')
                : `${circuitExercises.length} ${language === 'es' ? 'ejercicios' : 'exercises'} · ${circuitType === 'amrap' ? `AMRAP ${amrapMinutes}min` : `${rounds} ${language === 'es' ? 'rondas' : 'rounds'}`}`
              }
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={saveOnly}
                disabled={savingOnly || !circuitName.trim() || circuitExercises.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:border-[#514163] dark:hover:border-[#fdda36] hover:text-[#514163] dark:hover:text-[#fdda36] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title={language === 'es' ? 'Guardar en biblioteca sin agregar al entrenamiento' : 'Save to library without adding to workout'}
              >
                {savingOnly ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : saveOnlySuccess ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <BookOpen className="w-4 h-4" />
                )}
                {language === 'es' ? 'Guardar en biblioteca' : 'Save to library'}
              </button>
              <button
                onClick={saveAndAdd}
                disabled={saving || !circuitName.trim() || circuitExercises.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#fdda36] text-[#514163] text-sm font-bold rounded-xl hover:bg-[#ffd51a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-[#514163] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {language === 'es' ? 'Guardar y Agregar al entrenamiento' : 'Save & Add to workout'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Library */
        <div className="space-y-3">
          {loadingLibrary ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-[#514163] dark:border-[#fdda36] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : savedCircuits.length === 0 ? (
            <div className="text-center py-16">
              <Layers className="w-12 h-12 mx-auto mb-3 text-gray-200 dark:text-gray-700" />
              <p className="text-sm text-gray-400">{language === 'es' ? 'No tienes circuitos guardados aún' : 'No saved circuits yet'}</p>
              <button
                onClick={() => setView('create')}
                className="mt-4 text-sm text-[#514163] dark:text-[#fdda36] font-medium hover:underline"
              >
                {language === 'es' ? 'Crear tu primer circuito' : 'Create your first circuit'}
              </button>
            </div>
          ) : (
            savedCircuits.map(circuit => (
              <div key={circuit.id} className="p-4 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-[#514163]/40 dark:hover:border-[#fdda36]/40 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">{circuit.name}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        circuit.circuit_type === 'amrap'
                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      }`}>
                        {circuit.circuit_type === 'amrap'
                          ? `AMRAP ${circuit.amrap_minutes}min`
                          : `${circuit.rounds} ${language === 'es' ? 'rondas' : 'rounds'}`}
                      </span>
                    </div>
                    {circuit.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{circuit.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(circuit.circuit_exercises || [])
                        .sort((a: any, b: any) => a.order_index - b.order_index)
                        .map((ce: any, i: number) => (
                          <span key={i} className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                            {getExerciseName(ce.exercises, language)} ×{ce.reps}
                          </span>
                        ))}
                    </div>
                  </div>
                  <button
                    onClick={() => addExistingCircuit(circuit)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-[#fdda36] text-[#514163] text-sm font-bold rounded-xl hover:bg-[#ffd51a] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    {language === 'es' ? 'Agregar' : 'Add'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
