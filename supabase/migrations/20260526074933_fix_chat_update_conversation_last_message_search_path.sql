/*
  # Fix chat message "bounce" bug - update_conversation_last_message search_path

  1. Problem
    - The trigger function `update_conversation_last_message` has `SET search_path TO ''`
    - This causes it to fail finding `chat_conversations` table when executing
    - Result: INSERT into chat_messages fails, messages appear to "bounce back"

  2. Fix
    - Replace the function with correct `SET search_path TO 'public'`
    - Add SECURITY DEFINER so it can update conversations regardless of RLS

  3. Notes
    - This fixes the bug where messages appear momentarily then disappear
    - The function updates last_message_at on the conversation after each new message
*/

CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE chat_conversations
  SET last_message_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$function$;
