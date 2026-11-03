-- Support the two highest-volume Stats queries without scanning an athlete's full history.
CREATE INDEX IF NOT EXISTS idx_training_logs_athlete_logged_at
  ON public.training_logs (athlete_id, logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_athlete_workouts_completed_date
  ON public.athlete_workouts (athlete_id, scheduled_date DESC)
  WHERE status = 'completed';
