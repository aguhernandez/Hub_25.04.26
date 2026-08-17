/*
  # Allow athletes to update their own external endurance plans

  Athletes need to be able to update plan_data.days[].completed = true
  when they log a workout, so the calendar shows it as done.
*/

CREATE POLICY "Athletes can update own external endurance plans"
  ON external_endurance_plans
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = athlete_id)
  WITH CHECK (auth.uid() = athlete_id);
