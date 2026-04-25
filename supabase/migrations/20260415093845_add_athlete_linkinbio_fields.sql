/*
  # Add Link-in-Bio fields to profiles

  Adds fields needed for the public athlete landing page (link-in-bio):
  - tagline: short motto/tagline displayed below name
  - cover_image_url: hero/banner image
  - social_links: JSONB with instagram, tiktok, youtube, other
  - extended payment_links: CBU, mpesa, custom_link added to existing JSONB

  No destructive changes. All new columns are nullable.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'tagline'
  ) THEN
    ALTER TABLE profiles ADD COLUMN tagline text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'cover_image_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN cover_image_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'social_links'
  ) THEN
    ALTER TABLE profiles ADD COLUMN social_links jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;
