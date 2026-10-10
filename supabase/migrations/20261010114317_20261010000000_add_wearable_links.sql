/*
# Create wearable_links table for Open Wearables integration

1. New Tables
- `wearable_links`
  - `asciende_user_id` (uuid, primary key, references profiles(id) ON DELETE CASCADE)
  - `ow_user_id` (uuid, not null, unique) — the Open Wearables user UUID
  - `consent_at` (timestamptz, nullable) — when the user gave consent
  - `consent_version` (text, nullable) — version of the consent terms accepted
  - `created_at` (timestamptz, not null, default now())

2. Security
- RLS enabled on `wearable_links`.
- SELECT policy: users can read only their own wearable link.
- Admin policy (FOR ALL): admins can manage all wearable links (link, unlink, view).
- Grants: SELECT to authenticated; INSERT, UPDATE, DELETE to authenticated.

3. Important Notes
- `ow_user_id` stores the UUID returned by Open Wearables, not external_user_id.
- The table is idempotent: uses IF NOT EXISTS for table creation and DROP IF EXISTS for policies.
- The admin policy checks role = 'admin' in profiles, which is server-enforced via the Edge Function.
*/

CREATE TABLE IF NOT EXISTS public.wearable_links (
  asciende_user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  ow_user_id uuid NOT NULL UNIQUE,
  consent_at timestamptz,
  consent_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wearable_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own wearable link" ON public.wearable_links;
CREATE POLICY "Users read own wearable link"
  ON public.wearable_links FOR SELECT TO authenticated
  USING (asciende_user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage wearable links" ON public.wearable_links;
CREATE POLICY "Admins manage wearable links"
  ON public.wearable_links FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

GRANT SELECT ON public.wearable_links TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.wearable_links TO authenticated;
