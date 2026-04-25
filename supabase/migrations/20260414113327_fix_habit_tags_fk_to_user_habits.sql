/*
  # Fix habit_tags foreign key to reference user_habits instead of habits

  ## Problem
  The habit_tags table has habit_id referencing habits(id), but HabitsPage passes
  user_habits.id as the habitId. This causes a 409 FK violation on insert.

  ## Fix
  - Drop the existing FK constraint on habit_tags.habit_id
  - Re-add it pointing to user_habits(id) ON DELETE CASCADE
*/

ALTER TABLE habit_tags DROP CONSTRAINT IF EXISTS habit_tags_habit_id_fkey;

ALTER TABLE habit_tags
  ADD CONSTRAINT habit_tags_habit_id_fkey
  FOREIGN KEY (habit_id) REFERENCES user_habits(id) ON DELETE CASCADE;
