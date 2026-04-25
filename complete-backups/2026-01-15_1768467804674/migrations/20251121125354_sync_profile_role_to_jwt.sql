/*
  # Sync Profile Role to JWT
  
  1. Problem
    - Policies check auth.jwt()->>'role' but role is only in profiles table
    - JWT doesn't automatically include profile.role
    - Admin and trainer cannot create teams/programs because JWT has no role
  
  2. Solution
    - Copy role from profiles to auth.users.raw_app_meta_data
    - Create trigger to keep them in sync
    - Update all existing users
*/

-- Function to sync role to JWT
CREATE OR REPLACE FUNCTION sync_role_to_jwt()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the auth.users table to include role in raw_app_meta_data
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on profiles insert
DROP TRIGGER IF EXISTS on_profile_role_insert ON profiles;
CREATE TRIGGER on_profile_role_insert
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_role_to_jwt();

-- Trigger on profiles update
DROP TRIGGER IF EXISTS on_profile_role_update ON profiles;
CREATE TRIGGER on_profile_role_update
  AFTER UPDATE OF role ON profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION sync_role_to_jwt();

-- Sync all existing profiles to JWT
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN 
    SELECT id, role FROM profiles WHERE role IS NOT NULL
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('role', profile_record.role)
    WHERE id = profile_record.id;
  END LOOP;
END $$;
