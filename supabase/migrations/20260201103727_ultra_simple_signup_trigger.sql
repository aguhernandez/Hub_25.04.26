/*
  # Ultra Simple Signup Trigger - Sin COUNT, sin complicaciones
  
  Problema: El COUNT(*) en profiles puede fallar con RLS
  
  Solución: Asignar siempre 'athlete' por defecto
  Los admins y trainers se actualizan manualmente después
  
  Cambios:
  1. Eliminar COUNT(*) completamente  
  2. Asignar siempre 'athlete'
  3. Mejor manejo de errores con detalles
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insertar perfil simple, siempre como athlete
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
    'athlete',  -- Siempre athlete, los roles se actualizan manualmente
    true,
    false
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    updated_at = now();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Logear error con todos los detalles posibles
    RAISE WARNING '❌ handle_new_user ERROR for user %', NEW.id;
    RAISE WARNING '   SQLSTATE: %', SQLSTATE;
    RAISE WARNING '   SQLERRM: %', SQLERRM;
    RAISE WARNING '   Error Context: %', PG_EXCEPTION_CONTEXT;
    -- Re-lanzar el error para que el signup falle y el usuario vea el problema
    RAISE;
END;
$$;

-- Permisos
ALTER FUNCTION handle_new_user() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION handle_new_user() TO postgres;

-- Verificar trigger
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
  
  RAISE NOTICE '✅ Ultra simple signup trigger installed';
  RAISE NOTICE '   All new users get role = athlete';
  RAISE NOTICE '   Update roles manually in Settings > Admin';
END $$;
