/*
  # Add UPDATE and DELETE policies for habit_templates

  1. Security Changes
    - Add policy for trainers/admins to UPDATE templates
    - Add policy for trainers/admins to DELETE templates
  
  2. Notes
    - Only trainers and admins can modify templates
    - Athletes can only view global templates
*/

-- Allow trainers and admins to update templates
CREATE POLICY "Trainers can update templates"
  ON habit_templates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('trainer', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('trainer', 'admin')
    )
  );

-- Allow trainers and admins to delete templates
CREATE POLICY "Trainers can delete templates"
  ON habit_templates
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('trainer', 'admin')
    )
  );
