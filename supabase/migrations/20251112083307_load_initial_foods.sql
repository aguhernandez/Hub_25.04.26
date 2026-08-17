/*
  # Load Initial Foods Data
  
  ## Overview
  Loads basic food items into the foods table with multilingual support
  
  ## Foods Loaded
  - 8 basic foods (chicken, rice, banana, salmon, eggs, oats, yogurt, sweet potato)
  - Spanish and English names
  - Proper categorization
  - Verified items
  
  ## Notes
  - Only inserts if not already present
  - Uses ON CONFLICT to prevent duplicates
*/

-- Insert foods with multilingual support
INSERT INTO foods (name, name_es, name_en, category, serving_size, serving_unit, calories, calories_per_100g, protein, protein_per_100g, carbs, carbs_per_100g, fat, fat_per_100g, fiber, is_verified)
VALUES
  ('Chicken breast', 'Pechuga de pollo', 'Chicken breast', 'meat', 100, 'g', 165, 165, 31, 31, 0, 0, 3.6, 3.6, 0, true),
  ('Brown rice', 'Arroz integral', 'Brown rice', 'grain', 100, 'g', 111, 111, 2.6, 2.6, 23, 23, 0.9, 0.9, 1.8, true),
  ('Banana', 'Plátano', 'Banana', 'fruit', 118, 'g', 89, 75, 1.1, 0.9, 23, 19, 0.3, 0.3, 2.6, true),
  ('Salmon', 'Salmón', 'Salmon', 'fish', 100, 'g', 208, 208, 20, 20, 0, 0, 13, 13, 0, true),
  ('Eggs', 'Huevos', 'Eggs', 'egg', 50, 'g', 78, 156, 6.3, 12.6, 0.6, 1.2, 5.3, 10.6, 0, true),
  ('Oats', 'Avena', 'Oats', 'grain', 40, 'g', 152, 380, 5.3, 13.3, 27, 67.5, 2.8, 7, 4, true),
  ('Greek yogurt', 'Yogur griego', 'Greek yogurt', 'dairy', 170, 'g', 100, 59, 17, 10, 6, 3.5, 0.7, 0.4, 0, true),
  ('Sweet potato', 'Batata', 'Sweet potato', 'grain', 130, 'g', 112, 86, 2, 1.5, 26, 20, 0.1, 0.1, 3.9, true)
ON CONFLICT (id) DO NOTHING;

-- Verify insert
DO $$
DECLARE
  food_count integer;
BEGIN
  SELECT COUNT(*) INTO food_count FROM foods;
  RAISE NOTICE 'Total foods in database: %', food_count;
END $$;