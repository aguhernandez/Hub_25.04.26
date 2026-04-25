/*
  # Create Annual Training Planner (ATP) System

  Complete system for yearly periodization planning for strength and gym athletes.

  ## Tables Created
  - annual_training_plans: Main ATP records
  - atp_macrocycles: Training phases (General Prep, Specific Prep, Competition, etc.)
  - atp_weekly_loads: Weekly training load and focus data
  - atp_events: Important events, tests, competitions

  ## Features
  - Macrocycle visualization with color coding
  - Weekly load planning and tracking
  - Event markers (tests, competitions, camps)
  - Load curve analytics
  - Link to weekly workout plans
*/

-- Create annual_training_plans table
CREATE TABLE IF NOT EXISTS annual_training_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  coach_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  year integer NOT NULL,
  title text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT athlete_or_team_required CHECK (
    (athlete_id IS NOT NULL AND team_id IS NULL) OR
    (athlete_id IS NULL AND team_id IS NOT NULL)
  )
);

-- Unique index for one active ATP per athlete per year
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_atp_per_athlete_year
  ON annual_training_plans(athlete_id, year)
  WHERE is_active = true;

-- Create atp_macrocycles table
CREATE TABLE IF NOT EXISTS atp_macrocycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atp_id uuid REFERENCES annual_training_plans(id) ON DELETE CASCADE NOT NULL,
  phase_type text NOT NULL CHECK (phase_type IN (
    'general_prep',
    'specific_prep',
    'pre_comp',
    'competition',
    'transition'
  )),
  start_week integer NOT NULL CHECK (start_week BETWEEN 1 AND 52),
  end_week integer NOT NULL CHECK (end_week BETWEEN 1 AND 52),
  title text,
  description text,
  color text DEFAULT '#3b82f6',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_week_range CHECK (start_week <= end_week)
);

-- Create atp_weekly_loads table
CREATE TABLE IF NOT EXISTS atp_weekly_loads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atp_id uuid REFERENCES annual_training_plans(id) ON DELETE CASCADE NOT NULL,
  week_number integer NOT NULL CHECK (week_number BETWEEN 1 AND 52),
  start_date date NOT NULL,
  end_date date NOT NULL,
  focus text,
  estimated_load numeric(10, 2) DEFAULT 0,
  relative_load_percent numeric(5, 2),
  num_sessions integer DEFAULT 0,
  key_exercises text[],
  notes text,
  has_plan boolean DEFAULT false,
  actual_load numeric(10, 2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(atp_id, week_number)
);

-- Create atp_events table
CREATE TABLE IF NOT EXISTS atp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atp_id uuid REFERENCES annual_training_plans(id) ON DELETE CASCADE NOT NULL,
  week_number integer NOT NULL CHECK (week_number BETWEEN 1 AND 52),
  event_date date NOT NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'test',
    'competition',
    'camp',
    'deload',
    'custom'
  )),
  title text NOT NULL,
  description text,
  icon text DEFAULT '📌',
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_atp_athlete_year ON annual_training_plans(athlete_id, year);
CREATE INDEX IF NOT EXISTS idx_atp_team_year ON annual_training_plans(team_id, year);
CREATE INDEX IF NOT EXISTS idx_atp_coach ON annual_training_plans(coach_id);
CREATE INDEX IF NOT EXISTS idx_atp_macrocycles_atp ON atp_macrocycles(atp_id);
CREATE INDEX IF NOT EXISTS idx_atp_weekly_loads_atp ON atp_weekly_loads(atp_id);
CREATE INDEX IF NOT EXISTS idx_atp_weekly_loads_week ON atp_weekly_loads(week_number);
CREATE INDEX IF NOT EXISTS idx_atp_events_atp ON atp_events(atp_id);
CREATE INDEX IF NOT EXISTS idx_atp_events_week ON atp_events(week_number);

-- Enable RLS
ALTER TABLE annual_training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE atp_macrocycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE atp_weekly_loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE atp_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for annual_training_plans

CREATE POLICY "Coaches can view ATPs for their athletes"
  ON annual_training_plans FOR SELECT
  TO authenticated
  USING (
    coach_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'trainer')
      AND (
        annual_training_plans.athlete_id IN (
          SELECT id FROM profiles WHERE assigned_trainer_id = auth.uid()
        )
        OR
        annual_training_plans.team_id IN (
          SELECT team_id FROM team_members WHERE athlete_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Athletes can view their own ATPs"
  ON annual_training_plans FOR SELECT
  TO authenticated
  USING (
    athlete_id = auth.uid() OR
    team_id IN (
      SELECT team_id FROM team_members WHERE athlete_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can create ATPs"
  ON annual_training_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    coach_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer')
    )
  );

CREATE POLICY "Coaches can update their ATPs"
  ON annual_training_plans FOR UPDATE
  TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Coaches can delete their ATPs"
  ON annual_training_plans FOR DELETE
  TO authenticated
  USING (coach_id = auth.uid());

CREATE POLICY "Admins can manage all ATPs"
  ON annual_training_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for atp_macrocycles

CREATE POLICY "Users can view macrocycles of accessible ATPs"
  ON atp_macrocycles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM annual_training_plans
      WHERE id = atp_macrocycles.atp_id
      AND (
        coach_id = auth.uid() OR
        athlete_id = auth.uid() OR
        team_id IN (SELECT team_id FROM team_members WHERE athlete_id = auth.uid())
      )
    )
  );

CREATE POLICY "Coaches can manage macrocycles of their ATPs"
  ON atp_macrocycles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM annual_training_plans
      WHERE id = atp_macrocycles.atp_id
      AND coach_id = auth.uid()
    )
  );

-- RLS Policies for atp_weekly_loads

CREATE POLICY "Users can view weekly loads of accessible ATPs"
  ON atp_weekly_loads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM annual_training_plans
      WHERE id = atp_weekly_loads.atp_id
      AND (
        coach_id = auth.uid() OR
        athlete_id = auth.uid() OR
        team_id IN (SELECT team_id FROM team_members WHERE athlete_id = auth.uid())
      )
    )
  );

CREATE POLICY "Coaches can manage weekly loads of their ATPs"
  ON atp_weekly_loads FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM annual_training_plans
      WHERE id = atp_weekly_loads.atp_id
      AND coach_id = auth.uid()
    )
  );

-- RLS Policies for atp_events

CREATE POLICY "Users can view events of accessible ATPs"
  ON atp_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM annual_training_plans
      WHERE id = atp_events.atp_id
      AND (
        coach_id = auth.uid() OR
        athlete_id = auth.uid() OR
        team_id IN (SELECT team_id FROM team_members WHERE athlete_id = auth.uid())
      )
    )
  );

CREATE POLICY "Coaches can manage events of their ATPs"
  ON atp_events FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM annual_training_plans
      WHERE id = atp_events.atp_id
      AND coach_id = auth.uid()
    )
  );

-- Comments
COMMENT ON TABLE annual_training_plans IS 'Annual training plans for athletes and teams';
COMMENT ON TABLE atp_macrocycles IS 'Training phase definitions (macrocycles) within ATPs';
COMMENT ON TABLE atp_weekly_loads IS 'Weekly load and planning data for each week in ATP';
COMMENT ON TABLE atp_events IS 'Important events, tests, and competitions marked on ATP timeline';

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_atp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS update_annual_training_plans_updated_at ON annual_training_plans;
CREATE TRIGGER update_annual_training_plans_updated_at
  BEFORE UPDATE ON annual_training_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_atp_updated_at();

DROP TRIGGER IF EXISTS update_atp_weekly_loads_updated_at ON atp_weekly_loads;
CREATE TRIGGER update_atp_weekly_loads_updated_at
  BEFORE UPDATE ON atp_weekly_loads
  FOR EACH ROW
  EXECUTE FUNCTION update_atp_updated_at();
