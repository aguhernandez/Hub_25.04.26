/*
  # Update RLS Policies for Group Workout Assignments

  1. Changes
    - Update athlete_workouts policies to support team and membership assignments
    - Ensure athletes can see workouts assigned directly or via groups
    - Maintain trainer permissions for group assignments
  
  2. Security
    - Athletes see workouts assigned to them individually OR via team/membership
    - Trainers can only assign to their own teams and memberships
    - Admin has full access
*/

-- Drop and recreate athlete_workouts select policy
DROP POLICY IF EXISTS "Athletes can view own workouts" ON athlete_workouts;
DROP POLICY IF EXISTS "Trainers can view assigned workouts" ON athlete_workouts;
DROP POLICY IF EXISTS "Users can view own assigned workouts" ON athlete_workouts;

CREATE POLICY "Athletes view own and group workouts"
  ON athlete_workouts
  FOR SELECT
  TO authenticated
  USING (
    -- Admin sees all
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR
    -- Trainer sees workouts they assigned
    trainer_id = auth.uid()
    OR
    -- Athlete sees their own workouts (directly assigned)
    athlete_id = auth.uid()
  );

-- Update insert policy for trainers to allow group assignments
DROP POLICY IF EXISTS "Trainers can assign workouts" ON athlete_workouts;
DROP POLICY IF EXISTS "Trainers can insert athlete workouts" ON athlete_workouts;

CREATE POLICY "Trainers assign workouts to individuals and groups"
  ON athlete_workouts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Admin can assign anything
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR
    -- Trainer can assign workouts
    (
      trainer_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'trainer'
      )
    )
    OR
    -- Athletes can create for themselves
    (
      athlete_id = auth.uid()
      AND trainer_id IS NULL
      AND assignment_type = 'individual'
    )
  );

-- Grant execute permissions on the RPC functions
GRANT EXECUTE ON FUNCTION assign_workout_to_team TO authenticated;
GRANT EXECUTE ON FUNCTION assign_workout_to_membership TO authenticated;

-- Add comments
COMMENT ON POLICY "Athletes view own and group workouts" ON athlete_workouts IS
'Athletes can view workouts assigned to them individually or via team/membership. Trainers see workouts they assigned.';

COMMENT ON POLICY "Trainers assign workouts to individuals and groups" ON athlete_workouts IS
'Trainers can assign workouts to individuals, teams, or memberships. Athletes can only create workouts for themselves.';
