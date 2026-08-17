/*
  # Add created_by to tag junction tables

  ## Changes
  - Adds `created_by` (uuid, FK to auth.users) to all 5 junction tables:
    workout_tags, atp_plan_tags, program_tags, wellness_tags, habit_tags
  - This allows distinguishing tags placed by a trainer vs. the athlete themselves
  - Trainers can add tags to their athletes' content; athletes cannot remove those trainer-set tags
  - Default NULL so existing rows are preserved

  ## Security
  - RLS policies updated: athletes can only delete their own tags (where created_by = auth.uid())
  - Trainers/admins can delete any tag on content they manage
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_tags' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE workout_tags ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'atp_plan_tags' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE atp_plan_tags ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'program_tags' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE program_tags ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wellness_tags' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE wellness_tags ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'habit_tags' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE habit_tags ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Drop and recreate delete policies on junction tables to enforce ownership:
-- Athletes can only delete tags they placed themselves; trainers/admins can delete any.

-- workout_tags
DROP POLICY IF EXISTS "Users can remove workout tags" ON workout_tags;
DROP POLICY IF EXISTS "Athletes delete own workout tags" ON workout_tags;
DROP POLICY IF EXISTS "Trainers delete any workout tag" ON workout_tags;

CREATE POLICY "Athletes delete own workout tags"
  ON workout_tags FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('trainer', 'admin')
  );

-- atp_plan_tags
DROP POLICY IF EXISTS "Users can remove atp plan tags" ON atp_plan_tags;
DROP POLICY IF EXISTS "Athletes delete own atp plan tags" ON atp_plan_tags;
DROP POLICY IF EXISTS "Trainers delete any atp plan tag" ON atp_plan_tags;

CREATE POLICY "Athletes delete own atp plan tags"
  ON atp_plan_tags FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('trainer', 'admin')
  );

-- program_tags
DROP POLICY IF EXISTS "Users can remove program tags" ON program_tags;
DROP POLICY IF EXISTS "Athletes delete own program tags" ON program_tags;
DROP POLICY IF EXISTS "Trainers delete any program tag" ON program_tags;

CREATE POLICY "Athletes delete own program tags"
  ON program_tags FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('trainer', 'admin')
  );

-- wellness_tags
DROP POLICY IF EXISTS "Users can remove wellness tags" ON wellness_tags;
DROP POLICY IF EXISTS "Athletes delete own wellness tags" ON wellness_tags;
DROP POLICY IF EXISTS "Trainers delete any wellness tag" ON wellness_tags;

CREATE POLICY "Athletes delete own wellness tags"
  ON wellness_tags FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('trainer', 'admin')
  );

-- habit_tags
DROP POLICY IF EXISTS "Users can remove habit tags" ON habit_tags;
DROP POLICY IF EXISTS "Athletes delete own habit tags" ON habit_tags;
DROP POLICY IF EXISTS "Trainers delete any habit tag" ON habit_tags;

CREATE POLICY "Athletes delete own habit tags"
  ON habit_tags FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('trainer', 'admin')
  );
