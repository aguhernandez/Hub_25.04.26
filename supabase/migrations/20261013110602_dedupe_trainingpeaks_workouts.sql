/*
# Prevent duplicate TrainingPeaks workouts + clean existing duplicates

1. Purpose
- TrainingPeaks regenerates the UIDs in its ICS feed between syncs, so the
  sync functions checking only by `external_id` re-inserted the same sessions
  as new rows. This adds a database-level uniqueness guard and cleans the
  duplicates already stored.

2. Changes
- `athlete_workouts`: for rows with source = 'trainingpeaks', a unique
  constraint on (athlete_id, scheduled_date, external_title) now guarantees
  only one session per athlete per day per title. Implemented as a partial
  unique index (only applies to source = 'trainingpeaks').
- Duplicated rows are removed, keeping the OLDEST row of each group (the one
  first imported). Rows referenced by training_logs are kept even if newer.

3. Security
- No RLS or privilege changes.
*/

-- 1. Clean duplicates: keep the oldest row per (athlete, date, title)
DELETE FROM athlete_workouts a
WHERE a.source = 'trainingpeaks'
  AND EXISTS (
    SELECT 1 FROM athlete_workouts b
    WHERE b.source = 'trainingpeaks'
      AND b.athlete_id = a.athlete_id
      AND b.scheduled_date = a.scheduled_date
      AND coalesce(b.external_title, '') = coalesce(a.external_title, '')
      AND b.created_at < a.created_at
  )
  AND NOT EXISTS (
    -- never delete a row that has recorded training logs
    SELECT 1 FROM training_logs tl WHERE tl.athlete_workout_id = a.id
  );

-- 2. Safety net at DB level (unique index instead of constraint for
--    safe re-runs, checked first via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'uniq_tp_workout_athlete_date_title'
  ) THEN
    CREATE UNIQUE INDEX uniq_tp_workout_athlete_date_title
    ON athlete_workouts (athlete_id, scheduled_date, coalesce(external_title, ''))
    WHERE source = 'trainingpeaks';
  END IF;
END $$;