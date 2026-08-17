/*
  # Fix Chat System - Complete v2

  ## Summary
  Adds missing columns, fixes media expiry to 10 days, adds read receipts table,
  adds notification trigger on new messages, adds sport-group and broadcast channel support,
  and fixes all RLS policies.
*/

-- Add is_read_only column to chat_conversations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_conversations' AND column_name = 'is_read_only'
  ) THEN
    ALTER TABLE chat_conversations ADD COLUMN is_read_only boolean DEFAULT false;
  END IF;
END $$;

-- Add sport column to chat_conversations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_conversations' AND column_name = 'sport'
  ) THEN
    ALTER TABLE chat_conversations ADD COLUMN sport text;
  END IF;
END $$;

-- Add icon column for channels
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_conversations' AND column_name = 'icon'
  ) THEN
    ALTER TABLE chat_conversations ADD COLUMN icon text DEFAULT 'MessageSquare';
  END IF;
END $$;

-- Add description column for channels
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_conversations' AND column_name = 'description'
  ) THEN
    ALTER TABLE chat_conversations ADD COLUMN description text;
  END IF;
END $$;

-- Add attachment_expires_at to chat_messages for inline attachments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'attachment_expires_at'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN attachment_expires_at timestamptz;
  END IF;
END $$;

-- Create chat_message_reads table for per-user read tracking
CREATE TABLE IF NOT EXISTS chat_message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);

ALTER TABLE chat_message_reads ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_chat_message_reads_user ON chat_message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_reads_message ON chat_message_reads(message_id);

CREATE POLICY "Users can read own reads"
  ON chat_message_reads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reads"
  ON chat_message_reads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reads"
  ON chat_message_reads FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fix media expiration to 10 days for photos and videos
CREATE OR REPLACE FUNCTION set_media_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.file_type IN ('video', 'photo') THEN
    NEW.expires_at = now() + interval '10 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_video_expiration_trigger ON chat_attachments;
DROP TRIGGER IF EXISTS set_media_expiration_trigger ON chat_attachments;
CREATE TRIGGER set_media_expiration_trigger
  BEFORE INSERT ON chat_attachments
  FOR EACH ROW EXECUTE FUNCTION set_media_expiration();

-- Function to auto-set expiry on inline attachment in chat_messages
CREATE OR REPLACE FUNCTION set_message_attachment_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.attachment_url IS NOT NULL AND NEW.attachment_type IN ('photo', 'video', 'image') THEN
    NEW.attachment_expires_at = now() + interval '10 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_message_attachment_expiry_trigger ON chat_messages;
CREATE TRIGGER set_message_attachment_expiry_trigger
  BEFORE INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION set_message_attachment_expiry();

-- Notification trigger for new chat messages
CREATE OR REPLACE FUNCTION notify_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation chat_conversations%ROWTYPE;
  v_sender_name text;
  v_msg_preview text;
  v_p uuid;
BEGIN
  SELECT * INTO v_conversation FROM chat_conversations WHERE id = NEW.conversation_id;
  SELECT full_name INTO v_sender_name FROM profiles WHERE id = NEW.sender_id;

  v_msg_preview := CASE
    WHEN NEW.content IS NOT NULL AND length(NEW.content) > 0 THEN substring(NEW.content, 1, 100)
    WHEN NEW.attachment_type IS NOT NULL THEN '📎 Archivo adjunto'
    ELSE 'Nuevo mensaje'
  END;

  IF v_conversation.type = 'private' THEN
    FOR v_p IN SELECT unnest(v_conversation.participant_ids) LOOP
      IF v_p <> NEW.sender_id THEN
        INSERT INTO notifications (user_id, type, title, message, link_type, link_id)
        VALUES (
          v_p,
          'chat',
          COALESCE(v_sender_name, 'Mensaje nuevo'),
          v_msg_preview,
          'chat',
          NEW.conversation_id
        );
      END IF;
    END LOOP;
  ELSIF v_conversation.type IN ('team', 'sport', 'global') AND v_conversation.is_read_only = false THEN
    FOR v_p IN SELECT unnest(v_conversation.participant_ids) LOOP
      IF v_p <> NEW.sender_id THEN
        INSERT INTO notifications (user_id, type, title, message, link_type, link_id)
        VALUES (
          v_p,
          'chat',
          COALESCE(v_conversation.name, 'Grupo') || ': ' || COALESCE(v_sender_name, ''),
          v_msg_preview,
          'chat',
          NEW.conversation_id
        );
      END IF;
    END LOOP;
  END IF;

  UPDATE chat_conversations
  SET last_message_at = NEW.created_at, updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_message_notification_trigger ON chat_messages;
CREATE TRIGGER chat_message_notification_trigger
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION notify_chat_message();

-- Drop conflicting old policies
DROP POLICY IF EXISTS "Admins can view all conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Coaches can view their team conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Conversation participants can update conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Trainers and admins can create conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Trainers can create team conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Users can create private conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Users can view team conversations they belong to" ON chat_conversations;
DROP POLICY IF EXISTS "Users can view their private conversations" ON chat_conversations;

-- Fresh RLS for chat_conversations
CREATE POLICY "Users can view accessible conversations"
  ON chat_conversations FOR SELECT
  TO authenticated
  USING (
    type IN ('global', 'broadcast')
    OR auth.uid() = ANY(participant_ids)
    OR (type = 'sport' AND sport IN (SELECT sport FROM profiles WHERE id = auth.uid() AND sport IS NOT NULL))
    OR (type = 'team' AND (
      team_id IN (SELECT team_id FROM team_members WHERE athlete_id = auth.uid())
      OR team_id IN (SELECT id FROM teams WHERE coach_id = auth.uid())
    ))
  );

CREATE POLICY "Users can create private conversations"
  ON chat_conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    type = 'private' AND auth.uid() = ANY(participant_ids)
  );

CREATE POLICY "Trainers and admins can create group conversations"
  ON chat_conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    type IN ('team', 'sport', 'global', 'broadcast')
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'trainer')
  );

CREATE POLICY "Admins can update any conversation"
  ON chat_conversations FOR UPDATE
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'trainer') OR auth.uid() = created_by)
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'trainer') OR auth.uid() = created_by);

-- Fix chat_messages RLS
DROP POLICY IF EXISTS "Users can delete own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can view their messages" ON chat_messages;

CREATE POLICY "Users can view messages in accessible conversations"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM chat_conversations
      WHERE
        type IN ('global', 'broadcast')
        OR auth.uid() = ANY(participant_ids)
        OR (type = 'sport' AND sport IN (SELECT sport FROM profiles WHERE id = auth.uid() AND sport IS NOT NULL))
        OR (type = 'team' AND (
          team_id IN (SELECT team_id FROM team_members WHERE athlete_id = auth.uid())
          OR team_id IN (SELECT id FROM teams WHERE coach_id = auth.uid())
        ))
    )
  );

CREATE POLICY "Users can send messages to writable conversations"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND conversation_id IN (
      SELECT id FROM chat_conversations
      WHERE (
        auth.uid() = ANY(participant_ids)
        OR (type = 'sport' AND sport IN (SELECT sport FROM profiles WHERE id = auth.uid() AND sport IS NOT NULL))
        OR (type = 'team' AND (
          team_id IN (SELECT team_id FROM team_members WHERE athlete_id = auth.uid())
          OR team_id IN (SELECT id FROM teams WHERE coach_id = auth.uid())
        ))
      )
      AND (
        is_read_only = false
        OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'trainer')
      )
    )
  );

CREATE POLICY "Users can delete own messages"
  ON chat_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id);

CREATE POLICY "Users can update own messages"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- Fix chat_attachments RLS
DROP POLICY IF EXISTS "Admins can view all attachments" ON chat_attachments;
DROP POLICY IF EXISTS "Users can delete attachments from their conversations" ON chat_attachments;
DROP POLICY IF EXISTS "Users can insert attachments in their conversations" ON chat_attachments;
DROP POLICY IF EXISTS "Users can view attachments in their conversations" ON chat_attachments;

CREATE POLICY "Users can view non-expired attachments"
  ON chat_attachments FOR SELECT
  TO authenticated
  USING (
    (expires_at IS NULL OR expires_at > now())
    AND message_id IN (
      SELECT cm.id FROM chat_messages cm
      JOIN chat_conversations cc ON cc.id = cm.conversation_id
      WHERE
        cc.type IN ('global', 'broadcast')
        OR auth.uid() = ANY(cc.participant_ids)
        OR (cc.type = 'sport' AND cc.sport IN (SELECT sport FROM profiles WHERE id = auth.uid() AND sport IS NOT NULL))
        OR (cc.type = 'team' AND (
          cc.team_id IN (SELECT team_id FROM team_members WHERE athlete_id = auth.uid())
          OR cc.team_id IN (SELECT id FROM teams WHERE coach_id = auth.uid())
        ))
    )
  );

CREATE POLICY "Users can upload attachments to own messages"
  ON chat_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    message_id IN (SELECT id FROM chat_messages WHERE sender_id = auth.uid())
  );

CREATE POLICY "Users can delete own attachments"
  ON chat_attachments FOR DELETE
  TO authenticated
  USING (
    message_id IN (SELECT id FROM chat_messages WHERE sender_id = auth.uid())
  );

-- Ensure storage bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  false,
  104857600,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 104857600;

-- Storage: allow authenticated users to upload/view
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated can upload chat files' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Authenticated can upload chat files"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'chat-attachments');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated can view chat files' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Authenticated can view chat files"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'chat-attachments');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own chat files' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Users can delete own chat files"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;
