/*
# Create TDEE Configuration System

## Purpose
Store configurable MET values per training zone (5-zone and 7-zone schemes),
NEAT factor, and default MET values for fallback calculations. This allows
adjusting caloric expenditure parameters without touching code.

## New Tables
- `tdee_config`
  - `id` (uuid, primary key)
  - `config_key` (text, unique) — identifies the config row (e.g. 'met_5zones', 'met_7zones', 'neat_factor', 'met_endurance_default', 'met_gym_default')
  - `config_value` (jsonb) — stores the actual config data (MET table object, numeric factor, etc.)
  - `description` (text) — human-readable explanation
  - `updated_at` (timestamptz)

## Security
- RLS enabled
- Authenticated users can read config
- Only admin can update config
*/

CREATE TABLE IF NOT EXISTS tdee_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text UNIQUE NOT NULL,
  config_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tdee_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read tdee_config" ON tdee_config;
CREATE POLICY "Authenticated can read tdee_config"
  ON tdee_config FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin can update tdee_config" ON tdee_config;
CREATE POLICY "Admin can update tdee_config"
  ON tdee_config FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin' OR (auth.jwt()->'user_metadata'->>'role') = 'admin')
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'admin' OR (auth.jwt()->'user_metadata'->>'role') = 'admin');

-- Seed default values
INSERT INTO tdee_config (config_key, config_value, description) VALUES
  ('met_5zones', '{"Z1": 4, "Z2": 6, "Z3": 8, "Z4": 10, "Z5": 12}'::jsonb, 'MET values for 5-zone training scheme'),
  ('met_7zones', '{"Z1": 4, "Z2": 5, "Z3": 6, "Z4": 7.5, "Z5": 9, "Z6": 10.5, "Z7": 12}'::jsonb, 'MET values for 7-zone training scheme'),
  ('neat_factor', '1.25'::jsonb, 'NEAT multiplier applied to BMR for non-training daily activity (range 1.2-1.3)'),
  ('met_endurance_default', '7'::jsonb, 'Default MET for endurance sessions without zone breakdown'),
  ('met_gym_default', '5'::jsonb, 'Default MET for gym/strength sessions')
ON CONFLICT (config_key) DO NOTHING;
