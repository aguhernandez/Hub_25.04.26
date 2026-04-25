/*
  # Create User Subscriptions System for Centralized Auth

  1. New Tables
    - `user_subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `product` (text, enum: cycling | gym | nutrition)
      - `plan` (text, enum: free | pro | coach)
      - `status` (text, enum: active | paused | cancelled)
      - `expires_at` (timestamptz, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `user_subscriptions` table
    - Add policies for users to read their own subscriptions
    - Add policies for admins to manage all subscriptions

  3. Indexes
    - Index on user_id for fast lookups
    - Index on status for active subscription queries
    - Composite index on (user_id, product, status)
*/

-- Create enum types
DO $$ BEGIN
  CREATE TYPE product_type AS ENUM ('cycling', 'gym', 'nutrition');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_plan AS ENUM ('free', 'pro', 'coach');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active', 'paused', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product product_type NOT NULL,
  plan subscription_plan NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'active',
  expires_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- Ensure one active subscription per product per user
  UNIQUE(user_id, product, status)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id 
  ON user_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status 
  ON user_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_product_status 
  ON user_subscriptions(user_id, product, status);

-- Enable RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own subscriptions"
  ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
  ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert subscriptions"
  ON user_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update subscriptions"
  ON user_subscriptions
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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_subscriptions_updated_at();

-- Function to get active plans for a user (used in JWT generation)
CREATE OR REPLACE FUNCTION get_user_active_plans(p_user_id uuid)
RETURNS text[] AS $$
  SELECT ARRAY_AGG(product::text || '_' || plan::text)
  FROM user_subscriptions
  WHERE user_id = p_user_id
  AND status = 'active'
  AND (expires_at IS NULL OR expires_at > now());
$$ LANGUAGE sql STABLE;

-- Grant default free plan to all existing users
INSERT INTO user_subscriptions (user_id, product, plan, status)
SELECT id, 'cycling', 'free', 'active'
FROM profiles
WHERE NOT EXISTS (
  SELECT 1 FROM user_subscriptions 
  WHERE user_subscriptions.user_id = profiles.id
)
ON CONFLICT (user_id, product, status) DO NOTHING;