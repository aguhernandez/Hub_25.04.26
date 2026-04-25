# Signup Error 500 - Diagnostic and Fix

## Error Actual
```
AuthApiError: Database error finding user
POST /auth/v1/signup -> 500
```

## Diagnóstico Realizado

1. ✅ No hay triggers en `auth.users`
2. ✅ Foreign key `profiles_id_fkey` configurado correctamente
3. ✅ Políticas RLS permiten INSERT sin restricciones
4. ✅ Índices de `auth.users` están correctos
5. ✅ No hay usuarios duplicados
6. ✅ Función `complete_profile_setup` no se ejecuta en signup

## Solución Temporal - Crear Usuario Manualmente

Como el error viene directamente de Supabase Auth, vamos a crear el usuario manualmente para testing:

```sql
-- 1. Crear usuario en auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  is_sso_user
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"], "role": "athlete"}'::jsonb,
  '{"full_name": "Test User"}'::jsonb,
  false,
  false
)
RETURNING id;

-- 2. Crear perfil
INSERT INTO profiles (id, email, role, full_name)
VALUES (
  '[ID del paso anterior]',
  'test@example.com',
  'athlete',
  'Test User'
);
```

## Próximos Pasos

1. Contactar soporte de Supabase con el error específico
2. Verificar logs del servidor de Supabase
3. Intentar crear proyecto nuevo de Supabase y migrar datos
