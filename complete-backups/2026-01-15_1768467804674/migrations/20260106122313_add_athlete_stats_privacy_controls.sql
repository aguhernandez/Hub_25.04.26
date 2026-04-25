/*
  # Add Privacy Controls for Athlete Stats Sections

  1. Changes
    - Add privacy control columns to `athlete_profile_details` table:
      - `show_workout_frequency` (boolean, default true) - controls workout frequency heatmap visibility
      - `show_strength_progression` (boolean, default true) - controls strength progression visibility
      - `show_insights` (boolean, default true) - controls insights and alerts visibility
      - `show_recent_sessions` (boolean, default true) - controls recent sessions visibility

  2. Purpose
    - Allow athletes to control which sections of their stats are visible to others
    - Each section can be toggled independently
    - Defaults to true (visible) for existing users
*/

DO $$
BEGIN
  -- Add workout frequency visibility control
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'athlete_profile_details' AND column_name = 'show_workout_frequency'
  ) THEN
    ALTER TABLE athlete_profile_details ADD COLUMN show_workout_frequency BOOLEAN DEFAULT true;
  END IF;

  -- Add strength progression visibility control
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'athlete_profile_details' AND column_name = 'show_strength_progression'
  ) THEN
    ALTER TABLE athlete_profile_details ADD COLUMN show_strength_progression BOOLEAN DEFAULT true;
  END IF;

  -- Add insights visibility control
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'athlete_profile_details' AND column_name = 'show_insights'
  ) THEN
    ALTER TABLE athlete_profile_details ADD COLUMN show_insights BOOLEAN DEFAULT true;
  END IF;

  -- Add recent sessions visibility control
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'athlete_profile_details' AND column_name = 'show_recent_sessions'
  ) THEN
    ALTER TABLE athlete_profile_details ADD COLUMN show_recent_sessions BOOLEAN DEFAULT true;
  END IF;
END $$;