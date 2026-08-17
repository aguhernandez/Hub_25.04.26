/*
  # Add recipients list to admin communications log

  1. Changes
    - Add `recipients` column to `admin_communications_log` to store the list of email addresses
    - This allows admins to see exactly who received each communication

  2. Notes
    - Using jsonb array to store email addresses
    - Existing records will have null recipients (sent before this feature)
*/

-- Add recipients column
ALTER TABLE admin_communications_log
ADD COLUMN IF NOT EXISTS recipients jsonb DEFAULT '[]'::jsonb;

-- Add comment for clarity
COMMENT ON COLUMN admin_communications_log.recipients IS 'Array of email addresses that received this communication';
