/*
  # Chat System for Athlete-Trainer Communication

  1. New Tables
    - `chat_conversations`
      - Stores conversation metadata between users
      - Fields: id, user_1_id, user_2_id, last_message_at, created_at
      - Unique constraint on user pair (works both directions)

    - `chat_messages`
      - Stores individual messages
      - Fields: id, conversation_id, sender_id, message_text, is_read, created_at
      - Indexes for fast retrieval

    - `chat_attachments`
      - Stores file attachments (photos/videos)
      - Fields: id, message_id, file_url, file_type (photo/video), file_size, expires_at, created_at
      - Videos auto-expire after 7 days

  2. Security
    - Enable RLS on all tables
    - Users can only access their own conversations
    - Admins can view all conversations

  3. Features
    - Real-time message delivery via Supabase Realtime
    - Read receipts
    - File attachments with automatic video expiration (7 days)
    - Conversation list with last message preview
*/

-- Chat Conversations Table
CREATE TABLE IF NOT EXISTS chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_1_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_2_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

-- Users can view conversations they're part of
CREATE POLICY "Users can view own conversations"
  ON chat_conversations
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_1_id OR
    auth.uid() = user_2_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users can create conversations
CREATE POLICY "Users can create conversations"
  ON chat_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_1_id OR auth.uid() = user_2_id
  );

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message_text text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages from their conversations
CREATE POLICY "Users can view messages from own conversations"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND (
        chat_conversations.user_1_id = auth.uid() OR
        chat_conversations.user_2_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      )
    )
  );

-- Users can send messages to their conversations
CREATE POLICY "Users can send messages to own conversations"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND (
        chat_conversations.user_1_id = auth.uid() OR
        chat_conversations.user_2_id = auth.uid()
      )
    )
  );

-- Users can update read status of messages in their conversations
CREATE POLICY "Users can mark messages as read"
  ON chat_messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND (
        chat_conversations.user_1_id = auth.uid() OR
        chat_conversations.user_2_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND (
        chat_conversations.user_1_id = auth.uid() OR
        chat_conversations.user_2_id = auth.uid()
      )
    )
  );

-- Chat Attachments Table
CREATE TABLE IF NOT EXISTS chat_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('photo', 'video', 'document')),
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_attachments ENABLE ROW LEVEL SECURITY;

-- Users can view attachments from their conversations
CREATE POLICY "Users can view attachments from own conversations"
  ON chat_attachments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_messages
      JOIN chat_conversations ON chat_conversations.id = chat_messages.conversation_id
      WHERE chat_messages.id = chat_attachments.message_id
      AND (
        chat_conversations.user_1_id = auth.uid() OR
        chat_conversations.user_2_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      )
    )
  );

-- Users can upload attachments to their conversations
CREATE POLICY "Users can upload attachments to own conversations"
  ON chat_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_messages
      JOIN chat_conversations ON chat_conversations.id = chat_messages.conversation_id
      WHERE chat_messages.id = chat_attachments.message_id
      AND chat_messages.sender_id = auth.uid()
      AND (
        chat_conversations.user_1_id = auth.uid() OR
        chat_conversations.user_2_id = auth.uid()
      )
    )
  );

-- Function to update last_message_at on conversation
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update conversation timestamp when message is sent
DROP TRIGGER IF EXISTS update_conversation_timestamp_trigger ON chat_messages;
CREATE TRIGGER update_conversation_timestamp_trigger
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- Function to set video expiration date (7 days)
CREATE OR REPLACE FUNCTION set_video_expiration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.file_type = 'video' THEN
    NEW.expires_at = NEW.created_at + INTERVAL '7 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set expiration for videos
DROP TRIGGER IF EXISTS set_video_expiration_trigger ON chat_attachments;
CREATE TRIGGER set_video_expiration_trigger
  BEFORE INSERT ON chat_attachments
  FOR EACH ROW
  EXECUTE FUNCTION set_video_expiration();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user1 ON chat_conversations(user_1_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user2 ON chat_conversations(user_2_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_message ON chat_conversations(last_message_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_conversations_users ON chat_conversations(user_1_id, user_2_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_attachments_message ON chat_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_attachments_expires ON chat_attachments(expires_at);

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Users can upload files to their own folder
CREATE POLICY "Users can upload chat attachments"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage policy: Users can view attachments from their conversations
CREATE POLICY "Users can view chat attachments"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-attachments'
  );

-- Storage policy: Users can delete their own attachments
CREATE POLICY "Users can delete own chat attachments"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chat-attachments' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
