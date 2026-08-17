/*
  # Fix Training Programs Visibility

  ## Problem
  All 21 training programs have a specific trainer_id so:
  - Athletes without that assigned_trainer_id see 0 programs
  - Trainers with a different user ID see 0 programs  
  - RLS policies are conflicting and duplicated

  ## Changes
  1. Add is_platform_program boolean to program_products
  2. Mark all existing published programs as platform programs
  3. Consolidate and fix all RLS policies on program_products
  4. athlete_programs table already exists - just fix its RLS
*/

-- 1. Add is_platform_program flag
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'program_products' AND column_name = 'is_platform_program'
  ) THEN
    ALTER TABLE program_products ADD COLUMN is_platform_program boolean DEFAULT false;
  END IF;
END $$;

-- 2. Mark all existing published programs as platform programs visible to all
UPDATE program_products
SET is_platform_program = true
WHERE is_published = true;

-- 3. Drop all existing conflicting policies on program_products
DROP POLICY IF EXISTS "Athletes can view published programs" ON program_products;
DROP POLICY IF EXISTS "Athletes can view published programs from Asciende or their tra" ON program_products;
DROP POLICY IF EXISTS "Trainers can view their own programs" ON program_products;
DROP POLICY IF EXISTS "Trainers and admins can view all programs" ON program_products;
DROP POLICY IF EXISTS "Admins can manage all programs" ON program_products;
DROP POLICY IF EXISTS "Admins can update any program" ON program_products;
DROP POLICY IF EXISTS "Admins can delete any program" ON program_products;
DROP POLICY IF EXISTS "Trainers can create programs" ON program_products;
DROP POLICY IF EXISTS "Trainers can update their own programs" ON program_products;
DROP POLICY IF EXISTS "Trainers can delete their own programs" ON program_products;

-- 4. Consolidated SELECT: everyone sees published; trainers/admins see all
CREATE POLICY "Anyone can view published programs"
  ON program_products FOR SELECT
  TO authenticated
  USING (
    is_published = true
    OR trainer_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'trainer')
    )
  );

-- 5. Trainers and admins can create programs
CREATE POLICY "Trainers and admins can create programs"
  ON program_products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'trainer')
    )
  );

-- 6. Trainers update their own; admins update any
CREATE POLICY "Trainers can update own programs"
  ON program_products FOR UPDATE
  TO authenticated
  USING (
    trainer_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    trainer_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

-- 7. Trainers delete their own; admins delete any
CREATE POLICY "Trainers can delete own programs"
  ON program_products FOR DELETE
  TO authenticated
  USING (
    trainer_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

-- 8. Fix athlete_programs RLS (table already exists with trainer_id column)
DROP POLICY IF EXISTS "Athletes can view own program assignments" ON athlete_programs;
DROP POLICY IF EXISTS "Trainers can assign programs to athletes" ON athlete_programs;
DROP POLICY IF EXISTS "Trainers can update program assignments" ON athlete_programs;
DROP POLICY IF EXISTS "Trainers can delete program assignments" ON athlete_programs;

CREATE POLICY "Athletes view own assignments"
  ON athlete_programs FOR SELECT
  TO authenticated
  USING (
    athlete_id = (SELECT auth.uid())
    OR trainer_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'trainer')
    )
  );

CREATE POLICY "Trainers assign programs"
  ON athlete_programs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'trainer')
    )
  );

CREATE POLICY "Trainers update assignments"
  ON athlete_programs FOR UPDATE
  TO authenticated
  USING (
    trainer_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'trainer')
    )
  )
  WITH CHECK (
    trainer_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'trainer')
    )
  );

CREATE POLICY "Trainers delete assignments"
  ON athlete_programs FOR DELETE
  TO authenticated
  USING (
    trainer_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'trainer')
    )
  );
