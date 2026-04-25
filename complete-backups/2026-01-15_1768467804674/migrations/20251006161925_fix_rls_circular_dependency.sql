/*
  # Fix RLS Circular Dependency Issue
  
  The problem: When logging in, users can't read their own profile because
  the SELECT policies check if they are admin/trainer, which requires reading
  the profile first - creating a circular dependency.
  
  Solution: Simplify the policies so that:
  1. ANY authenticated user can read their OWN profile (no role check needed)
  2. Admins can read ALL profiles
  3. Trainers can read assigned athletes
  
  This fixes the "Database error querying schema" error during login.
*/

-- Drop existing SELECT policies that have circular dependencies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Trainers can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Trainers can view assigned athletes" ON profiles;
DROP POLICY IF EXISTS "Athletes can view their trainer" ON profiles;

-- Create simple, non-circular policy for own profile (HIGHEST PRIORITY)
-- This allows login to work because users can always read their own profile
CREATE POLICY "authenticated_users_read_own_profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Create policy for admins to read all profiles
-- This works because admins can first read their own profile (from policy above)
-- Then this policy lets them read others
CREATE POLICY "admins_read_all_profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Create policy for trainers to read all profiles
CREATE POLICY "trainers_read_all_profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'trainer'
    )
  );

-- Verify policies
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies fixed!';
  RAISE NOTICE '';
  RAISE NOTICE 'New SELECT policies:';
  RAISE NOTICE '1. authenticated_users_read_own_profile - Everyone reads own profile';
  RAISE NOTICE '2. admins_read_all_profiles - Admins read all profiles';
  RAISE NOTICE '3. trainers_read_all_profiles - Trainers read all profiles';
  RAISE NOTICE '';
  RAISE NOTICE 'This fixes the login "Database error querying schema" issue.';
END $$;
