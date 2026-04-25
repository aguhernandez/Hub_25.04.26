/*
  # Agregar logging detallado al trigger para debug
  
  Agregar logs NOTICE para poder ver exactamente qué pasa
  durante el signup
*/

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE NOTICE 'handle_new_user triggered for user: % (email: %)', NEW.id, NEW.email;
  
  -- Insertar perfil básico
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'athlete')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  
  RAISE NOTICE 'Profile created/updated successfully for user: %', NEW.id;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'ERROR in handle_new_user: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  -- Re-raise la excepción para que no sea silenciosa
  RAISE;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Verificar que la política de lectura existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
    AND policyname = 'external_apps_read_profiles'
  ) THEN
    RAISE NOTICE '⚠️  Creating external_apps_read_profiles policy';
    CREATE POLICY "external_apps_read_profiles"
      ON profiles
      FOR SELECT
      TO anon
      USING (true);
  ELSE
    RAISE NOTICE '✅ external_apps_read_profiles policy already exists';
  END IF;
END $$;
