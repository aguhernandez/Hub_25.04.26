/*
  # Add DELETE policy for external_planner_tokens

  ## Changes
  - Adds a DELETE RLS policy on external_planner_tokens so admin users can permanently remove tokens from the UI
  - Follows existing JWT-based role check pattern used throughout the codebase
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'external_planner_tokens'
      AND policyname = 'Admin can delete planner tokens'
  ) THEN
    CREATE POLICY "Admin can delete planner tokens"
      ON external_planner_tokens
      FOR DELETE
      TO authenticated
      USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
  END IF;
END $$;
