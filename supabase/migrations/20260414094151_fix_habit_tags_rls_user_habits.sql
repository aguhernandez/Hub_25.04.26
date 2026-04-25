/*
  # Fix habit_tags RLS policies to work with user_habits table

  The habit_tags table policies were checking against the `habits` table,
  but the app uses `user_habits` as the primary habits table for users.
  This caused 403 errors on INSERT because the habit_id (from user_habits)
  was not found in the `habits` table.

  Changes:
  - Drop old INSERT policy that checked `habits` table
  - Add new INSERT policy that checks `user_habits` table
  - Update DELETE policies to also check `user_habits`
*/

DROP POLICY IF EXISTS "Users can tag their own habits" ON habit_tags;
DROP POLICY IF EXISTS "Users can remove tags from their habits" ON habit_tags;
DROP POLICY IF EXISTS "Athletes delete own habit tags" ON habit_tags;

CREATE POLICY "Users can tag their own habits"
  ON habit_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_habits uh
      WHERE uh.id = habit_tags.habit_id
        AND (
          uh.user_id = auth.uid()
          OR (SELECT role FROM profiles WHERE id = auth.uid()) = ANY(ARRAY['trainer','admin'])
        )
    )
  );

CREATE POLICY "Users can remove tags from their habits"
  ON habit_tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_habits uh
      WHERE uh.id = habit_tags.habit_id
        AND (
          uh.user_id = auth.uid()
          OR (SELECT role FROM profiles WHERE id = auth.uid()) = ANY(ARRAY['trainer','admin'])
        )
    )
  );
