# 🔧 FIX: Error de CORS en LAB

## ❌ Problema Detectado

LAB está llamando a la **URL INCORRECTA** para validar el token:

```javascript
// ❌ INCORRECTO - Esto causa error de CORS
const authUrl = 'https://hub.asciende.pro/functions/v1/auth-me';
```

**Error en consola:**
```
Access to fetch at 'https://hub.asciende.pro/functions/v1/auth-me' from origin 'https://lab.asciende.pro'
has been blocked by CORS policy: Response to preflight request doesn't pass access control check:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## ✅ Solución

Los edge functions están en **Supabase**, NO en hub.asciende.pro:

```javascript
// ✅ CORRECTO - Llamar a Supabase
const authUrl = 'https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/auth-me';
```

## 📝 Código a Actualizar en LAB

### 1. Configuración de URLs
```javascript
// ⚠️ IMPORTANTE: Los edge functions están en SUPABASE
const SUPABASE_URL = 'https://ngkcbygyoobqhlmlnuvl.supabase.co';
const HUB_URL = 'https://hub.asciende.pro';
```

### 2. Función de Validación
```javascript
async function validateToken(token) {
  // ✅ Llamar a SUPABASE, no a hub.asciende.pro
  const authUrl = `${SUPABASE_URL}/functions/v1/auth-me`;

  try {
    const response = await fetch(authUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Token inválido o expirado');
      return null;
    }

    const data = await response.json();

    if (data.authenticated && data.user) {
      console.log('✅ Token válido:', data.user);
      return data.user;
    }

    return null;
  } catch (error) {
    console.error('❌ Error validando token:', error);
    return null;
  }
}
```

## 🎯 Por Qué Esto Es Importante

| Componente | Descripción | URL |
|------------|-------------|-----|
| **HUB** | Frontend React (Vite) | `https://hub.asciende.pro` |
| **LAB** | Frontend React (Vite) | `https://lab.asciende.pro` |
| **Edge Functions** | Backend en Supabase | `https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/` |

**El HUB no tiene edge functions**, es solo un frontend. Los edge functions están en Supabase y tienen CORS correctamente configurado para permitir:
- ✅ `hub.asciende.pro`
- ✅ `lab.asciende.pro`
- ✅ `cycling.asciende.pro`
- ✅ Todos los subdominios de `asciende.pro`

## 🔍 Verificación

El edge function `/functions/v1/auth-me` ya tiene CORS configurado correctamente:

```typescript
// En supabase/functions/auth-me/index.ts
const allowedOrigins = [
  'http://localhost:5173',
  'https://hub.asciende.pro',
  'https://cycling.asciende.pro',
  'https://lab.asciende.pro',  // ✅ LAB está permitido
  // ... más orígenes
];
```

## 🚀 Siguiente Paso

**Actualiza el código de LAB** para que llame a:
```
https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/auth-me
```

En lugar de:
```
https://hub.asciende.pro/functions/v1/auth-me
```

Una vez corregida esta URL, LAB funcionará perfectamente como Cycling.

## 📋 Checklist

- [ ] Cambiar URL de validación a Supabase
- [ ] Probar desde HUB → LAB
- [ ] Verificar que no hay errores de CORS
- [ ] Confirmar que se muestra información del usuario

## 💡 Nota Adicional

Si LAB está usando una variable de entorno para la URL de Supabase, asegúrate de que esté correctamente configurada:

```env
VITE_SUPABASE_URL=https://ngkcbygyoobqhlmlnuvl.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

Y úsala así:
```javascript
const authUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-me`;
```
