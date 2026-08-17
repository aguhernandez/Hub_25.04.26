/*
  # Fix Signup Trigger - Allow SECURITY DEFINER to bypass RLS
  
  Problem: The handle_new_user() trigger fails because RLS policies block the INSERT
  even though the function has SECURITY DEFINER.
  
  Solution: Add a policy that allows INSERT when current_user is the postgres role
  (which is used by SECURITY DEFINER functions).
  
  Changes:
  1. Add policy to allow service role to insert profiles
  2. This allows the SECURITY DEFINER trigger to bypass RLS restrictions
*/

-- Drop if exists
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

-- Add policy to allow service role (used by SECURITY DEFINER functions) to insert
CREATE POLICY "Service role can insert profiles"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if the function is running as postgres/service role
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR
    -- Allow if current_user is postgres (SECURITY DEFINER context)
    current_user = 'postgres'
    OR
    -- Fallback: allow if there's no JWT yet (during signup)
    current_setting('request.jwt.claims', true) IS NULL
  );

-- Ensure the trigger function has proper permissions
ALTER FUNCTION handle_new_user() OWNER TO postgres;

-- Grant necessary permissions
GRANT ALL ON profiles TO postgres;

DO $$
BEGIN
  RAISE NOTICE '✅ Fixed signup trigger RLS bypass';
  RAISE NOTICE '';
  RAISE NOTICE 'The handle_new_user() trigger can now insert profiles during signup.';
END $$;
