/*
  # Fix Teams RLS Policies

  ## Overview
  Fixes the teams table RLS policies to allow trainers to create teams properly.

  ## Changes
  1. Update "Trainers create own teams" policy to allow creation without restrictions on is_asciende_official
  2. Optimize auth calls with SELECT wrapper
*/

-- Drop and recreate the policies with optimized auth calls
DROP POLICY IF EXISTS "Admins create any team" ON teams;
CREATE POLICY "Admins create any team" ON teams
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Trainers create own teams" ON teams;
CREATE POLICY "Trainers create own teams" ON teams
  FOR INSERT TO authenticated
  WITH CHECK (
    coach_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('trainer', 'admin')
    )
  );
