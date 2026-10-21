-- Keep ATP schedules connected to real workout assignments and make compliance
-- values reflect the selected metric without granting clients direct aggregate writes.

ALTER TABLE public.atp_weekly_aggregates
  DROP COLUMN IF EXISTS compliance_percentage,
  ADD COLUMN compliance_percentage numeric GENERATED ALWAYS AS (
    CASE WHEN planned_sessions > 0
      THEN actual_sessions::numeric / planned_sessions * 100
      ELSE NULL
    END
  ) STORED;

ALTER TABLE public.atp_weekly_aggregates
  ALTER COLUMN athlete_id DROP NOT NULL;

ALTER TABLE public.atp_weekly_aggregates
  DROP COLUMN IF EXISTS tonnage_compliance_percentage,
  ADD COLUMN tonnage_compliance_percentage numeric GENERATED ALWAYS AS (
    CASE WHEN planned_tonnage > 0
      THEN actual_tonnage / planned_tonnage * 100
      ELSE NULL
    END
  ) STORED;

CREATE OR REPLACE FUNCTION public.atp_parse_average(p_value text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_match text[];
BEGIN
  v_match := regexp_match(trim(coalesce(p_value, '')), '^[^0-9]*([0-9]+(?:\.[0-9]+)?)(?:\s*[-–]\s*([0-9]+(?:\.[0-9]+)?))?');
  IF v_match IS NULL THEN
    RETURN 0;
  END IF;
  IF v_match[2] IS NULL THEN
    RETURN v_match[1]::numeric;
  END IF;
  RETURN (v_match[1]::numeric + v_match[2]::numeric) / 2;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_atp_weekly_plan(
  p_atp_id uuid,
  p_recalculate_load boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_atp public.annual_training_plans%ROWTYPE;
  v_week public.atp_weekly_loads%ROWTYPE;
  v_sessions integer;
  v_load numeric;
BEGIN
  SELECT * INTO v_atp
  FROM public.annual_training_plans
  WHERE id = p_atp_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF auth.uid() IS NOT NULL AND NOT (
    v_atp.coach_id = auth.uid()
    OR v_atp.athlete_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (v_atp.team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = v_atp.team_id AND athlete_id = auth.uid()
    ))
  ) THEN
    RAISE EXCEPTION 'Not authorized to sync this ATP';
  END IF;

  FOR v_week IN
    SELECT * FROM public.atp_weekly_loads
    WHERE atp_id = p_atp_id
    ORDER BY week_number
  LOOP
    SELECT
      count(*)::integer,
      coalesce(sum(load_by_assignment.load_value), 0)
    INTO v_sessions, v_load
    FROM (
      SELECT DISTINCT ON (workout_id, scheduled_date) workout_id, scheduled_date
      FROM public.athlete_workouts
      WHERE scheduled_date BETWEEN v_week.start_date AND v_week.end_date
        AND (
          (v_atp.athlete_id IS NOT NULL AND athlete_id = v_atp.athlete_id)
          OR (v_atp.team_id IS NOT NULL AND team_id = v_atp.team_id)
        )
      ORDER BY workout_id, scheduled_date, id
    ) aw
    CROSS JOIN LATERAL (
      SELECT coalesce(sum(
        coalesce(we.sets, 0)::numeric
        * public.atp_parse_average(we.reps)
        * CASE
            WHEN lower(coalesce(we.primary_metric, '')) LIKE '%kg%'
              THEN public.atp_parse_average(we.primary_value)
            WHEN lower(coalesce(we.secondary_metric, '')) LIKE '%kg%'
              THEN public.atp_parse_average(we.secondary_value)
            ELSE 0
          END
      ), 0) AS load_value
      FROM public.workout_exercises we
      WHERE we.workout_id = aw.workout_id
    ) load_by_assignment;

    IF p_recalculate_load THEN
      UPDATE public.atp_weekly_loads
      SET num_sessions = v_sessions,
          estimated_load = v_load,
          has_plan = v_sessions > 0
      WHERE id = v_week.id;
    ELSE
      UPDATE public.atp_weekly_loads
      SET num_sessions = v_sessions,
          has_plan = v_sessions > 0
      WHERE id = v_week.id;
    END IF;

    PERFORM public.calculate_weekly_compliance(p_atp_id, v_week.week_number);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_weekly_compliance(
  p_atp_id uuid,
  p_week_number integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_atp public.annual_training_plans%ROWTYPE;
  v_week public.atp_weekly_loads%ROWTYPE;
  v_actual_sessions integer;
  v_actual_tonnage numeric;
  v_actual_sets integer;
  v_actual_reps integer;
  v_avg_rpe numeric;
  v_status text;
BEGIN
  SELECT * INTO v_atp FROM public.annual_training_plans WHERE id = p_atp_id;
  SELECT * INTO v_week FROM public.atp_weekly_loads
  WHERE atp_id = p_atp_id AND week_number = p_week_number;
  IF NOT FOUND THEN RETURN; END IF;

  IF auth.uid() IS NOT NULL AND NOT (
    v_atp.coach_id = auth.uid()
    OR v_atp.athlete_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (v_atp.team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = v_atp.team_id AND athlete_id = auth.uid()
    ))
  ) THEN
    RAISE EXCEPTION 'Not authorized to calculate compliance for this ATP';
  END IF;

  SELECT
    count(*)::integer,
    coalesce(sum(ps.total_volume), 0),
    coalesce(sum(ps.total_sets), 0)::integer,
    coalesce(sum(ps.total_reps), 0)::integer,
    avg(ps.session_rpe)
  INTO v_actual_sessions, v_actual_tonnage, v_actual_sets, v_actual_reps, v_avg_rpe
  FROM public.performance_sessions ps
  WHERE ps.session_date BETWEEN v_week.start_date AND v_week.end_date
    AND (
      (v_atp.athlete_id IS NOT NULL AND ps.athlete_id = v_atp.athlete_id)
      OR (v_atp.team_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = v_atp.team_id AND tm.athlete_id = ps.athlete_id
      ))
    );

  IF v_actual_sessions = 0 THEN
    IF v_week.num_sessions > 0 AND CURRENT_DATE > v_week.end_date THEN
      v_status := 'under_planned';
    ELSE
      v_status := 'not_started';
    END IF;
  ELSIF v_week.num_sessions = 0 THEN
    v_status := 'over_planned';
  ELSIF v_actual_sessions < v_week.num_sessions * 0.7 THEN
    v_status := 'under_planned';
  ELSIF v_actual_sessions > v_week.num_sessions * 1.4 THEN
    v_status := 'over_planned';
  ELSIF CURRENT_DATE > v_week.end_date THEN
    v_status := 'completed';
  ELSE
    v_status := 'on_track';
  END IF;

  INSERT INTO public.atp_weekly_aggregates (
    atp_id, athlete_id, week_number, week_start_date, week_end_date,
    planned_sessions, planned_tonnage, actual_sessions, actual_tonnage,
    actual_sets, actual_reps, avg_rpe, status, last_updated
  ) VALUES (
    p_atp_id, v_atp.athlete_id, p_week_number, v_week.start_date, v_week.end_date,
    v_week.num_sessions, v_week.estimated_load, v_actual_sessions, v_actual_tonnage,
    v_actual_sets, v_actual_reps, v_avg_rpe, v_status, now()
  )
  ON CONFLICT (atp_id, week_number) DO UPDATE SET
    athlete_id = EXCLUDED.athlete_id,
    week_start_date = EXCLUDED.week_start_date,
    week_end_date = EXCLUDED.week_end_date,
    planned_sessions = EXCLUDED.planned_sessions,
    planned_tonnage = EXCLUDED.planned_tonnage,
    actual_sessions = EXCLUDED.actual_sessions,
    actual_tonnage = EXCLUDED.actual_tonnage,
    actual_sets = EXCLUDED.actual_sets,
    actual_reps = EXCLUDED.actual_reps,
    avg_rpe = EXCLUDED.avg_rpe,
    status = EXCLUDED.status,
    last_updated = now();

  UPDATE public.atp_weekly_loads
  SET actual_load = v_actual_tonnage
  WHERE id = v_week.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_atp_compliance_for_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_athlete_id uuid;
  v_session_date date;
  v_plan record;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_athlete_id := OLD.athlete_id;
    v_session_date := OLD.session_date;
  ELSE
    v_athlete_id := NEW.athlete_id;
    v_session_date := NEW.session_date;
  END IF;

  FOR v_plan IN
    SELECT p.id, wl.week_number
    FROM public.annual_training_plans p
    JOIN public.atp_weekly_loads wl ON wl.atp_id = p.id
    WHERE v_session_date BETWEEN wl.start_date AND wl.end_date
      AND (p.athlete_id = v_athlete_id OR EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = p.team_id AND tm.athlete_id = v_athlete_id
      ))
      AND (auth.uid() IS NULL OR p.coach_id = auth.uid() OR p.athlete_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        OR EXISTS (SELECT 1 FROM public.team_members tm
          WHERE tm.team_id = p.team_id AND tm.athlete_id = auth.uid()))
  LOOP
    PERFORM public.calculate_weekly_compliance(v_plan.id, v_plan.week_number);
  END LOOP;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS refresh_atp_compliance_after_session ON public.performance_sessions;
CREATE TRIGGER refresh_atp_compliance_after_session
  AFTER INSERT OR UPDATE OR DELETE ON public.performance_sessions
  FOR EACH ROW EXECUTE FUNCTION public.refresh_atp_compliance_for_session();

-- Aggregates are written by the authorized security-definer RPC, not by clients.
DROP POLICY IF EXISTS "System can insert aggregates" ON public.atp_weekly_aggregates;
DROP POLICY IF EXISTS "System can update aggregates" ON public.atp_weekly_aggregates;
DROP POLICY IF EXISTS "Athletes view own aggregates" ON public.atp_weekly_aggregates;
DROP POLICY IF EXISTS "Trainers view assigned athletes aggregates" ON public.atp_weekly_aggregates;
DROP POLICY IF EXISTS "Admins view all aggregates" ON public.atp_weekly_aggregates;

CREATE POLICY "ATP participants can view aggregates"
  ON public.atp_weekly_aggregates FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.annual_training_plans p
    WHERE p.id = atp_weekly_aggregates.atp_id
      AND (
        p.coach_id = auth.uid()
        OR p.athlete_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        OR (p.team_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.team_members tm
          WHERE tm.team_id = p.team_id AND tm.athlete_id = auth.uid()
        ))
      )
  ));

-- Scope alert creation to a plan the caller can access; alert functions continue
-- to provide the application workflow without permitting cross-plan inserts.
DROP POLICY IF EXISTS "System can create alerts" ON public.atp_compliance_alerts;
DROP POLICY IF EXISTS "ATP participants can create alerts" ON public.atp_compliance_alerts;
CREATE POLICY "ATP participants can create alerts"
  ON public.atp_compliance_alerts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.annual_training_plans p
    WHERE p.id = atp_compliance_alerts.atp_id
      AND (p.coach_id = auth.uid() OR p.athlete_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  ));

DROP POLICY IF EXISTS "ATP participants can delete assigned workouts" ON public.athlete_workouts;
CREATE POLICY "ATP participants can delete assigned workouts"
  ON public.athlete_workouts FOR DELETE TO authenticated
  USING (
    athlete_id = auth.uid()
    OR trainer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Athletes can create own workout templates" ON public.workouts;
CREATE POLICY "Athletes can create own workout templates"
  ON public.workouts FOR INSERT TO authenticated
  WITH CHECK (
    trainer_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'athlete')
  );

REVOKE ALL ON FUNCTION public.sync_atp_weekly_plan(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.calculate_weekly_compliance(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.refresh_atp_compliance_for_session() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_atp_weekly_plan(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_weekly_compliance(uuid, integer) TO authenticated;
