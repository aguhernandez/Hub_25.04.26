/*
# Fix profiles RLS infinite recursion

## Problem
The profiles_select_scoped and profiles_update_scoped policies subquery `profiles`
to check the viewer's role, causing infinite RLS recursion → HTTP 500 on every
profiles query.

## Fix
- Replace `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ...)`
  with `auth.jwt()->>'role' IN (...)` — the role is already synced to JWT
  raw_app_meta_data by the existing sync_role_to_jwt trigger.
- Fix prevent_non_admin_role_change trigger to use auth.jwt() instead of
  querying profiles.
- Keep direct column checks (assigned_trainer_id, assigned_nutritionist_id)
  and athlete_trainers junction subquery — those don't cause recursion.
*/

DROP POLICY IF EXISTS profiles_select_scoped ON public.profiles;
DROP POLICY IF EXISTS profiles_update_scoped ON public.profiles;

CREATE POLICY profiles_select_scoped ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR auth.jwt()->>'role' IN ('admin', 'head_coach')
    OR (role = 'athlete' AND assigned_trainer_id = auth.uid())
    OR (role = 'athlete' AND assigned_nutritionist_id = auth.uid())
    OR (role = 'athlete' AND EXISTS (
      SELECT 1 FROM public.athlete_trainers at
      WHERE at.athlete_id = public.profiles.id
        AND at.trainer_id = auth.uid()
    ))
  );

CREATE POLICY profiles_update_scoped ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR auth.jwt()->>'role' = 'admin'
  )
  WITH CHECK (
    id = auth.uid()
    OR auth.jwt()->>'role' = 'admin'
  );

CREATE OR REPLACE FUNCTION public.prevent_non_admin_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.jwt()->>'role' <> 'admin' THEN
    RAISE EXCEPTION 'Only administrators can change roles';
  END IF;
  RETURN NEW;
END;
$$;