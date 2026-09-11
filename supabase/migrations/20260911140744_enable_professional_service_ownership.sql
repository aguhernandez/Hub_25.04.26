/*
# Enable Professional Service Ownership on stripe_products

## Purpose
Restructure the existing `stripe_products` table so that professionals (trainers, nutritionists)
can create and manage their OWN services directly, without admin involvement.
The admin retains full access for platform-level management.

## Changes
1. Add `professional_id` column to `stripe_products` to track ownership by a professional profile.
2. Backfill `professional_id` from `created_by` where the creator is a trainer/nutritionist.
3. Replace the admin-only INSERT/UPDATE/DELETE RLS policies with ownership-based policies:
   - Admins retain full CRUD on all rows.
   - Professionals (trainer, nutritionist) can INSERT/UPDATE/DELETE their own rows
     (where `professional_id = auth.uid()`).
4. Add type/category restrictions at the RLS level:
   - Nutritionists can only create/manage products with category IN ('nutrition', 'race_nutrition').
   - Trainers can only create/manage products with category NOT IN ('nutrition', 'race_nutrition').
5. Keep the existing SELECT policy unchanged (all authenticated users see active products; admins see all).

## Safety
- Does NOT touch the existing Asciende Stripe integration or any Stripe data.
- Does NOT modify existing rows' data (only backfills professional_id where possible).
- Preserves all admin capabilities.
*/

-- Step 1: Add professional_id column
ALTER TABLE stripe_products
  ADD COLUMN IF NOT EXISTS professional_id uuid
  REFERENCES profiles(id) ON DELETE SET NULL;

-- Step 2: Backfill professional_id from created_by for existing rows
-- Only set professional_id where the creator is a trainer or nutritionist
UPDATE stripe_products sp
SET professional_id = sp.created_by
WHERE sp.professional_id IS NULL
  AND sp.created_by IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = sp.created_by
      AND p.role IN ('trainer', 'nutritionist')
  );

-- Step 3: Add index for professional_id lookups
CREATE INDEX IF NOT EXISTS idx_stripe_products_professional_id
  ON stripe_products(professional_id);

-- Step 4: Replace INSERT policy
-- Admins can insert any product.
-- Trainers can insert products they own (professional_id = auth.uid()) with non-nutrition categories.
-- Nutritionists can insert products they own (professional_id = auth.uid()) with nutrition categories.
DROP POLICY IF EXISTS "admins_insert_stripe_products" ON stripe_products;
DROP POLICY IF EXISTS "professionals_insert_own_stripe_products" ON stripe_products;

CREATE POLICY "admins_insert_stripe_products"
  ON stripe_products FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'admin'
  );

CREATE POLICY "trainers_insert_own_stripe_products"
  ON stripe_products FOR INSERT
  TO authenticated
  WITH CHECK (
    professional_id = auth.uid()
    AND (auth.jwt() ->> 'role') = 'trainer'
    AND COALESCE(category, '') NOT IN ('nutrition', 'race_nutrition')
  );

CREATE POLICY "nutritionists_insert_own_stripe_products"
  ON stripe_products FOR INSERT
  TO authenticated
  WITH CHECK (
    professional_id = auth.uid()
    AND (auth.jwt() ->> 'role') = 'nutritionist'
    AND COALESCE(category, '') IN ('nutrition', 'race_nutrition')
  );

-- Step 5: Replace UPDATE policy
DROP POLICY IF EXISTS "admins_update_stripe_products" ON stripe_products;
DROP POLICY IF EXISTS "professionals_update_own_stripe_products" ON stripe_products;

CREATE POLICY "admins_update_stripe_products"
  ON stripe_products FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'admin'
  );

CREATE POLICY "trainers_update_own_stripe_products"
  ON stripe_products FOR UPDATE
  TO authenticated
  USING (
    professional_id = auth.uid()
    AND (auth.jwt() ->> 'role') = 'trainer'
  )
  WITH CHECK (
    professional_id = auth.uid()
    AND (auth.jwt() ->> 'role') = 'trainer'
    AND COALESCE(category, '') NOT IN ('nutrition', 'race_nutrition')
  );

CREATE POLICY "nutritionists_update_own_stripe_products"
  ON stripe_products FOR UPDATE
  TO authenticated
  USING (
    professional_id = auth.uid()
    AND (auth.jwt() ->> 'role') = 'nutritionist'
  )
  WITH CHECK (
    professional_id = auth.uid()
    AND (auth.jwt() ->> 'role') = 'nutritionist'
    AND COALESCE(category, '') IN ('nutrition', 'race_nutrition')
  );

-- Step 6: Replace DELETE policy
DROP POLICY IF EXISTS "admins_delete_stripe_products" ON stripe_products;
DROP POLICY IF EXISTS "professionals_delete_own_stripe_products" ON stripe_products;

CREATE POLICY "admins_delete_stripe_products"
  ON stripe_products FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'admin'
  );

CREATE POLICY "trainers_delete_own_stripe_products"
  ON stripe_products FOR DELETE
  TO authenticated
  USING (
    professional_id = auth.uid()
    AND (auth.jwt() ->> 'role') = 'trainer'
  );

CREATE POLICY "nutritionists_delete_own_stripe_products"
  ON stripe_products FOR DELETE
  TO authenticated
  USING (
    professional_id = auth.uid()
    AND (auth.jwt() ->> 'role') = 'nutritionist'
  );
