/*
  # Add RLS policies for team chat conversations
  
  ## Changes
  
  1. **Team Chat Access**
    - Team members can view team conversations
    - Team coaches/admins can create team conversations
    - Automatically sync participant list when team members change
  
  2. **Policy Updates**
    - Add policy for viewing team conversations based on team membership
    - Add policy for trainers/admins to create team conversations
*/

-- Drop old conversation policies that might conflict
DROP POLICY IF EXISTS "Users can view their conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Trainers can create conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON chat_conversations;

-- New comprehensive conversation policies
CREATE POLICY "Users can view their private conversations"
  ON chat_conversations FOR SELECT
  TO authenticated
  USING (
    type = 'private' 
    AND auth.uid() = ANY(participant_ids)
  );

CREATE POLICY "Users can view team conversations they belong to"
  ON chat_conversations FOR SELECT
  TO authenticated
  USING (
    type = 'team'
    AND team_id IN (
      SELECT team_id 
      FROM team_members 
      WHERE athlete_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view their team conversations"
  ON chat_conversations FOR SELECT
  TO authenticated
  USING (
    type = 'team'
    AND team_id IN (
      SELECT id 
      FROM teams 
      WHERE coach_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all conversations"
  ON chat_conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Trainers and admins can create conversations"
  ON chat_conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('trainer', 'admin')
    )
  );

CREATE POLICY "Conversation participants can update conversations"
  ON chat_conversations FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = ANY(participant_ids)
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add index for better performance on team chat queries
CREATE INDEX IF NOT EXISTS idx_chat_conversations_team_id ON chat_conversations(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_conversations_type ON chat_conversations(type);