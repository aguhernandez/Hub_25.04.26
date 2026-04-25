/*
  # Add Open Food Facts Integration to Foods Table

  1. Changes
    - Add `source` column to track food origin (internal, usda, open_food_facts)
    - Add `off_product_id` to store Open Food Facts product identifier
    - Add `off_last_sync` timestamp for tracking when OFF data was cached
    - Add `is_verified` flag for trainer/admin verification of external data

  2. Rules
    - source defaults to 'internal'
    - foods from OFF start with is_verified = false
    - Trainers/Admins can verify external foods
    - No duplicate OFF products (unique constraint on off_product_id when not null)

  3. Security
    - No changes to existing RLS policies
    - External foods follow same access rules as internal foods
*/

-- Add traceability columns to foods table
ALTER TABLE foods
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'internal'
  CHECK (source IN ('internal', 'usda', 'open_food_facts')),
ADD COLUMN IF NOT EXISTS off_product_id TEXT,
ADD COLUMN IF NOT EXISTS off_last_sync TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- Create index for OFF product lookups (prevent duplicates)
CREATE INDEX IF NOT EXISTS idx_foods_off_product_id
  ON foods(off_product_id)
  WHERE off_product_id IS NOT NULL;

-- Create unique constraint to prevent duplicate OFF products
ALTER TABLE foods
ADD CONSTRAINT unique_off_product_id
  UNIQUE NULLS NOT DISTINCT (off_product_id);

-- Create index for source filtering
CREATE INDEX IF NOT EXISTS idx_foods_source ON foods(source);

-- Update existing USDA foods to reflect their source
UPDATE foods
SET source = 'usda'
WHERE usda_fdc_id IS NOT NULL AND source = 'internal';

-- Create comment for documentation
COMMENT ON COLUMN foods.source IS 'Origin of food data: internal (custom), usda (USDA database), open_food_facts (OFF API)';
COMMENT ON COLUMN foods.off_product_id IS 'Open Food Facts product identifier (barcode)';
COMMENT ON COLUMN foods.off_last_sync IS 'Timestamp when OFF data was last cached locally';
COMMENT ON COLUMN foods.is_verified IS 'Trainer/Admin verification flag for external foods';
