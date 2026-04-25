import { RotateCcw, Timer, Trash2, Play, Layers } from 'lucide-react';

interface CircuitExerciseItem {
  exercise_id: string;
  exercise_name: string;
  exercise_link?: string;
  reps: string;
  notes: string;
  order_index: number;
}

interface CircuitBlockProps {
  circuit_id: string;
  circuit_name: string;
  circuit_type: string;
  rounds: number;
  amrap_minutes: number;
  exercises: CircuitExerciseItem[];
  section_title?: string;
  onDelete: () => void;
  language: string;
}

export default function CircuitBlock({
  circuit_name,
  circuit_type,
  rounds,
  amrap_minutes,
  exercises,
  onDelete,
  language,
}: CircuitBlockProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-[#514163]/30 dark:border-[#fdda36]/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#514163]/5 dark:bg-[#fdda36]/5 border-b border-[#514163]/20 dark:border-[#fdda36]/20">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-[#514163] dark:bg-[#fdda36] rounded-lg">
            <Layers className="w-4 h-4 text-white dark:text-[#514163]" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">{circuit_name}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              {circuit_type === 'amrap' ? (
                <>
                  <Timer className="w-3 h-3 text-orange-500" />
                  <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                    AMRAP {amrap_minutes} {language === 'es' ? 'minutos' : 'minutes'}
                  </span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-3 h-3 text-blue-500" />
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {rounds} {language === 'es' ? 'rondas' : 'rounds'}
                  </span>
                </>
              )}
              <span className="text-gray-400 dark:text-gray-500">•</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {exercises.length} {language === 'es' ? 'ejercicios' : 'exercises'}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          title={language === 'es' ? 'Eliminar circuito' : 'Remove circuit'}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Exercises list */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
        {exercises
          .sort((a, b) => a.order_index - b.order_index)
          .map((ex, idx) => (
            <div key={idx} className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-white bg-[#514163] dark:bg-[#fdda36] dark:text-[#514163] rounded-full flex-shrink-0 text-[10px]">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{ex.exercise_name}</p>
                {ex.notes && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{ex.notes}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                  × {ex.reps}
                </span>
                {ex.exercise_link && (
                  <a
                    href={ex.exercise_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-gray-400 hover:text-[#514163] dark:hover:text-[#fdda36] transition-colors"
                    title={language === 'es' ? 'Ver video' : 'Watch video'}
                    onClick={e => e.stopPropagation()}
                  >
                    <Play className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* Footer summary */}
      <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700/50">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center font-medium">
          {circuit_type === 'amrap'
            ? (language === 'es'
                ? `Completar la mayor cantidad de rondas en ${amrap_minutes} minutos`
                : `Complete as many rounds as possible in ${amrap_minutes} minutes`)
            : (language === 'es'
                ? `Completar el circuito ${rounds} ${rounds === 1 ? 'vez' : 'veces'}`
                : `Complete the circuit ${rounds} ${rounds === 1 ? 'time' : 'times'}`)}
        </p>
      </div>
    </div>
  );
}
