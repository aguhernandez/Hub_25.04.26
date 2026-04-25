/*
  # Update Courses - Add Trainer Permissions

  1. Changes
    - Allow trainers to manage courses (create, edit, delete)
    - Maintain admin permissions
    - Athletes can only view active courses filtered by their sports

  2. Security
    - Trainers and admins can manage all courses
    - Athletes see courses matching their team sports
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage courses" ON courses;

-- Create new policy for trainers and admins
CREATE POLICY "Trainers and admins can manage courses"
  ON courses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'trainer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'trainer')
    )
  );
