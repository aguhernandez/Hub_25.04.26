-- Returns real counts per role across ALL users (not just current page)
CREATE OR REPLACE FUNCTION admin_get_role_counts()
RETURNS TABLE(role TEXT, count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  SELECT p.role INTO v_caller_role FROM profiles p WHERE p.id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Permission denied: admin access required';
  END IF;

  RETURN QUERY
  SELECT p.role, COUNT(*)::BIGINT
  FROM profiles p
  GROUP BY p.role;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_role_counts TO authenticated;
