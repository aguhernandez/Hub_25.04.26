/*
  # Update Courses - Add Sports and Language Fields

  1. Changes
    - Add `language` column (en, es, both)
    - Add `sports` array column for filtering by sport
    - Update RLS policies

  2. Notes
    - Sports can be: volleyball, beach_volleyball, cycling, running, all
    - Multiple sports per course
*/

-- Add new columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'language'
  ) THEN
    ALTER TABLE courses ADD COLUMN language text DEFAULT 'both';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'sports'
  ) THEN
    ALTER TABLE courses ADD COLUMN sports text[] DEFAULT ARRAY['all'];
  END IF;
END $$;

-- Create index for sports array
CREATE INDEX IF NOT EXISTS idx_courses_sports ON courses USING GIN(sports);
