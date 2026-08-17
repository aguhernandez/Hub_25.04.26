/*
  # Add DELETE policies for training_logs and athlete_workouts

  1. Security Changes
    - Add DELETE policy for training_logs (athletes can delete their own logs)
    - Ensure athletes can delete their own workout sessions
    - Ensure trainers can delete sessions they assigned

  This allows proper deletion of training records and workout sessions.
*/

-- Athletes can delete their own training logs
CREATE POLICY "Athletes can delete own training logs"
  ON training_logs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM athlete_workouts
      WHERE athlete_workouts.id = training_logs.athlete_workout_id
      AND athlete_workouts.athlete_id = auth.uid()
    )
  );

-- Check if athlete_workouts already has a delete policy, if not create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'athlete_workouts'
    AND policyname = 'Athletes can delete own workouts'
  ) THEN
    CREATE POLICY "Athletes can delete own workouts"
      ON athlete_workouts FOR DELETE
      TO authenticated
      USING (athlete_id = auth.uid());
  END IF;
END $$;

-- Trainers can delete workouts they assigned
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'athlete_workouts'
    AND policyname = 'Trainers can delete assigned workouts'
  ) THEN
    CREATE POLICY "Trainers can delete assigned workouts"
      ON athlete_workouts FOR DELETE
      TO authenticated
      USING (trainer_id = auth.uid());
  END IF;
END $$;
