/*
# Add consumption reason to food diary entries

1. Modified Tables
- `food_diary_entries`
  - New column `consumption_reason` (text, not null, default '')
  - Plain-text field where the athlete records WHY they ate the meal
    (e.g. pre-workout, hunger, celebration, recovery).

2. Security
- No RLS changes: table-level privileges already cover new columns.
- Existing rows get '' as their reason (empty = not provided).

3. Notes
- Idempotent via IF NOT EXISTS.
- Kept separate from `additional_notes`, which is used by the AI photo
  analysis flow for its own annotations.
*/

ALTER TABLE food_diary_entries
  ADD COLUMN IF NOT EXISTS consumption_reason text NOT NULL DEFAULT '';
