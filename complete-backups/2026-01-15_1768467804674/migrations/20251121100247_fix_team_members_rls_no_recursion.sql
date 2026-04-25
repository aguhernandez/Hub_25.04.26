/*
  # Fix Team Members RLS - Remove Infinite Recursion
  
  1. Problem
    - team_members policies JOIN with teams
    - teams policies JOIN with team_members
    - This creates infinite recursion
  
  2. Solution
    - Simplify team_members policies
    - Remove all JOINs with profiles
    - Use simple direct checks
  
  3. Changes
    - Drop problematic policies
    - Create simple policies without JOINs
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Coaches can manage team members" ON team_members;
DROP POLICY IF EXISTS "Admins can view all team members" ON team_members;
DROP POLICY IF EXISTS "View team members" ON team_members;

-- SELECT: Athletes can view their own memberships
CREATE POLICY "Athletes view own memberships"
  ON team_members FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

-- SELECT: Coaches can view members of their teams (without JOIN)
CREATE POLICY "Coaches view team members"
  ON team_members FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT id FROM teams WHERE coach_id = auth.uid()
    )
  );

-- SELECT: Admins view all
CREATE POLICY "Admins view all team members"
  ON team_members FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'admin');

-- INSERT: Coaches add members to their teams
CREATE POLICY "Coaches add team members"
  ON team_members FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT id FROM teams WHERE coach_id = auth.uid()
    )
  );

-- INSERT: Admins can add anyone
CREATE POLICY "Admins add team members"
  ON team_members FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt()->>'role')::text = 'admin');

-- DELETE: Coaches remove members from their teams
CREATE POLICY "Coaches remove team members"
  ON team_members FOR DELETE
  TO authenticated
  USING (
    team_id IN (
      SELECT id FROM teams WHERE coach_id = auth.uid()
    )
  );

-- DELETE: Admins can remove anyone
CREATE POLICY "Admins remove team members"
  ON team_members FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'admin');

-- DELETE: Athletes can leave teams
CREATE POLICY "Athletes leave teams"
  ON team_members FOR DELETE
  TO authenticated
  USING (athlete_id = auth.uid());
