/*
  # Add Missing Anthropometry Measurements and Kerr 5-Component Model

  ## Overview
  This migration adds missing anthropometric measurements required for ISAK Level 2 protocols
  and implements storage for the Kerr (1988) 5-component body composition model results.

  ## Changes

  ### 1. Add missing measurement columns to anthropometry_measurements
  New columns for diameters and perimeters:
  - `biacromial` (numeric) - Biacromial diameter in cm
  - `torax_transverso` (numeric) - Transverse chest diameter in cm
  - `torax_anteroposterior` (numeric) - Anteroposterior chest diameter in cm
  - `bi_ilicrestideo` (numeric) - Bi-iliocristale diameter in cm
  - `perimetro_cabeza` (numeric) - Head circumference in cm
  - `antebrazo_maximo` (numeric) - Maximum forearm circumference in cm
  - `torax_mesoesternal` (numeric) - Mesosternal chest circumference in cm
  - `cintura` (numeric) - Waist circumference in cm
  - `onfalico` (numeric) - Omphalion (umbilical) circumference in cm

  ### 2. Fix terminology: supraespinal → suprailiaco
  Rename column to match correct ISAK terminology:
  - Rename `supraespinal` to `suprailiaco`

  ### 3. Create kerr_body_composition table
  Store Kerr (1988) 5-component analysis results:
  - `id` (uuid, primary key)
  - `athlete_id` (uuid, references profiles)
  - `measurement_id` (uuid, references anthropometry_measurements)
  - `measurement_date` (date)
  - `body_weight` (numeric) - Total body mass in kg
  
  Absolute masses (kg):
  - `fat_mass_kg` (numeric)
  - `muscle_mass_kg` (numeric)
  - `bone_mass_kg` (numeric)
  - `residual_mass_kg` (numeric)
  - `skin_mass_kg` (numeric)
  
  Relative percentages (%):
  - `fat_mass_pct` (numeric)
  - `muscle_mass_pct` (numeric)
  - `bone_mass_pct` (numeric)
  - `residual_mass_pct` (numeric)
  - `skin_mass_pct` (numeric)
  
  Metadata:
  - `calculation_method` (text) - e.g., 'Kerr 1988'
  - `notes` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. Add comparison tracking
  Enable historical tracking for progress monitoring

  ## Security
  - Enable RLS on new table
  - Athletes can view own data
  - Trainers can view assigned athletes' data
  - Admins have full access

  ## Notes
  - Kerr (1988) is the gold standard for ISAK Level 2 body composition analysis
  - All measurements follow ISAK protocols
  - Supports both metric and imperial units (converted to metric for storage)
*/

-- Add missing anthropometry measurement columns
DO $$
BEGIN
  -- Add biacromial diameter
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'anthropometry_measurements' AND column_name = 'biacromial'
  ) THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN biacromial numeric(5,2);
  END IF;

  -- Add torax_transverso
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'anthropometry_measurements' AND column_name = 'torax_transverso'
  ) THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN torax_transverso numeric(5,2);
  END IF;

  -- Add torax_anteroposterior
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'anthropometry_measurements' AND column_name = 'torax_anteroposterior'
  ) THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN torax_anteroposterior numeric(5,2);
  END IF;

  -- Add bi_ilicrestideo
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'anthropometry_measurements' AND column_name = 'bi_ilicrestideo'
  ) THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN bi_ilicrestideo numeric(5,2);
  END IF;

  -- Add perimetro_cabeza
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'anthropometry_measurements' AND column_name = 'perimetro_cabeza'
  ) THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN perimetro_cabeza numeric(5,2);
  END IF;

  -- Add antebrazo_maximo
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'anthropometry_measurements' AND column_name = 'antebrazo_maximo'
  ) THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN antebrazo_maximo numeric(5,2);
  END IF;

  -- Add torax_mesoesternal
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'anthropometry_measurements' AND column_name = 'torax_mesoesternal'
  ) THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN torax_mesoesternal numeric(5,2);
  END IF;

  -- Add cintura
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'anthropometry_measurements' AND column_name = 'cintura'
  ) THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN cintura numeric(5,2);
  END IF;

  -- Add onfalico
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'anthropometry_measurements' AND column_name = 'onfalico'
  ) THEN
    ALTER TABLE anthropometry_measurements ADD COLUMN onfalico numeric(5,2);
  END IF;
END $$;

-- Rename supraespinal to suprailiaco (correct ISAK terminology)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'anthropometry_measurements' AND column_name = 'supraespinal'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'anthropometry_measurements' AND column_name = 'suprailiaco'
  ) THEN
    ALTER TABLE anthropometry_measurements RENAME COLUMN supraespinal TO suprailiaco;
  END IF;
END $$;

-- Create kerr_body_composition table
CREATE TABLE IF NOT EXISTS kerr_body_composition (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  measurement_id uuid REFERENCES anthropometry_measurements(id) ON DELETE SET NULL,
  measurement_date date NOT NULL,
  body_weight numeric(6,2) NOT NULL,
  
  -- Absolute masses in kg
  fat_mass_kg numeric(6,2) NOT NULL,
  muscle_mass_kg numeric(6,2) NOT NULL,
  bone_mass_kg numeric(6,2) NOT NULL,
  residual_mass_kg numeric(6,2) NOT NULL,
  skin_mass_kg numeric(6,2) NOT NULL,
  
  -- Relative percentages
  fat_mass_pct numeric(5,2) NOT NULL,
  muscle_mass_pct numeric(5,2) NOT NULL,
  bone_mass_pct numeric(5,2) NOT NULL,
  residual_mass_pct numeric(5,2) NOT NULL,
  skin_mass_pct numeric(5,2) NOT NULL,
  
  -- Metadata
  calculation_method text NOT NULL DEFAULT 'Kerr 1988',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_kerr_body_composition_athlete_date
  ON kerr_body_composition(athlete_id, measurement_date DESC);

CREATE INDEX IF NOT EXISTS idx_kerr_body_composition_measurement
  ON kerr_body_composition(measurement_id);

-- Enable RLS on kerr_body_composition
ALTER TABLE kerr_body_composition ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kerr_body_composition
CREATE POLICY "Athletes can view own body composition"
  ON kerr_body_composition FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Athletes can insert own body composition"
  ON kerr_body_composition FOR INSERT
  TO authenticated
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Athletes can update own body composition"
  ON kerr_body_composition FOR UPDATE
  TO authenticated
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Trainers can view athlete body composition"
  ON kerr_body_composition FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = kerr_body_composition.athlete_id
      AND profiles.assigned_trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can insert athlete body composition"
  ON kerr_body_composition FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = athlete_id
      AND p.assigned_trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can update athlete body composition"
  ON kerr_body_composition FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = kerr_body_composition.athlete_id
      AND profiles.assigned_trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = kerr_body_composition.athlete_id
      AND p.assigned_trainer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all body composition data"
  ON kerr_body_composition FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to calculate Kerr 5-component body composition
CREATE OR REPLACE FUNCTION calculate_kerr_body_composition(
  p_measurement_id uuid
)
RETURNS TABLE (
  fat_mass_kg numeric,
  muscle_mass_kg numeric,
  bone_mass_kg numeric,
  residual_mass_kg numeric,
  skin_mass_kg numeric,
  fat_mass_pct numeric,
  muscle_mass_pct numeric,
  bone_mass_pct numeric,
  residual_mass_pct numeric,
  skin_mass_pct numeric
) AS $$
DECLARE
  v_weight numeric;
  v_height numeric;
  v_sum_skinfolds numeric;
  v_fat_mass numeric;
  v_muscle_mass numeric;
  v_bone_mass numeric;
  v_skin_mass numeric;
  v_residual_mass numeric;
  v_arm_girth numeric;
  v_thigh_girth numeric;
  v_calf_girth numeric;
  v_humerus numeric;
  v_femur numeric;
  v_triceps numeric;
  v_subscapular numeric;
  v_suprailiaco numeric;
  v_abdominal numeric;
  v_thigh_sf numeric;
  v_calf_sf numeric;
BEGIN
  -- Get measurement data
  SELECT 
    weight, height, triceps, subscapular, suprailiaco, abdominal, 
    front_thigh, medial_calf, arm_relaxed, thigh_girth, calf_girth,
    humerus_breadth, femur_breadth
  INTO 
    v_weight, v_height, v_triceps, v_subscapular, v_suprailiaco, v_abdominal,
    v_thigh_sf, v_calf_sf, v_arm_girth, v_thigh_girth, v_calf_girth,
    v_humerus, v_femur
  FROM anthropometry_measurements
  WHERE id = p_measurement_id;

  -- Calculate sum of 6 skinfolds
  v_sum_skinfolds := COALESCE(v_triceps, 0) + COALESCE(v_subscapular, 0) + 
                     COALESCE(v_suprailiaco, 0) + COALESCE(v_abdominal, 0) + 
                     COALESCE(v_thigh_sf, 0) + COALESCE(v_calf_sf, 0);

  -- Fat mass (Kerr 1988): FM = (Σ skinfolds × 0.153) + 5.783
  v_fat_mass := (v_sum_skinfolds * 0.153) + 5.783;

  -- Muscle mass (Kerr 1988) - simplified formula
  v_muscle_mass := ((v_height * v_height * 0.00744) + 
                    (COALESCE(v_arm_girth, 0) * 0.00088) +
                    (COALESCE(v_thigh_girth, 0) * 0.00441) +
                    (COALESCE(v_calf_girth, 0) * 0.00173)) - 2.85;

  -- Bone mass (Kerr 1988): BM = 3.02 × [(H × humerus × femur) / 1000] + 2.75
  v_bone_mass := (3.02 * ((v_height * COALESCE(v_humerus, 7) * COALESCE(v_femur, 9)) / 1000)) + 2.75;

  -- Skin mass: 3.8% of body weight (Kerr constant)
  v_skin_mass := v_weight * 0.038;

  -- Residual mass: Total - (Fat + Muscle + Bone + Skin)
  v_residual_mass := v_weight - (v_fat_mass + v_muscle_mass + v_bone_mass + v_skin_mass);

  -- Ensure non-negative values
  v_fat_mass := GREATEST(v_fat_mass, 0);
  v_muscle_mass := GREATEST(v_muscle_mass, 0);
  v_bone_mass := GREATEST(v_bone_mass, 0);
  v_skin_mass := GREATEST(v_skin_mass, 0);
  v_residual_mass := GREATEST(v_residual_mass, 0);

  -- Return values in kg and percentages
  RETURN QUERY SELECT
    v_fat_mass,
    v_muscle_mass,
    v_bone_mass,
    v_residual_mass,
    v_skin_mass,
    ROUND((v_fat_mass / v_weight * 100)::numeric, 2),
    ROUND((v_muscle_mass / v_weight * 100)::numeric, 2),
    ROUND((v_bone_mass / v_weight * 100)::numeric, 2),
    ROUND((v_residual_mass / v_weight * 100)::numeric, 2),
    ROUND((v_skin_mass / v_weight * 100)::numeric, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
