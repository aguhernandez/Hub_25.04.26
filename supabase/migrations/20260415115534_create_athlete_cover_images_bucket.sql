/*
  # Create athlete-covers storage bucket

  Creates a public storage bucket for athlete cover images on their landing pages.
  - Bucket: athlete-covers (public read)
  - RLS policies: authenticated users can upload/update/delete their own files
  - Files are named by user ID to prevent collisions
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'athlete-covers',
  'athlete-covers',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read athlete covers"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'athlete-covers');

CREATE POLICY "Authenticated users upload own cover"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'athlete-covers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated users update own cover"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'athlete-covers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated users delete own cover"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'athlete-covers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
