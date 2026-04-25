# ❌ ERROR: URL INCORRECTA EN EL SATÉLITE

## 🎯 Problema Identificado

El satélite está intentando llamar a:
```
❌ https://hub.asciende.pro/functions/v1/auth-me
```

Pero el edge function está desplegado en Supabase:
```
✅ https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/auth-me
```

## 🔧 Solución

En el satélite, busca donde defines la URL del HUB. Debe ser algo como:

```typescript
// ❌ INCORRECTO
const HUB_URL = 'https://hub.asciende.pro';

// ✅ CORRECTO
const HUB_URL = 'https://ngkcbygyoobqhlmlnuvl.supabase.co';
```

O en el archivo `.env`:

```bash
# ❌ INCORRECTO
VITE_HUB_URL=https://hub.asciende.pro

# ✅ CORRECTO
VITE_HUB_URL=https://ngkcbygyoobqhlmlnuvl.supabase.co
```

## 📝 URL Completa Correcta

```typescript
const response = await fetch(
  'https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/auth-me',
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  }
);
```

## 🔍 Verificación

Después del cambio, deberías ver en la consola:

```
✅ Validating token with: https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/auth-me
✅ { authenticated: true, user: {...} }
```

## 📌 Resumen

- **Edge functions están en Supabase**, no en hub.asciende.pro
- **hub.asciende.pro** es solo el frontend del HUB
- **Todos los edge functions usan**: `ngkcbygyoobqhlmlnuvl.supabase.co`

Cambia la URL y funcionará inmediatamente.
