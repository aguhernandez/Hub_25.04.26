/*
  # Optimize RLS Policies - Part 1

  1. Purpose
    - Fix RLS policies that re-evaluate auth functions for each row
    - Replace `auth.uid()` with `(select auth.uid())` for better performance
    - Prevents function re-evaluation on every row scan

  2. Changes
    - Recreates RLS policies with optimized auth function calls
    - Covers: notification_preferences, weekly_performance_digests, notification_logs
    - Covers: kerr_body_composition, workout_exercises, memberships

  3. Security
    - Maintains exact same security logic
    - Only changes implementation for performance
*/

-- ============================================
-- notification_preferences
-- ============================================

DROP POLICY IF EXISTS "Users can insert own notification preferences" ON notification_preferences;
CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own notification preferences" ON notification_preferences;
CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own notification preferences" ON notification_preferences;
CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================
-- weekly_performance_digests
-- ============================================

DROP POLICY IF EXISTS "Athletes can view own digests" ON weekly_performance_digests;
CREATE POLICY "Athletes can view own digests"
  ON weekly_performance_digests FOR SELECT
  TO authenticated
  USING (athlete_id = (select auth.uid()));

DROP POLICY IF EXISTS "Trainers can view athlete digests" ON weekly_performance_digests;
CREATE POLICY "Trainers can view athlete digests"
  ON weekly_performance_digests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('trainer', 'admin')
    )
  );

-- ============================================
-- notification_logs
-- ============================================

DROP POLICY IF EXISTS "Admins can view all notification logs" ON notification_logs;
CREATE POLICY "Admins can view all notification logs"
  ON notification_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view own notification logs" ON notification_logs;
CREATE POLICY "Users can view own notification logs"
  ON notification_logs FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================
-- kerr_body_composition
-- ============================================

DROP POLICY IF EXISTS "Admins can manage all body composition data" ON kerr_body_composition;
CREATE POLICY "Admins can manage all body composition data"
  ON kerr_body_composition FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Athletes can insert own body composition" ON kerr_body_composition;
CREATE POLICY "Athletes can insert own body composition"
  ON kerr_body_composition FOR INSERT
  TO authenticated
  WITH CHECK (athlete_id = (select auth.uid()));

DROP POLICY IF EXISTS "Athletes can update own body composition" ON kerr_body_composition;
CREATE POLICY "Athletes can update own body composition"
  ON kerr_body_composition FOR UPDATE
  TO authenticated
  USING (athlete_id = (select auth.uid()))
  WITH CHECK (athlete_id = (select auth.uid()));

DROP POLICY IF EXISTS "Athletes can view own body composition" ON kerr_body_composition;
CREATE POLICY "Athletes can view own body composition"
  ON kerr_body_composition FOR SELECT
  TO authenticated
  USING (athlete_id = (select auth.uid()));

DROP POLICY IF EXISTS "Trainers can insert athlete body composition" ON kerr_body_composition;
CREATE POLICY "Trainers can insert athlete body composition"
  ON kerr_body_composition FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('trainer', 'admin')
    )
  );

DROP POLICY IF EXISTS "Trainers can update athlete body composition" ON kerr_body_composition;
CREATE POLICY "Trainers can update athlete body composition"
  ON kerr_body_composition FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('trainer', 'admin')
    )
  );

DROP POLICY IF EXISTS "Trainers can view athlete body composition" ON kerr_body_composition;
CREATE POLICY "Trainers can view athlete body composition"
  ON kerr_body_composition FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('trainer', 'admin')
    )
  );

-- ============================================
-- workout_exercises
-- ============================================

DROP POLICY IF EXISTS "Trainers can manage workout exercises" ON workout_exercises;
CREATE POLICY "Trainers can manage workout exercises"
  ON workout_exercises FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workouts w
      WHERE w.id = workout_exercises.workout_id
      AND w.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view workout exercises" ON workout_exercises;
CREATE POLICY "Users can view workout exercises"
  ON workout_exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workouts w
      LEFT JOIN athlete_workouts aw ON w.id = aw.workout_id
      WHERE w.id = workout_exercises.workout_id
      AND (w.trainer_id = (select auth.uid()) OR aw.athlete_id = (select auth.uid()))
    )
  );

-- ============================================
-- memberships
-- ============================================

DROP POLICY IF EXISTS "Admins can manage memberships" ON memberships;
CREATE POLICY "Admins can manage memberships"
  ON memberships FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );
