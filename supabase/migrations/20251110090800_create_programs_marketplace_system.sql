/*
  # Create Programs & Memberships Marketplace System

  This migration creates a complete system for trainers to create, sell, and manage
  training programs and memberships with integrated Zoom appointments.

  ## New Tables

  ### program_products
  - `id` (uuid, primary key)
  - `trainer_id` (uuid, references profiles) - NULL means Asciende official
  - `title` (text) - Program name
  - `description` (text) - Full description
  - `duration_weeks` (integer) - Number of weeks (NULL for monthly memberships)
  - `is_membership` (boolean) - TRUE for recurring monthly, FALSE for one-time programs
  - `price` (numeric) - Price in configured currency
  - `currency` (text) - USD, EUR, etc.
  - `is_published` (boolean) - Whether visible to purchase
  - `category` (text) - strength, endurance, sport-specific, etc.
  - `difficulty_level` (text) - beginner, intermediate, advanced
  - `includes_zoom_sessions` (boolean) - Whether includes Zoom appointments
  - `zoom_frequency` (text) - weekly, biweekly, monthly, NULL
  - `zoom_session_duration` (integer) - Duration in minutes
  - `max_participants` (integer) - For group programs, NULL for unlimited
  - `thumbnail_url` (text) - Image for marketplace
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### program_weeks
  - `id` (uuid, primary key)
  - `program_product_id` (uuid, references program_products)
  - `week_number` (integer) - 1, 2, 3, etc.
  - `title` (text) - Week title/theme
  - `description` (text) - Week description
  - `created_at` (timestamptz)

  ### program_workouts
  - `id` (uuid, primary key)
  - `program_week_id` (uuid, references program_weeks)
  - `workout_template_id` (uuid, references workouts) - Template workout
  - `day_of_week` (integer) - 1=Monday, 7=Sunday
  - `order_in_week` (integer) - Order if multiple on same day
  - `created_at` (timestamptz)

  ### program_purchases
  - `id` (uuid, primary key)
  - `program_product_id` (uuid, references program_products)
  - `athlete_id` (uuid, references profiles)
  - `purchase_date` (timestamptz)
  - `start_date` (date) - When athlete wants to start
  - `end_date` (date) - Calculated based on duration
  - `price_paid` (numeric)
  - `currency` (text)
  - `status` (text) - active, completed, cancelled
  - `payment_id` (text) - External payment reference
  - `created_at` (timestamptz)

  ### membership_subscriptions
  - `id` (uuid, primary key)
  - `program_product_id` (uuid, references program_products)
  - `athlete_id` (uuid, references profiles)
  - `start_date` (date)
  - `status` (text) - active, paused, cancelled
  - `billing_cycle` (text) - monthly, quarterly, annual
  - `next_billing_date` (date)
  - `price` (numeric)
  - `currency` (text)
  - `stripe_subscription_id` (text)
  - `created_at` (timestamptz)
  - `cancelled_at` (timestamptz)

  ### zoom_appointments
  - `id` (uuid, primary key)
  - `trainer_id` (uuid, references profiles)
  - `athlete_id` (uuid, references profiles)
  - `subscription_id` (uuid, references membership_subscriptions) - NULL for one-off
  - `purchase_id` (uuid, references program_purchases) - NULL for one-off
  - `scheduled_date` (timestamptz)
  - `duration_minutes` (integer)
  - `zoom_meeting_id` (text)
  - `zoom_join_url` (text)
  - `zoom_start_url` (text) - For trainer
  - `status` (text) - scheduled, completed, cancelled, no_show
  - `notes` (text)
  - `created_at` (timestamptz)

  ## Security

  - Enable RLS on all tables
  - Athletes can view published programs from Asciende and their trainer
  - Trainers can manage their own programs
  - Admins can manage all programs
  - Purchase/subscription records are private to athlete and trainer

  ## Purpose

  This system enables:
  - Trainers to create sellable training programs
  - Athletes to purchase programs and memberships
  - Automatic workout scheduling upon purchase
  - Integrated Zoom session management
  - Recurring membership billing
*/

-- Create program_products table
CREATE TABLE IF NOT EXISTS program_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  duration_weeks integer,
  is_membership boolean DEFAULT false,
  price numeric(10, 2) NOT NULL DEFAULT 0,
  currency text DEFAULT 'USD',
  is_published boolean DEFAULT false,
  category text,
  difficulty_level text,
  includes_zoom_sessions boolean DEFAULT false,
  zoom_frequency text,
  zoom_session_duration integer,
  max_participants integer,
  thumbnail_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create program_weeks table
CREATE TABLE IF NOT EXISTS program_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_product_id uuid REFERENCES program_products(id) ON DELETE CASCADE NOT NULL,
  week_number integer NOT NULL,
  title text,
  description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(program_product_id, week_number)
);

-- Create program_workouts table
CREATE TABLE IF NOT EXISTS program_workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_week_id uuid REFERENCES program_weeks(id) ON DELETE CASCADE NOT NULL,
  workout_template_id uuid REFERENCES workouts(id) ON DELETE CASCADE NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  order_in_week integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Create program_purchases table
CREATE TABLE IF NOT EXISTS program_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_product_id uuid REFERENCES program_products(id) ON DELETE CASCADE NOT NULL,
  athlete_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  purchase_date timestamptz DEFAULT now(),
  start_date date NOT NULL,
  end_date date,
  price_paid numeric(10, 2) NOT NULL,
  currency text DEFAULT 'USD',
  status text DEFAULT 'active',
  payment_id text,
  created_at timestamptz DEFAULT now()
);

-- Create membership_subscriptions table
CREATE TABLE IF NOT EXISTS membership_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_product_id uuid REFERENCES program_products(id) ON DELETE CASCADE NOT NULL,
  athlete_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  start_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'active',
  billing_cycle text DEFAULT 'monthly',
  next_billing_date date,
  price numeric(10, 2) NOT NULL,
  currency text DEFAULT 'USD',
  stripe_subscription_id text,
  created_at timestamptz DEFAULT now(),
  cancelled_at timestamptz
);

-- Create zoom_appointments table
CREATE TABLE IF NOT EXISTS zoom_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  athlete_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subscription_id uuid REFERENCES membership_subscriptions(id) ON DELETE SET NULL,
  purchase_id uuid REFERENCES program_purchases(id) ON DELETE SET NULL,
  scheduled_date timestamptz NOT NULL,
  duration_minutes integer DEFAULT 60,
  zoom_meeting_id text,
  zoom_join_url text,
  zoom_start_url text,
  status text DEFAULT 'scheduled',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Add Zoom API config to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS zoom_api_key text,
ADD COLUMN IF NOT EXISTS zoom_api_secret text,
ADD COLUMN IF NOT EXISTS zoom_user_id text;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_program_products_trainer ON program_products(trainer_id);
CREATE INDEX IF NOT EXISTS idx_program_products_published ON program_products(is_published);
CREATE INDEX IF NOT EXISTS idx_program_weeks_product ON program_weeks(program_product_id);
CREATE INDEX IF NOT EXISTS idx_program_workouts_week ON program_workouts(program_week_id);
CREATE INDEX IF NOT EXISTS idx_program_purchases_athlete ON program_purchases(athlete_id);
CREATE INDEX IF NOT EXISTS idx_program_purchases_product ON program_purchases(program_product_id);
CREATE INDEX IF NOT EXISTS idx_membership_subscriptions_athlete ON membership_subscriptions(athlete_id);
CREATE INDEX IF NOT EXISTS idx_zoom_appointments_trainer ON zoom_appointments(trainer_id);
CREATE INDEX IF NOT EXISTS idx_zoom_appointments_athlete ON zoom_appointments(athlete_id);

-- Enable RLS
ALTER TABLE program_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoom_appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for program_products

CREATE POLICY "Athletes can view published programs from Asciende or their trainer"
  ON program_products FOR SELECT
  TO authenticated
  USING (
    is_published = true AND (
      trainer_id IS NULL OR
      trainer_id IN (
        SELECT assigned_trainer_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Trainers can view their own programs"
  ON program_products FOR SELECT
  TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can create programs"
  ON program_products FOR INSERT
  TO authenticated
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can update their own programs"
  ON program_products FOR UPDATE
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can delete their own programs"
  ON program_products FOR DELETE
  TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "Admins can manage all programs"
  ON program_products FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for program_weeks

CREATE POLICY "Users can view weeks of accessible programs"
  ON program_weeks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM program_products
      WHERE id = program_weeks.program_product_id
      AND (
        is_published = true OR
        trainer_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );

CREATE POLICY "Trainers can manage weeks of their programs"
  ON program_weeks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM program_products
      WHERE id = program_weeks.program_product_id
      AND trainer_id = auth.uid()
    )
  );

-- RLS Policies for program_workouts

CREATE POLICY "Users can view workouts of accessible programs"
  ON program_workouts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM program_weeks pw
      JOIN program_products pp ON pw.program_product_id = pp.id
      WHERE pw.id = program_workouts.program_week_id
      AND (
        pp.is_published = true OR
        pp.trainer_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );

CREATE POLICY "Trainers can manage workouts of their programs"
  ON program_workouts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM program_weeks pw
      JOIN program_products pp ON pw.program_product_id = pp.id
      WHERE pw.id = program_workouts.program_week_id
      AND pp.trainer_id = auth.uid()
    )
  );

-- RLS Policies for program_purchases

CREATE POLICY "Athletes can view their own purchases"
  ON program_purchases FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Trainers can view purchases of their programs"
  ON program_purchases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM program_products
      WHERE id = program_purchases.program_product_id
      AND trainer_id = auth.uid()
    )
  );

CREATE POLICY "Athletes can create purchases"
  ON program_purchases FOR INSERT
  TO authenticated
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Athletes can update their own purchases"
  ON program_purchases FOR UPDATE
  TO authenticated
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

-- RLS Policies for membership_subscriptions

CREATE POLICY "Athletes can view their own subscriptions"
  ON membership_subscriptions FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Trainers can view subscriptions to their programs"
  ON membership_subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM program_products
      WHERE id = membership_subscriptions.program_product_id
      AND trainer_id = auth.uid()
    )
  );

CREATE POLICY "Athletes can create subscriptions"
  ON membership_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Athletes can update their own subscriptions"
  ON membership_subscriptions FOR UPDATE
  TO authenticated
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

-- RLS Policies for zoom_appointments

CREATE POLICY "Athletes can view their own appointments"
  ON zoom_appointments FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Trainers can view their appointments"
  ON zoom_appointments FOR SELECT
  TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can create appointments"
  ON zoom_appointments FOR INSERT
  TO authenticated
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can update their appointments"
  ON zoom_appointments FOR UPDATE
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Athletes can update appointment notes"
  ON zoom_appointments FOR UPDATE
  TO authenticated
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

-- Add helpful comments
COMMENT ON TABLE program_products IS 'Training programs and memberships that can be purchased';
COMMENT ON TABLE program_weeks IS 'Weekly structure of training programs';
COMMENT ON TABLE program_workouts IS 'Individual workouts within program weeks';
COMMENT ON TABLE program_purchases IS 'One-time program purchases by athletes';
COMMENT ON TABLE membership_subscriptions IS 'Recurring membership subscriptions';
COMMENT ON TABLE zoom_appointments IS 'Scheduled Zoom sessions between trainers and athletes';
