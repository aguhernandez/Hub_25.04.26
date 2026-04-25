/*
  # Athlete Profile Expansion

  1. New Tables
    - `athlete_profile_details` - Extended athlete information
    - `coach_technique_notes` - Coach notes about athlete technique
    - `profile_update_notifications` - Notification system for profile changes
  
  2. Security
    - RLS enabled on all tables
    - Athletes can edit their own details (once)
    - Coaches can view and edit technique notes for their athletes
    - Both can view notifications
*/

CREATE TABLE IF NOT EXISTS athlete_profile_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  goals text DEFAULT '',
  old_injuries text DEFAULT '',
  symptoms text DEFAULT '',
  personal_notes text DEFAULT '',
  initial_setup_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coach_technique_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('mobility', 'timing', 'force', 'coordination', 'other')),
  notes text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profile_update_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type text NOT NULL CHECK (notification_type IN ('goals', 'injuries', 'symptoms', 'profile_update')),
  message text NOT NULL,
  is_reviewed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE athlete_profile_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_technique_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_update_notifications ENABLE ROW LEVEL SECURITY;

-- Athlete profile details policies
CREATE POLICY "Athletes can view own profile details"
  ON athlete_profile_details FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Athletes can insert own profile details"
  ON athlete_profile_details FOR INSERT
  TO authenticated
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Athletes can update own profile details"
  ON athlete_profile_details FOR UPDATE
  TO authenticated
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Coaches can view athlete profile details"
  ON athlete_profile_details FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = athlete_profile_details.athlete_id
      AND profiles.assigned_trainer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all profile details"
  ON athlete_profile_details FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Coach technique notes policies
CREATE POLICY "Coaches can manage technique notes for their athletes"
  ON coach_technique_notes FOR ALL
  TO authenticated
  USING (
    coach_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = coach_technique_notes.athlete_id
      AND profiles.assigned_trainer_id = auth.uid()
    )
  );

CREATE POLICY "Athletes can view their technique notes"
  ON coach_technique_notes FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

-- Notification policies
CREATE POLICY "Coaches can view notifications for their athletes"
  ON profile_update_notifications FOR SELECT
  TO authenticated
  USING (coach_id = auth.uid());

CREATE POLICY "Coaches can update notification status"
  ON profile_update_notifications FOR UPDATE
  TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Athletes can create notifications"
  ON profile_update_notifications FOR INSERT
  TO authenticated
  WITH CHECK (athlete_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_athlete_profile_details_athlete ON athlete_profile_details(athlete_id);
CREATE INDEX IF NOT EXISTS idx_coach_technique_notes_athlete ON coach_technique_notes(athlete_id);
CREATE INDEX IF NOT EXISTS idx_coach_technique_notes_coach ON coach_technique_notes(coach_id);
CREATE INDEX IF NOT EXISTS idx_profile_notifications_coach ON profile_update_notifications(coach_id, is_reviewed);
CREATE INDEX IF NOT EXISTS idx_profile_notifications_athlete ON profile_update_notifications(athlete_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_profile_details_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER athlete_profile_details_updated_at
  BEFORE UPDATE ON athlete_profile_details
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_details_updated_at();

CREATE TRIGGER coach_technique_notes_updated_at
  BEFORE UPDATE ON coach_technique_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_details_updated_at();
