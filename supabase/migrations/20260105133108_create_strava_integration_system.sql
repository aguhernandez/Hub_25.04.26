/*
  # Strava Integration System

  1. New Tables
    - `strava_connections`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `athlete_id` (bigint, Strava athlete ID)
      - `access_token` (text, encrypted)
      - `refresh_token` (text, encrypted)
      - `expires_at` (timestamptz)
      - `scope` (text, permissions granted)
      - `connected_at` (timestamptz)
      - `last_sync_at` (timestamptz)
      - `is_active` (boolean)

    - `external_activities`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `source` (text, 'strava', 'garmin', 'coros', etc.)
      - `external_id` (text, activity ID from external source)
      - `sport_type` (text, normalized: 'run', 'ride', 'swim', etc.)
      - `name` (text, activity name)
      - `start_time` (timestamptz)
      - `duration_seconds` (integer)
      - `distance_meters` (numeric)
      - `elevation_gain_meters` (numeric)
      - `average_speed_mps` (numeric, meters per second)
      - `average_heartrate` (integer)
      - `max_heartrate` (integer)
      - `average_power` (numeric)
      - `average_cadence` (numeric)
      - `device_name` (text)
      - `raw_data` (jsonb, full API response)
      - `imported_to_training_log_id` (uuid, nullable, link to training_logs)
      - `user_notes` (text, editable by user)
      - `user_rpe` (integer, editable by user)
      - `user_tags` (text[], editable by user)
      - `synced_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only access their own connections and activities
    - Trainers can view their athletes' external activities (read-only)

  3. Indexes
    - Index on user_id for fast lookups
    - Index on external_id for duplicate detection
    - Index on start_time for sorting and duplicate detection
    - Composite index on (source, external_id) for uniqueness
*/

-- Create strava_connections table
CREATE TABLE IF NOT EXISTS strava_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  athlete_id bigint NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  scope text DEFAULT '',
  connected_at timestamptz DEFAULT now(),
  last_sync_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create external_activities table
CREATE TABLE IF NOT EXISTS external_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('strava', 'garmin', 'coros', 'suunto', 'polar', 'wahoo', 'other')),
  external_id text NOT NULL,
  sport_type text NOT NULL,
  name text,
  start_time timestamptz NOT NULL,
  duration_seconds integer,
  distance_meters numeric,
  elevation_gain_meters numeric,
  average_speed_mps numeric,
  average_heartrate integer,
  max_heartrate integer,
  average_power numeric,
  average_cadence numeric,
  device_name text,
  raw_data jsonb,
  imported_to_training_log_id uuid REFERENCES training_logs(id) ON DELETE SET NULL,
  user_notes text,
  user_rpe integer CHECK (user_rpe >= 1 AND user_rpe <= 10),
  user_tags text[],
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(source, external_id)
);

-- Create indexes for strava_connections
CREATE INDEX IF NOT EXISTS idx_strava_connections_user_id ON strava_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_strava_connections_athlete_id ON strava_connections(athlete_id);

-- Create indexes for external_activities
CREATE INDEX IF NOT EXISTS idx_external_activities_user_id ON external_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_external_activities_source ON external_activities(source);
CREATE INDEX IF NOT EXISTS idx_external_activities_external_id ON external_activities(external_id);
CREATE INDEX IF NOT EXISTS idx_external_activities_start_time ON external_activities(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_external_activities_sport_type ON external_activities(sport_type);
CREATE INDEX IF NOT EXISTS idx_external_activities_source_external_id ON external_activities(source, external_id);
CREATE INDEX IF NOT EXISTS idx_external_activities_imported_to ON external_activities(imported_to_training_log_id);

-- Enable RLS
ALTER TABLE strava_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for strava_connections

-- Users can view their own connections
CREATE POLICY "Users can view own Strava connection"
  ON strava_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own connections
CREATE POLICY "Users can create own Strava connection"
  ON strava_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own connections
CREATE POLICY "Users can update own Strava connection"
  ON strava_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own connections
CREATE POLICY "Users can delete own Strava connection"
  ON strava_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for external_activities

-- Users can view their own activities
CREATE POLICY "Users can view own external activities"
  ON external_activities FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Trainers can view their athletes' activities
CREATE POLICY "Trainers can view athletes external activities"
  ON external_activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = external_activities.user_id
      AND profiles.assigned_trainer_id = auth.uid()
    )
  );

-- Users can insert their own activities (via edge function)
CREATE POLICY "Users can create own external activities"
  ON external_activities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update editable fields of their own activities
CREATE POLICY "Users can update own external activities"
  ON external_activities FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own activities
CREATE POLICY "Users can delete own external activities"
  ON external_activities FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trainers can update certain fields of their athletes' activities (notes, tags)
CREATE POLICY "Trainers can update athletes external activities notes"
  ON external_activities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = external_activities.user_id
      AND profiles.assigned_trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = external_activities.user_id
      AND profiles.assigned_trainer_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_external_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for external_activities
DROP TRIGGER IF EXISTS update_external_activities_updated_at_trigger ON external_activities;
CREATE TRIGGER update_external_activities_updated_at_trigger
  BEFORE UPDATE ON external_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_external_activities_updated_at();

-- Trigger for strava_connections
DROP TRIGGER IF EXISTS update_strava_connections_updated_at_trigger ON strava_connections;
CREATE TRIGGER update_strava_connections_updated_at_trigger
  BEFORE UPDATE ON strava_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_external_activities_updated_at();