/*
  # Add Athlete Goals and Objectives

  This migration adds specific fields for physical objectives and competition goals
  to better track athlete aspirations during onboarding and throughout their journey.

  ## New Columns
  
  ### profiles table
  - physical_objectives (text) - Specific physical performance goals (e.g., "Increase vertical jump by 10cm", "Improve endurance")
  - competition_goals (text) - Competition and achievement goals (e.g., "Qualify for nationals", "Win regional championship")
  - short_term_goals (text) - 3-6 month goals
  - long_term_goals (text) - 1+ year goals
  
  ## Purpose
  
  These fields enable:
  - Better onboarding experience with goal-setting
  - Personalized training recommendations
  - Progress tracking against stated objectives
  - Coach-athlete alignment on priorities

  ## Security
  
  All fields are part of the profiles table which already has proper RLS policies.
*/

-- Add goal and objective columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS physical_objectives text,
ADD COLUMN IF NOT EXISTS competition_goals text,
ADD COLUMN IF NOT EXISTS short_term_goals text,
ADD COLUMN IF NOT EXISTS long_term_goals text;

-- Add helpful comments
COMMENT ON COLUMN profiles.physical_objectives IS 'Specific physical performance goals (e.g., strength, speed, endurance targets)';
COMMENT ON COLUMN profiles.competition_goals IS 'Competition and achievement goals (e.g., tournaments, rankings, qualifications)';
COMMENT ON COLUMN profiles.short_term_goals IS 'Goals for the next 3-6 months';
COMMENT ON COLUMN profiles.long_term_goals IS 'Goals for 1+ years';
