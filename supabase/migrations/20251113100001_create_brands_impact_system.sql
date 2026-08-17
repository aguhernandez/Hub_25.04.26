/*
  # Brands & Impact System - Complete Architecture

  ## Overview
  Complete brand partnership, sponsorship, and community impact system.
  Allows athletes to connect with brands, receive sponsorships, and support projects.

  ## Key Features
  - Brand Partnership Requests (from landing)
  - Admin-controlled brand approval
  - Verified brand profiles
  - Promotions & Discounts for athletes
  - Sponsorship requests (athlete → brand via admin)
  - Support Projects (community impact)
  - Crowdfunding campaigns
  - Brand analytics & tracking

  ## New Tables

  ### 1. `brand_requests`
  Initial contact form from brands wanting to partner
  - Submitted from public landing page
  - Admin reviews and approves/rejects
  - Auto-creates brand profile on approval

  ### 2. `brands`
  Verified brand profiles (admin-created only)
  - Company information
  - Logo, description, website
  - Type of collaboration
  - Visibility controls

  ### 3. `brand_promotions`
  Discounts, offers, campaigns from brands
  - Target audience (sport, country, level)
  - Expiration dates
  - Tracking (views, clicks, conversions)

  ### 4. `sponsorship_requests`
  Athletes requesting sponsorship from brands
  - Athlete profile data
  - Request message
  - Admin facilitates connection

  ### 5. `support_projects`
  Community impact initiatives
  - Local/regional projects
  - Athlete support campaigns
  - Equipment donations
  - Training facility improvements

  ### 6. `project_contributions`
  Crowdfunding contributions to projects
  - Monetary or in-kind
  - Tracking and transparency

  ### 7. `brand_athlete_partnerships`
  Active partnerships between brands and athletes
  - Contract details
  - Duration
  - Benefits
  - Status tracking

  ## Security
  - RLS enabled on all tables
  - Public can submit brand requests
  - Only admin can approve brands
  - Athletes can view verified content
  - Privacy controls for athlete data
*/

-- =====================================================
-- 1. BRAND REQUESTS (Public submission)
-- =====================================================

CREATE TABLE IF NOT EXISTS brand_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Company info
  company_name text NOT NULL,
  company_website text,
  company_country text,

  -- Contact person
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,

  -- Collaboration details
  collaboration_type text NOT NULL CHECK (collaboration_type IN (
    'sponsorship', 'discount', 'donation', 'project', 'equipment', 'other'
  )),
  collaboration_description text NOT NULL,

  -- Additional info
  target_sports text[] DEFAULT '{}',
  target_countries text[] DEFAULT '{}',
  estimated_budget text,

  -- Media
  logo_url text,

  -- Admin review
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected')),
  admin_notes text,
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,

  -- Auto-created brand on approval
  created_brand_id uuid REFERENCES brands(id),

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_brand_requests_status ON brand_requests(status);
CREATE INDEX idx_brand_requests_created ON brand_requests(created_at DESC);

-- =====================================================
-- 2. BRANDS (Verified profiles)
-- =====================================================

CREATE TABLE IF NOT EXISTS brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Company info
  name text NOT NULL,
  slug text UNIQUE,
  description text,
  logo_url text,
  website text,

  -- Contact
  contact_email text,
  contact_phone text,

  -- Location
  country text,
  region text, -- e.g., "Latin America", "Europe"

  -- Collaboration details
  collaboration_types text[] DEFAULT '{}',
  target_sports text[] DEFAULT '{}',

  -- Social media
  instagram text,
  twitter text,
  linkedin text,

  -- Visibility & status
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  visibility_tier text DEFAULT 'local' CHECK (visibility_tier IN ('local', 'regional', 'global')),

  -- Admin info
  created_by uuid REFERENCES profiles(id),
  approved_by uuid REFERENCES profiles(id),

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_brands_active ON brands(is_active) WHERE is_active = true;
CREATE INDEX idx_brands_featured ON brands(is_featured) WHERE is_featured = true;
CREATE INDEX idx_brands_slug ON brands(slug);

-- =====================================================
-- 3. BRAND PROMOTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS brand_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE NOT NULL,

  -- Promotion info
  title text NOT NULL,
  description text NOT NULL,
  promotion_type text NOT NULL CHECK (promotion_type IN (
    'discount', 'free_trial', 'giveaway', 'exclusive_access', 'cashback', 'bundle'
  )),

  -- Offer details
  discount_percent integer,
  discount_code text,
  discount_url text,

  -- Targeting
  target_sports text[] DEFAULT '{}',
  target_countries text[] DEFAULT '{}',
  target_athlete_level text, -- 'amateur', 'semi_pro', 'professional', 'elite'

  -- Timing
  start_date date,
  end_date date,
  is_active boolean DEFAULT true,

  -- Media
  image_url text,

  -- Tracking
  view_count integer DEFAULT 0,
  click_count integer DEFAULT 0,
  conversion_count integer DEFAULT 0,

  -- Metadata
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_brand_promotions_brand ON brand_promotions(brand_id);
CREATE INDEX idx_brand_promotions_active ON brand_promotions(is_active, end_date)
  WHERE is_active = true;

-- =====================================================
-- 4. SPONSORSHIP REQUESTS
-- =====================================================

CREATE TABLE IF NOT EXISTS sponsorship_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  brand_id uuid REFERENCES brands(id),

  -- Request details
  request_type text NOT NULL CHECK (request_type IN (
    'financial', 'equipment', 'travel', 'nutrition', 'medical', 'training', 'general'
  )),
  amount_requested decimal(10,2),
  currency text DEFAULT 'USD',

  -- Athlete pitch
  title text NOT NULL,
  message text NOT NULL,
  athlete_achievements text,
  social_media_reach integer,

  -- What athlete offers
  brand_exposure_plan text,
  content_commitment text, -- e.g., "2 Instagram posts/month"

  -- Media
  media_kit_url text,

  -- Status
  status text DEFAULT 'pending' CHECK (status IN (
    'pending', 'under_review', 'brand_contacted', 'negotiating',
    'approved', 'rejected', 'completed'
  )),

  -- Admin facilitation
  admin_notes text,
  reviewed_by uuid REFERENCES profiles(id),

  -- Brand response
  brand_response text,
  brand_responded_at timestamptz,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_sponsorship_requests_athlete ON sponsorship_requests(athlete_id);
CREATE INDEX idx_sponsorship_requests_brand ON sponsorship_requests(brand_id);
CREATE INDEX idx_sponsorship_requests_status ON sponsorship_requests(status);

-- =====================================================
-- 5. SUPPORT PROJECTS
-- =====================================================

CREATE TABLE IF NOT EXISTS support_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Project info
  title text NOT NULL,
  slug text UNIQUE,
  description text NOT NULL,
  project_type text NOT NULL CHECK (project_type IN (
    'athlete_support', 'facility', 'equipment', 'community', 'education', 'event'
  )),

  -- Location
  country text NOT NULL,
  region text,
  city text,

  -- Beneficiaries
  target_sport text,
  beneficiary_count integer,
  beneficiary_description text,

  -- Funding
  funding_goal decimal(10,2) NOT NULL,
  funding_raised decimal(10,2) DEFAULT 0,
  currency text DEFAULT 'USD',

  -- Timing
  start_date date NOT NULL,
  end_date date NOT NULL,

  -- Status
  status text DEFAULT 'active' CHECK (status IN (
    'draft', 'active', 'funded', 'in_progress', 'completed', 'cancelled'
  )),

  -- Visibility
  is_featured boolean DEFAULT false,
  is_visible boolean DEFAULT true,

  -- Media
  image_url text,
  gallery_urls text[] DEFAULT '{}',
  video_url text,

  -- Impact tracking
  impact_metrics jsonb DEFAULT '{}',

  -- Creator
  created_by uuid REFERENCES profiles(id),

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_support_projects_status ON support_projects(status, is_visible);
CREATE INDEX idx_support_projects_country ON support_projects(country);
CREATE INDEX idx_support_projects_featured ON support_projects(is_featured) WHERE is_featured = true;

-- =====================================================
-- 6. PROJECT CONTRIBUTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS project_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES support_projects(id) ON DELETE CASCADE NOT NULL,
  contributor_id uuid REFERENCES profiles(id),
  brand_id uuid REFERENCES brands(id),

  -- Contribution details
  contribution_type text NOT NULL CHECK (contribution_type IN (
    'monetary', 'equipment', 'service', 'volunteer', 'other'
  )),

  -- Monetary
  amount decimal(10,2),
  currency text DEFAULT 'USD',

  -- In-kind
  description text,
  estimated_value decimal(10,2),

  -- Contributor info (if anonymous/external)
  contributor_name text,
  contributor_email text,
  is_anonymous boolean DEFAULT false,

  -- Payment
  payment_status text DEFAULT 'pending' CHECK (payment_status IN (
    'pending', 'processing', 'completed', 'failed', 'refunded'
  )),
  payment_method text,
  payment_reference text,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX idx_project_contributions_project ON project_contributions(project_id);
CREATE INDEX idx_project_contributions_contributor ON project_contributions(contributor_id);
CREATE INDEX idx_project_contributions_brand ON project_contributions(brand_id);

-- =====================================================
-- 7. BRAND ATHLETE PARTNERSHIPS
-- =====================================================

CREATE TABLE IF NOT EXISTS brand_athlete_partnerships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  athlete_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Partnership details
  partnership_type text NOT NULL CHECK (partnership_type IN (
    'sponsorship', 'ambassador', 'affiliate', 'collaboration', 'event'
  )),

  -- Contract
  title text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date,

  -- Benefits
  monetary_value decimal(10,2),
  currency text DEFAULT 'USD',
  benefits_description text,

  -- Deliverables
  athlete_deliverables text,
  brand_deliverables text,

  -- Status
  status text DEFAULT 'active' CHECK (status IN (
    'pending', 'active', 'paused', 'completed', 'cancelled'
  )),

  -- Visibility
  is_public boolean DEFAULT false,

  -- Performance tracking
  performance_metrics jsonb DEFAULT '{}',

  -- Admin
  approved_by uuid REFERENCES profiles(id),

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(brand_id, athlete_id, start_date)
);

CREATE INDEX idx_partnerships_brand ON brand_athlete_partnerships(brand_id);
CREATE INDEX idx_partnerships_athlete ON brand_athlete_partnerships(athlete_id);
CREATE INDEX idx_partnerships_status ON brand_athlete_partnerships(status);

-- =====================================================
-- 8. BRAND ANALYTICS
-- =====================================================

CREATE TABLE IF NOT EXISTS brand_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What happened
  event_type text NOT NULL CHECK (event_type IN (
    'brand_view', 'promotion_view', 'promotion_click', 'promotion_conversion',
    'project_view', 'contribution_click', 'sponsorship_request'
  )),

  -- Where
  brand_id uuid REFERENCES brands(id),
  promotion_id uuid REFERENCES brand_promotions(id),
  project_id uuid REFERENCES support_projects(id),

  -- Who
  athlete_id uuid REFERENCES profiles(id),

  -- Context
  user_agent text,
  ip_address inet,
  country text,

  -- Metadata
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_brand_analytics_brand ON brand_analytics_events(brand_id, created_at DESC);
CREATE INDEX idx_brand_analytics_promotion ON brand_analytics_events(promotion_id, created_at DESC);
CREATE INDEX idx_brand_analytics_type ON brand_analytics_events(event_type, created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Brand Requests (PUBLIC can insert)
ALTER TABLE brand_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit brand requests"
  ON brand_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all brand requests"
  ON brand_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update brand requests"
  ON brand_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Brands (Public read for active)
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active brands"
  ON brands FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage brands"
  ON brands FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Brand Promotions
ALTER TABLE brand_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active promotions"
  ON brand_promotions FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  );

CREATE POLICY "Admins can manage promotions"
  ON brand_promotions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'trainer')
    )
  );

-- Sponsorship Requests
ALTER TABLE sponsorship_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes can view own sponsorship requests"
  ON sponsorship_requests FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Athletes can create sponsorship requests"
  ON sponsorship_requests FOR INSERT
  TO authenticated
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Athletes can update own pending requests"
  ON sponsorship_requests FOR UPDATE
  TO authenticated
  USING (athlete_id = auth.uid() AND status = 'pending')
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Admins can view all sponsorship requests"
  ON sponsorship_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update sponsorship requests"
  ON sponsorship_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Support Projects
ALTER TABLE support_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view visible projects"
  ON support_projects FOR SELECT
  TO authenticated
  USING (is_visible = true);

CREATE POLICY "Admins can manage projects"
  ON support_projects FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Project Contributions
ALTER TABLE project_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contributions"
  ON project_contributions FOR SELECT
  TO authenticated
  USING (
    contributor_id = auth.uid()
    OR is_anonymous = false
  );

CREATE POLICY "Users can create contributions"
  ON project_contributions FOR INSERT
  TO authenticated
  WITH CHECK (
    contributor_id = auth.uid()
    OR contributor_id IS NULL
  );

CREATE POLICY "Admins can view all contributions"
  ON project_contributions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Partnerships
ALTER TABLE brand_athlete_partnerships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes can view own partnerships"
  ON brand_athlete_partnerships FOR SELECT
  TO authenticated
  USING (
    athlete_id = auth.uid()
    OR is_public = true
  );

CREATE POLICY "Admins can manage partnerships"
  ON brand_athlete_partnerships FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Analytics
ALTER TABLE brand_analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can insert analytics events"
  ON brand_analytics_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view analytics"
  ON brand_analytics_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to auto-update funding_raised on new contribution
CREATE OR REPLACE FUNCTION update_project_funding()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contribution_type = 'monetary' AND NEW.payment_status = 'completed' THEN
    UPDATE support_projects
    SET funding_raised = funding_raised + NEW.amount
    WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_funding
  AFTER INSERT OR UPDATE ON project_contributions
  FOR EACH ROW
  EXECUTE FUNCTION update_project_funding();

-- Function to update promotion stats
CREATE OR REPLACE FUNCTION update_promotion_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_type = 'promotion_view' THEN
    UPDATE brand_promotions
    SET view_count = view_count + 1
    WHERE id = NEW.promotion_id;
  ELSIF NEW.event_type = 'promotion_click' THEN
    UPDATE brand_promotions
    SET click_count = click_count + 1
    WHERE id = NEW.promotion_id;
  ELSIF NEW.event_type = 'promotion_conversion' THEN
    UPDATE brand_promotions
    SET conversion_count = conversion_count + 1
    WHERE id = NEW.promotion_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_promotion_stats
  AFTER INSERT ON brand_analytics_events
  FOR EACH ROW
  WHEN (NEW.event_type IN ('promotion_view', 'promotion_click', 'promotion_conversion'))
  EXECUTE FUNCTION update_promotion_stats();
