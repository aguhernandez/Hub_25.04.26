/*
  # Create Endurance Completed Workouts Table

  ## Summary
  Stores manual workout completion logs submitted by athletes via the "Log Workout"
  feature in the Hub. These records are the source of truth for the Endurance Satellite
  to pull when analyzing completed workouts.

  ## New Tables
  - `endurance_completed_workouts`
    - `id` - Primary key
    - `athlete_id` - FK to profiles
    - `planned_workout_id` - UUID reference to external_endurance_workouts (optional)
    - `scheduled_date` - The date the workout was originally planned for
    - `sport` - Sport type (cycling, running, swimming, etc.)
    - `workout_name` - Name of the workout
    - `duration_seconds` - Total actual duration in seconds
    - `time_in_zones` - JSONB: { "z1": 1200, "z2": 1800, ... } always in seconds
    - `intervals` - JSONB array of per-block detail
    - `rpe` - Rate of perceived exertion (1-10)
    - `effort` - Qualitative effort: easy | moderate | hard (quick log only)
    - `source` - How it was logged: manual_block_based | quick_log
    - `wellness` - JSONB: optional wellness snapshot at time of logging (null if not provided)
    - `notes` - Optional free-text notes
    - `created_at` - Timestamp

  ## Security
  - RLS enabled
  - Athletes can read/write own records
  - Trainers/admins can read records for assigned athletes
  - Endurance planners (service role) can read via planner-hub-api
*/

CREATE TABLE IF NOT EXISTS endurance_completed_workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  planned_workout_id uuid,
  scheduled_date date,
  sport text DEFAULT 'other',
  workout_name text,
  duration_seconds integer NOT NULL,
  time_in_zones jsonb DEFAULT '{}',
  intervals jsonb DEFAULT '[]',
  rpe integer CHECK (rpe >= 1 AND rpe <= 10),
  effort text CHECK (effort IN ('easy', 'moderate', 'hard')),
  source text NOT NULL DEFAULT 'manual_block_based' CHECK (source IN ('manual_block_based', 'quick_log')),
  wellness jsonb DEFAULT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ecw_athlete_id ON endurance_completed_workouts(athlete_id);
CREATE INDEX IF NOT EXISTS idx_ecw_planned_workout_id ON endurance_completed_workouts(planned_workout_id);
CREATE INDEX IF NOT EXISTS idx_ecw_scheduled_date ON endurance_completed_workouts(scheduled_date DESC);
CREATE INDEX IF NOT EXISTS idx_ecw_created_at ON endurance_completed_workouts(created_at DESC);

ALTER TABLE endurance_completed_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes can read own completed workouts"
  ON endurance_completed_workouts FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Athletes can insert own completed workouts"
  ON endurance_completed_workouts FOR INSERT
  TO authenticated
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Athletes can update own completed workouts"
  ON endurance_completed_workouts FOR UPDATE
  TO authenticated
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Trainers can read athlete completed workouts"
  ON endurance_completed_workouts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (p.role = 'trainer' OR p.role = 'admin')
    )
    AND
    EXISTS (
      SELECT 1 FROM profiles ap
      WHERE ap.id = endurance_completed_workouts.athlete_id
      AND ap.assigned_trainer_id = auth.uid()
    )
  );
