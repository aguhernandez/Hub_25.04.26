/*
  # Create external_endurance_workouts table

  ## Purpose
  Store individual workouts pushed by the Endurance Planner satellite, including
  all step-level detail (intervals, warmup, cooldown, etc.) needed to render
  the workout chart and step list in the Hub.

  ## New Tables
  - `external_endurance_workouts`
    - `id` (uuid, primary key)
    - `athlete_id` (uuid, FK to profiles)
    - `planner_source` (text) — name of the planner that pushed this
    - `external_id` (text) — original ID from the planner (for upsert deduplication)
    - `name` (text)
    - `sport` (text) — cycling | running | swimming
    - `sub_discipline` (text, nullable)
    - `description` (text, nullable)
    - `intensity_basis` (text) — power | hr | pace | rpe
    - `scheduled_date` (date)
    - `scheduled_time` (text, nullable)
    - `estimated_duration_minutes` (numeric)
    - `estimated_impulse` (numeric, nullable)
    - `status` (text) — planned | in_progress | completed | skipped
    - `steps` (jsonb) — array of WorkoutStep objects
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Athlete can read own workouts
  - Trainer can read workouts of assigned athletes
  - Service role can insert/update (used by push-to-hub edge function)
*/

CREATE TABLE IF NOT EXISTS external_endurance_workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  planner_source text NOT NULL DEFAULT '',
  external_id text,
  name text NOT NULL DEFAULT '',
  sport text NOT NULL DEFAULT 'cycling',
  sub_discipline text,
  description text,
  intensity_basis text NOT NULL DEFAULT 'power',
  scheduled_date date NOT NULL,
  scheduled_time text,
  estimated_duration_minutes numeric DEFAULT 0,
  estimated_impulse numeric,
  status text NOT NULL DEFAULT 'planned',
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ext_endurance_workouts_external_id
  ON external_endurance_workouts (athlete_id, planner_source, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ext_endurance_workouts_athlete_date
  ON external_endurance_workouts (athlete_id, scheduled_date);

ALTER TABLE external_endurance_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes can read own endurance workouts"
  ON external_endurance_workouts FOR SELECT
  TO authenticated
  USING (auth.uid() = athlete_id);

CREATE POLICY "Trainers can read assigned athlete endurance workouts"
  ON external_endurance_workouts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('trainer', 'admin')
    )
    AND EXISTS (
      SELECT 1 FROM athlete_workouts aw
      WHERE aw.athlete_id = external_endurance_workouts.athlete_id
      AND aw.trainer_id = auth.uid()
      LIMIT 1
    )
  );
