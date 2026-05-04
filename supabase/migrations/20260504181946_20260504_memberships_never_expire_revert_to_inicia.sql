/*
  # Memberships never expire on their own — user always decides their level

  ## Business rule
  - A user stays at their membership level until THEY choose to change it
  - No automatic expiration based on end_date
  - Canceling a paid membership reverts to Inicia (free), never leaves user with nothing
  - end_date on membership_access is kept for informational/billing purposes only,
    it does NOT automatically expire the membership

  ## Changes
  1. Drop the expire_membership_if_past_end_date trigger (was auto-expiring)
  2. Update ensure_single_active_membership to also handle the revert-to-Inicia case
  3. Create a helper function revert_to_inicia(user_id) for use in webhooks/code
*/

-- 1. Drop the trigger that was auto-expiring memberships based on end_date
DROP TRIGGER IF EXISTS trg_expire_membership ON membership_access;
DROP FUNCTION IF EXISTS expire_membership_if_past_end_date();

-- 2. Create a helper function: reverts a user to Inicia when their paid membership ends
CREATE OR REPLACE FUNCTION revert_user_to_inicia(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inicia_id uuid;
BEGIN
  SELECT id INTO inicia_id FROM memberships WHERE slug = 'inicia' LIMIT 1;
  IF inicia_id IS NULL THEN RETURN; END IF;

  -- Expire all current active memberships
  UPDATE membership_access
  SET status = 'canceled', end_date = now(), updated_at = now()
  WHERE user_id = p_user_id AND status = 'active';

  -- Insert fresh Inicia with no end_date (perpetual free)
  INSERT INTO membership_access (user_id, membership_id, status, start_date, end_date, source, notes)
  VALUES (p_user_id, inicia_id, 'active', now(), NULL, 'manual', 'Reverted to Inicia free tier');
END;
$$;

-- 3. Fix any existing records that were incorrectly expired/canceled
--    Restore users who have no active membership back to Inicia
INSERT INTO membership_access (user_id, membership_id, status, start_date, end_date, source, notes)
SELECT 
  p.id,
  (SELECT id FROM memberships WHERE slug = 'inicia' LIMIT 1),
  'active',
  now(),
  NULL,
  'manual',
  'Restored Inicia — membership lifecycle fix'
FROM profiles p
WHERE p.role IN ('athlete', 'trainer', 'admin')
AND NOT EXISTS (
  SELECT 1 FROM membership_access ma
  WHERE ma.user_id = p.id AND ma.status = 'active'
);
