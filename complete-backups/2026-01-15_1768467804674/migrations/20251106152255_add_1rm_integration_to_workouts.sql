/*
  # Add 1RM Integration to Workout Planning System

  ## Overview
  This migration connects the Strength Estimator (1RM calculations) with the Workout Builder,
  enabling automatic load prescription based on athletes' most recent 1RM estimates.

  ## Changes

  ### 1. Extend workout_exercises table
  - `use_1rm_auto_load` (boolean) - Whether to use automatic 1RM-based loading
  - `target_1rm_percentage` (numeric) - Target % of 1RM for this exercise (50-100%)
  - `reference_1rm_method` (text) - Preferred method: 'latest', 'epley', 'rir', 'velocity', 'baseline'
  - `calculated_load` (numeric) - Auto-calculated load based on 1RM
  - `freeze_1rm_reference` (boolean) - Lock 1RM value for training block
  - `frozen_1rm_value` (numeric) - Locked 1RM value if frozen
  - `frozen_1rm_unit` (text) - Unit of frozen 1RM
  - `frozen_at` (timestamptz) - When the 1RM was frozen

  ### 2. Create 1rm_update_notifications table
  - Tracks when new 1RM estimates trigger load recalculation suggestions
  - `id` (uuid, primary key)
  - `athlete_id` (uuid, references profiles)
  - `trainer_id` (uuid, references profiles)
  - `exercise_name` (text)
  - `old_1rm` (numeric)
  - `new_1rm` (numeric)
  - `percentage_change` (numeric)
  - `unit` (text)
  - `affected_workouts` (jsonb) - List of workout IDs that use this exercise
  - `status` (text) - 'pending', 'applied', 'dismissed'
  - `created_at` (timestamptz)
  - `resolved_at` (timestamptz)

  ### 3. Create function to get latest 1RM
  - Helper function to retrieve most recent 1RM estimate for an athlete/exercise combination
  - Supports filtering by method (epley, rir, velocity) or baseline

  ### 4. Create function to calculate recommended loads
  - Auto-calculates loads based on target percentage and latest 1RM
  - Respects frozen values during training blocks

  ## Security
  - Enable RLS on 1rm_update_notifications
  - Athletes can view their own notifications
  - Trainers can view/manage notifications for their athletes
  - Admins have full access

  ## Important Notes
  - When a new 1RM estimate is saved, if the change is ≥5%, a notification is created
  - Coaches can freeze 1RM values for training blocks (e.g., 4-12 weeks)
  - The system suggests recalculation but doesn't force it
  - Supports mixed approaches: some exercises auto-loaded, others manual
*/

-- Add 1RM integration columns to workout_exercises
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workout_exercises' AND column_name = 'use_1rm_auto_load'
  ) THEN
    ALTER TABLE workout_exercises
    ADD COLUMN use_1rm_auto_load boolean DEFAULT false,
    ADD COLUMN target_1rm_percentage numeric(5,2) CHECK (target_1rm_percentage >= 50 AND target_1rm_percentage <= 100),
    ADD COLUMN reference_1rm_method text CHECK (reference_1rm_method IN ('latest', 'epley', 'rir', 'velocity', 'baseline')),
    ADD COLUMN calculated_load numeric(6,2),
    ADD COLUMN freeze_1rm_reference boolean DEFAULT false,
    ADD COLUMN frozen_1rm_value numeric(6,2),
    ADD COLUMN frozen_1rm_unit text CHECK (frozen_1rm_unit IN ('kg', 'lb')),
    ADD COLUMN frozen_at timestamptz;
  END IF;
END $$;

-- Create 1RM update notifications table
CREATE TABLE IF NOT EXISTS one_rm_update_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  exercise_name text NOT NULL,
  old_1rm numeric(6,2),
  new_1rm numeric(6,2) NOT NULL,
  percentage_change numeric(5,2) NOT NULL,
  unit text NOT NULL CHECK (unit IN ('kg', 'lb')),
  affected_workouts jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'dismissed')),
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_1rm_notifications_athlete_status
  ON one_rm_update_notifications(athlete_id, status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_1rm_notifications_trainer_status
  ON one_rm_update_notifications(trainer_id, status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_workout_exercises_1rm_auto
  ON workout_exercises(exercise_id, use_1rm_auto_load)
  WHERE use_1rm_auto_load = true;

-- Enable RLS on notifications table
ALTER TABLE one_rm_update_notifications ENABLE ROW LEVEL SECURITY;

-- Athletes can view their own notifications
CREATE POLICY "Athletes can view own 1RM notifications"
  ON one_rm_update_notifications FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

-- Athletes can update their own notifications (apply/dismiss)
CREATE POLICY "Athletes can update own 1RM notifications"
  ON one_rm_update_notifications FOR UPDATE
  TO authenticated
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

-- Trainers can view notifications for their athletes
CREATE POLICY "Trainers can view athlete 1RM notifications"
  ON one_rm_update_notifications FOR SELECT
  TO authenticated
  USING (
    trainer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = one_rm_update_notifications.athlete_id
      AND profiles.assigned_trainer_id = auth.uid()
    )
  );

-- Trainers can update notifications for their athletes
CREATE POLICY "Trainers can update athlete 1RM notifications"
  ON one_rm_update_notifications FOR UPDATE
  TO authenticated
  USING (
    trainer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = one_rm_update_notifications.athlete_id
      AND profiles.assigned_trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    trainer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = athlete_id
      AND p.assigned_trainer_id = auth.uid()
    )
  );

-- System can insert notifications (for function/trigger use)
CREATE POLICY "System can insert 1RM notifications"
  ON one_rm_update_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admins can manage all notifications
CREATE POLICY "Admins can manage all 1RM notifications"
  ON one_rm_update_notifications FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to get latest 1RM for athlete/exercise
CREATE OR REPLACE FUNCTION get_latest_1rm(
  p_athlete_id uuid,
  p_exercise_name text,
  p_method text DEFAULT 'latest'
)
RETURNS TABLE (
  estimated_1rm numeric,
  unit text,
  estimation_method text,
  calculated_at timestamptz
) AS $$
BEGIN
  IF p_method = 'baseline' THEN
    -- Get baseline 1RM
    RETURN QUERY
    SELECT 
      se.estimated_1rm,
      se.unit,
      se.estimation_method,
      se.calculated_at
    FROM strength_estimates se
    WHERE se.athlete_id = p_athlete_id
      AND se.exercise_name = p_exercise_name
      AND se.is_baseline = true
    ORDER BY se.calculated_at DESC
    LIMIT 1;
  ELSIF p_method IN ('epley', 'rir', 'velocity') THEN
    -- Get latest from specific method
    RETURN QUERY
    SELECT 
      se.estimated_1rm,
      se.unit,
      se.estimation_method,
      se.calculated_at
    FROM strength_estimates se
    WHERE se.athlete_id = p_athlete_id
      AND se.exercise_name = p_exercise_name
      AND se.estimation_method = p_method
    ORDER BY se.calculated_at DESC
    LIMIT 1;
  ELSE
    -- Get absolute latest regardless of method
    RETURN QUERY
    SELECT 
      se.estimated_1rm,
      se.unit,
      se.estimation_method,
      se.calculated_at
    FROM strength_estimates se
    WHERE se.athlete_id = p_athlete_id
      AND se.exercise_name = p_exercise_name
    ORDER BY se.calculated_at DESC
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate load from 1RM and percentage
CREATE OR REPLACE FUNCTION calculate_load_from_1rm(
  p_one_rm numeric,
  p_percentage numeric
)
RETURNS numeric AS $$
BEGIN
  RETURN ROUND((p_one_rm * p_percentage / 100)::numeric, 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check for significant 1RM changes and create notifications
CREATE OR REPLACE FUNCTION check_1rm_change_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_previous_1rm numeric;
  v_percentage_change numeric;
  v_affected_workouts jsonb;
BEGIN
  -- Get the previous 1RM (excluding the one just inserted)
  SELECT estimated_1rm INTO v_previous_1rm
  FROM strength_estimates
  WHERE athlete_id = NEW.athlete_id
    AND exercise_name = NEW.exercise_name
    AND id != NEW.id
  ORDER BY calculated_at DESC
  LIMIT 1;

  -- If there's a previous value, calculate change
  IF v_previous_1rm IS NOT NULL THEN
    v_percentage_change := ABS(((NEW.estimated_1rm - v_previous_1rm) / v_previous_1rm) * 100);
    
    -- If change is >= 5%, create notification
    IF v_percentage_change >= 5 THEN
      -- Find affected workouts (workouts using this exercise with auto-load)
      SELECT jsonb_agg(DISTINCT jsonb_build_object(
        'workout_id', w.id,
        'workout_name', w.name,
        'scheduled_date', aw.scheduled_date
      ))
      INTO v_affected_workouts
      FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      LEFT JOIN athlete_workouts aw ON aw.workout_id = w.id AND aw.athlete_id = NEW.athlete_id
      JOIN exercises e ON e.id = we.exercise_id
      WHERE e.exercise = NEW.exercise_name
        AND we.use_1rm_auto_load = true
        AND (aw.athlete_id = NEW.athlete_id OR w.trainer_id = NEW.trainer_id);

      -- Create notification if there are affected workouts
      IF v_affected_workouts IS NOT NULL THEN
        INSERT INTO one_rm_update_notifications (
          athlete_id,
          trainer_id,
          exercise_name,
          old_1rm,
          new_1rm,
          percentage_change,
          unit,
          affected_workouts
        ) VALUES (
          NEW.athlete_id,
          NEW.trainer_id,
          NEW.exercise_name,
          v_previous_1rm,
          NEW.estimated_1rm,
          v_percentage_change,
          NEW.unit,
          COALESCE(v_affected_workouts, '[]'::jsonb)
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to check for 1RM changes
DROP TRIGGER IF EXISTS trigger_check_1rm_change ON strength_estimates;
CREATE TRIGGER trigger_check_1rm_change
  AFTER INSERT ON strength_estimates
  FOR EACH ROW
  EXECUTE FUNCTION check_1rm_change_notification();
