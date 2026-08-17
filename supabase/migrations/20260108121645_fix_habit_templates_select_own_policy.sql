/*
  # Fix habit_templates SELECT policy - Allow users to view their own templates

  1. Security Changes
    - Add policy for users to SELECT their own personal templates
    - Existing policy allows viewing global templates
    - This completes the RLS setup
  
  2. Notes
    - Users can now view both global templates AND their own personal templates
    - This fixes the 403 error when creating personal templates
*/

-- Allow users to view their own personal templates
CREATE POLICY "Users can view own templates"
  ON habit_templates
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());
