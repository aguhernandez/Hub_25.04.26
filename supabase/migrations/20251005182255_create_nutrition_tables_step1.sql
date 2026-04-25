/*
  # Nutrition Planning System - Step 1: Base Tables
  
  Creates the core tables for the nutrition module.
*/

-- Create food_items table
CREATE TABLE food_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  brand text,
  
  calories numeric(7,2) NOT NULL DEFAULT 0,
  protein numeric(6,2) NOT NULL DEFAULT 0,
  carbs numeric(6,2) NOT NULL DEFAULT 0,
  fats numeric(6,2) NOT NULL DEFAULT 0,
  fiber numeric(6,2) DEFAULT 0,
  sodium numeric(7,2) DEFAULT 0,
  sugar numeric(6,2) DEFAULT 0,
  
  serving_size numeric(7,2) DEFAULT 100,
  serving_unit text NOT NULL DEFAULT 'g',
  
  is_public boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create meal_plans table
CREATE TABLE meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  coach_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  
  title text NOT NULL,
  description text,
  
  protein_goal numeric(6,1),
  carbs_goal numeric(6,1),
  fats_goal numeric(6,1),
  calories_goal numeric(7,1),
  
  start_date date NOT NULL,
  end_date date,
  duration_days integer NOT NULL DEFAULT 7,
  
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create meal_plan_meals table
CREATE TABLE meal_plan_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES meal_plans(id) ON DELETE CASCADE NOT NULL,
  
  day_number integer NOT NULL CHECK (day_number >= 1),
  meal_type text NOT NULL CHECK (meal_type IN ('breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'evening_snack', 'other')),
  meal_name text,
  meal_time time,
  notes text,
  
  sort_order integer DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE (plan_id, day_number, meal_type)
);

-- Create meal_plan_items table
CREATE TABLE meal_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid REFERENCES meal_plan_meals(id) ON DELETE CASCADE NOT NULL,
  food_id uuid REFERENCES food_items(id) ON DELETE RESTRICT NOT NULL,
  
  amount numeric(7,2) NOT NULL,
  unit text NOT NULL,
  
  is_alternative boolean DEFAULT false,
  alternative_note text,
  
  sort_order integer DEFAULT 0,
  
  created_at timestamptz DEFAULT now()
);

-- Create shopping_lists table
CREATE TABLE shopping_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES meal_plans(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  title text NOT NULL,
  generated_at timestamptz DEFAULT now(),
  
  start_date date NOT NULL,
  end_date date NOT NULL,
  days_covered integer NOT NULL,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create shopping_list_items table
CREATE TABLE shopping_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid REFERENCES shopping_lists(id) ON DELETE CASCADE NOT NULL,
  
  food_id uuid REFERENCES food_items(id) ON DELETE SET NULL,
  
  item_name text NOT NULL,
  total_amount numeric(8,2) NOT NULL,
  unit text NOT NULL,
  category text,
  
  is_purchased boolean DEFAULT false,
  is_manual boolean DEFAULT false,
  
  sort_order integer DEFAULT 0,
  
  created_at timestamptz DEFAULT now()
);

-- Create athlete_preferences table
CREATE TABLE athlete_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  is_vegetarian boolean DEFAULT false,
  is_vegan boolean DEFAULT false,
  is_gluten_free boolean DEFAULT false,
  is_lactose_free boolean DEFAULT false,
  is_halal boolean DEFAULT false,
  is_kosher boolean DEFAULT false,
  
  allergies text[],
  dislikes text[],
  custom_restrictions text,
  
  preferred_cuisines text[],
  meal_frequency integer DEFAULT 3,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_food_items_category ON food_items(category);
CREATE INDEX idx_food_items_name ON food_items(name);
CREATE INDEX idx_meal_plans_athlete ON meal_plans(athlete_id);
CREATE INDEX idx_meal_plans_coach ON meal_plans(coach_id);
CREATE INDEX idx_meal_plans_status ON meal_plans(status);
CREATE INDEX idx_meal_plan_meals_plan ON meal_plan_meals(plan_id);
CREATE INDEX idx_meal_plan_meals_day ON meal_plan_meals(day_number);
CREATE INDEX idx_meal_plan_items_meal ON meal_plan_items(meal_id);
CREATE INDEX idx_shopping_lists_plan ON shopping_lists(plan_id);
CREATE INDEX idx_shopping_lists_user ON shopping_lists(user_id);

-- Enable RLS
ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_preferences ENABLE ROW LEVEL SECURITY;
