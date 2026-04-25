/*
  # Add Fiber and Sugar Columns to Foods Table

  1. Changes
    - Add fiber_per_100g column (decimal)
    - Add sugar_per_100g column (decimal)
    - These are needed for USDA food data import

  2. Notes
    - Non-breaking change
    - Nullable columns (optional data)
*/

-- Add fiber and sugar columns
ALTER TABLE foods
ADD COLUMN IF NOT EXISTS fiber_per_100g decimal,
ADD COLUMN IF NOT EXISTS sugar_per_100g decimal;