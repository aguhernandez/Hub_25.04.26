/*
  # Complete Chat System

  This migration completes the chat system by adding:
  - chat_attachments table for file uploads
  - Triggers for video expiration and timestamp updates
  - Storage bucket and policies
  - Missing indexes and RLS policies
*/

-- Chat Attachments Table (if not exists)
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
DROP POLICY IF EXISTS "Users can view attachments from own conversations" ON chat_attachments;
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
        chat_conversations.participant_1_id = auth.uid() OR
        chat_conversations.participant_2_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      )
    )
  );

-- Users can upload attachments to their conversations
DROP POLICY IF EXISTS "Users can upload attachments to own conversations" ON chat_attachments;
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
        chat_conversations.participant_1_id = auth.uid() OR
        chat_conversations.participant_2_id = auth.uid()
      )
    )
  );

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

-- Create indexes for attachments
CREATE INDEX IF NOT EXISTS idx_chat_attachments_message ON chat_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_attachments_expires ON chat_attachments(expires_at);

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Users can upload chat attachments" ON storage.objects;
CREATE POLICY "Users can upload chat attachments"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can view chat attachments" ON storage.objects;
CREATE POLICY "Users can view chat attachments"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-attachments'
  );

DROP POLICY IF EXISTS "Users can delete own chat attachments" ON storage.objects;
CREATE POLICY "Users can delete own chat attachments"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chat-attachments' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
