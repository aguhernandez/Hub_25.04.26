CREATE TABLE IF NOT EXISTS public.executed_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ow_event_id text NOT NULL,
  provider text,
  sport_raw text,
  sport_category text,
  start_time timestamptz,
  end_time timestamptz,
  duration_seconds numeric,
  distance_m numeric,
  avg_hr numeric,
  max_hr numeric,
  calories numeric,
  raw jsonb NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT executed_sessions_athlete_ow_event_key UNIQUE (athlete_id, ow_event_id)
);

CREATE INDEX IF NOT EXISTS idx_executed_sessions_athlete_start
  ON public.executed_sessions (athlete_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_executed_sessions_ingested
  ON public.executed_sessions (athlete_id, ingested_at DESC);

ALTER TABLE public.executed_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Athletes read own executed sessions" ON public.executed_sessions;
CREATE POLICY "Athletes read own executed sessions"
  ON public.executed_sessions FOR SELECT TO authenticated
  USING (athlete_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins read all executed sessions" ON public.executed_sessions;
CREATE POLICY "Admins read all executed sessions"
  ON public.executed_sessions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  ));

DROP POLICY IF EXISTS "Coaches read assigned executed sessions" ON public.executed_sessions;
CREATE POLICY "Coaches read assigned executed sessions"
  ON public.executed_sessions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role IN ('trainer', 'head_coach', 'admin')
    )
    AND EXISTS (
      SELECT 1 FROM public.athlete_workouts aw
      WHERE aw.athlete_id = executed_sessions.athlete_id
        AND aw.trainer_id = (SELECT auth.uid())
    )
  );

REVOKE ALL ON public.executed_sessions FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.executed_sessions FROM authenticated;
GRANT SELECT ON public.executed_sessions TO authenticated;
GRANT ALL ON public.executed_sessions TO service_role;

ALTER TABLE public.wearable_links
  ADD COLUMN IF NOT EXISTS last_sync_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_imported_at timestamptz;
