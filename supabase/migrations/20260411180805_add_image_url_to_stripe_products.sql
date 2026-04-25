/*
  # Add image_url to stripe_products

  Adds an optional image_url column so admin can set a featured image for coaching products.
  This image is displayed inside the Apply modal.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_products' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE stripe_products ADD COLUMN image_url text;
  END IF;
END $$;
