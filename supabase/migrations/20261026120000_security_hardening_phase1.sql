-- Security hardening phase 1 (idempotent; do not apply automatically)
-- Rollback guidance is included at the end. This migration is intentionally not executed here.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS requested_role text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_requested_role_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_requested_role_check
      CHECK (requested_role IS NULL OR requested_role IN ('trainer','nutritionist','head_coach'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.has_profile_role(p_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = ANY (p_roles)
  );
$$;

REVOKE ALL ON FUNCTION public.has_profile_role(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_profile_role(text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_profile_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_profile_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_profile_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon')
     AND NOT public.is_profile_admin()
     AND (
       NEW.role IS DISTINCT FROM OLD.role
       OR NEW.is_active IS DISTINCT FROM OLD.is_active
       OR NEW.assigned_trainer_id IS DISTINCT FROM OLD.assigned_trainer_id
       OR NEW.assigned_nutritionist_id IS DISTINCT FROM OLD.assigned_nutritionist_id
       OR NEW.requested_role IS DISTINCT FROM OLD.requested_role
       OR NEW.membership_plan IS DISTINCT FROM OLD.membership_plan
       OR NEW.membership_status IS DISTINCT FROM OLD.membership_status
       OR NEW.membership_start_date IS DISTINCT FROM OLD.membership_start_date
       OR NEW.membership_end_date IS DISTINCT FROM OLD.membership_end_date
     )
  THEN
    RAISE EXCEPTION 'Sensitive profile fields can only be changed by an approved server flow';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_sensitive_profile_columns ON public.profiles;
CREATE TRIGGER protect_sensitive_profile_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_sensitive_profile_columns();

-- Keep the legacy role trigger name, but make its authorization use profiles.role.
CREATE OR REPLACE FUNCTION public.prevent_non_admin_role_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon')
     AND NEW.role IS DISTINCT FROM OLD.role
     AND NOT public.is_profile_admin() THEN
    RAISE EXCEPTION 'Only administrators can change roles';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_non_admin_role_change ON public.profiles;

CREATE OR REPLACE FUNCTION public.admin_set_profile_role(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT public.is_profile_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_role NOT IN ('admin', 'trainer', 'athlete', 'nutritionist', 'head_coach') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  UPDATE public.profiles SET role = p_role, updated_at = now() WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_profile_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_profile_role(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_user_membership(
  p_user_id uuid,
  p_membership_plan text,
  p_membership_status text,
  p_membership_start_date timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT public.is_profile_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_membership_status NOT IN ('active', 'inactive', 'trial', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid membership status';
  END IF;

  UPDATE public.profiles
  SET membership_plan = p_membership_plan,
      membership_status = p_membership_status,
      membership_start_date = COALESCE(p_membership_start_date, membership_start_date),
      updated_at = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_membership(uuid, text, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_user_membership(uuid, text, text, timestamptz) TO authenticated;

-- Recreate authorization policies without user_metadata.
DROP POLICY IF EXISTS "Trainers and admins can view wellness checkins" ON public.wellness_checkins;
CREATE POLICY "Trainers and admins can view wellness checkins"
  ON public.wellness_checkins FOR SELECT TO authenticated
  USING (public.has_profile_role(ARRAY['admin','trainer']));

DROP POLICY IF EXISTS "Trainers and admins can view ai plans" ON public.ai_training_plans;
CREATE POLICY "Trainers and admins can view ai plans"
  ON public.ai_training_plans FOR SELECT TO authenticated
  USING (public.has_profile_role(ARRAY['admin','trainer']));

DROP POLICY IF EXISTS "Admin can view planner tokens" ON public.external_planner_tokens;
CREATE POLICY "Admin can view planner tokens"
  ON public.external_planner_tokens FOR SELECT TO authenticated
  USING (public.has_profile_role(ARRAY['admin']));

DROP POLICY IF EXISTS "Admin can insert planner tokens" ON public.external_planner_tokens;
CREATE POLICY "Admin can insert planner tokens"
  ON public.external_planner_tokens FOR INSERT TO authenticated
  WITH CHECK (public.has_profile_role(ARRAY['admin']));

DROP POLICY IF EXISTS "Admin can update planner tokens" ON public.external_planner_tokens;
CREATE POLICY "Admin can update planner tokens"
  ON public.external_planner_tokens FOR UPDATE TO authenticated
  USING (public.has_profile_role(ARRAY['admin']))
  WITH CHECK (public.has_profile_role(ARRAY['admin']));

DROP POLICY IF EXISTS "Trainers and admins can view external nutrition plans" ON public.external_nutrition_plans;
CREATE POLICY "Trainers and admins can view external nutrition plans"
  ON public.external_nutrition_plans FOR SELECT TO authenticated
  USING (public.has_profile_role(ARRAY['admin','trainer']));

DROP POLICY IF EXISTS "Trainers and admins can view external endurance plans" ON public.external_endurance_plans;
CREATE POLICY "Trainers and admins can view external endurance plans"
  ON public.external_endurance_plans FOR SELECT TO authenticated
  USING (public.has_profile_role(ARRAY['admin','trainer']));

DROP POLICY IF EXISTS "Admin can view access log" ON public.external_planner_access_log;
CREATE POLICY "Admin can view access log"
  ON public.external_planner_access_log FOR SELECT TO authenticated
  USING (public.has_profile_role(ARRAY['admin']));

-- Replace the signup trigger so user metadata never determines the effective role.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_full_name text;
  v_avatar_url text;
  v_apple_user_id text;
  v_provider text;
  v_default_trainer_id uuid := '88d0135a-0022-4ebd-b7b6-1132535da06b';
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
    id, email, full_name, avatar_url, apple_user_id, role,
    assigned_trainer_id, created_at, updated_at
  )
  VALUES (
    NEW.id, NEW.email, v_full_name, v_avatar_url, v_apple_user_id, 'athlete',
    v_default_trainer_id, now(), now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    assigned_trainer_id = COALESCE(public.profiles.assigned_trainer_id, EXCLUDED.assigned_trainer_id),
    updated_at = now();

  RETURN NEW;
EXCEPTION WHEN others THEN
  RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Remove the remaining user_metadata fallback from the complimentary-access RPCs.
CREATE OR REPLACE FUNCTION public.admin_set_complimentary_access(
  p_user_id uuid,
  p_enabled boolean,
  p_expires_at timestamptz DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT public.is_profile_admin() THEN
    RAISE EXCEPTION 'Only admins can modify complimentary access';
  END IF;
  UPDATE public.profiles
  SET complimentary_access = p_enabled,
      complimentary_access_expires_at = p_expires_at,
      complimentary_access_notes = p_notes,
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_complimentary_access(p_user_id uuid)
RETURNS TABLE (
  complimentary_access boolean,
  complimentary_access_expires_at timestamptz,
  complimentary_access_notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT public.is_profile_admin() THEN
    RAISE EXCEPTION 'Only admins can read complimentary access';
  END IF;
  RETURN QUERY
  SELECT p.complimentary_access, p.complimentary_access_expires_at, p.complimentary_access_notes
  FROM public.profiles p
  WHERE p.id = p_user_id;
END;
$$;

-- Rollback (manual, review before use):
-- DROP TRIGGER IF EXISTS protect_sensitive_profile_columns ON public.profiles;
-- DROP FUNCTION IF EXISTS public.protect_sensitive_profile_columns();
-- DROP FUNCTION IF EXISTS public.admin_set_user_membership(uuid, text, text, timestamptz);
-- DROP FUNCTION IF EXISTS public.has_profile_role(text[]);
-- DROP FUNCTION IF EXISTS public.is_profile_admin();
-- ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_requested_role_check;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS requested_role;
-- Restore the previous policies/functions from their migration definitions if rollback is required.

