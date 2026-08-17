/*
  # Fix admin SELECT policy on profiles table

  ## Problem
  The existing "profiles_select_admin" policy checks:
    (auth.jwt() ->> 'role') = 'admin'
  
  But the role is stored in app_metadata, so the correct JWT path is:
    auth.jwt() -> 'app_metadata' ->> 'role'

  Also add trainer policy so trainers can see their assigned athletes.

  ## Changes
  - Drop old broken admin select policy
  - Recreate it with correct JWT path
  - Add trainer select policy for assigned athletes
*/

DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;

CREATE POLICY "profiles_select_admin"
  ON profiles
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "profiles_select_trainer" ON profiles;

CREATE POLICY "profiles_select_trainer"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'trainer'
    AND (
      id = auth.uid()
      OR assigned_trainer_id = auth.uid()
    )
  );
