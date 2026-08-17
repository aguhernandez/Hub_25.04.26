/*
  # Add local_date column to external_activities

  ## Purpose
  Strava stores start_time in UTC (timestamptz). When displaying activities on a calendar,
  we need the LOCAL date the athlete actually performed the activity — regardless of timezone.
  Strava provides start_date_local for this purpose (the wall-clock date/time at the athlete's location).
  
  ## Changes
  - `external_activities`: add `local_date date` column
    - Stores the date portion of start_date_local from Strava (plain date, no timezone)
    - Falls back to UTC date of start_time for existing records
    - Used by the frontend to place activities on the correct calendar day
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'external_activities' AND column_name = 'local_date'
  ) THEN
    ALTER TABLE external_activities ADD COLUMN local_date date;
  END IF;
END $$;

-- Backfill existing rows using the UTC date of start_time as best approximation
UPDATE external_activities
SET local_date = start_time::date
WHERE local_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_external_activities_local_date ON external_activities(local_date);
CREATE INDEX IF NOT EXISTS idx_external_activities_user_local_date ON external_activities(user_id, local_date);
