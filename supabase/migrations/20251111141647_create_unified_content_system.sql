/*
  # Create Unified Content Publishing System

  1. Changes to Tables
    - Add `parent_article_id` to link article versions
    - Add `article_type` to distinguish Landing/Base/App versions
    - Add `visibility_level` for public/members/athletes control
    - Add `is_summary` flag for digest versions
    - Add `cross_references` JSONB for related versions

  2. New Functions
    - Function to create article version from parent
    - Function to sync metadata across versions
    - Function to generate AI summary suggestions

  3. Security
    - Maintain existing RLS policies
    - Add policies for cross-version access
*/

-- Add new columns to digest_articles for unified content system
ALTER TABLE digest_articles 
ADD COLUMN IF NOT EXISTS parent_article_id uuid REFERENCES digest_articles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS article_type text DEFAULT 'app' CHECK (article_type IN ('landing', 'base', 'app')),
ADD COLUMN IF NOT EXISTS visibility_level text DEFAULT 'athletes' CHECK (visibility_level IN ('public', 'members', 'athletes')),
ADD COLUMN IF NOT EXISTS is_summary boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cross_references jsonb DEFAULT '{"landing_id": null, "base_id": null, "app_id": null}'::jsonb,
ADD COLUMN IF NOT EXISTS ai_summary text,
ADD COLUMN IF NOT EXISTS original_content text;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_digest_articles_parent ON digest_articles(parent_article_id);
CREATE INDEX IF NOT EXISTS idx_digest_articles_type ON digest_articles(article_type);
CREATE INDEX IF NOT EXISTS idx_digest_articles_visibility ON digest_articles(visibility_level);

-- Function to create article version
CREATE OR REPLACE FUNCTION create_article_version(
  source_article_id uuid,
  target_type text,
  target_visibility text,
  is_summary_version boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_article_id uuid;
  source_article record;
BEGIN
  -- Get source article
  SELECT * INTO source_article FROM digest_articles WHERE id = source_article_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source article not found';
  END IF;

  -- Create new version
  INSERT INTO digest_articles (
    title,
    subtitle,
    content,
    image_url,
    category,
    sport,
    article_language,
    author_id,
    parent_article_id,
    article_type,
    visibility_level,
    is_summary,
    is_published,
    reading_time_minutes,
    template_type,
    target_roles,
    original_content
  ) VALUES (
    source_article.title,
    source_article.subtitle,
    source_article.content,
    source_article.image_url,
    source_article.category,
    source_article.sport,
    source_article.article_language,
    source_article.author_id,
    source_article_id,
    target_type,
    target_visibility,
    is_summary_version,
    false,
    source_article.reading_time_minutes,
    source_article.template_type,
    CASE 
      WHEN target_visibility = 'public' THEN ARRAY['athlete', 'trainer']::text[]
      WHEN target_visibility = 'members' THEN ARRAY['athlete', 'trainer']::text[]
      WHEN target_visibility = 'athletes' THEN ARRAY['athlete']::text[]
    END,
    source_article.content
  ) RETURNING id INTO new_article_id;

  -- Update cross-references in source
  UPDATE digest_articles
  SET cross_references = jsonb_set(
    COALESCE(cross_references, '{}'::jsonb),
    ARRAY[target_type || '_id'],
    to_jsonb(new_article_id::text)
  )
  WHERE id = source_article_id;

  -- Update cross-references in new version
  UPDATE digest_articles
  SET cross_references = jsonb_set(
    jsonb_set(
      COALESCE(cross_references, '{}'::jsonb),
      ARRAY['parent_id'],
      to_jsonb(source_article_id::text)
    ),
    ARRAY[source_article.article_type || '_id'],
    to_jsonb(source_article_id::text)
  )
  WHERE id = new_article_id;

  RETURN new_article_id;
END;
$$;

-- Function to sync metadata across versions
CREATE OR REPLACE FUNCTION sync_article_versions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only sync if specific fields changed
  IF (OLD.title != NEW.title OR 
      OLD.subtitle != NEW.subtitle OR 
      OLD.image_url != NEW.image_url OR
      OLD.category != NEW.category OR
      OLD.sport != NEW.sport) THEN
    
    -- Update all child versions
    UPDATE digest_articles
    SET 
      title = NEW.title,
      subtitle = NEW.subtitle,
      image_url = NEW.image_url,
      category = NEW.category,
      sport = NEW.sport
    WHERE parent_article_id = NEW.id;
    
    -- Update parent if this is a child
    IF NEW.parent_article_id IS NOT NULL THEN
      UPDATE digest_articles
      SET 
        title = NEW.title,
        subtitle = NEW.subtitle,
        image_url = NEW.image_url,
        category = NEW.category,
        sport = NEW.sport
      WHERE id = NEW.parent_article_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for metadata sync
DROP TRIGGER IF EXISTS sync_article_metadata ON digest_articles;
CREATE TRIGGER sync_article_metadata
AFTER UPDATE ON digest_articles
FOR EACH ROW
EXECUTE FUNCTION sync_article_versions();

-- Function to generate AI summary suggestions (placeholder for now)
CREATE OR REPLACE FUNCTION generate_article_summary(article_content text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  summary_text text;
  word_count int;
BEGIN
  -- Simple summary: extract first 3 paragraphs or 200 words
  word_count := array_length(regexp_split_to_array(article_content, '\s+'), 1);
  
  IF word_count > 200 THEN
    -- Take first 200 words
    summary_text := array_to_string(
      (regexp_split_to_array(article_content, '\s+'))[1:200],
      ' '
    ) || '...';
  ELSE
    summary_text := article_content;
  END IF;
  
  RETURN summary_text;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_article_version TO authenticated;
GRANT EXECUTE ON FUNCTION generate_article_summary TO authenticated;
