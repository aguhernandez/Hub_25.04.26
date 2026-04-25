/*
  # Update Foods Source Constraint to Allow 'OFF'

  ## Overview
  Updates the `source` column constraint in the foods table to accept 'OFF'
  as a valid value, following the new naming convention for Open Food Facts integration.

  ## Changes
  - Drops existing constraint on foods.source
  - Adds updated constraint allowing: 'internal', 'usda', 'open_food_facts', 'OFF'
  - Migrates existing 'open_food_facts' values to 'OFF' for consistency

  ## Notes
  - 'OFF' is the preferred short form for Open Food Facts
  - Maintains backward compatibility with 'open_food_facts'
  - No data loss or breaking changes
*/

-- Drop existing constraint
ALTER TABLE foods DROP CONSTRAINT IF EXISTS foods_source_check;

-- Add updated constraint with 'OFF' option
ALTER TABLE foods
ADD CONSTRAINT foods_source_check
  CHECK (source IN ('internal', 'usda', 'open_food_facts', 'OFF'));

-- Migrate any existing 'open_food_facts' values to 'OFF' for consistency
UPDATE foods
SET source = 'OFF'
WHERE source = 'open_food_facts';

-- Update comment for documentation
COMMENT ON COLUMN foods.source IS 'Origin of food data: internal (custom), usda (USDA database), OFF (Open Food Facts API)';