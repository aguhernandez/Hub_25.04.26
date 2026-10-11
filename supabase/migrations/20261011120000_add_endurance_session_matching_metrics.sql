DROP POLICY IF EXISTS "Coaches read assigned executed sessions" ON public.executed_sessions;
DROP POLICY IF EXISTS "Coaches read athlete executed sessions" ON public.executed_sessions;
CREATE POLICY "Coaches read athlete executed sessions"
  ON public.executed_sessions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles viewer
      WHERE viewer.id = (SELECT auth.uid())
        AND viewer.role IN ('trainer', 'head_coach', 'admin')
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles athlete
      WHERE athlete.id = executed_sessions.athlete_id
        AND athlete.assigned_trainer_id = (SELECT auth.uid())
    )
  );

-- The raw provider payload can contain sensitive health detail. Keep it available
-- to the server role for the admin explorer, but never expose the raw column via
-- authenticated PostgREST queries.
REVOKE SELECT ON public.executed_sessions FROM authenticated;
GRANT SELECT (id, athlete_id, ow_event_id, provider, sport_raw, sport_category, start_time, end_time,
  duration_seconds, distance_m, avg_hr, max_hr, calories, ingested_at, updated_at)
  ON public.executed_sessions TO authenticated;

CREATE TABLE IF NOT EXISTS public.session_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  executed_session_id uuid NOT NULL UNIQUE REFERENCES public.executed_sessions(id) ON DELETE CASCADE,
  planned_workout_id uuid REFERENCES public.external_endurance_workouts(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('auto_matched', 'suggested', 'manual_matched', 'unplanned', 'dismissed')),
  score numeric,
  matched_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_session_matches_planned_unique
  ON public.session_matches(planned_workout_id) WHERE planned_workout_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_session_matches_status ON public.session_matches(status);
ALTER TABLE public.session_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes read own session matches" ON public.session_matches
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.executed_sessions s
    WHERE s.id = session_matches.executed_session_id AND s.athlete_id = (SELECT auth.uid())
  ));
CREATE POLICY "Athletes manage own session matches" ON public.session_matches
  FOR ALL TO authenticated USING (EXISTS (
    SELECT 1 FROM public.executed_sessions s
    WHERE s.id = session_matches.executed_session_id AND s.athlete_id = (SELECT auth.uid())
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.executed_sessions s
    WHERE s.id = session_matches.executed_session_id AND s.athlete_id = (SELECT auth.uid())
  ) AND (session_matches.planned_workout_id IS NULL OR EXISTS (
    SELECT 1 FROM public.external_endurance_workouts w
    WHERE w.id = session_matches.planned_workout_id AND w.athlete_id = (SELECT auth.uid())
  )));
CREATE POLICY "Coaches read assigned session matches" ON public.session_matches
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.executed_sessions s JOIN public.profiles a ON a.id = s.athlete_id
    WHERE s.id = session_matches.executed_session_id AND a.assigned_trainer_id = (SELECT auth.uid())
      AND EXISTS (SELECT 1 FROM public.profiles viewer WHERE viewer.id = (SELECT auth.uid()) AND viewer.role IN ('trainer', 'head_coach', 'admin'))
  ));
CREATE POLICY "Admins manage all session matches" ON public.session_matches
  FOR ALL TO authenticated USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  ));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_matches TO authenticated;
REVOKE ALL ON public.session_matches FROM anon;
GRANT ALL ON public.session_matches TO service_role;

CREATE TABLE IF NOT EXISTS public.executed_session_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  executed_session_id uuid NOT NULL UNIQUE REFERENCES public.executed_sessions(id) ON DELETE CASCADE,
  has_hr boolean NOT NULL DEFAULT false,
  has_power boolean NOT NULL DEFAULT false,
  sample_count integer NOT NULL DEFAULT 0,
  coverage_pct numeric,
  avg_power numeric,
  max_power numeric,
  normalized_power numeric,
  variability_index numeric,
  intensity_factor numeric,
  tss numeric,
  power_zone_seconds jsonb,
  hr_zone_seconds jsonb,
  ftp_used numeric,
  zones_used jsonb,
  computed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.executed_session_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Athletes read own session metrics" ON public.executed_session_metrics
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.executed_sessions s
    WHERE s.id = executed_session_metrics.executed_session_id AND s.athlete_id = (SELECT auth.uid())
  ));
CREATE POLICY "Admins read all session metrics" ON public.executed_session_metrics
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  ));
CREATE POLICY "Coaches read assigned session metrics" ON public.executed_session_metrics
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.executed_sessions s JOIN public.profiles a ON a.id = s.athlete_id
    WHERE s.id = executed_session_metrics.executed_session_id AND a.assigned_trainer_id = (SELECT auth.uid())
      AND EXISTS (SELECT 1 FROM public.profiles viewer WHERE viewer.id = (SELECT auth.uid()) AND viewer.role IN ('trainer', 'head_coach', 'admin'))
  ));
REVOKE ALL ON public.executed_session_metrics FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.executed_session_metrics FROM authenticated;
GRANT SELECT ON public.executed_session_metrics TO authenticated;
GRANT ALL ON public.executed_session_metrics TO service_role;

CREATE TABLE IF NOT EXISTS public.wearable_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  athlete_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  section text NOT NULL,
  range_start timestamptz,
  range_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wearable_access_log_athlete_created
  ON public.wearable_access_log(athlete_user_id, created_at DESC);
ALTER TABLE public.wearable_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read wearable access log" ON public.wearable_access_log
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  ));
REVOKE ALL ON public.wearable_access_log FROM anon;
REVOKE ALL ON public.wearable_access_log FROM authenticated;
GRANT SELECT ON public.wearable_access_log TO authenticated;
GRANT ALL ON public.wearable_access_log TO service_role;
