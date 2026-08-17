/*
  # Fix Remaining INSERT Policies JWT Path

  1. Problem
    - INSERT policies for admin still use: auth.jwt() ->> 'role'
    - Should use: auth.jwt() -> 'app_metadata' ->> 'role'
  
  2. Tables Affected
    - program_day_workouts
    - program_days
    - program_weeks
    - team_members
    - training_programs
  
  3. Changes
    - Drop and recreate INSERT policies with correct JWT path
*/

-- program_day_workouts
DROP POLICY IF EXISTS "Admins create program day workouts" ON program_day_workouts;
CREATE POLICY "Admins create program day workouts"
  ON program_day_workouts FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- program_days
DROP POLICY IF EXISTS "Admins create program days" ON program_days;
CREATE POLICY "Admins create program days"
  ON program_days FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- program_weeks
DROP POLICY IF EXISTS "Admins create program weeks" ON program_weeks;
CREATE POLICY "Admins create program weeks"
  ON program_weeks FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- team_members
DROP POLICY IF EXISTS "Admins add team members" ON team_members;
CREATE POLICY "Admins add team members"
  ON team_members FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- training_programs
DROP POLICY IF EXISTS "Admins create any program" ON training_programs;
CREATE POLICY "Admins create any program"
  ON training_programs FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
