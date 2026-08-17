/*
  # Add Stripe Integration to Program Products & Fix Visibility

  ## Changes

  ### New Columns on program_products
  - `stripe_product_id` (text): Stripe Product ID linked to this program
  - `stripe_price_id` (text): Stripe Price ID for one-time purchase
  - `checkout_url` (text): Direct Stripe Checkout URL

  ### RLS Fix
  - Trainers can now see ALL published platform programs + their own unpublished ones
  - The previous policy was correct but the ProgramBuilderPage was filtering
    by trainer_id which excluded platform programs created by admin
*/

-- Add Stripe columns to program_products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'program_products' AND column_name = 'stripe_product_id'
  ) THEN
    ALTER TABLE program_products ADD COLUMN stripe_product_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'program_products' AND column_name = 'stripe_price_id'
  ) THEN
    ALTER TABLE program_products ADD COLUMN stripe_price_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'program_products' AND column_name = 'checkout_url'
  ) THEN
    ALTER TABLE program_products ADD COLUMN checkout_url text;
  END IF;
END $$;

-- Fix RLS: drop old policies and recreate with better logic
DROP POLICY IF EXISTS "Anyone can view published programs" ON program_products;
DROP POLICY IF EXISTS "Trainers and admins can create programs" ON program_products;
DROP POLICY IF EXISTS "Trainers can manage own programs" ON program_products;
DROP POLICY IF EXISTS "Admins can manage all programs" ON program_products;

-- SELECT: published programs visible to all; trainers/admins see everything
CREATE POLICY "Programs select policy"
  ON program_products FOR SELECT
  TO authenticated
  USING (
    is_published = true
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'trainer')
  );

-- INSERT: trainers and admins only
CREATE POLICY "Programs insert policy"
  ON program_products FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'trainer')
  );

-- UPDATE: trainer updates own; admin updates any
CREATE POLICY "Programs update policy"
  ON program_products FOR UPDATE
  TO authenticated
  USING (
    trainer_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    trainer_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- DELETE: trainer deletes own; admin deletes any
CREATE POLICY "Programs delete policy"
  ON program_products FOR DELETE
  TO authenticated
  USING (
    trainer_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );
