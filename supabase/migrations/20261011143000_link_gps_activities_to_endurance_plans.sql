ALTER TABLE public.external_activities
  ADD COLUMN IF NOT EXISTS planned_workout_id uuid REFERENCES public.external_endurance_workouts(id) ON DELETE SET NULL;
ALTER TABLE public.external_activities
  ADD COLUMN IF NOT EXISTS plan_week_id uuid REFERENCES public.external_endurance_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plan_day_index integer;

CREATE INDEX IF NOT EXISTS idx_external_activities_planned_workout
  ON public.external_activities(planned_workout_id) WHERE planned_workout_id IS NOT NULL;
