/*
  # Fix Infinite Recursion in Teams Policies

  ## Problem
  - Teams policies reference team_members
  - Team_members policies reference teams
  - This creates infinite recursion when querying

  ## Solution
  - Simplify teams policies to avoid circular references
  - Use direct auth.uid() checks where possible
  - Remove redundant EXISTS clauses

  ## Changes
  1. Drop and recreate teams policies without circular dependencies
  2. Keep team_members policies as they are (they're fine)
*/

-- Drop existing problematic policies on teams
DROP POLICY IF EXISTS "Athletes can view teams they belong to" ON teams;
DROP POLICY IF EXISTS "Admins can view all teams" ON teams;

-- Recreate simplified policies
CREATE POLICY "Coaches and admins can view all teams"
  ON teams FOR SELECT
  TO authenticated
  USING (
    coach_id = auth.uid()
    OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Athletes can view their teams"
  ON teams FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT team_id 
      FROM team_members 
      WHERE athlete_id = auth.uid()
    )
  );

-- Ensure coaches can create teams (already exists but verify)
DROP POLICY IF EXISTS "Coaches can create teams" ON teams;
CREATE POLICY "Coaches can create teams"
  ON teams FOR INSERT
  TO authenticated
  WITH CHECK (
    coach_id = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('trainer', 'admin')
    )
  );