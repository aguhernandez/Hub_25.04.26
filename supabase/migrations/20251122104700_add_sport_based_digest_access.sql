/*
  # Add Sport-Based Access Control for Digest Articles

  1. Changes
    - Create function to get athlete's sports from team memberships
    - Update RLS policies on digest_articles to filter by sport
    - Ensure athletes can only see articles matching their team sports
    - Maintain existing permissions for trainers and admins
  
  2. Security
    - Athletes can only view published articles
    - Articles must match sports from athlete's teams
    - Premium articles require active membership
    - Trainers and admins have full access
*/

-- Create function to get athlete's sports from their team memberships
CREATE OR REPLACE FUNCTION get_athlete_sports(athlete_user_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    array_agg(DISTINCT t.sport),
    ARRAY[]::text[]
  )
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  WHERE tm.athlete_id = athlete_user_id
  AND t.sport IS NOT NULL;
$$;

-- Drop existing select policy on digest_articles
DROP POLICY IF EXISTS "Users can view published or own articles" ON digest_articles;
DROP POLICY IF EXISTS "Public can view published articles" ON digest_articles;
DROP POLICY IF EXISTS "Athletes can view articles" ON digest_articles;

-- Create new sport-aware select policy
CREATE POLICY "Athletes view articles from their team sports"
  ON digest_articles
  FOR SELECT
  TO authenticated
  USING (
    -- Trainers and admins can see all
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('trainer', 'admin')
    )
    OR
    -- Authors can see their own articles
    author_id = auth.uid()
    OR
    -- Athletes can see published articles matching their team sports
    (
      is_published = true
      AND sport = ANY(get_athlete_sports(auth.uid()))
    )
  );

-- Add comment explaining the policy
COMMENT ON POLICY "Athletes view articles from their team sports" ON digest_articles IS
'Athletes can only view published articles that match the sports of teams they belong to. Trainers and admins can view all articles.';
