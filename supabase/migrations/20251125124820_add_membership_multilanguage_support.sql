/*
  # Add Multilanguage Support to Memberships
  
  1. Changes
    - Add name_es, name_en columns for bilingual names
    - Add description_es, description_en for bilingual descriptions
    - Add long_description_es, long_description_en for detailed descriptions
    - Add features_es, features_en for bilingual features
    - Add display_order for custom sorting
    - Add color field for brand colors
    - Add cta_text_es, cta_text_en for call-to-action buttons
    
  2. Notes
    - Existing data will be preserved
    - New columns are nullable to allow gradual migration
*/

-- Add multilanguage columns
DO $$ 
BEGIN
  -- Name columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memberships' AND column_name = 'name_es'
  ) THEN
    ALTER TABLE memberships ADD COLUMN name_es text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memberships' AND column_name = 'name_en'
  ) THEN
    ALTER TABLE memberships ADD COLUMN name_en text;
  END IF;

  -- Description columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memberships' AND column_name = 'description_es'
  ) THEN
    ALTER TABLE memberships ADD COLUMN description_es text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memberships' AND column_name = 'description_en'
  ) THEN
    ALTER TABLE memberships ADD COLUMN description_en text;
  END IF;

  -- Long description columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memberships' AND column_name = 'long_description_es'
  ) THEN
    ALTER TABLE memberships ADD COLUMN long_description_es text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memberships' AND column_name = 'long_description_en'
  ) THEN
    ALTER TABLE memberships ADD COLUMN long_description_en text;
  END IF;

  -- Features columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memberships' AND column_name = 'features_es'
  ) THEN
    ALTER TABLE memberships ADD COLUMN features_es jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memberships' AND column_name = 'features_en'
  ) THEN
    ALTER TABLE memberships ADD COLUMN features_en jsonb;
  END IF;

  -- Display order
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memberships' AND column_name = 'display_order'
  ) THEN
    ALTER TABLE memberships ADD COLUMN display_order integer DEFAULT 0;
  END IF;

  -- Color for branding
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memberships' AND column_name = 'color'
  ) THEN
    ALTER TABLE memberships ADD COLUMN color text;
  END IF;

  -- Call to action text
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memberships' AND column_name = 'cta_text_es'
  ) THEN
    ALTER TABLE memberships ADD COLUMN cta_text_es text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memberships' AND column_name = 'cta_text_en'
  ) THEN
    ALTER TABLE memberships ADD COLUMN cta_text_en text;
  END IF;

  -- Highlight flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memberships' AND column_name = 'is_highlighted'
  ) THEN
    ALTER TABLE memberships ADD COLUMN is_highlighted boolean DEFAULT false;
  END IF;
END $$;

-- Create index on display_order
CREATE INDEX IF NOT EXISTS idx_memberships_display_order ON memberships(display_order);
