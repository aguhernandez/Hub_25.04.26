/*
  # Fix profile update trigger causing 500 errors

  ## Problem
  The sync_role_to_jwt trigger is firing on ALL profile updates even with WHEN clause,
  causing 500 errors when updating profile_public, support_mode_enabled, etc.

  ## Solution
  1. Ensure trigger only fires on role column changes
  2. Change to AFTER UPDATE to avoid conflicts
  3. Add error handling in function

  ## Security
  - Maintains role synchronization to JWT
  - No changes to RLS policies
*/

-- Drop existing triggers
DROP TRIGGER IF EXISTS on_profile_role_update ON profiles;
DROP TRIGGER IF EXISTS on_profile_role_insert ON profiles;

-- Recreate function with error handling
CREATE OR REPLACE FUNCTION sync_role_to_jwt()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if role actually changed or is being set for first time
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role) THEN
    BEGIN
      -- Update the auth.users table to include role in raw_app_meta_data
      UPDATE auth.users
      SET raw_app_meta_data = 
        COALESCE(raw_app_meta_data, '{}'::jsonb) || 
        jsonb_build_object('role', NEW.role)
      WHERE id = NEW.id;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but don't fail the transaction
        RAISE WARNING 'Failed to sync role to JWT for user %: %', NEW.id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate INSERT trigger (AFTER to avoid conflicts)
CREATE TRIGGER on_profile_role_insert
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_role_to_jwt();

-- Recreate UPDATE trigger (AFTER and only on role column changes)
CREATE TRIGGER on_profile_role_update
  AFTER UPDATE OF role ON profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION sync_role_to_jwt();
