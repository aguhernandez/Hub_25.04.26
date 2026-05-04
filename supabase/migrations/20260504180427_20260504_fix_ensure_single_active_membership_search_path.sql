/*
  # Fix ensure_single_active_membership trigger search_path

  The function was created without SET search_path = public, causing
  "relation does not exist" errors when fired from certain contexts.
  This recreates it with the correct search_path.
*/

CREATE OR REPLACE FUNCTION ensure_single_active_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE membership_access
    SET 
      status = 'expired',
      end_date = CASE 
        WHEN end_date IS NULL OR end_date > NOW() 
        THEN NOW() 
        ELSE end_date 
      END,
      updated_at = NOW()
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$;
