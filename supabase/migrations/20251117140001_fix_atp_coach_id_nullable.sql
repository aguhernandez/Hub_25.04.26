/*
  # Fix Annual Training Plans - Make coach_id nullable

  1. Changes
    - Make coach_id nullable so athletes can create their own plans
    - Add priority field to atp_events for A/B/C competitions (like TrainingPeaks)

  2. Security
    - Athletes can create plans without a coach
    - Existing RLS policies remain unchanged
*/

-- Make coach_id nullable
ALTER TABLE annual_training_plans
ALTER COLUMN coach_id DROP NOT NULL;

-- Add priority field to events (A/B/C like TrainingPeaks)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'atp_events' AND column_name = 'priority'
  ) THEN
    ALTER TABLE atp_events
    ADD COLUMN priority text CHECK (priority IN ('A', 'B', 'C'));
  END IF;
END $$;
