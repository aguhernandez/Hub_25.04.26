/*
  # Auto-expire memberships past their end_date

  ## Summary
  Memberships that have an `end_date` in the past were never automatically
  transitioned from `active` to `expired`. This migration:

  1. Immediately updates all `active` records whose `end_date < now()` to `expired`
  2. Creates a trigger function that runs on any INSERT/UPDATE to `membership_access`
     and sets status to `expired` if end_date has passed
  3. The frontend queries already filter by status = 'active', so once expired
     they naturally stop showing up as active memberships

  ## Tables modified
  - `membership_access`: bulk-updates stale active rows; adds trigger
*/

-- 1. Expire all active memberships whose end_date has already passed
UPDATE membership_access
SET status = 'expired',
    updated_at = now()
WHERE status = 'active'
  AND end_date IS NOT NULL
  AND end_date < now();

-- 2. Function that auto-expires on write
CREATE OR REPLACE FUNCTION expire_membership_if_past_end_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active'
     AND NEW.end_date IS NOT NULL
     AND NEW.end_date < now() THEN
    NEW.status := 'expired';
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Attach trigger to membership_access
DROP TRIGGER IF EXISTS trg_expire_membership ON membership_access;
CREATE TRIGGER trg_expire_membership
  BEFORE INSERT OR UPDATE ON membership_access
  FOR EACH ROW
  EXECUTE FUNCTION expire_membership_if_past_end_date();
