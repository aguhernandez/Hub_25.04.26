/*
  # Seed Basic Foods
  
  1. Purpose
    - Insert basic food items into the foods table
    - These are starter foods for meal planning
  
  2. Foods Added
    - Chicken breast, Brown rice, Banana, Salmon
    - Eggs, Oats, Greek yogurt, Sweet potato
    
  3. Notes
    - All foods are marked as verified
*/

-- Check if foods exist first
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM foods WHERE name = 'Chicken breast') THEN
    INSERT INTO foods (name, name_en, name_es, brand, serving_size, serving_unit, calories, calories_per_100g, protein, protein_per_100g, carbs, carbs_per_100g, fat, fat_per_100g, fiber, category, is_verified)
    VALUES 
      ('Chicken breast', 'Chicken breast', 'Pechuga de pollo', NULL, 100, 'g', 165, 165, 31, 31, 0, 0, 3.6, 3.6, 0, 'meat', true),
      ('Brown rice', 'Brown rice', 'Arroz integral', NULL, 100, 'g', 111, 111, 2.6, 2.6, 23, 23, 0.9, 0.9, 1.8, 'grain', true),
      ('Banana', 'Banana', 'Plátano', NULL, 118, 'g', 89, 75, 1.1, 0.9, 23, 19, 0.3, 0.25, 2.6, 'fruit', true),
      ('Salmon', 'Salmon', 'Salmón', NULL, 100, 'g', 208, 208, 20, 20, 0, 0, 13, 13, 0, 'fish', true),
      ('Eggs', 'Eggs', 'Huevos', NULL, 50, 'g', 78, 156, 6.3, 12.6, 0.6, 1.2, 5.3, 10.6, 0, 'egg', true),
      ('Oats', 'Oats', 'Avena', NULL, 40, 'g', 152, 380, 5.3, 13.25, 27, 67.5, 2.8, 7, 4, 'grain', true),
      ('Greek yogurt', 'Greek yogurt', 'Yogur griego', NULL, 170, 'g', 100, 59, 17, 10, 6, 3.5, 0.7, 0.4, 0, 'dairy', true),
      ('Sweet potato', 'Sweet potato', 'Camote', NULL, 130, 'g', 112, 86, 2, 1.5, 26, 20, 0.1, 0.08, 3.9, 'grain', true);
  END IF;
END $$;
