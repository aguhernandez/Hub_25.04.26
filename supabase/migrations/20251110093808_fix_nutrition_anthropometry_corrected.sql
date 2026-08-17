/*
  # Fix Nutrition and Anthropometry Systems

  ## Changes Made

  ### 1. Anthropometry Population Reference Data
  - New table for normative/population data
  - Admin-only management
  - Used for comparisons and benchmarking

  ### 2. Meal Plans Permissions  
  - Athletes can create their own plans
  - Athletes can edit their own plans  
  - Coaches maintain full control of plans they create

  ### 3. Program-Nutrition Connection
  - Links nutrition plans to program products
  - Enables monthly nutrition plans in marketplace

  ### 4. Meal Plan Structure Permissions
  - meal_plans → meal_plan_meals → meal_plan_items
  - All levels allow athlete modifications
*/

-- Create anthropometry population reference data table
CREATE TABLE IF NOT EXISTS anthropometry_population_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  population_name text NOT NULL,
  sport text,
  gender text CHECK (gender IN ('male', 'female', 'other', 'all')),
  age_min integer,
  age_max integer,
  measurement_type text NOT NULL,
  percentile_50 numeric(10, 2),
  percentile_25 numeric(10, 2),
  percentile_75 numeric(10, 2),
  percentile_10 numeric(10, 2),
  percentile_90 numeric(10, 2),
  mean numeric(10, 2),
  std_dev numeric(10, 2),
  sample_size integer,
  reference_source text,
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anthropometry_population_lookup 
  ON anthropometry_population_data(sport, gender, measurement_type);

ALTER TABLE anthropometry_population_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view population data"
  ON anthropometry_population_data FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage population data"
  ON anthropometry_population_data FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add program connection to meal_plans
ALTER TABLE meal_plans
ADD COLUMN IF NOT EXISTS program_product_id uuid REFERENCES program_products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_meal_plans_program 
  ON meal_plans(program_product_id);

-- Fix meal_plans permissions
DROP POLICY IF EXISTS "meal_plans_update" ON meal_plans;
DROP POLICY IF EXISTS "meal_plans_insert" ON meal_plans;

CREATE POLICY "Athletes can create their own meal plans"
  ON meal_plans FOR INSERT
  TO authenticated
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Coaches can create meal plans for athletes"
  ON meal_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    coach_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('trainer', 'admin')
    )
  );

CREATE POLICY "Athletes can update their own meal plans"
  ON meal_plans FOR UPDATE
  TO authenticated
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Coaches can update meal plans they created"
  ON meal_plans FOR UPDATE
  TO authenticated
  USING (
    coach_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('trainer', 'admin')
    )
  )
  WITH CHECK (
    coach_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('trainer', 'admin')
    )
  );

-- Fix meal_plan_meals permissions  
DROP POLICY IF EXISTS "meal_plan_meals_select" ON meal_plan_meals;
DROP POLICY IF EXISTS "meal_plan_meals_insert" ON meal_plan_meals;
DROP POLICY IF EXISTS "meal_plan_meals_update" ON meal_plan_meals;
DROP POLICY IF EXISTS "meal_plan_meals_delete" ON meal_plan_meals;

CREATE POLICY "Users can view meals of their accessible plans"
  ON meal_plan_meals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans
      WHERE meal_plans.id = meal_plan_meals.plan_id
      AND (
        meal_plans.athlete_id = auth.uid() OR
        meal_plans.coach_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage meals of their accessible plans"
  ON meal_plan_meals FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans
      WHERE meal_plans.id = meal_plan_meals.plan_id
      AND (
        meal_plans.athlete_id = auth.uid() OR
        meal_plans.coach_id = auth.uid()
      )
    )
  );

-- Fix meal_plan_items permissions
DROP POLICY IF EXISTS "meal_plan_items_select" ON meal_plan_items;
DROP POLICY IF EXISTS "meal_plan_items_insert" ON meal_plan_items;
DROP POLICY IF EXISTS "meal_plan_items_update" ON meal_plan_items;
DROP POLICY IF EXISTS "meal_plan_items_delete" ON meal_plan_items;

CREATE POLICY "Users can view items of their accessible meals"
  ON meal_plan_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plan_meals
      JOIN meal_plans ON meal_plans.id = meal_plan_meals.plan_id
      WHERE meal_plan_meals.id = meal_plan_items.meal_id
      AND (
        meal_plans.athlete_id = auth.uid() OR
        meal_plans.coach_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage items of their accessible meals"
  ON meal_plan_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plan_meals
      JOIN meal_plans ON meal_plans.id = meal_plan_meals.plan_id
      WHERE meal_plan_meals.id = meal_plan_items.meal_id
      AND (
        meal_plans.athlete_id = auth.uid() OR
        meal_plans.coach_id = auth.uid()
      )
    )
  );

-- Comments
COMMENT ON TABLE anthropometry_population_data IS 'Population/normative anthropometric data for comparisons';
COMMENT ON COLUMN meal_plans.program_product_id IS 'Links nutrition plan to a program product';

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_anthropometry_population_updated_at ON anthropometry_population_data;
CREATE TRIGGER update_anthropometry_population_updated_at
  BEFORE UPDATE ON anthropometry_population_data
  FOR EACH ROW
  EXECUTE FUNCTION update_atp_updated_at();
