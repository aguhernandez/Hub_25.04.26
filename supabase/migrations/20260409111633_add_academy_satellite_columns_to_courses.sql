/*
  # Add Academy Satellite Columns to Courses Table

  ## Changes
  - Adds `satellite_source` (text): which satellite/planner pushed this course
  - Adds `external_id` (text): the course's ID in the originating satellite system
  - Adds `tags` (text[]): array of tags for filtering
  - Adds `sport` (text): associated sport
  - Adds `instructor_name` (text): name of the course instructor
  - Adds `thumbnail_url` (text): URL of the course thumbnail image
  - Adds `external_url` (text): link to the course in the satellite
  - Adds `is_published` (boolean): whether the course is visible in the Hub

  ## Notes
  - All columns added with IF NOT EXISTS to be idempotent
  - `is_published` defaults to true so existing courses remain visible
  - Unique constraint on (satellite_source, external_id) for upsert deduplication
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'satellite_source'
  ) THEN
    ALTER TABLE courses ADD COLUMN satellite_source text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'external_id'
  ) THEN
    ALTER TABLE courses ADD COLUMN external_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'tags'
  ) THEN
    ALTER TABLE courses ADD COLUMN tags text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'sport'
  ) THEN
    ALTER TABLE courses ADD COLUMN sport text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'instructor_name'
  ) THEN
    ALTER TABLE courses ADD COLUMN instructor_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'thumbnail_url'
  ) THEN
    ALTER TABLE courses ADD COLUMN thumbnail_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'external_url'
  ) THEN
    ALTER TABLE courses ADD COLUMN external_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'is_published'
  ) THEN
    ALTER TABLE courses ADD COLUMN is_published boolean DEFAULT true;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS courses_satellite_source_external_id_idx
  ON courses (satellite_source, external_id)
  WHERE satellite_source IS NOT NULL AND external_id IS NOT NULL;
