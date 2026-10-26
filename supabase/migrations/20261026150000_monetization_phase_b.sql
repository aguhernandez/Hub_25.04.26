-- Monetization phase B (idempotent, additive).
-- This file is intentionally not applied automatically.
-- Rollback is commented at the end; review dependencies before using it.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS assigned_biomechanist_id uuid REFERENCES public.profiles(id);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS requested_role text;

CREATE OR REPLACE FUNCTION public.is_profile_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$ SELECT EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin' AND is_active = true
); $$;
REVOKE ALL ON FUNCTION public.is_profile_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_profile_admin() TO authenticated;

CREATE INDEX IF NOT EXISTS idx_profiles_assigned_biomechanist
  ON public.profiles(assigned_biomechanist_id);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (
    role IN ('admin', 'trainer', 'athlete', 'nutritionist', 'head_coach', 'biomechanist')
  );

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_requested_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_requested_role_check CHECK (
    requested_role IS NULL OR requested_role IN ('trainer', 'nutritionist', 'head_coach', 'biomechanist')
  );

-- Extend the existing profile protection trigger to cover biomechanist assignment.
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_columns()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon')
     AND NOT public.is_profile_admin()
     AND (
       NEW.role IS DISTINCT FROM OLD.role
       OR NEW.is_active IS DISTINCT FROM OLD.is_active
       OR NEW.assigned_trainer_id IS DISTINCT FROM OLD.assigned_trainer_id
       OR NEW.assigned_nutritionist_id IS DISTINCT FROM OLD.assigned_nutritionist_id
       OR NEW.assigned_biomechanist_id IS DISTINCT FROM OLD.assigned_biomechanist_id
       OR NEW.requested_role IS DISTINCT FROM OLD.requested_role
       OR NEW.membership_plan IS DISTINCT FROM OLD.membership_plan
       OR NEW.membership_status IS DISTINCT FROM OLD.membership_status
       OR NEW.membership_start_date IS DISTINCT FROM OLD.membership_start_date
       OR NEW.membership_end_date IS DISTINCT FROM OLD.membership_end_date
     ) THEN
    RAISE EXCEPTION 'Sensitive profile fields can only be changed by an approved server flow';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.professional_role_requests (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('trainer', 'nutritionist', 'head_coach', 'biomechanist')),
  source text NOT NULL DEFAULT 'signup',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.professional_roles (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('trainer', 'nutritionist', 'head_coach', 'biomechanist')),
  source text NOT NULL CHECK (source IN ('stripe', 'stripe_legacy', 'admin', 'complimentary')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

ALTER TABLE public.professional_role_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS professional_role_requests_own_or_admin ON public.professional_role_requests;
CREATE POLICY professional_role_requests_own_or_admin ON public.professional_role_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_profile_admin());

DROP POLICY IF EXISTS professional_roles_own_or_admin ON public.professional_roles;
CREATE POLICY professional_roles_own_or_admin ON public.professional_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_profile_admin());

CREATE OR REPLACE FUNCTION public.professional_access_active(p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.professional_subscriptions ps
    WHERE ps.user_id = p_user_id AND ps.status IN ('active', 'trialing')
  ) OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_user_id
      AND p.complimentary_access = true
      AND (p.complimentary_access_expires_at IS NULL OR p.complimentary_access_expires_at > now())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_enabled_professional(p_user_id uuid, p_role text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
  SELECT public.professional_access_active(p_user_id)
    AND EXISTS (
      SELECT 1 FROM public.professional_roles pr
      WHERE pr.user_id = p_user_id AND pr.role = p_role
    );
$$;

CREATE OR REPLACE FUNCTION public.has_active_professional_access(p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$ SELECT public.professional_access_active(p_user_id); $$;

CREATE OR REPLACE FUNCTION public.effective_professional_roles(p_user_id uuid)
RETURNS TABLE (role text, source text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
  SELECT pr.role, pr.source
  FROM public.professional_roles pr
  WHERE pr.user_id = p_user_id
    AND public.professional_access_active(p_user_id)
  UNION
  SELECT 'admin', 'admin'
  FROM public.profiles p
  WHERE p.id = p_user_id AND p.role = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.set_active_professional_role(p_role text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT public.is_enabled_professional(auth.uid(), p_role) THEN
    RAISE EXCEPTION 'Professional role is not enabled for this account';
  END IF;
  UPDATE public.profiles SET role = p_role, updated_at = now() WHERE id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_complimentary_access(
  p_user_id uuid, p_enabled boolean, p_expires_at timestamptz DEFAULT NULL, p_notes text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE v_role text;
BEGIN
  IF NOT public.is_profile_admin() THEN RAISE EXCEPTION 'Only admins can modify complimentary access'; END IF;
  UPDATE public.profiles SET complimentary_access = p_enabled,
    complimentary_access_expires_at = p_expires_at, complimentary_access_notes = p_notes, updated_at = now()
  WHERE id = p_user_id;
  IF p_enabled THEN
    SELECT role INTO v_role FROM public.profiles
    WHERE id = p_user_id AND role IN ('trainer','nutritionist','head_coach','biomechanist');
    IF v_role IS NOT NULL THEN
      INSERT INTO public.professional_roles(user_id, role, source) VALUES (p_user_id, v_role, 'complimentary')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_complimentary_access(uuid, boolean, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_complimentary_access(uuid, boolean, timestamptz, text) TO authenticated;

REVOKE ALL ON FUNCTION public.professional_access_active(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_active_professional_access(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_enabled_professional(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.effective_professional_roles(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_active_professional_role(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.professional_access_active(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_professional_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_enabled_professional(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.effective_professional_roles(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_active_professional_role(text) TO authenticated;

-- Preserve existing active professional profiles as enabled roles.
INSERT INTO public.professional_roles (user_id, role, source)
SELECT id, role, 'admin'
FROM public.profiles
WHERE role IN ('trainer', 'nutritionist', 'head_coach', 'biomechanist')
ON CONFLICT (user_id, role) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_set_profile_role(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT public.is_profile_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_role NOT IN ('admin', 'trainer', 'athlete', 'nutritionist', 'head_coach', 'biomechanist') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  UPDATE public.profiles SET role = p_role, updated_at = now() WHERE id = p_user_id;
  IF p_role IN ('trainer', 'nutritionist', 'head_coach', 'biomechanist') THEN
    INSERT INTO public.professional_roles (user_id, role, source)
    VALUES (p_user_id, p_role, 'admin')
    ON CONFLICT (user_id, role) DO UPDATE SET source = 'admin';
  END IF;
END;
$$;

-- Add the biomechanist assignment to the existing assignment RPC.
CREATE OR REPLACE FUNCTION public.assign_athlete_professional(
  p_athlete_id uuid, p_professional_id uuid, p_role_type text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
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
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_professional_id
      AND p.is_active = true
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

  SELECT COALESCE(ps.max_athletes, 50) INTO max_count
  FROM public.professional_subscriptions ps
  WHERE ps.user_id = p_professional_id AND ps.status IN ('active', 'trialing')
  ORDER BY ps.created_at DESC LIMIT 1;
  max_count := COALESCE(max_count, 50);
  SELECT count(*) INTO current_count
  FROM (
    SELECT id FROM public.profiles
    WHERE role = 'athlete' AND (assigned_trainer_id = p_professional_id
      OR assigned_nutritionist_id = p_professional_id
      OR assigned_biomechanist_id = p_professional_id)
    UNION
    SELECT tm.athlete_id FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE t.coach_id = p_professional_id
  ) assigned;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles a WHERE a.id = p_athlete_id
      AND (a.assigned_trainer_id = p_professional_id OR a.assigned_nutritionist_id = p_professional_id
        OR a.assigned_biomechanist_id = p_professional_id)
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

CREATE OR REPLACE FUNCTION public.search_athlete_professionals(p_role_type text, p_search text DEFAULT '')
RETURNS TABLE (id uuid, full_name text, email text, role text, avatar_url text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE normalized_search text := lower(trim(coalesce(p_search, '')));
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_role_type NOT IN ('head_coach', 'trainer', 'nutritionist', 'biomechanist') THEN
    RAISE EXCEPTION 'Invalid professional role';
  END IF;
  RETURN QUERY SELECT p.id, p.full_name, p.email, p.role, p.avatar_url
  FROM public.profiles p
  WHERE p.is_active = true
    AND ((p_role_type = 'nutritionist' AND p.role = 'nutritionist')
      OR (p_role_type = 'biomechanist' AND p.role = 'biomechanist')
      OR (p_role_type IN ('head_coach', 'trainer') AND p.role IN ('admin', 'head_coach', 'trainer'))
      OR EXISTS (
        SELECT 1 FROM public.professional_roles pr
        WHERE pr.user_id = p.id AND pr.role = p_role_type
      ))
    AND (normalized_search = '' OR lower(coalesce(p.full_name, '')) LIKE '%' || normalized_search || '%'
      OR lower(p.email) LIKE '%' || normalized_search || '%')
  ORDER BY lower(coalesce(p.full_name, p.email));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_athlete_professional_team(p_athlete_id uuid)
RETURNS TABLE (id uuid, role_type text, is_primary boolean, professional_id uuid, full_name text,
  email text, professional_role text, avatar_url text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF auth.uid() <> p_athlete_id AND NOT EXISTS (
    SELECT 1 FROM public.profiles viewer WHERE viewer.id = auth.uid() AND viewer.role IN ('admin', 'head_coach')
  ) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY SELECT at.id, at.role_type, at.is_primary, p.id, p.full_name, p.email, p.role, p.avatar_url
  FROM public.athlete_trainers at JOIN public.profiles p ON p.id = at.trainer_id
  WHERE at.athlete_id = p_athlete_id AND at.is_primary = true
    AND at.role_type IN ('head_coach', 'trainer', 'nutritionist', 'biomechanist')
  ORDER BY at.role_type;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_athlete_professional(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_athlete_professional(uuid, uuid, text) TO authenticated;

-- Keep team assignment within the coach's capacity.
CREATE OR REPLACE FUNCTION public.enforce_professional_team_capacity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE coach_id uuid; max_count integer; current_count integer;
BEGIN
  SELECT t.coach_id INTO coach_id FROM public.teams t WHERE t.id = NEW.team_id;
  IF coach_id IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(ps.max_athletes, 50) INTO max_count FROM public.professional_subscriptions ps
  WHERE ps.user_id = coach_id AND ps.status IN ('active', 'trialing') ORDER BY ps.created_at DESC LIMIT 1;
  max_count := COALESCE(max_count, 50);
  SELECT count(*) INTO current_count FROM (
    SELECT id FROM public.profiles WHERE role = 'athlete' AND (assigned_trainer_id = coach_id
      OR assigned_nutritionist_id = coach_id OR assigned_biomechanist_id = coach_id)
    UNION SELECT tm.athlete_id FROM public.team_members tm JOIN public.teams t ON t.id = tm.team_id
      WHERE t.coach_id = coach_id
  ) assigned;
  IF NOT EXISTS (SELECT 1 FROM public.team_members WHERE team_id = NEW.team_id AND athlete_id = NEW.athlete_id)
     AND current_count >= max_count THEN RAISE EXCEPTION 'Professional athlete limit reached'; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_professional_team_capacity ON public.team_members;
CREATE TRIGGER enforce_professional_team_capacity
  BEFORE INSERT ON public.team_members FOR EACH ROW
  EXECUTE FUNCTION public.enforce_professional_team_capacity();

-- Rollback (manual; review data dependencies first):
-- DROP TRIGGER IF EXISTS enforce_professional_team_capacity ON public.team_members;
-- DROP FUNCTION IF EXISTS public.enforce_professional_team_capacity();
-- DROP FUNCTION IF EXISTS public.assign_athlete_professional(uuid, uuid, text);
-- DROP FUNCTION IF EXISTS public.set_active_professional_role(text);
-- DROP FUNCTION IF EXISTS public.effective_professional_roles(uuid);
-- DROP FUNCTION IF EXISTS public.is_enabled_professional(uuid, text);
-- DROP FUNCTION IF EXISTS public.professional_access_active(uuid);
-- DROP FUNCTION IF EXISTS public.has_active_professional_access(uuid);
-- DROP TABLE IF EXISTS public.professional_roles;
-- DROP TABLE IF EXISTS public.professional_role_requests;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS assigned_biomechanist_id;
-- Restore the previous profiles role/requested_role constraints from their migration definitions.
