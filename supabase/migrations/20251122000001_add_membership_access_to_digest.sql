/*
  # Add Membership Access Control to Digest

  1. Changes
    - Add `minimum_membership_level` column to digest_articles
    - Levels: 'free', 'basic', 'pro', 'teams_sports'
    - Update RLS policies to check membership access
  
  2. Security
    - Users can only view articles for their membership level or below
    - Free users can only see 'free' content
    - Basic users can see 'free' and 'basic'
    - Pro users can see up to 'pro'
    - Teams & Sports users can see everything
*/

-- Add minimum_membership_level column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'digest_articles' AND column_name = 'minimum_membership_level'
  ) THEN
    ALTER TABLE digest_articles 
    ADD COLUMN minimum_membership_level text DEFAULT 'free' CHECK (minimum_membership_level IN ('free', 'basic', 'pro', 'teams_sports'));
  END IF;
END $$;

-- Create function to check membership access
CREATE OR REPLACE FUNCTION check_membership_access(user_id uuid, required_level text)
RETURNS boolean AS $$
DECLARE
  user_level text;
  level_hierarchy int;
BEGIN
  -- Get user's highest membership level
  SELECT 
    CASE
      WHEN EXISTS (
        SELECT 1 FROM membership_subscriptions ms
        JOIN program_products pp ON pp.id = ms.program_product_id
        WHERE ms.athlete_id = user_id 
        AND ms.status = 'active'
        AND pp.title ILIKE '%teams%'
      ) THEN 'teams_sports'
      WHEN EXISTS (
        SELECT 1 FROM membership_subscriptions ms
        JOIN program_products pp ON pp.id = ms.program_product_id
        WHERE ms.athlete_id = user_id 
        AND ms.status = 'active'
        AND pp.title ILIKE '%pro%'
      ) THEN 'pro'
      WHEN EXISTS (
        SELECT 1 FROM membership_subscriptions ms
        JOIN program_products pp ON pp.id = ms.program_product_id
        WHERE ms.athlete_id = user_id 
        AND ms.status = 'active'
        AND pp.title ILIKE '%basic%'
      ) THEN 'basic'
      ELSE 'free'
    END INTO user_level;

  -- Map levels to hierarchy
  level_hierarchy := CASE user_level
    WHEN 'teams_sports' THEN 4
    WHEN 'pro' THEN 3
    WHEN 'basic' THEN 2
    ELSE 1
  END;

  -- Check if user level meets requirement
  RETURN level_hierarchy >= CASE required_level
    WHEN 'teams_sports' THEN 4
    WHEN 'pro' THEN 3
    WHEN 'basic' THEN 2
    ELSE 1
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view published articles" ON digest_articles;

-- Create new policy with membership check
CREATE POLICY "Users can view articles per membership level"
  ON digest_articles FOR SELECT
  TO authenticated
  USING (
    is_published = true
    AND (
      -- Admin can see everything
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
      )
      OR
      -- Check membership level
      check_membership_access(auth.uid(), minimum_membership_level)
    )
    AND (
      -- Sport filter (existing logic)
      target_sports IS NULL 
      OR target_sports = '{}'
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.sport = ANY(target_sports)
      )
    )
  );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_digest_articles_membership_level 
  ON digest_articles(minimum_membership_level);
