/*
  # Optimize Remaining RLS Policies - Part 5

  1. Purpose
    - Continue RLS optimization
    - Covers: invoice_items, food_categories, food_substitutions, food_database

  2. Security
    - Maintains exact same security logic
*/

-- ============================================
-- invoice_items
-- ============================================

DROP POLICY IF EXISTS "Users can create invoice items" ON invoice_items;
CREATE POLICY "Users can create invoice items"
  ON invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.issued_by = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete invoice items" ON invoice_items;
CREATE POLICY "Users can delete invoice items"
  ON invoice_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.issued_by = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update invoice items" ON invoice_items;
CREATE POLICY "Users can update invoice items"
  ON invoice_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.issued_by = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view invoice items" ON invoice_items;
CREATE POLICY "Users can view invoice items"
  ON invoice_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND (invoices.issued_by = (select auth.uid()) OR invoices.issued_to = (select auth.uid()))
    )
  );

-- ============================================
-- food_categories
-- ============================================

DROP POLICY IF EXISTS "Only admins can manage food categories" ON food_categories;
CREATE POLICY "Only admins can manage food categories"
  ON food_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- ============================================
-- food_substitutions
-- ============================================

DROP POLICY IF EXISTS "Athletes can create substitutions" ON food_substitutions;
CREATE POLICY "Athletes can create substitutions"
  ON food_substitutions FOR INSERT
  TO authenticated
  WITH CHECK (athlete_id = (select auth.uid()));

DROP POLICY IF EXISTS "Athletes can delete own substitutions" ON food_substitutions;
CREATE POLICY "Athletes can delete own substitutions"
  ON food_substitutions FOR DELETE
  TO authenticated
  USING (athlete_id = (select auth.uid()));

DROP POLICY IF EXISTS "Athletes can update own substitutions" ON food_substitutions;
CREATE POLICY "Athletes can update own substitutions"
  ON food_substitutions FOR UPDATE
  TO authenticated
  USING (athlete_id = (select auth.uid()))
  WITH CHECK (athlete_id = (select auth.uid()));

DROP POLICY IF EXISTS "Athletes can view own substitutions" ON food_substitutions;
CREATE POLICY "Athletes can view own substitutions"
  ON food_substitutions FOR SELECT
  TO authenticated
  USING (athlete_id = (select auth.uid()));

-- ============================================
-- food_database
-- ============================================

DROP POLICY IF EXISTS "Admins can manage food database" ON food_database;
CREATE POLICY "Admins can manage food database"
  ON food_database FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );
