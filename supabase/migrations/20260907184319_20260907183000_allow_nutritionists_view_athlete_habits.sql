/*
# Allow nutritionists to access assigned athlete habits

1. Purpose
- Preserve the existing habits page and its current trainer workflow.
- Allow authenticated nutritionists to view and manage habits, logs, and skills
  belonging to athletes assigned through `profiles.assigned_nutritionist_id`.

2. Modified tables
- `user_habits`: extend existing trainer policies to include nutritionist assignments.
- `habit_logs`: extend existing trainer policies to include nutritionist assignments.
- `habit_skills`: extend existing trainer policies to include nutritionist assignments.

3. Security
- Access remains limited to authenticated users.
- Access is limited to rows whose athlete is assigned to the current user as
  either trainer or nutritionist.
- No public access and no access to unrelated athletes is added.
*/

DROP POLICY IF EXISTS "Trainers create habits for athletes" ON public.user_habits;
CREATE POLICY "Trainers create habits for athletes" ON public.user_habits
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = user_habits.user_id
      AND (profiles.assigned_trainer_id = auth.uid()
        OR profiles.assigned_nutritionist_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Trainers view assigned athletes habits" ON public.user_habits;
CREATE POLICY "Trainers view assigned athletes habits" ON public.user_habits
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = user_habits.user_id
      AND (profiles.assigned_trainer_id = auth.uid()
        OR profiles.assigned_nutritionist_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Trainers update athletes habits" ON public.user_habits;
CREATE POLICY "Trainers update athletes habits" ON public.user_habits
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = user_habits.user_id
      AND (profiles.assigned_trainer_id = auth.uid()
        OR profiles.assigned_nutritionist_id = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = user_habits.user_id
      AND (profiles.assigned_trainer_id = auth.uid()
        OR profiles.assigned_nutritionist_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Trainers delete athletes habits" ON public.user_habits;
CREATE POLICY "Trainers delete athletes habits" ON public.user_habits
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = user_habits.user_id
      AND (profiles.assigned_trainer_id = auth.uid()
        OR profiles.assigned_nutritionist_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Trainers view assigned athletes habit logs" ON public.habit_logs;
CREATE POLICY "Trainers view assigned athletes habit logs" ON public.habit_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = habit_logs.user_id
      AND (profiles.assigned_trainer_id = auth.uid()
        OR profiles.assigned_nutritionist_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Trainers delete athletes habit logs" ON public.habit_logs;
CREATE POLICY "Trainers delete athletes habit logs" ON public.habit_logs
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = habit_logs.user_id
      AND (profiles.assigned_trainer_id = auth.uid()
        OR profiles.assigned_nutritionist_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Trainers view assigned athletes habit skills" ON public.habit_skills;
CREATE POLICY "Trainers view assigned athletes habit skills" ON public.habit_skills
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.user_habits uh
    JOIN public.profiles p ON p.id = uh.user_id
    WHERE uh.id = habit_skills.habit_id
      AND (p.assigned_trainer_id = auth.uid()
        OR p.assigned_nutritionist_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Trainers create habit skills for athletes" ON public.habit_skills;
CREATE POLICY "Trainers create habit skills for athletes" ON public.habit_skills
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.user_habits uh
    JOIN public.profiles p ON p.id = uh.user_id
    WHERE uh.id = habit_skills.habit_id
      AND (p.assigned_trainer_id = auth.uid()
        OR p.assigned_nutritionist_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Trainers update athletes habit skills" ON public.habit_skills;
CREATE POLICY "Trainers update athletes habit skills" ON public.habit_skills
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.user_habits uh
    JOIN public.profiles p ON p.id = uh.user_id
    WHERE uh.id = habit_skills.habit_id
      AND (p.assigned_trainer_id = auth.uid()
        OR p.assigned_nutritionist_id = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.user_habits uh
    JOIN public.profiles p ON p.id = uh.user_id
    WHERE uh.id = habit_skills.habit_id
      AND (p.assigned_trainer_id = auth.uid()
        OR p.assigned_nutritionist_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Trainers delete athletes habit skills" ON public.habit_skills;
CREATE POLICY "Trainers delete athletes habit skills" ON public.habit_skills
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.user_habits uh
    JOIN public.profiles p ON p.id = uh.user_id
    WHERE uh.id = habit_skills.habit_id
      AND (p.assigned_trainer_id = auth.uid()
        OR p.assigned_nutritionist_id = auth.uid())
  ));