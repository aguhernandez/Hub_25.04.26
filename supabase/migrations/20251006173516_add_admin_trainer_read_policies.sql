/*
  # Add Admin and Trainer Read Policies

  1. Changes
    - Add policy for admins to read all profiles
    - Add policy for trainers to read all profiles
    - Keep existing policy for users to read their own profile
  
  2. Security
    - Admins can read all user profiles for management
    - Trainers can read all profiles to manage their athletes
    - Regular users can only read their own profile
*/

-- Add policy for admins to read all profiles
CREATE POLICY "admins_read_all_profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Add policy for trainers to read all profiles
CREATE POLICY "trainers_read_all_profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'trainer'
    )
  );
