/*
  # Fix Athletes View Assigned Workouts

  1. Problem
    - Athletes cannot view workouts assigned to them via athlete_workouts
    - Current policy only allows athletes to see workouts where they are the trainer (incorrect)
    - This causes 400 errors when loading athlete_workouts with workouts join

  2. Solution
    - Drop incorrect athlete policy
    - Create new policy allowing athletes to view workouts assigned to them
    - Athletes can see workouts where they appear in athlete_workouts table
*/

-- Drop the incorrect policy
DROP POLICY IF EXISTS "athletes_view_own_workouts" ON workouts;

-- Create correct policy for athletes to view assigned workouts
CREATE POLICY "Athletes can view assigned workouts"
  ON workouts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM athlete_workouts
      WHERE athlete_workouts.workout_id = workouts.id
      AND athlete_workouts.athlete_id = auth.uid()
    )
  );