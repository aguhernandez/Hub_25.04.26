/*
  # Anthropometry Tables

  ## New Tables
  
  ### `anthropometry_measurements`
  Stores individual anthropometric measurements for athletes
  - `id` (uuid, primary key)
  - `athlete_id` (uuid, foreign key to profiles)
  - `measurement_date` (date)
  - `variable` (text) - Name of measurement (e.g., weight_kg, height_cm, triceps)
  - `value` (text) - Measurement value (stored as text to handle numeric and non-numeric)
  - `source_sheet` (text) - Source reference
  - `notes` (text, optional)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `anthropometry_indices`
  Stores calculated indices and composite values
  - `id` (uuid, primary key)
  - `athlete_id` (uuid, foreign key to profiles)
  - `measurement_date` (date)
  - `index_name` (text) - Name of the index
  - `index_value` (numeric)
  - `category` (text, optional) - Classification category
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on both tables
  - Athletes can read their own data
  - Trainers and admins can read/write all data
*/

-- Create anthropometry_measurements table
CREATE TABLE IF NOT EXISTS anthropometry_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  measurement_date date NOT NULL DEFAULT CURRENT_DATE,
  variable text NOT NULL,
  value text NOT NULL,
  source_sheet text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create anthropometry_indices table
CREATE TABLE IF NOT EXISTS anthropometry_indices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  measurement_date date NOT NULL DEFAULT CURRENT_DATE,
  index_name text NOT NULL,
  index_value numeric NOT NULL,
  category text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_anthropometry_measurements_athlete 
  ON anthropometry_measurements(athlete_id, measurement_date DESC);

CREATE INDEX IF NOT EXISTS idx_anthropometry_measurements_variable 
  ON anthropometry_measurements(athlete_id, variable, measurement_date DESC);

CREATE INDEX IF NOT EXISTS idx_anthropometry_indices_athlete 
  ON anthropometry_indices(athlete_id, measurement_date DESC);

-- Enable Row Level Security
ALTER TABLE anthropometry_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE anthropometry_indices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for anthropometry_measurements
CREATE POLICY "Athletes can view own measurements"
  ON anthropometry_measurements FOR SELECT
  TO authenticated
  USING (auth.uid() = athlete_id);

CREATE POLICY "Trainers and admins can view all measurements"
  ON anthropometry_measurements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('trainer', 'admin')
    )
  );

CREATE POLICY "Trainers and admins can insert measurements"
  ON anthropometry_measurements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('trainer', 'admin')
    )
  );

CREATE POLICY "Trainers and admins can update measurements"
  ON anthropometry_measurements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('trainer', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('trainer', 'admin')
    )
  );

CREATE POLICY "Trainers and admins can delete measurements"
  ON anthropometry_measurements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('trainer', 'admin')
    )
  );

-- RLS Policies for anthropometry_indices
CREATE POLICY "Athletes can view own indices"
  ON anthropometry_indices FOR SELECT
  TO authenticated
  USING (auth.uid() = athlete_id);

CREATE POLICY "Trainers and admins can view all indices"
  ON anthropometry_indices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('trainer', 'admin')
    )
  );

CREATE POLICY "Trainers and admins can insert indices"
  ON anthropometry_indices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('trainer', 'admin')
    )
  );

CREATE POLICY "Trainers and admins can update indices"
  ON anthropometry_indices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('trainer', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('trainer', 'admin')
    )
  );

CREATE POLICY "Trainers and admins can delete indices"
  ON anthropometry_indices FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('trainer', 'admin')
    )
  );
