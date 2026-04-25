/*
  # Sync existing user roles to JWT

  1. Changes
    - Update all existing users' JWT with their current role from profiles table
    - This ensures admin users have the correct permissions

  2. Security
    - Only syncs role data, doesn't modify anything else
*/

-- Update all users' JWT with their current role
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
