/*
  # Allow inserting global exercises
  
  Temporary policy to allow loading the initial exercise library.
  This can be removed after exercises are loaded.
*/

-- Drop existing restrictive insert policy
DROP POLICY IF EXISTS "Only admins can create exercises" ON exercises;

-- Create new policy that allows inserting global exercises
CREATE POLICY "Anyone can insert global exercises"
  ON exercises
  FOR INSERT
  TO authenticated
  WITH CHECK (is_global = true AND created_by IS NULL);
