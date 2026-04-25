type Language = 'en' | 'es';

export interface ExerciseI18nFields {
  exercise?: string | null;
  exercise_en?: string | null;
  exercise_es?: string | null;
  description?: string | null;
  description_en?: string | null;
  description_es?: string | null;
}

export function getExerciseName(exercise: ExerciseI18nFields | null | undefined, language: Language): string {
  if (!exercise) return '';
  if (language === 'es') {
    return exercise.exercise_es || exercise.exercise_en || exercise.exercise || '';
  }
  return exercise.exercise_en || exercise.exercise || '';
}

export function getExerciseDescription(exercise: ExerciseI18nFields | null | undefined, language: Language): string {
  if (!exercise) return '';
  if (language === 'es') {
    return exercise.description_es || exercise.description_en || exercise.description || '';
  }
  return exercise.description_en || exercise.description || '';
}
