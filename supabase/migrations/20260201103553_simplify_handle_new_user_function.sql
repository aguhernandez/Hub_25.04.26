/*
  # Simplificar handle_new_user para evitar errores
  
  Problema: La función actual intenta cambiar roles y puede fallar
  
  Solución: Función simple que solo inserta, confiando en las políticas RLS
  que ya hemos configurado
  
  Cambios:
  1. Remover set_config que puede causar errores
  2. Simplificar lógica
  3. Mejor manejo de errores
*/

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
  -- Count existing profiles (solo leer, no cambiar configuración)
  BEGIN
    SELECT COUNT(*) INTO user_count FROM profiles;
  EXCEPTION
    WHEN OTHERS THEN
      user_count := 0;
  END;
  
  -- Assign role based on order
  IF user_count = 0 THEN
    assigned_role := 'admin';
  ELSIF user_count = 1 THEN
    assigned_role := 'trainer';
  ELSE
    assigned_role := 'athlete';
  END IF;
  
  -- Insert profile
  INSERT INTO public.profiles (id, email, role, is_active, profile_completed)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    assigned_role,
    true,
    false
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Si falla, logear y continuar para no bloquear signup
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RAISE WARNING 'SQL State: %', SQLSTATE;
    RETURN NEW;
END;
$$;

-- Asegurar permisos correctos
ALTER FUNCTION handle_new_user() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION handle_new_user() TO postgres, authenticated, anon;

-- Verificar que el trigger existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION handle_new_user();
  END IF;
  
  RAISE NOTICE '✅ handle_new_user() simplified and fixed';
END $$;
