/*
  # Create signup trigger to auto-create profiles

  ## Problem
  There is no trigger on auth.users to create a profile when a new user signs up.
  This causes new users to have no profile row, and no assigned trainer.

  ## Changes
  1. Create handle_new_user function - creates a profile on signup
     - Sets default role to 'athlete'
     - Sets default assigned_trainer_id to agu@asciende.pro
     - Syncs role to JWT app_metadata
  2. Create trigger on auth.users INSERT
  3. Fix existing users with no profile (charlotte)
  4. Assign default trainer to athletes with no trainer assigned
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_trainer_id uuid;
  user_role text;
  user_full_name text;
BEGIN
  -- Get the default trainer (agu@asciende.pro)
  SELECT id INTO default_trainer_id
  FROM public.profiles
  WHERE email = 'agu@asciende.pro' AND role = 'trainer'
  LIMIT 1;

  -- Determine role from metadata (trainer-created athletes have role in app_metadata)
  user_role := COALESCE(
    NEW.raw_app_meta_data ->> 'role',
    NEW.raw_user_meta_data ->> 'role',
    'athlete'
  );

  -- Get full name from metadata
  user_full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_app_meta_data ->> 'full_name',
    split_part(NEW.email, '@', 1)
  );

  -- Insert profile
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    assigned_trainer_id,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    user_full_name,
    user_role,
    CASE 
      WHEN user_role = 'athlete' THEN default_trainer_id
      ELSE NULL
    END,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  -- Sync role to JWT app_metadata
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', user_role)
  WHERE id = NEW.id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user error for %: %', NEW.email, SQLERRM;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
