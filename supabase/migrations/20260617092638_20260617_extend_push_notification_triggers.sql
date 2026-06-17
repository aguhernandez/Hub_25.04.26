/*
  # Extend Push Notification Triggers

  Adds missing DB triggers for:
  1. external_endurance_plans INSERT  → new endurance plan from satellite
  2. digest_articles INSERT (is_published=true) → new Performance Pill
  3. digest_articles UPDATE (is_published false→true) → article just published
  4. courses UPDATE (is_published false→true) → course published after draft
*/

-- 1. Endurance plans from satellite
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'push_notify_new_endurance_plan'
  ) THEN
    CREATE TRIGGER push_notify_new_endurance_plan
      AFTER INSERT ON external_endurance_plans
      FOR EACH ROW
      EXECUTE FUNCTION notify_push_webhook();
  END IF;
END $$;

-- 2. Performance Pills: new published article on INSERT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'push_notify_performance_pills_insert'
  ) THEN
    CREATE TRIGGER push_notify_performance_pills_insert
      AFTER INSERT ON digest_articles
      FOR EACH ROW
      WHEN (NEW.is_published = true)
      EXECUTE FUNCTION notify_push_webhook();
  END IF;
END $$;

-- 3. Performance Pills: article published after being a draft
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'push_notify_performance_pills_published'
  ) THEN
    CREATE TRIGGER push_notify_performance_pills_published
      AFTER UPDATE ON digest_articles
      FOR EACH ROW
      WHEN (OLD.is_published IS DISTINCT FROM NEW.is_published AND NEW.is_published = true)
      EXECUTE FUNCTION notify_push_webhook();
  END IF;
END $$;

-- 4. Course goes live: is_published changes from false to true
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'push_notify_course_published'
  ) THEN
    CREATE TRIGGER push_notify_course_published
      AFTER UPDATE ON courses
      FOR EACH ROW
      WHEN (OLD.is_published IS DISTINCT FROM NEW.is_published AND NEW.is_published = true)
      EXECUTE FUNCTION notify_push_webhook();
  END IF;
END $$;
