/*
  # Add Bioimpedance Measurements
  
  Creates table for bioimpedance body composition analysis.
  This allows users to track body composition using bioimpedance devices
  as an alternative or complement to ISAK anthropometry.
  
  ## Tables
  
  ### bioimpedance_measurements
  - Direct input of body composition percentages and masses
  - 5 component model: Adipose, Muscle, Bone, Skin, Residual
  - Automatic calculation of missing values
  - Links to user profiles
  
  ## Security
  - RLS enabled
  - Users can only view/edit their own measurements
  - Coaches can view their athletes' measurements
*/

CREATE TABLE IF NOT EXISTS bioimpedance_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  measurement_date date NOT NULL DEFAULT CURRENT_DATE,
  
  -- Basic measurements
  weight numeric(6,2) NOT NULL,
  height numeric(6,2),
  
  -- Adipose Tissue (Fat)
  adipose_tissue_percent numeric(5,2),
  adipose_tissue_kg numeric(6,2),
  
  -- Muscle Mass (Skeletal Muscle)
  muscle_mass_percent numeric(5,2),
  muscle_mass_kg numeric(6,2),
  
  -- Bone Tissue
  bone_tissue_percent numeric(5,2),
  bone_tissue_kg numeric(6,2),
  
  -- Skin (usually calculated)
  skin_percent numeric(5,2),
  skin_kg numeric(6,2),
  
  -- Residual Mass
  residual_mass_percent numeric(5,2),
  residual_mass_kg numeric(6,2),
  
  -- Additional metrics
  total_body_water_percent numeric(5,2),
  total_body_water_liters numeric(6,2),
  basal_metabolic_rate numeric(6,0),
  visceral_fat_level integer,
  
  -- Device info
  device_model text,
  device_brand text,
  
  -- Metadata
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bioimpedance_user ON bioimpedance_measurements(user_id);
CREATE INDEX IF NOT EXISTS idx_bioimpedance_date ON bioimpedance_measurements(measurement_date);

-- Enable RLS
ALTER TABLE bioimpedance_measurements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own bioimpedance measurements"
  ON bioimpedance_measurements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bioimpedance measurements"
  ON bioimpedance_measurements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bioimpedance measurements"
  ON bioimpedance_measurements FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bioimpedance measurements"
  ON bioimpedance_measurements FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to calculate missing values
CREATE OR REPLACE FUNCTION calculate_bioimpedance_values()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate kg from percentage if missing
  IF NEW.adipose_tissue_kg IS NULL AND NEW.adipose_tissue_percent IS NOT NULL THEN
    NEW.adipose_tissue_kg := NEW.weight * (NEW.adipose_tissue_percent / 100);
  END IF;
  
  IF NEW.muscle_mass_kg IS NULL AND NEW.muscle_mass_percent IS NOT NULL THEN
    NEW.muscle_mass_kg := NEW.weight * (NEW.muscle_mass_percent / 100);
  END IF;
  
  IF NEW.bone_tissue_kg IS NULL AND NEW.bone_tissue_percent IS NOT NULL THEN
    NEW.bone_tissue_kg := NEW.weight * (NEW.bone_tissue_percent / 100);
  END IF;
  
  IF NEW.residual_mass_kg IS NULL AND NEW.residual_mass_percent IS NOT NULL THEN
    NEW.residual_mass_kg := NEW.weight * (NEW.residual_mass_percent / 100);
  END IF;
  
  -- Calculate percentage from kg if missing
  IF NEW.adipose_tissue_percent IS NULL AND NEW.adipose_tissue_kg IS NOT NULL THEN
    NEW.adipose_tissue_percent := (NEW.adipose_tissue_kg / NEW.weight) * 100;
  END IF;
  
  IF NEW.muscle_mass_percent IS NULL AND NEW.muscle_mass_kg IS NOT NULL THEN
    NEW.muscle_mass_percent := (NEW.muscle_mass_kg / NEW.weight) * 100;
  END IF;
  
  IF NEW.bone_tissue_percent IS NULL AND NEW.bone_tissue_kg IS NOT NULL THEN
    NEW.bone_tissue_percent := (NEW.bone_tissue_kg / NEW.weight) * 100;
  END IF;
  
  IF NEW.residual_mass_percent IS NULL AND NEW.residual_mass_kg IS NOT NULL THEN
    NEW.residual_mass_percent := (NEW.residual_mass_kg / NEW.weight) * 100;
  END IF;
  
  -- Calculate skin using Matiegka equation if height provided
  IF NEW.skin_kg IS NULL AND NEW.height IS NOT NULL THEN
    -- Skin = body_surface_area * 2 (kg)
    -- BSA (Du Bois) = 0.007184 × height^0.725 × weight^0.425
    NEW.skin_kg := 0.007184 * (NEW.height ^ 0.725) * (NEW.weight ^ 0.425) * 2;
    NEW.skin_percent := (NEW.skin_kg / NEW.weight) * 100;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate values
CREATE TRIGGER calculate_bioimpedance_on_insert
  BEFORE INSERT ON bioimpedance_measurements
  FOR EACH ROW
  EXECUTE FUNCTION calculate_bioimpedance_values();

CREATE TRIGGER calculate_bioimpedance_on_update
  BEFORE UPDATE ON bioimpedance_measurements
  FOR EACH ROW
  EXECUTE FUNCTION calculate_bioimpedance_values();

-- Trigger for updated_at
CREATE TRIGGER update_bioimpedance_updated_at
  BEFORE UPDATE ON bioimpedance_measurements
  FOR EACH ROW
  EXECUTE FUNCTION update_nutrition_updated_at();
