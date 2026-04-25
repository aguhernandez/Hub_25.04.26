/*
  # Fix unique_off_product_id constraint to allow multiple NULL values

  1. Problem
    - Current constraint uses NULLS NOT DISTINCT
    - This only allows ONE food with off_product_id = NULL
    - USDA foods don't have off_product_id, so they're all NULL
    - This prevents importing multiple USDA foods

  2. Solution
    - Drop the problematic constraint
    - Rely on the partial index (idx_foods_off_product_id) which only prevents duplicates for non-NULL values
    - This allows multiple USDA foods (off_product_id = NULL) while still preventing duplicate OFF products

  3. Result
    - Multiple USDA foods allowed (off_product_id = NULL)
    - Duplicate OFF products still prevented by partial index
*/

-- Drop the problematic constraint
ALTER TABLE foods
DROP CONSTRAINT IF EXISTS unique_off_product_id;

-- The partial index (already exists) will handle uniqueness for non-NULL values:
-- CREATE INDEX IF NOT EXISTS idx_foods_off_product_id
--   ON foods(off_product_id)
--   WHERE off_product_id IS NOT NULL;

-- Add a better constraint that allows multiple NULLs
ALTER TABLE foods
ADD CONSTRAINT unique_off_product_id
  UNIQUE (off_product_id);

-- Note: In PostgreSQL, UNIQUE (column) by default allows multiple NULL values
-- This is what we want: one unique constraint per OFF product, but unlimited USDA foods
