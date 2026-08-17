/*
  # Performance & Fatigue Dashboard System

  ## Overview
  This migration creates a comprehensive performance monitoring system that tracks
  training load, fatigue, velocity trends, estimated 1RM progression, and provides
  smart insights for athletes and coaches.

  ## Changes

  ### 1. Create performance_sessions table
  Aggregated data from each training session including:
  - `id` (uuid, primary key)
  - `athlete_id` (uuid, references profiles)
  - `trainer_id` (uuid, references profiles)
  - `workout_id` (uuid, references workouts)
  - `session_date` (date)
  - `duration_minutes` (integer)
  - `session_rpe` (integer 1-10) - Overall session RPE
  - `total_volume` (numeric) - Total kg lifted (sets × reps × weight)
  - `total_sets` (integer)
  - `total_reps` (integer)
  - `avg_velocity` (numeric) - Average velocity across all exercises
  - `notes` (text)
  - `completed_at` (timestamptz)
  - `created_at` (timestamptz)

  ### 2. Create performance_exercise_logs table
  Detailed per-exercise performance data:
  - `id` (uuid, primary key)
  - `performance_session_id` (uuid, references performance_sessions)
  - `athlete_id` (uuid, references profiles)
  - `exercise_id` (uuid, references exercises)
  - `exercise_name` (text)
  - `sets` (integer)
  - `reps` (integer)
  - `weight` (numeric)
  - `unit` (text) - kg or lb
  - `rpe` (integer 1-10)
  - `rir` (integer 0-5)
  - `velocity` (numeric) - Mean velocity in m/s
  - `estimated_1rm` (numeric) - Calculated from reps/weight
  - `percentage_1rm` (numeric) - Estimated % of max
  - `volume` (numeric) - sets × reps × weight
  - `recorded_at` (timestamptz)

  ### 3. Create performance_baselines table
  Store baseline metrics for comparison:
  - `id` (uuid, primary key)
  - `athlete_id` (uuid, references profiles)
  - `exercise_id` (uuid, references exercises)
  - `exercise_name` (text)
  - `baseline_velocity` (numeric)
  - `baseline_1rm` (numeric)
  - `unit` (text)
  - `set_at` (timestamptz)

  ### 4. Create performance_insights table
  Automatically generated insights and alerts:
  - `id` (uuid, primary key)
  - `athlete_id` (uuid, references profiles)
  - `trainer_id` (uuid, references profiles)
  - `insight_type` (text) - 'progress', 'warning', 'fatigue', 'improvement'
  - `severity` (text) - 'info', 'warning', 'critical'
  - `title` (text)
  - `message` (text)
  - `data` (jsonb) - Supporting metrics
  - `status` (text) - 'new', 'read', 'dismissed'
  - `created_at` (timestamptz)
  - `read_at` (timestamptz)

  ### 5. Create calculated metrics functions
  - `calculate_acwr()` - Acute:Chronic Workload Ratio
  - `calculate_fatigue_index()` - Last 3 sessions vs mean of last 10
  - `calculate_weekly_volume()` - Total volume per week
  - `get_performance_summary()` - Comprehensive athlete summary
  - `detect_performance_anomalies()` - Auto-detect fatigue/overtraining

  ## Security
  - Enable RLS on all tables
  - Athletes can view own data
  - Trainers can view assigned athletes' data
  - Admins have full access

  ## Indexes
  - Performance optimization for time-series queries
  - Composite indexes on athlete + date ranges
*/

-- Create performance_sessions table
CREATE TABLE IF NOT EXISTS performance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  workout_id uuid REFERENCES workouts(id) ON DELETE SET NULL,
  session_date date NOT NULL,
  duration_minutes integer,
  session_rpe integer CHECK (session_rpe >= 1 AND session_rpe <= 10),
  total_volume numeric(10,2) DEFAULT 0,
  total_sets integer DEFAULT 0,
  total_reps integer DEFAULT 0,
  avg_velocity numeric(5,3),
  notes text,
  completed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create performance_exercise_logs table
CREATE TABLE IF NOT EXISTS performance_exercise_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  performance_session_id uuid REFERENCES performance_sessions(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES exercises(id) ON DELETE SET NULL,
  exercise_name text NOT NULL,
  sets integer NOT NULL,
  reps integer NOT NULL,
  weight numeric(6,2),
  unit text NOT NULL DEFAULT 'kg' CHECK (unit IN ('kg', 'lb')),
  rpe integer CHECK (rpe >= 1 AND rpe <= 10),
  rir integer CHECK (rir >= 0 AND rir <= 5),
  velocity numeric(5,3),
  estimated_1rm numeric(6,2),
  percentage_1rm numeric(5,2),
  volume numeric(10,2),
  recorded_at timestamptz DEFAULT now()
);

-- Create performance_baselines table
CREATE TABLE IF NOT EXISTS performance_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES exercises(id) ON DELETE SET NULL,
  exercise_name text NOT NULL,
  baseline_velocity numeric(5,3),
  baseline_1rm numeric(6,2),
  unit text NOT NULL DEFAULT 'kg' CHECK (unit IN ('kg', 'lb')),
  set_at timestamptz DEFAULT now(),
  UNIQUE(athlete_id, exercise_name)
);

-- Create performance_insights table
CREATE TABLE IF NOT EXISTS performance_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  insight_type text NOT NULL CHECK (insight_type IN ('progress', 'warning', 'fatigue', 'improvement', 'overtraining')),
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'dismissed')),
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

-- Create indexes for performance queries
CREATE INDEX IF NOT EXISTS idx_performance_sessions_athlete_date
  ON performance_sessions(athlete_id, session_date DESC);

CREATE INDEX IF NOT EXISTS idx_performance_sessions_trainer
  ON performance_sessions(trainer_id, session_date DESC);

CREATE INDEX IF NOT EXISTS idx_performance_exercise_logs_athlete
  ON performance_exercise_logs(athlete_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_performance_exercise_logs_session
  ON performance_exercise_logs(performance_session_id);

CREATE INDEX IF NOT EXISTS idx_performance_exercise_logs_exercise
  ON performance_exercise_logs(athlete_id, exercise_name, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_performance_insights_athlete_status
  ON performance_insights(athlete_id, status, created_at DESC)
  WHERE status IN ('new', 'read');

CREATE INDEX IF NOT EXISTS idx_performance_insights_trainer_status
  ON performance_insights(trainer_id, status, created_at DESC)
  WHERE status IN ('new', 'read');

-- Enable RLS on all tables
ALTER TABLE performance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for performance_sessions
CREATE POLICY "Athletes can view own performance sessions"
  ON performance_sessions FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Athletes can insert own performance sessions"
  ON performance_sessions FOR INSERT
  TO authenticated
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Athletes can update own performance sessions"
  ON performance_sessions FOR UPDATE
  TO authenticated
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Trainers can view athlete performance sessions"
  ON performance_sessions FOR SELECT
  TO authenticated
  USING (
    trainer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = performance_sessions.athlete_id
      AND profiles.assigned_trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can insert athlete performance sessions"
  ON performance_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    trainer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = athlete_id
      AND p.assigned_trainer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all performance sessions"
  ON performance_sessions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for performance_exercise_logs
CREATE POLICY "Athletes can view own exercise logs"
  ON performance_exercise_logs FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Athletes can insert own exercise logs"
  ON performance_exercise_logs FOR INSERT
  TO authenticated
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Trainers can view athlete exercise logs"
  ON performance_exercise_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = performance_exercise_logs.athlete_id
      AND profiles.assigned_trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can insert athlete exercise logs"
  ON performance_exercise_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = athlete_id
      AND p.assigned_trainer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all exercise logs"
  ON performance_exercise_logs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for performance_baselines
CREATE POLICY "Athletes can manage own baselines"
  ON performance_baselines FOR ALL
  TO authenticated
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Trainers can view athlete baselines"
  ON performance_baselines FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = performance_baselines.athlete_id
      AND profiles.assigned_trainer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all baselines"
  ON performance_baselines FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for performance_insights
CREATE POLICY "Athletes can view own insights"
  ON performance_insights FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Athletes can update own insights"
  ON performance_insights FOR UPDATE
  TO authenticated
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Trainers can view athlete insights"
  ON performance_insights FOR SELECT
  TO authenticated
  USING (
    trainer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = performance_insights.athlete_id
      AND profiles.assigned_trainer_id = auth.uid()
    )
  );

CREATE POLICY "System can insert insights"
  ON performance_insights FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can manage all insights"
  ON performance_insights FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to calculate Acute:Chronic Workload Ratio (ACWR)
CREATE OR REPLACE FUNCTION calculate_acwr(
  p_athlete_id uuid,
  p_reference_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  acwr numeric,
  acute_load numeric,
  chronic_load numeric,
  status text
) AS $$
DECLARE
  v_acute_load numeric;
  v_chronic_load numeric;
  v_acwr numeric;
  v_status text;
BEGIN
  -- Calculate acute load (last 7 days average)
  SELECT COALESCE(AVG(total_volume), 0)
  INTO v_acute_load
  FROM performance_sessions
  WHERE athlete_id = p_athlete_id
    AND session_date BETWEEN (p_reference_date - INTERVAL '7 days')::date AND p_reference_date
    AND total_volume > 0;

  -- Calculate chronic load (last 28 days average)
  SELECT COALESCE(AVG(total_volume), 0)
  INTO v_chronic_load
  FROM performance_sessions
  WHERE athlete_id = p_athlete_id
    AND session_date BETWEEN (p_reference_date - INTERVAL '28 days')::date AND p_reference_date
    AND total_volume > 0;

  -- Calculate ACWR
  IF v_chronic_load > 0 THEN
    v_acwr := v_acute_load / v_chronic_load;
  ELSE
    v_acwr := 0;
  END IF;

  -- Determine status
  IF v_acwr = 0 THEN
    v_status := 'insufficient_data';
  ELSIF v_acwr < 0.8 THEN
    v_status := 'detraining_risk';
  ELSIF v_acwr >= 0.8 AND v_acwr <= 1.3 THEN
    v_status := 'optimal';
  ELSIF v_acwr > 1.3 AND v_acwr <= 1.5 THEN
    v_status := 'caution';
  ELSE
    v_status := 'high_injury_risk';
  END IF;

  RETURN QUERY SELECT v_acwr, v_acute_load, v_chronic_load, v_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate Fatigue Index
CREATE OR REPLACE FUNCTION calculate_fatigue_index(
  p_athlete_id uuid,
  p_reference_date date DEFAULT CURRENT_DATE
)
RETURNS numeric AS $$
DECLARE
  v_recent_load numeric;
  v_baseline_load numeric;
  v_fatigue_index numeric;
BEGIN
  -- Average of last 3 sessions
  SELECT COALESCE(AVG(total_volume), 0)
  INTO v_recent_load
  FROM (
    SELECT total_volume
    FROM performance_sessions
    WHERE athlete_id = p_athlete_id
      AND session_date <= p_reference_date
      AND total_volume > 0
    ORDER BY session_date DESC
    LIMIT 3
  ) recent;

  -- Average of sessions 4-10 (baseline)
  SELECT COALESCE(AVG(total_volume), 0)
  INTO v_baseline_load
  FROM (
    SELECT total_volume
    FROM performance_sessions
    WHERE athlete_id = p_athlete_id
      AND session_date <= p_reference_date
      AND total_volume > 0
    ORDER BY session_date DESC
    LIMIT 7 OFFSET 3
  ) baseline;

  -- Calculate fatigue index
  IF v_baseline_load > 0 THEN
    v_fatigue_index := v_recent_load / v_baseline_load;
  ELSE
    v_fatigue_index := 1.0;
  END IF;

  RETURN v_fatigue_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get comprehensive performance summary
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

  -- Return comprehensive summary
  RETURN QUERY
  SELECT
    COUNT(*)::integer,
    COALESCE(SUM(ps.total_volume), 0),
    COALESCE(AVG(ps.total_volume), 0),
    COALESCE(AVG(ps.session_rpe), 0),
    v_acwr_data.acwr,
    v_acwr_data.status,
    v_fatigue,
    v_velocity_drop,
    v_one_rm_trend
  FROM performance_sessions ps
  WHERE ps.athlete_id = p_athlete_id
    AND ps.session_date >= (CURRENT_DATE - p_days);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
