/*
  # Add priority column to notifications

  1. Changes
    - Add `priority` column to `notifications` table
      - Type: text with check constraint
      - Values: 'low', 'normal', 'high', 'urgent'
      - Default: 'normal'
  
  2. Notes
    - This allows notifications to be prioritized
    - Existing notifications will have 'normal' priority
*/

-- Add priority column to notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'priority'
  ) THEN
    ALTER TABLE notifications 
    ADD COLUMN priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
  END IF;
END $$;
