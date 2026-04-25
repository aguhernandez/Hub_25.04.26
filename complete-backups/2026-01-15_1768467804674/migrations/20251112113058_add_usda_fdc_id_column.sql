/*
  # Add USDA FDC ID Column to Foods Table

  1. Changes
    - Add usda_fdc_id column (text)
    - This stores the USDA FoodData Central ID for reference

  2. Notes
    - Nullable (not all foods come from USDA)
    - Can be used to link back to USDA database
*/

-- Add USDA FDC ID column
ALTER TABLE foods
ADD COLUMN IF NOT EXISTS usda_fdc_id text;