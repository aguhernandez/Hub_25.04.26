/*
  # Rename Memberships to New Naming Convention

  ## Summary
  Updates the membership names and slugs to the new official naming:
  - Free tier → "Asciende Inicia" (slug: inicia)
  - First paid tier (Asciende) → "Asciende Intermediate" (slug: intermediate)
  - Pro tier → "Asciende Pro" (slug: pro)

  ## Changes
  - Updates name, name_es, name_en for all membership tiers
  - Updates slugs to match new naming
  - Preserves all prices, features, and other settings

  ## Important Notes
  1. The useMembership hook uses slug detection - slug updates are critical
  2. Old slugs covered: 'start', 'inicia', 'free' → new slug 'inicia'
  3. Old slug 'asciende' → new slug 'intermediate'
  4. Old slugs 'pro', 'pro-elite' → new slug 'pro'
*/

DO $$
BEGIN
  -- Update free/starter tier → Asciende Inicia
  UPDATE memberships
  SET
    name = 'Asciende Inicia',
    name_es = 'Asciende Inicia',
    name_en = 'Asciende Inicia',
    slug = 'inicia',
    updated_at = now()
  WHERE slug IN ('start', 'inicia', 'free')
     OR (price_monthly = 0 AND (slug NOT IN ('intermediate', 'pro', 'pro-elite', 'asciende') OR slug IS NULL));

  -- Update Asciende (intermediate paid) tier → Asciende Intermediate
  UPDATE memberships
  SET
    name = 'Asciende Intermediate',
    name_es = 'Asciende Intermediate',
    name_en = 'Asciende Intermediate',
    slug = 'intermediate',
    updated_at = now()
  WHERE slug = 'asciende';

  -- Update Pro tier → Asciende Pro
  UPDATE memberships
  SET
    name = 'Asciende Pro',
    name_es = 'Asciende Pro',
    name_en = 'Asciende Pro',
    slug = 'pro',
    updated_at = now()
  WHERE slug IN ('pro-elite', 'pro');

END $$;
