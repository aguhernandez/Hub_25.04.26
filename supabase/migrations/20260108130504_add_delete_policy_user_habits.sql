/*
  # Add DELETE policy for user_habits table

  1. Changes
    - Add DELETE policy to allow users to delete their own habits
  
  2. Security
    - Users can only delete habits they own
    - Proper authentication check
*/

CREATE POLICY "Users delete own habits"
  ON user_habits FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
