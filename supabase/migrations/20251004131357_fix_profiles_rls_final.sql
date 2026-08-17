/*
  # Fix Profiles RLS - Remove All Recursive Policies

  1. Changes
    - Drop ALL existing policies on profiles
    - Create new non-recursive policies
    - Use simple auth.uid() checks only

  2. Security
    - Users can view their own profile only
    - Users can update their own profile only
    - No recursive role checks
*/

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Trainers can view assigned athletes" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Trainers can view other profiles" ON profiles;

-- Create simple, non-recursive policies

-- Users can view ONLY their own profile
CREATE POLICY "Users view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can update ONLY their own profile  
CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Allow INSERT for new users (handled by trigger)
CREATE POLICY "Users insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());
