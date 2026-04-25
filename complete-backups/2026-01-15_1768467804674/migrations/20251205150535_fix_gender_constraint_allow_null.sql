/*
  # Fix gender constraint to allow NULL

  1. Problem
    - profiles_gender_check constraint doesn't allow NULL values
    - When users haven't selected a gender, empty string is sent and violates constraint
    
  2. Solution
    - Drop old constraint
    - Create new constraint that allows NULL
    - Update any empty string gender values to NULL
    
  3. Changes
    - Allow gender to be NULL (not set)
    - Keep validation for non-null values
*/

-- Update empty string gender values to NULL
UPDATE profiles 
SET gender = NULL 
WHERE gender = '';

-- Drop old constraint
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_gender_check;

-- Create new constraint that allows NULL or specific values
ALTER TABLE profiles
ADD CONSTRAINT profiles_gender_check 
CHECK (
  gender IS NULL OR 
  gender IN ('male', 'female', 'other', 'prefer_not_to_say')
);
