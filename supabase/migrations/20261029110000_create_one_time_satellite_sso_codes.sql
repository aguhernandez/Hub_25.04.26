CREATE TABLE IF NOT EXISTS public.satellite_sso_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_host text NOT NULL,
  session_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.satellite_sso_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.satellite_sso_codes FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.satellite_sso_codes TO service_role;

CREATE INDEX IF NOT EXISTS satellite_sso_codes_expiry_idx
  ON public.satellite_sso_codes (expires_at)
  WHERE consumed_at IS NULL;

COMMENT ON TABLE public.satellite_sso_codes IS
  'Short-lived, single-use handoff codes for Hub-to-satellite authentication.';
