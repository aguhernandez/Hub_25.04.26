/*
  # Allow Athletes to Create Their Own Workouts
  
  1. Problem
    - Athletes cannot create workouts for themselves
    - Current policies only allow trainers to create workouts
  
  2. Solution
    - Add RLS policies allowing athletes to create, view, update, and delete their own workouts
    - Athletes store their user_id in trainer_id field (since they are self-coaching)
  
  3. Security
    - Athletes can only manage their own workouts
    - Athletes cannot see other athletes' workouts
    - Trainers maintain existing access to their own workouts
*/

-- Allow athletes to create workouts for themselves
CREATE POLICY "athletes_create_own_workouts"
  ON workouts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    trainer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'athlete'
    )
  );

-- Allow athletes to view their own created workouts
CREATE POLICY "athletes_view_own_workouts"
  ON workouts
  FOR SELECT
  TO authenticated
  USING (
    trainer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'athlete'
    )
  );

-- Allow athletes to update their own workouts
CREATE POLICY "athletes_update_own_workouts"
  ON workouts
  FOR UPDATE
  TO authenticated
  USING (
    trainer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'athlete'
    )
  )
  WITH CHECK (
    trainer_id = auth.uid()
  );

-- Allow athletes to delete their own workouts
CREATE POLICY "athletes_delete_own_workouts"
  ON workouts
  FOR DELETE
  TO authenticated
  USING (
    trainer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'athlete'
    )
  );
