
CREATE OR REPLACE FUNCTION public.check_satellite_access(p_user_id uuid, p_satellite_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
v_satellite_id UUID;
v_user_role TEXT;
v_satellite_category TEXT;
v_has_permission BOOLEAN;
BEGIN
SELECT id, category INTO v_satellite_id, v_satellite_category
FROM satellites
WHERE name = p_satellite_name AND is_active = true;

IF v_satellite_id IS NULL THEN
RETURN false;
END IF;

SELECT role INTO v_user_role
FROM profiles
WHERE id = p_user_id;

IF v_user_role = 'admin' THEN
RETURN true;
END IF;

SELECT enabled INTO v_has_permission
FROM user_satellite_permissions
WHERE user_id = p_user_id AND satellite_id = v_satellite_id;

IF v_has_permission IS NOT NULL THEN
RETURN v_has_permission;
END IF;

CASE v_user_role
WHEN 'trainer' THEN
RETURN v_satellite_category = 'training';
WHEN 'head_coach' THEN
RETURN v_satellite_category IN ('training', 'nutrition');
WHEN 'nutritionist' THEN
RETURN v_satellite_category = 'nutrition';
WHEN 'athlete' THEN
IF p_satellite_name IN ('nutrition', 'endurance') THEN
RETURN true;
END IF;
SELECT NOT requires_special_permission INTO v_has_permission
FROM satellites WHERE id = v_satellite_id;
RETURN COALESCE(v_has_permission, false);
ELSE
RETURN false;
END CASE;
END;
$function$;
