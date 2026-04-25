/*
  # Add training_zones column to biological_passports

  ## Changes
  - Adds `training_zones` JSONB column to `biological_passports` table
  - Stores the full zone structure with both 5-zone and 7-zone sets
  - Structure: { base_method, zones5: {hr, power, rpe}, zones7: {hr, power, rpe}, default_display }
  - Legacy columns (hr_zones_json, power_zones_json, rpe_zones_json) remain for backward compatibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biological_passports' AND column_name = 'training_zones'
  ) THEN
    ALTER TABLE biological_passports ADD COLUMN training_zones jsonb DEFAULT NULL;
  END IF;
END $$;
