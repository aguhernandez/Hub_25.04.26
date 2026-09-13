/*
# Fix Activity Streams — Add UNIQUE Constraint and Reset Broken Flags

## Summary
The `activity_streams` table was missing a UNIQUE constraint on `activity_id`,
which caused the edge function's `upsert(..., { onConflict: "activity_id" })`
to silently fail — no rows were ever inserted. Additionally, `external_activities`
had `streams_fetched = true` even though no stream data was actually saved.

## Changes
### activity_streams
- Add UNIQUE constraint on `activity_id` (the table already has a FK + index,
  but no unique constraint, so upserts with onConflict failed silently)

### external_activities
- Reset `streams_fetched` to `false` for all Strava activities that have
  no corresponding row in `activity_streams`, so the next sync re-fetches them

## Security
- No RLS changes needed
*/

-- Add unique constraint on activity_id so upserts work
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'activity_streams_activity_id_key'
      AND conrelid = 'activity_streams'::regclass
  ) THEN
    ALTER TABLE activity_streams ADD CONSTRAINT activity_streams_activity_id_key UNIQUE (activity_id);
  END IF;
END $$;

-- Reset streams_fetched for activities with no stream data
UPDATE external_activities
SET streams_fetched = false,
    streams_fetched_at = null
WHERE source = 'strava'
  AND deleted_at IS NULL
  AND streams_fetched = true
  AND id NOT IN (SELECT activity_id FROM activity_streams);
