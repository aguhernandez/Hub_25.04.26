/*
  # Add plan reference columns to endurance_completed_workouts

  Adds plan_week_id and plan_day_index so that when an athlete logs a workout
  from an external_endurance_plans week, we know exactly which day to mark
  as completed in the plan_data.days[] JSON array.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'endurance_completed_workouts' AND column_name = 'plan_week_id'
  ) THEN
    ALTER TABLE endurance_completed_workouts ADD COLUMN plan_week_id uuid REFERENCES external_endurance_plans(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'endurance_completed_workouts' AND column_name = 'plan_day_index'
  ) THEN
    ALTER TABLE endurance_completed_workouts ADD COLUMN plan_day_index integer;
  END IF;
END $$;
