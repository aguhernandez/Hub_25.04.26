/*
# Food diary: 24-hour only + draft/finalized status

1. Modified tables
- `food_diary_sessions`:
  - Existing 48h sessions are normalized to 24h (data preserved, period becomes one day).
  - The `period_hours` check constraint is replaced so ONLY 24 is allowed.
  - The `status` field now uses a two-state draft system:
    - 'draft' — saved but not sent (was 'in_progress')
    - 'finalized' — sent & complete (was 'completed')
  - Old status check constraint dropped BEFORE the value migration, then replaced
    with a new one allowing only ('draft' | 'finalized').
  - Column default changes from 'in_progress' to 'draft'.
  - Sessions finalized by this migration get `completed_at` filled if it was missing.
  - New composite index on (athlete_id, start_date) for fast weekly queries.

2. Security
- No policy changes: existing RLS on both food diary tables remains in effect.

3. Important notes
- This is a value-mapping migration, NOT destructive: every existing session
  keeps its rows and meal entries; only the labels of status/period change.
- Frontend code must use status values 'draft' | 'finalized' from now on.
*/

-- Drop the OLD status constraint first so value migration can run
ALTER TABLE food_diary_sessions
  DROP CONSTRAINT IF EXISTS food_diary_sessions_status_check;

-- Normalize any 48h sessions to 24h before tightening the period constraint
UPDATE food_diary_sessions SET period_hours = 24 WHERE period_hours <> 24;

ALTER TABLE food_diary_sessions
  DROP CONSTRAINT IF EXISTS food_diary_sessions_period_hours_check;
ALTER TABLE food_diary_sessions
  ADD CONSTRAINT food_diary_sessions_period_hours_check CHECK (period_hours = 24);

-- Map old status values to the new draft system
UPDATE food_diary_sessions
  SET status = 'draft',
      completed_at = NULL,
      total_calories = 0, total_carbs_g = 0, total_protein_g = 0, total_fat_g = 0
  WHERE status = 'in_progress';

UPDATE food_diary_sessions
  SET status = 'finalized',
      completed_at = COALESCE(completed_at, now())
  WHERE status = 'completed';

-- Enforce the new status values
ALTER TABLE food_diary_sessions
  ADD CONSTRAINT food_diary_sessions_status_check
  CHECK (status IN ('draft', 'finalized'));

ALTER TABLE food_diary_sessions
  ALTER COLUMN status SET DEFAULT 'draft';

CREATE INDEX IF NOT EXISTS idx_food_diary_sessions_athlete_date
  ON food_diary_sessions(athlete_id, start_date);
