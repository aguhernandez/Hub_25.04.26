/*
  # Bar Velocity Tracking System

  ## Overview
  Tables for storing barbell velocity measurement data, enabling
  Velocity-Based Training (VBT) analysis within the platform.

  ## New Tables

  ### bar_velocity_sessions
  - One session per exercise set being analyzed
  - Stores exercise name, total load, video metadata
  - Aggregated stats: peak velocity, mean velocity, estimated power

  ### bar_velocity_reps
  - Individual repetition records within a session
  - Stores: concentric/eccentric velocity, displacement, duration
  - Phase analysis data (concentric vs eccentric)

  ## Calculated Fields
  - mean_concentric_velocity_ms: average bar speed during upward phase
  - peak_velocity_ms: maximum instantaneous velocity detected
  - estimated_power_w: Force * mean velocity (F = load_kg * 9.81)
  - displacement_mm: total vertical travel of the bar per rep

  ## Security
  - RLS enabled on both tables
  - Athletes access own data; trainers/admins can read all
*/

CREATE TABLE IF NOT EXISTS bar_velocity_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  exercise_name text NOT NULL DEFAULT '',
  load_kg numeric(6,2),
  total_reps integer DEFAULT 0,
  peak_velocity_ms numeric(6,3),
  mean_concentric_velocity_ms numeric(6,3),
  velocity_loss_pct numeric(5,2),
  estimated_power_w numeric(8,2),
  fps integer,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bar_velocity_reps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES bar_velocity_sessions(id) ON DELETE CASCADE,
  rep_number integer NOT NULL,
  mean_concentric_velocity_ms numeric(6,3),
  peak_velocity_ms numeric(6,3),
  mean_eccentric_velocity_ms numeric(6,3),
  concentric_duration_ms integer,
  eccentric_duration_ms integer,
  displacement_mm numeric(7,2),
  estimated_power_w numeric(8,2),
  velocity_samples jsonb,
  timestamps_ms jsonb,
  is_valid boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bar_velocity_sessions_athlete_id ON bar_velocity_sessions(athlete_id);
CREATE INDEX IF NOT EXISTS idx_bar_velocity_sessions_session_date ON bar_velocity_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_bar_velocity_reps_session_id ON bar_velocity_reps(session_id);

ALTER TABLE bar_velocity_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bar_velocity_reps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes can view own bar velocity sessions"
  ON bar_velocity_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = athlete_id);

CREATE POLICY "Athletes can insert own bar velocity sessions"
  ON bar_velocity_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Athletes can update own bar velocity sessions"
  ON bar_velocity_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = athlete_id)
  WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Athletes can delete own bar velocity sessions"
  ON bar_velocity_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = athlete_id);

CREATE POLICY "Trainers can view all bar velocity sessions"
  ON bar_velocity_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (p.role = 'trainer' OR p.role = 'admin')
    )
  );

CREATE POLICY "Athletes can view own bar velocity reps"
  ON bar_velocity_reps FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bar_velocity_sessions s
      WHERE s.id = bar_velocity_reps.session_id
      AND s.athlete_id = auth.uid()
    )
  );

CREATE POLICY "Athletes can insert own bar velocity reps"
  ON bar_velocity_reps FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bar_velocity_sessions s
      WHERE s.id = bar_velocity_reps.session_id
      AND s.athlete_id = auth.uid()
    )
  );

CREATE POLICY "Athletes can delete own bar velocity reps"
  ON bar_velocity_reps FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bar_velocity_sessions s
      WHERE s.id = bar_velocity_reps.session_id
      AND s.athlete_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can view all bar velocity reps"
  ON bar_velocity_reps FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (p.role = 'trainer' OR p.role = 'admin')
    )
  );
