/*
  # Allow Athletes to Self-Assign Workouts

  1. Changes
    - Add INSERT policy for athletes to self-assign workouts
    - Add UPDATE policy for athletes to update their own workouts
    
  2. Security
    - Athletes can only assign workouts to themselves (athlete_id = auth.uid())
    - Athletes can update their own assigned workouts
    - Trainers maintain their existing permissions
*/

-- Allow athletes to self-assign workouts
CREATE POLICY "Athletes can self-assign workouts"
  ON athlete_workouts FOR INSERT
  TO authenticated
  WITH CHECK (
    athlete_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'athlete'
    )
  );

-- Allow athletes to update their own workouts (status, completion, etc)
CREATE POLICY "Athletes can update own workouts"
  ON athlete_workouts FOR UPDATE
  TO authenticated
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());
