/*
  # Fix Team Members Infinite Recursion

  1. Problem
    - Policy "Athletes can view team members of their teams" causes infinite recursion
    - It checks team_members table within a policy on team_members table

  2. Solution
    - Simplify the policy to check direct membership
    - Remove circular dependency
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Athletes can view team members of their teams" ON team_members;

-- Create new non-recursive policy
-- Athletes can view members of teams they belong to
CREATE POLICY "Athletes can view team members of their teams"
  ON team_members FOR SELECT
  TO authenticated
  USING (
    -- Check if user is a member of this team directly
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.athlete_id = auth.uid()
    )
  );

-- Alternative: Use a simpler approach with teams table
DROP POLICY IF EXISTS "Athletes can view team members of their teams" ON team_members;

CREATE POLICY "View team members"
  ON team_members FOR SELECT
  TO authenticated
  USING (
    -- User is viewing their own membership
    athlete_id = auth.uid()
    OR
    -- User is the coach of the team
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_members.team_id
      AND teams.coach_id = auth.uid()
    )
    OR
    -- User is admin
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
