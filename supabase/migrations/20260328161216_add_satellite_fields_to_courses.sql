/*
  # Add satellite integration fields to courses table

  Adds two columns to support the Academy satellite push pattern
  (identical to how endurance/nutrition/lab satellites work via X-Planner-Token):

  1. `satellite_source` (text) — name of the Academy satellite that pushed the course
  2. `external_id` (text) — the course ID in the Academy satellite's own database

  These two fields together form a logical unique key per satellite source,
  allowing upsert without collisions between different academy satellites.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'satellite_source'
  ) THEN
    ALTER TABLE courses ADD COLUMN satellite_source text DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'external_id'
  ) THEN
    ALTER TABLE courses ADD COLUMN external_id text DEFAULT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_courses_satellite_source ON courses(satellite_source);
CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_satellite_external_id
  ON courses(satellite_source, external_id)
  WHERE satellite_source IS NOT NULL AND external_id IS NOT NULL;
