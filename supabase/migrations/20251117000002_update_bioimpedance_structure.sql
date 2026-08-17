/*
  # Update Bioimpedance Measurements Structure

  Updates bioimpedance_measurements table to match actual output from bioimpedance scales
  (InBody, Tanita, etc.). These devices provide direct measurements, not calculated anthropometry.

  ## Changes

  ### New Columns Added
  - `smm` (kg) - Skeletal Muscle Mass
  - `bfm` (kg) - Body Fat Mass
  - `body_fat_percent` (%) - Body Fat Percentage
  - `ffm` (kg) - Fat Free Mass (auto-calculated: Weight - BFM)
  - `bmr` (kcal) - Basal Metabolic Rate

  ### Segmental Analysis (Lean Mass)
  - `lean_right_arm` (kg)
  - `lean_left_arm` (kg)
  - `lean_trunk` (kg)
  - `lean_right_leg` (kg)
  - `lean_left_leg` (kg)

  ### Hydration & Tissues
  - `tbw` (L) - Total Body Water
  - `ecw` (L) - Extracellular Water
  - `ecw_tbw_ratio` - ECW/TBW Ratio (auto-calculated)
  - `dry_lean_mass` (kg)

  ## Notes
  - Old columns kept for backward compatibility
  - Auto-calculation functions updated
  - RLS policies remain unchanged
*/

-- Add new main data columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bioimpedance_measurements' AND column_name = 'smm') THEN
    ALTER TABLE bioimpedance_measurements ADD COLUMN smm numeric(6,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bioimpedance_measurements' AND column_name = 'bfm') THEN
    ALTER TABLE bioimpedance_measurements ADD COLUMN bfm numeric(6,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bioimpedance_measurements' AND column_name = 'body_fat_percent') THEN
    ALTER TABLE bioimpedance_measurements ADD COLUMN body_fat_percent numeric(5,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bioimpedance_measurements' AND column_name = 'ffm') THEN
    ALTER TABLE bioimpedance_measurements ADD COLUMN ffm numeric(6,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bioimpedance_measurements' AND column_name = 'bmr') THEN
    ALTER TABLE bioimpedance_measurements ADD COLUMN bmr numeric(6,0);
  END IF;

  -- Segmental analysis
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bioimpedance_measurements' AND column_name = 'lean_right_arm') THEN
    ALTER TABLE bioimpedance_measurements ADD COLUMN lean_right_arm numeric(6,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bioimpedance_measurements' AND column_name = 'lean_left_arm') THEN
    ALTER TABLE bioimpedance_measurements ADD COLUMN lean_left_arm numeric(6,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bioimpedance_measurements' AND column_name = 'lean_trunk') THEN
    ALTER TABLE bioimpedance_measurements ADD COLUMN lean_trunk numeric(6,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bioimpedance_measurements' AND column_name = 'lean_right_leg') THEN
    ALTER TABLE bioimpedance_measurements ADD COLUMN lean_right_leg numeric(6,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bioimpedance_measurements' AND column_name = 'lean_left_leg') THEN
    ALTER TABLE bioimpedance_measurements ADD COLUMN lean_left_leg numeric(6,2);
  END IF;

  -- Hydration
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bioimpedance_measurements' AND column_name = 'tbw') THEN
    ALTER TABLE bioimpedance_measurements ADD COLUMN tbw numeric(6,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bioimpedance_measurements' AND column_name = 'ecw') THEN
    ALTER TABLE bioimpedance_measurements ADD COLUMN ecw numeric(6,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bioimpedance_measurements' AND column_name = 'ecw_tbw_ratio') THEN
    ALTER TABLE bioimpedance_measurements ADD COLUMN ecw_tbw_ratio numeric(5,3);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bioimpedance_measurements' AND column_name = 'dry_lean_mass') THEN
    ALTER TABLE bioimpedance_measurements ADD COLUMN dry_lean_mass numeric(6,2);
  END IF;
END $$;

-- Update trigger function to include new auto-calculations
CREATE OR REPLACE FUNCTION calculate_bioimpedance_values()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-calculate FFM (Fat Free Mass) = Weight - BFM
  IF NEW.ffm IS NULL AND NEW.weight IS NOT NULL AND NEW.bfm IS NOT NULL THEN
    NEW.ffm := NEW.weight - NEW.bfm;
  END IF;

  -- Auto-calculate ECW/TBW ratio
  IF NEW.ecw_tbw_ratio IS NULL AND NEW.ecw IS NOT NULL AND NEW.tbw IS NOT NULL AND NEW.tbw > 0 THEN
    NEW.ecw_tbw_ratio := NEW.ecw / NEW.tbw;
  END IF;

  -- Keep old calculations for backward compatibility
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

  IF NEW.skin_kg IS NULL AND NEW.height IS NOT NULL THEN
    NEW.skin_kg := 0.007184 * (NEW.height ^ 0.725) * (NEW.weight ^ 0.425) * 2;
    NEW.skin_percent := (NEW.skin_kg / NEW.weight) * 100;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
