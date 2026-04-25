/*
  # Fix public profile RLS — remove support_mode_enabled requirement

  ## Problem
  The "Public profiles readable by anyone" policy required BOTH:
    - profile_visibility = 'public'
    - support_mode_enabled = true

  This meant any athlete with a public profile but support_mode_enabled = false
  got a "not found" error on their public landing page, even though they should
  be visible.

  ## Changes
  1. Drop and recreate "Public profiles readable by anyone" — remove support_mode_enabled check
  2. Drop and recreate "Public athlete training logs readable by anyone" — same fix
  3. Drop and recreate "Public view active projects" on athlete_support_projects — same fix

  ## Security
  The only requirement for a public landing page is profile_visibility = 'public'.
  Support mode (payment methods, projects) is shown/hidden in the UI, not via RLS.
  This is the correct layering: DB allows reading, UI decides what to display.
*/

-- 1. Fix profiles public read policy
DROP POLICY IF EXISTS "Public profiles readable by anyone" ON profiles;

CREATE POLICY "Public profiles readable by anyone"
  ON profiles
  FOR SELECT
  TO anon, authenticated
  USING (profile_visibility = 'public');

-- 2. Fix training logs public read policy
DROP POLICY IF EXISTS "Public athlete training logs readable by anyone" ON training_logs;

CREATE POLICY "Public athlete training logs readable by anyone"
  ON training_logs
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = training_logs.athlete_id
        AND profiles.profile_visibility = 'public'
    )
  );

-- 3. Fix athlete_support_projects public read policy
DROP POLICY IF EXISTS "Public view active projects" ON athlete_support_projects;

CREATE POLICY "Public view active projects"
  ON athlete_support_projects
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'active'
    AND is_active = true
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = athlete_support_projects.athlete_id
        AND profiles.profile_visibility = 'public'
    )
  );
