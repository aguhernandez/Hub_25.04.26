
-- Allow trainers to insert athlete_workouts for athletes they are assigned to
-- This covers duplicate and paste operations done by a trainer on behalf of an athlete
DROP POLICY IF EXISTS "Trainers can insert workouts for assigned athletes" ON athlete_workouts;

CREATE POLICY "Trainers can insert workouts for assigned athletes"
ON athlete_workouts FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = athlete_workouts.athlete_id
      AND profiles.assigned_trainer_id = (SELECT auth.uid())
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
  )
);
