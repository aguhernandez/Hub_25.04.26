/*
  # Create Course Completions Table

  ## Purpose
  Since the Academy satellite does not yet return `is_completed` in its course responses,
  the Hub tracks course completions locally per athlete.

  ## New Tables
  - `course_completions`
    - `id` (uuid, pk)
    - `athlete_id` (uuid, FK to profiles)
    - `course_external_id` (text) - matches the `id` field returned by Academy satellite
    - `completed_at` (timestamptz)
    - `progress_percent` (integer, 0-100)
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Athletes can read/insert their own completions
  - Trainers and admins can read completions of their athletes
*/

CREATE TABLE IF NOT EXISTS course_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_external_id text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  progress_percent integer DEFAULT 100 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  created_at timestamptz DEFAULT now(),
  UNIQUE (athlete_id, course_external_id)
);

CREATE INDEX IF NOT EXISTS idx_course_completions_athlete ON course_completions(athlete_id);
CREATE INDEX IF NOT EXISTS idx_course_completions_course ON course_completions(course_external_id);

ALTER TABLE course_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes can view own completions"
  ON course_completions FOR SELECT
  TO authenticated
  USING (auth.uid() = athlete_id);

CREATE POLICY "Athletes can insert own completions"
  ON course_completions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Athletes can update own completions"
  ON course_completions FOR UPDATE
  TO authenticated
  USING (auth.uid() = athlete_id)
  WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Trainers and admins can view athlete completions"
  ON course_completions FOR SELECT
  TO authenticated
  USING (
    (select raw_app_meta_data->>'role' from auth.users where id = auth.uid()) IN ('trainer', 'admin')
  );
