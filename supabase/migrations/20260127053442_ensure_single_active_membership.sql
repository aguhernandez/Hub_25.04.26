/*
  # Ensure Single Active Membership Per User
  
  ## Description
  This migration creates a trigger that automatically deactivates all other active memberships 
  for a user when a new membership is activated or inserted as active.
  
  ## Changes
  1. Create function to deactivate other active memberships
  2. Create trigger that runs BEFORE INSERT OR UPDATE on membership_access
  3. When a membership is set to 'active', all other active memberships for that user are set to 'expired'
  
  ## Benefits
  - Ensures data consistency: only one active membership per user at any time
  - Prevents confusion in admin, coach, and athlete views
  - Automatic cleanup when membership changes occur
*/

-- Function to ensure only one active membership per user
CREATE OR REPLACE FUNCTION ensure_single_active_membership()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if the new/updated record is being set to active
  IF NEW.status = 'active' THEN
    -- Deactivate all other active memberships for this user
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
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_ensure_single_active_membership ON membership_access;

-- Create trigger that runs before insert or update
CREATE TRIGGER trigger_ensure_single_active_membership
  BEFORE INSERT OR UPDATE OF status ON membership_access
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_active_membership();
