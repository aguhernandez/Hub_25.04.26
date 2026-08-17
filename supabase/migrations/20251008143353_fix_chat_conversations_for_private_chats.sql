/*
  # Fix Chat Conversations for Private Chats

  1. Changes
    - Add participant_1_id and participant_2_id columns for private chats
    - Add last_message_at column for sorting conversations
    - Keep participant_ids for team/group chats
    - Add indexes for performance

  2. Notes
    - Private chats (type='private') use participant_1_id and participant_2_id
    - Team/group chats (type='team' or 'global') use participant_ids array
*/

-- Add columns for private conversations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_conversations' AND column_name = 'participant_1_id'
  ) THEN
    ALTER TABLE chat_conversations
    ADD COLUMN participant_1_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_conversations' AND column_name = 'participant_2_id'
  ) THEN
    ALTER TABLE chat_conversations
    ADD COLUMN participant_2_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_conversations' AND column_name = 'last_message_at'
  ) THEN
    ALTER TABLE chat_conversations
    ADD COLUMN last_message_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_conversations_participant_1
  ON chat_conversations(participant_1_id);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_participant_2
  ON chat_conversations(participant_2_id);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_message
  ON chat_conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_type
  ON chat_conversations(type);

-- Create function to update last_message_at when a message is sent
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_conversations
  SET last_message_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON chat_messages;
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

COMMENT ON COLUMN chat_conversations.participant_1_id IS 'First participant in private conversations';
COMMENT ON COLUMN chat_conversations.participant_2_id IS 'Second participant in private conversations';
COMMENT ON COLUMN chat_conversations.last_message_at IS 'Timestamp of the last message in this conversation';
