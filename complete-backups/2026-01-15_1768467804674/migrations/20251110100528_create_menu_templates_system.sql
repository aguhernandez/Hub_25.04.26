/*
  # Menu Templates System

  Complete system for coaches to create, store, and assign predefined meal plans.

  ## New Tables
  - menu_templates: Reusable menu structures
  - menu_template_meals: Meals within templates
  - menu_template_items: Food items in each meal
  - menu_assignments: Track assigned menus to athletes
  - meal_logs_v2: Enhanced meal tracking with adherence

  ## Features
  - Pre-defined menus with auto-calculated macros
  - Menu library with categorization
  - One-click assignment to athletes
  - Adherence tracking and reporting
*/

-- Menu Templates Table
CREATE TABLE IF NOT EXISTS menu_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  name text NOT NULL,
  description text,
  menu_type text CHECK (menu_type IN ('high_carb', 'low_carb', 'moderate_carb', 'maintenance', 'recovery', 'competition')),
  sport text,
  objective text CHECK (objective IN ('performance', 'muscle_gain', 'fat_loss', 'recovery', 'maintenance')),
  meals_per_day integer DEFAULT 5 CHECK (meals_per_day BETWEEN 3 AND 6),
  total_calories numeric(7, 2),
  total_protein numeric(6, 2),
  total_carbs numeric(6, 2),
  total_fat numeric(6, 2),
  protein_percent numeric(4, 1),
  carbs_percent numeric(4, 1),
  fat_percent numeric(4, 1),
  color_code text CHECK (color_code IN ('red', 'yellow', 'green')),
  is_public boolean DEFAULT false,
  tags text[],
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Menu Template Meals Table
CREATE TABLE IF NOT EXISTS menu_template_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES menu_templates(id) ON DELETE CASCADE NOT NULL,
  meal_name text NOT NULL,
  meal_type text CHECK (meal_type IN ('breakfast', 'snack_1', 'lunch', 'pre_training', 'intra_training', 'post_training', 'snack_2', 'dinner')),
  meal_time time,
  day_number integer DEFAULT 1 CHECK (day_number BETWEEN 1 AND 7),
  training_type text,
  calories numeric(7, 2),
  protein numeric(6, 2),
  carbs numeric(6, 2),
  fat numeric(6, 2),
  notes text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Menu Template Items Table
CREATE TABLE IF NOT EXISTS menu_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_meal_id uuid REFERENCES menu_template_meals(id) ON DELETE CASCADE NOT NULL,
  food_id uuid REFERENCES foods(id) ON DELETE CASCADE,
  food_name text NOT NULL,
  amount numeric(7, 2) NOT NULL,
  unit text NOT NULL,
  calories numeric(7, 2),
  protein numeric(6, 2),
  carbs numeric(6, 2),
  fat numeric(6, 2),
  is_alternative boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Menu Assignments Table
CREATE TABLE IF NOT EXISTS menu_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES menu_templates(id) ON DELETE SET NULL NOT NULL,
  athlete_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  coach_id uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  start_date date NOT NULL,
  end_date date,
  duration_weeks integer DEFAULT 1,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enhanced Meal Logs for Adherence
CREATE TABLE IF NOT EXISTS meal_logs_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  assignment_id uuid REFERENCES menu_assignments(id) ON DELETE CASCADE,
  template_meal_id uuid REFERENCES menu_template_meals(id) ON DELETE SET NULL,
  meal_date date NOT NULL,
  meal_name text NOT NULL,
  planned_calories numeric(7, 2),
  actual_calories numeric(7, 2),
  planned_protein numeric(6, 2),
  actual_protein numeric(6, 2),
  planned_carbs numeric(6, 2),
  actual_carbs numeric(6, 2),
  planned_fat numeric(6, 2),
  actual_fat numeric(6, 2),
  completed boolean DEFAULT false,
  completed_at timestamptz,
  adherence_score numeric(3, 1),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Adherence Summary (Materialized View Alternative - Table)
CREATE TABLE IF NOT EXISTS adherence_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  assignment_id uuid REFERENCES menu_assignments(id) ON DELETE CASCADE NOT NULL,
  week_start_date date NOT NULL,
  week_end_date date NOT NULL,
  total_planned_meals integer DEFAULT 0,
  total_completed_meals integer DEFAULT 0,
  adherence_percent numeric(5, 2),
  avg_calorie_diff numeric(7, 2),
  avg_protein_diff numeric(6, 2),
  avg_carbs_diff numeric(6, 2),
  avg_fat_diff numeric(6, 2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(athlete_id, assignment_id, week_start_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_menu_templates_creator ON menu_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_menu_templates_type ON menu_templates(menu_type, objective);
CREATE INDEX IF NOT EXISTS idx_menu_template_meals_template ON menu_template_meals(template_id);
CREATE INDEX IF NOT EXISTS idx_menu_template_items_meal ON menu_template_items(template_meal_id);
CREATE INDEX IF NOT EXISTS idx_menu_assignments_athlete ON menu_assignments(athlete_id, status);
CREATE INDEX IF NOT EXISTS idx_menu_assignments_coach ON menu_assignments(coach_id);
CREATE INDEX IF NOT EXISTS idx_meal_logs_v2_athlete_date ON meal_logs_v2(athlete_id, meal_date);
CREATE INDEX IF NOT EXISTS idx_adherence_summary_athlete ON adherence_summary(athlete_id);

-- Enable RLS
ALTER TABLE menu_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_template_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_logs_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE adherence_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies for menu_templates
CREATE POLICY "Coaches can view all templates"
  ON menu_templates FOR SELECT
  TO authenticated
  USING (
    is_public = true OR
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('trainer', 'admin'))
  );

CREATE POLICY "Coaches can manage own templates"
  ON menu_templates FOR ALL
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for menu_template_meals
CREATE POLICY "Users can view meals of accessible templates"
  ON menu_template_meals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menu_templates
      WHERE menu_templates.id = menu_template_meals.template_id
      AND (
        menu_templates.is_public = true OR
        menu_templates.created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('trainer', 'admin'))
      )
    )
  );

CREATE POLICY "Coaches can manage meals"
  ON menu_template_meals FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menu_templates
      WHERE menu_templates.id = menu_template_meals.template_id
      AND (
        menu_templates.created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );

-- RLS Policies for menu_template_items
CREATE POLICY "Users can view items of accessible meals"
  ON menu_template_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menu_template_meals
      JOIN menu_templates ON menu_templates.id = menu_template_meals.template_id
      WHERE menu_template_meals.id = menu_template_items.template_meal_id
      AND (
        menu_templates.is_public = true OR
        menu_templates.created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('trainer', 'admin'))
      )
    )
  );

CREATE POLICY "Coaches can manage items"
  ON menu_template_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menu_template_meals
      JOIN menu_templates ON menu_templates.id = menu_template_meals.template_id
      WHERE menu_template_meals.id = menu_template_items.template_meal_id
      AND (
        menu_templates.created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );

-- RLS Policies for menu_assignments
CREATE POLICY "Athletes and coaches can view assignments"
  ON menu_assignments FOR SELECT
  TO authenticated
  USING (
    athlete_id = auth.uid() OR
    coach_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Coaches can manage assignments"
  ON menu_assignments FOR ALL
  TO authenticated
  USING (
    coach_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('trainer', 'admin'))
  );

-- RLS Policies for meal_logs_v2
CREATE POLICY "Athletes can manage own logs"
  ON meal_logs_v2 FOR ALL
  TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Coaches can view athlete logs"
  ON meal_logs_v2 FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('trainer', 'admin'))
  );

-- RLS Policies for adherence_summary
CREATE POLICY "Athletes can view own adherence"
  ON adherence_summary FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Coaches can view all adherence"
  ON adherence_summary FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('trainer', 'admin'))
  );

CREATE POLICY "System can manage adherence"
  ON adherence_summary FOR ALL
  TO authenticated
  USING (true);

-- Function to calculate menu totals
CREATE OR REPLACE FUNCTION calculate_menu_template_totals(template_id_param uuid)
RETURNS void AS $$
BEGIN
  UPDATE menu_templates
  SET
    total_calories = COALESCE((
      SELECT SUM(calories) FROM menu_template_meals WHERE template_id = template_id_param
    ), 0),
    total_protein = COALESCE((
      SELECT SUM(protein) FROM menu_template_meals WHERE template_id = template_id_param
    ), 0),
    total_carbs = COALESCE((
      SELECT SUM(carbs) FROM menu_template_meals WHERE template_id = template_id_param
    ), 0),
    total_fat = COALESCE((
      SELECT SUM(fat) FROM menu_template_meals WHERE template_id = template_id_param
    ), 0),
    updated_at = now()
  WHERE id = template_id_param;

  -- Calculate percentages
  UPDATE menu_templates
  SET
    protein_percent = CASE WHEN total_calories > 0 
      THEN (total_protein * 4 / total_calories) * 100 
      ELSE 0 END,
    carbs_percent = CASE WHEN total_calories > 0 
      THEN (total_carbs * 4 / total_calories) * 100 
      ELSE 0 END,
    fat_percent = CASE WHEN total_calories > 0 
      THEN (total_fat * 9 / total_calories) * 100 
      ELSE 0 END
  WHERE id = template_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to update adherence summary
CREATE OR REPLACE FUNCTION update_adherence_summary(athlete_id_param uuid, week_start date)
RETURNS void AS $$
DECLARE
  assignment_record RECORD;
  week_end date;
BEGIN
  week_end := week_start + INTERVAL '6 days';

  FOR assignment_record IN
    SELECT id FROM menu_assignments
    WHERE athlete_id = athlete_id_param
    AND status = 'active'
    AND start_date <= week_end
    AND (end_date IS NULL OR end_date >= week_start)
  LOOP
    INSERT INTO adherence_summary (
      athlete_id,
      assignment_id,
      week_start_date,
      week_end_date,
      total_planned_meals,
      total_completed_meals,
      adherence_percent
    )
    SELECT
      athlete_id_param,
      assignment_record.id,
      week_start,
      week_end,
      COUNT(*),
      COUNT(*) FILTER (WHERE completed = true),
      (COUNT(*) FILTER (WHERE completed = true)::numeric / NULLIF(COUNT(*), 0) * 100)
    FROM meal_logs_v2
    WHERE athlete_id = athlete_id_param
    AND assignment_id = assignment_record.id
    AND meal_date BETWEEN week_start AND week_end
    ON CONFLICT (athlete_id, assignment_id, week_start_date)
    DO UPDATE SET
      total_planned_meals = EXCLUDED.total_planned_meals,
      total_completed_meals = EXCLUDED.total_completed_meals,
      adherence_percent = EXCLUDED.adherence_percent,
      updated_at = now();
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS update_menu_templates_updated_at ON menu_templates;
CREATE TRIGGER update_menu_templates_updated_at
  BEFORE UPDATE ON menu_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_atp_updated_at();

DROP TRIGGER IF EXISTS update_menu_assignments_updated_at ON menu_assignments;
CREATE TRIGGER update_menu_assignments_updated_at
  BEFORE UPDATE ON menu_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_atp_updated_at();

-- Comments
COMMENT ON TABLE menu_templates IS 'Reusable meal plan templates created by coaches';
COMMENT ON TABLE menu_template_meals IS 'Individual meals within menu templates';
COMMENT ON TABLE menu_template_items IS 'Food items in each template meal';
COMMENT ON TABLE menu_assignments IS 'Tracks menu assignments to athletes';
COMMENT ON TABLE meal_logs_v2 IS 'Enhanced meal logging with adherence tracking';
COMMENT ON TABLE adherence_summary IS 'Weekly adherence summary per athlete';
