/*
  # Fix habit templates permissions - Admin only creates global, athletes create personal

  1. Security Changes
    - DROP existing policies
    - Only admin can create global templates (is_global = true)
    - Athletes can create personal templates (is_global = false)
    - Athletes can only update their own templates
    - Athletes can only delete their own templates
    - Admin can update/delete all templates
  
  2. Notes
    - Global templates are read-only for non-admins
    - Athletes copy global templates to create their own
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Trainers can create templates" ON habit_templates;
DROP POLICY IF EXISTS "Trainers can update templates" ON habit_templates;
DROP POLICY IF EXISTS "Trainers can delete templates" ON habit_templates;

-- Admin can create any template
CREATE POLICY "Admin can create templates"
  ON habit_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Athletes can create their own personal templates (not global)
CREATE POLICY "Athletes can create personal templates"
  ON habit_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND is_global = false
  );

-- Users can update their own templates, admin can update all
CREATE POLICY "Users can update own templates"
  ON habit_templates
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users can delete their own templates, admin can delete all
CREATE POLICY "Users can delete own templates"
  ON habit_templates
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
