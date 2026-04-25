/*
  # Satellite Tags System

  ## Overview
  Allows external satellite planners (endurance, lab, nutrition) to push their own
  tags to the Hub via the X-Planner-Token connection. These tags are stored separately
  from the Hub's central tag system and surfaced in the athlete's Tag Hub view.

  ## New Tables

  ### `satellite_tags`
  - Tags pushed by external satellites for a specific athlete
  - Each record links to the planner token that sent it
  - Deduplicated by (athlete_id, planner_token_id, slug)

  ## Security
  - RLS enabled — athletes read only their own satellite tags
  - Inserts/updates done via SECURITY DEFINER function (service role from edge function)
*/

CREATE TABLE IF NOT EXISTS satellite_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  planner_token_id uuid REFERENCES external_planner_tokens(id) ON DELETE SET NULL,
  planner_name text NOT NULL,
  planner_type text NOT NULL,
  name text NOT NULL,
  name_es text,
  slug text NOT NULL,
  category text NOT NULL DEFAULT 'training',
  color text DEFAULT '#fdda36',
  description text,
  source_context text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT satellite_tags_category_check CHECK (
    category IN ('training', 'nutrition', 'recovery', 'performance', 'mindset', 'methodology', 'other')
  ),
  UNIQUE (athlete_id, planner_token_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_satellite_tags_athlete_id ON satellite_tags(athlete_id);
CREATE INDEX IF NOT EXISTS idx_satellite_tags_planner_token_id ON satellite_tags(planner_token_id);
CREATE INDEX IF NOT EXISTS idx_satellite_tags_category ON satellite_tags(category);

ALTER TABLE satellite_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes can read their own satellite tags"
  ON satellite_tags FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Trainers and admins can read all satellite tags"
  ON satellite_tags FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('trainer', 'admin')
  );
