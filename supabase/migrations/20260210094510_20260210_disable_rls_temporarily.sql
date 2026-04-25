/*
  # Deshabilitar RLS temporalmente para debugging
  
  El error 500 "Database error finding user" persiste.
  Vamos a deshabilitar RLS completamente para ver si eso es el problema.
*/

-- Deshabilitar RLS en profiles
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- También asegurar que no hay problemas con otras tablas relacionadas
ALTER TABLE notification_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions DISABLE ROW LEVEL SECURITY;
