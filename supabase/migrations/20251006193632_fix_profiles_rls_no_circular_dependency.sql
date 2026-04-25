/*
  # Fix Profiles RLS - Remove Circular Dependencies
  
  1. Problem
    - Current policies for admin/trainer have circular dependency
    - They query profiles table to check role, but need permission to read profiles first
    - This causes infinite loops
  
  2. Solution
    - Drop circular policies
    - Keep simple policy: users read own profile
    - Admin/trainer will read their own profile with basic policy
    - For reading OTHER profiles, use application-level checks or service role
  
  3. Security
    - Users can read their own profile
    - No circular dependencies
    - Application layer handles admin/trainer permissions
*/

-- Drop circular dependency policies
DROP POLICY IF EXISTS "admins_read_all_profiles" ON profiles;
DROP POLICY IF EXISTS "trainers_read_all_profiles" ON profiles;

-- Keep the simple, working policy
-- Policy "users_read_own_profile" already exists and works
