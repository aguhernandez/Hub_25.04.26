/*
  # Fix infinite recursion in profiles RLS policies

  1. Problem
    - Current policies query profiles table to check user role
    - This creates infinite recursion: to update profiles, we check profiles, which checks profiles...
    
  2. Solution
    - Use auth.jwt() to get role from JWT metadata instead of querying profiles
    - The sync_role_to_jwt trigger already keeps JWT in sync with profile role
    
  3. Changes
    - Replace all policies that query profiles table with JWT-based checks
    - Maintains same security model but eliminates recursion
*/

-- Drop problematic policies that cause recursion
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Trainers can update athlete profiles" ON profiles;

-- Recreate policies using JWT metadata (no recursion)

-- Admin policies using JWT
CREATE POLICY "Admins can insert profiles"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'role' = 'admin')
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'role' = 'admin')
  );

-- Trainer policy using JWT
CREATE POLICY "Trainers can update assigned athletes"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'role' = 'trainer') 
    AND (profiles.assigned_trainer_id = auth.uid())
  );

-- Add admin SELECT policy using JWT
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role' = 'admin')
  );
