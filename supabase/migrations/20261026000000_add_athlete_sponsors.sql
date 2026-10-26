-- Optional sponsor logos displayed on public athlete landing pages.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sponsors jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.profiles.sponsors IS
  'Up to five public sponsor entries: {name, logo_url, website_url}';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'athlete-sponsors',
  'athlete-sponsors',
  true,
  2 * 1024 * 1024,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view athlete sponsor logos" ON storage.objects;
CREATE POLICY "Public can view athlete sponsor logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'athlete-sponsors');

DROP POLICY IF EXISTS "Athletes can upload sponsor logos" ON storage.objects;
CREATE POLICY "Athletes can upload sponsor logos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'athlete-sponsors'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  );

DROP POLICY IF EXISTS "Athletes can update sponsor logos" ON storage.objects;
CREATE POLICY "Athletes can update sponsor logos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'athlete-sponsors'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  WITH CHECK (
    bucket_id = 'athlete-sponsors'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  );

DROP POLICY IF EXISTS "Athletes can delete sponsor logos" ON storage.objects;
CREATE POLICY "Athletes can delete sponsor logos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'athlete-sponsors'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  );
