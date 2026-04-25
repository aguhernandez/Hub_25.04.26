/*
  # Fix Admin Permissions for Programs and Memberships
  
  1. Problem
    - Policies check profiles table for role, causing recursion issues
    - Admin cannot create programs/memberships
  
  2. Solution
    - Use auth.jwt()->>'role' instead of profiles lookup
    - Separate policies for clarity
    - Admin gets full access to both tables
*/

-- ============================================
-- TRAINING PROGRAMS POLICIES
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Admins can manage programs" ON training_programs;
DROP POLICY IF EXISTS "trainers_admins_create_programs" ON training_programs;
DROP POLICY IF EXISTS "creators_update_own_programs" ON training_programs;
DROP POLICY IF EXISTS "creators_admins_delete_programs" ON training_programs;
DROP POLICY IF EXISTS "admins_read_all_programs" ON training_programs;
DROP POLICY IF EXISTS "trainers_read_own_programs" ON training_programs;

-- SELECT policies
CREATE POLICY "Admins view all programs"
  ON training_programs FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'admin');

CREATE POLICY "Trainers view own programs"
  ON training_programs FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text = 'trainer' AND
    created_by = auth.uid()
  );

-- Keep existing public read policies
-- "Anyone can view active programs" - already exists
-- "users_read_public_templates" - already exists

-- INSERT policies
CREATE POLICY "Admins create any program"
  ON training_programs FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt()->>'role')::text = 'admin');

CREATE POLICY "Trainers create own programs"
  ON training_programs FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'role')::text = 'trainer' AND
    created_by = auth.uid()
  );

-- UPDATE policies
CREATE POLICY "Admins update any program"
  ON training_programs FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'admin')
  WITH CHECK ((auth.jwt()->>'role')::text = 'admin');

CREATE POLICY "Trainers update own programs"
  ON training_programs FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text = 'trainer' AND
    created_by = auth.uid()
  )
  WITH CHECK (
    (auth.jwt()->>'role')::text = 'trainer' AND
    created_by = auth.uid()
  );

-- DELETE policies
CREATE POLICY "Admins delete any program"
  ON training_programs FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'admin');

CREATE POLICY "Trainers delete own programs"
  ON training_programs FOR DELETE
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text = 'trainer' AND
    created_by = auth.uid()
  );

-- ============================================
-- MEMBERSHIPS POLICIES
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Admins can manage memberships" ON memberships;

-- SELECT policies
CREATE POLICY "Admins view all memberships"
  ON memberships FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'admin');

-- Keep existing public read policy
-- "Anyone can view active memberships" - already exists

-- INSERT policies
CREATE POLICY "Admins create memberships"
  ON memberships FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt()->>'role')::text = 'admin');

-- UPDATE policies
CREATE POLICY "Admins update memberships"
  ON memberships FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'admin')
  WITH CHECK ((auth.jwt()->>'role')::text = 'admin');

-- DELETE policies
CREATE POLICY "Admins delete memberships"
  ON memberships FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'admin');
