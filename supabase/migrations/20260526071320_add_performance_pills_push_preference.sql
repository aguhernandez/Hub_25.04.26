/*
  # Add Performance Pills push notification preference

  1. Modified Tables
    - `push_notification_preferences`
      - Added `performance_pills` (boolean, default true) - controls whether users receive push notifications for new Performance Pills articles

  2. Notes
    - Default is true so existing users automatically receive notifications
    - Users can disable via settings
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'push_notification_preferences' AND column_name = 'performance_pills'
  ) THEN
    ALTER TABLE push_notification_preferences ADD COLUMN performance_pills boolean NOT NULL DEFAULT true;
  END IF;
END $$;
