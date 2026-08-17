/*
  # Fix habit_logs Foreign Key Reference

  1. Changes
    - Clean up orphaned habit_logs that reference non-existent user_habits
    - Drop the existing foreign key constraint from habit_logs.habit_id -> habits.id
    - Add new foreign key constraint from habit_logs.habit_id -> user_habits.id
    - This aligns the database with the application code that uses user_habits

  2. Security
    - No changes to RLS policies
*/

-- First, delete orphaned logs that don't have matching user_habits
DELETE FROM habit_logs 
WHERE NOT EXISTS (
  SELECT 1 FROM user_habits WHERE user_habits.id = habit_logs.habit_id
);

-- Drop the old foreign key constraint
ALTER TABLE habit_logs 
DROP CONSTRAINT IF EXISTS habit_logs_habit_id_fkey;

-- Add the new foreign key constraint pointing to user_habits
ALTER TABLE habit_logs 
ADD CONSTRAINT habit_logs_habit_id_fkey 
FOREIGN KEY (habit_id) 
REFERENCES user_habits(id) 
ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id 
ON habit_logs(habit_id);

CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date 
ON habit_logs(user_id, log_date);
