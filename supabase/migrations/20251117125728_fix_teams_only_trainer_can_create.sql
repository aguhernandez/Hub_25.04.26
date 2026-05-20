/*
  # Fix Teams - Only Trainer Can Create

  1. Security Changes
    - Update teams INSERT policy to allow ONLY trainers (not admins)
    - Admin can still VIEW all teams but cannot create them
    - This allows trainers to manage their sport groups independently

  2. Rationale
    - Teams/Sports are managed by trainers who work directly with athletes
    - Admin has oversight but doesn't need to create teams
    - Clear separation of responsibilities
*/

DROP POLICY IF EXISTS "Coaches can create teams" ON teams;
CREATE POLICY "Only trainers can create teams"
  ON teams FOR INSERT
  TO authenticated
  WITH CHECK (
    coach_id = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'trainer'
    )
  );
