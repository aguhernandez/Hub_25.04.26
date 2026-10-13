/*
# Allow head coaches to review (mark as seen) their team athletes' diary sessions

1. Purpose
- Head coaches can already view the 24h food diary sessions of athletes in
  their teams (existing SELECT policy). This migration grants them the same
  review permission nutritionists have: marking a session as seen by writing
  `reviewed_by` and `reviewed_at`.

2. Security changes
- Adds an UPDATE row level security policy on `food_diary_sessions` for head
  coaches, restricted to athletes that belong to a team coached by the
  signed-in user (same predicate as the existing head coach SELECT policy).
- No data changes. No other policies are modified.
*/

CREATE POLICY "Head coaches can review team athletes diary sessions"
ON food_diary_sessions FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.athlete_id = food_diary_sessions.athlete_id
      AND t.coach_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.athlete_id = food_diary_sessions.athlete_id
      AND t.coach_id = auth.uid()
  )
);
