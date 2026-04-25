/*
  # Create Circuits System

  ## Summary
  This migration creates a full circuit training system for trainers and admins.

  ## New Tables

  ### circuits
  - `id` - UUID primary key
  - `name` - Circuit name
  - `description` - Optional circuit description
  - `circuit_type` - Either 'rounds' (do X rounds) or 'amrap' (as many rounds as possible in time)
  - `rounds` - Number of rounds (used when circuit_type = 'rounds')
  - `amrap_minutes` - Time cap in minutes (used when circuit_type = 'amrap')
  - `created_by` - User who created the circuit (trainer or admin)
  - `created_at` - Timestamp

  ### circuit_exercises
  - `id` - UUID primary key
  - `circuit_id` - FK to circuits
  - `exercise_id` - FK to exercises library
  - `order_index` - Display order within the circuit
  - `reps` - Reps prescription (e.g. "10", "15", "max")
  - `notes` - Optional notes for this exercise in the circuit
  - `created_at` - Timestamp

  ## Security
  - RLS enabled on both tables
  - Trainers and admins can create/edit/delete their own circuits
  - Athletes can read all circuits (to view assigned ones)
*/

CREATE TABLE IF NOT EXISTS circuits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  circuit_type text NOT NULL DEFAULT 'rounds' CHECK (circuit_type IN ('rounds', 'amrap')),
  rounds integer DEFAULT 3,
  amrap_minutes integer DEFAULT 10,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE circuits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers and admins can insert circuits"
  ON circuits FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND (
      (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('trainer', 'admin')
    )
  );

CREATE POLICY "Creators can update their circuits"
  ON circuits FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can delete their circuits"
  ON circuits FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Authenticated users can read circuits"
  ON circuits FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_circuits_created_by ON circuits(created_by);

-- Circuit exercises table
CREATE TABLE IF NOT EXISTS circuit_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circuit_id uuid NOT NULL REFERENCES circuits(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  reps text DEFAULT '10',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE circuit_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Circuit owner can insert circuit exercises"
  ON circuit_exercises FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM circuits
      WHERE circuits.id = circuit_id
      AND circuits.created_by = auth.uid()
    )
  );

CREATE POLICY "Circuit owner can update circuit exercises"
  ON circuit_exercises FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM circuits
      WHERE circuits.id = circuit_id
      AND circuits.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM circuits
      WHERE circuits.id = circuit_id
      AND circuits.created_by = auth.uid()
    )
  );

CREATE POLICY "Circuit owner can delete circuit exercises"
  ON circuit_exercises FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM circuits
      WHERE circuits.id = circuit_id
      AND circuits.created_by = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can read circuit exercises"
  ON circuit_exercises FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_circuit_exercises_circuit_id ON circuit_exercises(circuit_id);
CREATE INDEX IF NOT EXISTS idx_circuit_exercises_exercise_id ON circuit_exercises(exercise_id);
