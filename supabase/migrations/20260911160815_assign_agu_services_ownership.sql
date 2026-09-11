/*
# Assign existing Agu services to his professional_id

Agu (agu@asciende.pro, id 88d0135a-0022-4ebd-b7b6-1132535da06b) had 4 coaching
services created earlier via the admin panel. These services have professional_id = NULL,
which means Agu could not see or manage them from his Professional Services page.
This migration sets professional_id to Agu's id for all 4 services, and also sets
created_by where it was NULL (Race Nutrition Plan and Nutrition Plan).

This is safe because:
- The services were already owned by Agu conceptually (trainer_email = agu@asciende.pro)
- No other professional claims these services
- The RLS policies now check professional_id = auth.uid(), so this assignment is required
*/

UPDATE public.stripe_products
SET professional_id = '88d0135a-0022-4ebd-b7b6-1132535da06b',
    created_by = COALESCE(created_by, '88d0135a-0022-4ebd-b7b6-1132535da06b')
WHERE lower(trainer_email) = lower('agu@asciende.pro')
  AND professional_id IS NULL;
