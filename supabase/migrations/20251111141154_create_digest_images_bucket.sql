/*
  # Create Digest Images Storage Bucket

  1. New Storage Bucket
    - `digest-images` bucket for article cover images
    - Public access for reading
    - Restricted upload to authenticated users (trainers/admins)

  2. Security
    - RLS policies for secure uploads
    - Only trainers and admins can upload
    - Anyone can view public images
    - File size limit enforced
    - Allowed file types: image/jpeg, image/png, image/webp

  3. Storage Policies
    - Allow authenticated uploads for trainers/admins
    - Allow public reads for all images
    - Allow delete for uploaders and admins
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'digest-images',
  'digest-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow authenticated trainers to upload digest images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'digest-images' AND
  (auth.jwt() ->> 'role' = 'trainer' OR auth.jwt() ->> 'role' = 'admin')
);

CREATE POLICY "Allow public read access to digest images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'digest-images');

CREATE POLICY "Allow owners and admins to delete digest images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'digest-images' AND
  (
    auth.uid() = owner OR
    (auth.jwt() ->> 'role' = 'admin')
  )
);

CREATE POLICY "Allow owners and admins to update digest images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'digest-images' AND
  (
    auth.uid() = owner OR
    (auth.jwt() ->> 'role' = 'admin')
  )
);
