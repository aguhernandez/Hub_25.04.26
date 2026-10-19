/*
# Fix nutritional anamnesis save + professional read flow

1. Problem
- Athletes completing nutritional anamnesis get an error when saving.
- The NutritionAnamnesis component calls `supabase.from('nutrition_targets')
  .upsert({ ... }, { onConflict: 'athlete_id' })` but there is NO unique
  constraint on `nutrition_targets.athlete_id` — only a non-unique btree index.
  PostgreSQL requires a unique constraint or unique index for ON CONFLICT to
  work, so the upsert fails with:
  "there is no unique or exclusion constraint matching the ON CONFLICT specification"
- There are also duplicate rows in nutrition_targets for one athlete
  (athlete 52f841ac... has 2 rows). These must be deduplicated before the
  unique constraint can be added.

2. Fix — Schema
- Deduplicate nutrition_targets: keep the most recently updated row per
  athlete_id, delete older duplicates.
- Replace the non-unique index with a UNIQUE index/constraint on athlete_id
  so that ON CONFLICT (athlete_id) DO UPDATE works correctly.

3. Security
- No RLS policy changes. The existing policies already allow:
  - Athletes to INSERT/UPDATE/DELETE their own `nutrition_anamnesis` rows.
  - Athletes to manage their own `nutrition_targets` rows.
  - Trainers, nutritionists, and head coaches to SELECT (read) anamnesis and
    targets for athletes assigned to them.
- No new tables or columns.
*/

-- 1. Deduplicate nutrition_targets: delete older duplicates, keep latest
DELETE FROM nutrition_targets
WHERE id NOT IN (
  SELECT DISTINCT ON (athlete_id) id
  FROM nutrition_targets
  ORDER BY athlete_id, updated_at DESC
);

-- 2. Drop the old non-unique index and create a unique one
DROP INDEX IF EXISTS idx_nutrition_targets_athlete;
CREATE UNIQUE INDEX idx_nutrition_targets_athlete_unique
  ON public.nutrition_targets (athlete_id);

-- 3. Add formal unique constraint so ON CONFLICT (athlete_id) can match it
ALTER TABLE public.nutrition_targets
  ADD CONSTRAINT nutrition_targets_athlete_id_unique UNIQUE (athlete_id);
