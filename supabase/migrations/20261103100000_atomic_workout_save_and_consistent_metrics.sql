CREATE OR REPLACE FUNCTION public.save_workout_builder_atomic(
  p_workout_id uuid,
  p_name text,
  p_description text,
  p_exercises jsonb,
  p_scheduled_date date,
  p_edit_athlete_workout_id uuid,
  p_assignment_type text,
  p_target_id uuid,
  p_tag_ids uuid[]
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_assigned_trainer uuid;
  v_workout_id uuid;
  v_row jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  SELECT role, assigned_trainer_id INTO v_role, v_assigned_trainer FROM public.profiles WHERE id = v_uid;
  IF v_role NOT IN ('athlete', 'trainer', 'admin') THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501'; END IF;

  IF p_workout_id IS NULL THEN
    INSERT INTO public.workouts(name, description, trainer_id)
    VALUES (p_name, COALESCE(p_description, ''), v_uid)
    RETURNING id INTO v_workout_id;
  ELSE
    IF NOT (
      v_role = 'admin'
      OR EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = p_workout_id AND w.trainer_id = v_uid)
      OR EXISTS (SELECT 1 FROM public.athlete_workouts aw WHERE aw.id = p_edit_athlete_workout_id AND aw.workout_id = p_workout_id AND aw.athlete_id = v_uid)
    ) THEN RAISE EXCEPTION 'Not authorized to edit workout' USING ERRCODE = '42501'; END IF;
    UPDATE public.workouts SET name = p_name, description = COALESCE(p_description, '') WHERE id = p_workout_id;
    v_workout_id := p_workout_id;
    DELETE FROM public.workout_exercises WHERE workout_id = v_workout_id;
  END IF;

  FOR v_row IN SELECT value FROM jsonb_array_elements(COALESCE(p_exercises, '[]'::jsonb)) LOOP
    INSERT INTO public.workout_exercises(
      workout_id, exercise_id, sets, reps, primary_value, secondary_value, rest_seconds, notes,
      superset_group, order_index, primary_metric, secondary_metric, section_title, block_instance_id,
      working_set, circuit_instance_id, circuit_id, circuit_name, circuit_type, circuit_rounds,
      circuit_amrap_minutes
    ) VALUES (
      v_workout_id, (v_row->>'exercise_id')::uuid, COALESCE((v_row->>'sets')::integer, 1),
      COALESCE(v_row->>'reps', '1'), v_row->>'primary_value', v_row->>'secondary_value',
      COALESCE((v_row->>'rest_seconds')::integer, 0), COALESCE(v_row->>'notes', ''),
      (v_row->>'superset_group')::integer, COALESCE((v_row->>'order_index')::integer, 0),
      v_row->>'primary_metric', v_row->>'secondary_metric', v_row->>'section_title',
      v_row->>'block_instance_id', COALESCE((v_row->>'working_set')::boolean, false),
      v_row->>'circuit_instance_id', (v_row->>'circuit_id')::uuid, v_row->>'circuit_name',
      v_row->>'circuit_type', (v_row->>'circuit_rounds')::integer,
      (v_row->>'circuit_amrap_minutes')::integer
    );
  END LOOP;

  IF p_edit_athlete_workout_id IS NOT NULL THEN
    UPDATE public.athlete_workouts SET scheduled_date = p_scheduled_date
    WHERE id = p_edit_athlete_workout_id AND workout_id = v_workout_id
      AND (v_role = 'admin' OR athlete_id = v_uid OR trainer_id = v_uid);
    IF NOT FOUND THEN RAISE EXCEPTION 'Workout assignment not found or unauthorized' USING ERRCODE = '42501'; END IF;
  ELSIF v_role = 'athlete' THEN
    INSERT INTO public.athlete_workouts(athlete_id, trainer_id, workout_id, scheduled_date, assignment_type, status)
    VALUES (v_uid, v_assigned_trainer, v_workout_id, p_scheduled_date, 'individual', 'pending');
  ELSIF p_assignment_type = 'individual' AND p_target_id IS NOT NULL THEN
    INSERT INTO public.athlete_workouts(athlete_id, trainer_id, workout_id, scheduled_date, assignment_type, status)
    VALUES (p_target_id, v_uid, v_workout_id, p_scheduled_date, 'individual', 'pending');
  ELSIF p_assignment_type = 'team' AND p_target_id IS NOT NULL THEN
    PERFORM public.assign_workout_to_team(v_workout_id, p_target_id, v_uid, p_scheduled_date);
  ELSIF p_assignment_type = 'membership' AND p_target_id IS NOT NULL THEN
    PERFORM public.assign_workout_to_membership(v_workout_id, p_target_id, v_uid, p_scheduled_date);
  END IF;

  DELETE FROM public.workout_tags WHERE workout_id = v_workout_id;
  INSERT INTO public.workout_tags(workout_id, tag_id, created_by)
  SELECT v_workout_id, tag_id, v_uid FROM unnest(COALESCE(p_tag_ids, ARRAY[]::uuid[])) AS tag_id;
  RETURN v_workout_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_workout_builder_atomic(uuid,text,text,jsonb,date,uuid,text,uuid,uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_workout_builder_atomic(uuid,text,text,jsonb,date,uuid,text,uuid,uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.calculate_acwr_internal(p_athlete_id uuid, p_reference_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(acwr numeric, acute_load numeric, chronic_load numeric, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_acute numeric; v_chronic numeric; v_ratio numeric; v_status text; v_sessions integer;
BEGIN
  SELECT COALESCE(SUM(total_volume),0) / 7.0
    INTO v_acute FROM public.performance_sessions
   WHERE athlete_id=p_athlete_id AND session_date BETWEEN p_reference_date-6 AND p_reference_date AND total_volume>0;
  SELECT COALESCE(SUM(total_volume),0) / 28.0, COUNT(*)
    INTO v_chronic, v_sessions FROM public.performance_sessions
   WHERE athlete_id=p_athlete_id AND session_date BETWEEN p_reference_date-27 AND p_reference_date AND total_volume>0;
  IF v_chronic <= 0 OR v_sessions < 4 THEN
    v_ratio := 0; v_status := 'insufficient_data';
  ELSE
    v_ratio := v_acute / v_chronic;
    v_status := CASE WHEN v_ratio < 0.8 THEN 'detraining_risk' WHEN v_ratio <= 1.3 THEN 'optimal'
                     WHEN v_ratio <= 1.5 THEN 'caution' ELSE 'high_injury_risk' END;
  END IF;
  RETURN QUERY SELECT ROUND(v_ratio,4), ROUND(v_acute,2), ROUND(v_chronic,2), v_status;
END; $$;

CREATE OR REPLACE FUNCTION public.calculate_fatigue_index_internal(p_athlete_id uuid, p_reference_date date DEFAULT CURRENT_DATE)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_recent numeric; v_baseline numeric; v_count integer;
BEGIN
  SELECT COALESCE(SUM(total_volume),0)/7.0 INTO v_recent FROM public.performance_sessions
   WHERE athlete_id=p_athlete_id AND session_date BETWEEN p_reference_date-6 AND p_reference_date AND total_volume>0;
  SELECT COALESCE(SUM(total_volume),0)/21.0, COUNT(*) INTO v_baseline, v_count FROM public.performance_sessions
   WHERE athlete_id=p_athlete_id AND session_date BETWEEN p_reference_date-27 AND p_reference_date-7 AND total_volume>0;
  IF v_baseline <= 0 OR v_count < 3 THEN RETURN 1.0; END IF;
  RETURN ROUND(v_recent/v_baseline,4);
END; $$;

CREATE OR REPLACE FUNCTION public.calculate_one_rm_trend_internal(p_athlete_id uuid, p_reference_date date DEFAULT CURRENT_DATE)
RETURNS numeric LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  WITH recent AS (
    SELECT exercise_id, MAX(estimated_1rm) value FROM public.performance_exercise_logs
    WHERE athlete_id=p_athlete_id AND estimated_1rm>0 AND recorded_at >= p_reference_date-13
      AND recorded_at < p_reference_date+1 GROUP BY exercise_id
  ), previous AS (
    SELECT exercise_id, MAX(estimated_1rm) value FROM public.performance_exercise_logs
    WHERE athlete_id=p_athlete_id AND estimated_1rm>0 AND recorded_at >= p_reference_date-27
      AND recorded_at < p_reference_date-13 GROUP BY exercise_id
  )
  SELECT COALESCE(ROUND(AVG(((r.value-p.value)/p.value)*100),2),0)
  FROM recent r JOIN previous p USING(exercise_id) WHERE p.value>0;
$$;

REVOKE ALL ON FUNCTION public.calculate_one_rm_trend_internal(uuid,date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_one_rm_trend_internal(uuid,date) TO service_role;

CREATE OR REPLACE FUNCTION public.get_performance_summary_internal(p_athlete_id uuid, p_days integer DEFAULT 28)
RETURNS TABLE(total_sessions integer,total_volume numeric,avg_session_volume numeric,avg_session_rpe numeric,acwr numeric,acwr_status text,fatigue_index numeric,velocity_drop_pct numeric,one_rm_trend_pct numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_acwr record; v_fatigue numeric; v_velocity_recent numeric; v_velocity_baseline numeric; v_velocity_drop numeric;
v_sessions integer; v_extra integer; v_external integer; v_sum numeric; v_avg numeric; v_rpe numeric; v_trend numeric;
BEGIN
  p_days := GREATEST(1, LEAST(COALESCE(p_days, 28), 365));
  SELECT * INTO v_acwr FROM public.calculate_acwr_internal(p_athlete_id,CURRENT_DATE);
  v_fatigue := public.calculate_fatigue_index_internal(p_athlete_id,CURRENT_DATE);
  v_trend := public.calculate_one_rm_trend_internal(p_athlete_id,CURRENT_DATE);
  SELECT COALESCE(AVG(velocity),0) INTO v_velocity_recent FROM public.performance_exercise_logs
   WHERE athlete_id=p_athlete_id AND recorded_at>=CURRENT_DATE-6 AND velocity IS NOT NULL;
  SELECT COALESCE(baseline_velocity,0) INTO v_velocity_baseline FROM public.performance_baselines WHERE athlete_id=p_athlete_id LIMIT 1;
  v_velocity_drop := CASE WHEN v_velocity_baseline>0 THEN ((v_velocity_baseline-v_velocity_recent)/v_velocity_baseline)*100 ELSE 0 END;
  SELECT COUNT(*)::integer,COALESCE(SUM(total_volume),0),COALESCE(AVG(total_volume),0),COALESCE(AVG(session_rpe),0)
    INTO v_sessions,v_sum,v_avg,v_rpe FROM public.performance_sessions WHERE athlete_id=p_athlete_id AND session_date>=CURRENT_DATE-p_days+1;
  SELECT COUNT(*)::integer INTO v_extra FROM public.extra_training_logs WHERE athlete_id=p_athlete_id AND training_date>=CURRENT_DATE-p_days+1;
  SELECT COUNT(*)::integer INTO v_external FROM public.external_activities WHERE user_id=p_athlete_id AND deleted_at IS NULL AND start_time>=CURRENT_DATE-p_days+1;
  RETURN QUERY SELECT v_sessions+v_extra+v_external,v_sum,v_avg,v_rpe,COALESCE(v_acwr.acwr,0),COALESCE(v_acwr.status,'insufficient_data'),v_fatigue,ROUND(v_velocity_drop,2),v_trend;
END; $$;
