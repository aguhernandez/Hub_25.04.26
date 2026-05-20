/*
  # Create Push Notification Database Triggers

  1. Purpose
    - Fire push notifications to athletes when key events occur
    - Triggers call the push-notification-trigger Edge Function via pg_net

  2. Trigger Events
    - chat_messages INSERT -> notify recipient of new message
    - athlete_workouts INSERT -> notify athlete of new training plan
    - meal_plans INSERT -> notify athlete of new nutrition plan
    - nutrition_pushed_plans INSERT -> notify athlete of pushed nutrition plan
    - courses INSERT (when status = published) -> notify all athletes
    - user_habits INSERT -> notify athlete of new assigned habit

  3. Implementation
    - Uses pg_net extension for async HTTP calls to Edge Functions
    - Each trigger fires only on INSERT to avoid duplicate notifications
    - The Edge Function handles preference checking and FCM delivery

  4. Notes
    - pg_net must be enabled (it is by default on Supabase)
    - The webhook URL uses the project's Supabase URL + function path
    - Service role key is used for auth to the Edge Function
*/

-- Ensure pg_net extension is available
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Helper function to send webhook to push-notification-trigger
CREATE OR REPLACE FUNCTION notify_push_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  payload jsonb;
  supabase_url text;
  service_key text;
BEGIN
  -- Build the webhook payload matching Supabase webhook format
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', to_jsonb(NEW),
    'old_record', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END
  );

  -- Get the Supabase URL and service role key from vault or config
  -- These are available as database settings in Supabase
  SELECT decrypted_secret INTO supabase_url
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_url'
  LIMIT 1;

  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_service_role_key'
  LIMIT 1;

  -- Fallback: use current_setting if vault secrets not available
  IF supabase_url IS NULL THEN
    supabase_url := current_setting('app.settings.supabase_url', true);
  END IF;
  IF service_key IS NULL THEN
    service_key := current_setting('app.settings.service_role_key', true);
  END IF;

  -- Only proceed if we have the URL and key
  IF supabase_url IS NOT NULL AND service_key IS NOT NULL THEN
    PERFORM extensions.http_post(
      url := supabase_url || '/functions/v1/push-notification-trigger',
      body := payload::text,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      )::text
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on chat_messages INSERT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'push_notify_chat_message'
  ) THEN
    CREATE TRIGGER push_notify_chat_message
      AFTER INSERT ON chat_messages
      FOR EACH ROW
      EXECUTE FUNCTION notify_push_webhook();
  END IF;
END $$;

-- Trigger on athlete_workouts INSERT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'push_notify_new_workout'
  ) THEN
    CREATE TRIGGER push_notify_new_workout
      AFTER INSERT ON athlete_workouts
      FOR EACH ROW
      EXECUTE FUNCTION notify_push_webhook();
  END IF;
END $$;

-- Trigger on meal_plans INSERT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'push_notify_new_meal_plan'
  ) THEN
    CREATE TRIGGER push_notify_new_meal_plan
      AFTER INSERT ON meal_plans
      FOR EACH ROW
      EXECUTE FUNCTION notify_push_webhook();
  END IF;
END $$;

-- Trigger on nutrition_pushed_plans INSERT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'push_notify_nutrition_pushed'
  ) THEN
    CREATE TRIGGER push_notify_nutrition_pushed
      AFTER INSERT ON nutrition_pushed_plans
      FOR EACH ROW
      EXECUTE FUNCTION notify_push_webhook();
  END IF;
END $$;

-- Trigger on courses INSERT (will filter by status in the edge function)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'push_notify_new_course'
  ) THEN
    CREATE TRIGGER push_notify_new_course
      AFTER INSERT ON courses
      FOR EACH ROW
      EXECUTE FUNCTION notify_push_webhook();
  END IF;
END $$;

-- Trigger on user_habits INSERT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'push_notify_new_habit'
  ) THEN
    CREATE TRIGGER push_notify_new_habit
      AFTER INSERT ON user_habits
      FOR EACH ROW
      EXECUTE FUNCTION notify_push_webhook();
  END IF;
END $$;
