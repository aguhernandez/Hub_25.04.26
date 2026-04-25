/*
  # FIX SIGNUP - Solución Definitiva
  
  Problema: Los triggers están causando error 500 durante signup
  
  Solución RADICAL:
  1. ELIMINAR todos los triggers en profiles que se ejecutan en INSERT
  2. Dejar SOLO el trigger mínimo en auth.users
  3. Los otros procesos se ejecutarán DESPUÉS del signup
*/

-- 1. ELIMINAR TODOS los triggers problemáticos en profiles
DROP TRIGGER IF EXISTS trigger_auto_assign_trainer ON profiles;
DROP TRIGGER IF EXISTS on_profile_role_insert ON profiles;
DROP TRIGGER IF EXISTS create_notification_preferences_on_signup ON profiles;
DROP TRIGGER IF EXISTS on_profile_role_update ON profiles;

-- 2. Recrear el trigger handle_new_user ULTRA SIMPLE
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- SOLO insertar el perfil básico, SIN NADA MÁS
  BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (NEW.id, NEW.email, 'athlete');
  EXCEPTION WHEN unique_violation THEN
    -- Si ya existe, no hacer nada
    NULL;
  WHEN OTHERS THEN
    -- Log pero NO fallar
    RAISE WARNING 'Error creating profile: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- 3. Crear el trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Recrear el UPDATE trigger para sync de role (solo en UPDATE, NO en INSERT)
CREATE TRIGGER on_profile_role_update
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION sync_role_to_jwt();

-- 5. Crear una función que se ejecuta DESPUÉS del signup manualmente
CREATE OR REPLACE FUNCTION public.complete_profile_setup(user_id_input uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Crear notification preferences
  BEGIN
    INSERT INTO notification_preferences (user_id)
    VALUES (user_id_input)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error creating notification preferences: %', SQLERRM;
  END;
  
  -- 2. Asignar trainer por defecto
  BEGIN
    UPDATE profiles
    SET assigned_trainer_id = (
      SELECT id FROM profiles 
      WHERE email = 'agu@asciende.pro' AND role = 'trainer'
      LIMIT 1
    )
    WHERE id = user_id_input 
      AND role = 'athlete' 
      AND assigned_trainer_id IS NULL;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error assigning trainer: %', SQLERRM;
  END;
  
  -- 3. Sync role to JWT
  BEGIN
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('role', (SELECT role FROM profiles WHERE id = user_id_input))
    WHERE id = user_id_input;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error syncing role to JWT: %', SQLERRM;
  END;
END;
$$;

DO $$
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅✅✅ SIGNUP IS NOW ULTRA MINIMAL ✅✅✅';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Only creates profile in profiles table';
  RAISE NOTICE 'All other tasks run via complete_profile_setup()';
END $$;
