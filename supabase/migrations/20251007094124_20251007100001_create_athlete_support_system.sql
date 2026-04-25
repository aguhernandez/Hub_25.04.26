/*
  # Athlete Support System

  1. New Tables
    - `athlete_support_projects`
      - Stores athlete support projects with details and progress
      - Fields: id, athlete_id, title, description, category, country, sport, progress_percentage, start_date, is_active, created_at

    - `project_transparency_updates`
      - Stores transparency updates for each project
      - Fields: id, project_id, update_description, images, created_at

    - `brand_offers`
      - Stores brand offers available to athletes
      - Fields: id, brand_name, brand_logo_url, offer_description, offer_link, is_active, created_at

    - `sponsorship_messages`
      - Stores sponsorship messages from brands to elite athletes
      - Fields: id, athlete_id, brand_name, message, status, created_at

  2. Security
    - Enable RLS on all tables
    - Athletes can view their own projects and updates
    - Public can view active projects (for sharing)
    - Admins can manage everything

  3. Enums
    - project_category: travel, equipment, training, education, health
    - message_status: new, contacted, closed
*/

-- Create enum for project categories (reuse need_type if exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'need_type') THEN
    CREATE TYPE need_type AS ENUM ('travel', 'equipment', 'training', 'education', 'health');
  END IF;
END $$;

-- Create enum for sponsorship message status
DO $$ BEGIN
  CREATE TYPE sponsorship_status AS ENUM ('new', 'contacted', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Athlete Support Projects Table
CREATE TABLE IF NOT EXISTS athlete_support_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  category need_type NOT NULL,
  country text NOT NULL,
  sport text NOT NULL,
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  start_date date DEFAULT CURRENT_DATE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE athlete_support_projects ENABLE ROW LEVEL SECURITY;

-- Athletes can view their own projects
CREATE POLICY "Athletes can view own support projects"
  ON athlete_support_projects
  FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

-- Public can view active projects (for sharing)
CREATE POLICY "Public can view active support projects"
  ON athlete_support_projects
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Admins can manage all projects
CREATE POLICY "Admins can manage all support projects"
  ON athlete_support_projects
  FOR ALL
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

-- Project Transparency Updates Table
CREATE TABLE IF NOT EXISTS project_transparency_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES athlete_support_projects(id) ON DELETE CASCADE,
  update_description text NOT NULL,
  images text[], -- Array of image URLs
  created_at timestamptz DEFAULT now()
);

ALTER TABLE project_transparency_updates ENABLE ROW LEVEL SECURITY;

-- Public can view updates for active projects
CREATE POLICY "Public can view transparency updates"
  ON project_transparency_updates
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM athlete_support_projects
      WHERE athlete_support_projects.id = project_transparency_updates.project_id
      AND athlete_support_projects.is_active = true
    )
  );

-- Athletes can view updates for their projects
CREATE POLICY "Athletes can view own project updates"
  ON project_transparency_updates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM athlete_support_projects
      WHERE athlete_support_projects.id = project_transparency_updates.project_id
      AND athlete_support_projects.athlete_id = auth.uid()
    )
  );

-- Admins can manage all updates
CREATE POLICY "Admins can manage all transparency updates"
  ON project_transparency_updates
  FOR ALL
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

-- Brand Offers Table
CREATE TABLE IF NOT EXISTS brand_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name text NOT NULL,
  brand_logo_url text,
  offer_description text NOT NULL,
  offer_link text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE brand_offers ENABLE ROW LEVEL SECURITY;

-- Anyone can view active offers
CREATE POLICY "Anyone can view active brand offers"
  ON brand_offers
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Admins can manage offers
CREATE POLICY "Admins can manage brand offers"
  ON brand_offers
  FOR ALL
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

-- Sponsorship Messages Table
CREATE TABLE IF NOT EXISTS sponsorship_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  brand_name text NOT NULL,
  brand_email text NOT NULL,
  message text NOT NULL,
  status sponsorship_status DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sponsorship_messages ENABLE ROW LEVEL SECURITY;

-- Athletes can view their own sponsorship messages
CREATE POLICY "Athletes can view own sponsorship messages"
  ON sponsorship_messages
  FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

-- Athletes can update status of their messages
CREATE POLICY "Athletes can update own message status"
  ON sponsorship_messages
  FOR UPDATE
  TO authenticated
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

-- Admins can manage all sponsorship messages
CREATE POLICY "Admins can manage all sponsorship messages"
  ON sponsorship_messages
  FOR ALL
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
CREATE INDEX IF NOT EXISTS idx_athlete_support_projects_athlete ON athlete_support_projects(athlete_id);
CREATE INDEX IF NOT EXISTS idx_athlete_support_projects_active ON athlete_support_projects(is_active);
CREATE INDEX IF NOT EXISTS idx_transparency_updates_project ON project_transparency_updates(project_id);
CREATE INDEX IF NOT EXISTS idx_sponsorship_messages_athlete ON sponsorship_messages(athlete_id);
CREATE INDEX IF NOT EXISTS idx_sponsorship_messages_status ON sponsorship_messages(status);
