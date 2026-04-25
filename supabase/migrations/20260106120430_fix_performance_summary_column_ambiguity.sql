/*
  # Fix Column Name Ambiguity in get_performance_summary

  ## Problem
  Function fails with "column reference 'total_volume' is ambiguous" error
  because variable names conflict with column names in performance_sessions table.

  ## Solution
  - Rename all local variables to have v_ prefix consistently
  - Explicitly qualify column names in SQL queries where needed
  - Ensure no naming conflicts between variables and columns

  ## Impact
  - Function will execute successfully without ambiguity errors
  - Athletes will see their performance data correctly
*/

DROP FUNCTION IF EXISTS get_performance_summary(uuid, integer);

CREATE OR REPLACE FUNCTION get_performance_summary(
  p_athlete_id uuid,
  p_days integer DEFAULT 28
)
RETURNS TABLE (
  total_sessions integer,
  total_volume numeric,
  avg_session_volume numeric,
  avg_session_rpe numeric,
  acwr numeric,
  acwr_status text,
  fatigue_index numeric,
  velocity_drop_pct numeric,
  one_rm_trend_pct numeric
) AS $$
DECLARE
  v_acwr_data record;
  v_fatigue numeric;
  v_velocity_recent numeric;
  v_velocity_baseline numeric;
  v_velocity_drop numeric;
  v_one_rm_recent numeric;
  v_one_rm_previous numeric;
  v_one_rm_trend numeric;
  v_performance_sessions_count integer;
  v_extra_sessions_count integer;
  v_external_sessions_count integer;
  v_sum_volume numeric;
  v_avg_volume numeric;
  v_avg_rpe numeric;
BEGIN
  -- Get ACWR data
  SELECT * INTO v_acwr_data
  FROM calculate_acwr(p_athlete_id);

  -- Get fatigue index
  v_fatigue := calculate_fatigue_index(p_athlete_id);

  -- Calculate velocity drop
  SELECT COALESCE(AVG(velocity), 0) INTO v_velocity_recent
  FROM performance_exercise_logs
  WHERE athlete_id = p_athlete_id
    AND recorded_at >= (CURRENT_DATE - INTERVAL '7 days')
    AND velocity IS NOT NULL;

  SELECT COALESCE(pb.baseline_velocity, 0) INTO v_velocity_baseline
  FROM performance_baselines pb
  WHERE pb.athlete_id = p_athlete_id
  LIMIT 1;

  IF v_velocity_baseline > 0 THEN
    v_velocity_drop := ((v_velocity_baseline - v_velocity_recent) / v_velocity_baseline) * 100;
  ELSE
    v_velocity_drop := 0;
  END IF;

  -- Calculate 1RM trend
  SELECT COALESCE(AVG(estimated_1rm), 0) INTO v_one_rm_recent
  FROM (
    SELECT estimated_1rm
    FROM performance_exercise_logs
    WHERE athlete_id = p_athlete_id
      AND estimated_1rm IS NOT NULL
      AND recorded_at >= (CURRENT_DATE - INTERVAL '7 days')
    LIMIT 10
  ) recent;

  SELECT COALESCE(AVG(estimated_1rm), 0) INTO v_one_rm_previous
  FROM (
    SELECT estimated_1rm
    FROM performance_exercise_logs
    WHERE athlete_id = p_athlete_id
      AND estimated_1rm IS NOT NULL
      AND recorded_at BETWEEN (CURRENT_DATE - INTERVAL '21 days') AND (CURRENT_DATE - INTERVAL '14 days')
    LIMIT 10
  ) previous;

  IF v_one_rm_previous > 0 THEN
    v_one_rm_trend := ((v_one_rm_recent - v_one_rm_previous) / v_one_rm_previous) * 100;
  ELSE
    v_one_rm_trend := 0;
  END IF;

  -- Count performance sessions and calculate volume/RPE
  SELECT 
    COALESCE(COUNT(*)::integer, 0),
    COALESCE(SUM(ps.total_volume), 0),
    COALESCE(AVG(ps.total_volume), 0),
    COALESCE(AVG(ps.session_rpe), 0)
  INTO 
    v_performance_sessions_count,
    v_sum_volume,
    v_avg_volume,
    v_avg_rpe
  FROM performance_sessions ps
  WHERE ps.athlete_id = p_athlete_id
    AND ps.session_date >= (CURRENT_DATE - p_days);

  -- Count extra training sessions
  SELECT COALESCE(COUNT(*)::integer, 0) INTO v_extra_sessions_count
  FROM extra_training_logs
  WHERE athlete_id = p_athlete_id
    AND training_date >= (CURRENT_DATE - p_days);

  -- Count external activities
  SELECT COALESCE(COUNT(*)::integer, 0) INTO v_external_sessions_count
  FROM external_activities
  WHERE user_id = p_athlete_id
    AND is_deleted = false
    AND start_time >= (CURRENT_DATE - p_days);

  -- Always return exactly one row
  RETURN QUERY
  SELECT
    (v_performance_sessions_count + v_extra_sessions_count + v_external_sessions_count)::integer,
    v_sum_volume,
    v_avg_volume,
    v_avg_rpe,
    COALESCE(v_acwr_data.acwr, 0),
    COALESCE(v_acwr_data.status, 'insufficient_data'),
    COALESCE(v_fatigue, 0),
    COALESCE(v_velocity_drop, 0),
    COALESCE(v_one_rm_trend, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
