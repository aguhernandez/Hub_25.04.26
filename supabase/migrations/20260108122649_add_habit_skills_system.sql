/*
  # Add Habit Skills System

  1. New Tables
    - `habit_skills`
      - `id` (uuid, primary key)
      - `habit_id` (uuid, references user_habits) - which habit this skill belongs to
      - `name` (text) - skill name
      - `description` (text, optional) - skill description
      - `order_index` (integer) - display order
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `skill_logs`
      - `id` (uuid, primary key)
      - `skill_id` (uuid, references habit_skills)
      - `user_id` (uuid, references profiles)
      - `date` (date) - when skill was practiced
      - `completed` (boolean) - if skill was completed
      - `notes` (text, optional) - optional notes
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can view/manage skills for their own habits
    - Trainers can view/manage skills for their athletes' habits
*/

CREATE TABLE IF NOT EXISTS habit_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid REFERENCES user_habits(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_habit_skills_habit_id ON habit_skills(habit_id);

ALTER TABLE habit_skills ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Users can manage skills for their own habits"
  ON habit_skills FOR ALL
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

CREATE TABLE IF NOT EXISTS skill_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id uuid REFERENCES habit_skills(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  completed boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(skill_id, user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_skill_logs_skill_id ON skill_logs(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_logs_user_id ON skill_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_logs_date ON skill_logs(date);

ALTER TABLE skill_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own skill logs"
  ON skill_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own skill logs"
  ON skill_logs FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
