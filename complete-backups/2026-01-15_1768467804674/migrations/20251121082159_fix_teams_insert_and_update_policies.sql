/*
  # Fix Teams INSERT and UPDATE Policies

  ## Problem
  Trainers cannot create teams because INSERT policy is missing

  ## Changes
  1. Add INSERT policy for trainers and admins to create teams
  2. Add UPDATE policy for team owners to edit their teams
  3. Ensure official Asciende teams cannot be modified by non-admins

  ## Security
  - Only trainers and admins can create teams
  - Coaches can only update their own non-official teams
  - Admins can update any non-official team
  - Official Asciende teams can only be updated by admins
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Trainers and admins can create teams" ON teams;
DROP POLICY IF EXISTS "Coaches can update own teams" ON teams;
DROP POLICY IF EXISTS "Admins can update any team" ON teams;

-- INSERT Policy: Trainers and admins can create teams
CREATE POLICY "Trainers and admins can create teams"
  ON teams FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('trainer', 'admin')
    )
  );

-- UPDATE Policy: Coaches can update their own non-official teams
CREATE POLICY "Coaches can update own non-official teams"
  ON teams FOR UPDATE
  TO authenticated
  USING (
    coach_id = auth.uid()
    AND is_asciende_official = false
  )
  WITH CHECK (
    coach_id = auth.uid()
    AND is_asciende_official = false
  );

-- UPDATE Policy: Admins can update any non-official team
CREATE POLICY "Admins can update non-official teams"
  ON teams FOR UPDATE
  TO authenticated
  USING (
    is_asciende_official = false
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    is_asciende_official = false
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- UPDATE Policy: Admins can update official Asciende teams
CREATE POLICY "Admins can update official teams"
  ON teams FOR UPDATE
  TO authenticated
  USING (
    is_asciende_official = true
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    is_asciende_official = true
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
