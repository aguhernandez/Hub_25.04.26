/*
  # Create Meal Templates System
  
  ## Overview
  Allows trainers and athletes to save meal compositions as reusable templates
  
  ## New Tables
  
  ### `meal_templates`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `name` (text) - Template name (e.g., "Pre-workout breakfast")
  - `meal_type` (text) - breakfast, lunch, dinner, snack
  - `is_public` (boolean) - Can others see it?
  - `total_calories` (numeric)
  - `total_protein` (numeric)
  - `total_carbs` (numeric)
  - `total_fat` (numeric)
  - `created_at` (timestamptz)
  
  ### `meal_template_items`
  - `id` (uuid, primary key)
  - `template_id` (uuid, references meal_templates)
  - `food_id` (uuid, references foods)
  - `amount` (numeric) - Amount in grams
  - `sort_order` (integer)
  - `created_at` (timestamptz)
  
  ## Security
  - Row Level Security enabled on both tables
  - Users can create, read, update, delete their own templates
  - Users can read public templates from others
*/

-- Create meal_templates table
CREATE TABLE IF NOT EXISTS meal_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  meal_type text CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'other')),
  is_public boolean DEFAULT false,
  total_calories numeric(10,2),
  total_protein numeric(10,2),
  total_carbs numeric(10,2),
  total_fat numeric(10,2),
  created_at timestamptz DEFAULT now()
);

-- Create meal_template_items table
CREATE TABLE IF NOT EXISTS meal_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES meal_templates(id) ON DELETE CASCADE,
  food_id uuid NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE meal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_template_items ENABLE ROW LEVEL SECURITY;

-- Policies for meal_templates
CREATE POLICY "Users can create own templates"
  ON meal_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own templates"
  ON meal_templates FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can update own templates"
  ON meal_templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON meal_templates FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for meal_template_items
CREATE POLICY "Users can create items for own templates"
  ON meal_template_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meal_templates
      WHERE meal_templates.id = meal_template_items.template_id
      AND meal_templates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can read items from accessible templates"
  ON meal_template_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_templates
      WHERE meal_templates.id = meal_template_items.template_id
      AND (meal_templates.user_id = auth.uid() OR meal_templates.is_public = true)
    )
  );

CREATE POLICY "Users can update items in own templates"
  ON meal_template_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_templates
      WHERE meal_templates.id = meal_template_items.template_id
      AND meal_templates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items from own templates"
  ON meal_template_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_templates
      WHERE meal_templates.id = meal_template_items.template_id
      AND meal_templates.user_id = auth.uid()
    )
  );

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_meal_templates_user_id ON meal_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_templates_is_public ON meal_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_meal_template_items_template_id ON meal_template_items(template_id);
CREATE INDEX IF NOT EXISTS idx_meal_template_items_food_id ON meal_template_items(food_id);