/*
  # Advanced Nutrition System - Asciende Fuel System

  ## Overview
  Complete nutrition management system with:
  - Dynamic fuel days (Green/Yellow/Red based on training load)
  - Menu templates for coaches
  - Meal planning with macro tracking
  - Cultural food packs (regional adaptation)
  - Integration with anthropometry and training
  - Adherence tracking and micro-feedback

  ## New Tables

  ### 1. `nutrition_profiles`
  Stores base nutritional requirements for each athlete
  - `athlete_id` - Link to profiles
  - `base_bmr` - Basal metabolic rate
  - `activity_factor` - Daily activity multiplier
  - `goal_type` - maintain/gain/lose
  - `culture_pack` - Regional food preferences

  ### 2. `nutrition_menu_templates`
  Predefined meal plans created by coaches
  - `created_by` - Coach who created it
  - `name` - Template name
  - `total_kcal` - Target calories
  - `macro_split` - CHO/PRO/FAT percentages
  - `meal_count` - Number of meals per day

  ### 3. `nutrition_template_meals`
  Individual meals within templates
  - `template_id` - Parent template
  - `meal_type` - breakfast/lunch/snack/dinner/pre_training/post_training
  - `meal_order` - Display order
  - `target_kcal` - Meal calorie target

  ### 4. `nutrition_meal_items`
  Food items within meals
  - `meal_id` - Parent meal
  - `food_id` - Link to foods table
  - `quantity` - Amount in grams
  - `kcal`, `protein`, `carbs`, `fat` - Calculated values

  ### 5. `nutrition_daily_plans`
  Daily nutrition plan for athletes
  - `athlete_id` - Who it's for
  - `plan_date` - Which day
  - `fuel_day_type` - green/yellow/red
  - `target_kcal` - Calculated daily target
  - `training_load` - From training module

  ### 6. `nutrition_daily_meals`
  Actual meals for a specific day
  - `plan_id` - Parent daily plan
  - `meal_type` - Type of meal
  - `completed` - Whether athlete ate it
  - `actual_kcal` - If different from plan

  ### 7. `nutrition_feedback`
  Athlete feedback on meals/days
  - `athlete_id` - Who provided feedback
  - `feedback_date` - When
  - `energy_rating` - 1-5 scale
  - `digestion_rating` - 1-5 scale
  - `satiety_rating` - 1-5 scale
  - `notes` - Optional text

  ### 8. `culture_food_packs`
  Regional food collections
  - `pack_name` - e.g., "Latin America", "Mediterranean"
  - `region` - Geographic region
  - `description` - What's included

  ### 9. `culture_pack_foods`
  Foods in each culture pack
  - `pack_id` - Parent pack
  - `food_id` - Link to foods
  - `is_staple` - Core food in this culture

  ## Security
  - RLS enabled on all tables
  - Athletes can read own data
  - Coaches can read/write for assigned athletes
  - Admins have full access
*/

-- =====================================================
-- 1. NUTRITION PROFILES
-- =====================================================

CREATE TABLE IF NOT EXISTS nutrition_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Base calculations
  base_bmr decimal(10,2) DEFAULT 0,
  activity_factor decimal(3,2) DEFAULT 1.2,

  -- Goals
  goal_type text DEFAULT 'maintain' CHECK (goal_type IN ('maintain', 'gain_muscle', 'lose_fat', 'recomp')),
  goal_weight_kg decimal(5,2),

  -- Macro preferences (can be overridden daily)
  preferred_cho_percent integer DEFAULT 50,
  preferred_pro_percent integer DEFAULT 25,
  preferred_fat_percent integer DEFAULT 25,

  -- Cultural preferences
  culture_pack text DEFAULT 'international',
  dietary_restrictions text[] DEFAULT '{}',
  allergies text[] DEFAULT '{}',

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(athlete_id)
);

CREATE INDEX idx_nutrition_profiles_athlete ON nutrition_profiles(athlete_id);

-- =====================================================
-- 2. MENU TEMPLATES (Coach-created)
-- =====================================================

CREATE TABLE IF NOT EXISTS nutrition_menu_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Template info
  name text NOT NULL,
  description text,
  is_public boolean DEFAULT false,

  -- Target values
  total_kcal integer NOT NULL,
  cho_percent integer DEFAULT 50,
  pro_percent integer DEFAULT 25,
  fat_percent integer DEFAULT 25,

  -- Structure
  meal_count integer DEFAULT 5,

  -- Tags for filtering
  tags text[] DEFAULT '{}',
  suitable_for_fuel_day text, -- 'green', 'yellow', 'red', or 'any'

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_menu_templates_creator ON nutrition_menu_templates(created_by);
CREATE INDEX idx_menu_templates_public ON nutrition_menu_templates(is_public) WHERE is_public = true;

-- =====================================================
-- 3. TEMPLATE MEALS
-- =====================================================

CREATE TABLE IF NOT EXISTS nutrition_template_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES nutrition_menu_templates(id) ON DELETE CASCADE NOT NULL,

  -- Meal info
  meal_type text NOT NULL CHECK (meal_type IN (
    'breakfast', 'morning_snack', 'lunch', 'afternoon_snack',
    'pre_training', 'during_training', 'post_training', 'dinner', 'evening_snack'
  )),
  meal_order integer DEFAULT 1,
  meal_name text,

  -- Timing
  suggested_time time,
  relative_to_training text, -- 'before', 'after', 'unrelated'

  -- Target macros
  target_kcal integer,
  target_protein_g decimal(6,2),
  target_carbs_g decimal(6,2),
  target_fat_g decimal(6,2),

  -- Notes
  notes text,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_template_meals_template ON nutrition_template_meals(template_id);

-- =====================================================
-- 4. MEAL ITEMS (Foods in meals)
-- =====================================================

CREATE TABLE IF NOT EXISTS nutrition_meal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid REFERENCES nutrition_template_meals(id) ON DELETE CASCADE NOT NULL,
  food_id uuid REFERENCES foods(id) ON DELETE CASCADE NOT NULL,

  -- Quantity
  quantity_g decimal(8,2) NOT NULL,

  -- Calculated values (cached for performance)
  kcal decimal(8,2),
  protein_g decimal(6,2),
  carbs_g decimal(6,2),
  fat_g decimal(6,2),
  fiber_g decimal(6,2),

  -- Display
  item_order integer DEFAULT 1,
  notes text,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_meal_items_meal ON nutrition_meal_items(meal_id);
CREATE INDEX idx_meal_items_food ON nutrition_meal_items(food_id);

-- =====================================================
-- 5. DAILY NUTRITION PLANS
-- =====================================================

CREATE TABLE IF NOT EXISTS nutrition_daily_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  plan_date date NOT NULL,

  -- Fuel day calculation
  fuel_day_type text NOT NULL CHECK (fuel_day_type IN ('green', 'yellow', 'red')),
  training_load_score decimal(5,2), -- From training module

  -- Calculated targets
  target_kcal integer NOT NULL,
  target_protein_g decimal(6,2),
  target_carbs_g decimal(6,2),
  target_fat_g decimal(6,2),

  -- Actual consumption (sum of meals)
  actual_kcal integer DEFAULT 0,
  actual_protein_g decimal(6,2) DEFAULT 0,
  actual_carbs_g decimal(6,2) DEFAULT 0,
  actual_fat_g decimal(6,2) DEFAULT 0,

  -- Adherence
  adherence_score integer, -- 0-100

  -- Source
  based_on_template_id uuid REFERENCES nutrition_menu_templates(id),

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(athlete_id, plan_date)
);

CREATE INDEX idx_daily_plans_athlete_date ON nutrition_daily_plans(athlete_id, plan_date DESC);
CREATE INDEX idx_daily_plans_fuel_type ON nutrition_daily_plans(fuel_day_type);

-- =====================================================
-- 6. DAILY MEALS (Instance of template meal)
-- =====================================================

CREATE TABLE IF NOT EXISTS nutrition_daily_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES nutrition_daily_plans(id) ON DELETE CASCADE NOT NULL,

  -- Meal info
  meal_type text NOT NULL,
  meal_name text,
  meal_time time,
  meal_order integer DEFAULT 1,

  -- Targets (from template or custom)
  target_kcal integer,
  target_protein_g decimal(6,2),
  target_carbs_g decimal(6,2),
  target_fat_g decimal(6,2),

  -- Completion
  completed boolean DEFAULT false,
  completed_at timestamptz,

  -- Actual if different
  actual_kcal integer,
  actual_protein_g decimal(6,2),
  actual_carbs_g decimal(6,2),
  actual_fat_g decimal(6,2),

  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_daily_meals_plan ON nutrition_daily_meals(plan_id);

-- =====================================================
-- 7. NUTRITION FEEDBACK
-- =====================================================

CREATE TABLE IF NOT EXISTS nutrition_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  plan_id uuid REFERENCES nutrition_daily_plans(id) ON DELETE CASCADE,
  meal_id uuid REFERENCES nutrition_daily_meals(id) ON DELETE CASCADE,

  feedback_date date NOT NULL,
  feedback_time timestamptz DEFAULT now(),

  -- Ratings (1-5 scale, nullable)
  energy_rating integer CHECK (energy_rating BETWEEN 1 AND 5),
  digestion_rating integer CHECK (digestion_rating BETWEEN 1 AND 5),
  satiety_rating integer CHECK (satiety_rating BETWEEN 1 AND 5),

  -- Overall day rating
  overall_rating integer CHECK (overall_rating BETWEEN 1 AND 5),

  -- Notes
  notes text,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_nutrition_feedback_athlete ON nutrition_feedback(athlete_id, feedback_date DESC);
CREATE INDEX idx_nutrition_feedback_plan ON nutrition_feedback(plan_id);

-- =====================================================
-- 8. CULTURE FOOD PACKS
-- =====================================================

CREATE TABLE IF NOT EXISTS culture_food_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_name text NOT NULL UNIQUE,
  region text NOT NULL,

  description text,
  emoji_flag text,

  -- Metadata
  created_by uuid REFERENCES profiles(id),
  is_default boolean DEFAULT false,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_culture_packs_region ON culture_food_packs(region);

-- =====================================================
-- 9. CULTURE PACK FOODS (Many-to-many)
-- =====================================================

CREATE TABLE IF NOT EXISTS culture_pack_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id uuid REFERENCES culture_food_packs(id) ON DELETE CASCADE NOT NULL,
  food_id uuid REFERENCES foods(id) ON DELETE CASCADE NOT NULL,

  is_staple boolean DEFAULT false,
  popularity_score integer DEFAULT 50, -- 0-100

  UNIQUE(pack_id, food_id)
);

CREATE INDEX idx_culture_pack_foods_pack ON culture_pack_foods(pack_id);
CREATE INDEX idx_culture_pack_foods_food ON culture_pack_foods(food_id);
CREATE INDEX idx_culture_pack_foods_staples ON culture_pack_foods(pack_id) WHERE is_staple = true;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Nutrition Profiles
ALTER TABLE nutrition_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own nutrition profile"
  ON nutrition_profiles FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Users can update own nutrition profile"
  ON nutrition_profiles FOR UPDATE
  TO authenticated
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Users can insert own nutrition profile"
  ON nutrition_profiles FOR INSERT
  TO authenticated
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Trainers can view assigned athletes nutrition profiles"
  ON nutrition_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainer_athlete_assignments
      WHERE trainer_athlete_assignments.athlete_id = nutrition_profiles.athlete_id
      AND trainer_athlete_assignments.trainer_id = auth.uid()
      AND trainer_athlete_assignments.status = 'active'
    )
  );

CREATE POLICY "Trainers can update assigned athletes nutrition profiles"
  ON nutrition_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainer_athlete_assignments
      WHERE trainer_athlete_assignments.athlete_id = nutrition_profiles.athlete_id
      AND trainer_athlete_assignments.trainer_id = auth.uid()
      AND trainer_athlete_assignments.status = 'active'
    )
  );

-- Menu Templates
ALTER TABLE nutrition_menu_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own menu templates"
  ON nutrition_menu_templates FOR SELECT
  TO authenticated
  USING (created_by = auth.uid() OR is_public = true);

CREATE POLICY "Users can create menu templates"
  ON nutrition_menu_templates FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own menu templates"
  ON nutrition_menu_templates FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete own menu templates"
  ON nutrition_menu_templates FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Template Meals
ALTER TABLE nutrition_template_meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view template meals if they can see template"
  ON nutrition_template_meals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM nutrition_menu_templates
      WHERE nutrition_menu_templates.id = nutrition_template_meals.template_id
      AND (nutrition_menu_templates.created_by = auth.uid() OR nutrition_menu_templates.is_public = true)
    )
  );

CREATE POLICY "Users can manage template meals they own"
  ON nutrition_template_meals FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM nutrition_menu_templates
      WHERE nutrition_menu_templates.id = nutrition_template_meals.template_id
      AND nutrition_menu_templates.created_by = auth.uid()
    )
  );

-- Meal Items
ALTER TABLE nutrition_meal_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view meal items if they can see meal"
  ON nutrition_meal_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM nutrition_template_meals ntm
      JOIN nutrition_menu_templates nmt ON nmt.id = ntm.template_id
      WHERE ntm.id = nutrition_meal_items.meal_id
      AND (nmt.created_by = auth.uid() OR nmt.is_public = true)
    )
  );

CREATE POLICY "Users can manage meal items they own"
  ON nutrition_meal_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM nutrition_template_meals ntm
      JOIN nutrition_menu_templates nmt ON nmt.id = ntm.template_id
      WHERE ntm.id = nutrition_meal_items.meal_id
      AND nmt.created_by = auth.uid()
    )
  );

-- Daily Plans
ALTER TABLE nutrition_daily_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes can view own daily plans"
  ON nutrition_daily_plans FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Athletes can update own daily plans"
  ON nutrition_daily_plans FOR UPDATE
  TO authenticated
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Trainers can view assigned athletes daily plans"
  ON nutrition_daily_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainer_athlete_assignments
      WHERE trainer_athlete_assignments.athlete_id = nutrition_daily_plans.athlete_id
      AND trainer_athlete_assignments.trainer_id = auth.uid()
      AND trainer_athlete_assignments.status = 'active'
    )
  );

CREATE POLICY "Trainers can create plans for assigned athletes"
  ON nutrition_daily_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainer_athlete_assignments
      WHERE trainer_athlete_assignments.athlete_id = nutrition_daily_plans.athlete_id
      AND trainer_athlete_assignments.trainer_id = auth.uid()
      AND trainer_athlete_assignments.status = 'active'
    )
  );

CREATE POLICY "Trainers can update assigned athletes daily plans"
  ON nutrition_daily_plans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainer_athlete_assignments
      WHERE trainer_athlete_assignments.athlete_id = nutrition_daily_plans.athlete_id
      AND trainer_athlete_assignments.trainer_id = auth.uid()
      AND trainer_athlete_assignments.status = 'active'
    )
  );

-- Daily Meals
ALTER TABLE nutrition_daily_meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view daily meals if they can see plan"
  ON nutrition_daily_meals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM nutrition_daily_plans
      WHERE nutrition_daily_plans.id = nutrition_daily_meals.plan_id
      AND (
        nutrition_daily_plans.athlete_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM trainer_athlete_assignments
          WHERE trainer_athlete_assignments.athlete_id = nutrition_daily_plans.athlete_id
          AND trainer_athlete_assignments.trainer_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can manage daily meals if they can manage plan"
  ON nutrition_daily_meals FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM nutrition_daily_plans
      WHERE nutrition_daily_plans.id = nutrition_daily_meals.plan_id
      AND (
        nutrition_daily_plans.athlete_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM trainer_athlete_assignments
          WHERE trainer_athlete_assignments.athlete_id = nutrition_daily_plans.athlete_id
          AND trainer_athlete_assignments.trainer_id = auth.uid()
        )
      )
    )
  );

-- Feedback
ALTER TABLE nutrition_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes can view own feedback"
  ON nutrition_feedback FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Athletes can create own feedback"
  ON nutrition_feedback FOR INSERT
  TO authenticated
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Trainers can view assigned athletes feedback"
  ON nutrition_feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainer_athlete_assignments
      WHERE trainer_athlete_assignments.athlete_id = nutrition_feedback.athlete_id
      AND trainer_athlete_assignments.trainer_id = auth.uid()
    )
  );

-- Culture Packs (public read)
ALTER TABLE culture_food_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view culture packs"
  ON culture_food_packs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Trainers and admins can create culture packs"
  ON culture_food_packs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('trainer', 'admin')
    )
  );

-- Culture Pack Foods (public read)
ALTER TABLE culture_pack_foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view culture pack foods"
  ON culture_pack_foods FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Trainers can manage culture pack foods"
  ON culture_pack_foods FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('trainer', 'admin')
    )
  );
