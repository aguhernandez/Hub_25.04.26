/*
  # Optimize Remaining RLS Policies - Part 6

  1. Purpose
    - Continue RLS optimization
    - Covers: project proposals, athlete messages, admin messages, athlete support projects

  2. Security
    - Maintains exact same security logic
*/

-- ============================================
-- project_proposals
-- ============================================

DROP POLICY IF EXISTS "Admins can update project proposals" ON project_proposals;
CREATE POLICY "Admins can update project proposals"
  ON project_proposals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view all project proposals" ON project_proposals;
CREATE POLICY "Admins can view all project proposals"
  ON project_proposals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- ============================================
-- athlete_messages
-- ============================================

DROP POLICY IF EXISTS "Admins can update athlete messages" ON athlete_messages;
CREATE POLICY "Admins can update athlete messages"
  ON athlete_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view all athlete messages" ON athlete_messages;
CREATE POLICY "Admins can view all athlete messages"
  ON athlete_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- ============================================
-- admin_messages
-- ============================================

DROP POLICY IF EXISTS "Admins can update admin messages" ON admin_messages;
CREATE POLICY "Admins can update admin messages"
  ON admin_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view all admin messages" ON admin_messages;
CREATE POLICY "Admins can view all admin messages"
  ON admin_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- ============================================
-- athlete_support_projects
-- ============================================

DROP POLICY IF EXISTS "Admins can manage all support projects" ON athlete_support_projects;
CREATE POLICY "Admins can manage all support projects"
  ON athlete_support_projects FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Athletes can view own support projects" ON athlete_support_projects;
CREATE POLICY "Athletes can view own support projects"
  ON athlete_support_projects FOR SELECT
  TO authenticated
  USING (athlete_id = (select auth.uid()));

-- ============================================
-- project_transparency_updates
-- ============================================

DROP POLICY IF EXISTS "Admins can manage all transparency updates" ON project_transparency_updates;
CREATE POLICY "Admins can manage all transparency updates"
  ON project_transparency_updates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Athletes can view own project updates" ON project_transparency_updates;
CREATE POLICY "Athletes can view own project updates"
  ON project_transparency_updates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM athlete_support_projects
      WHERE athlete_support_projects.id = project_transparency_updates.project_id
      AND athlete_support_projects.athlete_id = (select auth.uid())
    )
  );
