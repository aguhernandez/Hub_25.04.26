/*
  # Expand Support/Spotter System - Complete Implementation

  ## Overview
  Transforms the basic athlete_support_projects into a full "Support/Spotter" system where:
  - Athletes can create funding projects with goals and payment methods
  - Supporters declare contributions outside the platform
  - Athletes approve/reject declared supports
  - Membership gating: Free=none, Asciende=1 project, Pro=unlimited
  - Public project pages for sharing
  - Admin can verify projects

  ## 1. Expand athlete_support_projects table
  Add fields:
    - `slug` (url-friendly identifier)
    - `short_phrase` (for share cards)
    - `goal_amount` (numeric, optional)
    - `goal_type` (enum: money, in-kind, other)
    - `currency` (ISO code like USD, EUR, ARS)
    - `deadline` (date, nullable)
    - `is_continuous` (boolean - no deadline)
    - `payment_methods` (jsonb array)
    - `cover_media_url` (image/video)
    - `status` (enum: active, paused, closed)
    - `verified_by` (admin user id, nullable)
    - `verified_at` (timestamp)
    - `visible_supports_count` (integer)
    - `total_declared_amount` (numeric)
    - `allow_messages` (boolean)
    - `updated_at` (timestamp)

  ## 2. Create declared_supports table
  Fields:
    - `id` (uuid, primary key)
    - `project_id` (uuid, references athlete_support_projects)
    - `donor_name` (text, nullable - can be anonymous)
    - `donor_email` (text, nullable)
    - `amount` (numeric)
    - `currency` (text)
    - `payment_method` (text - which method they used)
    - `message` (text, nullable)
    - `status` (enum: pending, approved, rejected)
    - `created_at` (timestamp)
    - `approved_at` (timestamp, nullable)
    - `approved_by` (uuid, references profiles)
    - `rejection_reason` (text, nullable)

  ## 3. Add support mode fields to profiles
  Fields:
    - `support_mode_enabled` (boolean, default false)
    - `payment_links` (jsonb: {iban, paypal, mercadopago, wise})
    - `public_profile_slug` (text, unique)
    - `profile_public` (boolean, default false)

  ## 4. Security (RLS)
  - Athletes can create/edit their own projects (with membership checks)
  - Public can view active projects and approved supports
  - Athletes approve/reject declared supports for their projects
  - Admins can verify projects and moderate all content

  ## 5. Enums
  - `project_goal_type`: money, in-kind, other
  - `project_status_type`: active, paused, closed
  - `declared_support_status`: pending, approved, rejected

  ## 6. Functions
  - Check membership tier before project creation
  - Auto-update total_declared_amount on support approval
  - Generate notification on new declared support
*/

-- =====================================================
-- STEP 1: Create enums
-- =====================================================

DO $$ BEGIN
  CREATE TYPE project_goal_type AS ENUM ('money', 'in-kind', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE project_status_type AS ENUM ('active', 'paused', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE declared_support_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- STEP 2: Expand athlete_support_projects table
-- =====================================================

-- Add new columns to athlete_support_projects
DO $$
BEGIN
  -- Slug for URLs
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athlete_support_projects' AND column_name = 'slug') THEN
    ALTER TABLE athlete_support_projects ADD COLUMN slug text;
  END IF;

  -- Short phrase for share cards
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athlete_support_projects' AND column_name = 'short_phrase') THEN
    ALTER TABLE athlete_support_projects ADD COLUMN short_phrase text;
  END IF;

  -- Goal amount and type
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athlete_support_projects' AND column_name = 'goal_amount') THEN
    ALTER TABLE athlete_support_projects ADD COLUMN goal_amount numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athlete_support_projects' AND column_name = 'goal_type') THEN
    ALTER TABLE athlete_support_projects ADD COLUMN goal_type project_goal_type DEFAULT 'money';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athlete_support_projects' AND column_name = 'currency') THEN
    ALTER TABLE athlete_support_projects ADD COLUMN currency text DEFAULT 'USD';
  END IF;

  -- Deadline
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athlete_support_projects' AND column_name = 'deadline') THEN
    ALTER TABLE athlete_support_projects ADD COLUMN deadline date;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athlete_support_projects' AND column_name = 'is_continuous') THEN
    ALTER TABLE athlete_support_projects ADD COLUMN is_continuous boolean DEFAULT false;
  END IF;

  -- Payment methods (array of objects: [{type, label, value}])
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athlete_support_projects' AND column_name = 'payment_methods') THEN
    ALTER TABLE athlete_support_projects ADD COLUMN payment_methods jsonb DEFAULT '[]'::jsonb;
  END IF;

  -- Cover media
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athlete_support_projects' AND column_name = 'cover_media_url') THEN
    ALTER TABLE athlete_support_projects ADD COLUMN cover_media_url text;
  END IF;

  -- Status (replaces simple is_active)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athlete_support_projects' AND column_name = 'status') THEN
    ALTER TABLE athlete_support_projects ADD COLUMN status project_status_type DEFAULT 'active';
  END IF;

  -- Verification
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athlete_support_projects' AND column_name = 'verified_by') THEN
    ALTER TABLE athlete_support_projects ADD COLUMN verified_by uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athlete_support_projects' AND column_name = 'verified_at') THEN
    ALTER TABLE athlete_support_projects ADD COLUMN verified_at timestamptz;
  END IF;

  -- Support counters
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athlete_support_projects' AND column_name = 'visible_supports_count') THEN
    ALTER TABLE athlete_support_projects ADD COLUMN visible_supports_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athlete_support_projects' AND column_name = 'total_declared_amount') THEN
    ALTER TABLE athlete_support_projects ADD COLUMN total_declared_amount numeric DEFAULT 0;
  END IF;

  -- Settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athlete_support_projects' AND column_name = 'allow_messages') THEN
    ALTER TABLE athlete_support_projects ADD COLUMN allow_messages boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athlete_support_projects' AND column_name = 'updated_at') THEN
    ALTER TABLE athlete_support_projects ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create index on slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_athlete_support_projects_slug ON athlete_support_projects(slug);
CREATE INDEX IF NOT EXISTS idx_athlete_support_projects_status ON athlete_support_projects(status);

-- =====================================================
-- STEP 3: Create declared_supports table
-- =====================================================

CREATE TABLE IF NOT EXISTS declared_supports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES athlete_support_projects(id) ON DELETE CASCADE,
  donor_name text,
  donor_email text,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'USD',
  payment_method text NOT NULL,
  message text,
  status declared_support_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid REFERENCES profiles(id),
  rejection_reason text
);

ALTER TABLE declared_supports ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_declared_supports_project ON declared_supports(project_id);
CREATE INDEX IF NOT EXISTS idx_declared_supports_status ON declared_supports(status);
CREATE INDEX IF NOT EXISTS idx_declared_supports_created ON declared_supports(created_at DESC);

-- =====================================================
-- STEP 4: Add support mode fields to profiles
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'support_mode_enabled') THEN
    ALTER TABLE profiles ADD COLUMN support_mode_enabled boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'payment_links') THEN
    ALTER TABLE profiles ADD COLUMN payment_links jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'public_profile_slug') THEN
    ALTER TABLE profiles ADD COLUMN public_profile_slug text UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'profile_public') THEN
    ALTER TABLE profiles ADD COLUMN profile_public boolean DEFAULT false;
  END IF;
END $$;

-- Index for public profile lookups
CREATE INDEX IF NOT EXISTS idx_profiles_public_slug ON profiles(public_profile_slug);

-- =====================================================
-- STEP 5: RLS Policies for declared_supports
-- =====================================================

-- Public can insert (declare support) for active projects
CREATE POLICY "Anyone can declare support for active projects"
  ON declared_supports
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM athlete_support_projects
      WHERE athlete_support_projects.id = declared_supports.project_id
      AND athlete_support_projects.status = 'active'
      AND athlete_support_projects.is_active = true
    )
  );

-- Athletes can view declared supports for their own projects
CREATE POLICY "Athletes can view supports for own projects"
  ON declared_supports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM athlete_support_projects
      WHERE athlete_support_projects.id = declared_supports.project_id
      AND athlete_support_projects.athlete_id = auth.uid()
    )
  );

-- Public can view APPROVED supports for active projects
CREATE POLICY "Public can view approved supports"
  ON declared_supports
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'approved'
    AND EXISTS (
      SELECT 1 FROM athlete_support_projects
      WHERE athlete_support_projects.id = declared_supports.project_id
      AND athlete_support_projects.status = 'active'
      AND athlete_support_projects.is_active = true
    )
  );

-- Athletes can update (approve/reject) supports for their projects
CREATE POLICY "Athletes can approve/reject supports for own projects"
  ON declared_supports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM athlete_support_projects
      WHERE athlete_support_projects.id = declared_supports.project_id
      AND athlete_support_projects.athlete_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM athlete_support_projects
      WHERE athlete_support_projects.id = declared_supports.project_id
      AND athlete_support_projects.athlete_id = auth.uid()
    )
  );

-- Admins can manage all declared supports
CREATE POLICY "Admins can manage all declared supports"
  ON declared_supports
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

-- =====================================================
-- STEP 6: Update RLS for athlete_support_projects
-- =====================================================

-- Drop old policies that conflict
DROP POLICY IF EXISTS "Athletes can view own support projects" ON athlete_support_projects;
DROP POLICY IF EXISTS "Public can view active support projects" ON athlete_support_projects;

-- Athletes can create projects (membership check in application layer)
CREATE POLICY "Athletes can create own projects"
  ON athlete_support_projects
  FOR INSERT
  TO authenticated
  WITH CHECK (athlete_id = auth.uid());

-- Athletes can view their own projects
CREATE POLICY "Athletes view own projects"
  ON athlete_support_projects
  FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

-- Athletes can update their own projects
CREATE POLICY "Athletes update own projects"
  ON athlete_support_projects
  FOR UPDATE
  TO authenticated
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

-- Athletes can delete their own projects
CREATE POLICY "Athletes delete own projects"
  ON athlete_support_projects
  FOR DELETE
  TO authenticated
  USING (athlete_id = auth.uid());

-- Public can view active projects for public profiles
CREATE POLICY "Public view active projects"
  ON athlete_support_projects
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'active'
    AND is_active = true
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = athlete_support_projects.athlete_id
      AND profiles.profile_public = true
      AND profiles.support_mode_enabled = true
    )
  );

-- Admins still have full access (keep existing policy)

-- =====================================================
-- STEP 7: Function to check membership tier
-- =====================================================

CREATE OR REPLACE FUNCTION check_athlete_can_create_project(athlete_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_membership text;
  active_projects_count integer;
BEGIN
  -- Get user's current membership plan
  SELECT membership_plan INTO user_membership
  FROM profiles
  WHERE id = athlete_id;

  -- Free users cannot create projects
  IF user_membership IS NULL OR user_membership = 'free' THEN
    RETURN false;
  END IF;

  -- Pro users have unlimited projects
  IF user_membership = 'pro' THEN
    RETURN true;
  END IF;

  -- Asciende users can have 1 active project
  IF user_membership = 'asciende' THEN
    SELECT COUNT(*) INTO active_projects_count
    FROM athlete_support_projects
    WHERE athlete_id = check_athlete_can_create_project.athlete_id
    AND status = 'active';

    RETURN active_projects_count < 1;
  END IF;

  RETURN false;
END;
$$;

-- =====================================================
-- STEP 8: Trigger to update totals on support approval
-- =====================================================

CREATE OR REPLACE FUNCTION update_project_totals_on_support_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When support is approved, update project totals
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    UPDATE athlete_support_projects
    SET 
      visible_supports_count = visible_supports_count + 1,
      total_declared_amount = total_declared_amount + NEW.amount,
      updated_at = now()
    WHERE id = NEW.project_id;

    -- Set approved_at timestamp
    NEW.approved_at = now();
    NEW.approved_by = auth.uid();
  END IF;

  -- When support is unapproved (rejected after approval), decrease totals
  IF NEW.status = 'rejected' AND OLD.status = 'approved' THEN
    UPDATE athlete_support_projects
    SET 
      visible_supports_count = GREATEST(0, visible_supports_count - 1),
      total_declared_amount = GREATEST(0, total_declared_amount - OLD.amount),
      updated_at = now()
    WHERE id = NEW.project_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_declared_support_status_change ON declared_supports;
CREATE TRIGGER on_declared_support_status_change
  BEFORE UPDATE ON declared_supports
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_project_totals_on_support_approval();

-- =====================================================
-- STEP 9: Function to generate unique project slug
-- =====================================================

CREATE OR REPLACE FUNCTION generate_project_slug(project_title text, athlete_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 1;
BEGIN
  -- Create base slug from title
  base_slug := lower(regexp_replace(project_title, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  base_slug := substring(base_slug, 1, 50);
  
  final_slug := base_slug;
  
  -- Check for uniqueness, append number if needed
  WHILE EXISTS (
    SELECT 1 FROM athlete_support_projects 
    WHERE slug = final_slug 
    AND athlete_support_projects.athlete_id = generate_project_slug.athlete_id
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- =====================================================
-- STEP 10: Create notification for new declared support
-- =====================================================

CREATE OR REPLACE FUNCTION notify_athlete_new_support()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  athlete_id uuid;
  project_title text;
BEGIN
  -- Get athlete_id and project title
  SELECT 
    asp.athlete_id,
    asp.title
  INTO athlete_id, project_title
  FROM athlete_support_projects asp
  WHERE asp.id = NEW.project_id;

  -- Create notification for the athlete
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    link,
    created_at
  ) VALUES (
    athlete_id,
    'support_declared',
    'New support declared',
    COALESCE(NEW.donor_name, 'Someone') || ' declared ' || NEW.amount || ' ' || NEW.currency || ' for your project "' || project_title || '"',
    '/settings?tab=support',
    now()
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_declared_support ON declared_supports;
CREATE TRIGGER on_new_declared_support
  AFTER INSERT ON declared_supports
  FOR EACH ROW
  EXECUTE FUNCTION notify_athlete_new_support();
