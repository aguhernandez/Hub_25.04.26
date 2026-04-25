/*
  # Add Trainer Access to Assigned Athletes
  
  1. Problem
    - Trainers cannot see profiles of their assigned athletes
    - This breaks the workout assignment functionality
  
  2. Solution
    - Add RLS policy allowing trainers to read profiles of athletes they are assigned to
    - Uses assigned_trainer_id field in profiles table
  
  3. Security
    - Trainers can only see athletes assigned to them
    - Athletes can still only see their own profile
    - No circular dependency (checks assigned_trainer_id directly)
*/

-- Allow trainers to view their assigned athletes' profiles
CREATE POLICY "trainers_view_assigned_athletes"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Trainer can see athletes where assigned_trainer_id = trainer's id
    assigned_trainer_id = auth.uid()
  );
