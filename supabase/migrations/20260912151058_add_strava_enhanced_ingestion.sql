
-- Add fields for enhanced Strava ingestion

-- suffer_score from Strava detailed activity endpoint
ALTER TABLE external_activities
  ADD COLUMN IF NOT EXISTS suffer_score numeric,
  ADD COLUMN IF NOT EXISTS average_grade numeric,
  ADD COLUMN IF NOT EXISTS elev_high numeric,
  ADD COLUMN IF NOT EXISTS elev_low numeric;

-- Time-in-zone: { zone_1_seconds, ... zone_7_seconds }
ALTER TABLE external_activities
  ADD COLUMN IF NOT EXISTS time_in_zones jsonb;

-- Fusion: when a Strava activity matches an Asciende GPS activity, link them
ALTER TABLE external_activities
  ADD COLUMN IF NOT EXISTS fused_activity_id uuid REFERENCES external_activities(id);

-- Flag for athletes who need Strava re-authorization (scope too narrow)
ALTER TABLE strava_connections
  ADD COLUMN IF NOT EXISTS requires_reauth boolean DEFAULT false;

-- Add grade_smooth to activity_streams (from Strava streams)
ALTER TABLE activity_streams
  ADD COLUMN IF NOT EXISTS grade_smooth_stream numeric[],
  ADD COLUMN IF NOT EXISTS moving_stream boolean[];

-- Index for dedup lookups: find Asciende GPS activities by user + start time proximity
CREATE INDEX IF NOT EXISTS idx_external_activities_user_start_time
  ON external_activities (user_id, start_time)
  WHERE deleted_at IS NULL;
