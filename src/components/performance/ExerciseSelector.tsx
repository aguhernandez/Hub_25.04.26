import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface Exercise {
  id: string;
  name: string;
  category?: string;
  sessionCount: number;
}

interface ExerciseSelectorProps {
  exercises: Exercise[];
  selectedExercise: string | null;
  onSelectExercise: (exerciseId: string, exerciseName: string) => void;
}

export default function ExerciseSelector({
  exercises,
  selectedExercise,
  onSelectExercise
}: ExerciseSelectorProps) {
  const { language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredExercises = useMemo(() => {
    const exercisesWithStats = exercises.filter(ex => ex.sessionCount > 0);
    const exercisesWithoutStats = exercises.filter(ex => ex.sessionCount === 0);

    if (!searchTerm.trim()) {
      return [
        ...exercisesWithStats.sort((a, b) => b.sessionCount - a.sessionCount),
        ...exercisesWithoutStats.sort((a, b) => a.name.localeCompare(b.name))
      ];
    }

    const term = searchTerm.toLowerCase();
    const filteredWithStats = exercisesWithStats.filter(ex =>
      ex.name.toLowerCase().includes(term) ||
      ex.category?.toLowerCase().includes(term)
    );
    const filteredWithoutStats = exercisesWithoutStats.filter(ex =>
      ex.name.toLowerCase().includes(term) ||
      ex.category?.toLowerCase().includes(term)
    );

    return [
      ...filteredWithStats.sort((a, b) => b.sessionCount - a.sessionCount),
      ...filteredWithoutStats.sort((a, b) => a.name.localeCompare(b.name))
    ];
  }, [exercises, searchTerm]);

  const selectedExerciseName = useMemo(() => {
    const exercise = exercises.find(ex => ex.id === selectedExercise);
    return exercise?.name || (language === 'es' ? 'Seleccionar ejercicio...' : 'Select exercise...');
  }, [exercises, selectedExercise, language]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (exercise: Exercise) => {
    onSelectExercise(exercise.id, exercise.name);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-gray-800 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg hover:border-[#fdda36] dark:hover:border-[#fdda36] transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 mb-1">
            {language === 'es' ? 'Ejercicio' : 'Exercise'}
          </div>
          <div className="text-sm font-medium text-gray-900 dark:text-white dark:text-white truncate">
            {selectedExerciseName}
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={language === 'es' ? 'Buscar ejercicio...' : 'Search exercise...'}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 text-gray-900 dark:text-white dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#fdda36] text-sm"
                autoFocus
              />
            </div>
          </div>

          {/* Exercise List */}
          <div className="max-h-80 overflow-y-auto">
            {filteredExercises.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 dark:text-gray-400">
                <p className="text-sm">
                  {language === 'es'
                    ? 'No se encontraron ejercicios'
                    : 'No exercises found'}
                </p>
              </div>
            ) : (
              <div className="py-2">
                {filteredExercises.map((exercise, index) => {
                  const prevExercise = index > 0 ? filteredExercises[index - 1] : null;
                  const showDivider = prevExercise && prevExercise.sessionCount > 0 && exercise.sessionCount === 0;

                  return (
                    <div key={exercise.id}>
                      {showDivider && (
                        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
                          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">
                            {language === 'es' ? 'Otros ejercicios' : 'Other exercises'}
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => handleSelect(exercise)}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                          selectedExercise === exercise.id
                            ? 'bg-[#fdda36]/10 border-l-4 border-[#fdda36]'
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-white dark:text-white truncate">
                              {exercise.name}
                            </div>
                            {exercise.category && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-0.5">
                                {exercise.category}
                              </div>
                            )}
                          </div>
                          {exercise.sessionCount > 0 && (
                            <div className="ml-3 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 dark:bg-gray-700 px-2 py-1 rounded">
                              <span className="font-medium">{exercise.sessionCount}</span>
                              <span>{language === 'es' ? 'sesiones' : 'sessions'}</span>
                            </div>
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
