/*
  # Create Biological Passport Tokens System

  1. New Tables
    - `biological_passport_tokens` - Tokens para compartir pasaportes biológicos con satélites
      - Similar a external_planner_tokens pero para pasaportes
      - Contiene hash del token, referencias al usuario y al pasaporte
  
  2. Security
    - Enable RLS on new table
    - Only system (service role) can manage tokens
    - Tokens are hashed before storage (no plaintext)

  3. Purpose
    - Academy y otros satélites reciben un token X-Token-Passport
    - Usan ese token para obtener el pasaporte biológico del usuario
    - Similar al sistema de X-Planner-Token
*/

-- Create biological_passport_tokens table
CREATE TABLE IF NOT EXISTS biological_passport_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  biological_passport_id uuid NOT NULL REFERENCES biological_passports(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  last_used_at timestamptz,
  created_by text DEFAULT 'system'
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_biological_passport_tokens_athlete_id 
  ON biological_passport_tokens(athlete_id);

CREATE INDEX IF NOT EXISTS idx_biological_passport_tokens_passport_id 
  ON biological_passport_tokens(biological_passport_id);

CREATE INDEX IF NOT EXISTS idx_biological_passport_tokens_token_hash 
  ON biological_passport_tokens(token_hash);

-- Enable RLS
ALTER TABLE biological_passport_tokens ENABLE ROW LEVEL SECURITY;

-- Only system can manage these tokens
CREATE POLICY "Only system can read biological passport tokens"
  ON biological_passport_tokens FOR SELECT
  TO authenticated
  USING (false);

CREATE POLICY "Only system can insert biological passport tokens"
  ON biological_passport_tokens FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Only system can update biological passport tokens"
  ON biological_passport_tokens FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "Only system can delete biological passport tokens"
  ON biological_passport_tokens FOR DELETE
  TO authenticated
  USING (false);
