-- The trigger prevent_non_admin_role_change checks auth.jwt()->>'role' = 'admin'
-- But SECURITY DEFINER functions still see the caller's JWT, so if the admin's
-- JWT doesn't have role='admin' (stale JWT), the trigger blocks the UPDATE
-- even from admin_set_profile_role which already verified admin status.
-- Fix: use ALTER TABLE DISABLE TRIGGER inside the function, or better,
-- rewrite the function to use SET LOCAL role to bypass RLS+trigger,
-- or simplest: disable the trigger temporarily within the function.

-- The cleanest fix: rewrite admin_set_profile_role to disable the trigger
-- during the update, since the function already verifies the caller is admin.

CREATE OR REPLACE FUNCTION public.admin_set_profile_role(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify caller is admin (using profiles table, not JWT, to avoid stale JWT issues)
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_role NOT IN ('admin', 'trainer', 'athlete', 'nutritionist', 'head_coach') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  -- Temporarily disable the trigger that blocks role changes, since we already
  -- verified admin status above. The trigger checks auth.jwt()->>'role' which
  -- may be stale for admins whose JWT hasn't been refreshed.
  ALTER TABLE public.profiles DISABLE TRIGGER prevent_non_admin_role_change;

  UPDATE public.profiles SET role = p_role, updated_at = now() WHERE id = p_user_id;

  -- Re-enable the trigger
  ALTER TABLE public.profiles ENABLE TRIGGER prevent_non_admin_role_change;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_profile_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_profile_role(uuid, text) TO authenticated;
