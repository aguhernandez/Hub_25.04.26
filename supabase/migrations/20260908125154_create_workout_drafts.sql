/*
# Create workout_drafts table

## Purpose
Allows users to save in-progress workout plans as drafts before publishing them
as active workouts. Drafts preserve the full planning state (name, date,
exercises, blocks, circuits, assignment settings) so the user can resume editing
later with no restrictions.

## New Table: workout_drafts
- `id` (uuid, primary key) — unique draft identifier
- `user_id` (uuid, not null, defaults to auth.uid()) — owner of the draft; only this user can access it
- `name` (text, not null) — draft name
- `date` (date) — planned date for the workout (nullable so users can save before picking a date)
- `exercises` (jsonb) — full exercise + block + circuit + planning structure, stored as a single JSON blob
- `description` (text) — workout description (optional)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now()) — automatically maintained via trigger

## Security
- RLS enabled on workout_drafts.
- Four owner-scoped policies (select/insert/update/delete) restricted to `authenticated`
  users where `auth.uid() = user_id`.
- The `user_id` column defaults to `auth.uid()` so inserts that omit it still
  satisfy the INSERT policy's WITH CHECK.

## Notes
1. A trigger maintains `updated_at` automatically on every UPDATE.
2. The 10-draft-per-user limit is enforced in the application layer before insert.
3. Drafts are deleted on publish (the app converts a draft into a real workout,
   then deletes the draft row).
*/

CREATE TABLE IF NOT EXISTS workout_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  date date,
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workout_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_workout_drafts" ON workout_drafts;
CREATE POLICY "select_own_workout_drafts"
  ON workout_drafts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_workout_drafts" ON workout_drafts;
CREATE POLICY "insert_own_workout_drafts"
  ON workout_drafts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_workout_drafts" ON workout_drafts;
CREATE POLICY "update_own_workout_drafts"
  ON workout_drafts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_workout_drafts" ON workout_drafts;
CREATE POLICY "delete_own_workout_drafts"
  ON workout_drafts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_workout_drafts_user_id ON workout_drafts(user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_workout_draft_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workout_drafts_updated_at ON workout_drafts;
CREATE TRIGGER trg_workout_drafts_updated_at
  BEFORE UPDATE ON workout_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_workout_draft_updated_at();
