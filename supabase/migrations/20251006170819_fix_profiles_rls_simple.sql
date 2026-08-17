/*
  # Fix Profiles RLS - Remove Circular Dependencies

  1. Changes
    - Drop all existing SELECT policies on profiles
    - Create ONE simple policy: users can read their own profile
    - This removes the circular dependency where reading your profile requires reading your profile first
  
  2. Security
    - Users can only read their own profile
    - Admin/trainer permissions are checked in the application layer, not in RLS
*/

-- Drop all existing SELECT policies
DROP POLICY IF EXISTS "authenticated_users_read_own_profile" ON profiles;
DROP POLICY IF EXISTS "admins_read_all_profiles" ON profiles;
DROP POLICY IF EXISTS "trainers_read_all_profiles" ON profiles;

-- Create ONE simple policy for reading profiles
CREATE POLICY "users_read_own_profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);
