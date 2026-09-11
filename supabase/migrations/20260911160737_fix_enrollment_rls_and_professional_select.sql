/*
# Fix enrollment RLS to support athlete_trainers junction + add professional SELECT on stripe_products

## Changes
1. Replace the `athletes_insert_own_enrollments` INSERT policy on `service_enrollments`
   to also check the `athlete_trainers` junction table, not just `assigned_trainer_id`/
   `assigned_nutritionist_id` on `profiles`. The multi-trainer system uses `athlete_trainers`
   as the primary assignment mechanism, so athletes assigned via that table were blocked
   from enrolling in their professional's services.

2. Add a SELECT policy on `stripe_products` so professionals can see their own services
   (professional_id = auth.uid()). Previously only admins and "anyone can view active"
   policies existed — professionals had no way to see their own inactive or draft services.

3. Remove the old `admins_insert_stripe_products` / `admins_update_stripe_products` /
   `admins_delete_stripe_products` policies that used `auth.jwt() ->> 'role'` — these
   are superseded by the `Admins create/update/delete products` policies that already
   use `profiles.role`. This avoids duplicate conflicting policies.
*/

-- 1. Fix enrollment INSERT policy to also check athlete_trainers junction
DROP POLICY IF EXISTS "athletes_insert_own_enrollments" ON service_enrollments;

CREATE POLICY "athletes_insert_own_enrollments"
ON service_enrollments FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = athlete_id
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'athlete'
      AND (
        p.assigned_trainer_id = service_enrollments.professional_id
        OR p.assigned_nutritionist_id = service_enrollments.professional_id
        OR EXISTS (
          SELECT 1 FROM athlete_trainers at
          WHERE at.athlete_id = auth.uid()
            AND at.trainer_id = service_enrollments.professional_id
        )
      )
  )
);

-- 2. Add SELECT policy for professionals to see their own services
DROP POLICY IF EXISTS "professionals_view_own_stripe_products" ON stripe_products;

CREATE POLICY "professionals_view_own_stripe_products"
ON stripe_products FOR SELECT
TO authenticated
USING (
  professional_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('trainer','nutritionist','head_coach')
  )
);

-- 3. Remove old duplicate admin policies that use auth.jwt()->>'role'
DROP POLICY IF EXISTS "admins_insert_stripe_products" ON stripe_products;
DROP POLICY IF EXISTS "admins_update_stripe_products" ON stripe_products;
DROP POLICY IF EXISTS "admins_delete_stripe_products" ON stripe_products;
