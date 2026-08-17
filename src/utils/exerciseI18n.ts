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

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export interface BilingualSearchResult {
  matched: boolean;
  matchedLanguage: Language;
}

export function bilingualExerciseMatch(
  exercise: ExerciseI18nFields,
  query: string,
  uiLanguage: Language
): BilingualSearchResult {
  const trimmed = query.trim();
  if (!trimmed) return { matched: true, matchedLanguage: uiLanguage };

  const tokens = normalizeText(trimmed).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { matched: true, matchedLanguage: uiLanguage };

  const enName = normalizeText(exercise.exercise_en || exercise.exercise || '');
  const esName = normalizeText(exercise.exercise_es || exercise.exercise || '');

  const enMatch = tokens.every(token => enName.includes(token));
  const esMatch = tokens.every(token => esName.includes(token));

  if (enMatch && esMatch) return { matched: true, matchedLanguage: uiLanguage };
  if (enMatch) return { matched: true, matchedLanguage: 'en' };
  if (esMatch) return { matched: true, matchedLanguage: 'es' };

  return { matched: false, matchedLanguage: uiLanguage };
}

export function getExerciseNameForLanguage(exercise: ExerciseI18nFields, language: Language): string {
  if (language === 'es') {
    return exercise.exercise_es || exercise.exercise_en || exercise.exercise || '';
  }
  return exercise.exercise_en || exercise.exercise || '';
}
