# ⚡ SOLUCIÓN RÁPIDA: Error CORS en LAB

## 🚨 Error Actual

```
Access to fetch at 'https://hub.asciende.pro/functions/v1/auth-me' from origin 'https://lab.asciende.pro'
has been blocked by CORS policy
```

## ✅ Solución en 1 Línea

**Cambiar esta línea en el código de LAB:**

```javascript
// ❌ ANTES (INCORRECTO)
const authUrl = 'https://hub.asciende.pro/functions/v1/auth-me';

// ✅ DESPUÉS (CORRECTO)
const authUrl = 'https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/auth-me';
```

## 📖 Explicación

- **hub.asciende.pro** = Frontend React (no tiene edge functions)
- **ngkcbygyoobqhlmlnuvl.supabase.co** = Backend Supabase (aquí están los edge functions)

Los edge functions están en Supabase, no en el HUB.

## 🔧 Código Completo Corregido

```javascript
// Configuración
const SUPABASE_URL = 'https://ngkcbygyoobqhlmlnuvl.supabase.co';
const HUB_URL = 'https://hub.asciende.pro';

// Función de validación
async function validateToken(token) {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/auth-me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Token inválido');
      return null;
    }

    const data = await response.json();

    if (data.authenticated && data.user) {
      console.log('✅ Usuario autenticado:', data.user);
      return data.user;
    }

    return null;
  } catch (error) {
    console.error('Error validando token:', error);
    return null;
  }
}
```

## 🎯 Resultado Esperado

Después de este cambio, deberías ver en la consola:

```
✅ Token found in Authorization header
✅ Usuario autenticado: { email: "...", role: "...", ... }
```

Y **NO** verás errores de CORS.

## 🚀 Testing

1. Haz el cambio de URL
2. Limpia caché del navegador (Ctrl + Shift + R)
3. Click en "Abrir LAB" desde el HUB
4. LAB debe abrir y autenticar correctamente

---

**Tiempo estimado de fix:** 30 segundos
**Complejidad:** Muy baja (cambio de 1 URL)
