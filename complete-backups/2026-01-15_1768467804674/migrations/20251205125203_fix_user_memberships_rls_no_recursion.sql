/*
  # Fix user_memberships RLS policy infinite recursion

  1. Problem
    - "Admins can manage all memberships" policy queries profiles table
    - This can cause infinite recursion when profiles RLS is checked
    
  2. Solution
    - Use auth.jwt() to check admin role instead of querying profiles
    
  3. Changes
    - Replace profile query with JWT check
*/

-- Drop problematic policy
DROP POLICY IF EXISTS "Admins can manage all memberships" ON user_memberships;

-- Recreate using JWT metadata (no recursion)
CREATE POLICY "Admins can manage all memberships"
  ON user_memberships
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt()->>'role' = 'admin')
  );
