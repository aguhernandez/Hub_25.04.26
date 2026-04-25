/*
  # Fix Anamnesis System - Athlete Ownership & History

  1. Changes
    - Remove recreational_drugs field from nutrition_anamnesis
    - Add version/history tracking with created_at
    - Change RLS: Athletes create and manage their own anamnesis
    - Trainers can VIEW athlete anamnesis (read-only)
    - Add is_active flag to track current vs historical anamnesis

  2. Security
    - Athletes can create, update, and view their own anamnesis
    - Trainers can only VIEW anamnesis of their assigned athletes
    - Admins can view all
*/

-- Remove recreational drugs field
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nutrition_anamnesis' AND column_name = 'recreational_drugs'
  ) THEN
    ALTER TABLE nutrition_anamnesis DROP COLUMN recreational_drugs;
  END IF;
END $$;

-- Add version tracking and active status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nutrition_anamnesis' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE nutrition_anamnesis ADD COLUMN is_active boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nutrition_anamnesis' AND column_name = 'version_number'
  ) THEN
    ALTER TABLE nutrition_anamnesis ADD COLUMN version_number integer DEFAULT 1;
  END IF;
END $$;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Trainers can manage athlete anamnesis" ON nutrition_anamnesis;
DROP POLICY IF EXISTS "Athletes can view own anamnesis" ON nutrition_anamnesis;
DROP POLICY IF EXISTS "Admins can manage all anamnesis" ON nutrition_anamnesis;
DROP POLICY IF EXISTS "Trainers can create anamnesis for athletes" ON nutrition_anamnesis;
DROP POLICY IF EXISTS "Athletes can read own anamnesis" ON nutrition_anamnesis;
DROP POLICY IF EXISTS "Athletes can create own anamnesis" ON nutrition_anamnesis;
DROP POLICY IF EXISTS "Athletes can update own anamnesis" ON nutrition_anamnesis;
DROP POLICY IF EXISTS "Athletes can delete own anamnesis" ON nutrition_anamnesis;

-- New RLS Policies: Athletes own and manage their anamnesis

-- Athletes can create their own anamnesis
CREATE POLICY "Athletes can create own anamnesis"
  ON nutrition_anamnesis
  FOR INSERT
  TO authenticated
  WITH CHECK (
    athlete_id = auth.uid()
  );

-- Athletes can view their own anamnesis
-- Trainers can view anamnesis of assigned athletes
CREATE POLICY "View own or assigned anamnesis"
  ON nutrition_anamnesis
  FOR SELECT
  TO authenticated
  USING (
    athlete_id = auth.uid()
    OR
    -- Trainers can view anamnesis of their assigned athletes
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = nutrition_anamnesis.athlete_id
      AND profiles.assigned_trainer_id = auth.uid()
    )
    OR
    -- Admins can view all
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Athletes can update their own anamnesis
CREATE POLICY "Athletes can update own anamnesis"
  ON nutrition_anamnesis
  FOR UPDATE
  TO authenticated
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

-- Athletes can delete their own anamnesis
CREATE POLICY "Athletes can delete own anamnesis"
  ON nutrition_anamnesis
  FOR DELETE
  TO authenticated
  USING (athlete_id = auth.uid());

-- Admins can manage all anamnesis
CREATE POLICY "Admins can manage all anamnesis"
  ON nutrition_anamnesis
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

-- Create index for querying active anamnesis
CREATE INDEX IF NOT EXISTS idx_nutrition_anamnesis_active ON nutrition_anamnesis(athlete_id, is_active, created_at DESC);

-- Function to deactivate old anamnesis when creating new one
CREATE OR REPLACE FUNCTION deactivate_old_anamnesis()
RETURNS TRIGGER AS $$
BEGIN
  -- When inserting a new anamnesis, deactivate all previous ones for this athlete
  IF TG_OP = 'INSERT' THEN
    UPDATE nutrition_anamnesis
    SET is_active = false
    WHERE athlete_id = NEW.athlete_id
    AND id != NEW.id
    AND is_active = true;
    
    -- Set version number
    NEW.version_number := COALESCE(
      (SELECT MAX(version_number) + 1 FROM nutrition_anamnesis WHERE athlete_id = NEW.athlete_id),
      1
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_deactivate_old_anamnesis ON nutrition_anamnesis;
CREATE TRIGGER trigger_deactivate_old_anamnesis
  BEFORE INSERT ON nutrition_anamnesis
  FOR EACH ROW
  EXECUTE FUNCTION deactivate_old_anamnesis();
