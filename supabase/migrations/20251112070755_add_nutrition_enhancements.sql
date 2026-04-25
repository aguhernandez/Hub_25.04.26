/*
  # Nutrition System Enhancements
  
  ## Overview
  Adds missing fields and functionality for the nutrition planning system
  
  ## Changes Made
  
  ### 1. Foods Table - Micronutrients
  Adds micronutrient tracking fields to the foods table:
  - Vitamins: A, B1, B2, B3, B6, B12, C, D, E, K (in mcg or mg)
  - Minerals: Calcium, Iron, Magnesium, Phosphorus, Potassium, Sodium, Zinc (in mg)
  - Additional: Folate, Biotin
  
  ### 2. Meal Plan Meals - Preparation Title
  Adds preparation_title field to meal_plan_meals for specific preparation methods
  - Example: "Scrambled Eggs" instead of just "2 eggs"
  
  ### 3. Meal Plans - Day Names Customization
  Adds day_names JSONB field to meal_plans for custom day naming and grouping
  - Allows "Monday", "Tuesday" instead of "Day 1", "Day 2"
  - Supports day grouping (Mon-Wed-Fri, Tue-Thu, Weekend, etc.)
  
  ## Notes
  - All new fields are nullable for backward compatibility
  - Micronutrient values are per 100g serving
  - Day names stored as JSON array for flexibility
*/

-- Add micronutrients to foods table
DO $$
BEGIN
  -- Vitamins (in various units depending on vitamin)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'foods' AND column_name = 'vitamin_a_mcg'
  ) THEN
    ALTER TABLE foods ADD COLUMN vitamin_a_mcg numeric(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'foods' AND column_name = 'vitamin_b1_mg'
  ) THEN
    ALTER TABLE foods ADD COLUMN vitamin_b1_mg numeric(10,4);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'foods' AND column_name = 'vitamin_b2_mg'
  ) THEN
    ALTER TABLE foods ADD COLUMN vitamin_b2_mg numeric(10,4);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'foods' AND column_name = 'vitamin_b3_mg'
  ) THEN
    ALTER TABLE foods ADD COLUMN vitamin_b3_mg numeric(10,3);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'foods' AND column_name = 'vitamin_b6_mg'
  ) THEN
    ALTER TABLE foods ADD COLUMN vitamin_b6_mg numeric(10,4);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'foods' AND column_name = 'vitamin_b12_mcg'
  ) THEN
    ALTER TABLE foods ADD COLUMN vitamin_b12_mcg numeric(10,3);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'foods' AND column_name = 'vitamin_c_mg'
  ) THEN
    ALTER TABLE foods ADD COLUMN vitamin_c_mg numeric(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'foods' AND column_name = 'vitamin_d_mcg'
  ) THEN
    ALTER TABLE foods ADD COLUMN vitamin_d_mcg numeric(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'foods' AND column_name = 'vitamin_e_mg'
  ) THEN
    ALTER TABLE foods ADD COLUMN vitamin_e_mg numeric(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'foods' AND column_name = 'vitamin_k_mcg'
  ) THEN
    ALTER TABLE foods ADD COLUMN vitamin_k_mcg numeric(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'foods' AND column_name = 'folate_mcg'
  ) THEN
    ALTER TABLE foods ADD COLUMN folate_mcg numeric(10,2);
  END IF;

  -- Minerals (in mg unless specified)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'foods' AND column_name = 'calcium_mg'
  ) THEN
    ALTER TABLE foods ADD COLUMN calcium_mg numeric(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'foods' AND column_name = 'iron_mg'
  ) THEN
    ALTER TABLE foods ADD COLUMN iron_mg numeric(10,3);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'foods' AND column_name = 'magnesium_mg'
  ) THEN
    ALTER TABLE foods ADD COLUMN magnesium_mg numeric(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'foods' AND column_name = 'phosphorus_mg'
  ) THEN
    ALTER TABLE foods ADD COLUMN phosphorus_mg numeric(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'foods' AND column_name = 'potassium_mg'
  ) THEN
    ALTER TABLE foods ADD COLUMN potassium_mg numeric(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'foods' AND column_name = 'sodium_mg'
  ) THEN
    ALTER TABLE foods ADD COLUMN sodium_mg numeric(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'foods' AND column_name = 'zinc_mg'
  ) THEN
    ALTER TABLE foods ADD COLUMN zinc_mg numeric(10,3);
  END IF;
END $$;

-- Add preparation_title to meal_plan_meals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'meal_plan_meals' AND column_name = 'preparation_title'
  ) THEN
    ALTER TABLE meal_plan_meals ADD COLUMN preparation_title text;
  END IF;
END $$;

-- Add day_names customization to meal_plans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'meal_plans' AND column_name = 'day_names'
  ) THEN
    ALTER TABLE meal_plans ADD COLUMN day_names jsonb;
  END IF;
END $$;

-- Add comment for day_names field usage
COMMENT ON COLUMN meal_plans.day_names IS 'JSON array of custom day names. Example: ["Monday", "Tuesday", "Wednesday"] or grouped days: [["Mon", "Wed", "Fri"], ["Tue", "Thu"], ["Weekend"]]';

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_meal_plan_meals_time ON meal_plan_meals(meal_time);
CREATE INDEX IF NOT EXISTS idx_meal_plans_day_names ON meal_plans USING gin(day_names);