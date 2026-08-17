/*
  # Fix sync_role_to_jwt trigger to only fire on role changes
  
  1. Changes
    - Modify trigger to only execute when role column actually changes
    - This prevents 500 errors when updating other profile fields like theme
    
  2. Security
    - Maintains existing functionality for role synchronization
    - Reduces unnecessary auth.users updates
*/

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_profile_role_update ON profiles;

-- Recreate trigger with condition to only fire on role changes
CREATE TRIGGER on_profile_role_update
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION sync_role_to_jwt();
