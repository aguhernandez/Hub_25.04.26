/*
  # Create Strength Estimates Table

  1. New Table
    - `strength_estimates` - Store 1RM calculations per athlete and exercise
      - `id` (uuid, primary key)
      - `athlete_id` (uuid, references profiles)
      - `exercise_id` (uuid, references exercises)
      - `exercise_name` (text) - denormalized for quick access
      - `weight_lifted` (numeric) - actual weight used
      - `reps_performed` (integer) - reps completed
      - `estimated_1rm` (numeric) - calculated 1RM using Epley formula
      - `unit` (text) - kg or lb
      - `is_baseline` (boolean) - marked as reference point
      - `notes` (text) - optional notes
      - `recorded_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Athletes can insert and view their own estimates
    - Trainers can view estimates from their assigned athletes
    - Trainers can insert estimates for their athletes

  3. Indexes
    - Index on athlete_id + exercise_id for quick lookups
    - Index on recorded_at for chronological queries
*/

-- Create strength_estimates table
CREATE TABLE IF NOT EXISTS strength_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES exercises(id) ON DELETE SET NULL,
  exercise_name text NOT NULL,
  weight_lifted numeric(6,2) NOT NULL,
  reps_performed integer NOT NULL CHECK (reps_performed > 0 AND reps_performed <= 20),
  estimated_1rm numeric(6,2) NOT NULL,
  unit text NOT NULL DEFAULT 'kg' CHECK (unit IN ('kg', 'lb')),
  is_baseline boolean DEFAULT false,
  notes text,
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_strength_estimates_athlete_exercise
  ON strength_estimates(athlete_id, exercise_id);

CREATE INDEX IF NOT EXISTS idx_strength_estimates_recorded_at
  ON strength_estimates(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_strength_estimates_baseline
  ON strength_estimates(athlete_id, exercise_id, is_baseline)
  WHERE is_baseline = true;

-- Enable RLS
ALTER TABLE strength_estimates ENABLE ROW LEVEL SECURITY;

-- Athletes can insert their own estimates
CREATE POLICY "Athletes can insert own strength estimates"
  ON strength_estimates FOR INSERT
  TO authenticated
  WITH CHECK (athlete_id = auth.uid());

-- Athletes can view their own estimates
CREATE POLICY "Athletes can view own strength estimates"
  ON strength_estimates FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

-- Athletes can update their own estimates
CREATE POLICY "Athletes can update own strength estimates"
  ON strength_estimates FOR UPDATE
  TO authenticated
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

-- Trainers can view their athletes' estimates
CREATE POLICY "Trainers can view athlete strength estimates"
  ON strength_estimates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = strength_estimates.athlete_id
      AND profiles.assigned_trainer_id = auth.uid()
    )
  );

-- Trainers can insert estimates for their athletes
CREATE POLICY "Trainers can insert athlete strength estimates"
  ON strength_estimates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = athlete_id
      AND p.assigned_trainer_id = auth.uid()
    )
  );

-- Trainers can update their athletes' estimates
CREATE POLICY "Trainers can update athlete strength estimates"
  ON strength_estimates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = strength_estimates.athlete_id
      AND profiles.assigned_trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = athlete_id
      AND p.assigned_trainer_id = auth.uid()
    )
  );

-- Admins can do everything
CREATE POLICY "Admins can manage all strength estimates"
  ON strength_estimates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
