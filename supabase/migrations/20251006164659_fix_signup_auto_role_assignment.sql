/*
  # Fix Signup with Automatic Role Assignment
  
  Problem: Users can't sign up because the trigger tries to insert into profiles
  but RLS policies block it.
  
  Solution:
  1. Update trigger function to assign roles based on user count
     - First user = admin
     - Second user = trainer
     - Third+ users = athlete
  2. Function runs with SECURITY DEFINER and bypasses RLS
  
  The trigger already has SECURITY DEFINER, so it should work once we update the logic.
*/

-- Drop existing function
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Create improved function that assigns roles based on order
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INT;
  assigned_role TEXT;
BEGIN
  -- Count existing profiles to determine role
  SELECT COUNT(*) INTO user_count FROM profiles;
  
  -- Assign role based on order
  IF user_count = 0 THEN
    assigned_role := 'admin';
  ELSIF user_count = 1 THEN
    assigned_role := 'trainer';
  ELSE
    assigned_role := 'athlete';
  END IF;
  
  -- Insert profile with assigned role
  INSERT INTO public.profiles (id, email, role, is_active, profile_completed)
  VALUES (
    NEW.id,
    NEW.email,
    assigned_role,
    true,
    false
  );
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Verify
DO $$
BEGIN
  RAISE NOTICE '✅ Signup trigger updated!';
  RAISE NOTICE '';
  RAISE NOTICE 'Role assignment:';
  RAISE NOTICE '  1st signup → admin';
  RAISE NOTICE '  2nd signup → trainer';
  RAISE NOTICE '  3rd+ signup → athlete';
  RAISE NOTICE '';
  RAISE NOTICE 'The function bypasses RLS with SECURITY DEFINER.';
END $$;
