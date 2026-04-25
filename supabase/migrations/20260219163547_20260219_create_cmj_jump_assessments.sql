/*
  # CMJ Jump Assessment System

  ## Overview
  Creates tables to store Countermovement Jump (CMJ) assessment data,
  replicating MyJump Lab functionality within the platform.

  ## New Tables

  ### cmj_sessions
  - Represents one assessment session (multiple jumps in sequence)
  - Stores session metadata: date, protocol type, athlete body mass
  - Links to athlete profile

  ### cmj_jumps
  - Individual jump records within a session
  - Stores: flight_time_ms, jump_height_cm, estimated_power_w
  - Raw video frame data (optional metadata)

  ## Calculated Fields
  - jump_height_cm: derived from h = (9.81 * t^2) / 8
  - estimated_power_w: Sayers formula = 60.7 * height_cm + 45.3 * body_mass_kg - 2055
  - fatigue_index: percentage drop from best jump to last jump in session

  ## Security
  - RLS enabled on both tables
  - Athletes can only access their own data
  - Trainers can read their assigned athletes' data
*/

CREATE TABLE IF NOT EXISTS cmj_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  protocol text NOT NULL DEFAULT 'standard' CHECK (protocol IN ('standard', 'fatigue', 'reactive')),
  body_mass_kg numeric(5,2),
  notes text,
  best_height_cm numeric(6,2),
  avg_height_cm numeric(6,2),
  fatigue_index_pct numeric(5,2),
  total_jumps integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cmj_jumps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES cmj_sessions(id) ON DELETE CASCADE,
  jump_number integer NOT NULL,
  flight_time_ms numeric(8,2) NOT NULL,
  jump_height_cm numeric(6,2) NOT NULL,
  estimated_power_w numeric(8,2),
  takeoff_frame integer,
  landing_frame integer,
  fps integer,
  video_duration_ms integer,
  is_valid boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cmj_sessions_athlete_id ON cmj_sessions(athlete_id);
CREATE INDEX IF NOT EXISTS idx_cmj_sessions_session_date ON cmj_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_cmj_jumps_session_id ON cmj_jumps(session_id);

ALTER TABLE cmj_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cmj_jumps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes can view own CMJ sessions"
  ON cmj_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = athlete_id);

CREATE POLICY "Athletes can insert own CMJ sessions"
  ON cmj_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Athletes can update own CMJ sessions"
  ON cmj_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = athlete_id)
  WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Athletes can delete own CMJ sessions"
  ON cmj_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = athlete_id);

CREATE POLICY "Trainers can view assigned athletes CMJ sessions"
  ON cmj_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (p.role = 'trainer' OR p.role = 'admin')
    )
  );

CREATE POLICY "Athletes can view own CMJ jumps"
  ON cmj_jumps FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cmj_sessions s
      WHERE s.id = cmj_jumps.session_id
      AND s.athlete_id = auth.uid()
    )
  );

CREATE POLICY "Athletes can insert own CMJ jumps"
  ON cmj_jumps FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cmj_sessions s
      WHERE s.id = cmj_jumps.session_id
      AND s.athlete_id = auth.uid()
    )
  );

CREATE POLICY "Athletes can delete own CMJ jumps"
  ON cmj_jumps FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cmj_sessions s
      WHERE s.id = cmj_jumps.session_id
      AND s.athlete_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can view assigned athletes CMJ jumps"
  ON cmj_jumps FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (p.role = 'trainer' OR p.role = 'admin')
    )
  );
