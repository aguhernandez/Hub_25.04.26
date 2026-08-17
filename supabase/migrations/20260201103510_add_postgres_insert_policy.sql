/*
  # Agregar política para permitir inserción del trigger
  
  Solución final: Agregar una política que permita al rol postgres insertar
  sin restricciones. Esto permite que el trigger SECURITY DEFINER funcione.
  
  Cambios:
  1. Política especial para postgres role
*/

-- Política que permite a postgres (SECURITY DEFINER) insertar
CREATE POLICY "Postgres role can insert profiles"
  ON profiles
  FOR INSERT
  TO postgres, authenticated, anon
  WITH CHECK (true);

DO $$
BEGIN
  RAISE NOTICE '✅ Added postgres insert policy';
END $$;
