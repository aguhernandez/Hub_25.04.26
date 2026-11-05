/*
  Phase 1 shared athlete context.

  These additive tables are deliberately separate from the strength ATP tables
  and from Endurance's local ATP. They provide one Hub-owned record for
  objectives/events and one shared availability model without rewriting legacy
  atp_events, race_plans, or historical calendar rows.
*/

CREATE TABLE IF NOT EXISTS public.shared_athlete_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_kind text NOT NULL DEFAULT 'objective'
    CHECK (event_kind IN ('competition', 'objective', 'test', 'camp', 'rest', 'other')),
  priority text CHECK (priority IN ('A', 'B', 'C')),
  -- General objectives are intentionally allowed to be continuous: no invented
  -- race date is needed merely to make them visible to a planner.
  event_date date,
  event_time time,
  sport text,
  sub_discipline text,
  distance_km numeric CHECK (distance_km IS NULL OR distance_km >= 0),
  location text,
  status text NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'approved', 'published', 'completed', 'cancelled')),
  source_system text NOT NULL DEFAULT 'hub',
  external_key text,
  source_record_id text,
  source_version integer NOT NULL DEFAULT 1 CHECK (source_version > 0),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shared_event_requires_date
      CHECK (event_date IS NOT NULL OR event_kind = 'objective')
);

CREATE UNIQUE INDEX IF NOT EXISTS shared_athlete_events_source_key
  ON public.shared_athlete_events (athlete_id, source_system, external_key)
  WHERE external_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS shared_athlete_events_athlete_date
  ON public.shared_athlete_events (athlete_id, event_date);

ALTER TABLE public.shared_athlete_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_athlete_events TO authenticated;

CREATE TABLE IF NOT EXISTS public.athlete_availability_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week smallint CHECK (day_of_week BETWEEN 1 AND 7),
  available_date date,
  start_time time,
  end_time time,
  max_duration_minutes integer CHECK (max_duration_minutes IS NULL OR max_duration_minutes > 0),
  timezone text NOT NULL DEFAULT 'UTC' CHECK (char_length(trim(timezone)) > 0),
  is_rest_day boolean NOT NULL DEFAULT false,
  allows_double_sessions boolean NOT NULL DEFAULT false,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  status text NOT NULL DEFAULT 'approved'
    CHECK (status IN ('proposed', 'approved', 'published', 'cancelled')),
  source_system text NOT NULL DEFAULT 'hub',
  external_key text,
  source_version integer NOT NULL DEFAULT 1 CHECK (source_version > 0),
  valid_from date,
  valid_until date,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT availability_day_or_date CHECK (day_of_week IS NOT NULL OR available_date IS NOT NULL),
  CONSTRAINT availability_time_range CHECK (end_time IS NULL OR start_time IS NULL OR end_time > start_time)
);

CREATE UNIQUE INDEX IF NOT EXISTS athlete_availability_source_key
  ON public.athlete_availability_windows (athlete_id, source_system, external_key)
  WHERE external_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS athlete_availability_athlete_schedule
  ON public.athlete_availability_windows (athlete_id, available_date, day_of_week);

ALTER TABLE public.athlete_availability_windows ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.athlete_availability_windows TO authenticated;

CREATE OR REPLACE FUNCTION public.shared_context_can_view(target_athlete_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles actor
    WHERE actor.id = (SELECT auth.uid())
      AND (
        actor.id = target_athlete_id
        OR actor.role = 'admin'
        OR (
          actor.role IN ('trainer', 'head_coach')
          AND EXISTS (
            SELECT 1 FROM public.profiles athlete
            WHERE athlete.id = target_athlete_id
              AND athlete.assigned_trainer_id = actor.id
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.shared_context_can_manage(target_athlete_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles actor
    WHERE actor.id = (SELECT auth.uid())
      AND (
        actor.role = 'admin'
        OR actor.id = target_athlete_id
        OR (
          actor.role IN ('trainer', 'head_coach')
          AND EXISTS (
            SELECT 1 FROM public.profiles athlete
            WHERE athlete.id = target_athlete_id
              AND athlete.assigned_trainer_id = actor.id
          )
        )
      )
  );
$$;

-- Athletes can propose or cancel their own context; only the assigned coach or
-- an administrator can promote it to approved/published. This is enforced in
-- RLS rather than relying on the UI or the satellite bridge.
CREATE OR REPLACE FUNCTION public.shared_context_can_approve(target_athlete_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles actor
    WHERE actor.id = (SELECT auth.uid())
      AND (
        actor.role = 'admin'
        OR (
          actor.role IN ('trainer', 'head_coach')
          AND EXISTS (
            SELECT 1 FROM public.profiles athlete
            WHERE athlete.id = target_athlete_id
              AND athlete.assigned_trainer_id = actor.id
          )
        )
      )
  );
$$;

DROP POLICY IF EXISTS "Shared events visible to authorized users" ON public.shared_athlete_events;
CREATE POLICY "Shared events visible to authorized users"
  ON public.shared_athlete_events FOR SELECT TO authenticated
  USING (public.shared_context_can_view(athlete_id));

DROP POLICY IF EXISTS "Shared events manageable by authorized users" ON public.shared_athlete_events;
CREATE POLICY "Shared events inserted by authorized users"
  ON public.shared_athlete_events FOR INSERT TO authenticated
  WITH CHECK (
    public.shared_context_can_manage(athlete_id)
    AND (status IN ('proposed', 'cancelled') OR public.shared_context_can_approve(athlete_id))
  );
CREATE POLICY "Shared events updated by authorized users"
  ON public.shared_athlete_events FOR UPDATE TO authenticated
  USING (public.shared_context_can_manage(athlete_id))
  WITH CHECK (
    public.shared_context_can_manage(athlete_id)
    AND (status IN ('proposed', 'cancelled') OR public.shared_context_can_approve(athlete_id))
  );
CREATE POLICY "Shared events deleted by authorized users"
  ON public.shared_athlete_events FOR DELETE TO authenticated
  USING (public.shared_context_can_manage(athlete_id));

DROP POLICY IF EXISTS "Availability visible to authorized users" ON public.athlete_availability_windows;
CREATE POLICY "Availability visible to authorized users"
  ON public.athlete_availability_windows FOR SELECT TO authenticated
  USING (public.shared_context_can_view(athlete_id));

DROP POLICY IF EXISTS "Availability manageable by authorized users" ON public.athlete_availability_windows;
CREATE POLICY "Availability inserted by authorized users"
  ON public.athlete_availability_windows FOR INSERT TO authenticated
  WITH CHECK (
    public.shared_context_can_manage(athlete_id)
    AND (status IN ('proposed', 'cancelled') OR public.shared_context_can_approve(athlete_id))
  );
CREATE POLICY "Availability updated by authorized users"
  ON public.athlete_availability_windows FOR UPDATE TO authenticated
  USING (public.shared_context_can_manage(athlete_id))
  WITH CHECK (
    public.shared_context_can_manage(athlete_id)
    AND (status IN ('proposed', 'cancelled') OR public.shared_context_can_approve(athlete_id))
  );
CREATE POLICY "Availability deleted by authorized users"
  ON public.athlete_availability_windows FOR DELETE TO authenticated
  USING (public.shared_context_can_manage(athlete_id));

COMMENT ON TABLE public.shared_athlete_events IS
  'Hub-owned shared objectives and competitions. Legacy ATP/race rows are not migrated automatically.';
COMMENT ON TABLE public.athlete_availability_windows IS
  'Hub-owned recurring and exceptional athlete availability for authorized planners.';
