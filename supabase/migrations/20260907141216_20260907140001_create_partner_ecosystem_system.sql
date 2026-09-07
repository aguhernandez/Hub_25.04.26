/*
# Asciende Partner Ecosystem System

## Overview
Creates a complete partner/benefit/referral/commission system to upgrade the existing
Support/Apoyo section. This enables Asciende to connect athletes with external brands
that offer discounts, products, services, and special conditions.

Only athletes with paid memberships (level >= 2) can activate benefits.
The system is generic and reusable for any future partner (cycling, nutrition, tech, etc.).

## New Tables (9 total)

### 1. partners
- Main partner entity (brand/business/organization)
- Fields: name, slug, logo_url, description, category, website, contact info,
  internal notes, status (draft/active/paused/expired/archived), start/end dates
- Admin-managed

### 2. partner_benefits
- Individual benefits offered by a partner (discounts, services, products)
- Fields: name, description, discount_type, discount_value, eligible_products,
  terms, start/end dates, usage limits, destination_url, referral_required,
  tracking_enabled, is_active
- Linked to partner_id

### 3. partner_campaigns
- Optional promotional periods associated with a partner
- Fields: name, description, start/end dates, status, commission_type,
  commission_percentage, fixed_commission, attribution_window_days
- Linked to partner_id

### 4. partner_referrals
- Activation records when an athlete activates a benefit
- Fields: referral_code (RF-ASCIENDE-XXXXXX), athlete_id, partner_id, benefit_id,
  campaign_id, status (activated/clicked/pending/converted/confirmed/rejected/
  cancelled/refunded/paid), activation_at, expiration_at, clicked_at
- Unique referral_code, linked to athlete + partner + benefit

### 5. partner_referral_events
- Tracking events for the athlete journey (activation, click, conversion, etc.)
- Fields: referral_id, event_type, event_data (jsonb), created_at
- Append-only event log

### 6. partner_conversions
- Conversion records (purchase or agreed action reported)
- Fields: referral_id, partner_id, athlete_id, external_transaction_id,
  transaction_date, transaction_amount, eligible_amount, conversion_status,
  notes, confirmed_at, confirmed_by
- Linked to referral + partner + athlete

### 7. partner_commissions
- Commission records per conversion
- Fields: conversion_id, partner_id, commission_type, commission_percentage,
  fixed_commission, transaction_amount, eligible_amount, final_commission,
  commission_status (pending/confirmed/paid/cancelled), payment_date,
  payment_reference
- Linked to conversion + partner

### 8. partner_users
- Future partner portal access (partners as Supabase auth users)
- Fields: partner_id, user_id (auth.users), role (admin/manager/viewer),
  is_active, invited_at, last_login_at
- Prepared for future Partner Portal

### 9. partner_settings
- Global partner system settings (editable disclaimer text, etc.)
- Single-row config table
- Fields: partner_disclaimer_text (es), partner_disclaimer_text (en),
  default_attribution_window_days, is_active

## Security (RLS)

All tables have RLS enabled. Access patterns:

- **partners**: Public SELECT for active partners; admin full CRUD
- **partner_benefits**: Public SELECT for active benefits under active partners; admin full CRUD
- **partner_campaigns**: Public SELECT for active campaigns; admin full CRUD
- **partner_referrals**: Athletes SELECT/INSERT own referrals; admin full CRUD
- **partner_referral_events**: Athletes INSERT for own referrals; admin SELECT all
- **partner_conversions**: Admin full CRUD; athletes SELECT own conversions
- **partner_commissions**: Admin full CRUD only
- **partner_users**: Admin full CRUD; partner users SELECT own
- **partner_settings**: Public SELECT; admin UPDATE

Admin role is determined by: EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')

## Important Notes
1. Referral codes are generated as RF-ASCIENDE-XXXXXX (6 random alphanumeric chars)
2. The default attribution window is 30 days (configurable per campaign)
3. Commissions are calculated automatically on conversion insert via trigger
4. The partner_disclaimer_text is editable from admin and shown to athletes
5. No athlete private data (training, nutrition, health) is exposed to partners
*/

-- ============================================================
-- 1. PARTNERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  description text,
  category text NOT NULL DEFAULT 'general',
  website text,
  contact_name text,
  contact_email text,
  contact_phone text,
  internal_notes text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','expired','archived')),
  start_date date,
  end_date date,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);
CREATE INDEX IF NOT EXISTS idx_partners_slug ON partners(slug);
CREATE INDEX IF NOT EXISTS idx_partners_category ON partners(category);

DROP POLICY IF EXISTS "select_active_partners" ON partners;
CREATE POLICY "select_active_partners" ON partners FOR SELECT
  TO authenticated USING (
    status = 'active'
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "insert_partners_admin" ON partners;
CREATE POLICY "insert_partners_admin" ON partners FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "update_partners_admin" ON partners;
CREATE POLICY "update_partners_admin" ON partners FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "delete_partners_admin" ON partners;
CREATE POLICY "delete_partners_admin" ON partners FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 2. PARTNER_BENEFITS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS partner_benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  discount_type text NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage','fixed','custom','service','product')),
  discount_value text,
  eligible_products text,
  terms text,
  how_to_use text,
  start_date date,
  end_date date,
  usage_limit int,
  usage_count int NOT NULL DEFAULT 0,
  destination_url text,
  referral_required boolean NOT NULL DEFAULT true,
  tracking_enabled boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE partner_benefits ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_partner_benefits_partner ON partner_benefits(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_benefits_active ON partner_benefits(is_active);

DROP POLICY IF EXISTS "select_active_benefits" ON partner_benefits;
CREATE POLICY "select_active_benefits" ON partner_benefits FOR SELECT
  TO authenticated USING (
    (is_active = true AND EXISTS (
      SELECT 1 FROM partners WHERE partners.id = partner_benefits.partner_id AND partners.status = 'active'
    ))
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "insert_benefits_admin" ON partner_benefits;
CREATE POLICY "insert_benefits_admin" ON partner_benefits FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "update_benefits_admin" ON partner_benefits;
CREATE POLICY "update_benefits_admin" ON partner_benefits FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "delete_benefits_admin" ON partner_benefits;
CREATE POLICY "delete_benefits_admin" ON partner_benefits FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 3. PARTNER_CAMPAIGNS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS partner_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','expired','archived')),
  commission_type text NOT NULL DEFAULT 'none' CHECK (commission_type IN ('none','percentage','fixed','hybrid')),
  commission_percentage numeric(5,2) DEFAULT 0,
  fixed_commission numeric(10,2) DEFAULT 0,
  attribution_window_days int NOT NULL DEFAULT 30,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE partner_campaigns ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_partner_campaigns_partner ON partner_campaigns(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_campaigns_status ON partner_campaigns(status);

DROP POLICY IF EXISTS "select_active_campaigns" ON partner_campaigns;
CREATE POLICY "select_active_campaigns" ON partner_campaigns FOR SELECT
  TO authenticated USING (
    status = 'active'
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "insert_campaigns_admin" ON partner_campaigns;
CREATE POLICY "insert_campaigns_admin" ON partner_campaigns FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "update_campaigns_admin" ON partner_campaigns;
CREATE POLICY "update_campaigns_admin" ON partner_campaigns FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "delete_campaigns_admin" ON partner_campaigns;
CREATE POLICY "delete_campaigns_admin" ON partner_campaigns FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 4. PARTNER_REFERRALS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS partner_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code text UNIQUE NOT NULL,
  athlete_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  benefit_id uuid REFERENCES partner_benefits(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES partner_campaigns(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'activated' CHECK (status IN ('activated','clicked','pending','converted','confirmed','rejected','cancelled','refunded','paid')),
  activation_at timestamptz DEFAULT now(),
  expiration_at timestamptz,
  clicked_at timestamptz,
  converted_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE partner_referrals ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_partner_referrals_athlete ON partner_referrals(athlete_id);
CREATE INDEX IF NOT EXISTS idx_partner_referrals_partner ON partner_referrals(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_referrals_code ON partner_referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_partner_referrals_status ON partner_referrals(status);
CREATE INDEX IF NOT EXISTS idx_partner_referrals_benefit ON partner_referrals(benefit_id);

DROP POLICY IF EXISTS "select_own_referrals" ON partner_referrals;
CREATE POLICY "select_own_referrals" ON partner_referrals FOR SELECT
  TO authenticated USING (
    auth.uid() = athlete_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "insert_own_referrals" ON partner_referrals;
CREATE POLICY "insert_own_referrals" ON partner_referrals FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = athlete_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "update_own_referrals" ON partner_referrals;
CREATE POLICY "update_own_referrals" ON partner_referrals FOR UPDATE
  TO authenticated USING (
    auth.uid() = athlete_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    auth.uid() = athlete_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "delete_referrals_admin" ON partner_referrals;
CREATE POLICY "delete_referrals_admin" ON partner_referrals FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 5. PARTNER_REFERRAL_EVENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS partner_referral_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES partner_referrals(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('activation','click','conversion','confirmation','rejection','expiration','cancel','refund','note')),
  event_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE partner_referral_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_referral_events_referral ON partner_referral_events(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_events_type ON partner_referral_events(event_type);

DROP POLICY IF EXISTS "select_own_referral_events" ON partner_referral_events;
CREATE POLICY "select_own_referral_events" ON partner_referral_events FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM partner_referrals WHERE partner_referrals.id = partner_referral_events.referral_id AND partner_referrals.athlete_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "insert_own_referral_events" ON partner_referral_events;
CREATE POLICY "insert_own_referral_events" ON partner_referral_events FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM partner_referrals WHERE partner_referrals.id = partner_referral_events.referral_id AND partner_referrals.athlete_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "delete_referral_events_admin" ON partner_referral_events;
CREATE POLICY "delete_referral_events_admin" ON partner_referral_events FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 6. PARTNER_CONVERSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS partner_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES partner_referrals(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_transaction_id text,
  transaction_date timestamptz,
  transaction_amount numeric(12,2),
  eligible_amount numeric(12,2),
  conversion_status text NOT NULL DEFAULT 'pending' CHECK (conversion_status IN ('pending','confirmed','rejected','cancelled','refunded')),
  notes text,
  confirmed_at timestamptz,
  confirmed_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE partner_conversions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_partner_conversions_referral ON partner_conversions(referral_id);
CREATE INDEX IF NOT EXISTS idx_partner_conversions_partner ON partner_conversions(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_conversions_athlete ON partner_conversions(athlete_id);
CREATE INDEX IF NOT EXISTS idx_partner_conversions_status ON partner_conversions(conversion_status);

DROP POLICY IF EXISTS "select_own_conversions" ON partner_conversions;
CREATE POLICY "select_own_conversions" ON partner_conversions FOR SELECT
  TO authenticated USING (
    auth.uid() = athlete_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "insert_conversions_admin" ON partner_conversions;
CREATE POLICY "insert_conversions_admin" ON partner_conversions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "update_conversions_admin" ON partner_conversions;
CREATE POLICY "update_conversions_admin" ON partner_conversions FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "delete_conversions_admin" ON partner_conversions;
CREATE POLICY "delete_conversions_admin" ON partner_conversions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 7. PARTNER_COMMISSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS partner_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversion_id uuid NOT NULL REFERENCES partner_conversions(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  commission_type text NOT NULL DEFAULT 'none' CHECK (commission_type IN ('none','percentage','fixed','hybrid')),
  commission_percentage numeric(5,2) DEFAULT 0,
  fixed_commission numeric(10,2) DEFAULT 0,
  transaction_amount numeric(12,2) DEFAULT 0,
  eligible_amount numeric(12,2) DEFAULT 0,
  final_commission numeric(12,2) NOT NULL DEFAULT 0,
  commission_status text NOT NULL DEFAULT 'pending' CHECK (commission_status IN ('pending','confirmed','paid','cancelled')),
  payment_date date,
  payment_reference text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE partner_commissions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_partner_commissions_conversion ON partner_commissions(conversion_id);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_partner ON partner_commissions(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_status ON partner_commissions(commission_status);

DROP POLICY IF EXISTS "select_commissions_admin" ON partner_commissions;
CREATE POLICY "select_commissions_admin" ON partner_commissions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "insert_commissions_admin" ON partner_commissions;
CREATE POLICY "insert_commissions_admin" ON partner_commissions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "update_commissions_admin" ON partner_commissions;
CREATE POLICY "update_commissions_admin" ON partner_commissions FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "delete_commissions_admin" ON partner_commissions;
CREATE POLICY "delete_commissions_admin" ON partner_commissions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 8. PARTNER_USERS TABLE (future portal)
-- ============================================================
CREATE TABLE IF NOT EXISTS partner_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin','manager','viewer')),
  is_active boolean NOT NULL DEFAULT true,
  invited_at timestamptz DEFAULT now(),
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(partner_id, user_id)
);

ALTER TABLE partner_users ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_partner_users_partner ON partner_users(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_users_user ON partner_users(user_id);

DROP POLICY IF EXISTS "select_own_partner_users" ON partner_users;
CREATE POLICY "select_own_partner_users" ON partner_users FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "insert_partner_users_admin" ON partner_users;
CREATE POLICY "insert_partner_users_admin" ON partner_users FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "update_partner_users_admin" ON partner_users;
CREATE POLICY "update_partner_users_admin" ON partner_users FOR UPDATE
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "delete_partner_users_admin" ON partner_users;
CREATE POLICY "delete_partner_users_admin" ON partner_users FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 9. PARTNER_SETTINGS TABLE (global config)
-- ============================================================
CREATE TABLE IF NOT EXISTS partner_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_disclaimer_text_es text NOT NULL DEFAULT 'Los beneficios de Support son proporcionados por terceros socios independientes. Asciende actúa como plataforma que conecta atletas con marcas socias y promueve los beneficios disponibles para la comunidad Asciende. Salvo que se exprese lo contrario, Asciende no es el vendedor ni proveedor de los productos o servicios ofrecidos por los socios y no es responsable de su calidad, disponibilidad, precios, procesamiento de pagos, entrega, garantías, devoluciones, servicio al cliente u otras obligaciones derivadas de la transacción o servicio. Cualquier compra o acuerdo de servicio se celebra directamente entre el atleta y el socio correspondiente.',
  partner_disclaimer_text_en text NOT NULL DEFAULT 'Support benefits are provided by independent third-party partners. Asciende acts as a platform that connects athletes with partner brands and promotes the benefits made available to the Asciende community. Unless expressly stated otherwise, Asciende is not the seller or provider of the products or services offered by partners and is not responsible for their quality, availability, pricing, payment processing, delivery, warranties, returns, customer service or other obligations arising from the transaction or service. Any purchase or service agreement is entered into directly between the athlete and the relevant partner.',
  default_attribution_window_days int NOT NULL DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE partner_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_partner_settings" ON partner_settings;
CREATE POLICY "select_partner_settings" ON partner_settings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "update_partner_settings_admin" ON partner_settings;
CREATE POLICY "update_partner_settings_admin" ON partner_settings FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Seed default settings row
INSERT INTO partner_settings (id, is_active)
VALUES (gen_random_uuid(), true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- TRIGGER: Auto-calculate commission on conversion insert
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_partner_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign partner_campaigns%ROWTYPE;
  v_partner_id uuid;
  v_eligible numeric(12,2);
  v_final_commission numeric(12,2);
BEGIN
  -- Get partner_id from the referral
  SELECT partner_id INTO v_partner_id FROM partner_referrals WHERE id = NEW.referral_id;
  IF v_partner_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get campaign from the referral (if any)
  SELECT * INTO v_campaign FROM partner_campaigns
  WHERE id = (SELECT campaign_id FROM partner_referrals WHERE id = NEW.referral_id)
  LIMIT 1;

  -- Determine eligible amount
  v_eligible := COALESCE(NEW.eligible_amount, NEW.transaction_amount, 0);

  -- Calculate commission based on campaign type
  IF v_campaign.id IS NOT NULL THEN
    CASE v_campaign.commission_type
      WHEN 'percentage' THEN
        v_final_commission := ROUND(v_eligible * v_campaign.commission_percentage / 100, 2);
      WHEN 'fixed' THEN
        v_final_commission := v_campaign.fixed_commission;
      WHEN 'hybrid' THEN
        v_final_commission := ROUND(v_eligible * v_campaign.commission_percentage / 100, 2) + v_campaign.fixed_commission;
      ELSE
        v_final_commission := 0;
    END CASE;
  ELSE
    v_final_commission := 0;
  END IF;

  -- Insert commission record
  INSERT INTO partner_commissions (
    conversion_id, partner_id, commission_type,
    commission_percentage, fixed_commission,
    transaction_amount, eligible_amount,
    final_commission, commission_status
  ) VALUES (
    NEW.id, v_partner_id,
    COALESCE(v_campaign.commission_type, 'none'),
    COALESCE(v_campaign.commission_percentage, 0),
    COALESCE(v_campaign.fixed_commission, 0),
    COALESCE(NEW.transaction_amount, 0),
    v_eligible,
    v_final_commission,
    'pending'
  );

  -- Update referral status to converted
  UPDATE partner_referrals
  SET status = 'converted', converted_at = now(), updated_at = now()
  WHERE id = NEW.referral_id;

  -- Log event
  INSERT INTO partner_referral_events (referral_id, event_type, event_data)
  VALUES (NEW.referral_id, 'conversion', jsonb_build_object(
    'transaction_amount', NEW.transaction_amount,
    'eligible_amount', v_eligible,
    'commission', v_final_commission
  ));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_calculate_commission ON partner_conversions;
CREATE TRIGGER trigger_calculate_commission
  AFTER INSERT ON partner_conversions
  FOR EACH ROW EXECUTE FUNCTION calculate_partner_commission();

-- ============================================================
-- TRIGGER: Log referral click event and update status
-- ============================================================
CREATE OR REPLACE FUNCTION log_referral_click()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.clicked_at IS NOT NULL AND OLD.clicked_at IS NULL THEN
    INSERT INTO partner_referral_events (referral_id, event_type, event_data)
    VALUES (NEW.id, 'click', jsonb_build_object('timestamp', NEW.clicked_at));

    IF NEW.status = 'activated' THEN
      NEW.status := 'clicked';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_referral_click ON partner_referrals;
CREATE TRIGGER trigger_log_referral_click
  BEFORE UPDATE ON partner_referrals
  FOR EACH ROW EXECUTE FUNCTION log_referral_click();

-- ============================================================
-- TRIGGER: Log activation event on referral insert
-- ============================================================
CREATE OR REPLACE FUNCTION log_referral_activation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO partner_referral_events (referral_id, event_type, event_data)
  VALUES (NEW.id, 'activation', jsonb_build_object(
    'partner_id', NEW.partner_id,
    'benefit_id', NEW.benefit_id,
    'campaign_id', NEW.campaign_id
  ));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_referral_activation ON partner_referrals;
CREATE TRIGGER trigger_log_referral_activation
  AFTER INSERT ON partner_referrals
  FOR EACH ROW EXECUTE FUNCTION log_referral_activation();

-- ============================================================
-- TRIGGER: Auto-update updated_at on all partner tables
-- ============================================================
CREATE OR REPLACE FUNCTION update_partner_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['partners','partner_benefits','partner_campaigns','partner_referrals','partner_conversions','partner_commissions','partner_settings']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trigger_update_%s ON %s', t, t);
    EXECUTE format('CREATE TRIGGER trigger_update_%s BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_partner_timestamp()', t, t);
  END LOOP;
END $$;

-- ============================================================
-- FUNCTION: Generate unique referral code
-- ============================================================
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_exists boolean;
BEGIN
  LOOP
    v_code := 'RF-ASCIENDE-' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM partner_referrals WHERE referral_code = v_code) INTO v_exists;
    IF NOT v_exists THEN
      RETURN v_code;
    END IF;
  END LOOP;
END;
$$;