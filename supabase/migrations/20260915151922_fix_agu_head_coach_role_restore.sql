
-- Restore agu@asciende.pro to head_coach (was reverted to nutritionist)
-- 42 athletes are assigned to this user as assigned_trainer_id,
-- but with role=nutritionist the RLS policy blocks seeing them
-- (nutritionists can only see athletes where assigned_nutritionist_id = them)

UPDATE public.profiles
SET role = 'head_coach', updated_at = now()
WHERE id = '88d0135a-0022-4ebd-b7b6-1132535da06b';

-- Sync the JWT claim so RLS policies using auth.jwt()->>'role' also see head_coach
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"head_coach"'
)
WHERE id = '88d0135a-0022-4ebd-b7b6-1132535da06b';

-- Notify Supabase Auth to invalidate existing JWTs so the next login picks up the new role
-- (This is done via the auth schema, not via triggers)
SELECT true;
