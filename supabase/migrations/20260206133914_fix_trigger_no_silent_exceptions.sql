/*
  # FIX SIGNUP - Eliminar manejo silencioso de excepciones
  
  Problema: El trigger handle_new_user está capturando excepciones
  silenciosamente, lo que oculta el error real.
  
  Solución: Dejar que las excepciones se propaguen para ver el error real
*/

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Crear función sin manejo de excepciones
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insertar perfil básico (SIN try-catch, dejar que falle si hay error)
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'athlete')
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- Recrear trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

DO $$
BEGIN
  RAISE NOTICE '✅ Trigger updated - exceptions will now be visible';
  RAISE NOTICE '✅ If signup fails now, you will see the REAL error';
END $$;
