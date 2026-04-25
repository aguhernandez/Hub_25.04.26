/*
  # Add RIR and Velocity Methods to Strength Estimates

  1. Changes to strength_estimates table
    - Add `estimation_method` column (epley, rir, velocity)
    - Add `rir` column (0-5)
    - Add `mean_velocity` column (m/s)
    - Make reps_performed nullable (not needed for RIR/Velocity methods)

  2. Update constraints
    - Allow null for reps_performed
    - Add check for estimation_method values
*/

-- Add new columns for RIR and Velocity methods
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strength_estimates' AND column_name = 'estimation_method'
  ) THEN
    ALTER TABLE strength_estimates
    ADD COLUMN estimation_method text NOT NULL DEFAULT 'epley' CHECK (estimation_method IN ('epley', 'rir', 'velocity'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strength_estimates' AND column_name = 'rir'
  ) THEN
    ALTER TABLE strength_estimates
    ADD COLUMN rir integer CHECK (rir >= 0 AND rir <= 5);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strength_estimates' AND column_name = 'mean_velocity'
  ) THEN
    ALTER TABLE strength_estimates
    ADD COLUMN mean_velocity numeric(4,2) CHECK (mean_velocity > 0 AND mean_velocity <= 2.0);
  END IF;
END $$;

-- Make reps_performed nullable since it's not needed for RIR/Velocity methods
ALTER TABLE strength_estimates ALTER COLUMN reps_performed DROP NOT NULL;

-- Create index for method-based queries
CREATE INDEX IF NOT EXISTS idx_strength_estimates_method
  ON strength_estimates(athlete_id, exercise_name, estimation_method);
