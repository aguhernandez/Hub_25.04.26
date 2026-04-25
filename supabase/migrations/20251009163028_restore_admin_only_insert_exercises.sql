/*
  # Restore admin-only insert policy for exercises
  
  After loading the initial exercise library, restore the security policy
  that only allows admins to create new exercises.
*/

-- Drop the temporary policy
DROP POLICY IF EXISTS "Anyone can insert global exercises" ON exercises;

-- Restore admin-only insert policy
CREATE POLICY "Only admins can create exercises"
  ON exercises
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
