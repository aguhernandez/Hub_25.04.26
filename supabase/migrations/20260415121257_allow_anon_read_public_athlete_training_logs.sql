/*
  # Allow anonymous read of training logs for public athletes

  ## Problem
  The public landing page shows training stats (total workouts, streak, recent sessions)
  for athletes. Unauthenticated visitors cannot read training_logs due to missing anon policy.

  ## Changes
  - Add SELECT policy for `anon` role on training_logs:
    only for athletes whose profile is public + support_mode_enabled

  ## Security
  - Anon users can only see logs for athletes who have explicitly made their profile public
  - No private athlete data is exposed
*/

CREATE POLICY "Public athlete training logs readable by anyone"
  ON training_logs
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = training_logs.athlete_id
      AND profiles.profile_visibility = 'public'
      AND profiles.support_mode_enabled = true
    )
  );
