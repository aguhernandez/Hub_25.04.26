/*
  # Add primary_value and secondary_value to workout_exercises

  1. Changes
    - Add `primary_value` column to store the value of the primary metric (e.g., "70" for kg, "10" for reps)
    - Add `secondary_value` column to store the value of the secondary metric (e.g., "12" for reps when primary is kg)
    
  2. Notes
    - Both columns are text type to allow flexible input (ranges like "8-10", exact values like "70", etc.)
    - The existing `reps` column remains for backward compatibility
    - These columns work together with existing `primary_metric` and `secondary_metric` columns
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_exercises' AND column_name = 'primary_value'
  ) THEN
    ALTER TABLE workout_exercises
    ADD COLUMN primary_value text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_exercises' AND column_name = 'secondary_value'
  ) THEN
    ALTER TABLE workout_exercises
    ADD COLUMN secondary_value text;
  END IF;
END $$;

COMMENT ON COLUMN workout_exercises.primary_value IS 'Value for primary metric (e.g., "70" for kg, "10" for reps, "30" for seconds)';
COMMENT ON COLUMN workout_exercises.secondary_value IS 'Value for secondary metric when using dual metrics (e.g., "12" for reps when primary is kg)';