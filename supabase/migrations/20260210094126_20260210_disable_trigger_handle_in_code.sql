/*
  # Deshabilitar trigger - manejar creación de perfil en código
  
  El trigger en auth.users está causando error 500 "Database error finding user"
  
  Solución: Eliminar el trigger completamente y manejar la creación del perfil
  en el código de la aplicación (frontend o edge function).
*/

-- Eliminar trigger completamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Asegurar que las políticas RLS permitan inserción sin restricciones
DROP POLICY IF EXISTS "allow_insert" ON profiles;

CREATE POLICY "allow_insert"
  ON profiles
  FOR INSERT
  WITH CHECK (true);
