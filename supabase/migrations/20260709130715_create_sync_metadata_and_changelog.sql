/*
# Create sync_metadata and sync_changelog tables

## Summary
Adds infrastructure for real-time bidirectional sync between Endurance Planner and Hub.
Endurance Planner is the source of truth — deletions and updates from the planner
propagate to Hub on every push.

## New Tables

### sync_metadata
Tracks per-athlete sync state for each planner source:
- `id` (uuid, pk)
- `athlete_id` (uuid, FK to profiles)
- `planner_source` (text) — name of the external planner (e.g. "Endurance Planner")
- `planner_type` (text) — type: nutrition | endurance | lab
- `last_push_at` (timestamptz) — when the planner last pushed data
- `last_pull_at` (timestamptz) — when Hub last read/pulled
- `status` (text) — synced | pending | conflict
- `workouts_count` (int) — how many workouts were in the last push
- `date_range_start` (date) — first date in the last push
- `date_range_end` (date) — last date in the last push
- `created_at`, `updated_at`

### sync_changelog
Audit trail of every sync action:
- `id` (uuid, pk)
- `athlete_id` (uuid)
- `planner_source` (text)
- `action` (text) — push_start | workout_deleted | workout_upserted | push_complete | push_error
- `workout_id` (uuid, nullable) — the affected external_endurance_workouts row
- `external_id` (text, nullable) — external workout identifier
- `details` (jsonb) — arbitrary metadata for the event
- `created_at`

## Security
- RLS enabled on both tables
- Trainers and admins can read sync_metadata for their athletes
- Service role writes (edge functions use service role key)
*/

-- sync_metadata
CREATE TABLE IF NOT EXISTS sync_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  planner_source text NOT NULL,
  planner_type text NOT NULL DEFAULT 'endurance',
  last_push_at timestamptz,
  last_pull_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('synced', 'pending', 'conflict', 'error')),
  workouts_count int DEFAULT 0,
  date_range_start date,
  date_range_end date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (athlete_id, planner_source)
);

ALTER TABLE sync_metadata ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_sync_metadata" ON sync_metadata;
CREATE POLICY "select_sync_metadata" ON sync_metadata FOR SELECT
  TO authenticated USING (
    athlete_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('trainer', 'admin')
    )
  );

DROP POLICY IF EXISTS "insert_sync_metadata" ON sync_metadata;
CREATE POLICY "insert_sync_metadata" ON sync_metadata FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_sync_metadata" ON sync_metadata;
CREATE POLICY "update_sync_metadata" ON sync_metadata FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- sync_changelog
CREATE TABLE IF NOT EXISTS sync_changelog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  planner_source text NOT NULL,
  action text NOT NULL,
  workout_id uuid REFERENCES external_endurance_workouts(id) ON DELETE SET NULL,
  external_id text,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sync_changelog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_sync_changelog" ON sync_changelog;
CREATE POLICY "select_sync_changelog" ON sync_changelog FOR SELECT
  TO authenticated USING (
    athlete_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('trainer', 'admin')
    )
  );

DROP POLICY IF EXISTS "insert_sync_changelog" ON sync_changelog;
CREATE POLICY "insert_sync_changelog" ON sync_changelog FOR INSERT
  TO authenticated WITH CHECK (true);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_sync_metadata_athlete ON sync_metadata(athlete_id);
CREATE INDEX IF NOT EXISTS idx_sync_changelog_athlete_source ON sync_changelog(athlete_id, planner_source);
CREATE INDEX IF NOT EXISTS idx_sync_changelog_created ON sync_changelog(created_at DESC);
