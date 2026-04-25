/*
  # Optimize RLS Policies - Part 2

  1. Purpose
    - Continue RLS optimization with (select auth.uid())
    - Covers: user_memberships, payments, workouts, user_programs
    - Covers: meal_logs, habits, anthropometry_records

  2. Changes
    - Recreates RLS policies with optimized auth function calls

  3. Security
    - Maintains exact same security logic
*/

-- ============================================
-- user_memberships
-- ============================================

DROP POLICY IF EXISTS "Admins can manage all memberships" ON user_memberships;
CREATE POLICY "Admins can manage all memberships"
  ON user_memberships FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can insert own membership" ON user_memberships;
CREATE POLICY "Users can insert own membership"
  ON user_memberships FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own membership" ON user_memberships;
CREATE POLICY "Users can view own membership"
  ON user_memberships FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================
-- payments
-- ============================================

DROP POLICY IF EXISTS "Admins can view all payments" ON payments;
CREATE POLICY "Admins can view all payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view own payments" ON payments;
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================
-- workouts
-- ============================================

DROP POLICY IF EXISTS "Athletes can view their workouts" ON workouts;
CREATE POLICY "Athletes can view their workouts"
  ON workouts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM athlete_workouts
      WHERE athlete_workouts.workout_id = workouts.id
      AND athlete_workouts.athlete_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainers can create workouts" ON workouts;
CREATE POLICY "Trainers can create workouts"
  ON workouts FOR INSERT
  TO authenticated
  WITH CHECK (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Trainers can delete own workouts" ON workouts;
CREATE POLICY "Trainers can delete own workouts"
  ON workouts FOR DELETE
  TO authenticated
  USING (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Trainers can update own workouts" ON workouts;
CREATE POLICY "Trainers can update own workouts"
  ON workouts FOR UPDATE
  TO authenticated
  USING (trainer_id = (select auth.uid()))
  WITH CHECK (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Trainers can view own workouts" ON workouts;
CREATE POLICY "Trainers can view own workouts"
  ON workouts FOR SELECT
  TO authenticated
  USING (trainer_id = (select auth.uid()));

-- Note: athletes_create_own_workouts, athletes_delete_own_workouts, and athletes_update_own_workouts
-- policies are not recreated as the workouts table does not have a created_by_athlete_id column

-- ============================================
-- user_programs
-- ============================================

DROP POLICY IF EXISTS "Users can purchase programs" ON user_programs;
CREATE POLICY "Users can purchase programs"
  ON user_programs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own programs" ON user_programs;
CREATE POLICY "Users can view own programs"
  ON user_programs FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================
-- meal_logs
-- ============================================

DROP POLICY IF EXISTS "Users can create own meal logs" ON meal_logs;
CREATE POLICY "Users can create own meal logs"
  ON meal_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own meal logs" ON meal_logs;
CREATE POLICY "Users can delete own meal logs"
  ON meal_logs FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own meal logs" ON meal_logs;
CREATE POLICY "Users can update own meal logs"
  ON meal_logs FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own meal logs" ON meal_logs;
CREATE POLICY "Users can view own meal logs"
  ON meal_logs FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================
-- habits
-- ============================================

DROP POLICY IF EXISTS "Users can create own habits" ON habits;
CREATE POLICY "Users can create own habits"
  ON habits FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own habits" ON habits;
CREATE POLICY "Users can delete own habits"
  ON habits FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own habits" ON habits;
CREATE POLICY "Users can update own habits"
  ON habits FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own habits" ON habits;
CREATE POLICY "Users can view own habits"
  ON habits FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================
-- anthropometry_records
-- ============================================

DROP POLICY IF EXISTS "Trainers can create anthropometry records" ON anthropometry_records;
CREATE POLICY "Trainers can create anthropometry records"
  ON anthropometry_records FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('trainer', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view own anthropometry" ON anthropometry_records;
CREATE POLICY "Users can view own anthropometry"
  ON anthropometry_records FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));
