/*
  # Add show_key_metrics Privacy Control

  1. Changes
    - Add `show_key_metrics` column to `athlete_profile_details` table
    - Allows athletes to control visibility of their key performance metrics (ACWR, Fatigue Index, 1RM Trend, Total Volume)
    - Defaults to true (public) for backwards compatibility

  2. Security
    - No RLS changes needed, existing policies already cover this column
*/

-- Add show_key_metrics column with default value true
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'athlete_profile_details' AND column_name = 'show_key_metrics'
  ) THEN
    ALTER TABLE athlete_profile_details ADD COLUMN show_key_metrics boolean DEFAULT true;
  END IF;
END $$;
