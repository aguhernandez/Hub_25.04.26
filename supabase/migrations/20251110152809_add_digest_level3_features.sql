/*
  # Performance Digest - Level 3 Complete System
  
  ## Overview
  This migration adds all Level 3 features for the Performance Digest system:
  - CTA (Call-to-Action) fields for content funnel
  - Scheduling system for automated publishing
  - Article templates for consistent content creation
  - Enhanced analytics tracking (UTM parameters, conversions)
  - Email notification tracking
  
  ## New Fields Added to digest_articles
  
  ### CTA System
  - `cta_text` - Call-to-action button text (e.g., "Read more on Base")
  - `cta_url` - Target URL for the CTA
  - `cta_type` - Type of CTA: 'base', 'app', 'membership', 'external'
  
  ### Scheduling
  - `scheduled_publish_at` - When to auto-publish the article
  - `auto_published` - Whether it was published automatically
  
  ### Templates
  - `template_type` - Article template: 'tip', 'deep_dive', 'weekly_recap', 'custom'
  
  ### Analytics Enhancement
  - `utm_source` - Traffic source tracking
  - `utm_medium` - Marketing medium
  - `utm_campaign` - Campaign identifier
  - `conversion_count` - Number of CTA clicks
  - `share_count` - Times the article was shared
  
  ### Email Tracking
  - `email_sent` - Whether notification email was sent
  - `email_sent_at` - When the email was sent
  - `email_open_count` - Number of email opens
  
  ## New Table: digest_article_conversions
  
  Tracks individual CTA clicks for analytics:
  - Which users clicked
  - When they clicked
  - What CTA they clicked
  - UTM parameters
  
  ## Security
  - RLS enabled on all new tables
  - Conversion tracking accessible to admins and trainers only
*/

-- Add new fields to digest_articles
ALTER TABLE digest_articles
ADD COLUMN IF NOT EXISTS cta_text text,
ADD COLUMN IF NOT EXISTS cta_url text,
ADD COLUMN IF NOT EXISTS cta_type text DEFAULT 'external' CHECK (cta_type IN ('base', 'app', 'membership', 'external')),
ADD COLUMN IF NOT EXISTS scheduled_publish_at timestamptz,
ADD COLUMN IF NOT EXISTS auto_published boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS template_type text DEFAULT 'custom' CHECK (template_type IN ('tip', 'deep_dive', 'weekly_recap', 'custom')),
ADD COLUMN IF NOT EXISTS utm_source text,
ADD COLUMN IF NOT EXISTS utm_medium text,
ADD COLUMN IF NOT EXISTS utm_campaign text,
ADD COLUMN IF NOT EXISTS conversion_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS share_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS email_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS email_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS email_open_count integer DEFAULT 0;

-- Create digest_article_conversions table for detailed tracking
CREATE TABLE IF NOT EXISTS digest_article_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES digest_articles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clicked_at timestamptz DEFAULT now(),
  cta_type text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_conversions_article_id ON digest_article_conversions(article_id);
CREATE INDEX IF NOT EXISTS idx_conversions_user_id ON digest_article_conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversions_clicked_at ON digest_article_conversions(clicked_at);
CREATE INDEX IF NOT EXISTS idx_digest_scheduled_publish ON digest_articles(scheduled_publish_at) WHERE scheduled_publish_at IS NOT NULL;

-- Enable RLS
ALTER TABLE digest_article_conversions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversions
CREATE POLICY "Users can create their own conversions"
  ON digest_article_conversions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins and trainers can view all conversions"
  ON digest_article_conversions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'trainer')
    )
  );

-- Function to increment conversion count
CREATE OR REPLACE FUNCTION increment_conversion_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE digest_articles
  SET conversion_count = conversion_count + 1
  WHERE id = NEW.article_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-increment conversion count
DROP TRIGGER IF EXISTS trigger_increment_conversion_count ON digest_article_conversions;
CREATE TRIGGER trigger_increment_conversion_count
  AFTER INSERT ON digest_article_conversions
  FOR EACH ROW
  EXECUTE FUNCTION increment_conversion_count();

-- Function to auto-publish scheduled articles
CREATE OR REPLACE FUNCTION auto_publish_scheduled_articles()
RETURNS void AS $$
BEGIN
  UPDATE digest_articles
  SET 
    is_published = true,
    published_date = now(),
    auto_published = true
  WHERE 
    scheduled_publish_at IS NOT NULL
    AND scheduled_publish_at <= now()
    AND is_published = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get article analytics summary
CREATE OR REPLACE FUNCTION get_article_analytics(article_uuid uuid)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'article_id', a.id,
    'title', a.title,
    'view_count', a.view_count,
    'read_count', a.read_count,
    'conversion_count', a.conversion_count,
    'share_count', a.share_count,
    'email_sent', a.email_sent,
    'email_open_count', a.email_open_count,
    'conversion_rate', 
      CASE 
        WHEN a.view_count > 0 THEN ROUND((a.conversion_count::numeric / a.view_count::numeric) * 100, 2)
        ELSE 0 
      END,
    'read_rate',
      CASE 
        WHEN a.view_count > 0 THEN ROUND((a.read_count::numeric / a.view_count::numeric) * 100, 2)
        ELSE 0 
      END,
    'recent_conversions', (
      SELECT json_agg(json_build_object(
        'user_id', c.user_id,
        'clicked_at', c.clicked_at,
        'utm_source', c.utm_source
      ))
      FROM digest_article_conversions c
      WHERE c.article_id = article_uuid
      ORDER BY c.clicked_at DESC
      LIMIT 10
    )
  ) INTO result
  FROM digest_articles a
  WHERE a.id = article_uuid;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE digest_article_conversions IS 'Tracks CTA clicks and conversions from digest articles for analytics';
COMMENT ON FUNCTION auto_publish_scheduled_articles() IS 'Called by cron job to automatically publish scheduled articles';
COMMENT ON FUNCTION get_article_analytics(uuid) IS 'Returns comprehensive analytics for a specific article';
