/*
  # Fix RLS para permitir SECURITY DEFINER trigger
  
  Problema: Las políticas RLS bloquean el INSERT incluso con SECURITY DEFINER
  
  Solución: Agregar una política permisiva que se activa durante funciones SECURITY DEFINER
  
  Cambios:
  1. Remover políticas problemáticas
  2. Agregar política correcta que detecta contexto de trigger
*/

-- Remover la política anterior que no funciona
DROP POLICY IF EXISTS "Postgres role can insert profiles" ON profiles;

-- Política que permite INSERT cuando NO hay JWT (contexto de trigger)
-- o cuando el session_user es postgres (SECURITY DEFINER)
DROP POLICY IF EXISTS "Allow trigger to insert profiles" ON profiles;

CREATE POLICY "Allow trigger to insert profiles"
  ON profiles
  FOR INSERT
  WITH CHECK (
    -- Permitir si no hay JWT activo (durante signup antes de autenticación completa)
    coalesce(current_setting('request.jwt.claims', true), 'null') = 'null'
    OR
    -- Permitir si el usuario de sesión es postgres (SECURITY DEFINER funciones)
    session_user = 'postgres'
  );

DO $$
BEGIN
  RAISE NOTICE '✅ RLS policy added for SECURITY DEFINER trigger';
END $$;
