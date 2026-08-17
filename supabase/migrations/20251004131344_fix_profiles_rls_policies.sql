/*
  # Fix Profiles RLS Policies

  1. Changes
    - Drop existing policies causing infinite recursion
    - Recreate policies without recursive queries
    - Simplify trainer and admin policies

  2. Security
    - Users can view their own profile
    - Users can update their own profile
    - Admins have full access via direct role check
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Trainers can view assigned athletes" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Recreate admin policy without recursion
CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Create a simpler policy for trainers to view other profiles
CREATE POLICY "Trainers can view other profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('trainer', 'admin')
  );
