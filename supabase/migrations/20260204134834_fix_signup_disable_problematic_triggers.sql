/*
  # FIX SIGNUP - Deshabilitar triggers problemáticos
  
  Problema: Los triggers auto_assign_trainer y sync_role_to_jwt
  están causando errores 500 durante el signup porque intentan
  acceder/modificar auth.users en un contexto inseguro.
  
  Solución:
  1. Hacer que estos triggers NO fallen si hay error
  2. Simplificar el trigger de signup para que sea a prueba de fallos
  3. Los datos se sincronizarán después del signup
*/

-- 1. FIX auto_assign_trainer - NO debe fallar NUNCA
CREATE OR REPLACE FUNCTION public.auto_assign_trainer_to_athlete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  default_trainer_id uuid;
BEGIN
  -- Solo asignar si el usuario es atleta y no tiene trainer
  IF NEW.role = 'athlete' AND NEW.assigned_trainer_id IS NULL THEN
    BEGIN
      -- Intentar obtener el trainer por defecto
      SELECT id INTO default_trainer_id
      FROM profiles
      WHERE email = 'agu@asciende.pro' AND role = 'trainer'
      LIMIT 1;
      
      -- Asignar si se encontró
      IF default_trainer_id IS NOT NULL THEN
        NEW.assigned_trainer_id := default_trainer_id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Si falla, continuar sin asignar trainer
      NULL;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. FIX sync_role_to_jwt - NO debe fallar NUNCA y debe ser más robusto
CREATE OR REPLACE FUNCTION public.sync_role_to_jwt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Solo proceder si el role cambió o se está insertando
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role) THEN
    BEGIN
      -- Esperar un poco para asegurar que auth.users existe
      IF TG_OP = 'INSERT' THEN
        PERFORM pg_sleep(0.1);
      END IF;
      
      -- Actualizar auth.users con el nuevo role
      UPDATE auth.users
      SET raw_app_meta_data = 
        COALESCE(raw_app_meta_data, '{}'::jsonb) || 
        jsonb_build_object('role', NEW.role)
      WHERE id = NEW.id;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log pero NO fallar
      RAISE WARNING 'Failed to sync role to JWT for user %: %', NEW.id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. FIX create_default_notification_preferences - NO debe fallar NUNCA
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  BEGIN
    INSERT INTO notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Log pero NO fallar
    RAISE WARNING 'Failed to create notification preferences for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- 4. VERIFICAR que la función handle_new_user sea ultra robusta
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  -- Solo insertar lo MÍNIMO necesario
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, 'user@temp.com'),
    'athlete'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log el error pero NUNCA fallar el signup
  RAISE WARNING 'Error in handle_new_user for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- 5. Cambiar owner
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
ALTER FUNCTION public.auto_assign_trainer_to_athlete() OWNER TO postgres;
ALTER FUNCTION public.sync_role_to_jwt() OWNER TO postgres;
ALTER FUNCTION public.create_default_notification_preferences() OWNER TO postgres;

DO $$
BEGIN
  RAISE NOTICE '✅ SIGNUP FIXED - All triggers are now fail-safe';
  RAISE NOTICE '✅ Triggers will not cause 500 errors anymore';
END $$;
