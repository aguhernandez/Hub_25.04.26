/*
# Allow nutritionists to review (mark as seen) athlete food diary sessions

1. Purpose
- Professionals must be able to confirm they have seen an athlete's finalized
  24h food diary. The app stores this as `reviewed_by` and `reviewed_at` on the
  `food_diary_sessions` table, which requires UPDATE permission on that table.

2. Security changes
- Adds an UPDATE row level security policy on `food_diary_sessions` for
  nutritionists, restricted to sessions belonging to athletes whose
  `profiles.assigned_nutritionist_id` matches the signed-in professional.
- No data changes. Existing policies (athlete ownership, head coach read,
  trainer/admin update) remain untouched.
- Scope is limited to the athlete assignment relationship; a nutritionist can
  only review diaries of athletes assigned to them.
*/

CREATE POLICY "Nutritionists can review assigned athletes diary sessions"
ON food_diary_sessions FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles a
    WHERE a.id = food_diary_sessions.athlete_id
      AND a.assigned_nutritionist_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles a
    WHERE a.id = food_diary_sessions.athlete_id
      AND a.assigned_nutritionist_id = auth.uid()
  )
);
