ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS assigned_nutritionist_id uuid REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS idx_profiles_assigned_nutritionist
  ON public.profiles(assigned_nutritionist_id);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'trainer', 'athlete', 'nutritionist', 'head_coach'));

UPDATE public.profiles
SET role = 'head_coach', updated_at = now()
WHERE lower(email) = 'agu@asciende.pro';

CREATE TABLE IF NOT EXISTS public.role_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_role text NOT NULL CHECK (requested_role IN ('admin', 'trainer', 'athlete', 'nutritionist', 'head_coach')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.role_change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS role_change_requests_select_own ON public.role_change_requests;
DROP POLICY IF EXISTS role_change_requests_insert_own ON public.role_change_requests;
DROP POLICY IF EXISTS role_change_requests_update_admin ON public.role_change_requests;
DROP POLICY IF EXISTS role_change_requests_delete_admin ON public.role_change_requests;

CREATE POLICY role_change_requests_select_own ON public.role_change_requests
  FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY role_change_requests_insert_own ON public.role_change_requests
  FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());
CREATE POLICY role_change_requests_update_admin ON public.role_change_requests
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY role_change_requests_delete_admin ON public.role_change_requests
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Authenticated users can view trainer and admin profiles" ON public.profiles;
DROP POLICY IF EXISTS profiles_select_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_select_trainer ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;

CREATE POLICY profiles_select_scoped ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles viewer WHERE viewer.id = auth.uid() AND viewer.role IN ('admin', 'head_coach'))
    OR (role = 'athlete' AND assigned_trainer_id = auth.uid())
    OR (role = 'athlete' AND assigned_nutritionist_id = auth.uid())
    OR (role = 'athlete' AND EXISTS (
      SELECT 1 FROM public.athlete_trainers at
      WHERE at.athlete_id = public.profiles.id
        AND at.trainer_id = auth.uid()
    ))
  );

CREATE POLICY profiles_update_scoped ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles viewer WHERE viewer.id = auth.uid() AND viewer.role = 'admin')
  )
  WITH CHECK (
    id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles viewer WHERE viewer.id = auth.uid() AND viewer.role = 'admin')
  );

CREATE OR REPLACE FUNCTION public.prevent_non_admin_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Only administrators can change roles';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_non_admin_role_change ON public.profiles;
CREATE TRIGGER prevent_non_admin_role_change
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_non_admin_role_change();

CREATE OR REPLACE FUNCTION public.assign_athlete_to_professional(
  p_athlete_id uuid,
  p_professional_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
BEGIN
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  IF caller_role NOT IN ('admin', 'head_coach', 'trainer', 'nutritionist') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_professional_type NOT IN ('trainer', 'nutritionist') THEN
    RAISE EXCEPTION 'Invalid professional type';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_athlete_id AND role = 'athlete') THEN
    RAISE EXCEPTION 'Athlete not found';
  END IF;
  IF p_professional_type = 'trainer' AND caller_role NOT IN ('admin', 'head_coach', 'trainer') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_professional_type = 'nutritionist' AND caller_role NOT IN ('admin', 'head_coach', 'nutritionist') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_professional_type = 'trainer' THEN
    UPDATE public.profiles SET assigned_trainer_id = auth.uid(), updated_at = now() WHERE id = p_athlete_id;
  ELSE
    UPDATE public.profiles SET assigned_nutritionist_id = auth.uid(), updated_at = now() WHERE id = p_athlete_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_athlete_to_professional(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_athlete_to_professional(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_profile_role(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_role NOT IN ('admin', 'trainer', 'athlete', 'nutritionist', 'head_coach') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  UPDATE public.profiles SET role = p_role, updated_at = now() WHERE id = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_profile_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_profile_role(uuid, text) TO authenticated;