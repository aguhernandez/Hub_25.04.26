/*
# Professionals can view TrainingPeaks-imported workouts

1. Purpose
- TrainingPeaks workouts are imported into `athlete_workouts` with
  `trainer_id = NULL` (the edge function inserts them on behalf of the
  athlete), so the existing SELECT policies only matched the athlete
  themselves, admins, or the trainer listed in `trainer_id`.
- As a result, trainers / head coaches / nutritionists viewing an athlete's
  Training page could not see the imported TrainingPeaks workouts even though
  the sync reported success.

2. Tables modified (no schema changes, only RLS SELECT policies added)
- `athlete_workouts`: two new read-only policies mirroring the existing
  pattern used for food diaries:
  a) Trainers, head coaches and admins can read workouts of athletes whose
     `profiles.assigned_trainer_id` equals their own id.
  b) Nutritionists can read workouts of athletes whose
     `profiles.assigned_nutritionist_id` equals their own id.
  c) Head coaches can additionally read workouts of athletes who are members
     of a team whose `coach_id` equals their own id.

3. Security
- Read-only (SELECT) policies, scoped `TO authenticated`.
- Each professional only sees workouts of athletes explicitly assigned to
  them (direct assignment) or coaching them via a team.
- No write access is granted: workouts remain owned by the athlete.
*/

CREATE POLICY "Professionals view assigned athletes workouts"
ON athlete_workouts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles a
    WHERE a.id = athlete_workouts.athlete_id
      AND a.assigned_trainer_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('trainer', 'admin', 'head_coach', 'nutritionist')
  )
);

CREATE POLICY "Nutritionists view assigned athletes workouts"
ON athlete_workouts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles a
    WHERE a.id = athlete_workouts.athlete_id
      AND a.assigned_nutritionist_id = auth.uid()
  )
);

CREATE POLICY "Head coaches view team athletes workouts"
ON athlete_workouts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.athlete_id = athlete_workouts.athlete_id
      AND t.coach_id = auth.uid()
  )
);