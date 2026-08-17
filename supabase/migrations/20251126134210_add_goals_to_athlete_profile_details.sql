/*
  # Add goals columns to athlete_profile_details

  1. Changes
    - Add physical_objectives column for physical goals
    - Add competition_goals column for competition goals
    - Add short_term_goals column for short-term goals
    - Add long_term_goals column for long-term goals
    - These support the signup flow where athletes can define their objectives

  2. Security
    - No RLS changes needed - existing policies cover these fields
*/

-- Add goals columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athlete_profile_details' AND column_name = 'physical_objectives'
  ) THEN
    ALTER TABLE athlete_profile_details 
    ADD COLUMN physical_objectives text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athlete_profile_details' AND column_name = 'competition_goals'
  ) THEN
    ALTER TABLE athlete_profile_details 
    ADD COLUMN competition_goals text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athlete_profile_details' AND column_name = 'short_term_goals'
  ) THEN
    ALTER TABLE athlete_profile_details 
    ADD COLUMN short_term_goals text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athlete_profile_details' AND column_name = 'long_term_goals'
  ) THEN
    ALTER TABLE athlete_profile_details 
    ADD COLUMN long_term_goals text;
  END IF;
END $$;
