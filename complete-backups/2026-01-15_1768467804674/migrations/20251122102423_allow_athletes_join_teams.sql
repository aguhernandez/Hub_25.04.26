/*
  # Allow Athletes to Join Teams

  1. Changes
    - Add INSERT policy for athletes to join teams themselves
    - This allows athletes to self-join teams using join codes or invitations
  
  2. Security
    - Athletes can only insert themselves (athlete_id = auth.uid())
    - This enables the "Join Team" functionality in the UI
*/

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Athletes can join teams" ON team_members;

-- Create policy for athletes to join teams
CREATE POLICY "Athletes can join teams"
  ON team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    athlete_id = auth.uid()
  );
