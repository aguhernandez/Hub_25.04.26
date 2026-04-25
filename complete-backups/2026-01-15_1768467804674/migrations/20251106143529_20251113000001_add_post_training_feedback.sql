/*
  # Add Post-Training Feedback System

  1. New Columns in athlete_workouts
    - `rpe` (integer) - Rate of Perceived Exertion 1-10
    - `energy_level` (text) - very_low, low, normal, high, very_high
    - `pain_level` (text) - none, mild, moderate, strong
    - `mood` (text) - very_low, low, normal, high, very_high
    - `feedback_notes` (text) - Free-text field for athlete notes
    - `feedback_submitted_at` (timestamptz) - When feedback was submitted

  2. Changes
    - Add feedback columns to athlete_workouts table
    - Create index for coaches querying high RPE or pain

  3. Security
    - Athletes can update their own feedback
    - Trainers can view all feedback from their athletes
*/

-- Add feedback columns to athlete_workouts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'athlete_workouts' AND column_name = 'rpe'
  ) THEN
    ALTER TABLE athlete_workouts ADD COLUMN rpe integer CHECK (rpe >= 1 AND rpe <= 10);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'athlete_workouts' AND column_name = 'energy_level'
  ) THEN
    ALTER TABLE athlete_workouts ADD COLUMN energy_level text CHECK (energy_level IN ('very_low', 'low', 'normal', 'high', 'very_high'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'athlete_workouts' AND column_name = 'pain_level'
  ) THEN
    ALTER TABLE athlete_workouts ADD COLUMN pain_level text CHECK (pain_level IN ('none', 'mild', 'moderate', 'strong'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'athlete_workouts' AND column_name = 'mood'
  ) THEN
    ALTER TABLE athlete_workouts ADD COLUMN mood text CHECK (mood IN ('very_low', 'low', 'normal', 'high', 'very_high'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'athlete_workouts' AND column_name = 'feedback_notes'
  ) THEN
    ALTER TABLE athlete_workouts ADD COLUMN feedback_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'athlete_workouts' AND column_name = 'feedback_submitted_at'
  ) THEN
    ALTER TABLE athlete_workouts ADD COLUMN feedback_submitted_at timestamptz;
  END IF;
END $$;

-- Create index for querying high RPE or pain reports
CREATE INDEX IF NOT EXISTS idx_athlete_workouts_rpe ON athlete_workouts(rpe) WHERE rpe > 8;
CREATE INDEX IF NOT EXISTS idx_athlete_workouts_pain ON athlete_workouts(pain_level) WHERE pain_level IN ('moderate', 'strong');

-- Policy: Athletes can update their own feedback
DROP POLICY IF EXISTS "Athletes can update own workout feedback" ON athlete_workouts;
CREATE POLICY "Athletes can update own workout feedback"
  ON athlete_workouts FOR UPDATE
  TO authenticated
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());
