/*
  # Fix Teams RLS - Remove Infinite Recursion
  
  1. Problem
    - Multiple policies with profile JOINs cause infinite recursion
    - Too many overlapping SELECT policies
  
  2. Solution
    - Drop ALL existing policies
    - Create SIMPLE policies without profile JOINs
    - Use direct role checks with auth.jwt()
  
  3. New Policies
    - SELECT: Allow viewing official teams, public teams, own teams, member teams
    - INSERT: Allow trainers and admins to create teams
    - UPDATE: Allow coaches to update own teams, admins to update any
    - DELETE: Allow coaches to delete own teams, admins to delete any non-official
*/

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Admins can delete any non-official team" ON teams;
DROP POLICY IF EXISTS "Coaches can delete own non-official teams" ON teams;
DROP POLICY IF EXISTS "Trainers and admins can create teams" ON teams;
DROP POLICY IF EXISTS "Admins view all teams" ON teams;
DROP POLICY IF EXISTS "Athletes can view their teams" ON teams;
DROP POLICY IF EXISTS "Coaches and admins can view all teams" ON teams;
DROP POLICY IF EXISTS "View own teams as coach" ON teams;
DROP POLICY IF EXISTS "View public and official teams" ON teams;
DROP POLICY IF EXISTS "View teams as member" ON teams;
DROP POLICY IF EXISTS "Admins can update non-official teams" ON teams;
DROP POLICY IF EXISTS "Admins can update official teams" ON teams;
DROP POLICY IF EXISTS "Coaches can update own non-official teams" ON teams;

-- SELECT: Everyone can view official and public teams
CREATE POLICY "Anyone can view official and public teams"
  ON teams FOR SELECT
  TO authenticated
  USING (is_asciende_official = true OR is_public = true);

-- SELECT: View own teams as coach
CREATE POLICY "Coaches view own teams"
  ON teams FOR SELECT
  TO authenticated
  USING (coach_id = auth.uid());

-- SELECT: View teams as member
CREATE POLICY "Members view their teams"
  ON teams FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
      AND team_members.athlete_id = auth.uid()
    )
  );

-- SELECT: Admins view all teams (simple check without JOIN)
CREATE POLICY "Admins view all teams"
  ON teams FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'admin');

-- INSERT: Trainers and admins can create teams (simple check)
CREATE POLICY "Trainers and admins create teams"
  ON teams FOR INSERT
  TO authenticated
  WITH CHECK (
    coach_id = auth.uid() 
    AND ((auth.jwt()->>'role')::text IN ('trainer', 'admin'))
  );

-- UPDATE: Coaches update own non-official teams
CREATE POLICY "Coaches update own teams"
  ON teams FOR UPDATE
  TO authenticated
  USING (coach_id = auth.uid() AND is_asciende_official = false)
  WITH CHECK (coach_id = auth.uid() AND is_asciende_official = false);

-- UPDATE: Admins update any team
CREATE POLICY "Admins update any team"
  ON teams FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'admin')
  WITH CHECK ((auth.jwt()->>'role')::text = 'admin');

-- DELETE: Coaches delete own non-official teams
CREATE POLICY "Coaches delete own teams"
  ON teams FOR DELETE
  TO authenticated
  USING (coach_id = auth.uid() AND is_asciende_official = false);

-- DELETE: Admins delete non-official teams
CREATE POLICY "Admins delete teams"
  ON teams FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'admin' AND is_asciende_official = false);
