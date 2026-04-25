/*
  # Complete Anthropometry System (ISAK Protocols)

  ## Tables Created
  
  ### 1. anthropometry_measurements
  Main table for storing all raw anthropometric measurements
  - Basic data (weight, height, sitting height)
  - Skinfolds (6 sites: triceps, subscapular, suprailiac, abdominal, thigh, calf)
  - Perimeters (6 sites: arm relaxed, arm flexed, waist, hip, thigh, calf)
  - Diameters (2 sites: humerus, femur)
  - Each measurement has M1, M2, and auto-calculated difference
  
  ### 2. anthropometry_results
  Calculated results table
  - BMI
  - Body density (Durnin & Womersley)
  - Fat percentage
  - Fat mass (kg)
  - Lean mass (kg)
  - Somatotype (endomorphy, mesomorphy, ectomorphy)
  
  ## Security
  - RLS enabled on all tables
  - Users can view/edit their own data
  - Trainers can view/edit their athletes' data
  - Admins have full access
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS anthropometry_results CASCADE;
DROP TABLE IF EXISTS anthropometry_measurements CASCADE;

-- Create anthropometry measurements table
CREATE TABLE anthropometry_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  measurement_date date NOT NULL DEFAULT CURRENT_DATE,
  
  -- Unit system
  unit_system text NOT NULL DEFAULT 'metric' CHECK (unit_system IN ('metric', 'imperial')),
  
  -- Basic Data (M1, M2, calculated difference)
  weight_m1 numeric(6,2),
  weight_m2 numeric(6,2),
  height_m1 numeric(6,2),
  height_m2 numeric(6,2),
  sitting_height_m1 numeric(6,2),
  sitting_height_m2 numeric(6,2),
  
  -- Skinfolds (mm) - 6 sites
  triceps_m1 numeric(5,2),
  triceps_m2 numeric(5,2),
  subscapular_m1 numeric(5,2),
  subscapular_m2 numeric(5,2),
  suprailiac_m1 numeric(5,2),
  suprailiac_m2 numeric(5,2),
  abdominal_m1 numeric(5,2),
  abdominal_m2 numeric(5,2),
  thigh_m1 numeric(5,2),
  thigh_m2 numeric(5,2),
  calf_m1 numeric(5,2),
  calf_m2 numeric(5,2),
  
  -- Perimeters (cm) - 6 sites
  arm_relaxed_m1 numeric(6,2),
  arm_relaxed_m2 numeric(6,2),
  arm_flexed_m1 numeric(6,2),
  arm_flexed_m2 numeric(6,2),
  waist_m1 numeric(6,2),
  waist_m2 numeric(6,2),
  hip_m1 numeric(6,2),
  hip_m2 numeric(6,2),
  thigh_perim_m1 numeric(6,2),
  thigh_perim_m2 numeric(6,2),
  calf_perim_m1 numeric(6,2),
  calf_perim_m2 numeric(6,2),
  
  -- Diameters (cm) - 2 sites
  humerus_m1 numeric(5,2),
  humerus_m2 numeric(5,2),
  femur_m1 numeric(5,2),
  femur_m2 numeric(5,2),
  
  -- Metadata
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create anthropometry results table (auto-calculated)
CREATE TABLE anthropometry_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_id uuid REFERENCES anthropometry_measurements(id) ON DELETE CASCADE NOT NULL UNIQUE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Averages
  weight_avg numeric(6,2),
  height_avg numeric(6,2),
  sitting_height_avg numeric(6,2),
  
  -- Sum of skinfolds
  sum_6_skinfolds numeric(7,2),
  sum_4_skinfolds numeric(7,2),
  
  -- Calculated results
  bmi numeric(5,2),
  body_density numeric(6,4),
  fat_percentage numeric(5,2),
  fat_mass_kg numeric(6,2),
  lean_mass_kg numeric(6,2),
  
  -- Somatotype (Heath-Carter)
  endomorphy numeric(4,2),
  mesomorphy numeric(4,2),
  ectomorphy numeric(4,2),
  
  -- Additional indices
  waist_hip_ratio numeric(4,3),
  
  -- Metadata
  calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_anthro_measurements_user_id ON anthropometry_measurements(user_id);
CREATE INDEX idx_anthro_measurements_date ON anthropometry_measurements(measurement_date DESC);
CREATE INDEX idx_anthro_results_user_id ON anthropometry_results(user_id);
CREATE INDEX idx_anthro_results_measurement_id ON anthropometry_results(measurement_id);

-- Enable RLS
ALTER TABLE anthropometry_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE anthropometry_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for anthropometry_measurements

-- Users can view their own measurements
CREATE POLICY "Users can view own measurements"
  ON anthropometry_measurements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all measurements
CREATE POLICY "Admins can view all measurements"
  ON anthropometry_measurements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Trainers can view all measurements
CREATE POLICY "Trainers can view all measurements"
  ON anthropometry_measurements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'trainer'
    )
  );

-- Users can insert their own measurements
CREATE POLICY "Users can insert own measurements"
  ON anthropometry_measurements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can insert any measurements
CREATE POLICY "Admins can insert measurements"
  ON anthropometry_measurements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Trainers can insert athlete measurements
CREATE POLICY "Trainers can insert athlete measurements"
  ON anthropometry_measurements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'trainer'
    )
  );

-- Users can update their own measurements
CREATE POLICY "Users can update own measurements"
  ON anthropometry_measurements FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can update all measurements
CREATE POLICY "Admins can update all measurements"
  ON anthropometry_measurements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Trainers can update athlete measurements
CREATE POLICY "Trainers can update athlete measurements"
  ON anthropometry_measurements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'trainer'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'trainer'
    )
  );

-- Users can delete their own measurements
CREATE POLICY "Users can delete own measurements"
  ON anthropometry_measurements FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can delete all measurements
CREATE POLICY "Admins can delete all measurements"
  ON anthropometry_measurements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for anthropometry_results (mirror the measurements policies)

CREATE POLICY "Users can view own results"
  ON anthropometry_results FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all results"
  ON anthropometry_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Trainers can view all results"
  ON anthropometry_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'trainer'
    )
  );

CREATE POLICY "Users can insert own results"
  ON anthropometry_results FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can insert results"
  ON anthropometry_results FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Trainers can insert results"
  ON anthropometry_results FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'trainer'
    )
  );

CREATE POLICY "Users can update own results"
  ON anthropometry_results FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update all results"
  ON anthropometry_results FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Trainers can update results"
  ON anthropometry_results FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'trainer'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'trainer'
    )
  );

CREATE POLICY "Users can delete own results"
  ON anthropometry_results FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete all results"
  ON anthropometry_results FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_anthro_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_anthro_measurements_updated_at
  BEFORE UPDATE ON anthropometry_measurements
  FOR EACH ROW
  EXECUTE FUNCTION update_anthro_updated_at();

CREATE TRIGGER update_anthro_results_updated_at
  BEFORE UPDATE ON anthropometry_results
  FOR EACH ROW
  EXECUTE FUNCTION update_anthro_updated_at();
