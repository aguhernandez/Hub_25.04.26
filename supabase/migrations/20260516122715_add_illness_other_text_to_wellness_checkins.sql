/*
  # Add illness_other_text to wellness_checkins

  1. Changes
    - `wellness_checkins`: add `illness_other_text` (text, nullable) for free-text "Other" symptom
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wellness_checkins' AND column_name = 'illness_other_text'
  ) THEN
    ALTER TABLE wellness_checkins ADD COLUMN illness_other_text text;
  END IF;
END $$;
