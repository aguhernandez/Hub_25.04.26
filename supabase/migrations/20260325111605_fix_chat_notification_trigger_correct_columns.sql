/*
  # Fix Chat Notification Trigger - Correct Column Names

  The notifications table uses 'message' not 'body', and 'digest_data' for jsonb.
  This migration fixes the trigger to use the correct column names.
*/

CREATE OR REPLACE FUNCTION notify_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv RECORD;
  recipient_id uuid;
  sender_name text;
BEGIN
  IF TG_OP != 'INSERT' THEN RETURN NEW; END IF;

  SELECT * INTO conv FROM chat_conversations WHERE id = NEW.conversation_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  IF conv.type != 'private' THEN RETURN NEW; END IF;

  SELECT unnest INTO recipient_id
  FROM unnest(conv.participant_ids) AS unnest
  WHERE unnest != NEW.sender_id
  LIMIT 1;

  IF recipient_id IS NULL THEN RETURN NEW; END IF;

  SELECT full_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;

  INSERT INTO notifications (user_id, type, title, message, digest_data, is_read, created_at)
  VALUES (
    recipient_id,
    'chat',
    COALESCE(sender_name, 'Mensaje nuevo'),
    COALESCE(NEW.content, 'Archivo adjunto'),
    jsonb_build_object(
      'conversation_id', NEW.conversation_id,
      'sender_id', NEW.sender_id,
      'message_id', NEW.id
    ),
    false,
    NOW()
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;
