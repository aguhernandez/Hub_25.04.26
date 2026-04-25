/*
  # Restructure Anthropometry with Raw Measurements + Median + Statistics

  1. Overview
    - Implements ISAK standard: 3 raw measurements → 1 median value for calculations
    - Each variable has: m1, m2, m3, median, std_dev, error_pct
    - Median (column G) is the value used in all body composition calculations
    - If only 1 measurement exists, median = that value
    - If 2-3 measurements exist, median = statistical median

  2. Structure per variable
    - `variable_m1` (first measurement)
    - `variable_m2` (second measurement, optional)
    - `variable_m3` (third measurement, optional)
    - `variable_median` (COLUMN G - value for calculations)
    - `variable_std` (standard deviation)
    - `variable_error_pct` (measurement error %)

  3. Variables included
    Basic: body_mass, stature, sitting_height
    Skinfolds (8): triceps, subscapular, biceps, iliac_crest, supraspinale, abdominal, front_thigh, medial_calf
    Girths (13): head, neck, arm_relaxed, arm_flexed, forearm, wrist, chest, waist, umbilical, hip, thigh_1cm, mid_thigh, calf_max
    Breadths (7): biacromial, biiliocristal, foot_length, transverse_chest, ap_chest_depth, humerus, femur

  4. Calculation Functions
    - auto_calculate_median(): Calculates median from m1, m2, m3
    - auto_calculate_std(): Calculates standard deviation
    - auto_calculate_error_pct(): Calculates measurement error percentage
*/

-- =====================================================
-- STEP 1: Drop old structure
-- =====================================================
DROP TABLE IF EXISTS anthropometry_measurements CASCADE;

-- =====================================================
-- STEP 2: Create new structure with raw + calculated columns
-- =====================================================
CREATE TABLE IF NOT EXISTS anthropometry_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  measurement_date timestamptz NOT NULL DEFAULT now(),
  measurement_number int NOT NULL DEFAULT 1,

  -- Athlete info
  age int,
  sex text CHECK (sex IN ('male', 'female')),

  -- ========== BASIC MEASUREMENTS (3 variables) ==========

  -- Body Mass (kg)
  body_mass_m1 numeric(6,2),
  body_mass_m2 numeric(6,2),
  body_mass_m3 numeric(6,2),
  body_mass_median numeric(6,2),
  body_mass_std numeric(6,3),
  body_mass_error_pct numeric(5,2),

  -- Stature (cm)
  stature_m1 numeric(6,2),
  stature_m2 numeric(6,2),
  stature_m3 numeric(6,2),
  stature_median numeric(6,2),
  stature_std numeric(6,3),
  stature_error_pct numeric(5,2),

  -- Sitting Height (cm)
  sitting_height_m1 numeric(6,2),
  sitting_height_m2 numeric(6,2),
  sitting_height_m3 numeric(6,2),
  sitting_height_median numeric(6,2),
  sitting_height_std numeric(6,3),
  sitting_height_error_pct numeric(5,2),

  -- ========== SKINFOLDS (mm) - 8 sites ==========

  -- Triceps
  triceps_m1 numeric(6,2),
  triceps_m2 numeric(6,2),
  triceps_m3 numeric(6,2),
  triceps_median numeric(6,2),
  triceps_std numeric(6,3),
  triceps_error_pct numeric(5,2),

  -- Subscapular
  subscapular_m1 numeric(6,2),
  subscapular_m2 numeric(6,2),
  subscapular_m3 numeric(6,2),
  subscapular_median numeric(6,2),
  subscapular_std numeric(6,3),
  subscapular_error_pct numeric(5,2),

  -- Biceps
  biceps_m1 numeric(6,2),
  biceps_m2 numeric(6,2),
  biceps_m3 numeric(6,2),
  biceps_median numeric(6,2),
  biceps_std numeric(6,3),
  biceps_error_pct numeric(5,2),

  -- Iliac Crest
  iliac_crest_m1 numeric(6,2),
  iliac_crest_m2 numeric(6,2),
  iliac_crest_m3 numeric(6,2),
  iliac_crest_median numeric(6,2),
  iliac_crest_std numeric(6,3),
  iliac_crest_error_pct numeric(5,2),

  -- Supraspinale
  supraspinale_m1 numeric(6,2),
  supraspinale_m2 numeric(6,2),
  supraspinale_m3 numeric(6,2),
  supraspinale_median numeric(6,2),
  supraspinale_std numeric(6,3),
  supraspinale_error_pct numeric(5,2),

  -- Abdominal
  abdominal_m1 numeric(6,2),
  abdominal_m2 numeric(6,2),
  abdominal_m3 numeric(6,2),
  abdominal_median numeric(6,2),
  abdominal_std numeric(6,3),
  abdominal_error_pct numeric(5,2),

  -- Front Thigh
  front_thigh_m1 numeric(6,2),
  front_thigh_m2 numeric(6,2),
  front_thigh_m3 numeric(6,2),
  front_thigh_median numeric(6,2),
  front_thigh_std numeric(6,3),
  front_thigh_error_pct numeric(5,2),

  -- Medial Calf
  medial_calf_m1 numeric(6,2),
  medial_calf_m2 numeric(6,2),
  medial_calf_m3 numeric(6,2),
  medial_calf_median numeric(6,2),
  medial_calf_std numeric(6,3),
  medial_calf_error_pct numeric(5,2),

  -- ========== GIRTHS (cm) - 13 sites ==========

  -- Head
  head_m1 numeric(6,2),
  head_m2 numeric(6,2),
  head_m3 numeric(6,2),
  head_median numeric(6,2),
  head_std numeric(6,3),
  head_error_pct numeric(5,2),

  -- Neck
  neck_m1 numeric(6,2),
  neck_m2 numeric(6,2),
  neck_m3 numeric(6,2),
  neck_median numeric(6,2),
  neck_std numeric(6,3),
  neck_error_pct numeric(5,2),

  -- Arm Relaxed
  arm_relaxed_m1 numeric(6,2),
  arm_relaxed_m2 numeric(6,2),
  arm_relaxed_m3 numeric(6,2),
  arm_relaxed_median numeric(6,2),
  arm_relaxed_std numeric(6,3),
  arm_relaxed_error_pct numeric(5,2),

  -- Arm Flexed
  arm_flexed_m1 numeric(6,2),
  arm_flexed_m2 numeric(6,2),
  arm_flexed_m3 numeric(6,2),
  arm_flexed_median numeric(6,2),
  arm_flexed_std numeric(6,3),
  arm_flexed_error_pct numeric(5,2),

  -- Forearm
  forearm_m1 numeric(6,2),
  forearm_m2 numeric(6,2),
  forearm_m3 numeric(6,2),
  forearm_median numeric(6,2),
  forearm_std numeric(6,3),
  forearm_error_pct numeric(5,2),

  -- Wrist
  wrist_m1 numeric(6,2),
  wrist_m2 numeric(6,2),
  wrist_m3 numeric(6,2),
  wrist_median numeric(6,2),
  wrist_std numeric(6,3),
  wrist_error_pct numeric(5,2),

  -- Chest
  chest_m1 numeric(6,2),
  chest_m2 numeric(6,2),
  chest_m3 numeric(6,2),
  chest_median numeric(6,2),
  chest_std numeric(6,3),
  chest_error_pct numeric(5,2),

  -- Waist
  waist_m1 numeric(6,2),
  waist_m2 numeric(6,2),
  waist_m3 numeric(6,2),
  waist_median numeric(6,2),
  waist_std numeric(6,3),
  waist_error_pct numeric(5,2),

  -- Umbilical
  umbilical_m1 numeric(6,2),
  umbilical_m2 numeric(6,2),
  umbilical_m3 numeric(6,2),
  umbilical_median numeric(6,2),
  umbilical_std numeric(6,3),
  umbilical_error_pct numeric(5,2),

  -- Hip
  hip_m1 numeric(6,2),
  hip_m2 numeric(6,2),
  hip_m3 numeric(6,2),
  hip_median numeric(6,2),
  hip_std numeric(6,3),
  hip_error_pct numeric(5,2),

  -- Thigh 1cm
  thigh_1cm_m1 numeric(6,2),
  thigh_1cm_m2 numeric(6,2),
  thigh_1cm_m3 numeric(6,2),
  thigh_1cm_median numeric(6,2),
  thigh_1cm_std numeric(6,3),
  thigh_1cm_error_pct numeric(5,2),

  -- Mid Thigh
  mid_thigh_m1 numeric(6,2),
  mid_thigh_m2 numeric(6,2),
  mid_thigh_m3 numeric(6,2),
  mid_thigh_median numeric(6,2),
  mid_thigh_std numeric(6,3),
  mid_thigh_error_pct numeric(5,2),

  -- Calf Max
  calf_max_m1 numeric(6,2),
  calf_max_m2 numeric(6,2),
  calf_max_m3 numeric(6,2),
  calf_max_median numeric(6,2),
  calf_max_std numeric(6,3),
  calf_max_error_pct numeric(5,2),

  -- ========== BREADTHS (cm) - 7 sites ==========

  -- Biacromial
  biacromial_m1 numeric(6,2),
  biacromial_m2 numeric(6,2),
  biacromial_m3 numeric(6,2),
  biacromial_median numeric(6,2),
  biacromial_std numeric(6,3),
  biacromial_error_pct numeric(5,2),

  -- Bi-iliocristal
  biiliocristal_m1 numeric(6,2),
  biiliocristal_m2 numeric(6,2),
  biiliocristal_m3 numeric(6,2),
  biiliocristal_median numeric(6,2),
  biiliocristal_std numeric(6,3),
  biiliocristal_error_pct numeric(5,2),

  -- Foot Length
  foot_length_m1 numeric(6,2),
  foot_length_m2 numeric(6,2),
  foot_length_m3 numeric(6,2),
  foot_length_median numeric(6,2),
  foot_length_std numeric(6,3),
  foot_length_error_pct numeric(5,2),

  -- Transverse Chest
  transverse_chest_m1 numeric(6,2),
  transverse_chest_m2 numeric(6,2),
  transverse_chest_m3 numeric(6,2),
  transverse_chest_median numeric(6,2),
  transverse_chest_std numeric(6,3),
  transverse_chest_error_pct numeric(5,2),

  -- AP Chest Depth
  ap_chest_depth_m1 numeric(6,2),
  ap_chest_depth_m2 numeric(6,2),
  ap_chest_depth_m3 numeric(6,2),
  ap_chest_depth_median numeric(6,2),
  ap_chest_depth_std numeric(6,3),
  ap_chest_depth_error_pct numeric(5,2),

  -- Humerus
  humerus_m1 numeric(6,2),
  humerus_m2 numeric(6,2),
  humerus_m3 numeric(6,2),
  humerus_median numeric(6,2),
  humerus_std numeric(6,3),
  humerus_error_pct numeric(5,2),

  -- Femur
  femur_m1 numeric(6,2),
  femur_m2 numeric(6,2),
  femur_m3 numeric(6,2),
  femur_median numeric(6,2),
  femur_std numeric(6,3),
  femur_error_pct numeric(5,2),

  -- Metadata
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- STEP 3: Create calculation functions
-- =====================================================

-- Function to calculate median from up to 3 values
CREATE OR REPLACE FUNCTION calculate_median(v1 numeric, v2 numeric, v3 numeric)
RETURNS numeric AS $$
DECLARE
  arr numeric[];
  cnt int;
BEGIN
  arr := ARRAY[]::numeric[];
  IF v1 IS NOT NULL THEN arr := array_append(arr, v1); END IF;
  IF v2 IS NOT NULL THEN arr := array_append(arr, v2); END IF;
  IF v3 IS NOT NULL THEN arr := array_append(arr, v3); END IF;

  cnt := array_length(arr, 1);
  IF cnt IS NULL OR cnt = 0 THEN RETURN NULL; END IF;
  IF cnt = 1 THEN RETURN arr[1]; END IF;

  arr := ARRAY(SELECT unnest(arr) ORDER BY 1);
  IF cnt = 2 THEN RETURN (arr[1] + arr[2]) / 2.0; END IF;

  RETURN arr[2];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate standard deviation
CREATE OR REPLACE FUNCTION calculate_std_dev(v1 numeric, v2 numeric, v3 numeric)
RETURNS numeric AS $$
DECLARE
  arr numeric[];
  cnt int;
  mean_val numeric;
  variance numeric;
BEGIN
  arr := ARRAY[]::numeric[];
  IF v1 IS NOT NULL THEN arr := array_append(arr, v1); END IF;
  IF v2 IS NOT NULL THEN arr := array_append(arr, v2); END IF;
  IF v3 IS NOT NULL THEN arr := array_append(arr, v3); END IF;

  cnt := array_length(arr, 1);
  IF cnt IS NULL OR cnt < 2 THEN RETURN NULL; END IF;

  mean_val := (SELECT avg(val) FROM unnest(arr) val);
  variance := (SELECT avg((val - mean_val)^2) FROM unnest(arr) val);

  RETURN sqrt(variance);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate error percentage
CREATE OR REPLACE FUNCTION calculate_error_pct(v1 numeric, v2 numeric, v3 numeric)
RETURNS numeric AS $$
DECLARE
  median_val numeric;
  std_val numeric;
BEGIN
  median_val := calculate_median(v1, v2, v3);
  std_val := calculate_std_dev(v1, v2, v3);

  IF std_val IS NULL OR median_val IS NULL OR median_val = 0 THEN
    RETURN NULL;
  END IF;

  RETURN (std_val / median_val) * 100.0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- STEP 4: Create trigger to auto-calculate median/std/error
-- =====================================================

CREATE OR REPLACE FUNCTION auto_calculate_measurement_stats()
RETURNS TRIGGER AS $$
BEGIN
  NEW.body_mass_median := calculate_median(NEW.body_mass_m1, NEW.body_mass_m2, NEW.body_mass_m3);
  NEW.body_mass_std := calculate_std_dev(NEW.body_mass_m1, NEW.body_mass_m2, NEW.body_mass_m3);
  NEW.body_mass_error_pct := calculate_error_pct(NEW.body_mass_m1, NEW.body_mass_m2, NEW.body_mass_m3);

  NEW.stature_median := calculate_median(NEW.stature_m1, NEW.stature_m2, NEW.stature_m3);
  NEW.stature_std := calculate_std_dev(NEW.stature_m1, NEW.stature_m2, NEW.stature_m3);
  NEW.stature_error_pct := calculate_error_pct(NEW.stature_m1, NEW.stature_m2, NEW.stature_m3);

  NEW.sitting_height_median := calculate_median(NEW.sitting_height_m1, NEW.sitting_height_m2, NEW.sitting_height_m3);
  NEW.sitting_height_std := calculate_std_dev(NEW.sitting_height_m1, NEW.sitting_height_m2, NEW.sitting_height_m3);
  NEW.sitting_height_error_pct := calculate_error_pct(NEW.sitting_height_m1, NEW.sitting_height_m2, NEW.sitting_height_m3);

  NEW.triceps_median := calculate_median(NEW.triceps_m1, NEW.triceps_m2, NEW.triceps_m3);
  NEW.triceps_std := calculate_std_dev(NEW.triceps_m1, NEW.triceps_m2, NEW.triceps_m3);
  NEW.triceps_error_pct := calculate_error_pct(NEW.triceps_m1, NEW.triceps_m2, NEW.triceps_m3);

  NEW.subscapular_median := calculate_median(NEW.subscapular_m1, NEW.subscapular_m2, NEW.subscapular_m3);
  NEW.subscapular_std := calculate_std_dev(NEW.subscapular_m1, NEW.subscapular_m2, NEW.subscapular_m3);
  NEW.subscapular_error_pct := calculate_error_pct(NEW.subscapular_m1, NEW.subscapular_m2, NEW.subscapular_m3);

  NEW.biceps_median := calculate_median(NEW.biceps_m1, NEW.biceps_m2, NEW.biceps_m3);
  NEW.biceps_std := calculate_std_dev(NEW.biceps_m1, NEW.biceps_m2, NEW.biceps_m3);
  NEW.biceps_error_pct := calculate_error_pct(NEW.biceps_m1, NEW.biceps_m2, NEW.biceps_m3);

  NEW.iliac_crest_median := calculate_median(NEW.iliac_crest_m1, NEW.iliac_crest_m2, NEW.iliac_crest_m3);
  NEW.iliac_crest_std := calculate_std_dev(NEW.iliac_crest_m1, NEW.iliac_crest_m2, NEW.iliac_crest_m3);
  NEW.iliac_crest_error_pct := calculate_error_pct(NEW.iliac_crest_m1, NEW.iliac_crest_m2, NEW.iliac_crest_m3);

  NEW.supraspinale_median := calculate_median(NEW.supraspinale_m1, NEW.supraspinale_m2, NEW.supraspinale_m3);
  NEW.supraspinale_std := calculate_std_dev(NEW.supraspinale_m1, NEW.supraspinale_m2, NEW.supraspinale_m3);
  NEW.supraspinale_error_pct := calculate_error_pct(NEW.supraspinale_m1, NEW.supraspinale_m2, NEW.supraspinale_m3);

  NEW.abdominal_median := calculate_median(NEW.abdominal_m1, NEW.abdominal_m2, NEW.abdominal_m3);
  NEW.abdominal_std := calculate_std_dev(NEW.abdominal_m1, NEW.abdominal_m2, NEW.abdominal_m3);
  NEW.abdominal_error_pct := calculate_error_pct(NEW.abdominal_m1, NEW.abdominal_m2, NEW.abdominal_m3);

  NEW.front_thigh_median := calculate_median(NEW.front_thigh_m1, NEW.front_thigh_m2, NEW.front_thigh_m3);
  NEW.front_thigh_std := calculate_std_dev(NEW.front_thigh_m1, NEW.front_thigh_m2, NEW.front_thigh_m3);
  NEW.front_thigh_error_pct := calculate_error_pct(NEW.front_thigh_m1, NEW.front_thigh_m2, NEW.front_thigh_m3);

  NEW.medial_calf_median := calculate_median(NEW.medial_calf_m1, NEW.medial_calf_m2, NEW.medial_calf_m3);
  NEW.medial_calf_std := calculate_std_dev(NEW.medial_calf_m1, NEW.medial_calf_m2, NEW.medial_calf_m3);
  NEW.medial_calf_error_pct := calculate_error_pct(NEW.medial_calf_m1, NEW.medial_calf_m2, NEW.medial_calf_m3);

  NEW.head_median := calculate_median(NEW.head_m1, NEW.head_m2, NEW.head_m3);
  NEW.head_std := calculate_std_dev(NEW.head_m1, NEW.head_m2, NEW.head_m3);
  NEW.head_error_pct := calculate_error_pct(NEW.head_m1, NEW.head_m2, NEW.head_m3);

  NEW.neck_median := calculate_median(NEW.neck_m1, NEW.neck_m2, NEW.neck_m3);
  NEW.neck_std := calculate_std_dev(NEW.neck_m1, NEW.neck_m2, NEW.neck_m3);
  NEW.neck_error_pct := calculate_error_pct(NEW.neck_m1, NEW.neck_m2, NEW.neck_m3);

  NEW.arm_relaxed_median := calculate_median(NEW.arm_relaxed_m1, NEW.arm_relaxed_m2, NEW.arm_relaxed_m3);
  NEW.arm_relaxed_std := calculate_std_dev(NEW.arm_relaxed_m1, NEW.arm_relaxed_m2, NEW.arm_relaxed_m3);
  NEW.arm_relaxed_error_pct := calculate_error_pct(NEW.arm_relaxed_m1, NEW.arm_relaxed_m2, NEW.arm_relaxed_m3);

  NEW.arm_flexed_median := calculate_median(NEW.arm_flexed_m1, NEW.arm_flexed_m2, NEW.arm_flexed_m3);
  NEW.arm_flexed_std := calculate_std_dev(NEW.arm_flexed_m1, NEW.arm_flexed_m2, NEW.arm_flexed_m3);
  NEW.arm_flexed_error_pct := calculate_error_pct(NEW.arm_flexed_m1, NEW.arm_flexed_m2, NEW.arm_flexed_m3);

  NEW.forearm_median := calculate_median(NEW.forearm_m1, NEW.forearm_m2, NEW.forearm_m3);
  NEW.forearm_std := calculate_std_dev(NEW.forearm_m1, NEW.forearm_m2, NEW.forearm_m3);
  NEW.forearm_error_pct := calculate_error_pct(NEW.forearm_m1, NEW.forearm_m2, NEW.forearm_m3);

  NEW.wrist_median := calculate_median(NEW.wrist_m1, NEW.wrist_m2, NEW.wrist_m3);
  NEW.wrist_std := calculate_std_dev(NEW.wrist_m1, NEW.wrist_m2, NEW.wrist_m3);
  NEW.wrist_error_pct := calculate_error_pct(NEW.wrist_m1, NEW.wrist_m2, NEW.wrist_m3);

  NEW.chest_median := calculate_median(NEW.chest_m1, NEW.chest_m2, NEW.chest_m3);
  NEW.chest_std := calculate_std_dev(NEW.chest_m1, NEW.chest_m2, NEW.chest_m3);
  NEW.chest_error_pct := calculate_error_pct(NEW.chest_m1, NEW.chest_m2, NEW.chest_m3);

  NEW.waist_median := calculate_median(NEW.waist_m1, NEW.waist_m2, NEW.waist_m3);
  NEW.waist_std := calculate_std_dev(NEW.waist_m1, NEW.waist_m2, NEW.waist_m3);
  NEW.waist_error_pct := calculate_error_pct(NEW.waist_m1, NEW.waist_m2, NEW.waist_m3);

  NEW.umbilical_median := calculate_median(NEW.umbilical_m1, NEW.umbilical_m2, NEW.umbilical_m3);
  NEW.umbilical_std := calculate_std_dev(NEW.umbilical_m1, NEW.umbilical_m2, NEW.umbilical_m3);
  NEW.umbilical_error_pct := calculate_error_pct(NEW.umbilical_m1, NEW.umbilical_m2, NEW.umbilical_m3);

  NEW.hip_median := calculate_median(NEW.hip_m1, NEW.hip_m2, NEW.hip_m3);
  NEW.hip_std := calculate_std_dev(NEW.hip_m1, NEW.hip_m2, NEW.hip_m3);
  NEW.hip_error_pct := calculate_error_pct(NEW.hip_m1, NEW.hip_m2, NEW.hip_m3);

  NEW.thigh_1cm_median := calculate_median(NEW.thigh_1cm_m1, NEW.thigh_1cm_m2, NEW.thigh_1cm_m3);
  NEW.thigh_1cm_std := calculate_std_dev(NEW.thigh_1cm_m1, NEW.thigh_1cm_m2, NEW.thigh_1cm_m3);
  NEW.thigh_1cm_error_pct := calculate_error_pct(NEW.thigh_1cm_m1, NEW.thigh_1cm_m2, NEW.thigh_1cm_m3);

  NEW.mid_thigh_median := calculate_median(NEW.mid_thigh_m1, NEW.mid_thigh_m2, NEW.mid_thigh_m3);
  NEW.mid_thigh_std := calculate_std_dev(NEW.mid_thigh_m1, NEW.mid_thigh_m2, NEW.mid_thigh_m3);
  NEW.mid_thigh_error_pct := calculate_error_pct(NEW.mid_thigh_m1, NEW.mid_thigh_m2, NEW.mid_thigh_m3);

  NEW.calf_max_median := calculate_median(NEW.calf_max_m1, NEW.calf_max_m2, NEW.calf_max_m3);
  NEW.calf_max_std := calculate_std_dev(NEW.calf_max_m1, NEW.calf_max_m2, NEW.calf_max_m3);
  NEW.calf_max_error_pct := calculate_error_pct(NEW.calf_max_m1, NEW.calf_max_m2, NEW.calf_max_m3);

  NEW.biacromial_median := calculate_median(NEW.biacromial_m1, NEW.biacromial_m2, NEW.biacromial_m3);
  NEW.biacromial_std := calculate_std_dev(NEW.biacromial_m1, NEW.biacromial_m2, NEW.biacromial_m3);
  NEW.biacromial_error_pct := calculate_error_pct(NEW.biacromial_m1, NEW.biacromial_m2, NEW.biacromial_m3);

  NEW.biiliocristal_median := calculate_median(NEW.biiliocristal_m1, NEW.biiliocristal_m2, NEW.biiliocristal_m3);
  NEW.biiliocristal_std := calculate_std_dev(NEW.biiliocristal_m1, NEW.biiliocristal_m2, NEW.biiliocristal_m3);
  NEW.biiliocristal_error_pct := calculate_error_pct(NEW.biiliocristal_m1, NEW.biiliocristal_m2, NEW.biiliocristal_m3);

  NEW.foot_length_median := calculate_median(NEW.foot_length_m1, NEW.foot_length_m2, NEW.foot_length_m3);
  NEW.foot_length_std := calculate_std_dev(NEW.foot_length_m1, NEW.foot_length_m2, NEW.foot_length_m3);
  NEW.foot_length_error_pct := calculate_error_pct(NEW.foot_length_m1, NEW.foot_length_m2, NEW.foot_length_m3);

  NEW.transverse_chest_median := calculate_median(NEW.transverse_chest_m1, NEW.transverse_chest_m2, NEW.transverse_chest_m3);
  NEW.transverse_chest_std := calculate_std_dev(NEW.transverse_chest_m1, NEW.transverse_chest_m2, NEW.transverse_chest_m3);
  NEW.transverse_chest_error_pct := calculate_error_pct(NEW.transverse_chest_m1, NEW.transverse_chest_m2, NEW.transverse_chest_m3);

  NEW.ap_chest_depth_median := calculate_median(NEW.ap_chest_depth_m1, NEW.ap_chest_depth_m2, NEW.ap_chest_depth_m3);
  NEW.ap_chest_depth_std := calculate_std_dev(NEW.ap_chest_depth_m1, NEW.ap_chest_depth_m2, NEW.ap_chest_depth_m3);
  NEW.ap_chest_depth_error_pct := calculate_error_pct(NEW.ap_chest_depth_m1, NEW.ap_chest_depth_m2, NEW.ap_chest_depth_m3);

  NEW.humerus_median := calculate_median(NEW.humerus_m1, NEW.humerus_m2, NEW.humerus_m3);
  NEW.humerus_std := calculate_std_dev(NEW.humerus_m1, NEW.humerus_m2, NEW.humerus_m3);
  NEW.humerus_error_pct := calculate_error_pct(NEW.humerus_m1, NEW.humerus_m2, NEW.humerus_m3);

  NEW.femur_median := calculate_median(NEW.femur_m1, NEW.femur_m2, NEW.femur_m3);
  NEW.femur_std := calculate_std_dev(NEW.femur_m1, NEW.femur_m2, NEW.femur_m3);
  NEW.femur_error_pct := calculate_error_pct(NEW.femur_m1, NEW.femur_m2, NEW.femur_m3);

  NEW.updated_at := now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_calculate_stats_trigger ON anthropometry_measurements;
CREATE TRIGGER auto_calculate_stats_trigger
  BEFORE INSERT OR UPDATE ON anthropometry_measurements
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_measurement_stats();

-- =====================================================
-- STEP 5: Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_anthrop_measurements_athlete_id ON anthropometry_measurements(athlete_id);
CREATE INDEX IF NOT EXISTS idx_anthrop_measurements_date ON anthropometry_measurements(measurement_date DESC);

-- =====================================================
-- STEP 6: RLS Policies
-- =====================================================
ALTER TABLE anthropometry_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes can view own measurements"
  ON anthropometry_measurements FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Athletes can insert own measurements"
  ON anthropometry_measurements FOR INSERT
  TO authenticated
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Athletes can update own measurements"
  ON anthropometry_measurements FOR UPDATE
  TO authenticated
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Athletes can delete own measurements"
  ON anthropometry_measurements FOR DELETE
  TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Trainers and admins can view all measurements"
  ON anthropometry_measurements FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'user_role') IN ('trainer', 'admin'));

CREATE POLICY "Admins can manage all measurements"
  ON anthropometry_measurements FOR ALL
  TO authenticated
  USING ((auth.jwt()->>'user_role') = 'admin')
  WITH CHECK ((auth.jwt()->>'user_role') = 'admin');
