/*
  # Fix habit_skills RLS policies to use correct table name

  1. Changes
    - Drop existing policies that reference wrong table (habits)
    - Create correct policies that reference user_habits table
    - Allow users to view and manage skills for their own habits
  
  2. Security
    - Users can only access skills for habits they own
    - Proper authentication checks
*/

-- Drop existing incorrect policies
DROP POLICY IF EXISTS "Users can view skills for their own habits" ON habit_skills;
DROP POLICY IF EXISTS "Users can insert skills for their own habits" ON habit_skills;
DROP POLICY IF EXISTS "Users can update skills for their own habits" ON habit_skills;
DROP POLICY IF EXISTS "Users can delete skills for their own habits" ON habit_skills;

-- Create correct policies using user_habits table
CREATE POLICY "Users can view skills for their own habits"
  ON habit_skills FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_habits
      WHERE user_habits.id = habit_skills.habit_id
      AND user_habits.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert skills for their own habits"
  ON habit_skills FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_habits
      WHERE user_habits.id = habit_skills.habit_id
      AND user_habits.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update skills for their own habits"
  ON habit_skills FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_habits
      WHERE user_habits.id = habit_skills.habit_id
      AND user_habits.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_habits
      WHERE user_habits.id = habit_skills.habit_id
      AND user_habits.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete skills for their own habits"
  ON habit_skills FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_habits
      WHERE user_habits.id = habit_skills.habit_id
      AND user_habits.user_id = auth.uid()
    )
  );
