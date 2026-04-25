/*
  # Fix Admin View All Profiles RLS Policy
  
  1. Problem
    - Admin users can't see all profiles even though JWT has role='admin'
    - Policy syntax is incorrect: (auth.jwt() ->> 'role'::text)
    - Should be: (auth.jwt() ->> 'role')
    
  2. Solution
    - Drop and recreate the admin view policy with correct syntax
    - Test that admin can see all 3 users (admin, trainer, athlete)
*/

-- Drop the incorrect policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Recreate with correct syntax
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'admin'
  );

-- Also fix the admin insert policy
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;

CREATE POLICY "Admins can insert profiles"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'admin'
  );

-- Also fix the admin update policy
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'admin'
  );
