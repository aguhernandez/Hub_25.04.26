/*
  # Create bucket for email images

  1. New Storage Bucket
    - `email-images` bucket for storing images used in admin emails
    - Public bucket for easy access in emails
    
  2. Security
    - Only admins can upload images
    - Anyone can read images (for email viewing)
*/

-- Create the email-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('email-images', 'email-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can upload email images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete email images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view email images" ON storage.objects;

-- Allow admins to upload images
CREATE POLICY "Admins can upload email images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'email-images' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow admins to delete images
CREATE POLICY "Admins can delete email images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'email-images' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Anyone can view email images (needed for email recipients)
CREATE POLICY "Anyone can view email images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'email-images');
