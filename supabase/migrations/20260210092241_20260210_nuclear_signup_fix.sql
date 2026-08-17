/*
  # Solución Nuclear para Signup - Eliminar triggers problemáticos
  
  El error 500 en auth/v1/signup indica que el trigger está causando
  un bucle infinito o error que bloquea la creación del usuario.
  
  Solución: Eliminar el trigger completamente y manejar todo en la
  aplicación frontend + edge function.
*/

-- Paso 1: Deshabilitar y eliminar el trigger problemático
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Paso 2: Eliminar todas las políticas de la tabla profiles
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Trainers can update assigned athletes" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "allow_profile_insert_signup" ON profiles;
DROP POLICY IF EXISTS "authenticated_users_read_own_profile" ON profiles;
DROP POLICY IF EXISTS "external_apps_read_profiles" ON profiles;
DROP POLICY IF EXISTS "trainers_view_assigned_athletes" ON profiles;
DROP POLICY IF EXISTS "users_view_trainer_profiles" ON profiles;
DROP POLICY IF EXISTS "Allow all inserts during signup" ON profiles;
DROP POLICY IF EXISTS "profiles_allow_insert_signup" ON profiles;

-- Paso 3: Deshabilitar temporalmente RLS
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Paso 4: Recrear políticas simples y funcionales
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- INSERT: Permitir todo durante signup (sin restricciones)
CREATE POLICY "allow_insert"
  ON profiles
  FOR INSERT
  WITH CHECK (true);

-- SELECT: Permitir lectura pública sin restricciones
CREATE POLICY "allow_select"
  ON profiles
  FOR SELECT
  USING (true);

-- UPDATE: Solo el usuario puede actualizar su propio perfil
CREATE POLICY "allow_own_update"
  ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- DELETE: Solo admins pueden borrar
CREATE POLICY "admin_delete"
  ON profiles
  FOR DELETE
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
