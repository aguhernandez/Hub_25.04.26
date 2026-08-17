/*
  # Extra Training Logs System

  1. New Tables
    - `extra_training_logs`
      - Stores simple training logs for activities outside the gym
      - Examples: Swimming, Running, Yoga, Cycling, etc.
      - Only counts for training frequency, no performance calculations

  2. Security
    - Enable RLS
    - Athletes can create, view, update, and delete their own logs
    - Trainers and admins can view all logs

  3. Features
    - Activity name (e.g., "Natación", "Yoga", "Running")
    - Duration or quantity (e.g., "20 min", "5km", "10 piletas")
    - Notes/description
    - Date
    - Counts in training frequency heatmap
*/

-- Create extra training logs table
CREATE TABLE IF NOT EXISTS extra_training_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_name text NOT NULL,
  duration text,
  notes text,
  training_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE extra_training_logs ENABLE ROW LEVEL SECURITY;

-- Athletes can view their own logs
CREATE POLICY "Athletes can view own extra training logs"
  ON extra_training_logs
  FOR SELECT
  TO authenticated
  USING (
    athlete_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('trainer', 'admin')
    )
  );

-- Athletes can create their own logs
CREATE POLICY "Athletes can create own extra training logs"
  ON extra_training_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (athlete_id = auth.uid());

-- Athletes can update their own logs
CREATE POLICY "Athletes can update own extra training logs"
  ON extra_training_logs
  FOR UPDATE
  TO authenticated
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

-- Athletes can delete their own logs
CREATE POLICY "Athletes can delete own extra training logs"
  ON extra_training_logs
  FOR DELETE
  TO authenticated
  USING (athlete_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_extra_training_logs_athlete_id
  ON extra_training_logs(athlete_id);

CREATE INDEX IF NOT EXISTS idx_extra_training_logs_training_date
  ON extra_training_logs(training_date DESC);

CREATE INDEX IF NOT EXISTS idx_extra_training_logs_athlete_date
  ON extra_training_logs(athlete_id, training_date DESC);

-- Create update trigger
CREATE OR REPLACE FUNCTION update_extra_training_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_extra_training_logs_updated_at
  BEFORE UPDATE ON extra_training_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_extra_training_logs_updated_at();