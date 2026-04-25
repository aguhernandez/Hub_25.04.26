/*
  # Brand Partners System

  1. New Tables
    - `brand_partners`
      - Stores brand/company registrations
      - Fields: id, brand_name, industry, contact_person, email, website, country, logo_url, reason, status, created_at

    - `brand_project_follows`
      - Tracks which projects brands are following
      - Fields: id, brand_id, project_id, created_at

    - `brand_resource_offers`
      - Stores resource offers from brands
      - Fields: id, brand_id, offer_description, category, target_country, target_sport, status, created_at

    - `brand_communications`
      - Stores messages between brands and admin
      - Fields: id, brand_id, subject, message, related_project_id, status, created_at

  2. Security
    - Enable RLS on all tables
    - Brands can view and update their own data
    - Admins can manage all brand data
    - Public can view approved brand profiles

  3. Enums
    - brand_status: pending, approved, rejected
    - offer_status: pending, approved, published, rejected
*/

-- Create enum for brand registration status
DO $$ BEGIN
  CREATE TYPE brand_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for offer status
DO $$ BEGIN
  CREATE TYPE offer_status AS ENUM ('pending', 'approved', 'published', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for communication status
DO $$ BEGIN
  CREATE TYPE communication_status AS ENUM ('unread', 'read', 'responded', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Brand Partners Table
CREATE TABLE IF NOT EXISTS brand_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name text NOT NULL,
  industry text NOT NULL,
  contact_person text NOT NULL,
  email text NOT NULL UNIQUE,
  website text,
  country text NOT NULL,
  logo_url text,
  reason text NOT NULL,
  status brand_status DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid REFERENCES profiles(id)
);

ALTER TABLE brand_partners ENABLE ROW LEVEL SECURITY;

-- Brands can view their own profile
CREATE POLICY "Brands can view own profile"
  ON brand_partners
  FOR SELECT
  TO authenticated
  USING (email = auth.jwt()->>'email');

-- Brands can update their own profile (except status)
CREATE POLICY "Brands can update own profile"
  ON brand_partners
  FOR UPDATE
  TO authenticated
  USING (email = auth.jwt()->>'email')
  WITH CHECK (email = auth.jwt()->>'email');

-- Public can view approved brands
CREATE POLICY "Public can view approved brands"
  ON brand_partners
  FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

-- Admins can manage all brands
CREATE POLICY "Admins can manage all brands"
  ON brand_partners
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

-- Allow public brand registration
CREATE POLICY "Anyone can register as brand"
  ON brand_partners
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Brand Project Follows Table
CREATE TABLE IF NOT EXISTS brand_project_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brand_partners(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES athlete_support_projects(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(brand_id, project_id)
);

ALTER TABLE brand_project_follows ENABLE ROW LEVEL SECURITY;

-- Brands can manage their own follows
CREATE POLICY "Brands can manage own follows"
  ON brand_project_follows
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM brand_partners
      WHERE brand_partners.id = brand_project_follows.brand_id
      AND brand_partners.email = auth.jwt()->>'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM brand_partners
      WHERE brand_partners.id = brand_project_follows.brand_id
      AND brand_partners.email = auth.jwt()->>'email'
    )
  );

-- Admins can view all follows
CREATE POLICY "Admins can view all follows"
  ON brand_project_follows
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Brand Resource Offers Table
CREATE TABLE IF NOT EXISTS brand_resource_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brand_partners(id) ON DELETE CASCADE,
  offer_description text NOT NULL,
  category text NOT NULL,
  target_country text,
  target_sport text,
  status offer_status DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id)
);

ALTER TABLE brand_resource_offers ENABLE ROW LEVEL SECURITY;

-- Brands can create and view their own offers
CREATE POLICY "Brands can manage own offers"
  ON brand_resource_offers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM brand_partners
      WHERE brand_partners.id = brand_resource_offers.brand_id
      AND brand_partners.email = auth.jwt()->>'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM brand_partners
      WHERE brand_partners.id = brand_resource_offers.brand_id
      AND brand_partners.email = auth.jwt()->>'email'
    )
  );

-- Athletes can view published offers
CREATE POLICY "Athletes can view published offers"
  ON brand_resource_offers
  FOR SELECT
  TO authenticated
  USING (status = 'published');

-- Admins can manage all offers
CREATE POLICY "Admins can manage all offers"
  ON brand_resource_offers
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

-- Brand Communications Table
CREATE TABLE IF NOT EXISTS brand_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brand_partners(id) ON DELETE CASCADE,
  subject text NOT NULL,
  message text NOT NULL,
  related_project_id uuid REFERENCES athlete_support_projects(id),
  status communication_status DEFAULT 'unread',
  admin_response text,
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  responded_by uuid REFERENCES profiles(id)
);

ALTER TABLE brand_communications ENABLE ROW LEVEL SECURITY;

-- Brands can create and view their own communications
CREATE POLICY "Brands can manage own communications"
  ON brand_communications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM brand_partners
      WHERE brand_partners.id = brand_communications.brand_id
      AND brand_partners.email = auth.jwt()->>'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM brand_partners
      WHERE brand_partners.id = brand_communications.brand_id
      AND brand_partners.email = auth.jwt()->>'email'
    )
  );

-- Admins can manage all communications
CREATE POLICY "Admins can manage all communications"
  ON brand_communications
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
CREATE INDEX IF NOT EXISTS idx_brand_partners_email ON brand_partners(email);
CREATE INDEX IF NOT EXISTS idx_brand_partners_status ON brand_partners(status);
CREATE INDEX IF NOT EXISTS idx_brand_follows_brand ON brand_project_follows(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_follows_project ON brand_project_follows(project_id);
CREATE INDEX IF NOT EXISTS idx_brand_offers_brand ON brand_resource_offers(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_offers_status ON brand_resource_offers(status);
CREATE INDEX IF NOT EXISTS idx_brand_comms_brand ON brand_communications(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_comms_status ON brand_communications(status);
