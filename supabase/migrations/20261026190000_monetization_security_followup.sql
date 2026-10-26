-- Monetization/security follow-up. Idempotent and safe to re-run.
-- Apply only after reviewing the production verification queries in
-- docs/security-hardening.md. No existing rows are modified by this file.

-- Never derive the initial role from user-editable raw_user_meta_data.
-- SECURITY DEFINER flows (auth-signup, admin RPCs and Stripe webhook) may still
-- set a role through their own server-side checks.
CREATE OR REPLACE FUNCTION public.has_profile_role(p_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = ANY (p_roles) AND is_active IS DISTINCT FROM false
  );
$$;
REVOKE ALL ON FUNCTION public.has_profile_role(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_profile_role(text[]) TO authenticated;

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

-- Use the computed capacity (base + purchased extra-athlete packs) everywhere.
CREATE OR REPLACE FUNCTION public.enforce_professional_team_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  coach_id uuid;
  max_count integer;
  current_count integer;
BEGIN
  SELECT t.coach_id INTO coach_id
  FROM public.teams t
  WHERE t.id = NEW.team_id;

  IF coach_id IS NULL THEN RETURN NEW; END IF;

  max_count := public.athlete_limit(coach_id);
  SELECT count(*) INTO current_count
  FROM (
    SELECT id FROM public.profiles
    WHERE role = 'athlete'
      AND (assigned_trainer_id = coach_id
        OR assigned_nutritionist_id = coach_id
        OR assigned_biomechanist_id = coach_id)
    UNION
    SELECT tm.athlete_id
    FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE t.coach_id = coach_id
  ) assigned;

  IF NOT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = NEW.team_id AND athlete_id = NEW.athlete_id
  ) AND current_count >= max_count THEN
    RAISE EXCEPTION 'Professional athlete limit reached';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_professional_assignment_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  max_count integer;
  current_count integer;
BEGIN
  IF NEW.trainer_id IS NULL THEN RETURN NEW; END IF;

  max_count := public.athlete_limit(NEW.trainer_id);
  SELECT count(*) INTO current_count
  FROM (
    SELECT id FROM public.profiles
    WHERE role = 'athlete'
      AND (assigned_trainer_id = NEW.trainer_id
        OR assigned_nutritionist_id = NEW.trainer_id
        OR assigned_biomechanist_id = NEW.trainer_id)
    UNION
    SELECT tm.athlete_id
    FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE t.coach_id = NEW.trainer_id
  ) assigned;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles a
    WHERE a.id = NEW.athlete_id
      AND (a.assigned_trainer_id = NEW.trainer_id
        OR a.assigned_nutritionist_id = NEW.trainer_id
        OR a.assigned_biomechanist_id = NEW.trainer_id)
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE tm.athlete_id = NEW.athlete_id AND t.coach_id = NEW.trainer_id
  ) AND current_count >= max_count THEN
    RAISE EXCEPTION 'Professional athlete limit reached';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_professional_assignment_capacity ON public.athlete_trainers;
CREATE TRIGGER enforce_professional_assignment_capacity
  BEFORE INSERT ON public.athlete_trainers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_professional_assignment_capacity();

-- Keep the RPC and direct team inserts on the same capacity calculation.
CREATE OR REPLACE FUNCTION public.assign_athlete_professional(
  p_athlete_id uuid, p_professional_id uuid, p_role_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  caller_role text;
  professional_is_eligible boolean;
  current_count integer;
  max_count integer;
BEGIN
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  IF auth.uid() <> p_athlete_id AND caller_role NOT IN ('admin', 'head_coach') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_role_type NOT IN ('head_coach', 'trainer', 'nutritionist', 'biomechanist') THEN
    RAISE EXCEPTION 'Invalid professional role';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_athlete_id AND role = 'athlete') THEN
    RAISE EXCEPTION 'Athlete not found';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_professional_id AND p.is_active = true
      AND (
        p.role = p_role_type
        OR (p_role_type IN ('head_coach', 'trainer') AND p.role IN ('admin', 'head_coach', 'trainer'))
        OR EXISTS (
          SELECT 1 FROM public.professional_roles pr
          WHERE pr.user_id = p.id AND pr.role = p_role_type
        )
      )
  ) INTO professional_is_eligible;
  IF NOT professional_is_eligible THEN
    RAISE EXCEPTION 'Professional is not eligible for this role';
  END IF;

  max_count := public.athlete_limit(p_professional_id);
  SELECT count(*) INTO current_count
  FROM (
    SELECT id FROM public.profiles
    WHERE role = 'athlete'
      AND (assigned_trainer_id = p_professional_id
        OR assigned_nutritionist_id = p_professional_id
        OR assigned_biomechanist_id = p_professional_id)
    UNION
    SELECT tm.athlete_id FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE t.coach_id = p_professional_id
  ) assigned;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles a WHERE a.id = p_athlete_id
      AND (a.assigned_trainer_id = p_professional_id
        OR a.assigned_nutritionist_id = p_professional_id
        OR a.assigned_biomechanist_id = p_professional_id)
  ) AND NOT EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE tm.athlete_id = p_athlete_id AND t.coach_id = p_professional_id
  ) AND current_count >= max_count THEN
    RAISE EXCEPTION 'Professional athlete limit reached';
  END IF;

  UPDATE public.athlete_trainers SET is_primary = false
  WHERE athlete_id = p_athlete_id AND role_type = p_role_type AND trainer_id <> p_professional_id;
  INSERT INTO public.athlete_trainers (athlete_id, trainer_id, role_type, is_primary)
  VALUES (p_athlete_id, p_professional_id, p_role_type, true)
  ON CONFLICT (athlete_id, trainer_id, role_type) DO UPDATE SET is_primary = true;

  IF p_role_type IN ('head_coach', 'trainer') THEN
    UPDATE public.profiles SET assigned_trainer_id = p_professional_id, updated_at = now() WHERE id = p_athlete_id;
  ELSIF p_role_type = 'nutritionist' THEN
    UPDATE public.profiles SET assigned_nutritionist_id = p_professional_id, updated_at = now() WHERE id = p_athlete_id;
  ELSE
    UPDATE public.profiles SET assigned_biomechanist_id = p_professional_id, updated_at = now() WHERE id = p_athlete_id;
  END IF;
END;
$$;

-- Replace the remaining authorization checks that accepted user-editable
-- user_metadata. Auxiliary metadata is intentionally left untouched elsewhere.
DROP POLICY IF EXISTS "Trainers and admins can view ai plans" ON public.ai_training_plans;
CREATE POLICY "Trainers and admins can view ai plans"
  ON public.ai_training_plans FOR SELECT TO authenticated
  USING (public.has_profile_role(ARRAY['admin','trainer']));

DROP POLICY IF EXISTS "Trainers and admins can view external endurance plans" ON public.external_endurance_plans;
CREATE POLICY "Trainers and admins can view external endurance plans"
  ON public.external_endurance_plans FOR SELECT TO authenticated
  USING (public.has_profile_role(ARRAY['admin','trainer']));

DROP POLICY IF EXISTS "Trainers and admins can view external nutrition plans" ON public.external_nutrition_plans;
CREATE POLICY "Trainers and admins can view external nutrition plans"
  ON public.external_nutrition_plans FOR SELECT TO authenticated
  USING (public.has_profile_role(ARRAY['admin','trainer']));

DROP POLICY IF EXISTS "Admin can view access log" ON public.external_planner_access_log;
CREATE POLICY "Admin can view access log"
  ON public.external_planner_access_log FOR SELECT TO authenticated
  USING (public.has_profile_role(ARRAY['admin']));

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

DROP POLICY IF EXISTS "Admin can update tdee_config" ON public.tdee_config;
CREATE POLICY "Admin can update tdee_config"
  ON public.tdee_config FOR UPDATE TO authenticated
  USING (public.has_profile_role(ARRAY['admin']))
  WITH CHECK (public.has_profile_role(ARRAY['admin']));

-- Remove broad professional raw diary/anamnesis reads. The status view and the
-- phase2 assignment policies remain the supported professional paths.
DROP POLICY IF EXISTS "Trainers and admins can view all sessions" ON public.food_diary_sessions;
DROP POLICY IF EXISTS "View own or assigned anamnesis" ON public.nutrition_anamnesis;

DROP POLICY IF EXISTS "Admins can view all diary sessions" ON public.food_diary_sessions;
CREATE POLICY "Admins can view all diary sessions"
  ON public.food_diary_sessions FOR SELECT TO authenticated
  USING (public.has_profile_role(ARRAY['admin']) OR athlete_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can view all anamnesis" ON public.nutrition_anamnesis;
CREATE POLICY "Admins can view all anamnesis"
  ON public.nutrition_anamnesis FOR SELECT TO authenticated
  USING (public.has_profile_role(ARRAY['admin']) OR athlete_id = (SELECT auth.uid()));

-- Rollback (manual and reviewed): restore the previous function bodies and
-- policies from migrations 20261026120000, 20261026150000 and
-- 20261026130740; then DROP TRIGGER enforce_professional_assignment_capacity.
