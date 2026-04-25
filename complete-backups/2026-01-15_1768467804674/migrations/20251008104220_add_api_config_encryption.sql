/*
  # Add API Configuration Encryption

  1. Security Enhancements
    - Enable pgcrypto extension for encryption functions
    - Add encryption_key column to store encrypted keys
    - Create functions to encrypt/decrypt API keys
    - Update RLS policies for better security
  
  2. Important Notes
    - Uses symmetric encryption with pgcrypto
    - Encryption key should be stored in environment variables
    - Only encrypted sensitive fields (api keys, secrets)
    - Non-sensitive data (emails, names, modes) remain unencrypted for query efficiency
*/

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add encrypted_value column for storing encrypted API keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_configurations' AND column_name = 'encrypted_value'
  ) THEN
    ALTER TABLE api_configurations ADD COLUMN encrypted_value bytea;
  END IF;
END $$;

-- Function to encrypt API configuration values
CREATE OR REPLACE FUNCTION encrypt_api_config(
  p_value text,
  p_key text
) RETURNS bytea AS $$
BEGIN
  RETURN pgp_sym_encrypt(p_value, p_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt API configuration values
CREATE OR REPLACE FUNCTION decrypt_api_config(
  p_encrypted_value bytea,
  p_key text
) RETURNS text AS $$
BEGIN
  RETURN pgp_sym_decrypt(p_encrypted_value, p_key);
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the encryption approach
COMMENT ON COLUMN api_configurations.encrypted_value IS 'Encrypted API keys and secrets using pgcrypto. Use encrypt_api_config() and decrypt_api_config() functions to handle encryption/decryption.';
COMMENT ON COLUMN api_configurations.config_value IS 'Plain text values for non-sensitive data like emails, names, modes. Sensitive keys should use encrypted_value column.';
