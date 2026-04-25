/*
  # Reestructuración Completa - Antropometría ISAK Level 2 (42 Variables)

  ## Objetivo
  Reconstruir completamente la tabla `anthropometry_measurements` siguiendo el protocolo 
  ISAK Level 2 con nombres canónicos en inglés para las 42 variables estándar.

  ## Estructura Nueva
  
  ### Variables Básicas (6)
  - body_mass (kg): Peso corporal
  - stature (cm): Talla/estatura
  - sitting_height (cm): Talla sentado
  - arm_span (cm): Envergadura
  - age (years): Edad
  - gender: Sexo (male/female)

  ### Pliegues Cutáneos (8) - en mm
  - triceps_skinfold
  - subscapular_skinfold
  - biceps_skinfold
  - iliac_crest_skinfold
  - supraspinale_skinfold
  - abdominal_skinfold
  - front_thigh_skinfold
  - medial_calf_skinfold

  ### Perímetros (13) - en cm
  - head_girth
  - neck_girth
  - arm_relaxed_girth
  - arm_flexed_girth
  - forearm_girth
  - wrist_girth
  - chest_girth
  - waist_girth
  - gluteal_girth
  - thigh_upper_girth
  - thigh_mid_girth
  - calf_max_girth
  - ankle_min_girth

  ### Longitudes (8) - en cm
  - acromiale_radiale_length
  - radiale_stylion_length
  - midstylion_dactylion_length
  - iliospinale_height
  - trochanterion_height
  - trochanterion_tibiale_length
  - tibiale_laterale_height
  - tibiale_mediale_sphyrion_length

  ### Diámetros/Anchuras (7) - en cm
  - biacromial_breadth
  - biiliocristal_breadth
  - foot_length
  - transverse_chest_breadth
  - ap_chest_breadth
  - humerus_breadth
  - femur_breadth

  ## Cambios de Seguridad
  - RLS policies actualizadas
  - Validaciones de rango agregadas
  - Constraint CHECK para valores críticos
*/

-- =====================================================
-- PASO 1: Backup de datos existentes (si hay)
-- =====================================================
CREATE TABLE IF NOT EXISTS anthropometry_measurements_backup AS 
SELECT * FROM anthropometry_measurements;

-- =====================================================
-- PASO 2: Drop tabla antigua
-- =====================================================
DROP TABLE IF EXISTS anthropometry_measurements CASCADE;

-- =====================================================
-- PASO 3: Crear tabla nueva con estructura ISAK
-- =====================================================
CREATE TABLE anthropometry_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  measurement_date timestamptz NOT NULL DEFAULT now(),
  measurement_method text DEFAULT 'manual',
  notes text,
  
  -- ===== BASIC (6) =====
  body_mass numeric(6,2) CHECK (body_mass > 0),
  stature numeric(6,2) CHECK (stature > 0),
  sitting_height numeric(6,2) CHECK (sitting_height >= 0),
  arm_span numeric(6,2) CHECK (arm_span >= 0),
  age integer CHECK (age > 0),
  gender text CHECK (gender IN ('male', 'female')),
  
  -- ===== SKINFOLDS in mm (8) =====
  triceps_skinfold numeric(5,2) DEFAULT 0 CHECK (triceps_skinfold >= 0),
  subscapular_skinfold numeric(5,2) DEFAULT 0 CHECK (subscapular_skinfold >= 0),
  biceps_skinfold numeric(5,2) DEFAULT 0 CHECK (biceps_skinfold >= 0),
  iliac_crest_skinfold numeric(5,2) DEFAULT 0 CHECK (iliac_crest_skinfold >= 0),
  supraspinale_skinfold numeric(5,2) DEFAULT 0 CHECK (supraspinale_skinfold >= 0),
  abdominal_skinfold numeric(5,2) DEFAULT 0 CHECK (abdominal_skinfold >= 0),
  front_thigh_skinfold numeric(5,2) DEFAULT 0 CHECK (front_thigh_skinfold >= 0),
  medial_calf_skinfold numeric(5,2) DEFAULT 0 CHECK (medial_calf_skinfold >= 0),
  
  -- ===== GIRTHS in cm (13) =====
  head_girth numeric(6,2) DEFAULT 0 CHECK (head_girth >= 0),
  neck_girth numeric(6,2) DEFAULT 0 CHECK (neck_girth >= 0),
  arm_relaxed_girth numeric(6,2) DEFAULT 0 CHECK (arm_relaxed_girth >= 0),
  arm_flexed_girth numeric(6,2) DEFAULT 0 CHECK (arm_flexed_girth >= 0),
  forearm_girth numeric(6,2) DEFAULT 0 CHECK (forearm_girth >= 0),
  wrist_girth numeric(6,2) DEFAULT 0 CHECK (wrist_girth >= 0),
  chest_girth numeric(6,2) DEFAULT 0 CHECK (chest_girth >= 0),
  waist_girth numeric(6,2) DEFAULT 0 CHECK (waist_girth >= 0),
  gluteal_girth numeric(6,2) DEFAULT 0 CHECK (gluteal_girth >= 0),
  thigh_upper_girth numeric(6,2) DEFAULT 0 CHECK (thigh_upper_girth >= 0),
  thigh_mid_girth numeric(6,2) DEFAULT 0 CHECK (thigh_mid_girth >= 0),
  calf_max_girth numeric(6,2) DEFAULT 0 CHECK (calf_max_girth >= 0),
  ankle_min_girth numeric(6,2) DEFAULT 0 CHECK (ankle_min_girth >= 0),
  
  -- ===== LENGTHS in cm (8) =====
  acromiale_radiale_length numeric(6,2) DEFAULT 0 CHECK (acromiale_radiale_length >= 0),
  radiale_stylion_length numeric(6,2) DEFAULT 0 CHECK (radiale_stylion_length >= 0),
  midstylion_dactylion_length numeric(6,2) DEFAULT 0 CHECK (midstylion_dactylion_length >= 0),
  iliospinale_height numeric(6,2) DEFAULT 0 CHECK (iliospinale_height >= 0),
  trochanterion_height numeric(6,2) DEFAULT 0 CHECK (trochanterion_height >= 0),
  trochanterion_tibiale_length numeric(6,2) DEFAULT 0 CHECK (trochanterion_tibiale_length >= 0),
  tibiale_laterale_height numeric(6,2) DEFAULT 0 CHECK (tibiale_laterale_height >= 0),
  tibiale_mediale_sphyrion_length numeric(6,2) DEFAULT 0 CHECK (tibiale_mediale_sphyrion_length >= 0),
  
  -- ===== BREADTHS in cm (7) =====
  biacromial_breadth numeric(6,2) DEFAULT 0 CHECK (biacromial_breadth >= 0),
  biiliocristal_breadth numeric(6,2) DEFAULT 0 CHECK (biiliocristal_breadth >= 0),
  foot_length numeric(6,2) DEFAULT 0 CHECK (foot_length >= 0),
  transverse_chest_breadth numeric(6,2) DEFAULT 0 CHECK (transverse_chest_breadth >= 0),
  ap_chest_breadth numeric(6,2) DEFAULT 0 CHECK (ap_chest_breadth >= 0),
  humerus_breadth numeric(6,2) DEFAULT 0 CHECK (humerus_breadth >= 0),
  femur_breadth numeric(6,2) DEFAULT 0 CHECK (femur_breadth >= 0),
  
  -- ===== METADATA =====
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- PASO 4: Indexes para rendimiento
-- =====================================================
CREATE INDEX idx_anthro_measurements_athlete ON anthropometry_measurements(athlete_id);
CREATE INDEX idx_anthro_measurements_date ON anthropometry_measurements(measurement_date DESC);
CREATE INDEX idx_anthro_measurements_athlete_date ON anthropometry_measurements(athlete_id, measurement_date DESC);

-- =====================================================
-- PASO 5: RLS Policies
-- =====================================================
ALTER TABLE anthropometry_measurements ENABLE ROW LEVEL SECURITY;

-- Athletes can view their own measurements
CREATE POLICY "Athletes can view own measurements"
  ON anthropometry_measurements
  FOR SELECT
  TO authenticated
  USING (
    athlete_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'trainer')
    )
  );

-- Athletes can insert their own measurements
CREATE POLICY "Athletes can insert own measurements"
  ON anthropometry_measurements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    athlete_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'trainer')
    )
  );

-- Athletes can update their own measurements
CREATE POLICY "Athletes can update own measurements"
  ON anthropometry_measurements
  FOR UPDATE
  TO authenticated
  USING (
    athlete_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'trainer')
    )
  )
  WITH CHECK (
    athlete_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'trainer')
    )
  );

-- Athletes can delete their own measurements
CREATE POLICY "Athletes can delete own measurements"
  ON anthropometry_measurements
  FOR DELETE
  TO authenticated
  USING (
    athlete_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'trainer')
    )
  );

-- =====================================================
-- PASO 6: Trigger para updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_anthropometry_measurements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_anthropometry_measurements_updated_at
  BEFORE UPDATE ON anthropometry_measurements
  FOR EACH ROW
  EXECUTE FUNCTION update_anthropometry_measurements_updated_at();

-- =====================================================
-- PASO 7: Comentarios para documentación
-- =====================================================
COMMENT ON TABLE anthropometry_measurements IS 'ISAK Level 2 anthropometry measurements with 42 standard variables';
COMMENT ON COLUMN anthropometry_measurements.body_mass IS 'Body mass in kg';
COMMENT ON COLUMN anthropometry_measurements.stature IS 'Standing height in cm';
COMMENT ON COLUMN anthropometry_measurements.gender IS 'Biological sex: male or female';
