/*
  # Fix Teams INSERT and UPDATE Policies
  
  1. Problem
    - Current INSERT policy requires coach_id = auth.uid()
    - This prevents admins from creating teams for other coaches
    - Also prevents setting is_asciende_official to true
  
  2. Solution
    - Separate policies for trainers (own teams) and admins (any team)
    - Admins can create teams with any coach_id
    - Admins can set is_asciende_official flag
*/

-- Drop old INSERT policy
DROP POLICY IF EXISTS "Trainers and admins create teams" ON teams;

-- Trainers can create teams where they are the coach
CREATE POLICY "Trainers create own teams"
  ON teams FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'role')::text = 'trainer' AND
    coach_id = auth.uid() AND
    is_asciende_official = false
  );

-- Admins can create any team
CREATE POLICY "Admins create any team"
  ON teams FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt()->>'role')::text = 'admin');

-- Fix UPDATE policies as well

-- Drop old UPDATE policies
DROP POLICY IF EXISTS "Coaches update own teams" ON teams;
DROP POLICY IF EXISTS "Admins update any team" ON teams;

-- Trainers update own teams (not official ones)
CREATE POLICY "Trainers update own teams"
  ON teams FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text = 'trainer' AND
    coach_id = auth.uid() AND
    is_asciende_official = false
  )
  WITH CHECK (
    (auth.jwt()->>'role')::text = 'trainer' AND
    coach_id = auth.uid() AND
    is_asciende_official = false
  );

-- Admins update any team
CREATE POLICY "Admins update any team"
  ON teams FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'admin')
  WITH CHECK ((auth.jwt()->>'role')::text = 'admin');
