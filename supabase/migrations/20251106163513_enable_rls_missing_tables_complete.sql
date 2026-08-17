/*
  # Enable RLS on Missing Tables (Complete)

  This migration enables Row Level Security on tables that currently have it disabled
  and adds appropriate security policies.

  ## Tables Updated
  
  ### 1. notification_queue
  - Enables RLS
  - Policy: Users can view their own notifications
  - Policy: Users can update their own notifications (mark as read)
  - Policy: Users can delete their own notifications
  - Policy: Admins can view all notifications
  
  ### 2. zoom_meetings
  - Enables RLS
  - Policy: Users can view meetings they host
  - Policy: Users can view meetings for bookings they're involved in
  - Policy: Trainers can manage their own meetings
  - Policy: Admins can view all meetings
  
  ### 3. chat_attachments
  - Enables RLS
  - Policy: Users can view attachments in conversations they participate in
  - Policy: Users can insert attachments in their conversations
  - Policy: Users can delete attachments from their conversations
  - Policy: Admins can view all attachments
  
  ### 4. professional_availability
  - Enables RLS
  - Policy: Professionals can manage their own availability
  - Policy: Users can view professional availability
  - Policy: Admins can manage all availability

  ## Security Notes
  - All policies are restrictive by default
  - Each policy checks authentication and ownership/participation
  - Admin access is provided where appropriate for platform management
*/

-- Enable RLS on notification_queue
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Policies for notification_queue
CREATE POLICY "Users can view own notifications"
  ON notification_queue FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own notifications"
  ON notification_queue FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own notifications"
  ON notification_queue FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Admins can view all notifications"
  ON notification_queue FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

-- Enable RLS on zoom_meetings
ALTER TABLE zoom_meetings ENABLE ROW LEVEL SECURITY;

-- Policies for zoom_meetings
CREATE POLICY "Users can view own hosted meetings"
  ON zoom_meetings FOR SELECT
  TO authenticated
  USING (host_id = (SELECT auth.uid()));

CREATE POLICY "Users can view meetings for their bookings"
  ON zoom_meetings FOR SELECT
  TO authenticated
  USING (
    event_id IN (
      SELECT id FROM bookings
      WHERE user_id = (SELECT auth.uid())
         OR professional_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Trainers can insert own meetings"
  ON zoom_meetings FOR INSERT
  TO authenticated
  WITH CHECK (host_id = (SELECT auth.uid()));

CREATE POLICY "Trainers can update own meetings"
  ON zoom_meetings FOR UPDATE
  TO authenticated
  USING (host_id = (SELECT auth.uid()))
  WITH CHECK (host_id = (SELECT auth.uid()));

CREATE POLICY "Trainers can delete own meetings"
  ON zoom_meetings FOR DELETE
  TO authenticated
  USING (host_id = (SELECT auth.uid()));

CREATE POLICY "Admins can view all meetings"
  ON zoom_meetings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

-- Enable RLS on chat_attachments
ALTER TABLE chat_attachments ENABLE ROW LEVEL SECURITY;

-- Policies for chat_attachments
CREATE POLICY "Users can view attachments in their conversations"
  ON chat_attachments FOR SELECT
  TO authenticated
  USING (
    message_id IN (
      SELECT cm.id FROM chat_messages cm
      JOIN chat_conversations cc ON cc.id = cm.conversation_id
      WHERE (SELECT auth.uid()) = ANY(cc.participant_ids)
         OR cc.participant_1_id = (SELECT auth.uid())
         OR cc.participant_2_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can insert attachments in their conversations"
  ON chat_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    message_id IN (
      SELECT cm.id FROM chat_messages cm
      JOIN chat_conversations cc ON cc.id = cm.conversation_id
      WHERE (SELECT auth.uid()) = ANY(cc.participant_ids)
         OR cc.participant_1_id = (SELECT auth.uid())
         OR cc.participant_2_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete attachments from their conversations"
  ON chat_attachments FOR DELETE
  TO authenticated
  USING (
    message_id IN (
      SELECT cm.id FROM chat_messages cm
      JOIN chat_conversations cc ON cc.id = cm.conversation_id
      WHERE (SELECT auth.uid()) = ANY(cc.participant_ids)
         OR cc.participant_1_id = (SELECT auth.uid())
         OR cc.participant_2_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Admins can view all attachments"
  ON chat_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

-- Enable RLS on professional_availability
ALTER TABLE professional_availability ENABLE ROW LEVEL SECURITY;

-- Policies for professional_availability
CREATE POLICY "Professionals can view own availability"
  ON professional_availability FOR SELECT
  TO authenticated
  USING (professional_id = (SELECT auth.uid()));

CREATE POLICY "Users can view professional availability"
  ON professional_availability FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = professional_id
      AND role IN ('trainer', 'admin')
    )
  );

CREATE POLICY "Professionals can insert own availability"
  ON professional_availability FOR INSERT
  TO authenticated
  WITH CHECK (professional_id = (SELECT auth.uid()));

CREATE POLICY "Professionals can update own availability"
  ON professional_availability FOR UPDATE
  TO authenticated
  USING (professional_id = (SELECT auth.uid()))
  WITH CHECK (professional_id = (SELECT auth.uid()));

CREATE POLICY "Professionals can delete own availability"
  ON professional_availability FOR DELETE
  TO authenticated
  USING (professional_id = (SELECT auth.uid()));

CREATE POLICY "Admins can manage all availability"
  ON professional_availability FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );
