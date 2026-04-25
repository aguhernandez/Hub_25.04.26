/*
  # Diagnose RLS Issue
  
  Temporary function to diagnose why admin can't see all users
*/

-- Create a function that returns what RLS sees
CREATE OR REPLACE FUNCTION diagnose_admin_access()
RETURNS TABLE(
  user_id uuid,
  user_email text,
  user_role text,
  jwt_role text,
  auth_uid uuid,
  can_see_profile boolean
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.email as user_email,
    p.role as user_role,
    (auth.jwt() ->> 'role')::text as jwt_role,
    auth.uid() as auth_uid,
    ((auth.jwt() ->> 'role')::text = 'admin') as can_see_profile
  FROM profiles p
  ORDER BY p.created_at DESC;
END;
$$;
