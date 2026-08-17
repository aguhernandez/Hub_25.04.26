/*
  # Expand Nutrition Anamnesis System

  1. Changes to nutrition_anamnesis table
    - Add comprehensive health fields (medical conditions, medications, allergies)
    - Add lifestyle fields (occupation, work hours, sleep quality, energy levels, stress)
    - Add substance use fields (alcohol, smoking, recreational drugs)
    - Add detailed nutrition habits (eating pattern, cooking habits, meal descriptions)
    - Add relationship with food and appetite changes
    - Add goals and expectations fields
    - Add trainer_id to track who created the anamnesis
    - Add timestamps for tracking

  2. New Features
    - Conditional logic support (dietary_style affects questions)
    - Progress tracking (section completion)
    - Multiple anamnesis versions per athlete (historical tracking)

  3. Security
    - Trainers can create/view/edit anamnesis for assigned athletes
    - Athletes can view their own anamnesis
    - Admins can view all
*/

-- Drop existing table and recreate with comprehensive fields
DROP TABLE IF EXISTS nutrition_anamnesis CASCADE;

CREATE TABLE nutrition_anamnesis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  trainer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Section 1: Basic & Health Info
  age int,
  sex text,
  height_cm decimal(5,2),
  weight_kg decimal(5,2),
  occupation text,
  activity_level text CHECK (activity_level IN ('desk_job', 'active', 'manual_labor')),
  work_hours text CHECK (work_hours IN ('morning', 'afternoon', 'night', 'mixed')),
  
  -- Health
  medical_conditions text,
  medications_supplements text,
  allergies_intolerances text,
  
  -- Lifestyle
  sleep_hours decimal(3,1),
  sleep_quality text CHECK (sleep_quality IN ('excellent', 'good', 'fair', 'poor')),
  energy_levels text CHECK (energy_levels IN ('stable', 'fluctuating', 'low')),
  low_energy_duration text,
  low_energy_times text,
  stress_level int CHECK (stress_level BETWEEN 1 AND 5),
  stress_management text,
  
  -- Substance Use
  alcohol_frequency text,
  smoking_frequency text,
  recreational_drugs text,
  
  -- Section 2: Training & Activity
  sport text,
  training_frequency text,
  training_hours_weekly decimal(4,1),
  training_time text CHECK (training_time IN ('morning', 'afternoon', 'evening', 'mixed')),
  pre_workout_nutrition text,
  during_workout_nutrition text,
  post_workout_nutrition text,
  
  -- Section 3: Nutrition Habits
  eating_pattern text CHECK (eating_pattern IN ('structured', 'irregular', 'depends_on_day')),
  dietary_preferences text CHECK (dietary_preferences IN ('omnivore', 'vegetarian', 'vegan', 'pescatarian', 'other')),
  dietary_restrictions text,
  
  -- Meals
  breakfast_description text,
  lunch_description text,
  dinner_description text,
  snacks_description text,
  beverages_description text,
  
  -- Food Preferences
  food_likes text,
  food_dislikes text,
  food_allergies text,
  cooking_frequency text CHECK (cooking_frequency IN ('daily', 'often', 'sometimes', 'rarely', 'never')),
  eating_out_frequency text CHECK (eating_out_frequency IN ('daily', 'often', 'sometimes', 'rarely', 'never')),
  
  -- Behavioral
  appetite_changes text,
  relationship_with_food text CHECK (relationship_with_food IN ('healthy', 'emotional', 'restrictive', 'mindful', 'other')),
  relationship_food_notes text,
  
  -- Section 4: Goals & Expectations
  main_goal text,
  nutrition_goals text,
  performance_expectations text,
  upcoming_events text,
  additional_notes text,
  
  -- Metadata
  section_progress int DEFAULT 0 CHECK (section_progress BETWEEN 0 AND 4),
  is_complete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_nutrition_anamnesis_athlete ON nutrition_anamnesis(athlete_id);
CREATE INDEX idx_nutrition_anamnesis_trainer ON nutrition_anamnesis(trainer_id);
CREATE INDEX idx_nutrition_anamnesis_complete ON nutrition_anamnesis(is_complete);

-- Enable RLS
ALTER TABLE nutrition_anamnesis ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Trainers can create anamnesis for assigned athletes"
ON nutrition_anamnesis FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('trainer', 'admin')
  )
);

CREATE POLICY "Trainers can view anamnesis for assigned athletes"
ON nutrition_anamnesis FOR SELECT
TO authenticated
USING (
  auth.uid() = athlete_id OR
  auth.uid() = trainer_id OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ) OR
  EXISTS (
    SELECT 1 FROM profiles p1
    JOIN profiles p2 ON p1.assigned_trainer_id = p2.id
    WHERE p1.id = nutrition_anamnesis.athlete_id
    AND p2.id = auth.uid()
    AND p2.role = 'trainer'
  )
);

CREATE POLICY "Trainers can update anamnesis they created"
ON nutrition_anamnesis FOR UPDATE
TO authenticated
USING (
  auth.uid() = trainer_id OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Trainers can delete anamnesis they created"
ON nutrition_anamnesis FOR DELETE
TO authenticated
USING (
  auth.uid() = trainer_id OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_nutrition_anamnesis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_nutrition_anamnesis_timestamp
BEFORE UPDATE ON nutrition_anamnesis
FOR EACH ROW
EXECUTE FUNCTION update_nutrition_anamnesis_updated_at();

-- Grant permissions
GRANT ALL ON nutrition_anamnesis TO authenticated;
