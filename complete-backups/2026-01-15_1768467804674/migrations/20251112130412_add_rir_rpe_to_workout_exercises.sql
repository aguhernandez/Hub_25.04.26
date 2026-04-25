/*
  # Add RIR and RPE to Workout Exercises

  1. Changes
    - Add rir (Reps In Reserve) column to workout_exercises
    - Add rpe (Rate of Perceived Exertion) column to workout_exercises
    - These allow programming intensity via RIR/RPE instead of just %1RM

  2. Notes
    - RIR: 0-5 scale (0 = failure, 5 = 5 reps in reserve)
    - RPE: 1-10 scale (10 = maximal effort, 1 = very light)
*/

-- Add RIR and RPE columns to workout_exercises
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_exercises' AND column_name = 'rir'
  ) THEN
    ALTER TABLE workout_exercises ADD COLUMN rir integer CHECK (rir BETWEEN 0 AND 5);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_exercises' AND column_name = 'rpe'
  ) THEN
    ALTER TABLE workout_exercises ADD COLUMN rpe decimal(3,1) CHECK (rpe BETWEEN 1 AND 10);
  END IF;
END $$;

-- Add comment for clarity
COMMENT ON COLUMN workout_exercises.rir IS 'Reps In Reserve: 0-5 scale where 0=failure, 5=5 reps left in tank';
COMMENT ON COLUMN workout_exercises.rpe IS 'Rate of Perceived Exertion: 1-10 scale where 10=maximal effort, 1=very light';
