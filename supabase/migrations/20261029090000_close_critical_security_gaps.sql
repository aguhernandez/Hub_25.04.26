-- Close critical authorization gaps while preserving service-role access used by
-- the Hub <-> planner bridges.

CREATE OR REPLACE FUNCTION public.can_read_private_athlete_data(p_athlete_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    auth.role() = 'service_role'
    OR p_athlete_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.profiles viewer
      WHERE viewer.id = (SELECT auth.uid())
        AND viewer.role = 'admin'
        AND viewer.is_active IS DISTINCT FROM false
    )
    OR public.professional_can_read_athlete((SELECT auth.uid()), p_athlete_id, 'trainer')
    OR public.professional_can_read_athlete((SELECT auth.uid()), p_athlete_id, 'head_coach')
    OR public.professional_can_read_athlete((SELECT auth.uid()), p_athlete_id, 'nutritionist');
$$;

REVOKE ALL ON FUNCTION public.can_read_private_athlete_data(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_private_athlete_data(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.assign_workout_to_team(
  p_workout_id uuid,
  p_team_id uuid,
  p_trainer_id uuid,
  p_scheduled_date date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor uuid := (SELECT auth.uid());
  v_is_service boolean := auth.role() = 'service_role';
  v_is_admin boolean := false;
  v_inserted_count integer := 0;
BEGIN
  IF NOT v_is_service THEN
    IF v_actor IS NULL OR p_trainer_id IS DISTINCT FROM v_actor THEN
      RAISE EXCEPTION 'Not authorized to assign this workout' USING ERRCODE = '42501';
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = v_actor AND role = 'admin' AND is_active IS DISTINCT FROM false
    ) INTO v_is_admin;

    IF NOT v_is_admin AND NOT EXISTS (
      SELECT 1 FROM public.teams WHERE id = p_team_id AND coach_id = v_actor
    ) THEN
      RAISE EXCEPTION 'Not authorized for this team' USING ERRCODE = '42501';
    END IF;

    IF NOT v_is_admin AND NOT EXISTS (
      SELECT 1 FROM public.workouts WHERE id = p_workout_id AND trainer_id = v_actor
    ) THEN
      RAISE EXCEPTION 'Not authorized for this workout' USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO public.athlete_workouts (
    athlete_id, trainer_id, workout_id, team_id, scheduled_date, assignment_type, status
  )
  SELECT tm.athlete_id, p_trainer_id, p_workout_id, p_team_id,
         p_scheduled_date, 'team', 'pending'
  FROM public.team_members tm
  WHERE tm.team_id = p_team_id
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  RETURN v_inserted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_workout_to_membership(
  p_workout_id uuid,
  p_membership_id uuid,
  p_trainer_id uuid,
  p_scheduled_date date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor uuid := (SELECT auth.uid());
  v_is_service boolean := auth.role() = 'service_role';
  v_is_admin boolean := false;
  v_inserted_count integer := 0;
BEGIN
  IF NOT v_is_service THEN
    IF v_actor IS NULL OR p_trainer_id IS DISTINCT FROM v_actor THEN
      RAISE EXCEPTION 'Not authorized to assign this workout' USING ERRCODE = '42501';
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = v_actor AND role = 'admin' AND is_active IS DISTINCT FROM false
    ) INTO v_is_admin;

    IF NOT v_is_admin AND NOT EXISTS (
      SELECT 1 FROM public.memberships WHERE id = p_membership_id AND created_by = v_actor
    ) THEN
      RAISE EXCEPTION 'Not authorized for this membership' USING ERRCODE = '42501';
    END IF;

    IF NOT v_is_admin AND NOT EXISTS (
      SELECT 1 FROM public.workouts WHERE id = p_workout_id AND trainer_id = v_actor
    ) THEN
      RAISE EXCEPTION 'Not authorized for this workout' USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO public.athlete_workouts (
    athlete_id, trainer_id, workout_id, membership_id, scheduled_date, assignment_type, status
  )
  SELECT um.user_id, p_trainer_id, p_workout_id, p_membership_id,
         p_scheduled_date, 'membership', 'pending'
  FROM public.user_memberships um
  WHERE um.membership_id = p_membership_id AND um.status = 'active'
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  RETURN v_inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_workout_to_team(uuid, uuid, uuid, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.assign_workout_to_membership(uuid, uuid, uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_workout_to_team(uuid, uuid, uuid, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assign_workout_to_membership(uuid, uuid, uuid, date) TO authenticated, service_role;

-- Keep the existing calculations intact behind authorization wrappers. The
-- internal implementations have no Data API grants.
ALTER FUNCTION public.get_latest_1rm(uuid, text, text) RENAME TO get_latest_1rm_internal;
ALTER FUNCTION public.get_performance_summary(uuid, integer) RENAME TO get_performance_summary_internal;
ALTER FUNCTION public.calculate_acwr(uuid, date) RENAME TO calculate_acwr_internal;
ALTER FUNCTION public.calculate_fatigue_index(uuid, date) RENAME TO calculate_fatigue_index_internal;

ALTER FUNCTION public.get_latest_1rm_internal(uuid, text, text) SET search_path = pg_catalog, public;
ALTER FUNCTION public.get_performance_summary_internal(uuid, integer) SET search_path = pg_catalog, public;
ALTER FUNCTION public.calculate_acwr_internal(uuid, date) SET search_path = pg_catalog, public;
ALTER FUNCTION public.calculate_fatigue_index_internal(uuid, date) SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.get_latest_1rm_internal(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_performance_summary_internal(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.calculate_acwr_internal(uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.calculate_fatigue_index_internal(uuid, date) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.get_latest_1rm(
  p_athlete_id uuid,
  p_exercise_name text,
  p_method text DEFAULT 'latest'
)
RETURNS TABLE(estimated_1rm numeric, unit text, estimation_method text, calculated_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT public.can_read_private_athlete_data(p_athlete_id) THEN
    RAISE EXCEPTION 'Not authorized to read athlete metrics' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.get_latest_1rm_internal(p_athlete_id, p_exercise_name, p_method);
END;
$$;

CREATE FUNCTION public.calculate_acwr(p_athlete_id uuid, p_reference_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(acwr numeric, acute_load numeric, chronic_load numeric, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT public.can_read_private_athlete_data(p_athlete_id) THEN
    RAISE EXCEPTION 'Not authorized to read athlete metrics' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.calculate_acwr_internal(p_athlete_id, p_reference_date);
END;
$$;

CREATE FUNCTION public.calculate_fatigue_index(p_athlete_id uuid, p_reference_date date DEFAULT CURRENT_DATE)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT public.can_read_private_athlete_data(p_athlete_id) THEN
    RAISE EXCEPTION 'Not authorized to read athlete metrics' USING ERRCODE = '42501';
  END IF;
  RETURN public.calculate_fatigue_index_internal(p_athlete_id, p_reference_date);
END;
$$;

CREATE FUNCTION public.get_performance_summary(p_athlete_id uuid, p_days integer DEFAULT 28)
RETURNS TABLE(
  total_sessions integer, total_volume numeric, avg_session_volume numeric,
  avg_session_rpe numeric, acwr numeric, acwr_status text,
  fatigue_index numeric, velocity_drop_pct numeric, one_rm_trend_pct numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT public.can_read_private_athlete_data(p_athlete_id) THEN
    RAISE EXCEPTION 'Not authorized to read athlete metrics' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.get_performance_summary_internal(p_athlete_id, p_days);
END;
$$;

REVOKE ALL ON FUNCTION public.get_latest_1rm(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_performance_summary(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.calculate_acwr(uuid, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.calculate_fatigue_index(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_latest_1rm(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_performance_summary(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.calculate_acwr(uuid, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.calculate_fatigue_index(uuid, date) TO authenticated, service_role;

-- The views must execute with the caller's RLS and must never be public.
ALTER VIEW public.user_satellite_summary SET (security_invoker = true);
ALTER VIEW public.food_diary_session_status SET (security_invoker = true);
REVOKE ALL ON public.user_satellite_summary FROM PUBLIC, anon;
REVOKE ALL ON public.food_diary_session_status FROM PUBLIC, anon;
GRANT SELECT ON public.user_satellite_summary TO authenticated, service_role;
GRANT SELECT ON public.food_diary_session_status TO authenticated, service_role;

-- Profile creation is handled by auth-signup with the service role. The old
-- public policy allowed arbitrary profile rows to be inserted through Data API.
DROP POLICY IF EXISTS profiles_insert_any ON public.profiles;

-- API config crypto is server-only. Edge Functions use service_role.
ALTER FUNCTION public.encrypt_api_config(text, text) SET search_path = pg_catalog, public, extensions;
ALTER FUNCTION public.decrypt_api_config(bytea, text) SET search_path = pg_catalog, public, extensions;
REVOKE ALL ON FUNCTION public.encrypt_api_config(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.decrypt_api_config(bytea, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.encrypt_api_config(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrypt_api_config(bytea, text) TO service_role;
