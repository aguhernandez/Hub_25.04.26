/*
# Fix professional roles and add accepting-clients flag

## Changes
1. Expand `profiles.role` CHECK constraint to include 'nutritionist' and 'head_coach'.
   The original schema only allowed ('admin','trainer','athlete'), which made
   nutritionist code paths dead — no profile could ever have role='nutritionist'.
2. Add `is_accepting_clients` boolean column to `profiles`, default false.
   This is a professional-specific availability flag distinct from `is_active`
   (which is the generic account-active flag). Only professionals who set this
   to true should appear in the athlete's "Select professional" dropdown.
3. Set is_accepting_clients = true for all existing trainers/nutritionists so
   the current behavior is preserved (they were all visible before).
4. Rewrite stripe_products RLS policies that used auth.jwt()->>'role' to instead
   use EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ...).
   The JWT role claim can lag behind profiles.role changes or be absent entirely,
   causing silent INSERT/UPDATE/DELETE failures for trainers and nutritionists.
*/

-- 1. Expand role CHECK constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_role_check'
      AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
  END IF;
END $$;

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin','trainer','nutritionist','head_coach','athlete'));

-- 2. Add is_accepting_clients column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_accepting_clients'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_accepting_clients boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- 3. Set is_accepting_clients = true for existing professionals
UPDATE profiles SET is_accepting_clients = true
  WHERE role IN ('trainer','nutritionist','head_coach') AND is_active = true;

-- 4. Rewrite stripe_products ownership policies to use profiles table instead of JWT
DROP POLICY IF EXISTS "trainers_insert_own_stripe_products" ON stripe_products;
DROP POLICY IF EXISTS "nutritionists_insert_own_stripe_products" ON stripe_products;
DROP POLICY IF EXISTS "trainers_update_own_stripe_products" ON stripe_products;
DROP POLICY IF EXISTS "nutritionists_update_own_stripe_products" ON stripe_products;
DROP POLICY IF EXISTS "trainers_delete_own_stripe_products" ON stripe_products;
DROP POLICY IF EXISTS "nutritionists_delete_own_stripe_products" ON stripe_products;

-- Unified insert: trainer or nutritionist can insert rows they own
CREATE POLICY "professionals_insert_own_stripe_products"
ON stripe_products FOR INSERT
TO authenticated
WITH CHECK (
  professional_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('trainer','nutritionist','head_coach')
  )
);

-- Unified update: professionals can update their own rows
CREATE POLICY "professionals_update_own_stripe_products"
ON stripe_products FOR UPDATE
TO authenticated
USING (professional_id = auth.uid())
WITH CHECK (
  professional_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('trainer','nutritionist','head_coach')
  )
);

-- Unified delete: professionals can delete their own rows
CREATE POLICY "professionals_delete_own_stripe_products"
ON stripe_products FOR DELETE
TO authenticated
USING (
  professional_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('trainer','nutritionist','head_coach')
  )
);
