/*
  # Enhanced Digest System - Complete

  All improvements for Performance Digest with correct table names
*/

-- Add new fields to digest_articles
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'digest_articles' AND column_name = 'language') THEN
    ALTER TABLE digest_articles ADD COLUMN language text DEFAULT 'en' CHECK (language IN ('en', 'es'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'digest_articles' AND column_name = 'cover_image_path') THEN
    ALTER TABLE digest_articles ADD COLUMN cover_image_path text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'digest_articles' AND column_name = 'external_url') THEN
    ALTER TABLE digest_articles ADD COLUMN external_url text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'digest_articles' AND column_name = 'target_sports') THEN
    ALTER TABLE digest_articles ADD COLUMN target_sports text[];
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'digest_articles' AND column_name = 'target_roles') THEN
    ALTER TABLE digest_articles ADD COLUMN target_roles text[];
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'digest_articles' AND column_name = 'is_premium') THEN
    ALTER TABLE digest_articles ADD COLUMN is_premium boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'digest_articles' AND column_name = 'premium_preview_length') THEN
    ALTER TABLE digest_articles ADD COLUMN premium_preview_length integer DEFAULT 200;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'digest_articles' AND column_name = 'views_count') THEN
    ALTER TABLE digest_articles ADD COLUMN views_count integer DEFAULT 0;
  END IF;
END $$;

-- Update digest_article_reads
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'digest_article_reads' AND column_name = 'read_percentage') THEN
    ALTER TABLE digest_article_reads ADD COLUMN read_percentage integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'digest_article_reads' AND column_name = 'time_spent_seconds') THEN
    ALTER TABLE digest_article_reads ADD COLUMN time_spent_seconds integer DEFAULT 0;
  END IF;
END $$;

-- Drop existing policies safely
DO $$
BEGIN
  DROP POLICY IF EXISTS "Trainers and admins can manage digest articles" ON digest_articles;
  DROP POLICY IF EXISTS "Published articles are viewable by authenticated users" ON digest_articles;
  DROP POLICY IF EXISTS "Authors can update own articles" ON digest_articles;
  DROP POLICY IF EXISTS "Authors can delete own articles" ON digest_articles;
  DROP POLICY IF EXISTS "Users can view targeted published articles" ON digest_articles;
END $$;

-- Create new policies
CREATE POLICY "Authors can update own articles"
  ON digest_articles FOR UPDATE
  TO authenticated
  USING (
    author_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Authors can delete own articles"
  ON digest_articles FOR DELETE
  TO authenticated
  USING (
    author_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can view targeted published articles"
  ON digest_articles FOR SELECT
  TO authenticated
  USING (
    is_published = true AND (
      (target_sports IS NULL AND target_roles IS NULL) OR
      (target_sports IS NOT NULL AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.sport = ANY(digest_articles.target_sports)
      )) OR
      (target_roles IS NOT NULL AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = ANY(digest_articles.target_roles)
      )) OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_digest_views(article_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE digest_articles
  SET views_count = views_count + 1
  WHERE id = article_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark as read and get next
CREATE OR REPLACE FUNCTION mark_digest_read_and_get_next(
  article_id_param uuid,
  user_id_param uuid,
  read_percent integer DEFAULT 100,
  time_spent integer DEFAULT 0
)
RETURNS TABLE(next_article_id uuid) AS $$
DECLARE
  current_published_date date;
BEGIN
  INSERT INTO digest_article_reads (article_id, user_id, read_at, read_percentage, time_spent_seconds)
  VALUES (article_id_param, user_id_param, now(), read_percent, time_spent)
  ON CONFLICT (article_id, user_id)
  DO UPDATE SET
    read_at = now(),
    read_percentage = read_percent,
    time_spent_seconds = digest_article_reads.time_spent_seconds + time_spent;

  SELECT published_date INTO current_published_date
  FROM digest_articles
  WHERE id = article_id_param;

  RETURN QUERY
  SELECT da.id
  FROM digest_articles da
  LEFT JOIN digest_article_reads dr ON da.id = dr.article_id AND dr.user_id = user_id_param
  WHERE da.is_published = true
  AND da.published_date >= current_published_date
  AND da.id != article_id_param
  AND dr.id IS NULL
  ORDER BY da.published_date ASC, da.created_at ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_digest_articles_language ON digest_articles(language);
CREATE INDEX IF NOT EXISTS idx_digest_articles_target_sports ON digest_articles USING GIN(target_sports);
CREATE INDEX IF NOT EXISTS idx_digest_articles_is_premium ON digest_articles(is_premium);
CREATE INDEX IF NOT EXISTS idx_digest_article_reads_percentage ON digest_article_reads(read_percentage);
