-- Admin user management: SECURITY DEFINER functions to bypass RLS
-- so admins can fetch ALL users regardless of JWT role path issues

-- Fetch paginated users with last_sign_in_at from auth.users
CREATE OR REPLACE FUNCTION admin_get_users(
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 20,
  p_search TEXT DEFAULT NULL,
  p_role_filter TEXT DEFAULT NULL,
  p_status_filter TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  sport TEXT,
  country TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can call this
  IF (SELECT role FROM profiles WHERE id = auth.uid()) != 'admin' THEN
    RAISE EXCEPTION 'Permission denied: admin access required';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.is_active,
    p.created_at,
    p.updated_at,
    au.last_sign_in_at,
    p.sport,
    p.country,
    p.avatar_url
  FROM profiles p
  LEFT JOIN auth.users au ON au.id = p.id
  WHERE
    (p_search IS NULL OR p_search = '' OR
     p.email ILIKE '%' || p_search || '%' OR
     p.full_name ILIKE '%' || p_search || '%')
    AND (p_role_filter IS NULL OR p_role_filter = 'all' OR p.role = p_role_filter)
    AND (
      p_status_filter IS NULL OR p_status_filter = 'all' OR
      (p_status_filter = 'active' AND COALESCE(p.is_active, true) = true) OR
      (p_status_filter = 'inactive' AND COALESCE(p.is_active, true) = false)
    )
  ORDER BY p.created_at DESC
  LIMIT p_page_size
  OFFSET (p_page - 1) * p_page_size;
END;
$$;

-- Get total user count for pagination
CREATE OR REPLACE FUNCTION admin_get_user_count(
  p_search TEXT DEFAULT NULL,
  p_role_filter TEXT DEFAULT NULL,
  p_status_filter TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can call this
  IF (SELECT role FROM profiles WHERE id = auth.uid()) != 'admin' THEN
    RAISE EXCEPTION 'Permission denied: admin access required';
  END IF;

  RETURN (
    SELECT COUNT(*)
    FROM profiles p
    WHERE
      (p_search IS NULL OR p_search = '' OR
       p.email ILIKE '%' || p_search || '%' OR
       p.full_name ILIKE '%' || p_search || '%')
      AND (p_role_filter IS NULL OR p_role_filter = 'all' OR p.role = p_role_filter)
      AND (
        p_status_filter IS NULL OR p_status_filter = 'all' OR
        (p_status_filter = 'active' AND COALESCE(p.is_active, true) = true) OR
        (p_status_filter = 'inactive' AND COALESCE(p.is_active, true) = false)
      )
  );
END;
$$;

-- Admin delete user (deletes from auth.users which cascades to profiles)
CREATE OR REPLACE FUNCTION admin_delete_user(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT role FROM profiles WHERE id = auth.uid()) != 'admin' THEN
    RAISE EXCEPTION 'Permission denied: admin access required';
  END IF;
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

-- Admin toggle user active status
CREATE OR REPLACE FUNCTION admin_set_user_status(
  p_user_id UUID,
  p_is_active BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT role FROM profiles WHERE id = auth.uid()) != 'admin' THEN
    RAISE EXCEPTION 'Permission denied: admin access required';
  END IF;
  UPDATE profiles SET is_active = p_is_active, updated_at = now() WHERE id = p_user_id;
END;
$$;

-- Grant execute to authenticated
GRANT EXECUTE ON FUNCTION admin_get_users TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_user_count TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_user TO authenticated;
GRANT EXECUTE ON FUNCTION admin_set_user_status TO authenticated;