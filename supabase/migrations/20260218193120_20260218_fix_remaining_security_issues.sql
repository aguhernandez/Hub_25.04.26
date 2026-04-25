/*
  # Fix Remaining Security Issues

  ## Summary
  1. Enable RLS on anthropometry_measurements_backup table (currently unprotected)
  2. Fix RLS policies that reference user_metadata (editable by end users) - 
     replace with app_metadata which cannot be modified by users
  3. Fix user_satellite_summary view to remove SECURITY DEFINER

  ## Security Notes
  - user_metadata can be modified by authenticated users via supabase.auth.update()
  - app_metadata cannot be modified by users, making it safe for authorization checks
  - anthropometry_measurements_backup was fully accessible without any RLS protection
*/

-- 1. Enable RLS on anthropometry_measurements_backup
ALTER TABLE public.anthropometry_measurements_backup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can access backup table"
  ON public.anthropometry_measurements_backup
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = ( SELECT auth.uid() AS uid)
        AND profiles.role = 'admin'
    )
  );

-- 2. Fix satellite policies that reference user_metadata → app_metadata

-- satellites table
DROP POLICY IF EXISTS "Admin can manage satellites" ON public.satellites;
CREATE POLICY "Admin can manage satellites"
  ON public.satellites
  AS PERMISSIVE FOR ALL
  TO authenticated
  USING (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  )
  WITH CHECK (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  );

-- user_satellite_access_log
DROP POLICY IF EXISTS "Admin can view all access logs" ON public.user_satellite_access_log;
CREATE POLICY "Admin can view all access logs"
  ON public.user_satellite_access_log
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  );

-- user_satellite_permissions
DROP POLICY IF EXISTS "Admin can manage all satellite permissions" ON public.user_satellite_permissions;
CREATE POLICY "Admin can manage all satellite permissions"
  ON public.user_satellite_permissions
  AS PERMISSIVE FOR ALL
  TO authenticated
  USING (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  )
  WITH CHECK (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  );

DROP POLICY IF EXISTS "Admin can view all satellite permissions" ON public.user_satellite_permissions;
CREATE POLICY "Admin can view all satellite permissions"
  ON public.user_satellite_permissions
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  );

DROP POLICY IF EXISTS "Trainers can grant permissions to athletes" ON public.user_satellite_permissions;
CREATE POLICY "Trainers can grant permissions to athletes"
  ON public.user_satellite_permissions
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'trainer')
    AND (granted_by = ( SELECT auth.uid() AS uid))
    AND (user_id IN (
      SELECT athlete_workouts.athlete_id
      FROM public.athlete_workouts
      WHERE athlete_workouts.trainer_id = ( SELECT auth.uid() AS uid)
    ))
  );

DROP POLICY IF EXISTS "Trainers can view athlete satellite permissions" ON public.user_satellite_permissions;
CREATE POLICY "Trainers can view athlete satellite permissions"
  ON public.user_satellite_permissions
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'trainer')
    AND (user_id IN (
      SELECT athlete_workouts.athlete_id
      FROM public.athlete_workouts
      WHERE athlete_workouts.trainer_id = ( SELECT auth.uid() AS uid)
    ))
  );

-- 3. Recreate user_satellite_summary view without SECURITY DEFINER
DROP VIEW IF EXISTS public.user_satellite_summary;
CREATE VIEW public.user_satellite_summary AS
  SELECT u.id AS user_id,
    u.full_name,
    u.email,
    u.role,
    s.name AS satellite_name,
    s.display_name AS satellite_display_name,
    s.category AS satellite_category,
    p.enabled AS has_explicit_permission,
    count(l.id) AS total_accesses,
    max(l.access_at) AS last_access_at,
    min(l.access_at) AS first_access_at
  FROM (((public.profiles u
    CROSS JOIN public.satellites s)
    LEFT JOIN public.user_satellite_permissions p ON ((p.user_id = u.id) AND (p.satellite_id = s.id)))
    LEFT JOIN public.user_satellite_access_log l ON ((l.user_id = u.id) AND (l.satellite_id = s.id)))
  WHERE s.is_active = true
  GROUP BY u.id, u.full_name, u.email, u.role, s.id, s.name, s.display_name, s.category, p.enabled;
