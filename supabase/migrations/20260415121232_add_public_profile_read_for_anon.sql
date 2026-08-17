/*
  # Allow anonymous read of public athlete profiles

  ## Problem
  The public landing page at /athlete/@username is accessible without login,
  but the RLS policies on the profiles table only allow authenticated users
  (own profile, trainer, admin) to read profiles.
  Unauthenticated visitors get an empty result, causing "Not Found".

  ## Changes
  - Add SELECT policy for `anon` role: can read profiles where
    `profile_visibility = 'public'` AND `support_mode_enabled = true`
  - This is the minimum needed for the public landing page to work

  ## Security
  - Only public + support-enabled profiles are exposed to anonymous users
  - No private data leak — all other profiles remain locked
*/

CREATE POLICY "Public profiles readable by anyone"
  ON profiles
  FOR SELECT
  TO anon
  USING (
    profile_visibility = 'public'
    AND support_mode_enabled = true
  );
