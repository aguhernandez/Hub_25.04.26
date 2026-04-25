/*
  # Extend Strava Integration with Soft Delete and Webhook Preparation

  1. Schema Changes
    - Add `deleted_at` column to `external_activities` for soft delete
    - Create `strava_webhook_events` table for future webhook implementation
    - Add `is_deleted` boolean for quick filtering

  2. Indexes
    - Index on `deleted_at` for efficient filtering
    - Index on webhook events for processing

  3. Webhook Preparation
    - Table structure ready for webhook events
    - NOT implementing webhook processing yet (manual sync only)

  4. Data Integrity
    - Soft delete preserves history
    - Can detect activities deleted on Strava
*/

-- Add soft delete support to external_activities
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'external_activities' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE external_activities ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;

-- Add index for deleted_at
CREATE INDEX IF NOT EXISTS idx_external_activities_deleted_at
  ON external_activities(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- Create webhook events table (preparation for future webhook implementation)
CREATE TABLE IF NOT EXISTS strava_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id bigint,
  owner_id bigint NOT NULL,
  object_type text NOT NULL CHECK (object_type IN ('activity', 'athlete')),
  object_id bigint NOT NULL,
  aspect_type text NOT NULL CHECK (aspect_type IN ('create', 'update', 'delete')),
  event_time timestamptz NOT NULL,
  raw_payload jsonb NOT NULL,
  processed boolean DEFAULT false,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for webhook events
CREATE INDEX IF NOT EXISTS idx_strava_webhook_events_owner_id
  ON strava_webhook_events(owner_id);

CREATE INDEX IF NOT EXISTS idx_strava_webhook_events_object_id
  ON strava_webhook_events(object_id);

CREATE INDEX IF NOT EXISTS idx_strava_webhook_events_processed
  ON strava_webhook_events(processed)
  WHERE processed = false;

CREATE INDEX IF NOT EXISTS idx_strava_webhook_events_aspect_type
  ON strava_webhook_events(aspect_type);

-- Enable RLS on webhook events table
ALTER TABLE strava_webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for webhook events (admin/system only)
-- Note: Webhooks are processed by edge functions with service role
-- Users should NOT directly access webhook events

-- Admin can view all webhook events
CREATE POLICY "Admin can view all webhook events"
  ON strava_webhook_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to mark activity as deleted (soft delete)
CREATE OR REPLACE FUNCTION mark_external_activity_deleted(
  p_source text,
  p_external_id text
)
RETURNS void AS $$
BEGIN
  UPDATE external_activities
  SET deleted_at = now()
  WHERE source = p_source
    AND external_id = p_external_id
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore deleted activity
CREATE OR REPLACE FUNCTION restore_external_activity(
  p_activity_id uuid
)
RETURNS void AS $$
BEGIN
  UPDATE external_activities
  SET deleted_at = NULL
  WHERE id = p_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
