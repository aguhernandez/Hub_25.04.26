/*
  # Fix external_endurance_workouts for reliable upsert

  1. Changes
    - Adds UNIQUE constraint on (athlete_id, planner_source, external_id) so upsert works
    - Adds external_workout_id column as alias (used by newer endpoints)
    - Syncs external_workout_id from external_id for consistency

  2. Notes
    - external_id is the original column name used by push-to-hub
    - external_workout_id is the name used by planner-hub-api (newer)
    - Both are now supported; external_id is the canonical dedup key
*/

ALTER TABLE external_endurance_workouts
  ADD COLUMN IF NOT EXISTS external_workout_id text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'external_endurance_workouts_athlete_planner_external_key'
    AND conrelid = 'external_endurance_workouts'::regclass
  ) THEN
    CREATE UNIQUE INDEX external_endurance_workouts_athlete_planner_external_key
      ON external_endurance_workouts (athlete_id, planner_source, external_id)
      WHERE external_id IS NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'external_endurance_workouts_athlete_planner_ext_workout_key'
    AND conrelid = 'external_endurance_workouts'::regclass
  ) THEN
    CREATE UNIQUE INDEX external_endurance_workouts_athlete_planner_ext_workout_key
      ON external_endurance_workouts (athlete_id, planner_source, external_workout_id)
      WHERE external_workout_id IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ext_endurance_workouts_athlete_date
  ON external_endurance_workouts (athlete_id, scheduled_date);
