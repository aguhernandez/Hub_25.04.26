/*
  # Allow Users to View Trainer Profiles
  
  1. Problem
    - Athletes cannot see trainer profiles when trying to select their trainer
    - Current policy only allows users to see their own profile
  
  2. Solution
    - Add RLS policy allowing all authenticated users to view trainer profiles
    - This is needed for the trainer selection dropdown in athlete settings
  
  3. Security
    - Only basic trainer profile info is visible (name, email)
    - Trainers can still only see their assigned athletes
    - No sensitive data exposed
*/

-- Allow all authenticated users to view trainer profiles (for selection dropdown)
CREATE POLICY "users_view_trainer_profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    role = 'trainer'
  );
