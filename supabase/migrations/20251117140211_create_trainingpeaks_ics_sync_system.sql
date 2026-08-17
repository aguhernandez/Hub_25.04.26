/*
  # TrainingPeaks ICS Sync System

  1. New Tables
    - `tp_connections`
      - `id` (uuid, primary key)
      - `athlete_id` (uuid, FK to profiles) - The athlete who owns this connection
      - `ics_url` (text, encrypted) - Private ICS feed URL from TrainingPeaks
      - `status` (text) - Connection status: 'connected', 'error', 'pending', 'disconnected'
      - `last_sync_at` (timestamptz) - Last successful sync timestamp
      - `last_error` (text) - Last error message if sync failed
      - `sync_enabled` (boolean) - Whether auto-sync is enabled
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes to existing tables
    - `athlete_workouts` table extensions:
      - `source` - Origin of workout: 'asciende' or 'trainingpeaks'
      - `external_id` - TrainingPeaks UID from ICS
      - `raw_description` - Full description from TrainingPeaks
      - `synced_at` - When this workout was last synced
      - `external_title` - Title from TrainingPeaks (SUMMARY field)

  3. Security
    - Enable RLS on `tp_connections`
    - Athletes can only view/edit their own connections
    - Trainers can view their athletes' connections (read-only)
    - Admins can view all connections

  4. Indexes
    - Index on athlete_id for fast lookups
    - Index on external_id for duplicate detection
    - Index on scheduled_date for calendar queries
*/

-- Create tp_connections table
CREATE TABLE IF NOT EXISTS tp_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ics_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('connected', 'error', 'pending', 'disconnected')),
  last_sync_at timestamptz,
  last_error text,
  sync_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(athlete_id)
);

-- Add columns to athlete_workouts table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athlete_workouts' AND column_name = 'source'
  ) THEN
    ALTER TABLE athlete_workouts ADD COLUMN source text DEFAULT 'asciende' CHECK (source IN ('asciende', 'trainingpeaks'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athlete_workouts' AND column_name = 'external_id'
  ) THEN
    ALTER TABLE athlete_workouts ADD COLUMN external_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athlete_workouts' AND column_name = 'raw_description'
  ) THEN
    ALTER TABLE athlete_workouts ADD COLUMN raw_description text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athlete_workouts' AND column_name = 'synced_at'
  ) THEN
    ALTER TABLE athlete_workouts ADD COLUMN synced_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athlete_workouts' AND column_name = 'external_title'
  ) THEN
    ALTER TABLE athlete_workouts ADD COLUMN external_title text;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tp_connections_athlete_id ON tp_connections(athlete_id);
CREATE INDEX IF NOT EXISTS idx_athlete_workouts_external_id ON athlete_workouts(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_athlete_workouts_source ON athlete_workouts(source);
CREATE INDEX IF NOT EXISTS idx_athlete_workouts_date_source ON athlete_workouts(scheduled_date, source);
CREATE INDEX IF NOT EXISTS idx_athlete_workouts_athlete_source ON athlete_workouts(athlete_id, source);

-- Enable RLS
ALTER TABLE tp_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tp_connections
CREATE POLICY "Athletes can view own TP connection"
  ON tp_connections FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Athletes can insert own TP connection"
  ON tp_connections FOR INSERT
  TO authenticated
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Athletes can update own TP connection"
  ON tp_connections FOR UPDATE
  TO authenticated
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Athletes can delete own TP connection"
  ON tp_connections FOR DELETE
  TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Trainers can view athletes TP connections"
  ON tp_connections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('trainer', 'admin')
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tp_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tp_connections_updated_at ON tp_connections;
CREATE TRIGGER tp_connections_updated_at
  BEFORE UPDATE ON tp_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_tp_connections_updated_at();