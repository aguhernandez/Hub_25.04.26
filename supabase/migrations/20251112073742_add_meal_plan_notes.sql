/*
  # Add Notes Field to Meal Plans
  
  ## Overview
  Adds a notes field to meal_plans table for trainers, nutritionists, and athletes
  to track modifications, sensations, and corrections over time.
  
  ## Changes Made
  
  ### 1. Add notes field to meal_plans
  - Adds text field for storing plan notes
  - Nullable to maintain backward compatibility
  
  ## Notes
  - Notes can be added/edited at any time
  - Used for tracking plan adjustments and athlete feedback
*/

-- Add notes field to meal_plans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'meal_plans' AND column_name = 'notes'
  ) THEN
    ALTER TABLE meal_plans ADD COLUMN notes text;
  END IF;
END $$;

COMMENT ON COLUMN meal_plans.notes IS 'Notes about the plan, modifications, sensations, and corrections to track over time';