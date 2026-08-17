/*
  # Support Projects Forms System

  1. New Tables
    - `project_proposals`
      - Stores athlete project proposals submitted through the "Propose a Project" form
      - Fields: id, athlete_name, email, country, sport, need_type, description, social_link, confirmed, status, created_at

    - `athlete_messages`
      - Stores messages from sponsors/supporters to athletes
      - Fields: id, sender_name, sender_email, organization, message, athlete_email, copy_admin, status, created_at

    - `admin_messages`
      - Stores general messages sent to administration
      - Fields: id, sender_name, sender_email, subject, message, status, created_at

  2. Security
    - Enable RLS on all tables
    - Anyone can insert (submit forms)
    - Only admins can view and update

  3. Enums
    - need_type: travel, equipment, training, education, health
    - message_status: unread, reviewed, archived
*/

-- Create enum for need types
DO $$ BEGIN
  CREATE TYPE need_type AS ENUM ('travel', 'equipment', 'training', 'education', 'health');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for message status
DO $$ BEGIN
  CREATE TYPE message_status AS ENUM ('unread', 'reviewed', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Project Proposals Table
CREATE TABLE IF NOT EXISTS project_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_name text NOT NULL,
  email text NOT NULL,
  country text NOT NULL,
  sport text NOT NULL,
  need_type need_type NOT NULL,
  description text NOT NULL,
  social_link text,
  confirmed boolean DEFAULT false,
  status message_status DEFAULT 'unread',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE project_proposals ENABLE ROW LEVEL SECURITY;

-- Allow anyone to submit proposals
CREATE POLICY "Anyone can submit project proposals"
  ON project_proposals
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can view proposals
CREATE POLICY "Admins can view all project proposals"
  ON project_proposals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can update proposals
CREATE POLICY "Admins can update project proposals"
  ON project_proposals
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Athlete Messages Table
CREATE TABLE IF NOT EXISTS athlete_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_name text NOT NULL,
  sender_email text NOT NULL,
  organization text,
  message text NOT NULL,
  athlete_email text NOT NULL,
  copy_admin boolean DEFAULT false,
  status message_status DEFAULT 'unread',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE athlete_messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to send messages
CREATE POLICY "Anyone can send athlete messages"
  ON athlete_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can view messages
CREATE POLICY "Admins can view all athlete messages"
  ON athlete_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can update messages
CREATE POLICY "Admins can update athlete messages"
  ON athlete_messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin Messages Table
CREATE TABLE IF NOT EXISTS admin_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_name text NOT NULL,
  sender_email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status message_status DEFAULT 'unread',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to send admin messages
CREATE POLICY "Anyone can send admin messages"
  ON admin_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can view admin messages
CREATE POLICY "Admins can view all admin messages"
  ON admin_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can update admin messages
CREATE POLICY "Admins can update admin messages"
  ON admin_messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_proposals_status ON project_proposals(status);
CREATE INDEX IF NOT EXISTS idx_project_proposals_created ON project_proposals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_athlete_messages_status ON athlete_messages(status);
CREATE INDEX IF NOT EXISTS idx_athlete_messages_created ON athlete_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_messages_status ON admin_messages(status);
CREATE INDEX IF NOT EXISTS idx_admin_messages_created ON admin_messages(created_at DESC);
