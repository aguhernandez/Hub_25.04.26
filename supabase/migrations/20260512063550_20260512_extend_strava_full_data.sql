/*
  # Extend Strava Integration — Full Activity Data

  ## Summary
  Extends the existing Strava integration to store complete activity metadata,
  activity streams (HR, power, cadence, GPS, etc.), and athlete profile data
  for future advanced performance analytics.

  ## Changes

  ### strava_connections
  - Add `athlete_profile` (jsonb) — full Strava athlete object
  - Add `athlete_firstname`, `athlete_lastname`, `athlete_profile_pic` (text)
  - Add `has_heartrate_permission` (boolean) — track HR consent status
  - Add `granted_scopes` (text[]) — parsed scope list

  ### external_activities
  Extended metadata columns:
  - `elapsed_time_seconds` — total elapsed time (vs moving_time)
  - `max_speed_mps` — max speed
  - `calories` — kilocalories
  - `average_watts` — average power (cycling)
  - `max_watts` — max power
  - `weighted_avg_watts` — normalized power
  - `kilojoules` — energy
  - `perceived_exertion` — RPE from Strava
  - `trainer` (boolean) — indoor/trainer session
  - `commute` (boolean)
  - `map_polyline` (text) — encoded GPS polyline
  - `map_summary_polyline` (text) — summary polyline
  - `timezone` (text)
  - `start_latlng` (numeric[])
  - `end_latlng` (numeric[])
  - `strava_upload_id` (bigint)
  - `external_id_strava` (text) — Strava's own external_id field
  - `has_heartrate` (boolean)
  - `has_power` (boolean)
  - `streams_fetched` (boolean) — track if streams were already fetched
  - `streams_fetched_at` (timestamptz)

  ### activity_streams (new table)
  Stores raw time-series streams per activity:
  - heartrate, watts, cadence, velocity_smooth, altitude, distance, latlng, time
  - structured for future analytics (training load, fatigue, power curves, HR zones)

  ## Security
  - RLS enabled on activity_streams
  - Users can only access their own streams
  - Trainers can read their athletes' streams
*/

-- ─── strava_connections extensions ───────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='strava_connections' AND column_name='athlete_profile') THEN
    ALTER TABLE strava_connections ADD COLUMN athlete_profile jsonb;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='strava_connections' AND column_name='athlete_firstname') THEN
    ALTER TABLE strava_connections ADD COLUMN athlete_firstname text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='strava_connections' AND column_name='athlete_lastname') THEN
    ALTER TABLE strava_connections ADD COLUMN athlete_lastname text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='strava_connections' AND column_name='athlete_profile_pic') THEN
    ALTER TABLE strava_connections ADD COLUMN athlete_profile_pic text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='strava_connections' AND column_name='has_heartrate_permission') THEN
    ALTER TABLE strava_connections ADD COLUMN has_heartrate_permission boolean DEFAULT true;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='strava_connections' AND column_name='granted_scopes') THEN
    ALTER TABLE strava_connections ADD COLUMN granted_scopes text[] DEFAULT '{}';
  END IF;
END $$;

-- ─── external_activities extensions ──────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='external_activities' AND column_name='elapsed_time_seconds') THEN
    ALTER TABLE external_activities ADD COLUMN elapsed_time_seconds integer;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='external_activities' AND column_name='max_speed_mps') THEN
    ALTER TABLE external_activities ADD COLUMN max_speed_mps numeric;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='external_activities' AND column_name='calories') THEN
    ALTER TABLE external_activities ADD COLUMN calories numeric;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='external_activities' AND column_name='average_watts') THEN
    ALTER TABLE external_activities ADD COLUMN average_watts numeric;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='external_activities' AND column_name='max_watts') THEN
    ALTER TABLE external_activities ADD COLUMN max_watts numeric;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='external_activities' AND column_name='weighted_avg_watts') THEN
    ALTER TABLE external_activities ADD COLUMN weighted_avg_watts numeric;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='external_activities' AND column_name='kilojoules') THEN
    ALTER TABLE external_activities ADD COLUMN kilojoules numeric;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='external_activities' AND column_name='perceived_exertion') THEN
    ALTER TABLE external_activities ADD COLUMN perceived_exertion numeric;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='external_activities' AND column_name='trainer') THEN
    ALTER TABLE external_activities ADD COLUMN trainer boolean DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='external_activities' AND column_name='commute') THEN
    ALTER TABLE external_activities ADD COLUMN commute boolean DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='external_activities' AND column_name='map_polyline') THEN
    ALTER TABLE external_activities ADD COLUMN map_polyline text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='external_activities' AND column_name='map_summary_polyline') THEN
    ALTER TABLE external_activities ADD COLUMN map_summary_polyline text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='external_activities' AND column_name='timezone') THEN
    ALTER TABLE external_activities ADD COLUMN timezone text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='external_activities' AND column_name='start_latlng') THEN
    ALTER TABLE external_activities ADD COLUMN start_latlng numeric[];
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='external_activities' AND column_name='end_latlng') THEN
    ALTER TABLE external_activities ADD COLUMN end_latlng numeric[];
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='external_activities' AND column_name='strava_upload_id') THEN
    ALTER TABLE external_activities ADD COLUMN strava_upload_id bigint;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='external_activities' AND column_name='external_id_strava') THEN
    ALTER TABLE external_activities ADD COLUMN external_id_strava text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='external_activities' AND column_name='has_heartrate') THEN
    ALTER TABLE external_activities ADD COLUMN has_heartrate boolean DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='external_activities' AND column_name='has_power') THEN
    ALTER TABLE external_activities ADD COLUMN has_power boolean DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='external_activities' AND column_name='streams_fetched') THEN
    ALTER TABLE external_activities ADD COLUMN streams_fetched boolean DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='external_activities' AND column_name='streams_fetched_at') THEN
    ALTER TABLE external_activities ADD COLUMN streams_fetched_at timestamptz;
  END IF;
END $$;

-- ─── activity_streams (new table) ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS activity_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES external_activities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Time-series arrays (index-aligned, one value per second unless resampled)
  time_stream integer[],           -- seconds from start
  heartrate_stream integer[],      -- bpm
  watts_stream integer[],          -- watts
  cadence_stream integer[],        -- rpm
  velocity_smooth_stream numeric[], -- m/s
  altitude_stream numeric[],       -- meters
  distance_stream numeric[],       -- meters from start
  latlng_stream jsonb,             -- [[lat,lng], ...]

  -- Stream metadata
  resolution text DEFAULT 'high',  -- 'low', 'medium', 'high'
  series_type text DEFAULT 'time', -- 'time' or 'distance'
  stream_keys text[] DEFAULT '{}', -- which streams were available

  -- Missing data tracking
  missing_heartrate boolean DEFAULT false,
  missing_power boolean DEFAULT false,
  missing_gps boolean DEFAULT false,

  fetched_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_streams_activity_id ON activity_streams(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_streams_user_id ON activity_streams(user_id);
COMMENT ON TABLE activity_streams IS 'Raw time-series data from Strava activities. Prepared for training load, fatigue, power curves, HR zones, pace curves, and VBT correlations.';

ALTER TABLE activity_streams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity streams"
  ON activity_streams FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity streams"
  ON activity_streams FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activity streams"
  ON activity_streams FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own activity streams"
  ON activity_streams FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Trainers can view athletes activity streams"
  ON activity_streams FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = activity_streams.user_id
      AND profiles.assigned_trainer_id = auth.uid()
    )
  );
