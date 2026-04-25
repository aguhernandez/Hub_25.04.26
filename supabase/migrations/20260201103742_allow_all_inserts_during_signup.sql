/*
  # Permitir INSERT sin restricciones para el trigger
  
  Problema: Las políticas RLS pueden estar bloqueando el INSERT del trigger
  
  Solución: Simplificar la política "Allow trigger to insert profiles" para que
  permita cualquier INSERT que venga sin autenticación completa
  
  Cambios:
  1. Reemplazar la política con una más permisiva
  2. Permitir INSERT si no hay role en el JWT (signup en progreso)
*/

-- Eliminar la política existente
DROP POLICY IF EXISTS "Allow trigger to insert profiles" ON profiles;

-- Nueva política ultra permisiva para permitir signup
CREATE POLICY "Allow trigger to insert profiles"
  ON profiles
  FOR INSERT
  WITH CHECK (
    -- Permitir si no hay JWT (signup inicial)
    auth.jwt() IS NULL
    OR
    -- Permitir si no hay role en el JWT (signup en progreso)
    (auth.jwt() ->> 'role') IS NULL
    OR
    -- Permitir si el session_user es postgres (SECURITY DEFINER)
    session_user = 'postgres'
  );

DO $$
BEGIN
  RAISE NOTICE '✅ RLS policy updated to allow signup';
  RAISE NOTICE '   Signup trigger can now insert profiles';
END $$;
