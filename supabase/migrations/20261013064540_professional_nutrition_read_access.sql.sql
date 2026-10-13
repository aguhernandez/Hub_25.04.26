/*
# Professional nutrition read access (nutritionist & head coach)

1. Purpose
- The redesigned professional Nutrition section shows athlete food diaries and
  anamnesis records to the signed-in professional. The existing policies only
  covered 'trainer' and 'admin' roles, so users with the 'nutritionist' or
  'head_coach' roles could not see their athletes' data.

2. Tables modified (no schema changes, only RLS SELECT policies added)
- `food_diary_sessions`: allow nutritionists to read diaries of athletes
  assigned to them via `profiles.assigned_nutritionist_id`; allow head coaches
  to read diaries of athletes on teams they coach (`team_members`/`teams`).
- `food_diary_entries`: same read access, scoped through the parent session.
- `nutrition_anamnesis`: allow nutritionists to read anamnesis of athletes
  assigned to them via `profiles.assigned_nutritionist_id`; allow head coaches
  to read anamnesis of athletes on their teams.

3. Security
- Read-only (SELECT) policies, scoped `TO authenticated`.
- Nutritionists can only see athletes where `profiles.assigned_nutritionist_id`
  equals their own id.
- Head coaches can only see athletes who are members of a team whose
  `coach_id` equals their own id.
- No write access is granted: diaries and anamnesis remain owned by the
  athlete; professionals only read and (for trainers/admins) review.
- Profiles are already readable by authenticated users (needed for athlete
  names in the rosters).
*/

-- food_diary_sessions: nutritionist (direct assignment) + head coach (team)
CREATE POLICY "Nutritionists view assigned athletes diary sessions"
ON food_diary_sessions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles a
    WHERE a.id = food_diary_sessions.athlete_id
      AND a.assigned_nutritionist_id = auth.uid()
  )
);

CREATE POLICY "Head coaches view team athletes diary sessions"
ON food_diary_sessions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.athlete_id = food_diary_sessions.athlete_id
      AND t.coach_id = auth.uid()
  )
);

-- food_diary_entries: scope through the parent session
CREATE POLICY "Nutritionists view assigned athletes diary entries"
ON food_diary_entries FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM food_diary_sessions s
    WHERE s.id = food_diary_entries.session_id
      AND EXISTS (
        SELECT 1 FROM profiles a
        WHERE a.id = s.athlete_id
          AND a.assigned_nutritionist_id = auth.uid()
      )
  )
);

CREATE POLICY "Head coaches view team athletes diary entries"
ON food_diary_entries FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM food_diary_sessions s
    WHERE s.id = food_diary_entries.session_id
      AND EXISTS (
        SELECT 1
        FROM team_members tm
        JOIN teams t ON t.id = tm.team_id
        WHERE tm.athlete_id = s.athlete_id
          AND t.coach_id = auth.uid()
      )
  )
);

-- nutrition_anamnesis: nutritionist (direct assignment) + head coach (team)
CREATE POLICY "Nutritionists view assigned athletes anamnesis"
ON nutrition_anamnesis FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles a
    WHERE a.id = nutrition_anamnesis.athlete_id
      AND a.assigned_nutritionist_id = auth.uid()
  )
);

CREATE POLICY "Head coaches view team athletes anamnesis"
ON nutrition_anamnesis FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.athlete_id = nutrition_anamnesis.athlete_id
      AND t.coach_id = auth.uid()
  )
);
