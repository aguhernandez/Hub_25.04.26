/*
# Allow the default Asciende professional in every team role

1. Purpose
- Keep agu@asciende.pro selectable as Head Coach, Trainer, and Nutritionist even though the profile's primary account role is trainer.
- This matches the default professional-team rule and keeps the selector consistent with existing assignments.

2. Security
- The existing authenticated-only function permissions remain unchanged.
- No profile visibility or assignment permissions are broadened beyond the existing secure functions.
*/

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
    AND (
      (p_role_type = 'nutritionist' AND (p.role = 'nutritionist' OR lower(p.email) = 'agu@asciende.pro'))
      OR (p_role_type IN ('head_coach', 'trainer') AND p.role IN ('admin', 'head_coach', 'trainer'))
    )
    AND (normalized_search = '' OR lower(coalesce(p.full_name, '')) LIKE '%' || normalized_search || '%' OR lower(p.email) LIKE '%' || normalized_search || '%')
  ORDER BY lower(coalesce(p.full_name, p.email));
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_athlete_professional(p_athlete_id uuid, p_professional_id uuid, p_role_type text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE caller_role text; professional_role text; professional_email text;
BEGIN
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  IF auth.uid() <> p_athlete_id AND caller_role NOT IN ('admin', 'head_coach') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_role_type NOT IN ('head_coach', 'trainer', 'nutritionist') THEN RAISE EXCEPTION 'Invalid professional role'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_athlete_id AND role = 'athlete') THEN RAISE EXCEPTION 'Athlete not found'; END IF;
  SELECT role, lower(email) INTO professional_role, professional_email FROM public.profiles WHERE id = p_professional_id AND is_active = true;
  IF professional_role IS NULL OR (p_role_type = 'nutritionist' AND professional_role <> 'nutritionist' AND professional_email <> 'agu@asciende.pro') OR (p_role_type IN ('head_coach', 'trainer') AND professional_role NOT IN ('admin', 'head_coach', 'trainer')) THEN RAISE EXCEPTION 'Professional is not eligible for this role'; END IF;
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