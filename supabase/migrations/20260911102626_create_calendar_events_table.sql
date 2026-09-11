/*
# Create Calendar Events Table (Rest Day & Note)

## Purpose
Allow coaches and athletes to add "Rest Day" (Día de Descanso) and "Note" (Nota)
entries to the training calendar. These are simple plain-text entries (max 300 chars)
visible to both the coach and the athlete.

## New Table: `calendar_events`
- `id` (uuid, primary key)
- `athlete_id` (uuid, references profiles) — the athlete whose calendar this event belongs to
- `created_by` (uuid, references profiles) — the user who created the entry (coach or athlete)
- `type` (text, CHECK IN ('rest_day', 'note')) — event type
- `description` (text, max 300 chars) — plain-text description
- `event_date` (date) — the calendar date this event is placed on
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

## Security
- RLS enabled
- Both the athlete and their assigned coach can SELECT, INSERT, UPDATE, and DELETE
- Uses auth.uid() for ownership checks
- Coaches access via the athlete_workouts trainer relationship pattern

## Notes
1. Both coach and athlete can create/view/edit any entry regardless of who created it.
2. The `created_by` field tracks the original creator for display purposes.
3. No rich text — description is plain text only, enforced at the application layer (300 char limit).
*/

CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('rest_day', 'note')),
  description text CHECK (length(description) <= 300),
  event_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast calendar queries
CREATE INDEX IF NOT EXISTS idx_calendar_events_athlete_date
  ON calendar_events(athlete_id, event_date);

CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by
  ON calendar_events(created_by);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Athletes can read their own calendar events
DROP POLICY IF EXISTS "athletes_select_own_calendar_events" ON calendar_events;
CREATE POLICY "athletes_select_own_calendar_events"
  ON calendar_events FOR SELECT
  TO authenticated
  USING (auth.uid() = athlete_id);

-- Coaches can read calendar events for athletes they train
DROP POLICY IF EXISTS "coaches_select_calendar_events" ON calendar_events;
CREATE POLICY "coaches_select_calendar_events"
  ON calendar_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM athlete_workouts aw
      WHERE aw.athlete_id = calendar_events.athlete_id
        AND aw.trainer_id = auth.uid()
    )
  );

-- Athletes can insert their own calendar events
DROP POLICY IF EXISTS "athletes_insert_own_calendar_events" ON calendar_events;
CREATE POLICY "athletes_insert_own_calendar_events"
  ON calendar_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = athlete_id OR auth.uid() = created_by);

-- Coaches can insert calendar events for their athletes
DROP POLICY IF EXISTS "coaches_insert_calendar_events" ON calendar_events;
CREATE POLICY "coaches_insert_calendar_events"
  ON calendar_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM athlete_workouts aw
      WHERE aw.athlete_id = calendar_events.athlete_id
        AND aw.trainer_id = auth.uid()
    )
  );

-- Athletes can update their own calendar events
DROP POLICY IF EXISTS "athletes_update_own_calendar_events" ON calendar_events;
CREATE POLICY "athletes_update_own_calendar_events"
  ON calendar_events FOR UPDATE
  TO authenticated
  USING (auth.uid() = athlete_id)
  WITH CHECK (auth.uid() = athlete_id);

-- Coaches can update calendar events for their athletes
DROP POLICY IF EXISTS "coaches_update_calendar_events" ON calendar_events;
CREATE POLICY "coaches_update_calendar_events"
  ON calendar_events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM athlete_workouts aw
      WHERE aw.athlete_id = calendar_events.athlete_id
        AND aw.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM athlete_workouts aw
      WHERE aw.athlete_id = calendar_events.athlete_id
        AND aw.trainer_id = auth.uid()
    )
  );

-- Athletes can delete their own calendar events
DROP POLICY IF EXISTS "athletes_delete_own_calendar_events" ON calendar_events;
CREATE POLICY "athletes_delete_own_calendar_events"
  ON calendar_events FOR DELETE
  TO authenticated
  USING (auth.uid() = athlete_id);

-- Coaches can delete calendar events for their athletes
DROP POLICY IF EXISTS "coaches_delete_calendar_events" ON calendar_events;
CREATE POLICY "coaches_delete_calendar_events"
  ON calendar_events FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM athlete_workouts aw
      WHERE aw.athlete_id = calendar_events.athlete_id
        AND aw.trainer_id = auth.uid()
    )
  );

-- Auto-update updated_at on row update
CREATE OR REPLACE FUNCTION update_calendar_events_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER trigger_update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_events_updated_at();
