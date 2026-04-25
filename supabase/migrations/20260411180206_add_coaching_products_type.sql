/*
  # Add coaching type support to stripe_products

  ## Changes
  - Adds 'coaching' as a valid type in stripe_products table
  - Adds trainer_name and trainer_email columns for coaching products
  - Adds features array column for feature bullet points on the public page
  - Adds category column (strength / nutrition / endurance) for coaching products

  ## New Columns
  - `trainer_name` (text): Display name of the trainer/nutritionist
  - `trainer_email` (text): Email of the trainer linked to this product
  - `features` (jsonb): Array of feature strings shown on the product card
  - `category` (text): coaching sub-category (strength, nutrition, endurance)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_products' AND column_name = 'trainer_name'
  ) THEN
    ALTER TABLE stripe_products ADD COLUMN trainer_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_products' AND column_name = 'trainer_email'
  ) THEN
    ALTER TABLE stripe_products ADD COLUMN trainer_email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_products' AND column_name = 'features'
  ) THEN
    ALTER TABLE stripe_products ADD COLUMN features jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_products' AND column_name = 'category'
  ) THEN
    ALTER TABLE stripe_products ADD COLUMN category text;
  END IF;
END $$;
