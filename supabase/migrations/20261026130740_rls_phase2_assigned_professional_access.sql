-- Phase 2: restrict professional health/performance reads to assigned athletes.
-- Applied to the production project through Supabase on 2026-10-26.
-- Rollback (commented): restore the dropped policy definitions from their original migrations
-- only after reviewing the data exposure implications.
--
-- This migration deliberately does not change admin access to accounts, memberships or
-- permissions. Admins are excluded from health-content policies.

CREATE OR REPLACE FUNCTION public.professional_can_read_athlete(
  p_viewer_id uuid,
  p_athlete_id uuid,
  p_scope text
)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT CASE p_scope
    WHEN 'trainer' THEN
      public.is_enabled_professional(p_viewer_id, 'trainer')
      AND public.has_active_professional_access(p_viewer_id)
      AND EXISTS (
        SELECT 1 FROM public.profiles athlete
        WHERE athlete.id = p_athlete_id AND athlete.assigned_trainer_id = p_viewer_id
      )
    WHEN 'nutritionist' THEN
      public.is_enabled_professional(p_viewer_id, 'nutritionist')
      AND public.has_active_professional_access(p_viewer_id)
      AND EXISTS (
        SELECT 1 FROM public.profiles athlete
        WHERE athlete.id = p_athlete_id AND athlete.assigned_nutritionist_id = p_viewer_id
      )
    WHEN 'head_coach' THEN
      public.is_enabled_professional(p_viewer_id, 'head_coach')
      AND public.has_active_professional_access(p_viewer_id)
      AND EXISTS (
        SELECT 1
        FROM public.team_members tm JOIN public.teams team ON team.id = tm.team_id
        WHERE tm.athlete_id = p_athlete_id AND team.coach_id = p_viewer_id
      )
    ELSE false
  END;
$$;

REVOKE ALL ON FUNCTION public.professional_can_read_athlete(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.professional_can_read_athlete(uuid, uuid, text) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_profiles_assigned_trainer_id ON public.profiles (assigned_trainer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_assigned_nutritionist_id ON public.profiles (assigned_nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_profiles_assigned_biomechanist_id ON public.profiles (assigned_biomechanist_id);
CREATE INDEX IF NOT EXISTS idx_team_members_athlete_team ON public.team_members (athlete_id, team_id);
CREATE INDEX IF NOT EXISTS idx_teams_coach_id ON public.teams (coach_id);
CREATE INDEX IF NOT EXISTS idx_wellness_checkins_athlete_created ON public.wellness_checkins (athlete_id, created_at);
CREATE INDEX IF NOT EXISTS idx_wellness_baselines_athlete_created ON public.wellness_baselines (athlete_id, created_at);
CREATE INDEX IF NOT EXISTS idx_cmj_sessions_athlete_created ON public.cmj_sessions (athlete_id, created_at);
CREATE INDEX IF NOT EXISTS idx_bar_velocity_sessions_athlete_created ON public.bar_velocity_sessions (athlete_id, created_at);
CREATE INDEX IF NOT EXISTS idx_food_diary_sessions_athlete_created ON public.food_diary_sessions (athlete_id, created_at);
CREATE INDEX IF NOT EXISTS idx_nutrition_anamnesis_athlete_created ON public.nutrition_anamnesis (athlete_id, created_at);

DROP POLICY IF EXISTS "Trainers and admins can view wellness checkins" ON public.wellness_checkins;
DROP POLICY IF EXISTS "Trainers and admins view all baselines" ON public.wellness_baselines;
DROP POLICY IF EXISTS "Trainers can view assigned athletes CMJ sessions" ON public.cmj_sessions;
DROP POLICY IF EXISTS "Trainers can view assigned athletes CMJ jumps" ON public.cmj_jumps;
DROP POLICY IF EXISTS "Trainers can view all bar velocity sessions" ON public.bar_velocity_sessions;
DROP POLICY IF EXISTS "Trainers can view all bar velocity reps" ON public.bar_velocity_reps;
DROP POLICY IF EXISTS "Trainers can view anamnesis for assigned athletes" ON public.nutrition_anamnesis;
DROP POLICY IF EXISTS "Trainers and admins view all entries" ON public.food_diary_entries;
DROP POLICY IF EXISTS "View diary entries" ON public.food_diary_entries;
DROP POLICY IF EXISTS "Athletes and trainers can view sessions" ON public.food_diary_sessions;
DROP POLICY IF EXISTS "Head coaches view team athletes diary entries" ON public.food_diary_entries;

CREATE POLICY phase2_trainer_wellness_checkins ON public.wellness_checkins FOR SELECT TO authenticated
USING (public.professional_can_read_athlete((SELECT auth.uid()), athlete_id, 'trainer')
    OR public.professional_can_read_athlete((SELECT auth.uid()), athlete_id, 'head_coach'));

CREATE POLICY phase2_trainer_wellness_baselines ON public.wellness_baselines FOR SELECT TO authenticated
USING (public.professional_can_read_athlete((SELECT auth.uid()), athlete_id, 'trainer')
    OR public.professional_can_read_athlete((SELECT auth.uid()), athlete_id, 'head_coach'));

CREATE POLICY phase2_trainer_cmj_sessions ON public.cmj_sessions FOR SELECT TO authenticated
USING (public.professional_can_read_athlete((SELECT auth.uid()), athlete_id, 'trainer')
    OR public.professional_can_read_athlete((SELECT auth.uid()), athlete_id, 'head_coach'));

CREATE POLICY phase2_trainer_cmj_jumps ON public.cmj_jumps FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.cmj_sessions session
  WHERE session.id = cmj_jumps.session_id
    AND (public.professional_can_read_athlete((SELECT auth.uid()), session.athlete_id, 'trainer')
      OR public.professional_can_read_athlete((SELECT auth.uid()), session.athlete_id, 'head_coach'))
));

CREATE POLICY phase2_trainer_bar_velocity_sessions ON public.bar_velocity_sessions FOR SELECT TO authenticated
USING (public.professional_can_read_athlete((SELECT auth.uid()), athlete_id, 'trainer')
    OR public.professional_can_read_athlete((SELECT auth.uid()), athlete_id, 'head_coach'));

CREATE POLICY phase2_trainer_bar_velocity_reps ON public.bar_velocity_reps FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.bar_velocity_sessions session
  WHERE session.id = bar_velocity_reps.session_id
    AND (public.professional_can_read_athlete((SELECT auth.uid()), session.athlete_id, 'trainer')
      OR public.professional_can_read_athlete((SELECT auth.uid()), session.athlete_id, 'head_coach'))
));

CREATE POLICY phase2_nutritionist_anamnesis ON public.nutrition_anamnesis FOR SELECT TO authenticated
USING (athlete_id = (SELECT auth.uid())
    OR public.professional_can_read_athlete((SELECT auth.uid()), athlete_id, 'trainer')
    OR public.professional_can_read_athlete((SELECT auth.uid()), athlete_id, 'nutritionist')
    OR public.professional_can_read_athlete((SELECT auth.uid()), athlete_id, 'head_coach'));

CREATE POLICY phase2_nutritionist_diary_sessions ON public.food_diary_sessions FOR SELECT TO authenticated
USING (athlete_id = (SELECT auth.uid())
    OR public.professional_can_read_athlete((SELECT auth.uid()), athlete_id, 'nutritionist'));

CREATE POLICY phase2_nutritionist_diary_entries ON public.food_diary_entries FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.food_diary_sessions session
  WHERE session.id = food_diary_entries.session_id
    AND (session.athlete_id = (SELECT auth.uid())
      OR public.professional_can_read_athlete((SELECT auth.uid()), session.athlete_id, 'nutritionist'))
));

CREATE OR REPLACE VIEW public.food_diary_session_status AS
SELECT id, athlete_id, period_hours, start_date, status, created_at, completed_at
FROM public.food_diary_sessions
WHERE athlete_id = (SELECT auth.uid())
   OR public.professional_can_read_athlete((SELECT auth.uid()), athlete_id, 'trainer')
   OR public.professional_can_read_athlete((SELECT auth.uid()), athlete_id, 'head_coach')
   OR public.professional_can_read_athlete((SELECT auth.uid()), athlete_id, 'nutritionist');

GRANT SELECT ON public.food_diary_session_status TO authenticated;

-- TrainerDashboard must query food_diary_session_status for status cards. Raw
-- diary entries remain unavailable to trainers, head coaches and admins.

-- Rollback (manual, review first):
-- DROP VIEW IF EXISTS public.food_diary_session_status;
-- DROP FUNCTION IF EXISTS public.professional_can_read_athlete(uuid, uuid, text);
-- DROP POLICY IF EXISTS phase2_trainer_wellness_checkins ON public.wellness_checkins;
-- DROP POLICY IF EXISTS phase2_trainer_wellness_baselines ON public.wellness_baselines;
-- DROP POLICY IF EXISTS phase2_trainer_cmj_sessions ON public.cmj_sessions;
-- DROP POLICY IF EXISTS phase2_trainer_cmj_jumps ON public.cmj_jumps;
-- DROP POLICY IF EXISTS phase2_trainer_bar_velocity_sessions ON public.bar_velocity_sessions;
-- DROP POLICY IF EXISTS phase2_trainer_bar_velocity_reps ON public.bar_velocity_reps;
-- DROP POLICY IF EXISTS phase2_nutritionist_anamnesis ON public.nutrition_anamnesis;
-- DROP POLICY IF EXISTS phase2_nutritionist_diary_sessions ON public.food_diary_sessions;
-- DROP POLICY IF EXISTS phase2_nutritionist_diary_entries ON public.food_diary_entries;

