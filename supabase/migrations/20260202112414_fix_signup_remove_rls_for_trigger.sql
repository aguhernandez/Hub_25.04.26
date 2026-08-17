/*
  # Fix Signup - No fallar aunque el perfil no se cree
  
  Problema: El trigger lanza excepciones que causan error 500 en signup
  
  Solución: Capturar TODOS los errores y solo logear WARNING, permitiendo que signup continue
  
  Cambios:
  1. Remover RAISE que relanza el error
  2. Solo logear warnings
  3. Permitir que signup continue aunque falle la creación del perfil
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Intentar insertar perfil
  INSERT INTO public.profiles (
    id,
    email,
    role,
    is_active,
    profile_completed
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    'athlete',
    true,
    false
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    updated_at = now();
  
  -- Si llegamos aquí, todo bien
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Solo logear el error pero NO relanzarlo
    -- Esto permite que el signup continue aunque el perfil no se cree
    RAISE WARNING '⚠️  handle_new_user failed for user % (%)', NEW.id, NEW.email;
    RAISE WARNING '    Error: %', SQLERRM;
    RAISE WARNING '    SQLSTATE: %', SQLSTATE;
    -- IMPORTANTE: Retornar NEW para que el signup continue
    RETURN NEW;
END;
$$;

-- Permisos
ALTER FUNCTION handle_new_user() OWNER TO postgres;

-- Verificar y recrear trigger si es necesario
DO $$
BEGIN
  -- Eliminar trigger anterior si existe
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  
  -- Crear nuevo trigger
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();
  
  RAISE NOTICE '✅ Signup trigger fixed - will not fail signup even if profile creation fails';
END $$;
