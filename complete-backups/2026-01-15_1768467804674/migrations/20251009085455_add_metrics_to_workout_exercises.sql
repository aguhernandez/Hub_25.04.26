/*
  # Add Metric Columns to Workout Exercises

  1. Changes
    - Add `primary_metric` column to workout_exercises table
    - Add `secondary_metric` column to workout_exercises table
    - Add `set_lines` JSONB column for advanced set configurations
    
  2. Notes
    - These columns store the prescription metrics (kg, reps, time, distance, etc.)
    - primary_metric: Main metric for the exercise (e.g., 'kg', 'reps')
    - secondary_metric: Optional secondary metric (e.g., 'reps' when primary is 'kg')
    - set_lines: Advanced set configuration with multiple set types
*/

-- Add metric columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_exercises' AND column_name = 'primary_metric'
  ) THEN
    ALTER TABLE workout_exercises
    ADD COLUMN primary_metric text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_exercises' AND column_name = 'secondary_metric'
  ) THEN
    ALTER TABLE workout_exercises
    ADD COLUMN secondary_metric text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_exercises' AND column_name = 'set_lines'
  ) THEN
    ALTER TABLE workout_exercises
    ADD COLUMN set_lines jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

COMMENT ON COLUMN workout_exercises.primary_metric IS 'Primary prescription metric (kg, reps, time_seconds, distance_meters, etc)';
COMMENT ON COLUMN workout_exercises.secondary_metric IS 'Optional secondary prescription metric';
COMMENT ON COLUMN workout_exercises.set_lines IS 'Advanced set configuration with multiple set types and prescriptions';
