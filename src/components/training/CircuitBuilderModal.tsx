import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Search, Play, RotateCcw, Timer, GripVertical, MoveUp, MoveDown, Save, Layers } from 'lucide-react';
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

interface CircuitBuilderModalProps {
  onClose: () => void;
  onCircuitAdded: (circuit: { circuit_id: string; circuit_name: string; circuit_type: string; rounds: number; amrap_minutes: number; exercises: CircuitExerciseItem[] }) => void;
  language: string;
  exercises: Exercise[];
}

export default function CircuitBuilderModal({ onClose, onCircuitAdded, language, exercises }: CircuitBuilderModalProps) {
  const { profile } = useAuth();
  const [circuitName, setCircuitName] = useState('');
  const [circuitDescription, setCircuitDescription] = useState('');
  const [circuitType, setCircuitType] = useState<'rounds' | 'amrap'>('rounds');
  const [rounds, setRounds] = useState(3);
  const [amrapMinutes, setAmrapMinutes] = useState(10);
  const [circuitExercises, setCircuitExercises] = useState<CircuitExerciseItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedExercise, setSelectedExercise] = useState('');
  const [selectedExerciseReps, setSelectedExerciseReps] = useState('10');
  const [saving, setSaving] = useState(false);
  const [savedCircuits, setSavedCircuits] = useState<any[]>([]);
  const [view, setView] = useState<'create' | 'library'>('create');
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [showVideoFor, setShowVideoFor] = useState<string | null>(null);

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
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return `https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=1&rel=0`;
    }
    return null;
  };

  const addExerciseToCircuit = () => {
    if (!selectedExercise) return;
    const ex = exercises.find(e => e.id === selectedExercise);
    if (!ex) return;
    const item: CircuitExerciseItem = {
      exercise_id: ex.id,
      exercise_name: getExerciseName(ex, language),
      exercise_link: ex.link,
      reps: selectedExerciseReps,
      notes: '',
      order_index: circuitExercises.length,
    };
    setCircuitExercises(prev => [...prev, item]);
    setSelectedExercise('');
    setSelectedExerciseReps('10');
  };

  const removeExercise = (idx: number) => {
    setCircuitExercises(prev => prev.filter((_, i) => i !== idx).map((ex, i) => ({ ...ex, order_index: i })));
  };

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

  const updateExerciseField = (idx: number, field: 'reps' | 'notes', value: string) => {
    setCircuitExercises(prev => prev.map((ex, i) => i === idx ? { ...ex, [field]: value } : ex));
  };

  const saveCircuit = async () => {
    if (!circuitName.trim() || circuitExercises.length === 0) return;
    setSaving(true);
    try {
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

      const exRows = circuitExercises.map((ex) => ({
        circuit_id: circuit.id,
        exercise_id: ex.exercise_id,
        order_index: ex.order_index,
        reps: ex.reps,
        notes: ex.notes,
      }));

      const { error: exError } = await supabase.from('circuit_exercises').insert(exRows);
      if (exError) throw exError;

      onCircuitAdded({
        circuit_id: circuit.id,
        circuit_name: circuit.name,
        circuit_type: circuitType,
        rounds,
        amrap_minutes: amrapMinutes,
        exercises: circuitExercises,
      });
      onClose();
    } catch (err: any) {
      console.error('Error saving circuit:', err);
    } finally {
      setSaving(false);
    }
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
    onClose();
  };

  const filteredExercises = exercises.filter(ex => {
    const name = getExerciseName(ex, language).toLowerCase();
    const matchSearch = name.includes(searchTerm.toLowerCase());
    const matchCat = !categoryFilter || ex.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const selectedEx = exercises.find(e => e.id === selectedExercise);
  const embedUrl = selectedEx?.link ? getYouTubeEmbedUrl(selectedEx.link) : null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#fdda36]/20 rounded-xl">
              <Layers className="w-6 h-6 text-[#514163] dark:text-[#fdda36]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {language === 'es' ? 'Circuito de Entrenamiento' : 'Training Circuit'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {language === 'es' ? 'Crea o selecciona un circuito' : 'Create or select a circuit'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selector */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
          <button
            onClick={() => setView('create')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${view === 'create' ? 'border-[#514163] dark:border-[#fdda36] text-[#514163] dark:text-[#fdda36]' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            {language === 'es' ? 'Crear Nuevo' : 'Create New'}
          </button>
          <button
            onClick={() => setView('library')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${view === 'library' ? 'border-[#514163] dark:border-[#fdda36] text-[#514163] dark:text-[#fdda36]' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            {language === 'es' ? 'Mis Circuitos' : 'My Circuits'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {view === 'create' ? (
            <div className="space-y-6">
              {/* Circuit details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'es' ? 'Nombre del Circuito' : 'Circuit Name'} *
                  </label>
                  <input
                    type="text"
                    value={circuitName}
                    onChange={e => setCircuitName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder={language === 'es' ? 'Ej: Circuito HIIT 30min' : 'E.g.: HIIT Circuit 30min'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'es' ? 'Descripción (opcional)' : 'Description (optional)'}
                  </label>
                  <input
                    type="text"
                    value={circuitDescription}
                    onChange={e => setCircuitDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder={language === 'es' ? 'Descripción breve...' : 'Brief description...'}
                  />
                </div>
              </div>

              {/* Circuit type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {language === 'es' ? 'Tipo de Circuito' : 'Circuit Type'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setCircuitType('rounds')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${circuitType === 'rounds' ? 'border-[#514163] dark:border-[#fdda36] bg-[#514163]/5 dark:bg-[#fdda36]/5' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${circuitType === 'rounds' ? 'bg-[#514163] dark:bg-[#fdda36]' : 'bg-gray-100 dark:bg-gray-800'}`}>
                        <RotateCcw className={`w-4 h-4 ${circuitType === 'rounds' ? 'text-white dark:text-[#514163]' : 'text-gray-500'}`} />
                      </div>
                      <span className={`font-semibold text-sm ${circuitType === 'rounds' ? 'text-[#514163] dark:text-[#fdda36]' : 'text-gray-700 dark:text-gray-300'}`}>
                        {language === 'es' ? 'Rondas fijas' : 'Fixed Rounds'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {language === 'es' ? 'Realizar el circuito X veces' : 'Complete the circuit X times'}
                    </p>
                    {circuitType === 'rounds' && (
                      <div className="mt-3 flex items-center gap-2">
                        <label className="text-xs text-gray-600 dark:text-gray-400">{language === 'es' ? 'Rondas:' : 'Rounds:'}</label>
                        <input
                          type="number"
                          value={rounds}
                          onChange={e => setRounds(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                          min={1}
                          onClick={e => e.stopPropagation()}
                        />
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => setCircuitType('amrap')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${circuitType === 'amrap' ? 'border-[#514163] dark:border-[#fdda36] bg-[#514163]/5 dark:bg-[#fdda36]/5' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${circuitType === 'amrap' ? 'bg-[#514163] dark:bg-[#fdda36]' : 'bg-gray-100 dark:bg-gray-800'}`}>
                        <Timer className={`w-4 h-4 ${circuitType === 'amrap' ? 'text-white dark:text-[#514163]' : 'text-gray-500'}`} />
                      </div>
                      <span className={`font-semibold text-sm ${circuitType === 'amrap' ? 'text-[#514163] dark:text-[#fdda36]' : 'text-gray-700 dark:text-gray-300'}`}>
                        AMRAP
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {language === 'es' ? 'La mayor cantidad de rondas en el tiempo planificado' : 'As many rounds as possible in the set time'}
                    </p>
                    {circuitType === 'amrap' && (
                      <div className="mt-3 flex items-center gap-2">
                        <label className="text-xs text-gray-600 dark:text-gray-400">{language === 'es' ? 'Minutos:' : 'Minutes:'}</label>
                        <input
                          type="number"
                          value={amrapMinutes}
                          onChange={e => setAmrapMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                          min={1}
                          onClick={e => e.stopPropagation()}
                        />
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* Add exercise to circuit */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {language === 'es' ? 'Agregar ejercicios al circuito' : 'Add exercises to circuit'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder={language === 'es' ? 'Buscar ejercicio...' : 'Search exercise...'}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
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
                    <div className="flex gap-2 items-center">
                      <label className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">{language === 'es' ? 'Reps:' : 'Reps:'}</label>
                      <input
                        type="text"
                        value={selectedExerciseReps}
                        onChange={e => setSelectedExerciseReps(e.target.value)}
                        className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        placeholder="10"
                      />
                      <button
                        onClick={addExerciseToCircuit}
                        disabled={!selectedExercise}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#514163] text-white text-sm font-medium rounded-lg hover:bg-[#6d5581] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        {language === 'es' ? 'Agregar' : 'Add'}
                      </button>
                    </div>
                  </div>

                  {/* Video preview */}
                  <div>
                    {selectedEx?.link ? (
                      <div className="rounded-xl overflow-hidden border-2 border-[#fdda36]">
                        <div className="relative aspect-video bg-gray-900">
                          {showVideoFor === selectedExercise && embedUrl ? (
                            <div className="relative w-full h-full">
                              <iframe
                                src={embedUrl}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                              <button
                                onClick={() => setShowVideoFor(null)}
                                className="absolute top-2 right-2 p-1 bg-black/70 text-white rounded-full"
                              >
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
                        <div className="bg-gray-50 dark:bg-gray-900 px-3 py-2">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                            {getExerciseName(selectedEx, language)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 aspect-video flex items-center justify-center">
                        <p className="text-xs text-gray-400">{language === 'es' ? 'Selecciona un ejercicio' : 'Select an exercise'}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Circuit exercise list */}
              {circuitExercises.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    {language === 'es' ? `Ejercicios del circuito (${circuitExercises.length})` : `Circuit exercises (${circuitExercises.length})`}
                  </h3>
                  <div className="space-y-2">
                    {circuitExercises.map((ex, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => moveUp(idx)} disabled={idx === 0} className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors">
                            <MoveUp className="w-3 h-3" />
                          </button>
                          <button onClick={() => moveDown(idx)} disabled={idx === circuitExercises.length - 1} className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors">
                            <MoveDown className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="w-6 h-6 flex items-center justify-center text-xs font-bold text-white bg-[#514163] dark:bg-[#fdda36] dark:text-[#514163] rounded-full flex-shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{ex.exercise_name}</p>
                          <input
                            type="text"
                            value={ex.notes}
                            onChange={e => updateExerciseField(idx, 'notes', e.target.value)}
                            className="mt-1 w-full text-xs px-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400"
                            placeholder={language === 'es' ? 'Notas opcionales...' : 'Optional notes...'}
                          />
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <label className="text-xs text-gray-500">{language === 'es' ? 'Reps' : 'Reps'}</label>
                          <input
                            type="text"
                            value={ex.reps}
                            onChange={e => updateExerciseField(idx, 'reps', e.target.value)}
                            className="w-14 px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                          />
                        </div>
                        {ex.exercise_link && (
                          <button
                            onClick={() => setShowVideoFor(showVideoFor === `circuit_${idx}` ? null : `circuit_${idx}`)}
                            className="p-1.5 text-gray-400 hover:text-[#514163] dark:hover:text-[#fdda36] transition-colors"
                            title={language === 'es' ? 'Ver video' : 'Watch video'}
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => removeExercise(idx)} className="p-1.5 text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Library view */
            <div>
              {loadingLibrary ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-6 h-6 border-2 border-[#514163] dark:border-[#fdda36] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : savedCircuits.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">{language === 'es' ? 'No hay circuitos guardados aún' : 'No circuits saved yet'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedCircuits.map(circuit => (
                    <div key={circuit.id} className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[#514163] dark:hover:border-[#fdda36] transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{circuit.name}</h4>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${circuit.circuit_type === 'amrap' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                              {circuit.circuit_type === 'amrap' ? `AMRAP ${circuit.amrap_minutes}min` : `${circuit.rounds} ${language === 'es' ? 'rondas' : 'rounds'}`}
                            </span>
                          </div>
                          {circuit.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{circuit.description}</p>
                          )}
                          <div className="flex flex-wrap gap-1">
                            {(circuit.circuit_exercises || [])
                              .sort((a: any, b: any) => a.order_index - b.order_index)
                              .map((ce: any, i: number) => (
                                <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                                  {getExerciseName(ce.exercises, language)} × {ce.reps}
                                </span>
                              ))}
                          </div>
                        </div>
                        <button
                          onClick={() => addExistingCircuit(circuit)}
                          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-[#fdda36] text-[#514163] text-sm font-semibold rounded-lg hover:bg-[#ffd51a] transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          {language === 'es' ? 'Usar' : 'Use'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {view === 'create' && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {circuitExercises.length === 0
                ? (language === 'es' ? 'Agrega al menos un ejercicio' : 'Add at least one exercise')
                : `${circuitExercises.length} ${language === 'es' ? 'ejercicios' : 'exercises'} • ${circuitType === 'amrap' ? `AMRAP ${amrapMinutes}min` : `${rounds} ${language === 'es' ? 'rondas' : 'rounds'}`}`
              }
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={saveCircuit}
                disabled={saving || !circuitName.trim() || circuitExercises.length === 0}
                className="flex items-center gap-2 px-5 py-2 bg-[#fdda36] text-[#514163] text-sm font-semibold rounded-lg hover:bg-[#ffd51a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-[#514163] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {language === 'es' ? 'Guardar y Agregar' : 'Save & Add'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
