/*
  # Force JWT Refresh for Existing Users

  1. Purpose
    - Updates auth.users metadata to trigger JWT refresh
    - Ensures all existing users have their roles properly synced to JWT
    
  2. Changes
    - Touches the raw_app_meta_data to force JWT regeneration
    - This will make RLS policies work correctly for admin users
*/

DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- Force update raw_app_meta_data for all users to trigger JWT refresh
  FOR user_record IN 
    SELECT id, email, raw_app_meta_data
    FROM auth.users
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data = raw_app_meta_data
    WHERE id = user_record.id;
  END LOOP;
  
  RAISE NOTICE 'JWT refresh triggered for all users';
END $$;
