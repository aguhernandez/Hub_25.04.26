
-- Fix: handle_new_user was inserting into non-existent column "membership_tier"
-- The column was renamed to "membership_plan" in a previous migration.
-- This caused ALL new signups to silently fail (no profile created).

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
  v_provider := NEW.raw_app_meta_data->>'provider';

  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';

  IF v_provider = 'apple' THEN
    v_apple_user_id := COALESCE(
      NEW.raw_user_meta_data->>'provider_id',
      NEW.raw_user_meta_data->>'sub'
    );
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    apple_user_id,
    role,
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
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    apple_user_id = COALESCE(profiles.apple_user_id, EXCLUDED.apple_user_id),
    full_name     = COALESCE(NULLIF(profiles.full_name, ''), EXCLUDED.full_name),
    avatar_url    = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at    = NOW();

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;
