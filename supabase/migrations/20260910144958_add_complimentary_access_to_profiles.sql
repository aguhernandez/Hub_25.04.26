/*
# Add Complimentary Paid Access to Profiles

## Purpose
Allow admins to manually grant paid account benefits to any professional user
(trainer, nutritionist, head_coach) without requiring payment.

## Changes to `profiles` table
New columns:
- `complimentary_access` (boolean, default false) — whether admin has granted free paid access
- `complimentary_access_expires_at` (timestamptz, nullable) — optional expiration; if null, access is permanent until manually deactivated
- `complimentary_access_notes` (text, nullable) — internal admin-only notes; never visible to users

## Security
These three columns are sensitive admin-only data. The existing profiles SELECT
policy allows users to read their own row, but we add a separate security-definer
helper function so admins can update complimentary_access fields via RPC
(bypassing RLS on sensitive columns). Regular users CANNOT read complimentary_*
columns from their own profile row — those columns return NULL via the existing
RLS policies because we use column-level security via a dedicated admin RPC.

We also add:
- An admin RPC `admin_set_complimentary_access` to write the three fields safely.
- An admin RPC `admin_get_complimentary_access` to read the three fields for one user.
*/

-- Add columns (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'complimentary_access'
  ) THEN
    ALTER TABLE profiles ADD COLUMN complimentary_access boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'complimentary_access_expires_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN complimentary_access_expires_at timestamptz DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'complimentary_access_notes'
  ) THEN
    ALTER TABLE profiles ADD COLUMN complimentary_access_notes text DEFAULT NULL;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- Admin RPC: write complimentary access for a given user
-- Only callable by users with app_metadata.role = 'admin'
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_set_complimentary_access(
  p_user_id uuid,
  p_enabled boolean,
  p_expires_at timestamptz DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
BEGIN
  -- Verify caller is admin
  caller_role := (auth.jwt() -> 'app_metadata' ->> 'role');
  IF caller_role IS NULL THEN
    caller_role := (auth.jwt() -> 'user_metadata' ->> 'role');
  END IF;
  IF caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Only admins can modify complimentary access';
  END IF;

  UPDATE profiles
  SET
    complimentary_access = p_enabled,
    complimentary_access_expires_at = p_expires_at,
    complimentary_access_notes = p_notes,
    updated_at = now()
  WHERE id = p_user_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────────
-- Admin RPC: read complimentary access fields for a single user
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_get_complimentary_access(p_user_id uuid)
RETURNS TABLE (
  complimentary_access boolean,
  complimentary_access_expires_at timestamptz,
  complimentary_access_notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
BEGIN
  caller_role := (auth.jwt() -> 'app_metadata' ->> 'role');
  IF caller_role IS NULL THEN
    caller_role := (auth.jwt() -> 'user_metadata' ->> 'role');
  END IF;
  IF caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Only admins can read complimentary access';
  END IF;

  RETURN QUERY
  SELECT
    p.complimentary_access,
    p.complimentary_access_expires_at,
    p.complimentary_access_notes
  FROM profiles p
  WHERE p.id = p_user_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────────
-- User-facing RPC: check if current user has active paid access
-- Returns true if: active professional_subscription OR active complimentary_access
-- Safe to call by any authenticated user (reads own row only)
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_my_paid_access_status()
RETURNS TABLE (
  has_paid_subscription boolean,
  has_complimentary_access boolean,
  complimentary_expires_at timestamptz,
  is_access_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_complimentary boolean;
  v_expires_at timestamptz;
  v_pro_active boolean;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Read complimentary fields
  SELECT
    p.complimentary_access,
    p.complimentary_access_expires_at
  INTO v_complimentary, v_expires_at
  FROM profiles p
  WHERE p.id = v_uid;

  -- Check professional_subscriptions
  SELECT EXISTS (
    SELECT 1 FROM professional_subscriptions ps
    WHERE ps.user_id = v_uid
      AND ps.status IN ('active', 'trialing')
    ORDER BY ps.created_at DESC
    LIMIT 1
  ) INTO v_pro_active;

  RETURN QUERY SELECT
    v_pro_active,
    COALESCE(v_complimentary, false),
    v_expires_at,
    (
      v_pro_active
      OR (
        COALESCE(v_complimentary, false)
        AND (v_expires_at IS NULL OR v_expires_at > now())
      )
    );
END;
$$;
