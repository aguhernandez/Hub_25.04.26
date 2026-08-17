/*
  # Add Training Logs and History Tracking

  1. New Tables
    - `training_logs` - Individual set logs with weight, reps, RIR, bar velocity
      - `id` (uuid, primary key)
      - `athlete_workout_id` (uuid, references athlete_workouts)
      - `workout_exercise_id` (uuid, references workout_exercises)
      - `set_number` (integer)
      - `reps_completed` (integer)
      - `weight_used` (numeric)
      - `rir` (integer)
      - `bar_velocity` (numeric)
      - `notes` (text)
      - `completed_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Changes
    - Add `completed_at` column to `athlete_workouts` table
    - Add `total_volume` column to `athlete_workouts` for tracking

  3. Security
    - Enable RLS on `training_logs`
    - Athletes can view and insert their own training logs
    - Trainers can view their athletes' logs
*/

-- Add columns to athlete_workouts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'athlete_workouts' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE athlete_workouts ADD COLUMN completed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'athlete_workouts' AND column_name = 'total_volume'
  ) THEN
    ALTER TABLE athlete_workouts ADD COLUMN total_volume numeric(10,2) DEFAULT 0;
  END IF;
END $$;

-- Create training_logs table
CREATE TABLE IF NOT EXISTS training_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_workout_id uuid NOT NULL REFERENCES athlete_workouts(id) ON DELETE CASCADE,
  workout_exercise_id uuid NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  set_number integer NOT NULL,
  reps_completed integer NOT NULL,
  weight_used numeric(6,2),
  rir integer,
  bar_velocity numeric(5,2),
  notes text,
  completed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE training_logs ENABLE ROW LEVEL SECURITY;

-- Athletes can view their own logs
CREATE POLICY "Athletes can view own training logs"
  ON training_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM athlete_workouts
      WHERE athlete_workouts.id = training_logs.athlete_workout_id
      AND athlete_workouts.athlete_id = auth.uid()
    )
  );

-- Athletes can insert their own logs
CREATE POLICY "Athletes can insert own training logs"
  ON training_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM athlete_workouts
      WHERE athlete_workouts.id = training_logs.athlete_workout_id
      AND athlete_workouts.athlete_id = auth.uid()
    )
  );

-- Trainers can view their athletes' logs
CREATE POLICY "Trainers can view athlete training logs"
  ON training_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM athlete_workouts
      WHERE athlete_workouts.id = training_logs.athlete_workout_id
      AND athlete_workouts.trainer_id = auth.uid()
    )
  );
