/*
  # Enhance Program Products with Images and Purchase System

  1. Changes to program_products
    - Add image_url column for program cover images
    - Add sport/category field
    - Add detailed description field

  2. New Tables
    - `program_purchases`
      - Track athlete purchases of programs
      - Link to Stripe payment intent
      - Status: pending, completed, refunded

    - `athlete_programs`
      - Programs assigned to athletes (purchased or assigned by trainer)
      - Progress tracking
      - Start/end dates

  3. Security
    - RLS policies for purchases and athlete programs
    - Athletes can view their own purchases
    - Trainers can view their athletes' programs
*/

-- Add fields to program_products
ALTER TABLE program_products
ADD COLUMN IF NOT EXISTS image_url text,
ADD COLUMN IF NOT EXISTS sport text,
ADD COLUMN IF NOT EXISTS detailed_description text,
ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false;

-- Create program_purchases table
CREATE TABLE IF NOT EXISTS program_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  program_product_id uuid REFERENCES program_products(id) ON DELETE CASCADE NOT NULL,
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  amount_paid integer NOT NULL,
  currency text DEFAULT 'usd',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  purchased_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(athlete_id, program_product_id)
);

-- Create athlete_programs table (programs assigned to athletes)
CREATE TABLE IF NOT EXISTS athlete_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  trainer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  program_product_id uuid REFERENCES program_products(id) ON DELETE CASCADE NOT NULL,
  purchase_id uuid REFERENCES program_purchases(id) ON DELETE SET NULL,
  assigned_date date DEFAULT CURRENT_DATE,
  start_date date,
  end_date date,
  current_week integer DEFAULT 1,
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(athlete_id, program_product_id, assigned_date)
);

-- Enable RLS
ALTER TABLE program_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_programs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for program_purchases
CREATE POLICY "Athletes can view own purchases"
  ON program_purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = athlete_id);

CREATE POLICY "Athletes can insert own purchases"
  ON program_purchases FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Admins can view all purchases"
  ON program_purchases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Trainers can view their program purchases"
  ON program_purchases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM program_products
      WHERE program_products.id = program_purchases.program_product_id
      AND program_products.trainer_id = auth.uid()
    )
  );

-- RLS Policies for athlete_programs
CREATE POLICY "Athletes can view own programs"
  ON athlete_programs FOR SELECT
  TO authenticated
  USING (auth.uid() = athlete_id);

CREATE POLICY "Athletes can update own program progress"
  ON athlete_programs FOR UPDATE
  TO authenticated
  USING (auth.uid() = athlete_id)
  WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Trainers can view assigned programs"
  ON athlete_programs FOR SELECT
  TO authenticated
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can insert programs for athletes"
  ON athlete_programs FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = trainer_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Trainers can update assigned programs"
  ON athlete_programs FOR UPDATE
  TO authenticated
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Admins can manage all athlete programs"
  ON athlete_programs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Update program_products policies to allow athletes to view published programs
DROP POLICY IF EXISTS "Trainers and admins can view all programs" ON program_products;

CREATE POLICY "Trainers and admins can view all programs"
  ON program_products FOR SELECT
  TO authenticated
  USING (
    trainer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'trainer')
    )
  );

CREATE POLICY "Athletes can view published programs"
  ON program_products FOR SELECT
  TO authenticated
  USING (
    is_published = true OR
    EXISTS (
      SELECT 1 FROM athlete_programs
      WHERE athlete_programs.program_product_id = program_products.id
      AND athlete_programs.athlete_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_program_purchases_athlete ON program_purchases(athlete_id);
CREATE INDEX IF NOT EXISTS idx_program_purchases_program ON program_purchases(program_product_id);
CREATE INDEX IF NOT EXISTS idx_athlete_programs_athlete ON athlete_programs(athlete_id);
CREATE INDEX IF NOT EXISTS idx_athlete_programs_program ON athlete_programs(program_product_id);
CREATE INDEX IF NOT EXISTS idx_athlete_programs_trainer ON athlete_programs(trainer_id);

-- Function to automatically create athlete_program after successful purchase
CREATE OR REPLACE FUNCTION create_athlete_program_after_purchase()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO athlete_programs (
      athlete_id,
      program_product_id,
      purchase_id,
      start_date,
      status
    ) VALUES (
      NEW.athlete_id,
      NEW.program_product_id,
      NEW.id,
      CURRENT_DATE,
      'active'
    )
    ON CONFLICT (athlete_id, program_product_id, assigned_date)
    DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_athlete_program_after_purchase
  AFTER UPDATE ON program_purchases
  FOR EACH ROW
  EXECUTE FUNCTION create_athlete_program_after_purchase();
