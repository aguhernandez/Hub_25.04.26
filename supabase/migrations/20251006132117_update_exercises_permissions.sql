/*
  # Update Exercises Permissions
  
  Changes exercise permissions so that:
  - Only admins can create exercises
  - Only admins can update exercises
  - Only admins can delete exercises
  - Everyone (authenticated users) can view exercises
  
  1. Changes
    - Drop old policies
    - Create new restrictive policies for CREATE/UPDATE/DELETE (admin only)
    - Create permissive policy for SELECT (all authenticated users)
    
  2. Security
    - Admins have full control
    - Trainers and athletes can only view
    - No one can modify exercises except admins
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view global exercises" ON exercises;
DROP POLICY IF EXISTS "Trainers can create exercises" ON exercises;

-- Everyone can view all exercises
CREATE POLICY "Everyone can view exercises"
  ON exercises FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can create exercises
CREATE POLICY "Only admins can create exercises"
  ON exercises FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can update exercises
CREATE POLICY "Only admins can update exercises"
  ON exercises FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can delete exercises
CREATE POLICY "Only admins can delete exercises"
  ON exercises FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
