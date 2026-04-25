/*
  # Optimize Remaining RLS Policies - Part 3

  1. Purpose
    - Continue RLS optimization
    - Covers: bioimpedance_measurements, food_items, athlete_preferences

  2. Security
    - Maintains exact same security logic
*/

-- ============================================
-- bioimpedance_measurements
-- ============================================

DROP POLICY IF EXISTS "Users can delete their own bioimpedance measurements" ON bioimpedance_measurements;
CREATE POLICY "Users can delete their own bioimpedance measurements"
  ON bioimpedance_measurements FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own bioimpedance measurements" ON bioimpedance_measurements;
CREATE POLICY "Users can insert their own bioimpedance measurements"
  ON bioimpedance_measurements FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own bioimpedance measurements" ON bioimpedance_measurements;
CREATE POLICY "Users can update their own bioimpedance measurements"
  ON bioimpedance_measurements FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view their own bioimpedance measurements" ON bioimpedance_measurements;
CREATE POLICY "Users can view their own bioimpedance measurements"
  ON bioimpedance_measurements FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================
-- food_items
-- ============================================

DROP POLICY IF EXISTS "food_items_delete" ON food_items;
CREATE POLICY "food_items_delete"
  ON food_items FOR DELETE
  TO authenticated
  USING (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "food_items_select" ON food_items;
CREATE POLICY "food_items_select"
  ON food_items FOR SELECT
  TO authenticated
  USING (
    is_public = true
    OR created_by = (select auth.uid())
  );

DROP POLICY IF EXISTS "food_items_update" ON food_items;
CREATE POLICY "food_items_update"
  ON food_items FOR UPDATE
  TO authenticated
  USING (created_by = (select auth.uid()))
  WITH CHECK (created_by = (select auth.uid()));

-- ============================================
-- athlete_preferences
-- ============================================

DROP POLICY IF EXISTS "athlete_preferences_delete" ON athlete_preferences;
CREATE POLICY "athlete_preferences_delete"
  ON athlete_preferences FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "athlete_preferences_insert" ON athlete_preferences;
CREATE POLICY "athlete_preferences_insert"
  ON athlete_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "athlete_preferences_select" ON athlete_preferences;
CREATE POLICY "athlete_preferences_select"
  ON athlete_preferences FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('trainer', 'admin')
    )
  );

DROP POLICY IF EXISTS "athlete_preferences_update" ON athlete_preferences;
CREATE POLICY "athlete_preferences_update"
  ON athlete_preferences FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));
