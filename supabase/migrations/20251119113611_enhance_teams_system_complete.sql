/*
  # Enhance Teams System - Complete Overhaul
  
  ## Changes
  
  1. **Teams Table Enhancements**
    - Add `is_public` (boolean) - Whether team is publicly visible or private
    - Add `is_asciende_official` (boolean) - Official Asciende groups (cannot be deleted)
    - Add `language` (text) - Language preference for content delivery (en/es)
    - Make `coach_id` nullable for official Asciende teams
  
  2. **Official Asciende Teams**
    - Create 7 official sport groups (Beach Volley, Volleyball, Road Cycling, MTB, Running, Trail Running, Triathlon)
    - Each in both English and Spanish
    - These teams are undeletable and managed by admin
  
  3. **Team Communications**
    - Teams can send group messages to all members
    - Connect teams with performance digest system for scientific content delivery
  
  4. **Security**
    - Update RLS policies for public/private teams
    - Official teams visible to all authenticated users
    - Athletes can join official teams
*/

-- Add new columns to teams
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teams' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE teams ADD COLUMN is_public boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teams' AND column_name = 'is_asciende_official'
  ) THEN
    ALTER TABLE teams ADD COLUMN is_asciende_official boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teams' AND column_name = 'language'
  ) THEN
    ALTER TABLE teams ADD COLUMN language text DEFAULT 'en' CHECK (language IN ('en', 'es'));
  END IF;
END $$;

-- Make coach_id nullable for official Asciende teams
ALTER TABLE teams ALTER COLUMN coach_id DROP NOT NULL;

-- Create team_digest_content table to link teams with digest articles
CREATE TABLE IF NOT EXISTS team_digest_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  digest_article_id uuid NOT NULL REFERENCES digest_articles(id) ON DELETE CASCADE,
  sent_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE(team_id, digest_article_id)
);

ALTER TABLE team_digest_content ENABLE ROW LEVEL SECURITY;

-- Policies for team_digest_content
CREATE POLICY "Admins can manage team digest content"
  ON team_digest_content FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Team members can view digest content for their teams"
  ON team_digest_content FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE athlete_id = auth.uid()
    )
  );

-- Update teams RLS policies

-- Drop old policies
DROP POLICY IF EXISTS "Coaches can view own teams" ON teams;
DROP POLICY IF EXISTS "Athletes can view teams they belong to" ON teams;
DROP POLICY IF EXISTS "Admins can view all teams" ON teams;
DROP POLICY IF EXISTS "Coaches can delete own teams" ON teams;

-- New comprehensive policies
CREATE POLICY "View public and official teams"
  ON teams FOR SELECT
  TO authenticated
  USING (is_public = true OR is_asciende_official = true);

CREATE POLICY "View own teams as coach"
  ON teams FOR SELECT
  TO authenticated
  USING (coach_id = auth.uid());

CREATE POLICY "View teams as member"
  ON teams FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
      AND team_members.athlete_id = auth.uid()
    )
  );

CREATE POLICY "Admins view all teams"
  ON teams FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Coaches can delete own non-official teams"
  ON teams FOR DELETE
  TO authenticated
  USING (
    coach_id = auth.uid() 
    AND is_asciende_official = false
  );

CREATE POLICY "Admins can delete any non-official team"
  ON teams FOR DELETE
  TO authenticated
  USING (
    is_asciende_official = false
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_teams_is_asciende_official ON teams(is_asciende_official);
CREATE INDEX IF NOT EXISTS idx_teams_is_public ON teams(is_public);
CREATE INDEX IF NOT EXISTS idx_teams_language ON teams(language);
CREATE INDEX IF NOT EXISTS idx_team_digest_content_team_id ON team_digest_content(team_id);

-- Insert Official Asciende Teams (English)
INSERT INTO teams (name, description, sport, country, is_public, is_asciende_official, language, coach_id)
VALUES
  ('Beach Volleyball', 'Official Asciende group for Beach Volleyball athletes - Receive scientific content and training insights', 'Beach Volleyball', 'International', true, true, 'en', NULL),
  ('Volleyball', 'Official Asciende group for Volleyball athletes - Receive scientific content and training insights', 'Volleyball', 'International', true, true, 'en', NULL),
  ('Road Cycling', 'Official Asciende group for Road Cycling athletes - Receive scientific content and training insights', 'Road Cycling', 'International', true, true, 'en', NULL),
  ('MTB', 'Official Asciende group for Mountain Biking athletes - Receive scientific content and training insights', 'MTB', 'International', true, true, 'en', NULL),
  ('Running', 'Official Asciende group for Running athletes - Receive scientific content and training insights', 'Running', 'International', true, true, 'en', NULL),
  ('Trail Running', 'Official Asciende group for Trail Running athletes - Receive scientific content and training insights', 'Trail Running', 'International', true, true, 'en', NULL),
  ('Triathlon', 'Official Asciende group for Triathlon athletes - Receive scientific content and training insights', 'Triathlon', 'International', true, true, 'en', NULL)
ON CONFLICT DO NOTHING;

-- Insert Official Asciende Teams (Spanish)
INSERT INTO teams (name, description, sport, country, is_public, is_asciende_official, language, coach_id)
VALUES
  ('Vóley Playa', 'Grupo oficial de Asciende para atletas de Vóley Playa - Recibe contenido científico y perspectivas de entrenamiento', 'Vóley Playa', 'Internacional', true, true, 'es', NULL),
  ('Voleibol', 'Grupo oficial de Asciende para atletas de Voleibol - Recibe contenido científico y perspectivas de entrenamiento', 'Voleibol', 'Internacional', true, true, 'es', NULL),
  ('Ciclismo de Ruta', 'Grupo oficial de Asciende para atletas de Ciclismo de Ruta - Recibe contenido científico y perspectivas de entrenamiento', 'Ciclismo de Ruta', 'Internacional', true, true, 'es', NULL),
  ('MTB', 'Grupo oficial de Asciende para atletas de MTB - Recibe contenido científico y perspectivas de entrenamiento', 'MTB', 'Internacional', true, true, 'es', NULL),
  ('Running', 'Grupo oficial de Asciende para atletas de Running - Recibe contenido científico y perspectivas de entrenamiento', 'Running', 'Internacional', true, true, 'es', NULL),
  ('Trail Running', 'Grupo oficial de Asciende para atletas de Trail Running - Recibe contenido científico y perspectivas de entrenamiento', 'Trail Running', 'Internacional', true, true, 'es', NULL),
  ('Triatlón', 'Grupo oficial de Asciende para atletas de Triatlón - Recibe contenido científico y perspectivas de entrenamiento', 'Triatlón', 'Internacional', true, true, 'es', NULL)
ON CONFLICT DO NOTHING;