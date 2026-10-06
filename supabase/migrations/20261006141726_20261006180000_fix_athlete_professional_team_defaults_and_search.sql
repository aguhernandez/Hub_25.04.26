/*
# Fix athlete professional team defaults and searchable assignments

1. Purpose
- Add the trainer role to the existing professional-assignment role list.
- Ensure every new athlete starts connected to agu@asciende.pro as head coach, trainer, and nutritionist.
- Backfill those connections for existing athletes without deleting historical assignment rows.
- Provide secure functions to search, read, and update the professional team.

2. Security
- Only authenticated users can call the functions.
- Athletes can manage only their own team.
- Administrators and head coaches can manage athlete teams.
- Search returns only the identity fields needed by the selector.

3. Data integrity
- Reassignments mark the previous role connection non-primary and retain it.
- Existing profiles and historical assignments are not deleted.
*/

ALTER TABLE public.athlete_trainers
  DROP CONSTRAINT IF EXISTS athlete_trainers_role_type_check;

ALTER TABLE public.athlete_trainers
  ADD CONSTRAINT athlete_trainers_role_type_check
  CHECK (role_type IN ('head_coach', 'trainer', 'strength_coach', 'sport_coach', 'nutritionist', 'biomechanist', 'physiologist', 'data_analyst', 'other'));

CREATE INDEX IF NOT EXISTS idx_athlete_trainers_athlete_role
  ON public.athlete_trainers(athlete_id, role_type, is_primary);

CREATE OR REPLACE FUNCTION public.search_athlete_professionals(p_role_type text, p_search text DEFAULT '')
RETURNS TABLE (id uuid, full_name text, email text, role text, avatar_url text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE normalized_search text := lower(trim(coalesce(p_search, '')));
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_role_type NOT IN ('head_coach', 'trainer', 'nutritionist') THEN RAISE EXCEPTION 'Invalid professional role'; END IF;
  RETURN QUERY
  SELECT p.id, p.full_name, p.email, p.role, p.avatar_url
  FROM public.profiles p
  WHERE p.is_active = true
    AND ((p_role_type = 'nutritionist' AND p.role = 'nutritionist')
      OR (p_role_type IN ('head_coach', 'trainer') AND p.role IN ('admin', 'head_coach', 'trainer')))
    AND (normalized_search = '' OR lower(coalesce(p.full_name, '')) LIKE '%' || normalized_search || '%' OR lower(p.email) LIKE '%' || normalized_search || '%')
  ORDER BY lower(coalesce(p.full_name, p.email));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_athlete_professional_team(p_athlete_id uuid)
RETURNS TABLE (id uuid, role_type text, is_primary boolean, professional_id uuid, full_name text, email text, professional_role text, avatar_url text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF auth.uid() <> p_athlete_id AND NOT EXISTS (SELECT 1 FROM public.profiles viewer WHERE viewer.id = auth.uid() AND viewer.role IN ('admin', 'head_coach')) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT at.id, at.role_type, at.is_primary, p.id, p.full_name, p.email, p.role, p.avatar_url
  FROM public.athlete_trainers at JOIN public.profiles p ON p.id = at.trainer_id
  WHERE at.athlete_id = p_athlete_id AND at.is_primary = true AND at.role_type IN ('head_coach', 'trainer', 'nutritionist')
  ORDER BY at.role_type;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_athlete_professional(p_athlete_id uuid, p_professional_id uuid, p_role_type text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE caller_role text; professional_role text;
BEGIN
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  IF auth.uid() <> p_athlete_id AND caller_role NOT IN ('admin', 'head_coach') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_role_type NOT IN ('head_coach', 'trainer', 'nutritionist') THEN RAISE EXCEPTION 'Invalid professional role'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_athlete_id AND role = 'athlete') THEN RAISE EXCEPTION 'Athlete not found'; END IF;
  SELECT role INTO professional_role FROM public.profiles WHERE id = p_professional_id AND is_active = true;
  IF professional_role IS NULL OR (p_role_type = 'nutritionist' AND professional_role <> 'nutritionist') OR (p_role_type IN ('head_coach', 'trainer') AND professional_role NOT IN ('admin', 'head_coach', 'trainer')) THEN RAISE EXCEPTION 'Professional is not eligible for this role'; END IF;
  UPDATE public.athlete_trainers SET is_primary = false WHERE athlete_id = p_athlete_id AND role_type = p_role_type AND trainer_id <> p_professional_id;
  INSERT INTO public.athlete_trainers (athlete_id, trainer_id, role_type, is_primary) VALUES (p_athlete_id, p_professional_id, p_role_type, true)
  ON CONFLICT (athlete_id, trainer_id, role_type) DO UPDATE SET is_primary = true;
  IF p_role_type IN ('head_coach', 'trainer') THEN
    UPDATE public.profiles SET assigned_trainer_id = p_professional_id, updated_at = now() WHERE id = p_athlete_id;
  ELSE
    UPDATE public.profiles SET assigned_nutritionist_id = p_professional_id, updated_at = now() WHERE id = p_athlete_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.search_athlete_professionals(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_athlete_professional_team(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.assign_athlete_professional(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_athlete_professionals(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_athlete_professional_team(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_athlete_professional(uuid, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.auto_assign_default_professional_team()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE default_professional_id uuid;
BEGIN
  IF NEW.role <> 'athlete' THEN RETURN NEW; END IF;
  SELECT p.id INTO default_professional_id FROM public.profiles p WHERE lower(p.email) = 'agu@asciende.pro' AND p.is_active = true LIMIT 1;
  IF default_professional_id IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.athlete_trainers (athlete_id, trainer_id, role_type, is_primary) VALUES
    (NEW.id, default_professional_id, 'head_coach', true),
    (NEW.id, default_professional_id, 'trainer', true),
    (NEW.id, default_professional_id, 'nutritionist', true)
  ON CONFLICT (athlete_id, trainer_id, role_type) DO UPDATE SET is_primary = true;
  UPDATE public.profiles SET assigned_trainer_id = default_professional_id, assigned_nutritionist_id = default_professional_id, updated_at = now() WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_assign_default_professional_team ON public.profiles;
CREATE TRIGGER trigger_auto_assign_default_professional_team AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.auto_assign_default_professional_team();

DO $$
DECLARE default_professional_id uuid;
BEGIN
  SELECT p.id INTO default_professional_id FROM public.profiles p WHERE lower(p.email) = 'agu@asciende.pro' AND p.is_active = true LIMIT 1;
  IF default_professional_id IS NOT NULL THEN
    INSERT INTO public.athlete_trainers (athlete_id, trainer_id, role_type, is_primary)
    SELECT p.id, default_professional_id, roles.role_type, true
    FROM public.profiles p CROSS JOIN (VALUES ('head_coach'::text), ('trainer'::text), ('nutritionist'::text)) AS roles(role_type)
    WHERE p.role = 'athlete'
    ON CONFLICT (athlete_id, trainer_id, role_type) DO UPDATE SET is_primary = true;
    UPDATE public.profiles SET assigned_trainer_id = default_professional_id, assigned_nutritionist_id = default_professional_id, updated_at = now() WHERE role = 'athlete';
  END IF;
END $$;