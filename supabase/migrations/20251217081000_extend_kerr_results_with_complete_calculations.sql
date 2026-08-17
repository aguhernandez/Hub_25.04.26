/*
  # Extend Kerr Results with Complete Calculation Fields
  
  ## Overview
  Adds missing fields to anthropometry_kerr_results to support:
  - Complete input data (sex, age, height, body_mass)
  - Detailed bone mass breakdown
  - Body surface area and skin thickness
  - Structured weight comparison
  - Complete structural indices
  - BMR calculation
  - Measurement date
  
  ## Changes
  Adds columns for comprehensive body composition analysis
  
  ## Security
  - No RLS changes needed
  - All columns nullable to support gradual migration
*/

-- Add missing essential input fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'measurement_date') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN measurement_date date DEFAULT CURRENT_DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'sex') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN sex varchar;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'age_years') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN age_years numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'height_cm') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN height_cm numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'body_mass_kg') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN body_mass_kg numeric;
  END IF;

  -- Skinfold sums
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'sum_6_skf') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN sum_6_skf numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'sum_8_skf') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN sum_8_skf numeric;
  END IF;

  -- Fat mass fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'fat_pct') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN fat_pct numeric;
  END IF;

  -- Corrected girths
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'arm_corr') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN arm_corr numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'thigh_corr') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN thigh_corr numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'calf_corr') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN calf_corr numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'waist_corr') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN waist_corr numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'sum_corr_girths') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN sum_corr_girths numeric;
  END IF;

  -- Bone mass breakdown
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'sum_breadths') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN sum_breadths numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'bone_mass_body') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN bone_mass_body numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'bone_mass_head') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN bone_mass_head numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'bone_mass_total') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN bone_mass_total numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'bone_mass_pct') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN bone_mass_pct numeric;
  END IF;

  -- Skin mass fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'skin_thickness') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN skin_thickness numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'body_surface_area') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN body_surface_area numeric;
  END IF;

  -- Structured weight
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'structured_weight') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN structured_weight numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'weight_difference') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN weight_difference numeric;
  END IF;

  -- Structural indices
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'muscle_index') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN muscle_index numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'bone_index') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN bone_index numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'adipose_index') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN adipose_index numeric;
  END IF;

  -- Cross-sectional areas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'arm_total_area') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN arm_total_area numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'forearm_total_area') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN forearm_total_area numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'thigh_total_area') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN thigh_total_area numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'calf_total_area') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN calf_total_area numeric;
  END IF;

  -- Phantom Z-scores
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'z_adipose') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN z_adipose numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'z_muscle') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN z_muscle numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'z_bone') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN z_bone numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'z_residual') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN z_residual numeric;
  END IF;

  -- BMR
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'bmr') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN bmr numeric;
  END IF;

  -- Muscle mass percentage (if not exists)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_kerr_results' AND column_name = 'muscle_mass_pct') THEN
    ALTER TABLE anthropometry_kerr_results ADD COLUMN muscle_mass_pct numeric;
  END IF;
END $$;