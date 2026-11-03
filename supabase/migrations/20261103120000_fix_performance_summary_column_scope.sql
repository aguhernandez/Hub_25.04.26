CREATE OR REPLACE FUNCTION public.get_performance_summary_internal(p_athlete_id uuid, p_days integer DEFAULT 28)
RETURNS TABLE(total_sessions integer,total_volume numeric,avg_session_volume numeric,avg_session_rpe numeric,acwr numeric,acwr_status text,fatigue_index numeric,velocity_drop_pct numeric,one_rm_trend_pct numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_acwr record;
  v_fatigue numeric;
  v_velocity_recent numeric;
  v_velocity_baseline numeric;
  v_velocity_drop numeric;
  v_sessions integer;
  v_extra integer;
  v_external integer;
  v_sum numeric;
  v_avg numeric;
  v_rpe numeric;
  v_trend numeric;
BEGIN
  p_days := GREATEST(1, LEAST(COALESCE(p_days, 28), 365));
  SELECT * INTO v_acwr FROM public.calculate_acwr_internal(p_athlete_id,CURRENT_DATE);
  v_fatigue := public.calculate_fatigue_index_internal(p_athlete_id,CURRENT_DATE);
  v_trend := public.calculate_one_rm_trend_internal(p_athlete_id,CURRENT_DATE);

  SELECT COALESCE(AVG(pel.velocity),0)
    INTO v_velocity_recent
    FROM public.performance_exercise_logs pel
   WHERE pel.athlete_id=p_athlete_id
     AND pel.recorded_at>=CURRENT_DATE-6
     AND pel.velocity IS NOT NULL;

  SELECT COALESCE(pb.baseline_velocity,0)
    INTO v_velocity_baseline
    FROM public.performance_baselines pb
   WHERE pb.athlete_id=p_athlete_id
   LIMIT 1;

  v_velocity_drop := CASE
    WHEN v_velocity_baseline>0 THEN ((v_velocity_baseline-v_velocity_recent)/v_velocity_baseline)*100
    ELSE 0
  END;

  SELECT COUNT(*)::integer,
         COALESCE(SUM(ps.total_volume),0),
         COALESCE(AVG(ps.total_volume),0),
         COALESCE(AVG(ps.session_rpe),0)
    INTO v_sessions,v_sum,v_avg,v_rpe
    FROM public.performance_sessions ps
   WHERE ps.athlete_id=p_athlete_id
     AND ps.session_date>=CURRENT_DATE-p_days+1;

  SELECT COUNT(*)::integer
    INTO v_extra
    FROM public.extra_training_logs etl
   WHERE etl.athlete_id=p_athlete_id
     AND etl.training_date>=CURRENT_DATE-p_days+1;

  SELECT COUNT(*)::integer
    INTO v_external
    FROM public.external_activities ea
   WHERE ea.user_id=p_athlete_id
     AND ea.deleted_at IS NULL
     AND ea.start_time>=CURRENT_DATE-p_days+1;

  RETURN QUERY SELECT
    v_sessions+v_extra+v_external,
    v_sum,
    v_avg,
    v_rpe,
    COALESCE(v_acwr.acwr,0),
    COALESCE(v_acwr.status,'insufficient_data'),
    v_fatigue,
    ROUND(v_velocity_drop,2),
    v_trend;
END;
$$;
