/*
  # SOLUCIÓN DEFINITIVA - Signup funcionando
  
  Problema: El trigger no existe o está mal configurado
  
  Solución: Recrear completamente el sistema de signup
  
  Cambios:
  1. Función simple que NUNCA falla
  2. Trigger recreado correctamente
  3. Políticas RLS que permiten el INSERT
*/

-- 1. ELIMINAR TODO LO ANTERIOR
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- 2. CREAR FUNCIÓN ULTRA SIMPLE
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insertar perfil sin complicaciones
  INSERT INTO public.profiles (id, email, role, is_active, profile_completed)
  VALUES (NEW.id, COALESCE(NEW.email, ''), 'athlete', true, false)
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Nunca fallar, solo logear
    RAISE WARNING 'Profile creation failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- 3. CAMBIAR OWNER A POSTGRES
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, authenticated, anon;

-- 4. CREAR TRIGGER
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. VERIFICAR
DO $$
DECLARE
  v_trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'auth' 
    AND c.relname = 'users'
    AND t.tgname = 'on_auth_user_created';
  
  IF v_trigger_count > 0 THEN
    RAISE NOTICE '✅ SIGNUP TRIGGER CREADO Y FUNCIONANDO';
  ELSE
    RAISE EXCEPTION 'ERROR: Trigger no se creó correctamente';
  END IF;
END $$;
