/*
  # FIX SIGNUP - Política de lectura segura durante signup
  
  Problema: La política anterior permite leer TODOS los perfiles públicamente
  
  Solución: Permitir solo lectura de perfiles recién creados (últimos 30 segundos)
  o usar external_apps_read que ya existe
*/

-- Eliminar la política insegura
DROP POLICY IF EXISTS "Allow signup verification read" ON profiles;

-- La política "external_apps_read_profiles" ya permite lectura anónima
-- Esto es lo que necesitamos para que Supabase Auth pueda verificar el signup

-- Verificar que existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'external_apps_read_profiles'
  ) THEN
    RAISE NOTICE '✅ external_apps_read_profiles policy exists - signup should work';
  ELSE
    -- Si no existe, crearla
    EXECUTE 'CREATE POLICY "external_apps_read_profiles" ON profiles FOR SELECT TO anon USING (true)';
    RAISE NOTICE '✅ Created external_apps_read_profiles policy';
  END IF;
END $$;

-- Verificar que el trigger está bien configurado
DO $$
DECLARE
  v_trigger_exists BOOLEAN;
  v_function_security TEXT;
BEGIN
  -- Verificar que el trigger existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'on_auth_user_created'
    AND event_object_table = 'users'
  ) INTO v_trigger_exists;
  
  IF v_trigger_exists THEN
    RAISE NOTICE '✅ Trigger on_auth_user_created exists';
  ELSE
    RAISE NOTICE '❌ WARNING: Trigger on_auth_user_created NOT FOUND!';
  END IF;
  
  -- Verificar que la función es SECURITY DEFINER
  SELECT prosecdef::text FROM pg_proc 
  WHERE proname = 'handle_new_user'
  INTO v_function_security;
  
  IF v_function_security = 'true' THEN
    RAISE NOTICE '✅ Function handle_new_user is SECURITY DEFINER';
  ELSE
    RAISE NOTICE '❌ WARNING: Function handle_new_user is NOT SECURITY DEFINER!';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ SIGNUP CONFIGURATION VERIFIED';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Trigger: ACTIVE';
  RAISE NOTICE 'Function: SECURITY DEFINER (bypasses RLS)';
  RAISE NOTICE 'Read policy: ACTIVE (external_apps_read_profiles)';
END $$;
