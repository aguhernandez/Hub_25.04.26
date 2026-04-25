# Signup Debug Guide

## Problema
Error `Database error finding user` (500) durante signup

## Cambios Realizados

### 1. Triggers Eliminados
- ❌ `trigger_auto_assign_trainer` - Causaba conflictos
- ❌ `on_profile_role_insert` - Intentaba modificar auth.users durante signup
- ❌ `create_notification_preferences_on_signup` - Podía fallar

### 2. Trigger Simplificado
- ✅ `on_auth_user_created` - SOLO crea perfil básico (id, email, role)
- ✅ Tiene logging detallado con RAISE NOTICE
- ✅ Es SECURITY DEFINER (bypass RLS)

### 3. Función Post-Signup
- ✅ `complete_profile_setup()` - Se ejecuta DESPUÉS del signup
- Crea notification preferences
- Asigna trainer por defecto
- Sincroniza role en JWT

### 4. Políticas RLS
- ✅ `external_apps_read_profiles` - Permite lectura anónima
- ✅ `Allow all inserts during signup` - Permite inserts públicos

## Diagnóstico

El error 500 viene directamente de Supabase Auth API, NO de nuestro código.

### Posibles Causas

1. **Trigger fallando**: El trigger `handle_new_user` está fallando al crear el perfil
2. **RLS bloqueando**: Supabase Auth no puede leer el usuario recién creado
3. **Constraint violado**: Algún constraint en `profiles` no se satisface

## Siguiente Paso

1. Refresca la página completamente (Ctrl+F5)
2. Intenta signup de nuevo
3. Copia el error COMPLETO de la consola
4. Revisa los logs de Supabase (Dashboard > Logs > Postgres Logs)

## Logs Esperados

En Postgres Logs deberías ver:
```
NOTICE: handle_new_user triggered for user: [uuid] (email: [email])
NOTICE: Profile created/updated successfully for user: [uuid]
```

Si ves:
```
NOTICE: ERROR in handle_new_user: [mensaje] (SQLSTATE: [código])
```

Entonces sabemos qué está fallando exactamente.

## Configuración Actual

- Trigger: ACTIVO con logging
- RLS: Policies permiten lectura anónima
- Insert: Permitido públicamente durante signup
- Frontend: Llama a `complete_profile_setup()` después del signup

## Para Producción

Después de solucionar el problema:
1. Remover logs RAISE NOTICE del trigger
2. Revisar políticas de seguridad
3. Considerar habilitar confirmación de email si es necesario
