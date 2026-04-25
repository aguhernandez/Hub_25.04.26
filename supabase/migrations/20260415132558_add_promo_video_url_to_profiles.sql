/*
  # Add promo_video_url to profiles

  ## Changes
  - Adds `promo_video_url` (text, nullable) to profiles table
  - This field stores a YouTube video URL that appears on the athlete's public landing page
  - No RLS changes needed — profiles RLS already covers this column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'promo_video_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN promo_video_url text DEFAULT NULL;
  END IF;
END $$;
