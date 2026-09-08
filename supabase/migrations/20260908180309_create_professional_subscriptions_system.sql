/*
# Professional Subscriptions System

## Purpose
Tracks Stripe subscription state for professional users (trainers and nutritionists).
This is the entitlement layer — application access for professionals is determined
by their Hub role + the subscription status in this table, NOT by checking Stripe directly.

## New Tables
- `professional_subscriptions`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles, ON DELETE CASCADE)
  - `stripe_customer_id` (text, Stripe customer ID)
  - `stripe_subscription_id` (text, unique, Stripe subscription ID)
  - `stripe_price_id` (text, the price ID they subscribed to)
  - `billing_cycle` (text: 'monthly' or 'yearly')
  - `status` (text: trialing, active, past_due, canceled, unpaid, incomplete)
  - `trial_end` (timestamptz, when the 7-day trial ends)
  - `current_period_end` (timestamptz, end of current billing period)
  - `canceled_at` (timestamptz, when the subscription was canceled)
  - `max_athletes` (integer, default 50 — max athletes this professional can manage)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

## Security
- RLS enabled.
- Users can read their own subscription.
- Admins can read all subscriptions.
- No direct INSERT/UPDATE/DELETE from the frontend — all writes come from the
  Stripe webhook edge function using the service role key.

## Important Notes
1. The Stripe webhook (stripe-webhook edge function) is the ONLY writer to this table.
2. The frontend reads this table to determine if a professional has active access.
3. Admins can view subscription status in the admin users page.
4. Head Coach role is NOT available for subscription yet — no price configured.
*/

CREATE TABLE IF NOT EXISTS professional_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  stripe_price_id text,
  billing_cycle text DEFAULT 'monthly',
  status text NOT NULL DEFAULT 'incomplete',
  trial_end timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  max_athletes integer NOT NULL DEFAULT 50,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE professional_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
DROP POLICY IF EXISTS "select_own_professional_subscription" ON professional_subscriptions;
CREATE POLICY "select_own_professional_subscription"
  ON professional_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can read all professional subscriptions
DROP POLICY IF EXISTS "admin_select_all_professional_subscriptions" ON professional_subscriptions;
CREATE POLICY "admin_select_all_professional_subscriptions"
  ON professional_subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_professional_subscriptions_user_id
  ON professional_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_professional_subscriptions_stripe_subscription_id
  ON professional_subscriptions(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_professional_subscriptions_status
  ON professional_subscriptions(status);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_professional_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_professional_subscriptions_updated_at
  ON professional_subscriptions;

CREATE TRIGGER trigger_professional_subscriptions_updated_at
  BEFORE UPDATE ON professional_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_professional_subscriptions_updated_at();
