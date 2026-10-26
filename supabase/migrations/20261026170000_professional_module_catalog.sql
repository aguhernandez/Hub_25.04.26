-- Phase B: professional module catalog and effective entitlements.
-- The migration is intentionally not applied automatically.

CREATE TABLE IF NOT EXISTS public.module_catalog (
  module_key text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('module', 'pack')),
  grants_roles text[] NOT NULL DEFAULT '{}',
  accessible_from_roles text[] NOT NULL DEFAULT '{}',
  requires_modules text[] NOT NULL DEFAULT '{}',
  includes_modules text[] NOT NULL DEFAULT '{}',
  stripe_price_id_monthly text,
  stripe_price_id_annual text,
  trial_days integer NOT NULL DEFAULT 0 CHECK (trial_days >= 0),
  available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.module_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS module_catalog_public_read ON public.module_catalog;
CREATE POLICY module_catalog_public_read ON public.module_catalog FOR SELECT TO anon, authenticated USING (available = true OR public.is_profile_admin());

INSERT INTO public.module_catalog(module_key, kind, grants_roles, accessible_from_roles, requires_modules, includes_modules, stripe_price_id_monthly, stripe_price_id_annual, trial_days, sort_order)
VALUES
 ('endurance_planner','module',ARRAY['trainer'],ARRAY['trainer'],ARRAY[]::text[],ARRAY[]::text[],'price_1UUmdeErPHHgrU6UiQl0D6iO','price_1UUmdgErPHHgrU6UWLMg7Y3W',14,10),
 ('nutrition_planner','module',ARRAY['nutritionist'],ARRAY['nutritionist'],ARRAY[]::text[],ARRAY[]::text[],'price_1UUmdiErPHHgrU6U22gY7PmD','price_1UUmdkErPHHgrU6UpAcDBuTK',0,20),
 ('lab','module',ARRAY['trainer'],ARRAY['trainer'],ARRAY[]::text[],ARRAY[]::text[],'price_1UUmdmErPHHgrU6UQH6bXSOI','price_1UUmdoErPHHgrU6UUWPvXNOy',0,30),
 ('performance','module',ARRAY['trainer'],ARRAY['trainer'],ARRAY['endurance_planner'],ARRAY[]::text[],'price_1UUmdpErPHHgrU6UMQz9iMGO','price_1UUmdrErPHHgrU6UnstTT9V7',0,40),
 ('biomechanics','module',ARRAY['biomechanist'],ARRAY['biomechanist','trainer'],ARRAY[]::text[],ARRAY[]::text[],'price_1UUmdsErPHHgrU6UdtpJo9eO','price_1UUmduErPHHgrU6Ucj3DgxmY',0,50),
 ('all_access','module',ARRAY['trainer','nutritionist','biomechanist','head_coach'],ARRAY['trainer','nutritionist','biomechanist','head_coach'],ARRAY[]::text[],ARRAY['endurance_planner','nutrition_planner','lab','performance','biomechanics'], 'price_1UUmdvErPHHgrU6UueX7imFn','price_1UUmdxErPHHgrU6Ua2kSENNh',0,60),
 ('extra_athletes','pack',ARRAY[]::text[],ARRAY['trainer','nutritionist','biomechanist','head_coach'],ARRAY[]::text[],ARRAY[]::text[],'price_1UUmdyErPHHgrU6UbneqN8cp','price_1UUme0ErPHHgrU6UehXKrHRL',0,70)
ON CONFLICT (module_key) DO UPDATE SET
  kind = EXCLUDED.kind, grants_roles = EXCLUDED.grants_roles, accessible_from_roles = EXCLUDED.accessible_from_roles,
  requires_modules = EXCLUDED.requires_modules, includes_modules = EXCLUDED.includes_modules,
  stripe_price_id_monthly = EXCLUDED.stripe_price_id_monthly, stripe_price_id_annual = EXCLUDED.stripe_price_id_annual,
  trial_days = EXCLUDED.trial_days, available = EXCLUDED.available, sort_order = EXCLUDED.sort_order, updated_at = now();

CREATE TABLE IF NOT EXISTS public.professional_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  module_key text NOT NULL REFERENCES public.module_catalog(module_key),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status text NOT NULL CHECK (status IN ('trialing','active','past_due','canceled','expired')),
  source text NOT NULL CHECK (source IN ('stripe','admin_comp')),
  stripe_subscription_id text,
  current_period_end timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_key, source)
);

CREATE INDEX IF NOT EXISTS idx_professional_entitlements_user ON public.professional_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_professional_entitlements_module_status ON public.professional_entitlements(module_key, status);
ALTER TABLE public.professional_entitlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS professional_entitlements_self_read ON public.professional_entitlements;
CREATE POLICY professional_entitlements_self_read ON public.professional_entitlements FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_profile_admin());

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS platform_settings_public_read ON public.platform_settings;
CREATE POLICY platform_settings_public_read ON public.platform_settings FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.platform_settings(key, value) VALUES
 ('max_athletes_base','50'::jsonb), ('athletes_per_pack','15'::jsonb), ('max_extra_packs','10'::jsonb),
 ('grace_days','7'::jsonb), ('link_pause_days','30'::jsonb),
 ('professional_checkout_enabled','false'::jsonb), ('auto_promote_professionals','false'::jsonb), ('auto_demote_professionals','false'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.has_module(p_user_id uuid, p_module_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.professional_entitlements e
    WHERE e.user_id = p_user_id AND e.module_key = p_module_key
      AND (e.source = 'admin_comp' OR e.status IN ('trialing','active')
        OR (e.status = 'past_due' AND e.updated_at + make_interval(days => COALESCE((SELECT (value #>> '{}')::int FROM public.platform_settings WHERE key = 'grace_days'), 7)) > now())
        OR (e.status = 'canceled' AND e.current_period_end > now()))
  );
$$;

CREATE OR REPLACE FUNCTION public.athlete_limit(p_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT COALESCE((SELECT (value #>> '{}')::int FROM public.platform_settings WHERE key = 'max_athletes_base'), 50)
    + COALESCE((SELECT (value #>> '{}')::int FROM public.platform_settings WHERE key = 'athletes_per_pack'), 15)
      * COALESCE((SELECT quantity FROM public.professional_entitlements WHERE user_id = p_user_id AND module_key = 'extra_athletes' AND source = 'stripe' AND public.has_module(p_user_id, 'extra_athletes')), 0);
$$;

CREATE OR REPLACE FUNCTION public.effective_roles(p_user_id uuid)
RETURNS TABLE(role text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT DISTINCT unnest(mc.grants_roles) FROM public.module_catalog mc
  WHERE mc.available AND public.has_module(p_user_id, mc.module_key)
  UNION SELECT pr.role FROM public.professional_roles pr WHERE pr.user_id = p_user_id AND pr.source = 'admin';
$$;

REVOKE ALL ON FUNCTION public.has_module(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.effective_roles(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.athlete_limit(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_module(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.effective_roles(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.athlete_limit(uuid) TO authenticated;

-- Rollback (manual):
-- DROP FUNCTION IF EXISTS public.athlete_limit(uuid);
-- DROP FUNCTION IF EXISTS public.effective_roles(uuid);
-- DROP FUNCTION IF EXISTS public.has_module(uuid,text);
-- DROP TABLE IF EXISTS public.professional_entitlements;
-- DROP TABLE IF EXISTS public.module_catalog;
-- DROP TABLE IF EXISTS public.platform_settings;
