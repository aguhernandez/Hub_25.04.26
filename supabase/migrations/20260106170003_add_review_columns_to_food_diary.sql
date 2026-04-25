/*
  # Add Review Columns to Food Diary Sessions

  1. Changes
    - Add `reviewed_by` column to track who reviewed the diary
    - Add `reviewed_at` column to track when it was reviewed
    - Add `adherence_score` column to store the adherence score given during review
  
  2. Security
    - No RLS changes needed, existing policies cover these columns
*/

-- Add review tracking columns
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'food_diary_sessions' AND column_name = 'reviewed_by'
  ) THEN
    ALTER TABLE food_diary_sessions 
    ADD COLUMN reviewed_by uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'food_diary_sessions' AND column_name = 'reviewed_at'
  ) THEN
    ALTER TABLE food_diary_sessions 
    ADD COLUMN reviewed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'food_diary_sessions' AND column_name = 'adherence_score'
  ) THEN
    ALTER TABLE food_diary_sessions 
    ADD COLUMN adherence_score integer CHECK (adherence_score >= 0 AND adherence_score <= 100);
  END IF;
END $$;