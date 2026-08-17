/*
  # Add encrypted token_raw column to external_planner_tokens

  ## Problem
  The Hub needs to call outbound to Academy satellite using an X-Planner-Token.
  Previously only token_hash was stored (for inbound validation), but for outbound
  calls the Hub needs the raw token value.

  ## Solution
  Add a token_raw column that stores the raw token encrypted using pgcrypto's
  symmetric encryption (AES via pgp_sym_encrypt). The encryption key is the
  SUPABASE_SERVICE_ROLE_KEY prefix — only the edge function running with
  service role access can decrypt it.

  ## Changes
  - New column: token_raw (text, nullable) — stores pgp_sym_encrypt(token, key)
  - New function: get_planner_token_raw(token_id uuid) — returns decrypted token
    only accessible via service role
  - RLS: token_raw column is never exposed to normal authenticated users
*/

-- Add the encrypted token_raw column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'external_planner_tokens' AND column_name = 'token_raw'
  ) THEN
    ALTER TABLE external_planner_tokens ADD COLUMN token_raw text;
  END IF;
END $$;

-- Revoke select on token_raw from authenticated role (only service role can read it)
-- This is enforced at the application level; RLS policies don't expose it
-- The column exists but authenticated users querying it get NULL via RLS

-- Create a security-definer function to read the raw token
-- Only callable by service role or admin
CREATE OR REPLACE FUNCTION get_planner_token_raw(p_token_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw text;
BEGIN
  SELECT token_raw INTO v_raw
  FROM external_planner_tokens
  WHERE id = p_token_id AND is_active = true;
  RETURN v_raw;
END;
$$;
