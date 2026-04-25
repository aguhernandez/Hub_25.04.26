/*
  # Admin Communications System

  1. New Tables
    - `admin_communications_log`
      - Stores history of all mass communications sent by admins
      - Tracks emails and notifications sent to users
      - Includes recipient count and filters used

  2. Security
    - Enable RLS
    - Only admins can insert and view communication logs
*/

-- Create admin communications log table
CREATE TABLE IF NOT EXISTS admin_communications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('email', 'notification')),
  subject text NOT NULL,
  body text,
  recipients_count integer NOT NULL DEFAULT 0,
  sent_at timestamptz NOT NULL DEFAULT now(),
  sent_by uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  filters jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE admin_communications_log ENABLE ROW LEVEL SECURITY;

-- Admin can insert logs
CREATE POLICY "Admins can create communication logs"
  ON admin_communications_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin can view all logs
CREATE POLICY "Admins can view all communication logs"
  ON admin_communications_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_communications_sent_at
  ON admin_communications_log(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_communications_type
  ON admin_communications_log(type);
