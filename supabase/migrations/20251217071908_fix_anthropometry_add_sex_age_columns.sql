/*
  # Add sex and age columns to anthropometry_measurements
  
  1. Changes
    - Add sex column (male, female, prefer_not_say)
    - Add age column (numeric)
    - Both are required fields for proper calculations
  
  2. Security
    - No RLS changes needed
    - Columns are mandatory for new records
*/

DO $$
BEGIN
  -- Add sex column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'anthropometry_measurements' AND column_name = 'sex'
  ) THEN
    ALTER TABLE anthropometry_measurements 
    ADD COLUMN sex varchar CHECK (sex IN ('male', 'female', 'prefer_not_say'));
  END IF;

  -- Add age column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'anthropometry_measurements' AND column_name = 'age'
  ) THEN
    ALTER TABLE anthropometry_measurements 
    ADD COLUMN age numeric;
  END IF;

  -- Add measurement_method column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'anthropometry_measurements' AND column_name = 'measurement_method'
  ) THEN
    ALTER TABLE anthropometry_measurements 
    ADD COLUMN measurement_method text DEFAULT 'manual';
  END IF;
END $$;
