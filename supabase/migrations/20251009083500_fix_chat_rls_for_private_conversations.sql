/*
  # Fix Chat RLS for Private Conversations

  1. Changes
    - Drop old policies that only check participant_ids array
    - Create new policies that handle both private (participant_1_id, participant_2_id) and team (participant_ids) conversations
    - Allow users to create private conversations
    - Allow users to view conversations where they are participants

  2. Security
    - Users can only see conversations they're part of
    - Users can create private conversations with others
    - Trainers/admins can create team conversations
*/

-- Drop old policies
DROP POLICY IF EXISTS "Users can view their conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Trainers can create conversations" ON chat_conversations;

-- Policy for viewing conversations
CREATE POLICY "Users can view their conversations"
  ON chat_conversations FOR SELECT
  TO authenticated
  USING (
    -- Private conversations: user is participant_1 or participant_2
    (type = 'private' AND (auth.uid() = participant_1_id OR auth.uid() = participant_2_id))
    OR
    -- Team/group conversations: user is in participant_ids array
    (type IN ('team', 'global') AND auth.uid() = ANY(participant_ids))
  );

-- Policy for creating private conversations
CREATE POLICY "Users can create private conversations"
  ON chat_conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow creating private conversations where user is one of the participants
    type = 'private' AND (auth.uid() = participant_1_id OR auth.uid() = participant_2_id)
  );

-- Policy for trainers/admins to create team conversations
CREATE POLICY "Trainers can create team conversations"
  ON chat_conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    type IN ('team', 'global') 
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('trainer', 'admin')
    )
  );

-- Policy for updating conversations
CREATE POLICY "Users can update their conversations"
  ON chat_conversations FOR UPDATE
  TO authenticated
  USING (
    -- Private conversations: user is participant
    (type = 'private' AND (auth.uid() = participant_1_id OR auth.uid() = participant_2_id))
    OR
    -- Team/group conversations: user is in array
    (type IN ('team', 'global') AND auth.uid() = ANY(participant_ids))
  )
  WITH CHECK (
    -- Same as USING clause
    (type = 'private' AND (auth.uid() = participant_1_id OR auth.uid() = participant_2_id))
    OR
    (type IN ('team', 'global') AND auth.uid() = ANY(participant_ids))
  );
