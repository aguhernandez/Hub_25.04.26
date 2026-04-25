/*
  # Complete Anthropometry Raw Measurements (Excel-based)

  1. New Columns Added
    - Additional skinfolds: chest, axilla (NOT in Excel raw data tab, so commented)
    - Additional perimeters: neck, chest, forearm, umbilical, thigh_medial
    - Additional diameters: biacromial, chest_transverse, chest_ap, bi_iliocristal, wrist, ankle
    - Phantom Z-scores storage
    - Age at measurement (for calculations)

  2. Notes
    - All measurements stored in metric (cm, mm, kg)
    - Phantom reference included for comparison
    - Excel uses series 1-5 with median calculation
*/

-- Add missing perimeters
DO $$
BEGIN
  -- Neck perimeter
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'neck_perim_m1') THEN
    ALTER TABLE anthropometry_measurements 
    ADD COLUMN neck_perim_m1 decimal(5,2),
    ADD COLUMN neck_perim_m2 decimal(5,2),
    ADD COLUMN neck_perim_m3 decimal(5,2);
  END IF;

  -- Chest perimeter (mesoesternal)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'chest_perim_m1') THEN
    ALTER TABLE anthropometry_measurements 
    ADD COLUMN chest_perim_m1 decimal(5,2),
    ADD COLUMN chest_perim_m2 decimal(5,2),
    ADD COLUMN chest_perim_m3 decimal(5,2);
  END IF;

  -- Forearm perimeter
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'forearm_perim_m1') THEN
    ALTER TABLE anthropometry_measurements 
    ADD COLUMN forearm_perim_m1 decimal(5,2),
    ADD COLUMN forearm_perim_m2 decimal(5,2),
    ADD COLUMN forearm_perim_m3 decimal(5,2);
  END IF;

  -- Umbilical perimeter
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'umbilical_perim_m1') THEN
    ALTER TABLE anthropometry_measurements 
    ADD COLUMN umbilical_perim_m1 decimal(5,2),
    ADD COLUMN umbilical_perim_m2 decimal(5,2),
    ADD COLUMN umbilical_perim_m3 decimal(5,2);
  END IF;

  -- Thigh medial perimeter
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'thigh_medial_perim_m1') THEN
    ALTER TABLE anthropometry_measurements 
    ADD COLUMN thigh_medial_perim_m1 decimal(5,2),
    ADD COLUMN thigh_medial_perim_m2 decimal(5,2),
    ADD COLUMN thigh_medial_perim_m3 decimal(5,2);
  END IF;

  -- Head perimeter
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'head_perim_m1') THEN
    ALTER TABLE anthropometry_measurements 
    ADD COLUMN head_perim_m1 decimal(5,2),
    ADD COLUMN head_perim_m2 decimal(5,2),
    ADD COLUMN head_perim_m3 decimal(5,2);
  END IF;
END $$;

-- Add missing diameters
DO $$
BEGIN
  -- Biacromial diameter
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'biacromial_m1') THEN
    ALTER TABLE anthropometry_measurements 
    ADD COLUMN biacromial_m1 decimal(5,2),
    ADD COLUMN biacromial_m2 decimal(5,2),
    ADD COLUMN biacromial_m3 decimal(5,2);
  END IF;

  -- Chest transverse diameter
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'chest_transverse_m1') THEN
    ALTER TABLE anthropometry_measurements 
    ADD COLUMN chest_transverse_m1 decimal(5,2),
    ADD COLUMN chest_transverse_m2 decimal(5,2),
    ADD COLUMN chest_transverse_m3 decimal(5,2);
  END IF;

  -- Chest AP diameter
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'chest_ap_m1') THEN
    ALTER TABLE anthropometry_measurements 
    ADD COLUMN chest_ap_m1 decimal(5,2),
    ADD COLUMN chest_ap_m2 decimal(5,2),
    ADD COLUMN chest_ap_m3 decimal(5,2);
  END IF;

  -- Bi-iliocristal diameter
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'bi_iliocristal_m1') THEN
    ALTER TABLE anthropometry_measurements 
    ADD COLUMN bi_iliocristal_m1 decimal(5,2),
    ADD COLUMN bi_iliocristal_m2 decimal(5,2),
    ADD COLUMN bi_iliocristal_m3 decimal(5,2);
  END IF;

  -- Wrist diameter
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'wrist_m1') THEN
    ALTER TABLE anthropometry_measurements 
    ADD COLUMN wrist_m1 decimal(5,2),
    ADD COLUMN wrist_m2 decimal(5,2),
    ADD COLUMN wrist_m3 decimal(5,2);
  END IF;

  -- Ankle diameter
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'ankle_m1') THEN
    ALTER TABLE anthropometry_measurements 
    ADD COLUMN ankle_m1 decimal(5,2),
    ADD COLUMN ankle_m2 decimal(5,2),
    ADD COLUMN ankle_m3 decimal(5,2);
  END IF;
END $$;

-- Add age at measurement (for calculations)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'age_at_measurement') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN age_at_measurement decimal(4,1);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'sex') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN sex varchar(6) CHECK (sex IN ('male', 'female'));
  END IF;

  -- Dominant limbs
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'dominant_arm') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN dominant_arm varchar(10) DEFAULT 'right' CHECK (dominant_arm IN ('left', 'right'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'dominant_leg') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN dominant_leg varchar(10) DEFAULT 'right' CHECK (dominant_leg IN ('left', 'right'));
  END IF;

  -- Measurement error percentage (from Excel)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anthropometry_measurements' AND column_name = 'measurement_error_pct') THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN measurement_error_pct decimal(4,2) DEFAULT 2.00;
  END IF;
END $$;

-- Add computed results storage (Kerr 5-component method)
CREATE TABLE IF NOT EXISTS anthropometry_kerr_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_id uuid NOT NULL REFERENCES anthropometry_measurements(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Basic computed values
  weight_median decimal(6,2),
  height_median decimal(5,2),
  sitting_height_median decimal(5,2),
  bmi decimal(5,2),
  
  -- Sum of skinfolds
  sum_6_skinfolds decimal(6,2),
  sum_8_skinfolds decimal(6,2),
  
  -- Corrected perimeters (Kerr method)
  corrected_arm_perim decimal(5,2),
  corrected_thigh_perim decimal(5,2),
  corrected_calf_perim decimal(5,2),
  corrected_chest_perim decimal(5,2),
  corrected_waist_perim decimal(5,2),
  
  -- Kerr 5-Component Body Composition (kg)
  bone_mass_kg decimal(6,3),
  muscle_mass_kg decimal(6,3),
  fat_mass_kg decimal(6,3),
  skin_mass_kg decimal(6,3),
  residual_mass_kg decimal(6,3),
  
  -- Percentages
  bone_mass_pct decimal(5,2),
  muscle_mass_pct decimal(5,2),
  fat_mass_pct decimal(5,2),
  skin_mass_pct decimal(5,2),
  residual_mass_pct decimal(5,2),
  
  -- Z-Scores (Phantom)
  z_score_adipose decimal(6,3),
  z_score_muscle decimal(6,3),
  z_score_residual decimal(6,3),
  z_score_bone_head decimal(6,3),
  z_score_bone_body decimal(6,3),
  
  -- Indices
  adiposity_index decimal(6,3),
  muscular_index decimal(6,3),
  muscle_bone_ratio decimal(6,3),
  muscle_ballast_ratio decimal(6,3),
  ballast_index decimal(6,3),
  
  -- Cross-sectional areas (cm²)
  muscle_area_arm decimal(7,2),
  adipose_area_arm decimal(7,2),
  muscle_area_forearm decimal(7,2),
  adipose_area_forearm decimal(7,2),
  residual_area_abdominal decimal(7,2),
  adipose_area_abdominal decimal(7,2),
  muscle_area_thigh decimal(7,2),
  adipose_area_thigh decimal(7,2),
  muscle_area_calf decimal(7,2),
  adipose_area_calf decimal(7,2),
  
  -- Somatotype (Heath-Carter)
  endomorphy decimal(5,2),
  mesomorphy decimal(5,2),
  ectomorphy decimal(5,2),
  
  -- Maturation index
  leg_length decimal(5,2),
  cormic_index decimal(5,3),
  age_phv decimal(4,2),
  maturation_offset decimal(5,2),
  maturation_classification varchar(20),
  
  -- Adjusted masses (Phantom reference)
  reference_bone_mass_kg decimal(6,3),
  adjusted_fat_mass_kg decimal(6,3),
  adjusted_muscle_mass_kg decimal(6,3),
  adjusted_residual_mass_kg decimal(6,3),
  adjusted_skin_mass_kg decimal(6,3),
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(measurement_id)
);

-- Enable RLS
ALTER TABLE anthropometry_kerr_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Kerr results
CREATE POLICY "Athletes view own Kerr results"
  ON anthropometry_kerr_results FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Trainers view assigned athletes Kerr results"
  ON anthropometry_kerr_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = athlete_id
      AND profiles.assigned_trainer_id = auth.uid()
    )
  );

CREATE POLICY "Admins view all Kerr results"
  ON anthropometry_kerr_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "System creates Kerr results"
  ON anthropometry_kerr_results FOR INSERT
  TO authenticated
  WITH CHECK (
    athlete_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = athlete_id
      AND profiles.assigned_trainer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Owners update Kerr results"
  ON anthropometry_kerr_results FOR UPDATE
  TO authenticated
  USING (
    athlete_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = athlete_id
      AND profiles.assigned_trainer_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_kerr_results_athlete ON anthropometry_kerr_results(athlete_id);
CREATE INDEX IF NOT EXISTS idx_kerr_results_measurement ON anthropometry_kerr_results(measurement_id);
CREATE INDEX IF NOT EXISTS idx_kerr_results_created ON anthropometry_kerr_results(created_at DESC);

-- Comments for documentation
COMMENT ON TABLE anthropometry_kerr_results IS 'Calculated body composition results using Kerr 5-component method and Phantom reference';
COMMENT ON COLUMN anthropometry_kerr_results.z_score_adipose IS 'Phantom Z-score for adipose tissue';
COMMENT ON COLUMN anthropometry_kerr_results.z_score_muscle IS 'Phantom Z-score for muscle mass';
COMMENT ON COLUMN anthropometry_kerr_results.ballast_index IS 'Ballast = (total weight - muscle) * 1000 / height²';
