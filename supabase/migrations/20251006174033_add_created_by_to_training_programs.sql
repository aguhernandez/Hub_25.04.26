/*
  # Add created_by and is_template to training_programs

  1. Changes
    - Add `created_by` column to track program creator
    - Add `is_template` column to mark templates
    - Add RLS policies for trainers and admins
  
  2. Security
    - Trainers and admins can create programs
    - Trainers can read their own programs
    - Admins can read all programs
    - Users can read public templates
*/

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'training_programs' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE training_programs ADD COLUMN created_by uuid REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'training_programs' AND column_name = 'is_template'
  ) THEN
    ALTER TABLE training_programs ADD COLUMN is_template boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'training_programs' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE training_programs ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "trainers_admins_create_programs" ON training_programs;
DROP POLICY IF EXISTS "trainers_read_own_programs" ON training_programs;
DROP POLICY IF EXISTS "admins_read_all_programs" ON training_programs;
DROP POLICY IF EXISTS "users_read_public_templates" ON training_programs;
DROP POLICY IF EXISTS "creators_update_own_programs" ON training_programs;
DROP POLICY IF EXISTS "creators_admins_delete_programs" ON training_programs;

-- Trainers and admins can create programs
CREATE POLICY "trainers_admins_create_programs"
  ON training_programs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('trainer', 'admin')
    )
  );

-- Trainers can read their own programs
CREATE POLICY "trainers_read_own_programs"
  ON training_programs
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- Admins can read all programs
CREATE POLICY "admins_read_all_programs"
  ON training_programs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Users can read public templates
CREATE POLICY "users_read_public_templates"
  ON training_programs
  FOR SELECT
  TO authenticated
  USING (is_template = true);

-- Creators can update their programs
CREATE POLICY "creators_update_own_programs"
  ON training_programs
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Creators and admins can delete programs
CREATE POLICY "creators_admins_delete_programs"
  ON training_programs
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );
