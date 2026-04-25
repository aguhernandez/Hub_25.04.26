/*
  # Fix RLS Policies - Correct JWT Path for Role

  1. Problem
    - Current policies check: auth.jwt() ->> 'role'
    - But role is stored in: auth.jwt() -> 'app_metadata' ->> 'role'
  
  2. Solution
    - Update all policies to use the correct JWT path
    - Affects profiles table policies for admin and trainer access
  
  3. Changes
    - Drop and recreate policies with correct JWT path
    - Admin can view all profiles
    - Admin can update all profiles
    - Admin can insert profiles
    - Trainer can update assigned athletes
*/

-- Drop existing policies that use incorrect JWT path
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Trainers can update assigned athletes" ON profiles;

-- Recreate with correct JWT path
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can insert profiles"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Trainers can update assigned athletes"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'trainer' 
    AND assigned_trainer_id = auth.uid()
  );
