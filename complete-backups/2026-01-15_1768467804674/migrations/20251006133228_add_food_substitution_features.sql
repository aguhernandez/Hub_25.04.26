/*
  # Add Food Substitution Features
  
  Adds the food substitution system to existing meal plan structure.
  
  1. Changes
    - Add allow_substitutions column to meal_plans
    - Create food_database table for substitute suggestions
    - Add substitution tracking to meal_plan_items
    - Create function to find substitute foods
    
  2. Security
    - Athletes can substitute if coach allows
    - Everyone can view food database
    - Admins manage food database
*/

-- Add allow_substitutions to meal_plans if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_plans' AND column_name = 'allow_substitutions'
  ) THEN
    ALTER TABLE meal_plans ADD COLUMN allow_substitutions boolean DEFAULT true;
  END IF;
END $$;

-- Add substitution fields to meal_plan_items if not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_plan_items' AND column_name = 'original_food_id'
  ) THEN
    ALTER TABLE meal_plan_items ADD COLUMN original_food_id uuid;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_plan_items' AND column_name = 'is_substitution'
  ) THEN
    ALTER TABLE meal_plan_items ADD COLUMN is_substitution boolean DEFAULT false;
  END IF;
END $$;

-- Create food_database table
CREATE TABLE IF NOT EXISTS food_database (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_es text NOT NULL,
  category text CHECK (category IN ('protein', 'carbs', 'fats', 'mixed')),
  origin text CHECK (origin IN ('animal', 'plant', 'mixed')),
  preferences text[] DEFAULT ARRAY[]::text[],
  serving_size decimal(10,2) DEFAULT 100,
  serving_unit text DEFAULT 'g',
  calories decimal(10,2) DEFAULT 0,
  protein decimal(10,2) DEFAULT 0,
  carbs decimal(10,2) DEFAULT 0,
  fats decimal(10,2) DEFAULT 0,
  fiber decimal(10,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for food_database
CREATE INDEX IF NOT EXISTS idx_food_database_category ON food_database(category);
CREATE INDEX IF NOT EXISTS idx_food_database_active ON food_database(is_active);
CREATE INDEX IF NOT EXISTS idx_food_database_origin ON food_database(origin);

-- Enable RLS on food_database
ALTER TABLE food_database ENABLE ROW LEVEL SECURITY;

-- Food Database Policies
DROP POLICY IF EXISTS "Everyone can view active foods" ON food_database;
CREATE POLICY "Everyone can view active foods"
ON food_database FOR SELECT
TO authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage food database" ON food_database;
CREATE POLICY "Admins can manage food database"
ON food_database FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Create function to find substitute foods
CREATE OR REPLACE FUNCTION find_substitute_foods(
  target_calories decimal,
  target_protein decimal,
  target_carbs decimal,
  target_fats decimal,
  food_category text DEFAULT NULL,
  filter_origin text DEFAULT NULL,
  filter_preferences text[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  name_es text,
  category text,
  origin text,
  serving_size decimal,
  serving_unit text,
  calories decimal,
  protein decimal,
  carbs decimal,
  fats decimal,
  fiber decimal,
  adjusted_quantity decimal,
  match_score decimal
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.name,
    f.name_es,
    f.category,
    f.origin,
    f.serving_size,
    f.serving_unit,
    f.calories,
    f.protein,
    f.carbs,
    f.fats,
    f.fiber,
    CASE 
      WHEN f.calories > 0 THEN ROUND((target_calories / f.calories * f.serving_size)::numeric, 2)
      ELSE f.serving_size
    END as adjusted_quantity,
    (
      COALESCE(ABS(f.protein - target_protein) / NULLIF(target_protein, 0) * 100, 0) +
      COALESCE(ABS(f.calories - target_calories) / NULLIF(target_calories, 0) * 100, 0) +
      COALESCE(ABS(f.carbs - target_carbs) / NULLIF(target_carbs, 0) * 50, 0) +
      COALESCE(ABS(f.fats - target_fats) / NULLIF(target_fats, 0) * 50, 0)
    ) as match_score
  FROM food_database f
  WHERE 
    f.is_active = true
    AND (food_category IS NULL OR f.category = food_category)
    AND (filter_origin IS NULL OR f.origin = filter_origin)
    AND (filter_preferences IS NULL OR f.preferences && filter_preferences)
  ORDER BY match_score ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Insert sample foods into database (only if empty)
INSERT INTO food_database (name, name_es, category, origin, preferences, serving_size, serving_unit, calories, protein, carbs, fats, fiber)
SELECT * FROM (VALUES
  ('Chicken Breast', 'Pechuga de Pollo', 'protein', 'animal', ARRAY['gluten-free', 'dairy-free'], 100::decimal, 'g', 165::decimal, 31::decimal, 0::decimal, 3.6::decimal, 0::decimal),
  ('Turkey Breast', 'Pechuga de Pavo', 'protein', 'animal', ARRAY['gluten-free', 'dairy-free'], 100::decimal, 'g', 135::decimal, 30::decimal, 0::decimal, 1::decimal, 0::decimal),
  ('Salmon', 'Salmón', 'protein', 'animal', ARRAY['gluten-free', 'dairy-free'], 100::decimal, 'g', 208::decimal, 20::decimal, 0::decimal, 13::decimal, 0::decimal),
  ('Tuna', 'Atún', 'protein', 'animal', ARRAY['gluten-free', 'dairy-free'], 100::decimal, 'g', 132::decimal, 28::decimal, 0::decimal, 1::decimal, 0::decimal),
  ('Egg Whites', 'Claras de Huevo', 'protein', 'animal', ARRAY['gluten-free', 'dairy-free'], 100::decimal, 'g', 52::decimal, 11::decimal, 0.7::decimal, 0.2::decimal, 0::decimal),
  ('Whole Eggs', 'Huevos Enteros', 'protein', 'animal', ARRAY['gluten-free', 'dairy-free'], 100::decimal, 'g', 143::decimal, 13::decimal, 1::decimal, 10::decimal, 0::decimal),
  ('Greek Yogurt', 'Yogur Griego', 'protein', 'animal', ARRAY['gluten-free', 'vegetarian'], 100::decimal, 'g', 59::decimal, 10::decimal, 3.6::decimal, 0.4::decimal, 0::decimal),
  ('Cottage Cheese', 'Queso Cottage', 'protein', 'animal', ARRAY['gluten-free', 'vegetarian'], 100::decimal, 'g', 98::decimal, 11::decimal, 3.4::decimal, 4.3::decimal, 0::decimal),
  ('Tofu', 'Tofu', 'protein', 'plant', ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 100::decimal, 'g', 76::decimal, 8::decimal, 1.9::decimal, 4.8::decimal, 0.3::decimal),
  ('Tempeh', 'Tempeh', 'protein', 'plant', ARRAY['vegan', 'vegetarian', 'dairy-free'], 100::decimal, 'g', 193::decimal, 19::decimal, 9::decimal, 11::decimal, 0::decimal),
  ('Seitan', 'Seitán', 'protein', 'plant', ARRAY['vegan', 'vegetarian', 'dairy-free'], 100::decimal, 'g', 370::decimal, 75::decimal, 14::decimal, 1.9::decimal, 0.6::decimal),
  ('Lentils', 'Lentejas', 'protein', 'plant', ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 100::decimal, 'g', 116::decimal, 9::decimal, 20::decimal, 0.4::decimal, 8::decimal),
  ('Chickpeas', 'Garbanzos', 'protein', 'plant', ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 100::decimal, 'g', 164::decimal, 9::decimal, 27::decimal, 2.6::decimal, 7.6::decimal),
  ('Black Beans', 'Frijoles Negros', 'protein', 'plant', ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 100::decimal, 'g', 132::decimal, 9::decimal, 24::decimal, 0.5::decimal, 8.7::decimal),
  ('Brown Rice', 'Arroz Integral', 'carbs', 'plant', ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 100::decimal, 'g', 112::decimal, 2.6::decimal, 24::decimal, 0.9::decimal, 1.8::decimal),
  ('White Rice', 'Arroz Blanco', 'carbs', 'plant', ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 100::decimal, 'g', 130::decimal, 2.7::decimal, 28::decimal, 0.3::decimal, 0.4::decimal),
  ('Quinoa', 'Quinoa', 'carbs', 'plant', ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 100::decimal, 'g', 120::decimal, 4.4::decimal, 21::decimal, 1.9::decimal, 2.8::decimal),
  ('Oats', 'Avena', 'carbs', 'plant', ARRAY['vegan', 'vegetarian', 'dairy-free'], 100::decimal, 'g', 389::decimal, 17::decimal, 66::decimal, 6.9::decimal, 10.6::decimal),
  ('Sweet Potato', 'Batata', 'carbs', 'plant', ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 100::decimal, 'g', 86::decimal, 1.6::decimal, 20::decimal, 0.1::decimal, 3::decimal),
  ('White Potato', 'Papa Blanca', 'carbs', 'plant', ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 100::decimal, 'g', 77::decimal, 2::decimal, 17::decimal, 0.1::decimal, 2.1::decimal),
  ('Whole Wheat Pasta', 'Pasta Integral', 'carbs', 'plant', ARRAY['vegan', 'vegetarian', 'dairy-free'], 100::decimal, 'g', 124::decimal, 5::decimal, 26::decimal, 0.5::decimal, 3.5::decimal),
  ('White Pasta', 'Pasta Blanca', 'carbs', 'plant', ARRAY['vegan', 'vegetarian', 'dairy-free'], 100::decimal, 'g', 131::decimal, 5::decimal, 25::decimal, 1.1::decimal, 1.8::decimal),
  ('Banana', 'Banana', 'carbs', 'plant', ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 100::decimal, 'g', 89::decimal, 1.1::decimal, 23::decimal, 0.3::decimal, 2.6::decimal),
  ('Apple', 'Manzana', 'carbs', 'plant', ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 100::decimal, 'g', 52::decimal, 0.3::decimal, 14::decimal, 0.2::decimal, 2.4::decimal),
  ('Almonds', 'Almendras', 'fats', 'plant', ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 100::decimal, 'g', 579::decimal, 21::decimal, 22::decimal, 50::decimal, 12.5::decimal),
  ('Walnuts', 'Nueces', 'fats', 'plant', ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 100::decimal, 'g', 654::decimal, 15::decimal, 14::decimal, 65::decimal, 6.7::decimal),
  ('Peanut Butter', 'Mantequilla de Maní', 'fats', 'plant', ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 100::decimal, 'g', 588::decimal, 25::decimal, 20::decimal, 50::decimal, 6::decimal),
  ('Avocado', 'Aguacate', 'fats', 'plant', ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 100::decimal, 'g', 160::decimal, 2::decimal, 9::decimal, 15::decimal, 7::decimal),
  ('Olive Oil', 'Aceite de Oliva', 'fats', 'plant', ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 15::decimal, 'ml', 119::decimal, 0::decimal, 0::decimal, 14::decimal, 0::decimal),
  ('Coconut Oil', 'Aceite de Coco', 'fats', 'plant', ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 15::decimal, 'ml', 121::decimal, 0::decimal, 0::decimal, 14::decimal, 0::decimal)
) AS t(name, name_es, category, origin, preferences, serving_size, serving_unit, calories, protein, carbs, fats, fiber)
WHERE NOT EXISTS (SELECT 1 FROM food_database LIMIT 1);
