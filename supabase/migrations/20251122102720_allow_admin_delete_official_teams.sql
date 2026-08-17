/*
  # Allow Admin to Delete Official Teams

  1. Changes
    - Update DELETE policy for admins to allow deleting official Asciende teams
    - Admins should have full control over all teams including official ones
  
  2. Security
    - Only admins can delete official teams
    - Coaches can still only delete their own non-official teams
*/

-- Drop the restrictive admin delete policy
DROP POLICY IF EXISTS "Admins delete teams" ON teams;

-- Create new policy allowing admins to delete ANY team
CREATE POLICY "Admins delete teams"
  ON teams
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'admin'
  );
