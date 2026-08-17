/*
  # Create Push Notification Preferences System

  1. New Tables
    - `push_notification_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users, unique)
      - `trainer_messages` (boolean, default true) — Notifications when trainer sends a message
      - `new_training_plan` (boolean, default true) — Notifications when a new training plan is assigned
      - `new_nutrition_plan` (boolean, default true) — Notifications when a new nutrition plan is assigned
      - `new_academy_course` (boolean, default true) — Notifications when a new course is available
      - `new_habit` (boolean, default true) — Notifications when a new habit is assigned
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `push_notification_preferences` table
    - Users can read and update their own preferences
    - Users can insert their own preferences

  3. Notes
    - Each user has at most one row (unique constraint on user_id)
    - All notifications are enabled by default
*/

CREATE TABLE IF NOT EXISTS push_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trainer_messages boolean NOT NULL DEFAULT true,
  new_training_plan boolean NOT NULL DEFAULT true,
  new_nutrition_plan boolean NOT NULL DEFAULT true,
  new_academy_course boolean NOT NULL DEFAULT true,
  new_habit boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_notification_preferences_user_id_key UNIQUE (user_id)
);

ALTER TABLE push_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notification preferences"
  ON push_notification_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON push_notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON push_notification_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_push_notification_preferences_user_id
  ON push_notification_preferences(user_id);
