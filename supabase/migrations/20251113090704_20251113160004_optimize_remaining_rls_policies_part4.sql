/*
  # Optimize Remaining RLS Policies - Part 4

  1. Purpose
    - Continue RLS optimization
    - Covers: meal_plan_items, meal_plans, invoices, api_configurations

  2. Security
    - Maintains exact same security logic
*/

-- ============================================
-- meal_plan_items
-- ============================================

DROP POLICY IF EXISTS "Manage meal plan items" ON meal_plan_items;
CREATE POLICY "Manage meal plan items"
  ON meal_plan_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plan_meals mpm
      JOIN meal_plans mp ON mpm.plan_id = mp.id
      WHERE mpm.id = meal_plan_items.meal_id
      AND (mp.athlete_id = (select auth.uid()) OR mp.coach_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can manage items of their accessible meals" ON meal_plan_items;
CREATE POLICY "Users can manage items of their accessible meals"
  ON meal_plan_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plan_meals mpm
      JOIN meal_plans mp ON mpm.plan_id = mp.id
      WHERE mpm.id = meal_plan_items.meal_id
      AND (mp.athlete_id = (select auth.uid()) OR mp.coach_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can view items of their accessible meals" ON meal_plan_items;
CREATE POLICY "Users can view items of their accessible meals"
  ON meal_plan_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plan_meals mpm
      JOIN meal_plans mp ON mpm.plan_id = mp.id
      WHERE mpm.id = meal_plan_items.meal_id
      AND (mp.athlete_id = (select auth.uid()) OR mp.coach_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "View meal plan items" ON meal_plan_items;
CREATE POLICY "View meal plan items"
  ON meal_plan_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plan_meals mpm
      JOIN meal_plans mp ON mpm.plan_id = mp.id
      WHERE mpm.id = meal_plan_items.meal_id
      AND (mp.athlete_id = (select auth.uid()) OR mp.coach_id = (select auth.uid()))
    )
  );

-- ============================================
-- meal_plans
-- ============================================

DROP POLICY IF EXISTS "Create meal plans" ON meal_plans;
CREATE POLICY "Create meal plans"
  ON meal_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    athlete_id = (select auth.uid())
    OR coach_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Delete meal plans" ON meal_plans;
CREATE POLICY "Delete meal plans"
  ON meal_plans FOR DELETE
  TO authenticated
  USING (
    athlete_id = (select auth.uid())
    OR coach_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Update meal plans" ON meal_plans;
CREATE POLICY "Update meal plans"
  ON meal_plans FOR UPDATE
  TO authenticated
  USING (
    athlete_id = (select auth.uid())
    OR coach_id = (select auth.uid())
  )
  WITH CHECK (
    athlete_id = (select auth.uid())
    OR coach_id = (select auth.uid())
  );

-- ============================================
-- invoices
-- ============================================

DROP POLICY IF EXISTS "Admins can delete invoices" ON invoices;
CREATE POLICY "Admins can delete invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Clients can view their invoices" ON invoices;
CREATE POLICY "Clients can view their invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (issued_to = (select auth.uid()));

DROP POLICY IF EXISTS "Trainers and admins can create invoices" ON invoices;
CREATE POLICY "Trainers and admins can create invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('trainer', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can update own issued invoices" ON invoices;
CREATE POLICY "Users can update own issued invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (issued_by = (select auth.uid()))
  WITH CHECK (issued_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own issued invoices" ON invoices;
CREATE POLICY "Users can view own issued invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (issued_by = (select auth.uid()));

-- ============================================
-- api_configurations
-- ============================================

DROP POLICY IF EXISTS "Admins can delete API configurations" ON api_configurations;
CREATE POLICY "Admins can delete API configurations"
  ON api_configurations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert API configurations" ON api_configurations;
CREATE POLICY "Admins can insert API configurations"
  ON api_configurations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update API configurations" ON api_configurations;
CREATE POLICY "Admins can update API configurations"
  ON api_configurations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view API configurations" ON api_configurations;
CREATE POLICY "Admins can view API configurations"
  ON api_configurations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );
