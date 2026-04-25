/*
  # Complete Nutrition System - Fixed

  Creates all tables and functionality for complete nutrition management
*/

-- Nutrition Anamnesis Table
CREATE TABLE IF NOT EXISTS nutrition_anamnesis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  coach_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  age integer,
  sex text CHECK (sex IN ('male', 'female', 'other')),
  sport text,
  training_frequency text CHECK (training_frequency IN ('2-3x', '4-5x', '6+')),
  training_hours_weekly numeric(4, 1),
  work_type text CHECK (work_type IN ('sedentary', 'active', 'very_active')),
  sleep_hours numeric(3, 1),
  main_goal text CHECK (main_goal IN ('performance', 'muscle_gain', 'fat_loss', 'recovery', 'maintenance')),
  food_allergies text,
  dietary_preferences text,
  additional_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(athlete_id)
);

-- Nutrition Targets Table
CREATE TABLE IF NOT EXISTS nutrition_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  anamnesis_id uuid REFERENCES nutrition_anamnesis(id) ON DELETE SET NULL,
  weight_kg numeric(5, 2),
  height_cm numeric(5, 1),
  bmr numeric(7, 2),
  activity_factor numeric(3, 2),
  tdee numeric(7, 2),
  target_calories numeric(7, 2),
  protein_g numeric(6, 2),
  protein_g_per_kg numeric(4, 2),
  carbs_g numeric(6, 2),
  carbs_g_per_kg numeric(4, 2),
  fat_g numeric(6, 2),
  fat_g_per_kg numeric(4, 2),
  protein_percent numeric(4, 1),
  carbs_percent numeric(4, 1),
  fat_percent numeric(4, 1),
  calculation_date date DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Weekly Menus Table
CREATE TABLE IF NOT EXISTS weekly_menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES meal_plans(id) ON DELETE CASCADE NOT NULL,
  week_number integer NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add intensity level to meal_plan_meals for traffic light system
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'meal_plan_meals' AND column_name = 'intensity_level'
  ) THEN
    ALTER TABLE meal_plan_meals
    ADD COLUMN intensity_level text CHECK (intensity_level IN ('low', 'moderate', 'high'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'meal_plan_meals' AND column_name = 'total_calories'
  ) THEN
    ALTER TABLE meal_plan_meals
    ADD COLUMN total_calories numeric(7, 2),
    ADD COLUMN total_protein numeric(6, 2),
    ADD COLUMN total_carbs numeric(6, 2),
    ADD COLUMN total_fat numeric(6, 2);
  END IF;
END $$;

-- Shopping Lists Table
CREATE TABLE IF NOT EXISTS shopping_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES meal_plans(id) ON DELETE CASCADE NOT NULL,
  week_start_date date NOT NULL,
  items jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Meal Adherence Tracking
CREATE TABLE IF NOT EXISTS meal_adherence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  meal_id uuid REFERENCES meal_plan_meals(id) ON DELETE CASCADE NOT NULL,
  scheduled_date date NOT NULL,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(athlete_id, meal_id, scheduled_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_nutrition_anamnesis_athlete ON nutrition_anamnesis(athlete_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_targets_athlete ON nutrition_targets(athlete_id);
CREATE INDEX IF NOT EXISTS idx_weekly_menus_plan ON weekly_menus(plan_id);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_plan ON shopping_lists(plan_id);
CREATE INDEX IF NOT EXISTS idx_meal_adherence_athlete_date ON meal_adherence(athlete_id, scheduled_date);

-- Enable RLS
ALTER TABLE nutrition_anamnesis ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_adherence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for nutrition_anamnesis
CREATE POLICY "Athletes and coaches can view anamnesis"
  ON nutrition_anamnesis FOR SELECT
  TO authenticated
  USING (
    athlete_id = auth.uid() OR
    coach_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Athletes and coaches can manage anamnesis"
  ON nutrition_anamnesis FOR ALL
  TO authenticated
  USING (
    athlete_id = auth.uid() OR
    coach_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('trainer', 'admin'))
  );

-- RLS Policies for nutrition_targets
CREATE POLICY "Athletes and coaches can view targets"
  ON nutrition_targets FOR SELECT
  TO authenticated
  USING (
    athlete_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('trainer', 'admin'))
  );

CREATE POLICY "Athletes and coaches can manage targets"
  ON nutrition_targets FOR ALL
  TO authenticated
  USING (
    athlete_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('trainer', 'admin'))
  );

-- RLS Policies for weekly_menus
CREATE POLICY "Users can view menus"
  ON weekly_menus FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans
      WHERE meal_plans.id = weekly_menus.plan_id
      AND (meal_plans.athlete_id = auth.uid() OR meal_plans.coach_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage menus"
  ON weekly_menus FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans
      WHERE meal_plans.id = weekly_menus.plan_id
      AND (meal_plans.athlete_id = auth.uid() OR meal_plans.coach_id = auth.uid())
    )
  );

-- RLS Policies for shopping_lists
CREATE POLICY "Users can view shopping lists"
  ON shopping_lists FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans
      WHERE meal_plans.id = shopping_lists.plan_id
      AND (meal_plans.athlete_id = auth.uid() OR meal_plans.coach_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage shopping lists"
  ON shopping_lists FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans
      WHERE meal_plans.id = shopping_lists.plan_id
      AND (meal_plans.athlete_id = auth.uid() OR meal_plans.coach_id = auth.uid())
    )
  );

-- RLS Policies for meal_adherence
CREATE POLICY "Athletes can manage own adherence"
  ON meal_adherence FOR ALL
  TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Coaches can view athlete adherence"
  ON meal_adherence FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('trainer', 'admin'))
  );

-- Triggers
DROP TRIGGER IF EXISTS update_nutrition_anamnesis_updated_at ON nutrition_anamnesis;
CREATE TRIGGER update_nutrition_anamnesis_updated_at
  BEFORE UPDATE ON nutrition_anamnesis
  FOR EACH ROW
  EXECUTE FUNCTION update_atp_updated_at();

DROP TRIGGER IF EXISTS update_nutrition_targets_updated_at ON nutrition_targets;
CREATE TRIGGER update_nutrition_targets_updated_at
  BEFORE UPDATE ON nutrition_targets
  FOR EACH ROW
  EXECUTE FUNCTION update_atp_updated_at();

DROP TRIGGER IF EXISTS update_weekly_menus_updated_at ON weekly_menus;
CREATE TRIGGER update_weekly_menus_updated_at
  BEFORE UPDATE ON weekly_menus
  FOR EACH ROW
  EXECUTE FUNCTION update_atp_updated_at();
