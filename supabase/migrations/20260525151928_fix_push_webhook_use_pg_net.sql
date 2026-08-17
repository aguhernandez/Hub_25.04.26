/*
  # Fix Push Notification Webhook Trigger

  1. Problem
    - The existing notify_push_webhook() uses extensions.http_post() which requires the
      http extension that is not installed
    - It also tries to read vault secrets that may not be configured

  2. Solution
    - Rewrite to use net.http_post() from pg_net (which IS available on Supabase)
    - Use hardcoded project URL since the function has verify_jwt: false
    - Remove vault dependency entirely

  3. Changes
    - Replaces notify_push_webhook() function
    - All existing triggers remain intact (they reference the function by name)
*/

CREATE OR REPLACE FUNCTION notify_push_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, extensions
AS $$
DECLARE
  payload jsonb;
  request_id bigint;
BEGIN
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', to_jsonb(NEW),
    'old_record', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END
  );

  SELECT net.http_post(
    url := 'https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/push-notification-trigger',
    body := payload,
    headers := '{"Content-Type": "application/json"}'::jsonb
  ) INTO request_id;

  RETURN NEW;
END;
$$;
