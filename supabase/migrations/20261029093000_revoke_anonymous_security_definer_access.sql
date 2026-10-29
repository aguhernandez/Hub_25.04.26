-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default. Remove that
-- inherited grant from every SECURITY DEFINER function exposed by the public
-- schema. Authenticated Hub users and trusted Edge Functions retain access.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', fn.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn.signature);
  END LOOP;
END;
$$;
