/*
  # Food Diary System (24-48h Anamnesis)

  Creates tables for daily food logging with optional AI recognition.
  No images are stored, only text descriptions and nutritional estimates.
*/

-- Create food_diary_sessions table
CREATE TABLE IF NOT EXISTS food_diary_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  period_hours integer NOT NULL CHECK (period_hours IN (24, 48)),
  start_date date NOT NULL,
  day_of_week text NOT NULL,
  status text DEFAULT 'in_progress',
  total_calories numeric DEFAULT 0,
  total_carbs_g numeric DEFAULT 0,
  total_protein_g numeric DEFAULT 0,
  total_fat_g numeric DEFAULT 0,
  ai_observations jsonb,
  professional_notes text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create food_diary_entries table
CREATE TABLE IF NOT EXISTS food_diary_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES food_diary_sessions(id) ON DELETE CASCADE NOT NULL,
  entry_time time NOT NULL,
  meal_type text NOT NULL,
  entry_method text NOT NULL DEFAULT 'manual',
  food_description text NOT NULL,
  estimated_calories numeric DEFAULT 0,
  estimated_carbs_g numeric DEFAULT 0,
  estimated_protein_g numeric DEFAULT 0,
  estimated_fat_g numeric DEFAULT 0,
  additional_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_food_diary_sessions_athlete ON food_diary_sessions(athlete_id);
CREATE INDEX IF NOT EXISTS idx_food_diary_entries_session ON food_diary_entries(session_id);

-- Enable RLS
ALTER TABLE food_diary_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_diary_entries ENABLE ROW LEVEL SECURITY;

-- Sessions policies
CREATE POLICY "Athletes and trainers can view sessions"
  ON food_diary_sessions FOR SELECT
  TO authenticated
  USING (
    athlete_id = auth.uid()
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('trainer', 'admin'))
  );

CREATE POLICY "Athletes can create own sessions"
  ON food_diary_sessions FOR INSERT
  TO authenticated
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Athletes and trainers can update sessions"
  ON food_diary_sessions FOR UPDATE
  TO authenticated
  USING (
    athlete_id = auth.uid()
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('trainer', 'admin'))
  );

CREATE POLICY "Athletes can delete own sessions"
  ON food_diary_sessions FOR DELETE
  TO authenticated
  USING (athlete_id = auth.uid());

-- Entries policies
CREATE POLICY "View diary entries"
  ON food_diary_entries FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM food_diary_sessions
      WHERE athlete_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('trainer', 'admin'))
    )
  );

CREATE POLICY "Create diary entries"
  ON food_diary_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    session_id IN (SELECT id FROM food_diary_sessions WHERE athlete_id = auth.uid())
  );

CREATE POLICY "Update diary entries"
  ON food_diary_entries FOR UPDATE
  TO authenticated
  USING (
    session_id IN (SELECT id FROM food_diary_sessions WHERE athlete_id = auth.uid())
  );

CREATE POLICY "Delete diary entries"
  ON food_diary_entries FOR DELETE
  TO authenticated
  USING (
    session_id IN (SELECT id FROM food_diary_sessions WHERE athlete_id = auth.uid())
  );