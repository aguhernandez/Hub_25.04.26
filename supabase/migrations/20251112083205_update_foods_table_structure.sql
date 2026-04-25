/*
  # Update Foods Table Structure
  
  ## Overview
  Adds multilingual support and category classification to foods table
  to support the nutrition meal planning system.
  
  ## Changes Made
  
  ### 1. Add multilingual name fields
  - Adds `name_es` (Spanish name)
  - Adds `name_en` (English name)
  - Migrates existing `name` to `name_en`
  
  ### 2. Add category field
  - Adds `category` field for food classification
  - Categories: grain, fruit, vegetable, meat, fish, dairy, legume, egg, oil, supplement
  
  ### 3. Standardize nutrition columns
  - Adds `calories_per_100g`, `protein_per_100g`, `carbs_per_100g`, `fat_per_100g`
  - Keeps original columns for compatibility
  
  ## Notes
  - Existing data preserved
  - Admin-only write access maintained
*/

-- Add new columns
ALTER TABLE foods 
  ADD COLUMN IF NOT EXISTS name_es text,
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS calories_per_100g numeric(10,2),
  ADD COLUMN IF NOT EXISTS protein_per_100g numeric(10,2),
  ADD COLUMN IF NOT EXISTS carbs_per_100g numeric(10,2),
  ADD COLUMN IF NOT EXISTS fat_per_100g numeric(10,2);

-- Migrate existing data
UPDATE foods 
SET 
  name_en = name,
  name_es = name,
  calories_per_100g = calories,
  protein_per_100g = protein,
  carbs_per_100g = carbs,
  fat_per_100g = fat
WHERE name_en IS NULL;

-- Add check constraint for category
ALTER TABLE foods DROP CONSTRAINT IF EXISTS foods_category_check;
ALTER TABLE foods 
  ADD CONSTRAINT foods_category_check 
  CHECK (category IN ('grain', 'fruit', 'vegetable', 'meat', 'fish', 'dairy', 'legume', 'egg', 'oil', 'supplement', 'other'));

COMMENT ON COLUMN foods.name_es IS 'Spanish name of the food';
COMMENT ON COLUMN foods.name_en IS 'English name of the food';
COMMENT ON COLUMN foods.category IS 'Food category for filtering';
COMMENT ON COLUMN foods.calories_per_100g IS 'Calories per 100g';
COMMENT ON COLUMN foods.protein_per_100g IS 'Protein in grams per 100g';
COMMENT ON COLUMN foods.carbs_per_100g IS 'Carbs in grams per 100g';
COMMENT ON COLUMN foods.fat_per_100g IS 'Fat in grams per 100g';