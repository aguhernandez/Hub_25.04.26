/*
  # Add public read policy for athlete_workouts on landing page

  ## Problem
  The public athlete landing page needs to display training stats (session count,
  streak, recent sessions) for athletes with public profiles. Currently there is
  no RLS policy allowing anon users to read athlete_workouts.

  ## Changes
  - Add SELECT policy on athlete_workouts for anon/authenticated users
    to read completed workouts of athletes with public profiles.
  - Only completed workouts are exposed (status = 'completed').
*/

CREATE POLICY "Public read completed workouts for public athletes"
  ON athlete_workouts
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'completed'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = athlete_workouts.athlete_id
        AND profiles.profile_visibility = 'public'
    )
  );
