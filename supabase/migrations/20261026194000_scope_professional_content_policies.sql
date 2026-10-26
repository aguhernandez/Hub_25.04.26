-- Scope professional content policies to active assigned access.
-- Idempotent; no data changes.

DROP POLICY IF EXISTS "Trainers and admins can update all sessions" ON public.food_diary_sessions;
DROP POLICY IF EXISTS "Nutritionists view assigned athletes diary sessions" ON public.food_diary_sessions;
DROP POLICY IF EXISTS "Head coaches view team athletes diary sessions" ON public.food_diary_sessions;

CREATE POLICY "Admins can update all diary sessions"
  ON public.food_diary_sessions FOR UPDATE TO authenticated
  USING (public.has_profile_role(ARRAY['admin']))
  WITH CHECK (public.has_profile_role(ARRAY['admin']));
CREATE POLICY "Trainers can update assigned diary sessions"
  ON public.food_diary_sessions FOR UPDATE TO authenticated
  USING (public.professional_can_read_athlete((SELECT auth.uid()), athlete_id, 'trainer'))
  WITH CHECK (public.professional_can_read_athlete((SELECT auth.uid()), athlete_id, 'trainer'));
CREATE POLICY "Nutritionists can view assigned diary sessions"
  ON public.food_diary_sessions FOR SELECT TO authenticated
  USING (public.professional_can_read_athlete((SELECT auth.uid()), athlete_id, 'nutritionist'));
CREATE POLICY "Head coaches can view team diary sessions"
  ON public.food_diary_sessions FOR SELECT TO authenticated
  USING (public.professional_can_read_athlete((SELECT auth.uid()), athlete_id, 'head_coach'));

DROP POLICY IF EXISTS "Head coaches view team athletes anamnesis" ON public.nutrition_anamnesis;
DROP POLICY IF EXISTS "Nutritionists view assigned athletes anamnesis" ON public.nutrition_anamnesis;
DROP POLICY IF EXISTS "Trainers can create anamnesis for assigned athletes" ON public.nutrition_anamnesis;

CREATE POLICY "Head coaches view assigned athletes anamnesis"
  ON public.nutrition_anamnesis FOR SELECT TO authenticated
  USING (public.professional_can_read_athlete((SELECT auth.uid()), athlete_id, 'head_coach'));
CREATE POLICY "Nutritionists view assigned athletes anamnesis"
  ON public.nutrition_anamnesis FOR SELECT TO authenticated
  USING (public.professional_can_read_athlete((SELECT auth.uid()), athlete_id, 'nutritionist'));
CREATE POLICY "Trainers can create anamnesis for assigned athletes"
  ON public.nutrition_anamnesis FOR INSERT TO authenticated
  WITH CHECK (public.professional_can_read_athlete((SELECT auth.uid()), athlete_id, 'trainer'));

-- Rollback: restore the dropped policies from the migrations that created them.
