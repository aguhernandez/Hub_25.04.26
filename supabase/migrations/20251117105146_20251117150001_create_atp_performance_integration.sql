/*
  # ATP + Performance Integration System

  1. New Tables
    - `atp_weekly_aggregates` - Weekly actual performance vs planned
    - `atp_compliance_alerts` - Alerts for under/over training
    
  2. Functions
    - `calculate_weekly_compliance()` - Compare planned vs actual
    - `generate_compliance_alerts()` - Create alerts based on thresholds
    
  3. Security
    - RLS enabled on all tables
    - Athletes see own data
    - Trainers see assigned athletes
    - Admins see all
*/

-- Weekly aggregates table (actual performance data)
CREATE TABLE IF NOT EXISTS atp_weekly_aggregates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atp_id uuid REFERENCES annual_training_plans(id) ON DELETE CASCADE NOT NULL,
  athlete_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  week_number int NOT NULL,
  week_start_date date NOT NULL,
  week_end_date date NOT NULL,
  
  -- Planned values (from ATP)
  planned_sessions int DEFAULT 0,
  planned_tonnage numeric DEFAULT 0,
  
  -- Actual values (from training logs)
  actual_sessions int DEFAULT 0,
  actual_tonnage numeric DEFAULT 0,
  actual_sets int DEFAULT 0,
  actual_reps int DEFAULT 0,
  avg_rpe numeric,
  
  -- Compliance metrics
  compliance_percentage numeric GENERATED ALWAYS AS (
    CASE 
      WHEN planned_sessions > 0 THEN (actual_sessions::numeric / planned_sessions * 100)
      ELSE 100
    END
  ) STORED,
  tonnage_compliance_percentage numeric GENERATED ALWAYS AS (
    CASE 
      WHEN planned_tonnage > 0 THEN (actual_tonnage / planned_tonnage * 100)
      ELSE 100
    END
  ) STORED,
  
  -- Status indicators
  status text CHECK (status IN ('not_started', 'under_planned', 'on_track', 'over_planned', 'completed')),
  
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(atp_id, week_number)
);

-- Compliance alerts table
CREATE TABLE IF NOT EXISTS atp_compliance_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  trainer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  atp_id uuid REFERENCES annual_training_plans(id) ON DELETE CASCADE NOT NULL,
  week_number int NOT NULL,
  alert_type text CHECK (alert_type IN ('under_training', 'over_training', 'missed_sessions', 'excellent_compliance', 'milestone_reached')) NOT NULL,
  severity text CHECK (severity IN ('info', 'warning', 'critical')) DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL,
  data jsonb,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE atp_weekly_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE atp_compliance_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for atp_weekly_aggregates
CREATE POLICY "Athletes view own aggregates"
  ON atp_weekly_aggregates FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Trainers view assigned athletes aggregates"
  ON atp_weekly_aggregates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM annual_training_plans atp
      WHERE atp.id = atp_weekly_aggregates.atp_id
      AND atp.coach_id = auth.uid()
    )
  );

CREATE POLICY "Admins view all aggregates"
  ON atp_weekly_aggregates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "System can insert aggregates"
  ON atp_weekly_aggregates FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update aggregates"
  ON atp_weekly_aggregates FOR UPDATE
  TO authenticated
  USING (true);

-- RLS Policies for atp_compliance_alerts
CREATE POLICY "Athletes view own alerts"
  ON atp_compliance_alerts FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Trainers view assigned athletes alerts"
  ON atp_compliance_alerts FOR SELECT
  TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "Admins view all alerts"
  ON atp_compliance_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "System can create alerts"
  ON atp_compliance_alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can mark alerts as read"
  ON atp_compliance_alerts FOR UPDATE
  TO authenticated
  USING (athlete_id = auth.uid() OR trainer_id = auth.uid());

-- Function to calculate weekly compliance
CREATE OR REPLACE FUNCTION calculate_weekly_compliance(
  p_atp_id uuid,
  p_week_number int
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_athlete_id uuid;
  v_week_start date;
  v_week_end date;
  v_planned_sessions int;
  v_planned_tonnage numeric;
  v_actual_sessions int;
  v_actual_tonnage numeric;
  v_actual_sets int;
  v_actual_reps int;
  v_avg_rpe numeric;
  v_status text;
BEGIN
  -- Get ATP details and planned values
  SELECT 
    atp.athlete_id,
    wl.start_date,
    wl.end_date,
    wl.num_sessions,
    wl.estimated_load
  INTO 
    v_athlete_id,
    v_week_start,
    v_week_end,
    v_planned_sessions,
    v_planned_tonnage
  FROM annual_training_plans atp
  JOIN atp_weekly_loads wl ON wl.atp_id = atp.id
  WHERE atp.id = p_atp_id
  AND wl.week_number = p_week_number;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Calculate actual values from performance_sessions
  SELECT 
    COUNT(DISTINCT ps.id),
    COALESCE(SUM(ps.total_volume), 0),
    COALESCE(SUM(ps.total_sets), 0),
    COALESCE(SUM(ps.total_reps), 0),
    AVG(ps.session_rpe)
  INTO
    v_actual_sessions,
    v_actual_tonnage,
    v_actual_sets,
    v_actual_reps,
    v_avg_rpe
  FROM performance_sessions ps
  WHERE ps.athlete_id = v_athlete_id
  AND ps.session_date >= v_week_start
  AND ps.session_date <= v_week_end;

  -- Determine status
  IF v_actual_sessions = 0 THEN
    v_status := 'not_started';
  ELSIF v_actual_sessions < v_planned_sessions * 0.7 THEN
    v_status := 'under_planned';
  ELSIF v_actual_sessions > v_planned_sessions * 1.4 THEN
    v_status := 'over_planned';
  ELSIF CURRENT_DATE > v_week_end THEN
    v_status := 'completed';
  ELSE
    v_status := 'on_track';
  END IF;

  -- Upsert aggregate
  INSERT INTO atp_weekly_aggregates (
    atp_id,
    athlete_id,
    week_number,
    week_start_date,
    week_end_date,
    planned_sessions,
    planned_tonnage,
    actual_sessions,
    actual_tonnage,
    actual_sets,
    actual_reps,
    avg_rpe,
    status,
    last_updated
  )
  VALUES (
    p_atp_id,
    v_athlete_id,
    p_week_number,
    v_week_start,
    v_week_end,
    v_planned_sessions,
    v_planned_tonnage,
    v_actual_sessions,
    v_actual_tonnage,
    v_actual_sets,
    v_actual_reps,
    v_avg_rpe,
    v_status,
    now()
  )
  ON CONFLICT (atp_id, week_number)
  DO UPDATE SET
    actual_sessions = EXCLUDED.actual_sessions,
    actual_tonnage = EXCLUDED.actual_tonnage,
    actual_sets = EXCLUDED.actual_sets,
    actual_reps = EXCLUDED.actual_reps,
    avg_rpe = EXCLUDED.avg_rpe,
    status = EXCLUDED.status,
    last_updated = now();

END;
$$;

-- Function to generate compliance alerts
CREATE OR REPLACE FUNCTION generate_compliance_alerts(
  p_atp_id uuid,
  p_week_number int
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_aggregate RECORD;
  v_trainer_id uuid;
  v_alert_exists boolean;
BEGIN
  -- Get aggregate data
  SELECT * INTO v_aggregate
  FROM atp_weekly_aggregates
  WHERE atp_id = p_atp_id
  AND week_number = p_week_number;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Get trainer ID
  SELECT coach_id INTO v_trainer_id
  FROM annual_training_plans
  WHERE id = p_atp_id;

  -- Check for under-training (< 70% compliance)
  IF v_aggregate.compliance_percentage < 70 AND v_aggregate.actual_sessions > 0 THEN
    SELECT EXISTS(
      SELECT 1 FROM atp_compliance_alerts
      WHERE atp_id = p_atp_id
      AND week_number = p_week_number
      AND alert_type = 'under_training'
    ) INTO v_alert_exists;

    IF NOT v_alert_exists THEN
      INSERT INTO atp_compliance_alerts (
        athlete_id,
        trainer_id,
        atp_id,
        week_number,
        alert_type,
        severity,
        title,
        message,
        data
      ) VALUES (
        v_aggregate.athlete_id,
        v_trainer_id,
        p_atp_id,
        p_week_number,
        'under_training',
        'warning',
        'Below Planned Volume',
        format('Week %s: Only %s%% of planned sessions completed (%s of %s sessions)',
          p_week_number,
          ROUND(v_aggregate.compliance_percentage),
          v_aggregate.actual_sessions,
          v_aggregate.planned_sessions
        ),
        jsonb_build_object(
          'compliance', v_aggregate.compliance_percentage,
          'actual_sessions', v_aggregate.actual_sessions,
          'planned_sessions', v_aggregate.planned_sessions
        )
      );
    END IF;
  END IF;

  -- Check for over-training (> 140% compliance)
  IF v_aggregate.compliance_percentage > 140 THEN
    SELECT EXISTS(
      SELECT 1 FROM atp_compliance_alerts
      WHERE atp_id = p_atp_id
      AND week_number = p_week_number
      AND alert_type = 'over_training'
    ) INTO v_alert_exists;

    IF NOT v_alert_exists THEN
      INSERT INTO atp_compliance_alerts (
        athlete_id,
        trainer_id,
        atp_id,
        week_number,
        alert_type,
        severity,
        title,
        message,
        data
      ) VALUES (
        v_aggregate.athlete_id,
        v_trainer_id,
        p_atp_id,
        p_week_number,
        'over_training',
        'critical',
        'Potential Overload',
        format('Week %s: Training volume at %s%% of plan (%s of %s sessions) - risk of overtraining',
          p_week_number,
          ROUND(v_aggregate.compliance_percentage),
          v_aggregate.actual_sessions,
          v_aggregate.planned_sessions
        ),
        jsonb_build_object(
          'compliance', v_aggregate.compliance_percentage,
          'actual_sessions', v_aggregate.actual_sessions,
          'planned_sessions', v_aggregate.planned_sessions
        )
      );
    END IF;
  END IF;

  -- Check for excellent compliance (95-105%)
  IF v_aggregate.compliance_percentage BETWEEN 95 AND 105 AND v_aggregate.status = 'completed' THEN
    SELECT EXISTS(
      SELECT 1 FROM atp_compliance_alerts
      WHERE atp_id = p_atp_id
      AND week_number = p_week_number
      AND alert_type = 'excellent_compliance'
    ) INTO v_alert_exists;

    IF NOT v_alert_exists THEN
      INSERT INTO atp_compliance_alerts (
        athlete_id,
        trainer_id,
        atp_id,
        week_number,
        alert_type,
        severity,
        title,
        message,
        data
      ) VALUES (
        v_aggregate.athlete_id,
        v_trainer_id,
        p_atp_id,
        p_week_number,
        'excellent_compliance',
        'info',
        'Perfect Week!',
        format('Week %s completed at %s%% compliance - excellent adherence to plan',
          p_week_number,
          ROUND(v_aggregate.compliance_percentage)
        ),
        jsonb_build_object(
          'compliance', v_aggregate.compliance_percentage
        )
      );
    END IF;
  END IF;

END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_atp_weekly_aggregates_athlete ON atp_weekly_aggregates(athlete_id);
CREATE INDEX IF NOT EXISTS idx_atp_weekly_aggregates_atp_week ON atp_weekly_aggregates(atp_id, week_number);
CREATE INDEX IF NOT EXISTS idx_atp_compliance_alerts_athlete ON atp_compliance_alerts(athlete_id);
CREATE INDEX IF NOT EXISTS idx_atp_compliance_alerts_unread ON atp_compliance_alerts(athlete_id, read) WHERE read = false;
