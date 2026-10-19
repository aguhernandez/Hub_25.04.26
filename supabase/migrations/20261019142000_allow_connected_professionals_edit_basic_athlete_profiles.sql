-- Let connected professionals update only the athlete's basic profile fields.
-- Email, role, assignments, and all other profile data remain protected.

DROP POLICY IF EXISTS profiles_update_connected_professional_basic ON public.profiles;
CREATE POLICY profiles_update_connected_professional_basic
  ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    role = 'athlete'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('trainer', 'nutritionist', 'head_coach')
    AND (
      assigned_trainer_id = (SELECT auth.uid())
      OR assigned_nutritionist_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.athlete_trainers at
        WHERE at.athlete_id = public.profiles.id
          AND at.trainer_id = (SELECT auth.uid())
      )
      OR EXISTS (
        SELECT 1
        FROM public.team_members tm
        JOIN public.teams t ON t.id = tm.team_id
        WHERE tm.athlete_id = public.profiles.id
          AND t.coach_id = (SELECT auth.uid())
      )
    )
  )
  WITH CHECK (
    role = 'athlete'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('trainer', 'nutritionist', 'head_coach')
    AND (
      assigned_trainer_id = (SELECT auth.uid())
      OR assigned_nutritionist_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.athlete_trainers at
        WHERE at.athlete_id = public.profiles.id
          AND at.trainer_id = (SELECT auth.uid())
      )
      OR EXISTS (
        SELECT 1
        FROM public.team_members tm
        JOIN public.teams t ON t.id = tm.team_id
        WHERE tm.athlete_id = public.profiles.id
          AND t.coach_id = (SELECT auth.uid())
      )
    )
  );

CREATE OR REPLACE FUNCTION public.limit_connected_professional_profile_edits()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  caller_role text := auth.jwt() -> 'app_metadata' ->> 'role';
  editable_columns text[] := ARRAY[
    'first_name', 'last_name', 'full_name', 'gender', 'date_of_birth',
    'country', 'phone', 'sport', 'username', 'timezone', 'updated_at'
  ];
BEGIN
  IF caller_role IN ('trainer', 'nutritionist', 'head_coach')
     AND OLD.role = 'athlete'
     AND (to_jsonb(NEW) - editable_columns) IS DISTINCT FROM (to_jsonb(OLD) - editable_columns) THEN
    RAISE EXCEPTION 'Professionals may only edit basic athlete profile fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS limit_connected_professional_profile_edits ON public.profiles;
CREATE TRIGGER limit_connected_professional_profile_edits
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.limit_connected_professional_profile_edits();
