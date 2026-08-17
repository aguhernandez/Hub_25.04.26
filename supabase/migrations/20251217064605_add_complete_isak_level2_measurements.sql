/*
  # Add Complete ISAK Level 2 Anthropometry Measurements

  ## Overview
  Adds all missing measurement columns to support complete ISAK Level 2 protocol (42 measurements).
  Each measurement has three trials (_m1, _m2, _m3) to calculate median values.

  ## Changes

  ### 1. Add missing _m3 columns for existing measurements
  All basic measurements need third trial:
  - weight_m3, height_m3, sitting_height_m3
  - All skinfold _m3 columns (triceps, subscapular, suprailiac, abdominal, thigh, calf)
  - All perimeter _m3 columns (arm_relaxed, arm_flexed, waist, hip, thigh_perim, calf_perim)
  - All diameter _m3 columns (humerus, femur)

  ### 2. Add new basic measurements
  - body_mass_m1/m2/m3 (alias for weight)
  - stature_m1/m2/m3 (alias for height)
  - arm_span_m1/m2/m3 (new: envergadura)

  ### 3. Add complete skinfold measurements (8 sites)
  - biceps_m1/m2/m3
  - iliac_crest_m1/m2/m3
  - supraspinale_m1/m2/m3
  - front_thigh_m1/m2/m3
  - medial_calf_m1/m2/m3

  ### 4. Add complete perimeter measurements (13 sites)
  - thorax_m1/m2/m3 (chest/thorax)
  - upper_thigh_m1/m2/m3
  - mid_thigh_m1/m2/m3
  - gluteal_m1/m2/m3 (hip)

  ### 5. Add complete diameter measurements (8 sites)
  - bistiloid_m1/m2/m3 (wrist)
  - bicondylar_femur_m1/m2/m3
  - bimalleolar_m1/m2/m3 (ankle)
  - bicristal_m1/m2/m3 (bi-iliocristal)
  - biepicondylar_humerus_m1/m2/m3

  ### 6. Add athlete info fields
  - birthdate (date)
  - athlete_id (uuid reference to profiles)
  - measurement_number (integer)

  ## Security
  - No RLS changes needed
  - Columns are nullable to support partial measurements

  ## Notes
  - Following ISAK Level 2 standard (42 measurements)
  - Each measurement has 3 trials, median is calculated in application
  - Optional fields can remain null
*/

-- Add birthdate and athlete info
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'anthropometry_measurements' AND column_name = 'birthdate'
  ) THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN birthdate date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'anthropometry_measurements' AND column_name = 'athlete_id'
  ) THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN athlete_id uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'anthropometry_measurements' AND column_name = 'measurement_number'
  ) THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN measurement_number integer DEFAULT 1;
  END IF;
END $$;

-- Add missing _m3 columns for existing measurements
DO $$
BEGIN
  -- Basic measurements m3
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'weight_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN weight_m3 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'height_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN height_m3 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'sitting_height_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN sitting_height_m3 numeric(6,2);
  END IF;

  -- Skinfolds m3
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'triceps_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN triceps_m3 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'subscapular_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN subscapular_m3 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'suprailiac_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN suprailiac_m3 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'abdominal_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN abdominal_m3 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'thigh_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN thigh_m3 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'calf_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN calf_m3 numeric(6,2);
  END IF;

  -- Perimeters m3
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'arm_relaxed_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN arm_relaxed_m3 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'arm_flexed_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN arm_flexed_m3 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'waist_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN waist_m3 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'hip_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN hip_m3 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'thigh_perim_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN thigh_perim_m3 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'calf_perim_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN calf_perim_m3 numeric(6,2);
  END IF;

  -- Diameters m3
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'humerus_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN humerus_m3 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'femur_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN femur_m3 numeric(6,2);
  END IF;
END $$;

-- Add new ISAK Level 2 measurements
DO $$
BEGIN
  -- Basic: arm_span (envergadura)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'arm_span_m1') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN arm_span_m1 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'arm_span_m2') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN arm_span_m2 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'arm_span_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN arm_span_m3 numeric(6,2);
  END IF;

  -- Skinfolds: biceps
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'biceps_m1') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN biceps_m1 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'biceps_m2') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN biceps_m2 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'biceps_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN biceps_m3 numeric(6,2);
  END IF;

  -- Skinfolds: iliac_crest
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'iliac_crest_m1') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN iliac_crest_m1 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'iliac_crest_m2') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN iliac_crest_m2 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'iliac_crest_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN iliac_crest_m3 numeric(6,2);
  END IF;

  -- Skinfolds: supraspinale
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'supraspinale_m1') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN supraspinale_m1 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'supraspinale_m2') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN supraspinale_m2 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'supraspinale_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN supraspinale_m3 numeric(6,2);
  END IF;

  -- Skinfolds: front_thigh
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'front_thigh_m1') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN front_thigh_m1 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'front_thigh_m2') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN front_thigh_m2 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'front_thigh_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN front_thigh_m3 numeric(6,2);
  END IF;

  -- Skinfolds: medial_calf
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'medial_calf_m1') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN medial_calf_m1 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'medial_calf_m2') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN medial_calf_m2 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'medial_calf_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN medial_calf_m3 numeric(6,2);
  END IF;

  -- Perimeters: thorax (chest)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'thorax_m1') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN thorax_m1 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'thorax_m2') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN thorax_m2 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'thorax_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN thorax_m3 numeric(6,2);
  END IF;

  -- Perimeters: gluteal (hip)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'gluteal_m1') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN gluteal_m1 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'gluteal_m2') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN gluteal_m2 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'gluteal_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN gluteal_m3 numeric(6,2);
  END IF;

  -- Perimeters: upper_thigh
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'upper_thigh_m1') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN upper_thigh_m1 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'upper_thigh_m2') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN upper_thigh_m2 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'upper_thigh_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN upper_thigh_m3 numeric(6,2);
  END IF;

  -- Perimeters: mid_thigh
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'mid_thigh_m1') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN mid_thigh_m1 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'mid_thigh_m2') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN mid_thigh_m2 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'mid_thigh_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN mid_thigh_m3 numeric(6,2);
  END IF;

  -- Perimeters: forearm (already exists as forearm_perim, add alias)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'forearm_m1') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN forearm_m1 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'forearm_m2') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN forearm_m2 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'forearm_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN forearm_m3 numeric(6,2);
  END IF;

  -- Perimeters: head (already exists as head_perim, add direct columns)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'head_m1') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN head_m1 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'head_m2') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN head_m2 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'head_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN head_m3 numeric(6,2);
  END IF;

  -- Perimeters: neck (already exists as neck_perim, add direct columns)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'neck_m1') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN neck_m1 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'neck_m2') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN neck_m2 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'neck_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN neck_m3 numeric(6,2);
  END IF;

  -- Perimeters: calf_max (alias for calf_perim)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'calf_max_m1') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN calf_max_m1 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'calf_max_m2') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN calf_max_m2 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'calf_max_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN calf_max_m3 numeric(6,2);
  END IF;

  -- Diameters: bistiloid (wrist)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'bistiloid_m1') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN bistiloid_m1 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'bistiloid_m2') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN bistiloid_m2 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'bistiloid_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN bistiloid_m3 numeric(6,2);
  END IF;

  -- Diameters: bicondylar_femur
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'bicondylar_femur_m1') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN bicondylar_femur_m1 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'bicondylar_femur_m2') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN bicondylar_femur_m2 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'bicondylar_femur_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN bicondylar_femur_m3 numeric(6,2);
  END IF;

  -- Diameters: bimalleolar (ankle)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'bimalleolar_m1') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN bimalleolar_m1 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'bimalleolar_m2') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN bimalleolar_m2 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'bimalleolar_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN bimalleolar_m3 numeric(6,2);
  END IF;

  -- Diameters: bicristal (bi-iliocristal)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'bicristal_m1') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN bicristal_m1 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'bicristal_m2') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN bicristal_m2 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'bicristal_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN bicristal_m3 numeric(6,2);
  END IF;

  -- Diameters: biepicondylar_humerus
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'biepicondylar_humerus_m1') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN biepicondylar_humerus_m1 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'biepicondylar_humerus_m2') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN biepicondylar_humerus_m2 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'biepicondylar_humerus_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN biepicondylar_humerus_m3 numeric(6,2);
  END IF;

  -- Alias body_mass for weight
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'body_mass_m1') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN body_mass_m1 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'body_mass_m2') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN body_mass_m2 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'body_mass_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN body_mass_m3 numeric(6,2);
  END IF;

  -- Alias stature for height
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'stature_m1') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN stature_m1 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'stature_m2') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN stature_m2 numeric(6,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'stature_m3') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN stature_m3 numeric(6,2);
  END IF;
END $$;
