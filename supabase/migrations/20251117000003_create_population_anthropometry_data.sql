/*
  # Create Population Anthropometry Data Table

  This table stores aggregated anthropometric results from population studies.
  Admin users can input final results (means ± SD) for reference populations.

  ## Purpose
  - Store normative data from research studies
  - Provide reference values for comparison
  - Admin-only data entry

  ## Table: population_anthropometry_data

  ### Study Metadata
  - sport: Sport/activity of the population
  - sex: Male, Female, or Mixed
  - age_range: Age range of subjects (e.g., "18-25")
  - level: Athletic level (Elite, Sub-Elite, Amateur, Recreational)
  - sample_size: Number of subjects (N)
  - study_reference: Citation or reference

  ### Anthropometric Results (mean ± SD)
  Each measurement has:
  - _mean: Average value
  - _sd: Standard deviation

  ## Security
  - Admin-only write access
  - Public read access for reference data
*/

CREATE TABLE IF NOT EXISTS population_anthropometry_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,

  -- Study metadata
  sport text NOT NULL,
  sex text NOT NULL CHECK (sex IN ('male', 'female', 'mixed')),
  age_range text NOT NULL,
  level text NOT NULL CHECK (level IN ('elite', 'sub_elite', 'amateur', 'recreational')),
  sample_size integer NOT NULL CHECK (sample_size > 0),
  country text,
  study_reference text,
  year integer,
  notes text,

  -- Basic measurements
  weight_mean numeric(6,2),
  weight_sd numeric(6,2),
  height_mean numeric(6,2),
  height_sd numeric(6,2),

  -- Body composition percentages
  adipose_percent_mean numeric(5,2),
  adipose_percent_sd numeric(5,2),
  muscle_percent_mean numeric(5,2),
  muscle_percent_sd numeric(5,2),
  bone_percent_mean numeric(5,2),
  bone_percent_sd numeric(5,2),
  residual_percent_mean numeric(5,2),
  residual_percent_sd numeric(5,2),
  skin_percent_mean numeric(5,2),
  skin_percent_sd numeric(5,2),

  -- Body composition masses (kg)
  adipose_kg_mean numeric(6,2),
  adipose_kg_sd numeric(6,2),
  muscle_kg_mean numeric(6,2),
  muscle_kg_sd numeric(6,2),
  bone_kg_mean numeric(6,2),
  bone_kg_sd numeric(6,2),
  residual_kg_mean numeric(6,2),
  residual_kg_sd numeric(6,2),
  skin_kg_mean numeric(6,2),
  skin_kg_sd numeric(6,2),

  -- Indices
  muscle_bone_index_mean numeric(5,2),
  muscle_bone_index_sd numeric(5,2),
  bmi_mean numeric(5,2),
  bmi_sd numeric(5,2),

  -- Skinfolds (mm)
  sum_6_skinfolds_mean numeric(6,2),
  sum_6_skinfolds_sd numeric(6,2),
  sum_8_skinfolds_mean numeric(6,2),
  sum_8_skinfolds_sd numeric(6,2),

  triceps_mean numeric(5,2),
  triceps_sd numeric(5,2),
  subscapular_mean numeric(5,2),
  subscapular_sd numeric(5,2),
  supraspinale_mean numeric(5,2),
  supraspinale_sd numeric(5,2),
  abdominal_mean numeric(5,2),
  abdominal_sd numeric(5,2),
  thigh_mean numeric(5,2),
  thigh_sd numeric(5,2),
  calf_mean numeric(5,2),
  calf_sd numeric(5,2),
  biceps_mean numeric(5,2),
  biceps_sd numeric(5,2),
  iliac_crest_mean numeric(5,2),
  iliac_crest_sd numeric(5,2),

  -- Girths/Circumferences (cm)
  arm_flexed_mean numeric(5,2),
  arm_flexed_sd numeric(5,2),
  arm_relaxed_mean numeric(5,2),
  arm_relaxed_sd numeric(5,2),
  forearm_mean numeric(5,2),
  forearm_sd numeric(5,2),
  chest_mean numeric(5,2),
  chest_sd numeric(5,2),
  waist_mean numeric(5,2),
  waist_sd numeric(5,2),
  hip_mean numeric(5,2),
  hip_sd numeric(5,2),
  thigh_girth_mean numeric(5,2),
  thigh_girth_sd numeric(5,2),
  calf_girth_mean numeric(5,2),
  calf_girth_sd numeric(5,2),

  -- Breadths (cm)
  humerus_breadth_mean numeric(5,2),
  humerus_breadth_sd numeric(5,2),
  femur_breadth_mean numeric(5,2),
  femur_breadth_sd numeric(5,2),

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_population_anthropometry_sport ON population_anthropometry_data(sport);
CREATE INDEX IF NOT EXISTS idx_population_anthropometry_sex ON population_anthropometry_data(sex);
CREATE INDEX IF NOT EXISTS idx_population_anthropometry_level ON population_anthropometry_data(level);
CREATE INDEX IF NOT EXISTS idx_population_anthropometry_created_by ON population_anthropometry_data(created_by);

-- Enable RLS
ALTER TABLE population_anthropometry_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Read access for all authenticated users (reference data)
CREATE POLICY "Authenticated users can view population data"
  ON population_anthropometry_data FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert population data"
  ON population_anthropometry_data FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can update
CREATE POLICY "Admins can update population data"
  ON population_anthropometry_data FOR UPDATE
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

-- Only admins can delete
CREATE POLICY "Admins can delete population data"
  ON population_anthropometry_data FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_population_anthropometry_updated_at
  BEFORE UPDATE ON population_anthropometry_data
  FOR EACH ROW
  EXECUTE FUNCTION update_nutrition_updated_at();
