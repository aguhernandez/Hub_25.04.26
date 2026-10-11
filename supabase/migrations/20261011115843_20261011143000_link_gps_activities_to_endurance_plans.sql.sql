/*
# Link GPS activities to endurance plans

## Summary
Adds two reference columns to `external_activities` so GPS-recorded activities can
be linked back to their originating endurance plan and specific week/day.

## Modified Tables
- `external_activities`: adds `planned_workout_id` (FK to external_endurance_workouts,
  ON DELETE SET NULL), `plan_week_id` (FK to external_endurance_plans, ON DELETE
  SET NULL), and `plan_day_index` (integer).

## Security
- No RLS changes. The new columns inherit existing column-level privileges from
  external_activities.
*/

ALTER TABLE public.external_activities
  ADD COLUMN IF NOT EXISTS planned_workout_id uuid REFERENCES public.external_endurance_workouts(id) ON DELETE SET NULL;
ALTER TABLE public.external_activities
  ADD COLUMN IF NOT EXISTS plan_week_id uuid REFERENCES public.external_endurance_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plan_day_index integer;

CREATE INDEX IF NOT EXISTS idx_external_activities_planned_workout
  ON public.external_activities(planned_workout_id) WHERE planned_workout_id IS NOT NULL;
