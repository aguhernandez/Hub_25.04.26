/*
  # Assign "Asciende Inicia" to all users without active membership + signup trigger

  ## Summary
  Every user has a membership — minimum the free "Asciende Inicia" tier.
  - Bulk-inserts Inicia for all existing profiles with no active membership_access row
  - Creates a trigger on profiles so every new signup gets Inicia automatically
  - end_date = NULL means perpetual (free tier never expires)

  ## Tables modified
  - membership_access: bulk insert for existing users
  - New trigger on profiles for future signups

  ## Notes
  - source = 'manual' (only allowed values: stripe, manual, promotional)
  - The existing ensure_single_active_membership trigger will handle deactivating
    Inicia when a paid membership is later assigned
*/

-- 1. Add 'system' as allowed source OR just use 'manual' for free tier assignments
-- Using 'manual' since it's the closest valid value for admin-assigned memberships

INSERT INTO membership_access (user_id, membership_id, status, start_date, end_date, source, notes)
SELECT 
  p.id,
  (SELECT id FROM memberships WHERE slug = 'inicia' LIMIT 1),
  'active',
  p.created_at,
  NULL,
  'manual',
  'Auto-assigned Inicia free tier'
FROM profiles p
WHERE p.role IN ('athlete', 'trainer', 'admin')
AND NOT EXISTS (
  SELECT 1 FROM membership_access ma
  WHERE ma.user_id = p.id AND ma.status = 'active'
);

-- 2. Trigger function: auto-assign Inicia on new profile creation
CREATE OR REPLACE FUNCTION assign_inicia_membership_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inicia_id uuid;
BEGIN
  SELECT id INTO inicia_id FROM memberships WHERE slug = 'inicia' LIMIT 1;

  IF inicia_id IS NOT NULL THEN
    INSERT INTO membership_access (user_id, membership_id, status, start_date, end_date, source, notes)
    VALUES (NEW.id, inicia_id, 'active', now(), NULL, 'manual', 'Auto-assigned Inicia free tier on signup')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Attach trigger to profiles
DROP TRIGGER IF EXISTS trg_assign_inicia_on_signup ON profiles;
CREATE TRIGGER trg_assign_inicia_on_signup
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_inicia_membership_on_signup();
