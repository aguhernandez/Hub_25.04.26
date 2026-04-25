/*
  # System-Wide Improvements - About Section, GDPR, and Data Persistence

  1. New Tables and Columns
    - `trainer_about` - Store trainer "About" information
      - Fields: trainer_id, biography, philosophy, country, sport_specialization, contact_email, instagram, linkedin

    - Add to `profiles` table:
      - `terms_accepted` (boolean) - GDPR compliance
      - `terms_accepted_at` (timestamp) - When user accepted terms
      - `privacy_accepted` (boolean) - Privacy policy acceptance
      - `privacy_accepted_at` (timestamp) - When user accepted privacy policy

  2. Security
    - Enable RLS on trainer_about table
    - Trainers can edit their own about section
    - Athletes can view their trainer's about section
    - Admins can view all about sections

  3. GDPR Compliance
    - Track user consent for terms and privacy policy
    - Store timestamp for audit trail
    - Required for all new signups
*/

-- Trainer About Section Table
CREATE TABLE IF NOT EXISTS trainer_about (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  biography text DEFAULT '',
  philosophy text DEFAULT '',
  country text DEFAULT '',
  sport_specialization text DEFAULT '',
  contact_email text DEFAULT '',
  instagram text DEFAULT '',
  linkedin text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE trainer_about ENABLE ROW LEVEL SECURITY;

-- Trainers can view and edit their own about section
CREATE POLICY "Trainers can view own about section"
  ON trainer_about
  FOR SELECT
  TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can update own about section"
  ON trainer_about
  FOR UPDATE
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can insert own about section"
  ON trainer_about
  FOR INSERT
  TO authenticated
  WITH CHECK (trainer_id = auth.uid());

-- Athletes can view their assigned trainer's about section
CREATE POLICY "Athletes can view assigned trainer about"
  ON trainer_about
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.assigned_trainer_id = trainer_about.trainer_id
    )
  );

-- Admins can view all about sections
CREATE POLICY "Admins can view all about sections"
  ON trainer_about
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add GDPR compliance fields to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'terms_accepted'
  ) THEN
    ALTER TABLE profiles ADD COLUMN terms_accepted boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'terms_accepted_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN terms_accepted_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'privacy_accepted'
  ) THEN
    ALTER TABLE profiles ADD COLUMN privacy_accepted boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'privacy_accepted_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN privacy_accepted_at timestamptz;
  END IF;
END $$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_trainer_about_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_trainer_about_timestamp_trigger ON trainer_about;
CREATE TRIGGER update_trainer_about_timestamp_trigger
  BEFORE UPDATE ON trainer_about
  FOR EACH ROW
  EXECUTE FUNCTION update_trainer_about_timestamp();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_trainer_about_trainer_id ON trainer_about(trainer_id);

-- Measurement History Table (for tracking changes over time)
CREATE TABLE IF NOT EXISTS measurement_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  measurement_type text NOT NULL,
  measurement_data jsonb NOT NULL,
  recorded_by uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE measurement_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own measurement history
CREATE POLICY "Users can view own measurement history"
  ON measurement_history
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Trainers can view their athletes' measurement history
CREATE POLICY "Trainers can view athletes measurement history"
  ON measurement_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = measurement_history.user_id
      AND profiles.assigned_trainer_id = auth.uid()
    )
  );

-- Trainers and users can insert measurement history
CREATE POLICY "Users can insert own measurement history"
  ON measurement_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    recorded_by = auth.uid()
  );

-- Admins can view all measurement history
CREATE POLICY "Admins can view all measurement history"
  ON measurement_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for measurement history
CREATE INDEX IF NOT EXISTS idx_measurement_history_user_id ON measurement_history(user_id);
CREATE INDEX IF NOT EXISTS idx_measurement_history_type ON measurement_history(measurement_type);
CREATE INDEX IF NOT EXISTS idx_measurement_history_created ON measurement_history(created_at DESC);
