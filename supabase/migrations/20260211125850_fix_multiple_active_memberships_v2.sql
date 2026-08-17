/*
  # Fix Multiple Active Memberships

  1. Data Cleanup
    - Cancel duplicate memberships keeping only the highest tier
    - Add constraint to prevent multiple active memberships per user

  2. Changes
    - Cancel all but the highest tier membership for users with multiple active memberships
    - Add a unique partial index to enforce one active membership per user
*/

-- First, identify and fix users with multiple active memberships
DO $$
DECLARE
  user_record RECORD;
  highest_tier_id uuid;
  tier_order jsonb := '{"pro-elite": 3, "pro": 3, "asciende": 2, "start": 1, "free": 0, "inicia": 0}'::jsonb;
  deactivated_count int := 0;
BEGIN
  -- For each user with multiple active memberships
  FOR user_record IN 
    SELECT user_id, COUNT(*) as count
    FROM membership_access
    WHERE status = 'active'
    GROUP BY user_id
    HAVING COUNT(*) > 1
  LOOP
    RAISE NOTICE 'User % has % active memberships', user_record.user_id, user_record.count;
    
    -- Find the highest tier membership for this user
    SELECT ma.id INTO highest_tier_id
    FROM membership_access ma
    JOIN memberships m ON ma.membership_id = m.id
    WHERE ma.user_id = user_record.user_id
      AND ma.status = 'active'
    ORDER BY 
      COALESCE((tier_order->lower(m.slug))::int, 0) DESC,
      ma.created_at DESC
    LIMIT 1;
    
    -- Cancel all other memberships for this user
    UPDATE membership_access
    SET 
      status = 'canceled',
      updated_at = NOW(),
      notes = COALESCE(notes, '') || ' [Auto-canceled: duplicate membership cleanup]'
    WHERE user_id = user_record.user_id
      AND status = 'active'
      AND id != highest_tier_id;
    
    GET DIAGNOSTICS deactivated_count = ROW_COUNT;
    RAISE NOTICE 'Kept membership % for user %, canceled % others', highest_tier_id, user_record.user_id, deactivated_count;
  END LOOP;
END $$;

-- Create a unique partial index to enforce only one active membership per user
DROP INDEX IF EXISTS idx_one_active_membership_per_user;
CREATE UNIQUE INDEX idx_one_active_membership_per_user 
  ON membership_access(user_id) 
  WHERE status = 'active';

COMMENT ON INDEX idx_one_active_membership_per_user IS 
  'Ensures each user can only have one active membership at a time';
