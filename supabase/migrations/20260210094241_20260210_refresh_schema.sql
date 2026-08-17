/*
  # Refrescar esquema para limpiar cache
  
  A veces Supabase Auth cachea información sobre triggers.
  Vamos a recrear la tabla auth schema info para forzar un refresh.
*/

-- Crear un trigger dummy que no hace nada pero que existe
CREATE OR REPLACE FUNCTION public.auth_user_created_dummy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- No hacer nada, solo retornar
  RETURN NEW;
END;
$$;

-- Crear el trigger para que auth sepa que existe
CREATE TRIGGER on_auth_user_created_dummy
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auth_user_created_dummy();

-- Y eliminarlo inmediatamente
DROP TRIGGER IF EXISTS on_auth_user_created_dummy ON auth.users;
DROP FUNCTION IF EXISTS public.auth_user_created_dummy() CASCADE;

-- Forzar revalidación del esquema
NOTIFY pgrst, 'reload schema';
