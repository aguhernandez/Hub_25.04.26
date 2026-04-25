/*
  # Allow Athletes to Create Their Own Annual Training Plans

  1. Changes
    - Add policy to allow athletes to create ATPs for themselves
    - Add policy to allow athletes to manage their own ATPs (update/delete)
    - Athletes can create plans where athlete_id = their own ID

  2. Security
    - Athletes can only create plans for themselves
    - Athletes can only manage their own plans
    - Trainers and admins retain their existing permissions
*/

-- Athletes can create their own ATPs
CREATE POLICY "Athletes can create own ATPs"
  ON annual_training_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    athlete_id = auth.uid() AND
    coach_id IS NULL AND
    team_id IS NULL
  );

-- Athletes can update their own ATPs
CREATE POLICY "Athletes can update own ATPs"
  ON annual_training_plans FOR UPDATE
  TO authenticated
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

-- Athletes can delete their own ATPs
CREATE POLICY "Athletes can delete own ATPs"
  ON annual_training_plans FOR DELETE
  TO authenticated
  USING (athlete_id = auth.uid());

-- Athletes can manage macrocycles of their own ATPs
CREATE POLICY "Athletes can manage own macrocycles"
  ON atp_macrocycles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM annual_training_plans
      WHERE annual_training_plans.id = atp_macrocycles.atp_id
      AND annual_training_plans.athlete_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM annual_training_plans
      WHERE annual_training_plans.id = atp_macrocycles.atp_id
      AND annual_training_plans.athlete_id = auth.uid()
    )
  );

-- Athletes can manage weekly loads of their own ATPs
CREATE POLICY "Athletes can manage own weekly loads"
  ON atp_weekly_loads FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM annual_training_plans
      WHERE annual_training_plans.id = atp_weekly_loads.atp_id
      AND annual_training_plans.athlete_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM annual_training_plans
      WHERE annual_training_plans.id = atp_weekly_loads.atp_id
      AND annual_training_plans.athlete_id = auth.uid()
    )
  );

-- Athletes can manage events of their own ATPs
CREATE POLICY "Athletes can manage own atp events"
  ON atp_events FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM annual_training_plans
      WHERE annual_training_plans.id = atp_events.atp_id
      AND annual_training_plans.athlete_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM annual_training_plans
      WHERE annual_training_plans.id = atp_events.atp_id
      AND annual_training_plans.athlete_id = auth.uid()
    )
  );

-- Athletes can manage weekly plans of their own ATPs
CREATE POLICY "Athletes can manage own weekly plans"
  ON atp_weekly_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM atp_weekly_loads
      JOIN annual_training_plans ON annual_training_plans.id = atp_weekly_loads.atp_id
      WHERE atp_weekly_loads.id = atp_weekly_plans.weekly_load_id
      AND annual_training_plans.athlete_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM atp_weekly_loads
      JOIN annual_training_plans ON annual_training_plans.id = atp_weekly_loads.atp_id
      WHERE atp_weekly_loads.id = atp_weekly_plans.weekly_load_id
      AND annual_training_plans.athlete_id = auth.uid()
    )
  );
