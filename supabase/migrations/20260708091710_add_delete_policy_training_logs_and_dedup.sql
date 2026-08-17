-- Add missing DELETE policy for training_logs
CREATE POLICY "Athletes can delete own training logs"
  ON training_logs
  FOR DELETE
  TO authenticated
  USING (athlete_id = auth.uid());

-- Allow trainers/admins to delete athlete training logs too
CREATE POLICY "Trainers can delete athlete training logs"
  ON training_logs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('trainer', 'admin')
    )
  );

-- Clean up duplicate training log rows: keep only the most recent entry
-- per (athlete_workout_id, workout_exercise_id, set_number) combination.
DELETE FROM training_logs
WHERE id NOT IN (
  SELECT DISTINCT ON (athlete_workout_id, workout_exercise_id, set_number) id
  FROM training_logs
  ORDER BY athlete_workout_id, workout_exercise_id, set_number, logged_at DESC
);
