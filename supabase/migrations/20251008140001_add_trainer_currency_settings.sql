/*
  # Add Currency Settings for Trainers

  1. Changes
    - Add `preferred_currency` column to profiles table for trainers
    - Default currency is 'USD'
    - Supported currencies: USD, EUR, GBP, ARS, MXN

  2. Notes
    - This allows trainers to set their preferred currency for program pricing
    - Athletes will see prices in the trainer's preferred currency
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'preferred_currency'
  ) THEN
    ALTER TABLE profiles
    ADD COLUMN preferred_currency text DEFAULT 'USD'
    CHECK (preferred_currency IN ('USD', 'EUR', 'GBP', 'ARS', 'MXN', 'BRL', 'CLP', 'COP'));
  END IF;
END $$;

COMMENT ON COLUMN profiles.preferred_currency IS 'Preferred currency for trainers when setting program prices';
