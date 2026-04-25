/*
  # Optimize Remaining RLS Policies - Part 7

  1. Purpose
    - Continue RLS optimization
    - Covers: brand system (offers, sponsorship messages, brand partners, follows, resource offers, communications)

  2. Security
    - Maintains exact same security logic
*/

-- ============================================
-- brand_offers
-- ============================================

DROP POLICY IF EXISTS "Admins can manage brand offers" ON brand_offers;
CREATE POLICY "Admins can manage brand offers"
  ON brand_offers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- ============================================
-- sponsorship_messages
-- ============================================

DROP POLICY IF EXISTS "Admins can manage all sponsorship messages" ON sponsorship_messages;
CREATE POLICY "Admins can manage all sponsorship messages"
  ON sponsorship_messages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Athletes can update own message status" ON sponsorship_messages;
CREATE POLICY "Athletes can update own message status"
  ON sponsorship_messages FOR UPDATE
  TO authenticated
  USING (athlete_id = (select auth.uid()))
  WITH CHECK (athlete_id = (select auth.uid()));

DROP POLICY IF EXISTS "Athletes can view own sponsorship messages" ON sponsorship_messages;
CREATE POLICY "Athletes can view own sponsorship messages"
  ON sponsorship_messages FOR SELECT
  TO authenticated
  USING (athlete_id = (select auth.uid()));

-- ============================================
-- brand_partners
-- ============================================

DROP POLICY IF EXISTS "Admins can manage all brands" ON brand_partners;
CREATE POLICY "Admins can manage all brands"
  ON brand_partners FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Brands can update own profile" ON brand_partners;
CREATE POLICY "Brands can update own profile"
  ON brand_partners FOR UPDATE
  TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = (select auth.uid())))
  WITH CHECK (email = (SELECT email FROM auth.users WHERE id = (select auth.uid())));

DROP POLICY IF EXISTS "Brands can view own profile" ON brand_partners;
CREATE POLICY "Brands can view own profile"
  ON brand_partners FOR SELECT
  TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = (select auth.uid())));

-- ============================================
-- brand_project_follows
-- ============================================

DROP POLICY IF EXISTS "Admins can view all follows" ON brand_project_follows;
CREATE POLICY "Admins can view all follows"
  ON brand_project_follows FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Brands can manage own follows" ON brand_project_follows;
CREATE POLICY "Brands can manage own follows"
  ON brand_project_follows FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM brand_partners
      WHERE brand_partners.id = brand_project_follows.brand_id
      AND brand_partners.email = (SELECT email FROM auth.users WHERE id = (select auth.uid()))
    )
  );

-- ============================================
-- brand_resource_offers
-- ============================================

DROP POLICY IF EXISTS "Admins can manage all offers" ON brand_resource_offers;
CREATE POLICY "Admins can manage all offers"
  ON brand_resource_offers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Brands can manage own offers" ON brand_resource_offers;
CREATE POLICY "Brands can manage own offers"
  ON brand_resource_offers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM brand_partners
      WHERE brand_partners.id = brand_resource_offers.brand_id
      AND brand_partners.email = (SELECT email FROM auth.users WHERE id = (select auth.uid()))
    )
  );

-- ============================================
-- brand_communications
-- ============================================

DROP POLICY IF EXISTS "Admins can manage all communications" ON brand_communications;
CREATE POLICY "Admins can manage all communications"
  ON brand_communications FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Brands can manage own communications" ON brand_communications;
CREATE POLICY "Brands can manage own communications"
  ON brand_communications FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM brand_partners
      WHERE brand_partners.id = brand_communications.brand_id
      AND brand_partners.email = (SELECT email FROM auth.users WHERE id = (select auth.uid()))
    )
  );
