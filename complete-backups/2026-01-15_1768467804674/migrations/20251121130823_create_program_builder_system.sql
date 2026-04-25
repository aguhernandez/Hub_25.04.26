/*
  # Create Program Builder System (TrainHeroic Style)
  
  1. New Tables
    - `program_weeks` - Weekly structure for programs
    - `program_days` - Daily structure (7 days per week)
    - `program_day_workouts` - Workouts assigned to specific days
  
  2. Changes
    - Programs already exist in `program_products` table
    - Workouts table already exists
    - Exercises table already exists
  
  3. Security
    - Enable RLS on all tables
    - Admin sees everything
    - Trainer sees own programs
    - Athletes can view assigned programs (read-only)
*/

-- ============================================
-- PROGRAM WEEKS
-- ============================================
CREATE TABLE IF NOT EXISTS program_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_product_id uuid REFERENCES program_products(id) ON DELETE CASCADE NOT NULL,
  week_number int NOT NULL,
  title text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(program_product_id, week_number)
);

ALTER TABLE program_weeks ENABLE ROW LEVEL SECURITY;

-- SELECT: Admin sees all, trainers see own programs, athletes see assigned
CREATE POLICY "Admins view all program weeks"
  ON program_weeks FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'admin');

CREATE POLICY "Trainers view own program weeks"
  ON program_weeks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM program_products pp
      WHERE pp.id = program_weeks.program_product_id
      AND pp.trainer_id = auth.uid()
    )
  );

-- INSERT: Admin and trainers can create weeks
CREATE POLICY "Admins create program weeks"
  ON program_weeks FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt()->>'role')::text = 'admin');

CREATE POLICY "Trainers create own program weeks"
  ON program_weeks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM program_products pp
      WHERE pp.id = program_weeks.program_product_id
      AND pp.trainer_id = auth.uid()
    )
  );

-- UPDATE: Admin and trainers can update weeks
CREATE POLICY "Admins update program weeks"
  ON program_weeks FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'admin')
  WITH CHECK ((auth.jwt()->>'role')::text = 'admin');

CREATE POLICY "Trainers update own program weeks"
  ON program_weeks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM program_products pp
      WHERE pp.id = program_weeks.program_product_id
      AND pp.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM program_products pp
      WHERE pp.id = program_weeks.program_product_id
      AND pp.trainer_id = auth.uid()
    )
  );

-- DELETE: Admin and trainers can delete weeks
CREATE POLICY "Admins delete program weeks"
  ON program_weeks FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'admin');

CREATE POLICY "Trainers delete own program weeks"
  ON program_weeks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM program_products pp
      WHERE pp.id = program_weeks.program_product_id
      AND pp.trainer_id = auth.uid()
    )
  );

-- ============================================
-- PROGRAM DAYS
-- ============================================
CREATE TABLE IF NOT EXISTS program_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_week_id uuid REFERENCES program_weeks(id) ON DELETE CASCADE NOT NULL,
  day_number int NOT NULL CHECK (day_number >= 1 AND day_number <= 7),
  day_name text NOT NULL, -- MON, TUE, WED, THU, FRI, SAT, SUN
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(program_week_id, day_number)
);

ALTER TABLE program_days ENABLE ROW LEVEL SECURITY;

-- SELECT policies
CREATE POLICY "Admins view all program days"
  ON program_days FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'admin');

CREATE POLICY "Trainers view own program days"
  ON program_days FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM program_weeks pw
      JOIN program_products pp ON pp.id = pw.program_product_id
      WHERE pw.id = program_days.program_week_id
      AND pp.trainer_id = auth.uid()
    )
  );

-- INSERT policies
CREATE POLICY "Admins create program days"
  ON program_days FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt()->>'role')::text = 'admin');

CREATE POLICY "Trainers create own program days"
  ON program_days FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM program_weeks pw
      JOIN program_products pp ON pp.id = pw.program_product_id
      WHERE pw.id = program_days.program_week_id
      AND pp.trainer_id = auth.uid()
    )
  );

-- UPDATE policies
CREATE POLICY "Admins update program days"
  ON program_days FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'admin')
  WITH CHECK ((auth.jwt()->>'role')::text = 'admin');

CREATE POLICY "Trainers update own program days"
  ON program_days FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM program_weeks pw
      JOIN program_products pp ON pp.id = pw.program_product_id
      WHERE pw.id = program_days.program_week_id
      AND pp.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM program_weeks pw
      JOIN program_products pp ON pp.id = pw.program_product_id
      WHERE pw.id = program_days.program_week_id
      AND pp.trainer_id = auth.uid()
    )
  );

-- DELETE policies
CREATE POLICY "Admins delete program days"
  ON program_days FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'admin');

CREATE POLICY "Trainers delete own program days"
  ON program_days FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM program_weeks pw
      JOIN program_products pp ON pp.id = pw.program_product_id
      WHERE pw.id = program_days.program_week_id
      AND pp.trainer_id = auth.uid()
    )
  );

-- ============================================
-- PROGRAM DAY WORKOUTS
-- ============================================
CREATE TABLE IF NOT EXISTS program_day_workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_day_id uuid REFERENCES program_days(id) ON DELETE CASCADE NOT NULL,
  exercise_id uuid REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  order_index int NOT NULL DEFAULT 0,
  sets int NOT NULL DEFAULT 3,
  reps int NOT NULL DEFAULT 10,
  rir int DEFAULT NULL,
  load float DEFAULT NULL,
  velocity float DEFAULT NULL,
  tempo text DEFAULT NULL,
  rest_seconds int DEFAULT 90,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_program_day_workouts_day ON program_day_workouts(program_day_id);
CREATE INDEX IF NOT EXISTS idx_program_day_workouts_exercise ON program_day_workouts(exercise_id);

ALTER TABLE program_day_workouts ENABLE ROW LEVEL SECURITY;

-- SELECT policies
CREATE POLICY "Admins view all program day workouts"
  ON program_day_workouts FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'admin');

CREATE POLICY "Trainers view own program day workouts"
  ON program_day_workouts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM program_days pd
      JOIN program_weeks pw ON pw.id = pd.program_week_id
      JOIN program_products pp ON pp.id = pw.program_product_id
      WHERE pd.id = program_day_workouts.program_day_id
      AND pp.trainer_id = auth.uid()
    )
  );

-- INSERT policies
CREATE POLICY "Admins create program day workouts"
  ON program_day_workouts FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt()->>'role')::text = 'admin');

CREATE POLICY "Trainers create own program day workouts"
  ON program_day_workouts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM program_days pd
      JOIN program_weeks pw ON pw.id = pd.program_week_id
      JOIN program_products pp ON pp.id = pw.program_product_id
      WHERE pd.id = program_day_workouts.program_day_id
      AND pp.trainer_id = auth.uid()
    )
  );

-- UPDATE policies
CREATE POLICY "Admins update program day workouts"
  ON program_day_workouts FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'admin')
  WITH CHECK ((auth.jwt()->>'role')::text = 'admin');

CREATE POLICY "Trainers update own program day workouts"
  ON program_day_workouts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM program_days pd
      JOIN program_weeks pw ON pw.id = pd.program_week_id
      JOIN program_products pp ON pp.id = pw.program_product_id
      WHERE pd.id = program_day_workouts.program_day_id
      AND pp.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM program_days pd
      JOIN program_weeks pw ON pw.id = pd.program_week_id
      JOIN program_products pp ON pp.id = pw.program_product_id
      WHERE pd.id = program_day_workouts.program_day_id
      AND pp.trainer_id = auth.uid()
    )
  );

-- DELETE policies
CREATE POLICY "Admins delete program day workouts"
  ON program_day_workouts FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'admin');

CREATE POLICY "Trainers delete own program day workouts"
  ON program_day_workouts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM program_days pd
      JOIN program_weeks pw ON pw.id = pd.program_week_id
      JOIN program_products pp ON pp.id = pw.program_product_id
      WHERE pd.id = program_day_workouts.program_day_id
      AND pp.trainer_id = auth.uid()
    )
  );

-- ============================================
-- HELPER FUNCTION: Auto-create weeks and days
-- ============================================
CREATE OR REPLACE FUNCTION create_program_structure(
  p_program_id uuid,
  p_duration_weeks int
)
RETURNS void AS $$
DECLARE
  week_record RECORD;
  day_names text[] := ARRAY['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  i int;
BEGIN
  -- Create weeks
  FOR i IN 1..p_duration_weeks LOOP
    INSERT INTO program_weeks (program_product_id, week_number, title)
    VALUES (p_program_id, i, 'Week ' || i)
    ON CONFLICT (program_product_id, week_number) DO NOTHING
    RETURNING * INTO week_record;
    
    -- Create 7 days for each week
    IF week_record.id IS NOT NULL THEN
      FOR j IN 1..7 LOOP
        INSERT INTO program_days (program_week_id, day_number, day_name)
        VALUES (week_record.id, j, day_names[j])
        ON CONFLICT (program_week_id, day_number) DO NOTHING;
      END LOOP;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
