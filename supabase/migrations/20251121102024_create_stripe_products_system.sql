/*
  # Stripe Products & Webhooks System
  
  1. New Tables
    - `stripe_products`
      - id (uuid, primary key)
      - name (text)
      - description (text)
      - type (text) - 'program' or 'membership'
      - price (numeric)
      - duration_weeks (integer) - for programs
      - billing_cycle (text) - 'monthly', 'yearly', 'one_time'
      - stripe_product_id (text, unique)
      - stripe_price_id (text, unique)
      - checkout_url (text)
      - deliverables (jsonb)
      - is_active (boolean)
      - created_by (uuid, foreign key to profiles)
      - created_at, updated_at (timestamps)
    
    - `user_purchases`
      - id (uuid, primary key)
      - user_id (uuid, foreign key to profiles)
      - product_id (uuid, foreign key to stripe_products)
      - stripe_customer_id (text)
      - stripe_subscription_id (text) - for memberships
      - status (text) - 'active', 'canceled', 'expired'
      - start_date (timestamp)
      - end_date (timestamp)
      - next_billing_date (timestamp) - for subscriptions
      - created_at, updated_at (timestamps)
    
    - `stripe_webhook_events`
      - id (uuid, primary key)
      - event_id (text, unique)
      - event_type (text)
      - raw_payload (jsonb)
      - processed (boolean)
      - processed_at (timestamp)
      - error_message (text)
      - created_at (timestamp)
  
  2. Security
    - Enable RLS on all tables
    - Admins can manage stripe_products
    - Users can view their own purchases
    - Webhook events are system-only
*/

-- Create stripe_products table
CREATE TABLE IF NOT EXISTS stripe_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('program', 'membership')),
  price numeric NOT NULL,
  duration_weeks integer,
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('one_time', 'monthly', 'yearly')),
  stripe_product_id text UNIQUE,
  stripe_price_id text UNIQUE,
  checkout_url text,
  deliverables jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_purchases table
CREATE TABLE IF NOT EXISTS user_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES stripe_products(id) ON DELETE SET NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_session_id text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired', 'pending')),
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  next_billing_date timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create stripe_webhook_events table
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  raw_payload jsonb NOT NULL,
  processed boolean DEFAULT false,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_stripe_products_type ON stripe_products(type);
CREATE INDEX IF NOT EXISTS idx_stripe_products_active ON stripe_products(is_active);
CREATE INDEX IF NOT EXISTS idx_stripe_products_stripe_product_id ON stripe_products(stripe_product_id);
CREATE INDEX IF NOT EXISTS idx_stripe_products_stripe_price_id ON stripe_products(stripe_price_id);
CREATE INDEX IF NOT EXISTS idx_user_purchases_user_id ON user_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_user_purchases_status ON user_purchases(status);
CREATE INDEX IF NOT EXISTS idx_user_purchases_product_id ON user_purchases(product_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON stripe_webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON stripe_webhook_events(event_id);

-- Enable RLS
ALTER TABLE stripe_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Policies for stripe_products

-- SELECT: Everyone can view active products
CREATE POLICY "Anyone can view active products"
  ON stripe_products FOR SELECT
  TO authenticated
  USING (is_active = true);

-- SELECT: Admins view all products
CREATE POLICY "Admins view all products"
  ON stripe_products FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'admin');

-- INSERT: Only admins create products
CREATE POLICY "Admins create products"
  ON stripe_products FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt()->>'role')::text = 'admin');

-- UPDATE: Only admins update products
CREATE POLICY "Admins update products"
  ON stripe_products FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'admin')
  WITH CHECK ((auth.jwt()->>'role')::text = 'admin');

-- DELETE: Only admins delete products
CREATE POLICY "Admins delete products"
  ON stripe_products FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'admin');

-- Policies for user_purchases

-- SELECT: Users view own purchases
CREATE POLICY "Users view own purchases"
  ON user_purchases FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- SELECT: Admins view all purchases
CREATE POLICY "Admins view all purchases"
  ON user_purchases FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'admin');

-- INSERT: System only (via webhook)
CREATE POLICY "System creates purchases"
  ON user_purchases FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt()->>'role')::text = 'admin');

-- UPDATE: System only (via webhook)
CREATE POLICY "System updates purchases"
  ON user_purchases FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'admin')
  WITH CHECK ((auth.jwt()->>'role')::text = 'admin');

-- Policies for stripe_webhook_events

-- Only admins can view webhook events
CREATE POLICY "Admins view webhook events"
  ON stripe_webhook_events FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'admin');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_stripe_products_updated_at ON stripe_products;
CREATE TRIGGER update_stripe_products_updated_at
  BEFORE UPDATE ON stripe_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_purchases_updated_at ON user_purchases;
CREATE TRIGGER update_user_purchases_updated_at
  BEFORE UPDATE ON user_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
