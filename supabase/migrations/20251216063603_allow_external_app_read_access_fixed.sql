/*
  # Enable External App Read Access to Profiles

  1. Security Changes
    - Add RLS policy allowing anonymous (external apps) to read public profile data
    - External apps use VITE_SUPABASE_ANON_KEY to query profiles
    - Read-only access: no INSERT, UPDATE, or DELETE from external apps
    
  2. Access Pattern
    - External apps can lookup profiles by external_metabolic_user_id
    - Enables cross-app user identification and data sync
*/

-- Allow external apps (using anon key) to read profiles
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND policyname = 'external_apps_read_profiles'
  ) THEN
    CREATE POLICY "external_apps_read_profiles"
      ON public.profiles
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

COMMENT ON POLICY "external_apps_read_profiles" ON public.profiles IS
  'Allows external apps (using anon key) to read profile data for cross-app linking and synchronization. External apps CANNOT create, update, or delete users.';
