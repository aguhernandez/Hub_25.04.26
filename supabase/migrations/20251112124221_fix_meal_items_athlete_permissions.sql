/*
  # Fix Meal Plan Items Permissions

  1. Changes
    - Athletes can create/edit meal items for their own plans
    - Trainers can manage items for assigned athletes' plans

  2. Security
    - Check ownership through meal_plans table
*/

-- Drop existing policies on meal_plan_meals
DROP POLICY IF EXISTS "meal_plan_meals_select" ON meal_plan_meals;
DROP POLICY IF EXISTS "meal_plan_meals_insert" ON meal_plan_meals;
DROP POLICY IF EXISTS "meal_plan_meals_update" ON meal_plan_meals;
DROP POLICY IF EXISTS "meal_plan_meals_delete" ON meal_plan_meals;
DROP POLICY IF EXISTS "View meal plan meals" ON meal_plan_meals;
DROP POLICY IF EXISTS "Manage meal plan meals" ON meal_plan_meals;

-- New policies for meal_plan_meals
CREATE POLICY "View meal plan meals"
  ON meal_plan_meals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans mp
      WHERE mp.id = meal_plan_meals.plan_id
      AND (
        mp.athlete_id = auth.uid()
        OR mp.coach_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = mp.athlete_id
          AND profiles.assigned_trainer_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Manage meal plan meals"
  ON meal_plan_meals
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans mp
      WHERE mp.id = meal_plan_meals.plan_id
      AND (
        mp.athlete_id = auth.uid()
        OR mp.coach_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = mp.athlete_id
          AND profiles.assigned_trainer_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meal_plans mp
      WHERE mp.id = meal_plan_meals.plan_id
      AND (
        mp.athlete_id = auth.uid()
        OR mp.coach_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = mp.athlete_id
          AND profiles.assigned_trainer_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      )
    )
  );

-- Drop existing policies on meal_plan_items
DROP POLICY IF EXISTS "meal_plan_items_select" ON meal_plan_items;
DROP POLICY IF EXISTS "meal_plan_items_insert" ON meal_plan_items;
DROP POLICY IF EXISTS "meal_plan_items_update" ON meal_plan_items;
DROP POLICY IF EXISTS "meal_plan_items_delete" ON meal_plan_items;
DROP POLICY IF EXISTS "View meal plan items" ON meal_plan_items;
DROP POLICY IF EXISTS "Manage meal plan items" ON meal_plan_items;

-- New policies for meal_plan_items
CREATE POLICY "View meal plan items"
  ON meal_plan_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plan_meals mpm
      JOIN meal_plans mp ON mp.id = mpm.plan_id
      WHERE mpm.id = meal_plan_items.meal_id
      AND (
        mp.athlete_id = auth.uid()
        OR mp.coach_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = mp.athlete_id
          AND profiles.assigned_trainer_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Manage meal plan items"
  ON meal_plan_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plan_meals mpm
      JOIN meal_plans mp ON mp.id = mpm.plan_id
      WHERE mpm.id = meal_plan_items.meal_id
      AND (
        mp.athlete_id = auth.uid()
        OR mp.coach_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = mp.athlete_id
          AND profiles.assigned_trainer_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meal_plan_meals mpm
      JOIN meal_plans mp ON mp.id = mpm.plan_id
      WHERE mpm.id = meal_plan_items.meal_id
      AND (
        mp.athlete_id = auth.uid()
        OR mp.coach_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = mp.athlete_id
          AND profiles.assigned_trainer_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      )
    )
  );
