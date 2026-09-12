/*
# Add Splits and Pace Data to External Activities

## Summary
Adds `splits_metric` and `splits_standard` jsonb columns to `external_activities`
to store the split data that Strava returns in the GET /activities/{id} response.
These are per-kilometer (metric) or per-mile (standard) splits with distance,
elapsed time, moving time, elevation difference, and pace for each split.

## Changes
### external_activities
- `splits_metric` (jsonb) — array of per-km splits from Strava detail response
- `splits_standard` (jsonb) — array of per-mile splits from Strava detail response

## Security
- No RLS changes needed — columns are on an existing table with existing policies.
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='external_activities' AND column_name='splits_metric') THEN
    ALTER TABLE external_activities ADD COLUMN splits_metric jsonb;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='external_activities' AND column_name='splits_standard') THEN
    ALTER TABLE external_activities ADD COLUMN splits_standard jsonb;
  END IF;
END $$;
