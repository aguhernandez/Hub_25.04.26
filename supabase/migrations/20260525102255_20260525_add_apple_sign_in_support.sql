/*
  # Apple Sign In Support

  ## Summary
  Adds database support for Apple Sign In / Sign In with Apple, enabling
  account linking and proper handling of Apple OAuth users.

  ## Changes

  ### profiles table
  - New column `apple_user_id` (text, unique, nullable) — stores Apple's stable
    user identifier (sub claim from Apple's identity token). Unique so we can
    look up existing users on subsequent logins even when Apple hides the email.

  ### handle_new_user trigger function (updated)
  - Detects Apple OAuth users via `raw_app_meta_data->>'provider' = 'apple'`
  - Stores `apple_user_id` from `raw_user_meta_data->>'provider_id'` (Apple sub)
  - Falls back gracefully: full_name from Apple's `name` claim if present
  - Assigns default 'athlete' role and 'inicia' membership tier, same as all
    new users.

  ## Security
  - RLS already enabled on profiles (existing policies cover this column)
  - apple_user_id is not exposed publicly via existing RLS policies
*/

-- 1. Add apple_user_id column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'apple_user_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN apple_user_id text UNIQUE;
  END IF;
END $$;

-- 2. Index for fast lookup by apple_user_id
CREATE INDEX IF NOT EXISTS idx_profiles_apple_user_id
  ON profiles (apple_user_id)
  WHERE apple_user_id IS NOT NULL;

-- 3. Update handle_new_user to support Apple OAuth
--    We replace the function body to handle Apple's identity payload.
--    Apple sends: provider='apple', provider_id=<stable sub>, name (only on first auth)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name     text;
  v_avatar_url    text;
  v_apple_user_id text;
  v_provider      text;
BEGIN
  -- Resolve provider
  v_provider := NEW.raw_app_meta_data->>'provider';

  -- Resolve display name
  -- Apple: name is only sent on the VERY first auth; subsequent logins omit it.
  -- Google: name is in raw_user_meta_data->>'full_name' or ->>'name'
  -- Email: passed via options->>'data'->>'full_name' during signUp
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Avatar (Google provides one; Apple does not)
  v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';

  -- Apple stable user identifier (sub claim)
  IF v_provider = 'apple' THEN
    v_apple_user_id := COALESCE(
      NEW.raw_user_meta_data->>'provider_id',
      NEW.raw_user_meta_data->>'sub'
    );
  END IF;

  -- Upsert profile — handles both new signups and edge cases where
  -- the trigger fires more than once for the same user.
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    apple_user_id,
    role,
    membership_tier,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_avatar_url,
    v_apple_user_id,
    'athlete',
    'inicia',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    -- Only backfill apple_user_id if not already set
    apple_user_id = COALESCE(profiles.apple_user_id, EXCLUDED.apple_user_id),
    -- Backfill name/avatar if profile was created with nulls (e.g., email signup)
    full_name     = COALESCE(NULLIF(profiles.full_name, ''), EXCLUDED.full_name),
    avatar_url    = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at    = NOW();

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Never block auth signup due to profile errors
    RETURN NEW;
END;
$$;

-- 4. Backfill apple_user_id for any existing Apple OAuth users
--    auth.users stores provider info in raw_app_meta_data
UPDATE public.profiles p
SET apple_user_id = COALESCE(
  u.raw_user_meta_data->>'provider_id',
  u.raw_user_meta_data->>'sub'
)
FROM auth.users u
WHERE u.id = p.id
  AND u.raw_app_meta_data->>'provider' = 'apple'
  AND p.apple_user_id IS NULL
  AND (
    u.raw_user_meta_data->>'provider_id' IS NOT NULL
    OR u.raw_user_meta_data->>'sub' IS NOT NULL
  );
