/*
  # Add Membership Tier to Digest Articles

  1. Changes
    - Add `required_membership_tier` column to digest_articles
    - Default: 'inicia' (free for all users)
    - Options: 'inicia', 'asciende', 'pro'
    - Allows admin/trainer to mark articles as premium content
  
  2. Logic
    - 'inicia': Available to all users (default)
    - 'asciende': Requires Asciende membership or higher
    - 'pro': Requires Pro membership only
*/

-- Add required_membership_tier column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'digest_articles' AND column_name = 'required_membership_tier'
  ) THEN
    ALTER TABLE digest_articles
    ADD COLUMN required_membership_tier text DEFAULT 'inicia' CHECK (required_membership_tier IN ('inicia', 'asciende', 'pro'));
  END IF;
END $$;

-- Update existing articles to default tier
UPDATE digest_articles
SET required_membership_tier = 'inicia'
WHERE required_membership_tier IS NULL;