/*
  # Fix Chat Realtime Publication & Notification Trigger

  ## Problems Fixed
  1. chat_messages, chat_conversations NOT in supabase_realtime publication
     → Real-time subscriptions were silently failing, so sent messages never appeared live
  2. No notification trigger when a private message is received
     → Notifications table never got entries for chat messages

  ## Changes
  - Add chat_messages and chat_conversations to supabase_realtime publication
  - Add a trigger function that creates a notification when a private message is sent
*/

-- Enable realtime for chat tables
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversations;

-- Function to notify recipient of a new chat message
CREATE OR REPLACE FUNCTION notify_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv RECORD;
  recipient_id uuid;
BEGIN
  -- Only for new messages
  IF TG_OP != 'INSERT' THEN RETURN NEW; END IF;

  -- Get the conversation
  SELECT * INTO conv FROM chat_conversations WHERE id = NEW.conversation_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Only send notification for private conversations
  IF conv.type != 'private' THEN RETURN NEW; END IF;

  -- Find the recipient (the other participant)
  SELECT unnest INTO recipient_id
  FROM unnest(conv.participant_ids) AS unnest
  WHERE unnest != NEW.sender_id
  LIMIT 1;

  IF recipient_id IS NULL THEN RETURN NEW; END IF;

  -- Insert a notification for the recipient
  INSERT INTO notifications (user_id, type, title, body, data, is_read, created_at)
  SELECT
    recipient_id,
    'chat',
    (SELECT full_name FROM profiles WHERE id = NEW.sender_id),
    COALESCE(NEW.content, 'Archivo adjunto'),
    jsonb_build_object(
      'conversation_id', NEW.conversation_id,
      'sender_id', NEW.sender_id,
      'message_id', NEW.id
    ),
    false,
    NOW()
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_chat_message_insert ON chat_messages;

CREATE TRIGGER on_chat_message_insert
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_chat_message();
