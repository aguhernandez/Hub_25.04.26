/*
  # Add VAM and PAM columns to biological_passports

  ## Changes
  - New columns on `biological_passports`:
    - `vam` (numeric) — Velocidad Ascensional Media in m/h
    - `pam` (numeric) — Potencia Aeróbica Máxima in W/kg
  
  Both are nullable and have no default value (optional lab metrics).
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biological_passports' AND column_name = 'vam'
  ) THEN
    ALTER TABLE biological_passports ADD COLUMN vam numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biological_passports' AND column_name = 'pam'
  ) THEN
    ALTER TABLE biological_passports ADD COLUMN pam numeric;
  END IF;
END $$;
