/*
  # Fix All Remaining JWT Role Policies

  1. Problem
    - Multiple policies still use: auth.jwt() ->> 'role'
    - Should use: auth.jwt() -> 'app_metadata' ->> 'role'
  
  2. Tables Affected
    - program_day_workouts
    - program_days
    - program_products
    - program_weeks
    - team_members
    - teams
    - training_programs
    - user_memberships
  
  3. Changes
    - Drop and recreate all policies with correct JWT path
    - Ensures consistent role checking across all tables
*/

-- program_day_workouts policies
DROP POLICY IF EXISTS "Admins delete program day workouts" ON program_day_workouts;
DROP POLICY IF EXISTS "Admins update program day workouts" ON program_day_workouts;
DROP POLICY IF EXISTS "Admins view all program day workouts" ON program_day_workouts;

CREATE POLICY "Admins delete program day workouts"
  ON program_day_workouts FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins update program day workouts"
  ON program_day_workouts FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins view all program day workouts"
  ON program_day_workouts FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- program_days policies
DROP POLICY IF EXISTS "Admins delete program days" ON program_days;
DROP POLICY IF EXISTS "Admins update program days" ON program_days;
DROP POLICY IF EXISTS "Admins view all program days" ON program_days;

CREATE POLICY "Admins delete program days"
  ON program_days FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins update program days"
  ON program_days FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins view all program days"
  ON program_days FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- program_products policies
DROP POLICY IF EXISTS "Admins can delete any program" ON program_products;
DROP POLICY IF EXISTS "Admins can update any program" ON program_products;

CREATE POLICY "Admins can delete any program"
  ON program_products FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can update any program"
  ON program_products FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- program_weeks policies
DROP POLICY IF EXISTS "Admins delete program weeks" ON program_weeks;
DROP POLICY IF EXISTS "Admins update program weeks" ON program_weeks;
DROP POLICY IF EXISTS "Admins view all program weeks" ON program_weeks;

CREATE POLICY "Admins delete program weeks"
  ON program_weeks FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins update program weeks"
  ON program_weeks FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins view all program weeks"
  ON program_weeks FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- team_members policies
DROP POLICY IF EXISTS "Admins remove team members" ON team_members;
DROP POLICY IF EXISTS "Admins view all team members" ON team_members;

CREATE POLICY "Admins remove team members"
  ON team_members FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins view all team members"
  ON team_members FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- teams policies
DROP POLICY IF EXISTS "Admins delete teams" ON teams;
DROP POLICY IF EXISTS "Admins update any team" ON teams;
DROP POLICY IF EXISTS "Admins view all teams" ON teams;
DROP POLICY IF EXISTS "Trainers update own teams" ON teams;

CREATE POLICY "Admins delete teams"
  ON teams FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins update any team"
  ON teams FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins view all teams"
  ON teams FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Trainers update own teams"
  ON teams FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'trainer' 
    AND coach_id = auth.uid() 
    AND is_asciende_official = false
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'trainer' 
    AND coach_id = auth.uid() 
    AND is_asciende_official = false
  );

-- training_programs policies
DROP POLICY IF EXISTS "Admins delete any program" ON training_programs;
DROP POLICY IF EXISTS "Admins update any program" ON training_programs;
DROP POLICY IF EXISTS "Admins view all programs" ON training_programs;
DROP POLICY IF EXISTS "Trainers create own programs" ON training_programs;
DROP POLICY IF EXISTS "Trainers delete own programs" ON training_programs;
DROP POLICY IF EXISTS "Trainers update own programs" ON training_programs;
DROP POLICY IF EXISTS "Trainers view own programs" ON training_programs;

CREATE POLICY "Admins delete any program"
  ON training_programs FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins update any program"
  ON training_programs FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins view all programs"
  ON training_programs FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Trainers create own programs"
  ON training_programs FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'trainer' 
    AND created_by = auth.uid()
  );

CREATE POLICY "Trainers delete own programs"
  ON training_programs FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'trainer' 
    AND created_by = auth.uid()
  );

CREATE POLICY "Trainers update own programs"
  ON training_programs FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'trainer' 
    AND created_by = auth.uid()
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'trainer' 
    AND created_by = auth.uid()
  );

CREATE POLICY "Trainers view own programs"
  ON training_programs FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'trainer' 
    AND created_by = auth.uid()
  );

-- user_memberships policies
DROP POLICY IF EXISTS "Admins can manage all memberships" ON user_memberships;

CREATE POLICY "Admins can manage all memberships"
  ON user_memberships FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
