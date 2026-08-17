/*
  # Fix Meal Plans Permissions - Athletes Can Self-Manage

  1. Changes
    - Athletes can create meal plans for themselves
    - Athletes can update/delete their own meal plans
    - Trainers can create/manage meal plans for assigned athletes
    - Add created_by_athlete boolean flag to track self-created plans

  2. Security
    - Athletes: full CRUD on their own plans
    - Trainers: full CRUD on plans for assigned athletes
    - Admins: full CRUD on all plans
*/

-- Add created_by field to track who created the plan
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_plans' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE meal_plans ADD COLUMN created_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "meal_plans_select" ON meal_plans;
DROP POLICY IF EXISTS "meal_plans_insert" ON meal_plans;
DROP POLICY IF EXISTS "meal_plans_update" ON meal_plans;
DROP POLICY IF EXISTS "meal_plans_delete" ON meal_plans;
DROP POLICY IF EXISTS "Athletes and trainers can view meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Athletes can view own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Trainers can manage athlete meal plans" ON meal_plans;

-- New Policies: Athletes can self-manage

-- SELECT: Athletes see their own, trainers see assigned athletes'
CREATE POLICY "View own or assigned meal plans"
  ON meal_plans
  FOR SELECT
  TO authenticated
  USING (
    athlete_id = auth.uid()
    OR
    coach_id = auth.uid()
    OR
    -- Trainers can view plans of assigned athletes
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = meal_plans.athlete_id
      AND profiles.assigned_trainer_id = auth.uid()
    )
    OR
    -- Admins can view all
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- INSERT: Athletes can create for themselves, trainers for assigned athletes
CREATE POLICY "Create meal plans"
  ON meal_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Athlete creating for self
    athlete_id = auth.uid()
    OR
    -- Trainer creating for assigned athlete
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = meal_plans.athlete_id
      AND profiles.assigned_trainer_id = auth.uid()
    )
    OR
    -- Admin can create for anyone
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- UPDATE: Athletes can update their own, trainers their assigned athletes'
CREATE POLICY "Update meal plans"
  ON meal_plans
  FOR UPDATE
  TO authenticated
  USING (
    athlete_id = auth.uid()
    OR
    coach_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = meal_plans.athlete_id
      AND profiles.assigned_trainer_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    athlete_id = auth.uid()
    OR
    coach_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = meal_plans.athlete_id
      AND profiles.assigned_trainer_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- DELETE: Athletes can delete their own, trainers their assigned athletes'
CREATE POLICY "Delete meal plans"
  ON meal_plans
  FOR DELETE
  TO authenticated
  USING (
    athlete_id = auth.uid()
    OR
    coach_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = meal_plans.athlete_id
      AND profiles.assigned_trainer_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Auto-set created_by on insert
CREATE OR REPLACE FUNCTION set_meal_plan_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_meal_plan_created_by ON meal_plans;
CREATE TRIGGER trigger_set_meal_plan_created_by
  BEFORE INSERT ON meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION set_meal_plan_created_by();
