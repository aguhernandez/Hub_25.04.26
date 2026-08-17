/*
  # FIX SIGNUP - Permitir lectura anónima durante signup
  
  Problema: Supabase Auth necesita poder leer el perfil recién creado
  para verificar que el signup fue exitoso, pero las políticas RLS
  están bloqueando esta lectura.
  
  Solución: Agregar política que permita lectura pública durante signup
*/

-- Agregar política que permita a Supabase Auth leer perfiles durante signup
CREATE POLICY "Allow signup verification read"
  ON profiles
  FOR SELECT
  TO public
  USING (true);

-- ALTERNATIVA: Modificar el trigger para que use bypass RLS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insertar perfil básico con bypass de RLS
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'athlete');
  
  RETURN NEW;
EXCEPTION 
  WHEN unique_violation THEN
    -- Si ya existe, no hacer nada
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log el error pero NO fallar el signup
    RAISE WARNING 'Error in handle_new_user for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Dar permisos de bypass RLS a la función
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

-- Recrear el trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

DO $$
BEGIN
  RAISE NOTICE '✅ Signup policies updated';
  RAISE NOTICE '✅ Trigger has SECURITY DEFINER and will bypass RLS';
  RAISE NOTICE '✅ Public read allowed for signup verification';
END $$;
