/*
  # Create Nutrition Pushed Plans System

  ## Summary
  Stores complete nutrition plans pushed from the Nutrition Satellite to the Hub.
  Each plan contains the full JSON payload from the satellite including days, meals, and items.

  ## New Tables

  ### nutrition_pushed_plans
  - Stores the raw plan payload pushed by the satellite
  - `id` — UUID primary key
  - `athlete_id` — FK to profiles (the athlete this plan is for)
  - `pushed_by` — UUID of the satellite user (coach) who pushed the plan
  - `plan_date` — start date of the plan
  - `plan_name` — display name of the plan
  - `plan_duration_days` — how many days the plan covers
  - `status` — 'active' | 'archived' | 'superseded'
  - `summary` — JSONB with total macros: target_kcal, target_protein_g, target_carbs_g, target_fat_g, avg_daily_kcal
  - `plan_data` — JSONB with full days array (each day has meals and items)
  - `notes` — optional coach notes
  - `created_at`, `updated_at`

  ## Security
  - RLS enabled
  - Athletes can SELECT their own plans
  - Trainers/admins can INSERT, UPDATE, SELECT all plans for their athletes
  - Service role has full access (used by edge function)
*/

CREATE TABLE IF NOT EXISTS nutrition_pushed_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pushed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  plan_date date NOT NULL,
  plan_name text NOT NULL DEFAULT '',
  plan_duration_days integer NOT NULL DEFAULT 7,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'superseded')),
  summary jsonb NOT NULL DEFAULT '{}',
  plan_data jsonb NOT NULL DEFAULT '{"days": []}',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nutrition_pushed_plans_athlete_id ON nutrition_pushed_plans(athlete_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_pushed_plans_athlete_status ON nutrition_pushed_plans(athlete_id, status);
CREATE INDEX IF NOT EXISTS idx_nutrition_pushed_plans_plan_date ON nutrition_pushed_plans(plan_date);

ALTER TABLE nutrition_pushed_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes can view own pushed plans"
  ON nutrition_pushed_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = athlete_id);

CREATE POLICY "Trainers and admins can view all pushed plans"
  ON nutrition_pushed_plans FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('trainer', 'admin')
  );

CREATE POLICY "Trainers and admins can insert pushed plans"
  ON nutrition_pushed_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('trainer', 'admin')
  );

CREATE POLICY "Trainers and admins can update pushed plans"
  ON nutrition_pushed_plans FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('trainer', 'admin')
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('trainer', 'admin')
  );

CREATE OR REPLACE FUNCTION update_nutrition_pushed_plans_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_nutrition_pushed_plans_updated_at
  BEFORE UPDATE ON nutrition_pushed_plans
  FOR EACH ROW EXECUTE FUNCTION update_nutrition_pushed_plans_updated_at();
