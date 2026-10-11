/*
# Add session_reviews table

## Summary
Creates a `session_reviews` table for coaches/admins to leave review comments on
planned or executed sessions, with visibility control for athletes.

## New Tables
- `session_reviews`: links to athlete, planned workout (optional), executed session
  (optional), reviewer, status (pending/reviewed), comment, and visible_to_athlete
  flag. At least one of planned_workout_id or executed_session_id must be non-null.

## Security
- RLS enabled. Athletes read only visible-to-them reviews. Coaches read reviews for
  athletes assigned to them. Admins read all. No authenticated writes (service_role
  only). anon revoked.
*/

CREATE TABLE IF NOT EXISTS public.session_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  planned_workout_id uuid REFERENCES public.external_endurance_workouts(id) ON DELETE CASCADE,
  executed_session_id uuid REFERENCES public.executed_sessions(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed')),
  comment text NOT NULL,
  visible_to_athlete boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (planned_workout_id IS NOT NULL OR executed_session_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_session_reviews_athlete_created
  ON public.session_reviews(athlete_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_reviews_planned
  ON public.session_reviews(planned_workout_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_reviews_executed
  ON public.session_reviews(executed_session_id, created_at DESC);
ALTER TABLE public.session_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes read visible session reviews" ON public.session_reviews
  FOR SELECT TO authenticated USING (
    athlete_id = (SELECT auth.uid()) AND visible_to_athlete = true
  );
CREATE POLICY "Coaches read assigned session reviews" ON public.session_reviews
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('trainer','head_coach','admin'))
    AND EXISTS (SELECT 1 FROM public.profiles a WHERE a.id = session_reviews.athlete_id AND a.assigned_trainer_id = (SELECT auth.uid()))
  );
CREATE POLICY "Admins read all session reviews" ON public.session_reviews
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  ));
REVOKE ALL ON public.session_reviews FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.session_reviews FROM authenticated;
GRANT SELECT ON public.session_reviews TO authenticated;
GRANT ALL ON public.session_reviews TO service_role;
