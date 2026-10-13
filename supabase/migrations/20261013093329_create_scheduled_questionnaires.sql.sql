/*
# Scheduled Questionnaires for Athletes

1. New Tables
- `scheduled_questionnaires`
  - `id` (uuid, primary key) — unique identifier of the scheduling request
  - `athlete_id` (uuid, references profiles) — the athlete who must complete the questionnaire
  - `professional_id` (uuid, references profiles) — the professional (trainer, head coach, nutritionist, admin) who scheduled it
  - `questionnaire_type` (text, CHECK IN ('wellness', 'food_diary_24h', 'anamnesis')) — which existing questionnaire the athlete must complete:
    - 'wellness' → existing daily Wellness check-in
    - 'food_diary_24h' → existing 24h food record
    - 'anamnesis' → existing nutrition anamnesis form
  - `scheduled_date` (date) — the date on which the athlete should complete the questionnaire (appears on the athlete's training calendar)
  - `status` (text, CHECK IN ('pending', 'completed'), default 'pending') — lifecycle of the request
  - `note` (text, max 300 chars, nullable) — optional short message from the professional
  - `completed_at` (timestamptz, nullable) — when the athlete completed the questionnaire
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Indexes
- `idx_scheduled_questionnaires_athlete_date` on (athlete_id, scheduled_date) — calendar-range queries.
- `idx_scheduled_questionnaires_professional` on (professional_id) — professional-side listing.

3. Security
- Enable RLS on `scheduled_questionnaires`.
- SELECT: the athlete owner sees their requests; professionals (trainer/admin/head_coach roles) see requests of athletes in their teams; nutritionists see requests of their assigned athletes; the requesting professional always sees their own requests.
- INSERT: authenticated professionals (trainer, admin, head_coach, nutritionist) can schedule for an athlete; the athlete themselves can also insert (not used by UI, kept for symmetry).
- UPDATE: the athlete owner can mark their request completed (or revert); professionals with the same visibility rules can update (e.g. cancel/edit).
- DELETE: professionals with the same visibility rules can cancel a scheduled request.

4. Push notification trigger
- AFTER INSERT trigger calls `notify_push_webhook()` (existing helper from 20260519102335) so the
  `push-notification-trigger` Edge Function sends a localized push to the athlete.
- The Edge Function is extended in a companion deploy to handle the `scheduled_questionnaires` table
  (title/body built from questionnaire type + scheduled date, deep-link data to training page).

5. Notes
- This table only REFERENCES existing questionnaire flows. It does not modify any questionnaire
  component, form, or logic. Athlete-side routing will map `questionnaire_type` to the already
  existing components (WellnessCheckinModal, FoodDiary24h, NutritionAnamnesis).
- Idempotent: CREATE TABLE IF NOT EXISTS, policies dropped before creation.
*/

CREATE TABLE IF NOT EXISTS scheduled_questionnaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  questionnaire_type text NOT NULL CHECK (questionnaire_type IN ('wellness', 'food_diary_24h', 'anamnesis')),
  scheduled_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  note text CHECK (length(note) <= 300),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_questionnaires_athlete_date
  ON scheduled_questionnaires(athlete_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_questionnaires_professional
  ON scheduled_questionnaires(professional_id);

ALTER TABLE scheduled_questionnaires ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "athletes_read_own_scheduled_questionnaires" ON scheduled_questionnaires;
CREATE POLICY "athletes_read_own_scheduled_questionnaires"
ON scheduled_questionnaires FOR SELECT
TO authenticated
USING (
  auth.uid() = athlete_id
  OR auth.uid() = professional_id
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role IN ('trainer', 'admin', 'head_coach')
  )
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'nutritionist'
      AND EXISTS (
        SELECT 1 FROM profiles a
        WHERE a.id = scheduled_questionnaires.athlete_id
          AND a.assigned_nutritionist_id = auth.uid()
      )
  )
  OR EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.athlete_id = scheduled_questionnaires.athlete_id
      AND t.coach_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "professionals_schedule_questionnaires" ON scheduled_questionnaires;
CREATE POLICY "professionals_schedule_questionnaires"
ON scheduled_questionnaires FOR INSERT
TO authenticated
WITH CHECK (
  (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('trainer', 'admin', 'head_coach', 'nutritionist')
    )
  )
  OR auth.uid() = athlete_id
);

DROP POLICY IF EXISTS "professionals_or_athlete_update_scheduled_questionnaires" ON scheduled_questionnaires;
CREATE POLICY "professionals_or_athlete_update_scheduled_questionnaires"
ON scheduled_questionnaires FOR UPDATE
TO authenticated
USING (
  auth.uid() = athlete_id
  OR auth.uid() = professional_id
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role IN ('trainer', 'admin', 'head_coach')
  )
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'nutritionist'
      AND EXISTS (
        SELECT 1 FROM profiles a
        WHERE a.id = scheduled_questionnaires.athlete_id
          AND a.assigned_nutritionist_id = auth.uid()
      )
  )
  OR EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.athlete_id = scheduled_questionnaires.athlete_id
      AND t.coach_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = athlete_id
  OR auth.uid() = professional_id
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role IN ('trainer', 'admin', 'head_coach')
  )
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'nutritionist'
      AND EXISTS (
        SELECT 1 FROM profiles a
        WHERE a.id = scheduled_questionnaires.athlete_id
          AND a.assigned_nutritionist_id = auth.uid()
      )
  )
  OR EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.athlete_id = scheduled_questionnaires.athlete_id
      AND t.coach_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "professionals_delete_scheduled_questionnaires" ON scheduled_questionnaires;
CREATE POLICY "professionals_delete_scheduled_questionnaires"
ON scheduled_questionnaires FOR DELETE
TO authenticated
USING (
  auth.uid() = professional_id
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role IN ('trainer', 'admin', 'head_coach')
  )
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'nutritionist'
      AND EXISTS (
        SELECT 1 FROM profiles a
        WHERE a.id = scheduled_questionnaires.athlete_id
          AND a.assigned_nutritionist_id = auth.uid()
      )
  )
  OR EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.athlete_id = scheduled_questionnaires.athlete_id
      AND t.coach_id = auth.uid()
  )
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_scheduled_questionnaires_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_scheduled_questionnaires_updated_at ON scheduled_questionnaires;
CREATE TRIGGER trigger_update_scheduled_questionnaires_updated_at
  BEFORE UPDATE ON scheduled_questionnaires
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_questionnaires_updated_at();

-- Push notification to the athlete when a professional schedules a questionnaire
DROP TRIGGER IF EXISTS push_notify_scheduled_questionnaire ON scheduled_questionnaires;
CREATE TRIGGER push_notify_scheduled_questionnaire
  AFTER INSERT ON scheduled_questionnaires
  FOR EACH ROW
  WHEN (NEW.professional_id <> NEW.athlete_id)
  EXECUTE FUNCTION notify_push_webhook();
