/*
  # Recover Complete Advanced Nutrition System

  This migration recovers the complete advanced nutrition system from November 2025.

  ## New Tables Created

  1. nutrition_profiles - Athlete nutritional profiles and preferences
  2. nutrition_menu_templates - Coach-created menu templates  
  3. nutrition_template_meals - Meals within menu templates
  4. nutrition_meal_items - Food items within template meals
  5. nutrition_daily_plans - Daily nutrition plans with fuel day calculation
  6. nutrition_daily_meals - Actual daily meals for athletes
  7. nutrition_feedback - Athlete feedback on meals and nutrition
  8. culture_food_packs - Regional food culture packs
  9. culture_pack_foods - Foods in each culture pack

  ## Security

  - RLS enabled on all tables
  - Athletes can read/write own data
  - Trainers can access assigned athletes' data
  - Admins have full access
*/

-- =====================================================
-- 1. NUTRITION PROFILES
-- =====================================================

CREATE TABLE IF NOT EXISTS nutrition_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  base_bmr decimal(10,2) DEFAULT 0,
  activity_factor decimal(3,2) DEFAULT 1.2,

  goal_type text DEFAULT 'maintain' CHECK (goal_type IN ('maintain', 'gain_muscle', 'lose_fat', 'recomp')),
  goal_weight_kg decimal(5,2),

  preferred_cho_percent integer DEFAULT 50,
  preferred_pro_percent integer DEFAULT 25,
  preferred_fat_percent integer DEFAULT 25,

  culture_pack text DEFAULT 'international',
  dietary_restrictions text[] DEFAULT '{}',
  allergies text[] DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(athlete_id)
);

CREATE INDEX IF NOT EXISTS idx_nutrition_profiles_athlete ON nutrition_profiles(athlete_id);

-- =====================================================
-- 2. MENU TEMPLATES
-- =====================================================

CREATE TABLE IF NOT EXISTS nutrition_menu_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  name text NOT NULL,
  description text,
  is_public boolean DEFAULT false,

  total_kcal integer NOT NULL,
  cho_percent integer DEFAULT 50,
  pro_percent integer DEFAULT 25,
  fat_percent integer DEFAULT 25,

  meal_count integer DEFAULT 5,

  tags text[] DEFAULT '{}',
  suitable_for_fuel_day text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_templates_creator ON nutrition_menu_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_menu_templates_public ON nutrition_menu_templates(is_public) WHERE is_public = true;

-- =====================================================
-- 3. TEMPLATE MEALS
-- =====================================================

CREATE TABLE IF NOT EXISTS nutrition_template_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES nutrition_menu_templates(id) ON DELETE CASCADE NOT NULL,

  meal_type text NOT NULL CHECK (meal_type IN (
    'breakfast', 'morning_snack', 'lunch', 'afternoon_snack',
    'pre_training', 'during_training', 'post_training', 'dinner', 'evening_snack'
  )),
  meal_order integer DEFAULT 1,
  meal_name text,

  suggested_time time,
  relative_to_training text,

  target_kcal integer,
  target_protein_g decimal(6,2),
  target_carbs_g decimal(6,2),
  target_fat_g decimal(6,2),

  notes text,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_template_meals_template ON nutrition_template_meals(template_id);

-- =====================================================
-- 4. MEAL ITEMS
-- =====================================================

CREATE TABLE IF NOT EXISTS nutrition_meal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid REFERENCES nutrition_template_meals(id) ON DELETE CASCADE NOT NULL,
  food_id uuid REFERENCES foods(id) ON DELETE CASCADE NOT NULL,

  quantity_g decimal(8,2) NOT NULL,

  kcal decimal(8,2),
  protein_g decimal(6,2),
  carbs_g decimal(6,2),
  fat_g decimal(6,2),
  fiber_g decimal(6,2),

  item_order integer DEFAULT 1,
  notes text,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meal_items_meal ON nutrition_meal_items(meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_items_food ON nutrition_meal_items(food_id);

-- =====================================================
-- 5. DAILY NUTRITION PLANS
-- =====================================================

CREATE TABLE IF NOT EXISTS nutrition_daily_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  plan_date date NOT NULL,

  fuel_day_type text NOT NULL CHECK (fuel_day_type IN ('green', 'yellow', 'red')),
  training_load_score decimal(5,2),

  target_kcal integer NOT NULL,
  target_protein_g decimal(6,2),
  target_carbs_g decimal(6,2),
  target_fat_g decimal(6,2),

  actual_kcal integer DEFAULT 0,
  actual_protein_g decimal(6,2) DEFAULT 0,
  actual_carbs_g decimal(6,2) DEFAULT 0,
  actual_fat_g decimal(6,2) DEFAULT 0,

  adherence_score integer,

  based_on_template_id uuid REFERENCES nutrition_menu_templates(id),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(athlete_id, plan_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_plans_athlete_date ON nutrition_daily_plans(athlete_id, plan_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_plans_fuel_type ON nutrition_daily_plans(fuel_day_type);

-- =====================================================
-- 6. DAILY MEALS
-- =====================================================

CREATE TABLE IF NOT EXISTS nutrition_daily_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES nutrition_daily_plans(id) ON DELETE CASCADE NOT NULL,

  meal_type text NOT NULL,
  meal_name text,
  meal_time time,
  meal_order integer DEFAULT 1,

  target_kcal integer,
  target_protein_g decimal(6,2),
  target_carbs_g decimal(6,2),
  target_fat_g decimal(6,2),

  completed boolean DEFAULT false,
  completed_at timestamptz,

  actual_kcal integer,
  actual_protein_g decimal(6,2),
  actual_carbs_g decimal(6,2),
  actual_fat_g decimal(6,2),

  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_meals_plan ON nutrition_daily_meals(plan_id);

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

  energy_rating integer CHECK (energy_rating BETWEEN 1 AND 5),
  digestion_rating integer CHECK (digestion_rating BETWEEN 1 AND 5),
  satiety_rating integer CHECK (satiety_rating BETWEEN 1 AND 5),

  overall_rating integer CHECK (overall_rating BETWEEN 1 AND 5),

  notes text,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nutrition_feedback_athlete ON nutrition_feedback(athlete_id, feedback_date DESC);
CREATE INDEX IF NOT EXISTS idx_nutrition_feedback_plan ON nutrition_feedback(plan_id);

-- =====================================================
-- 8. CULTURE FOOD PACKS
-- =====================================================

CREATE TABLE IF NOT EXISTS culture_food_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_name text NOT NULL UNIQUE,
  region text NOT NULL,

  description text,
  emoji_flag text,

  created_by uuid REFERENCES profiles(id),
  is_default boolean DEFAULT false,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_culture_packs_region ON culture_food_packs(region);

-- =====================================================
-- 9. CULTURE PACK FOODS
-- =====================================================

CREATE TABLE IF NOT EXISTS culture_pack_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id uuid REFERENCES culture_food_packs(id) ON DELETE CASCADE NOT NULL,
  food_id uuid REFERENCES foods(id) ON DELETE CASCADE NOT NULL,

  is_staple boolean DEFAULT false,
  popularity_score integer DEFAULT 50,

  UNIQUE(pack_id, food_id)
);

CREATE INDEX IF NOT EXISTS idx_culture_pack_foods_pack ON culture_pack_foods(pack_id);
CREATE INDEX IF NOT EXISTS idx_culture_pack_foods_food ON culture_pack_foods(food_id);
CREATE INDEX IF NOT EXISTS idx_culture_pack_foods_staples ON culture_pack_foods(pack_id) WHERE is_staple = true;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Nutrition Profiles
ALTER TABLE nutrition_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own nutrition profile" ON nutrition_profiles;
CREATE POLICY "Users can view own nutrition profile"
  ON nutrition_profiles FOR SELECT
  TO authenticated
  USING (athlete_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own nutrition profile" ON nutrition_profiles;
CREATE POLICY "Users can update own nutrition profile"
  ON nutrition_profiles FOR UPDATE
  TO authenticated
  USING (athlete_id = (SELECT auth.uid()))
  WITH CHECK (athlete_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own nutrition profile" ON nutrition_profiles;
CREATE POLICY "Users can insert own nutrition profile"
  ON nutrition_profiles FOR INSERT
  TO authenticated
  WITH CHECK (athlete_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Trainers can view assigned athletes nutrition profiles" ON nutrition_profiles;
CREATE POLICY "Trainers can view assigned athletes nutrition profiles"
  ON nutrition_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = nutrition_profiles.athlete_id
      AND profiles.assigned_trainer_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainers can update assigned athletes nutrition profiles" ON nutrition_profiles;
CREATE POLICY "Trainers can update assigned athletes nutrition profiles"
  ON nutrition_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = nutrition_profiles.athlete_id
      AND profiles.assigned_trainer_id = (SELECT auth.uid())
    )
  );

-- Menu Templates
ALTER TABLE nutrition_menu_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own menu templates" ON nutrition_menu_templates;
CREATE POLICY "Users can view own menu templates"
  ON nutrition_menu_templates FOR SELECT
  TO authenticated
  USING (created_by = (SELECT auth.uid()) OR is_public = true);

DROP POLICY IF EXISTS "Users can create menu templates" ON nutrition_menu_templates;
CREATE POLICY "Users can create menu templates"
  ON nutrition_menu_templates FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own menu templates" ON nutrition_menu_templates;
CREATE POLICY "Users can update own menu templates"
  ON nutrition_menu_templates FOR UPDATE
  TO authenticated
  USING (created_by = (SELECT auth.uid()))
  WITH CHECK (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own menu templates" ON nutrition_menu_templates;
CREATE POLICY "Users can delete own menu templates"
  ON nutrition_menu_templates FOR DELETE
  TO authenticated
  USING (created_by = (SELECT auth.uid()));

-- Template Meals
ALTER TABLE nutrition_template_meals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view template meals" ON nutrition_template_meals;
CREATE POLICY "Users can view template meals"
  ON nutrition_template_meals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM nutrition_menu_templates
      WHERE nutrition_menu_templates.id = nutrition_template_meals.template_id
      AND (nutrition_menu_templates.created_by = (SELECT auth.uid()) OR nutrition_menu_templates.is_public = true)
    )
  );

DROP POLICY IF EXISTS "Users can manage template meals" ON nutrition_template_meals;
CREATE POLICY "Users can manage template meals"
  ON nutrition_template_meals FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM nutrition_menu_templates
      WHERE nutrition_menu_templates.id = nutrition_template_meals.template_id
      AND nutrition_menu_templates.created_by = (SELECT auth.uid())
    )
  );

-- Meal Items
ALTER TABLE nutrition_meal_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view meal items" ON nutrition_meal_items;
CREATE POLICY "Users can view meal items"
  ON nutrition_meal_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM nutrition_template_meals ntm
      JOIN nutrition_menu_templates nmt ON nmt.id = ntm.template_id
      WHERE ntm.id = nutrition_meal_items.meal_id
      AND (nmt.created_by = (SELECT auth.uid()) OR nmt.is_public = true)
    )
  );

DROP POLICY IF EXISTS "Users can manage meal items" ON nutrition_meal_items;
CREATE POLICY "Users can manage meal items"
  ON nutrition_meal_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM nutrition_template_meals ntm
      JOIN nutrition_menu_templates nmt ON nmt.id = ntm.template_id
      WHERE ntm.id = nutrition_meal_items.meal_id
      AND nmt.created_by = (SELECT auth.uid())
    )
  );

-- Daily Plans
ALTER TABLE nutrition_daily_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Athletes can view own daily plans" ON nutrition_daily_plans;
CREATE POLICY "Athletes can view own daily plans"
  ON nutrition_daily_plans FOR SELECT
  TO authenticated
  USING (athlete_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Athletes can update own daily plans" ON nutrition_daily_plans;
CREATE POLICY "Athletes can update own daily plans"
  ON nutrition_daily_plans FOR UPDATE
  TO authenticated
  USING (athlete_id = (SELECT auth.uid()))
  WITH CHECK (athlete_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Trainers can view assigned athletes plans" ON nutrition_daily_plans;
CREATE POLICY "Trainers can view assigned athletes plans"
  ON nutrition_daily_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = nutrition_daily_plans.athlete_id
      AND profiles.assigned_trainer_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainers can create plans for athletes" ON nutrition_daily_plans;
CREATE POLICY "Trainers can create plans for athletes"
  ON nutrition_daily_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = nutrition_daily_plans.athlete_id
      AND profiles.assigned_trainer_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainers can update assigned athletes plans" ON nutrition_daily_plans;
CREATE POLICY "Trainers can update assigned athletes plans"
  ON nutrition_daily_plans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = nutrition_daily_plans.athlete_id
      AND profiles.assigned_trainer_id = (SELECT auth.uid())
    )
  );

-- Daily Meals
ALTER TABLE nutrition_daily_meals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view daily meals" ON nutrition_daily_meals;
CREATE POLICY "Users can view daily meals"
  ON nutrition_daily_meals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM nutrition_daily_plans
      WHERE nutrition_daily_plans.id = nutrition_daily_meals.plan_id
      AND (
        nutrition_daily_plans.athlete_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = nutrition_daily_plans.athlete_id
          AND profiles.assigned_trainer_id = (SELECT auth.uid())
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage daily meals" ON nutrition_daily_meals;
CREATE POLICY "Users can manage daily meals"
  ON nutrition_daily_meals FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM nutrition_daily_plans
      WHERE nutrition_daily_plans.id = nutrition_daily_meals.plan_id
      AND (
        nutrition_daily_plans.athlete_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = nutrition_daily_plans.athlete_id
          AND profiles.assigned_trainer_id = (SELECT auth.uid())
        )
      )
    )
  );

-- Feedback
ALTER TABLE nutrition_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Athletes can view own feedback" ON nutrition_feedback;
CREATE POLICY "Athletes can view own feedback"
  ON nutrition_feedback FOR SELECT
  TO authenticated
  USING (athlete_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Athletes can create own feedback" ON nutrition_feedback;
CREATE POLICY "Athletes can create own feedback"
  ON nutrition_feedback FOR INSERT
  TO authenticated
  WITH CHECK (athlete_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Trainers can view athletes feedback" ON nutrition_feedback;
CREATE POLICY "Trainers can view athletes feedback"
  ON nutrition_feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = nutrition_feedback.athlete_id
      AND profiles.assigned_trainer_id = (SELECT auth.uid())
    )
  );

-- Culture Packs
ALTER TABLE culture_food_packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view culture packs" ON culture_food_packs;
CREATE POLICY "Everyone can view culture packs"
  ON culture_food_packs FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Trainers can create culture packs" ON culture_food_packs;
CREATE POLICY "Trainers can create culture packs"
  ON culture_food_packs FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT (auth.jwt()->>'app_metadata')::json->>'role') IN ('trainer', 'admin')
  );

-- Culture Pack Foods
ALTER TABLE culture_pack_foods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view pack foods" ON culture_pack_foods;
CREATE POLICY "Everyone can view pack foods"
  ON culture_pack_foods FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Trainers can manage pack foods" ON culture_pack_foods;
CREATE POLICY "Trainers can manage pack foods"
  ON culture_pack_foods FOR ALL
  TO authenticated
  USING (
    (SELECT (auth.jwt()->>'app_metadata')::json->>'role') IN ('trainer', 'admin')
  );
