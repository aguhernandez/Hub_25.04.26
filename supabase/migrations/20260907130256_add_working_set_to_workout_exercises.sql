/*
# Add working_set column to workout_exercises

1. New Columns
- `workout_exercises.working_set` (boolean, default false)
  - Marks a set line as a "working set" / "serie efectiva" so the athlete
    can distinguish it from warm-up or accessory sets during a session.

2. Modified Tables
- `workout_exercises` — added one nullable boolean column with default false.

3. Security
- No RLS policy changes. The column inherits the existing CRUD policies
  already defined on `workout_exercises`.

4. Important Notes
- The column is nullable with a default of `false` so existing rows and
  inserts that omit the field behave as before (not a working set).
- Backfill is not needed because the default covers all existing rows.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_exercises'
      AND column_name = 'working_set'
  ) THEN
    ALTER TABLE workout_exercises
      ADD COLUMN working_set boolean NOT NULL DEFAULT false;
  END IF;
END $$;
