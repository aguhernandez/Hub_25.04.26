/*
  # Add Section Headers to Workout Exercises

  1. Changes
    - Add `section_title` column to workout_exercises for organizing exercises into sections
    - Examples: "Warm Up", "Main Exercises", "Cool Down", "Strength", "Conditioning"
    
  2. Notes
    - NULL value means no section header (default behavior)
    - Section titles help organize complex workouts into logical groups
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_exercises' AND column_name = 'section_title'
  ) THEN
    ALTER TABLE workout_exercises
    ADD COLUMN section_title text;
  END IF;
END $$;

COMMENT ON COLUMN workout_exercises.section_title IS 'Optional section header for organizing exercises (e.g., Warm Up, Main, Cool Down)';
