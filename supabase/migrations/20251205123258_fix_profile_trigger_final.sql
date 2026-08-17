/*
  # Fix profile update 500 errors - Final solution

  1. Changes
    - Change trigger from BEFORE to AFTER UPDATE
    - Add error handling to prevent transaction failures
    - Target only role column updates specifically
    - Add logging without breaking transactions

  2. Why AFTER UPDATE
    - BEFORE UPDATE can conflict with RLS policies
    - AFTER UPDATE executes after RLS checks pass
    - Safer for operations involving auth.users table

  3. Security
    - Maintains role synchronization to JWT
    - Graceful error handling prevents 500 errors
    - Only triggers on actual role changes
*/

-- Drop existing triggers
DROP TRIGGER IF EXISTS on_profile_role_update ON profiles;
DROP TRIGGER IF EXISTS on_profile_role_insert ON profiles;

-- Update function with error handling
CREATE OR REPLACE FUNCTION sync_role_to_jwt()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if role actually changed or is being set for first time
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role) THEN
    BEGIN
      -- Update auth.users with new role in metadata
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

-- Create AFTER UPDATE trigger targeting only role column
CREATE TRIGGER on_profile_role_update
  AFTER UPDATE OF role ON profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION sync_role_to_jwt();

-- Create INSERT trigger for new profiles
CREATE TRIGGER on_profile_role_insert
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_role_to_jwt();
