/*
  # Add course_title and course_title_es to course_completions

  Stores the course title at the time of completion so the public landing page
  can display it without needing to call an external API.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'course_completions' AND column_name = 'course_title'
  ) THEN
    ALTER TABLE course_completions ADD COLUMN course_title text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'course_completions' AND column_name = 'course_title_es'
  ) THEN
    ALTER TABLE course_completions ADD COLUMN course_title_es text;
  END IF;
END $$;
