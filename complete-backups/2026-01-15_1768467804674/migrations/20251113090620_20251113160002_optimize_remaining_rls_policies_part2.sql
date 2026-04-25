/*
  # Optimize Remaining RLS Policies - Part 2

  1. Purpose
    - Continue RLS optimization
    - Covers: one_rm_update_notifications, exercises, anthropometry_results

  2. Security
    - Maintains exact same security logic
*/

-- ============================================
-- one_rm_update_notifications
-- ============================================

DROP POLICY IF EXISTS "Admins can manage all 1RM notifications" ON one_rm_update_notifications;
CREATE POLICY "Admins can manage all 1RM notifications"
  ON one_rm_update_notifications FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Athletes can update own 1RM notifications" ON one_rm_update_notifications;
CREATE POLICY "Athletes can update own 1RM notifications"
  ON one_rm_update_notifications FOR UPDATE
  TO authenticated
  USING (athlete_id = (select auth.uid()))
  WITH CHECK (athlete_id = (select auth.uid()));

DROP POLICY IF EXISTS "Athletes can view own 1RM notifications" ON one_rm_update_notifications;
CREATE POLICY "Athletes can view own 1RM notifications"
  ON one_rm_update_notifications FOR SELECT
  TO authenticated
  USING (athlete_id = (select auth.uid()));

DROP POLICY IF EXISTS "Trainers can update athlete 1RM notifications" ON one_rm_update_notifications;
CREATE POLICY "Trainers can update athlete 1RM notifications"
  ON one_rm_update_notifications FOR UPDATE
  TO authenticated
  USING (trainer_id = (select auth.uid()))
  WITH CHECK (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Trainers can view athlete 1RM notifications" ON one_rm_update_notifications;
CREATE POLICY "Trainers can view athlete 1RM notifications"
  ON one_rm_update_notifications FOR SELECT
  TO authenticated
  USING (trainer_id = (select auth.uid()));

-- ============================================
-- exercises
-- ============================================

DROP POLICY IF EXISTS "Only admins can create exercises" ON exercises;
CREATE POLICY "Only admins can create exercises"
  ON exercises FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Only admins can delete exercises" ON exercises;
CREATE POLICY "Only admins can delete exercises"
  ON exercises FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Only admins can update exercises" ON exercises;
CREATE POLICY "Only admins can update exercises"
  ON exercises FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- ============================================
-- anthropometry_results
-- ============================================

DROP POLICY IF EXISTS "Admins can delete all results" ON anthropometry_results;
CREATE POLICY "Admins can delete all results"
  ON anthropometry_results FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert results" ON anthropometry_results;
CREATE POLICY "Admins can insert results"
  ON anthropometry_results FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update all results" ON anthropometry_results;
CREATE POLICY "Admins can update all results"
  ON anthropometry_results FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view all results" ON anthropometry_results;
CREATE POLICY "Admins can view all results"
  ON anthropometry_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Trainers can insert results" ON anthropometry_results;
CREATE POLICY "Trainers can insert results"
  ON anthropometry_results FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('trainer', 'admin')
    )
  );

DROP POLICY IF EXISTS "Trainers can update results" ON anthropometry_results;
CREATE POLICY "Trainers can update results"
  ON anthropometry_results FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('trainer', 'admin')
    )
  );

DROP POLICY IF EXISTS "Trainers can view all results" ON anthropometry_results;
CREATE POLICY "Trainers can view all results"
  ON anthropometry_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('trainer', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can delete own results" ON anthropometry_results;
CREATE POLICY "Users can delete own results"
  ON anthropometry_results FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own results" ON anthropometry_results;
CREATE POLICY "Users can insert own results"
  ON anthropometry_results FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own results" ON anthropometry_results;
CREATE POLICY "Users can update own results"
  ON anthropometry_results FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own results" ON anthropometry_results;
CREATE POLICY "Users can view own results"
  ON anthropometry_results FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));
