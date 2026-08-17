/*
  # Create Performance Digest System
  
  Complete system for scientific performance articles filtered by sport and category.
  Trainers/admins write articles, athletes read and track progress.
  
  1. New Tables
    - `digest_articles`
      - `id` (uuid, primary key)
      - `title` (text) - Article title
      - `subtitle` (text) - Article subtitle
      - `content` (text) - Full article content (markdown supported)
      - `image_url` (text) - Featured image
      - `category` (text) - nutrition, physical, mental, recovery, biomechanics, analysis
      - `sport` (text) - beach_volley, cycling, running, swimming, etc.
      - `author_id` (uuid) - References profiles (trainer/admin)
      - `published_date` (date) - Publication date
      - `is_published` (boolean) - Draft or published
      - `week_number` (int) - Week of year
      - `year` (int) - Year
      - `reading_time_minutes` (int) - Estimated reading time
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `digest_article_reads`
      - `id` (uuid, primary key)
      - `article_id` (uuid) - References digest_articles
      - `user_id` (uuid) - References profiles
      - `read_at` (timestamptz) - When marked as read
      - `read_percentage` (int) - 0-100% read
      
  2. Security
    - Trainers/admins can create and edit articles
    - Athletes can view published articles for their sport
    - Only article author or admin can edit
    - Athletes can track their own reads
    
  3. Features
    - Weekly articles (one per week recommended)
    - Sport filtering (beach_volley, cycling, etc.)
    - Category filtering (nutrition, physical, mental, etc.)
    - Read tracking and progress
    - Image support
*/

-- Create digest_articles table
CREATE TABLE IF NOT EXISTS digest_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  content text NOT NULL,
  image_url text,
  category text CHECK (category IN ('nutrition', 'physical', 'mental', 'recovery', 'biomechanics', 'analysis')),
  sport text NOT NULL,
  author_id uuid REFERENCES profiles(id) NOT NULL,
  published_date date DEFAULT CURRENT_DATE,
  is_published boolean DEFAULT false,
  week_number int CHECK (week_number >= 1 AND week_number <= 53),
  year int,
  reading_time_minutes int DEFAULT 5,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create digest_article_reads table
CREATE TABLE IF NOT EXISTS digest_article_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid REFERENCES digest_articles(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  read_at timestamptz DEFAULT now(),
  read_percentage int DEFAULT 100 CHECK (read_percentage >= 0 AND read_percentage <= 100),
  UNIQUE(article_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_digest_articles_sport ON digest_articles(sport);
CREATE INDEX IF NOT EXISTS idx_digest_articles_category ON digest_articles(category);
CREATE INDEX IF NOT EXISTS idx_digest_articles_published ON digest_articles(is_published);
CREATE INDEX IF NOT EXISTS idx_digest_articles_author ON digest_articles(author_id);
CREATE INDEX IF NOT EXISTS idx_digest_articles_date ON digest_articles(published_date);
CREATE INDEX IF NOT EXISTS idx_digest_article_reads_user ON digest_article_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_digest_article_reads_article ON digest_article_reads(article_id);

-- Enable RLS
ALTER TABLE digest_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE digest_article_reads ENABLE ROW LEVEL SECURITY;

-- Digest Articles Policies

-- Everyone can view published articles
CREATE POLICY "Athletes can view published articles for their sport"
ON digest_articles FOR SELECT
TO authenticated
USING (
  is_published = true
  AND (
    sport = (SELECT sport FROM profiles WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('trainer', 'admin')
    )
  )
);

-- Trainers can view all articles (including drafts)
CREATE POLICY "Trainers can view all articles"
ON digest_articles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('trainer', 'admin')
  )
);

-- Trainers and admins can create articles
CREATE POLICY "Trainers can create articles"
ON digest_articles FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('trainer', 'admin')
  )
  AND author_id = auth.uid()
);

-- Authors and admins can update their articles
CREATE POLICY "Authors can update own articles"
ON digest_articles FOR UPDATE
TO authenticated
USING (
  author_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  author_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Authors and admins can delete their articles
CREATE POLICY "Authors can delete own articles"
ON digest_articles FOR DELETE
TO authenticated
USING (
  author_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Digest Article Reads Policies

-- Users can view their own reads
CREATE POLICY "Users can view own reads"
ON digest_article_reads FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Trainers can view all reads
CREATE POLICY "Trainers can view all reads"
ON digest_article_reads FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('trainer', 'admin')
  )
);

-- Users can mark articles as read
CREATE POLICY "Users can mark articles as read"
ON digest_article_reads FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own reads
CREATE POLICY "Users can update own reads"
ON digest_article_reads FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own reads
CREATE POLICY "Users can delete own reads"
ON digest_article_reads FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Create function to get user's unread article count
CREATE OR REPLACE FUNCTION get_unread_articles_count(user_profile_id uuid)
RETURNS int AS $$
DECLARE
  user_sport text;
  unread_count int;
BEGIN
  SELECT sport INTO user_sport FROM profiles WHERE id = user_profile_id;
  
  SELECT COUNT(*)::int INTO unread_count
  FROM digest_articles da
  WHERE da.is_published = true
    AND da.sport = user_sport
    AND NOT EXISTS (
      SELECT 1 FROM digest_article_reads dar
      WHERE dar.article_id = da.id
      AND dar.user_id = user_profile_id
    );
  
  RETURN unread_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get articles with read status
CREATE OR REPLACE FUNCTION get_articles_with_read_status(
  user_profile_id uuid,
  filter_sport text DEFAULT NULL,
  filter_category text DEFAULT NULL,
  filter_published boolean DEFAULT true
)
RETURNS TABLE (
  id uuid,
  title text,
  subtitle text,
  content text,
  image_url text,
  category text,
  sport text,
  author_id uuid,
  author_name text,
  published_date date,
  is_published boolean,
  week_number int,
  year int,
  reading_time_minutes int,
  created_at timestamptz,
  is_read boolean,
  read_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    da.id,
    da.title,
    da.subtitle,
    da.content,
    da.image_url,
    da.category,
    da.sport,
    da.author_id,
    p.full_name as author_name,
    da.published_date,
    da.is_published,
    da.week_number,
    da.year,
    da.reading_time_minutes,
    da.created_at,
    (dar.id IS NOT NULL) as is_read,
    dar.read_at
  FROM digest_articles da
  LEFT JOIN profiles p ON p.id = da.author_id
  LEFT JOIN digest_article_reads dar ON dar.article_id = da.id AND dar.user_id = user_profile_id
  WHERE 
    (filter_sport IS NULL OR da.sport = filter_sport)
    AND (filter_category IS NULL OR da.category = filter_category)
    AND (filter_published IS NULL OR da.is_published = filter_published)
  ORDER BY da.published_date DESC, da.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update digest_articles updated_at
CREATE OR REPLACE FUNCTION update_digest_articles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_digest_articles_updated_at
  BEFORE UPDATE ON digest_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_digest_articles_updated_at();

-- Create trigger to auto-set week_number and year
CREATE OR REPLACE FUNCTION set_digest_article_week_year()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.week_number IS NULL THEN
    NEW.week_number = EXTRACT(WEEK FROM NEW.published_date);
  END IF;
  
  IF NEW.year IS NULL THEN
    NEW.year = EXTRACT(YEAR FROM NEW.published_date);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_digest_article_week_year
  BEFORE INSERT OR UPDATE ON digest_articles
  FOR EACH ROW
  EXECUTE FUNCTION set_digest_article_week_year();

-- Insert sample articles for different sports
INSERT INTO digest_articles (title, subtitle, content, image_url, category, sport, author_id, is_published, published_date, reading_time_minutes)
SELECT 
  'Nutrition Strategies for Peak Performance',
  'Evidence-based approaches to fueling your training',
  E'# Nutrition for Athletes\n\nProper nutrition is fundamental to athletic performance. This comprehensive guide covers:\n\n## Pre-Training Nutrition\n- Carbohydrate loading strategies\n- Timing of meals\n- Hydration protocols\n\n## During Training\n- Energy gel timing\n- Electrolyte balance\n- Fluid intake recommendations\n\n## Post-Training Recovery\n- Protein synthesis window\n- Glycogen replenishment\n- Anti-inflammatory foods\n\n## Key Takeaways\n1. Individualize your nutrition plan\n2. Time your nutrients strategically\n3. Stay consistently hydrated\n4. Monitor and adjust based on performance',
  'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'nutrition',
  'beach_volley',
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
  true,
  CURRENT_DATE - INTERVAL '7 days',
  8
WHERE EXISTS (SELECT 1 FROM profiles WHERE role = 'admin' LIMIT 1)

UNION ALL

SELECT 
  'Mental Preparation for Competition',
  'Building mental resilience and focus',
  E'# Mental Training Techniques\n\nMental preparation is as important as physical training.\n\n## Visualization\n- Create detailed mental images of success\n- Practice daily for 10-15 minutes\n- Include all sensory details\n\n## Pre-Competition Routine\n- Develop consistent rituals\n- Control breathing\n- Positive self-talk\n\n## Managing Pressure\n- Reframe anxiety as excitement\n- Focus on process, not outcome\n- Use grounding techniques\n\n## Recovery\n- Mental rest is essential\n- Meditation practices\n- Journal your thoughts',
  'https://images.pexels.com/photos/1263349/pexels-photo-1263349.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'mental',
  'cycling',
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
  true,
  CURRENT_DATE - INTERVAL '14 days',
  6
WHERE EXISTS (SELECT 1 FROM profiles WHERE role = 'admin' LIMIT 1)

UNION ALL

SELECT 
  'Recovery Protocols for Endurance Athletes',
  'Maximize adaptation through proper recovery',
  E'# Recovery Science\n\nRecovery is when adaptation happens.\n\n## Active Recovery\n- Low-intensity movement\n- Swimming or cycling\n- 20-30 minutes optimal\n\n## Sleep Optimization\n- 8-10 hours for athletes\n- Consistent schedule\n- Cool, dark environment\n\n## Recovery Tools\n- Compression garments\n- Ice baths (evidence-based timing)\n- Massage and foam rolling\n\n## Nutrition for Recovery\n- Protein timing\n- Anti-inflammatory foods\n- Hydration strategies',
  'https://images.pexels.com/photos/3822906/pexels-photo-3822906.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'recovery',
  'running',
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
  true,
  CURRENT_DATE - INTERVAL '21 days',
  7
WHERE EXISTS (SELECT 1 FROM profiles WHERE role = 'admin' LIMIT 1);
