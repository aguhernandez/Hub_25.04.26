/*
  # Fix external_activities source constraint to include asciende_gps

  ## Problem
  The `external_activities` table has a CHECK constraint on the `source` column
  that only allows: strava, garmin, coros, suunto, polar, wahoo, other.

  The `save-activity` edge function inserts with source = 'asciende_gps', which
  violates this constraint. The insert fails silently (non-fatal), so GPS-recorded
  activities are NEVER saved to `external_activities` and never appear in the
  training calendar.

  ## Fix
  1. Drop the old CHECK constraint
  2. Add a new CHECK constraint that includes 'asciende_gps'
  3. Also add 'trainingpeaks' which may be needed for future integrations
*/

ALTER TABLE external_activities
  DROP CONSTRAINT IF EXISTS external_activities_source_check;

ALTER TABLE external_activities
  ADD CONSTRAINT external_activities_source_check
  CHECK (source IN (
    'strava',
    'garmin',
    'coros',
    'suunto',
    'polar',
    'wahoo',
    'trainingpeaks',
    'asciende_gps',
    'other'
  ));
