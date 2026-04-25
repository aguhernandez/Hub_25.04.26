/*
  # Fix meal_plan_items foreign key to point to foods table

  1. Changes
    - Drop old foreign key constraint pointing to food_items
    - Add new foreign key constraint pointing to foods table
    - This allows meal plans to use the new unified foods table

  2. Security
    - No changes to RLS policies
*/

-- Drop old constraint
ALTER TABLE meal_plan_items 
DROP CONSTRAINT IF EXISTS meal_plan_items_food_id_fkey;

-- Add new constraint pointing to foods table
ALTER TABLE meal_plan_items 
ADD CONSTRAINT meal_plan_items_food_id_fkey 
FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE;