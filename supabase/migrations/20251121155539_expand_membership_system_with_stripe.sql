/*
  # Expand Membership System with Complete Stripe Integration

  1. Modifications to existing tables
    - Add missing columns to `memberships`
    - Add new supporting tables
    
  2. New Tables
    - `membership_access` - Track user membership subscriptions
    - `stripe_membership_mappings` - Map Stripe prices to memberships
    - `stripe_webhook_logs` - Log webhook events
    
  3. Security
    - RLS policies for all tables
    - Admin and trainer management
    - User access control
*/

-- Expand memberships table
DO $$ 
BEGIN
  -- Add slug if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='memberships' AND column_name='slug') THEN
    ALTER TABLE memberships ADD COLUMN slug text;
  END IF;

  -- Add long_description
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='memberships' AND column_name='long_description') THEN
    ALTER TABLE memberships ADD COLUMN long_description text;
  END IF;

  -- Add image_url
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='memberships' AND column_name='image_url') THEN
    ALTER TABLE memberships ADD COLUMN image_url text;
  END IF;

  -- Add currency
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='memberships' AND column_name='currency') THEN
    ALTER TABLE memberships ADD COLUMN currency text DEFAULT 'USD';
  END IF;

  -- Add stripe_product_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='memberships' AND column_name='stripe_product_id') THEN
    ALTER TABLE memberships ADD COLUMN stripe_product_id text;
  END IF;

  -- Add is_open (public vs private)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='memberships' AND column_name='is_open') THEN
    ALTER TABLE memberships ADD COLUMN is_open boolean DEFAULT false;
  END IF;

  -- Add is_published
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='memberships' AND column_name='is_published') THEN
    ALTER TABLE memberships ADD COLUMN is_published boolean DEFAULT false;
  END IF;

  -- Add created_by
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='memberships' AND column_name='created_by') THEN
    ALTER TABLE memberships ADD COLUMN created_by uuid REFERENCES auth.users(id);
  END IF;

  -- Add max_members
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='memberships' AND column_name='max_members') THEN
    ALTER TABLE memberships ADD COLUMN max_members integer;
  END IF;

  -- Add updated_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='memberships' AND column_name='updated_at') THEN
    ALTER TABLE memberships ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Generate slugs for existing memberships
UPDATE memberships 
SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- Make slug unique if not already
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'memberships_slug_key'
  ) THEN
    ALTER TABLE memberships ADD CONSTRAINT memberships_slug_key UNIQUE (slug);
  END IF;
END $$;

-- Create membership_access table
CREATE TABLE IF NOT EXISTS membership_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id uuid REFERENCES memberships(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id),
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  status text DEFAULT 'active' CHECK (status IN ('active', 'pending', 'canceled', 'expired')),
  source text DEFAULT 'manual' CHECK (source IN ('stripe', 'manual', 'promotional')),
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_checkout_session_id text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create stripe_membership_mappings table
CREATE TABLE IF NOT EXISTS stripe_membership_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_price_id text UNIQUE NOT NULL,
  stripe_product_id text,
  membership_id uuid REFERENCES memberships(id) ON DELETE CASCADE,
  billing_cycle text CHECK (billing_cycle IN ('monthly', 'yearly')),
  created_at timestamptz DEFAULT now()
);

-- Create stripe_webhook_logs table
CREATE TABLE IF NOT EXISTS stripe_webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed boolean DEFAULT false,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_memberships_slug ON memberships(slug);
CREATE INDEX IF NOT EXISTS idx_memberships_created_by ON memberships(created_by);
CREATE INDEX IF NOT EXISTS idx_memberships_is_published ON memberships(is_published);
CREATE INDEX IF NOT EXISTS idx_membership_access_user_id ON membership_access(user_id);
CREATE INDEX IF NOT EXISTS idx_membership_access_membership_id ON membership_access(membership_id);
CREATE INDEX IF NOT EXISTS idx_membership_access_status ON membership_access(status);
CREATE INDEX IF NOT EXISTS idx_stripe_mappings_price_id ON stripe_membership_mappings(stripe_price_id);
CREATE INDEX IF NOT EXISTS idx_stripe_logs_event_id ON stripe_webhook_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_membership_access_stripe_subscription ON membership_access(stripe_subscription_id);

-- Enable RLS
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_membership_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public can view published memberships" ON memberships;
DROP POLICY IF EXISTS "Admins and trainers view all memberships" ON memberships;
DROP POLICY IF EXISTS "Admins and trainers create memberships" ON memberships;
DROP POLICY IF EXISTS "Admins and trainers update memberships" ON memberships;
DROP POLICY IF EXISTS "Admins delete memberships" ON memberships;

-- RLS Policies for memberships

-- Anyone can view published and active memberships
CREATE POLICY "Public can view published memberships"
  ON memberships FOR SELECT
  TO authenticated
  USING (is_published = true AND is_active = true);

-- Admins and trainers can view all memberships
CREATE POLICY "Admins and trainers view all memberships"
  ON memberships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'trainer')
    )
  );

-- Only admins and trainers can create memberships
CREATE POLICY "Admins and trainers create memberships"
  ON memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'trainer')
    )
  );

-- Only admins and trainers can update memberships
CREATE POLICY "Admins and trainers update memberships"
  ON memberships FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'trainer')
    )
  );

-- Only admins can delete memberships
CREATE POLICY "Admins delete memberships"
  ON memberships FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for membership_access

-- Users can view their own access records
CREATE POLICY "Users view own access"
  ON membership_access FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'trainer')
    )
  );

-- Admins and trainers can create access records
CREATE POLICY "Admins and trainers create access"
  ON membership_access FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'trainer')
    )
  );

-- Admins and trainers can update access records
CREATE POLICY "Admins and trainers update access"
  ON membership_access FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'trainer')
    )
  );

-- RLS Policies for stripe_membership_mappings

-- Admins view all mappings
CREATE POLICY "Admins view stripe mappings"
  ON stripe_membership_mappings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can manage mappings
CREATE POLICY "Admins manage stripe mappings"
  ON stripe_membership_mappings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for stripe_webhook_logs

-- Only admins can view logs
CREATE POLICY "Admins view webhook logs"
  ON stripe_webhook_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create function to check membership access
CREATE OR REPLACE FUNCTION has_active_membership(user_id_param uuid, membership_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM membership_access
    WHERE user_id = user_id_param
    AND membership_id = membership_id_param
    AND status = 'active'
    AND start_date <= now()
    AND (end_date IS NULL OR end_date > now())
  );
END;
$$;

-- Create function to check any active membership
CREATE OR REPLACE FUNCTION has_any_active_membership(user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM membership_access
    WHERE user_id = user_id_param
    AND status = 'active'
    AND start_date <= now()
    AND (end_date IS NULL OR end_date > now())
  );
END;
$$;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_memberships_updated_at ON memberships;
CREATE TRIGGER update_memberships_updated_at
  BEFORE UPDATE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_membership_access_updated_at ON membership_access;
CREATE TRIGGER update_membership_access_updated_at
  BEFORE UPDATE ON membership_access
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing Stripe price IDs to new mapping table
INSERT INTO stripe_membership_mappings (stripe_price_id, membership_id, billing_cycle)
SELECT 
  stripe_price_id_monthly,
  id,
  'monthly'
FROM memberships
WHERE stripe_price_id_monthly IS NOT NULL
ON CONFLICT (stripe_price_id) DO NOTHING;

INSERT INTO stripe_membership_mappings (stripe_price_id, membership_id, billing_cycle)
SELECT 
  stripe_price_id_annual,
  id,
  'yearly'
FROM memberships
WHERE stripe_price_id_annual IS NOT NULL
ON CONFLICT (stripe_price_id) DO NOTHING;
