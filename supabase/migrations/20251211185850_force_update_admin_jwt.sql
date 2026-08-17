/*
  # Force Update Admin JWT with Role

  This migration forces the JWT to be updated with the correct role for the admin user.
  
  1. Updates the app_metadata in auth.users to include the role from profiles
  2. Forces a JWT refresh by updating the updated_at timestamp
  
  Note: The user will need to refresh their session to see the changes.
*/

-- Update auth.users app_metadata with role from profiles
UPDATE auth.users
SET 
  raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb((SELECT role FROM profiles WHERE id = auth.users.id))
  ),
  updated_at = now()
WHERE id IN (SELECT id FROM profiles WHERE role = 'admin');

-- Also update trainer and athlete roles for consistency
UPDATE auth.users
SET 
  raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb((SELECT role FROM profiles WHERE id = auth.users.id))
  ),
  updated_at = now()
WHERE id IN (SELECT id FROM profiles WHERE role IN ('trainer', 'athlete'));