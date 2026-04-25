/*
  # Activity Recording System (Strava-like)

  1. New Tables
    - `activities`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `sport_type` ('run', 'trail_run', 'road_bike', 'mountain_bike', 'gravel_bike', 'open_water_swim')
      - `title` (text, optional)
      - `notes` (text, optional)
      - `distance_km` (numeric, meters converted to km)
      - `duration_seconds` (integer, total seconds)
      - `elevation_gain_m` (numeric, meters)
      - `started_at` (timestamptz, when activity started)
      - `completed_at` (timestamptz, when activity ended)
      - `is_public` (boolean, based on user profile privacy settings)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `activity_gps_points`
      - `id` (uuid, primary key)
      - `activity_id` (uuid, foreign key to activities)
      - `latitude` (numeric)
      - `longitude` (numeric)
      - `altitude_m` (numeric, optional)
      - `timestamp` (timestamptz)
      - `sequence_order` (integer, for ordering points on map)

  2. Security
    - Enable RLS on both tables
    - Users can view their own activities
    - Users can view activities of athletes they coach
    - Athletes can decide if their activities are public/private based on profile setting
    - Trainers and admin can view athlete activities
    - GPS points are readable with activity access

  3. Indexes
    - user_id + created_at for performance
    - activity_id for GPS points joins
*/

-- Create activities table
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sport_type text NOT NULL CHECK (sport_type IN ('run', 'trail_run', 'road_bike', 'mountain_bike', 'gravel_bike', 'open_water_swim')),
  title text,
  notes text,
  distance_km numeric NOT NULL DEFAULT 0,
  duration_seconds integer NOT NULL DEFAULT 0,
  elevation_gain_m numeric NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL,
  completed_at timestamptz NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create activity_gps_points table
CREATE TABLE IF NOT EXISTS activity_gps_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  altitude_m numeric,
  timestamp timestamptz NOT NULL,
  sequence_order integer NOT NULL
);

-- Enable RLS
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_gps_points ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activities_user_created ON activities(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_user_sport ON activities(user_id, sport_type);
CREATE INDEX IF NOT EXISTS idx_activity_gps_points_activity ON activity_gps_points(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_gps_points_sequence ON activity_gps_points(activity_id, sequence_order);

-- RLS Policies for activities table

-- Users can view their own activities
CREATE POLICY "users_view_own_activities"
  ON activities FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Trainers/Admins can view their athletes' activities
CREATE POLICY "trainers_view_athlete_activities"
  ON activities FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'trainer')
    AND EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.athlete_id = activities.user_id
      AND EXISTS (
        SELECT 1 FROM teams t
        WHERE t.id = tm.team_id
        AND t.coach_id = auth.uid()
      )
    )
  );

-- Public activities are viewable if user profile is public and activity is marked public
CREATE POLICY "view_public_activities"
  ON activities FOR SELECT
  TO authenticated
  USING (
    is_public = true
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = activities.user_id
      AND profile_public = true
    )
  );

-- Users can insert their own activities
CREATE POLICY "users_insert_own_activities"
  ON activities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own activities
CREATE POLICY "users_update_own_activities"
  ON activities FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own activities
CREATE POLICY "users_delete_own_activities"
  ON activities FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for activity_gps_points table

-- Users can view GPS points of their own activities
CREATE POLICY "users_view_own_gps_points"
  ON activity_gps_points FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM activities
      WHERE activities.id = activity_gps_points.activity_id
      AND activities.user_id = auth.uid()
    )
  );

-- Trainers/Admins can view GPS points of athlete activities
CREATE POLICY "trainers_view_athlete_gps_points"
  ON activity_gps_points FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM activities a
      WHERE a.id = activity_gps_points.activity_id
      AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'trainer')
      AND EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.athlete_id = a.user_id
        AND EXISTS (
          SELECT 1 FROM teams t
          WHERE t.id = tm.team_id
          AND t.coach_id = auth.uid()
        )
      )
    )
  );

-- View public activity GPS points
CREATE POLICY "view_public_gps_points"
  ON activity_gps_points FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM activities a
      WHERE a.id = activity_gps_points.activity_id
      AND a.is_public = true
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = a.user_id
        AND profile_public = true
      )
    )
  );

-- Users can insert GPS points for their own activities
CREATE POLICY "users_insert_own_gps_points"
  ON activity_gps_points FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM activities
      WHERE activities.id = activity_gps_points.activity_id
      AND activities.user_id = auth.uid()
    )
  );

-- Users can delete GPS points from their own activities
CREATE POLICY "users_delete_own_gps_points"
  ON activity_gps_points FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM activities
      WHERE activities.id = activity_gps_points.activity_id
      AND activities.user_id = auth.uid()
    )
  );
