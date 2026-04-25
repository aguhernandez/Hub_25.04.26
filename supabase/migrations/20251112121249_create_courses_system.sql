/*
  # Create Courses System

  1. New Tables
    - `courses`
      - `id` (uuid, primary key)
      - `title` (text) - Course title
      - `title_es` (text) - Spanish title
      - `description` (text) - English description
      - `description_es` (text) - Spanish description
      - `url` (text) - Course URL on base.asciende.pro
      - `image_url` (text) - Course thumbnail
      - `category` (text) - Course category (nutrition, training, recovery, etc.)
      - `price` (numeric) - Course price
      - `duration_hours` (integer) - Course duration in hours
      - `level` (text) - beginner, intermediate, advanced
      - `is_active` (boolean) - Published or not
      - `sort_order` (integer) - Display order
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `courses` table
    - Admins can manage courses
    - Everyone can view active courses
*/

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  title_es text,
  description text,
  description_es text,
  url text NOT NULL,
  image_url text,
  category text DEFAULT 'nutrition',
  price numeric DEFAULT 0,
  duration_hours integer,
  level text DEFAULT 'beginner',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Everyone can view active courses
CREATE POLICY "Anyone can view active courses"
  ON courses
  FOR SELECT
  USING (is_active = true);

-- Admins can manage all courses
CREATE POLICY "Admins can manage courses"
  ON courses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create index
CREATE INDEX IF NOT EXISTS idx_courses_active ON courses(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
