/*
  # Extend Notifications System with Preferences and Weekly Digest

  1. New Tables
    - `notification_preferences` - User notification settings per type
    - `weekly_performance_digests` - Stores generated digests
    - `notification_logs` - Tracks sent notifications (GDPR 30-day retention)
  
  2. Enhancements
    - Add delivery_method to notifications table
    - Add scheduled_for field for future notifications
    - Add digest_data jsonb for weekly summaries
  
  3. Security
    - RLS enabled on all tables
    - Users can only manage their own preferences
    - Trainers can send notifications to their athletes
*/

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  chat_in_app boolean DEFAULT true,
  chat_email boolean DEFAULT false,
  chat_push boolean DEFAULT false,
  training_in_app boolean DEFAULT true,
  training_email boolean DEFAULT true,
  training_push boolean DEFAULT false,
  team_in_app boolean DEFAULT true,
  team_email boolean DEFAULT true,
  team_push boolean DEFAULT false,
  digest_in_app boolean DEFAULT true,
  digest_email boolean DEFAULT true,
  digest_push boolean DEFAULT false,
  system_in_app boolean DEFAULT true,
  system_email boolean DEFAULT false,
  system_push boolean DEFAULT false,
  email_consent boolean DEFAULT false,
  push_consent boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Weekly performance digests
CREATE TABLE IF NOT EXISTS weekly_performance_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  week_end_date date NOT NULL,
  trainings_completed int DEFAULT 0,
  trainings_missed int DEFAULT 0,
  avg_rpe numeric,
  avg_rir numeric,
  total_weight_lifted numeric,
  total_distance numeric,
  total_calories numeric,
  goals_updated int DEFAULT 0,
  measurements_updated int DEFAULT 0,
  coach_notes text,
  digest_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Notification logs (for GDPR compliance - 30 day retention)
CREATE TABLE IF NOT EXISTS notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  delivery_method text NOT NULL CHECK (delivery_method IN ('in_app', 'email', 'push')),
  status text NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Add columns to existing notifications table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'delivery_method'
  ) THEN
    ALTER TABLE notifications ADD COLUMN delivery_method text DEFAULT 'in_app';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'scheduled_for'
  ) THEN
    ALTER TABLE notifications ADD COLUMN scheduled_for timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'digest_data'
  ) THEN
    ALTER TABLE notifications ADD COLUMN digest_data jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'sent_by'
  ) THEN
    ALTER TABLE notifications ADD COLUMN sent_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_performance_digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Notification preferences policies
CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Weekly digest policies
CREATE POLICY "Athletes can view own digests"
  ON weekly_performance_digests FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Trainers can view athlete digests"
  ON weekly_performance_digests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = weekly_performance_digests.athlete_id
      AND profiles.assigned_trainer_id = auth.uid()
    )
  );

CREATE POLICY "System can create digests"
  ON weekly_performance_digests FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Notification logs policies
CREATE POLICY "Users can view own notification logs"
  ON notification_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all notification logs"
  ON notification_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_digests_athlete_date ON weekly_performance_digests(athlete_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_created ON notification_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created ON notification_logs(created_at);

-- Function to delete old notification logs (GDPR 30-day retention)
CREATE OR REPLACE FUNCTION delete_old_notification_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM notification_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at on preferences
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Function to create default notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_notification_preferences_on_signup
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();
