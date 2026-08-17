/*
  # Add Lab-Specific Anthropometry Fields to Biological Passport

  ## Summary
  Adds two new anthropometry fields to the biological_passports table that are
  sourced from the Lab satellite (lab.asciende.pro):

  ## New Columns
  - `skinfold_sum_6` (float): Sum of 6 standard skinfold measurements in mm
    (mapped from Lab's `sum_6_skinfolds` field)
  - `muscle_bone_index` (float): Muscle-to-bone mass ratio index
    (mapped from Lab's `muscle_bone_ratio` field)

  ## Additional Lab Fields
  - `z_adipose` (float): Z-score for adipose tissue (from Kerr model)
  - `z_muscle` (float): Z-score for muscle mass (from Kerr model)
  - `z_bone` (float): Z-score for bone mass (from Kerr model)
  - `test_protocol` (text): Lab test protocol used (e.g., "Ramp 20W/min", "Bruce")
  - `lab_athlete_id` (text): The athlete ID in the lab system (for cross-referencing)

  ## Notes
  - All fields are nullable — only populated when source = 'lab'
  - No destructive changes to existing data
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biological_passports' AND column_name = 'skinfold_sum_6'
  ) THEN
    ALTER TABLE biological_passports ADD COLUMN skinfold_sum_6 float;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biological_passports' AND column_name = 'muscle_bone_index'
  ) THEN
    ALTER TABLE biological_passports ADD COLUMN muscle_bone_index float;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biological_passports' AND column_name = 'z_adipose'
  ) THEN
    ALTER TABLE biological_passports ADD COLUMN z_adipose float;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biological_passports' AND column_name = 'z_muscle'
  ) THEN
    ALTER TABLE biological_passports ADD COLUMN z_muscle float;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biological_passports' AND column_name = 'z_bone'
  ) THEN
    ALTER TABLE biological_passports ADD COLUMN z_bone float;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biological_passports' AND column_name = 'test_protocol'
  ) THEN
    ALTER TABLE biological_passports ADD COLUMN test_protocol text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biological_passports' AND column_name = 'lab_athlete_id'
  ) THEN
    ALTER TABLE biological_passports ADD COLUMN lab_athlete_id text;
  END IF;
END $$;
