
-- Allow professionals (trainers/nutritionists/head_coaches) to insert enrollments for their assigned athletes
-- This enables the "gift service" feature where a professional creates an enrollment on behalf of an athlete
CREATE POLICY "professionals_insert_own_service_enrollments"
  ON service_enrollments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = professional_id
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('trainer', 'nutritionist', 'head_coach')
    )
    AND EXISTS (
      SELECT 1 FROM profiles a
      WHERE a.id = athlete_id
      AND (
        a.assigned_trainer_id = auth.uid()
        OR a.assigned_nutritionist_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM athlete_trainers at
          WHERE at.athlete_id = a.id AND at.trainer_id = auth.uid()
        )
      )
    )
  );
