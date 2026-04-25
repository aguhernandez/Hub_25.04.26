/*
  # Add athlete_workout_id to performance_sessions

  ## Summary
  Adds a foreign key column `athlete_workout_id` to `performance_sessions` so that
  the session detail modal can look up the actual exercise logs from `training_logs`
  using this link. Previously, the modal queried `performance_exercise_logs` which
  was never populated, causing "No exercises recorded" to always show.

  ## Changes
  - `performance_sessions`: new column `athlete_workout_id` (uuid, nullable, FK to athlete_workouts)
  - No data loss (column is nullable, existing rows unaffected)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'performance_sessions' AND column_name = 'athlete_workout_id'
  ) THEN
    ALTER TABLE performance_sessions ADD COLUMN athlete_workout_id uuid REFERENCES athlete_workouts(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_performance_sessions_athlete_workout_id ON performance_sessions(athlete_workout_id);
