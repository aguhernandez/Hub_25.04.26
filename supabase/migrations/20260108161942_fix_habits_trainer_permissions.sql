/*
  # Fix Habits Trainer Permissions
  
  1. Changes
    - Add policies for trainers to view their assigned athletes' habits
    - Add policies for trainers to view habit logs of their athletes
    - Add policies for trainers to view habit skills of their athletes
    - Add policies for trainers to view skill logs of their athletes
    - Allow trainers to insert/update/delete habits for their athletes
    
  2. Security
    - Trainers can only access habits data for athletes they are assigned to
    - Athletes retain full control over their own habits
    - Admin users have full access
*/

-- user_habits: Allow trainers to view assigned athletes' habits
DROP POLICY IF EXISTS "Trainers view assigned athletes habits" ON user_habits;
CREATE POLICY "Trainers view assigned athletes habits"
  ON user_habits
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_habits.user_id
      AND profiles.assigned_trainer_id = auth.uid()
    )
  );

-- user_habits: Allow trainers to insert habits for their athletes
DROP POLICY IF EXISTS "Trainers create habits for athletes" ON user_habits;
CREATE POLICY "Trainers create habits for athletes"
  ON user_habits
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_habits.user_id
      AND profiles.assigned_trainer_id = auth.uid()
    )
  );

-- user_habits: Allow trainers to update their athletes' habits
DROP POLICY IF EXISTS "Trainers update athletes habits" ON user_habits;
CREATE POLICY "Trainers update athletes habits"
  ON user_habits
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_habits.user_id
      AND profiles.assigned_trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_habits.user_id
      AND profiles.assigned_trainer_id = auth.uid()
    )
  );

-- user_habits: Allow trainers to delete their athletes' habits
DROP POLICY IF EXISTS "Trainers delete athletes habits" ON user_habits;
CREATE POLICY "Trainers delete athletes habits"
  ON user_habits
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_habits.user_id
      AND profiles.assigned_trainer_id = auth.uid()
    )
  );

-- habit_logs: Allow trainers to view their athletes' habit logs
DROP POLICY IF EXISTS "Trainers view assigned athletes habit logs" ON habit_logs;
CREATE POLICY "Trainers view assigned athletes habit logs"
  ON habit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = habit_logs.user_id
      AND profiles.assigned_trainer_id = auth.uid()
    )
  );

-- habit_logs: Allow trainers to delete their athletes' habit logs
DROP POLICY IF EXISTS "Trainers delete athletes habit logs" ON habit_logs;
CREATE POLICY "Trainers delete athletes habit logs"
  ON habit_logs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = habit_logs.user_id
      AND profiles.assigned_trainer_id = auth.uid()
    )
  );

-- habit_skills: Allow trainers to view their athletes' habit skills
DROP POLICY IF EXISTS "Trainers view assigned athletes habit skills" ON habit_skills;
CREATE POLICY "Trainers view assigned athletes habit skills"
  ON habit_skills
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_habits uh
      JOIN profiles p ON p.id = uh.user_id
      WHERE uh.id = habit_skills.habit_id
      AND p.assigned_trainer_id = auth.uid()
    )
  );

-- habit_skills: Allow trainers to create habit skills for their athletes
DROP POLICY IF EXISTS "Trainers create habit skills for athletes" ON habit_skills;
CREATE POLICY "Trainers create habit skills for athletes"
  ON habit_skills
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_habits uh
      JOIN profiles p ON p.id = uh.user_id
      WHERE uh.id = habit_skills.habit_id
      AND p.assigned_trainer_id = auth.uid()
    )
  );

-- habit_skills: Allow trainers to update their athletes' habit skills
DROP POLICY IF EXISTS "Trainers update athletes habit skills" ON habit_skills;
CREATE POLICY "Trainers update athletes habit skills"
  ON habit_skills
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_habits uh
      JOIN profiles p ON p.id = uh.user_id
      WHERE uh.id = habit_skills.habit_id
      AND p.assigned_trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_habits uh
      JOIN profiles p ON p.id = uh.user_id
      WHERE uh.id = habit_skills.habit_id
      AND p.assigned_trainer_id = auth.uid()
    )
  );

-- habit_skills: Allow trainers to delete their athletes' habit skills
DROP POLICY IF EXISTS "Trainers delete athletes habit skills" ON habit_skills;
CREATE POLICY "Trainers delete athletes habit skills"
  ON habit_skills
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_habits uh
      JOIN profiles p ON p.id = uh.user_id
      WHERE uh.id = habit_skills.habit_id
      AND p.assigned_trainer_id = auth.uid()
    )
  );

-- skill_logs: Check if table exists and add policies
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'skill_logs'
  ) THEN
    DROP POLICY IF EXISTS "Trainers view assigned athletes skill logs" ON skill_logs;
    EXECUTE 'CREATE POLICY "Trainers view assigned athletes skill logs"
      ON skill_logs
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM habit_skills hs
          JOIN user_habits uh ON uh.id = hs.habit_id
          JOIN profiles p ON p.id = uh.user_id
          WHERE hs.id = skill_logs.skill_id
          AND p.assigned_trainer_id = auth.uid()
        )
      )';
  END IF;
END $$;
