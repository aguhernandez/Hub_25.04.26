# 🎯 SOLUCIÓN: Error CORS en LAB

## 🚨 Problema Identificado

LAB está llamando a la **URL INCORRECTA**, causando error de CORS:

```
❌ Error actual en consola:
Access to fetch at 'https://hub.asciende.pro/functions/v1/auth-me'
from origin 'https://lab.asciende.pro' has been blocked by CORS policy
```

## ✅ La Solución (30 segundos)

**Cambiar 1 línea de código en LAB:**

```javascript
// ❌ ANTES (INCORRECTO)
const authUrl = 'https://hub.asciende.pro/functions/v1/auth-me';

// ✅ DESPUÉS (CORRECTO)
const authUrl = 'https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/auth-me';
```

## 🤔 Por Qué Esto Pasa

| Componente | Tipo | URL | Tiene Edge Functions |
|------------|------|-----|---------------------|
| HUB | Frontend React | hub.asciende.pro | ❌ NO |
| LAB | Frontend React | lab.asciende.pro | ❌ NO |
| Cycling | Frontend React | cycling.asciende.pro | ❌ NO |
| **Supabase** | **Backend** | **ngkcbygyoobqhlmlnuvl.supabase.co** | **✅ SÍ** |

**Los edge functions están en Supabase, no en el HUB.**

El HUB es solo un frontend React. No puede tener edge functions porque es solo HTML/CSS/JS estático.

## 📝 Archivos Creados con la Documentación

1. **`LAB_QUICKFIX_CORS_ERROR.md`** → Solución rápida en 1 minuto
2. **`LAB_AUTHENTICATION_FIX.md`** → Explicación detallada del problema
3. **`LAB_API_ENDPOINTS.md`** → Guía completa de todos los endpoints (con código listo para usar)

## 🔧 Código Corregido para LAB

```javascript
// Configuración correcta
const SUPABASE_URL = 'https://ngkcbygyoobqhlmlnuvl.supabase.co';
const HUB_URL = 'https://hub.asciende.pro';

// Función de validación
async function validateToken(token) {
  try {
    // ✅ CORRECTO: Llamar a Supabase
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

### Antes del Fix (❌)
```
console:
🔍 Token from URL: exists
💾 Saved token to localStorage
🔄 Validating token with: https://hub.asciende.pro/functions/v1/auth-me
❌ Access blocked by CORS policy
💥 Auth check failed: TypeError: Failed to fetch
```

### Después del Fix (✅)
```
console:
🔍 Token from URL: exists
💾 Saved token to localStorage
🔄 Validating token with: https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/auth-me
✅ Token válido
✅ Usuario autenticado: { email: "...", role: "..." }
```

## ✅ Verificación

El edge function `/functions/v1/auth-me` **YA TIENE CORS CONFIGURADO** para LAB:

```typescript
// En supabase/functions/auth-me/index.ts (líneas 5-14)
const allowedOrigins = [
  'http://localhost:5173',
  'https://hub.asciende.pro',
  'https://cycling.asciende.pro',
  'https://lab.asciende.pro',      // ✅ LAB está permitido
  'https://nutrition.asciende.pro',
  'https://running.asciende.pro',
];
```

**El problema NO es de CORS en el backend.**
**El problema ES que LAB está llamando a la URL equivocada.**

## 🚀 Pasos para Implementar

1. ✅ Abrir el código de LAB donde se valida el token
2. ✅ Cambiar URL de `hub.asciende.pro` a `ngkcbygyoobqhlmlnuvl.supabase.co`
3. ✅ Guardar cambios
4. ✅ Limpiar caché del navegador (Ctrl + Shift + R)
5. ✅ Probar desde HUB → LAB
6. ✅ Debería funcionar perfectamente

## 📊 Estado Actual

| Satélite | Autenticación | Problema |
|----------|---------------|----------|
| **Cycling** | ✅ Funciona | Ninguno (llama correctamente a Supabase) |
| **LAB** | ❌ Falla | URL incorrecta (llama a hub.asciende.pro) |

## 🎓 Lección Aprendida

**Arquitectura de Asciende:**

```
┌─────────────────────────────────────────────────┐
│  Frontends (Solo UI, sin backend)              │
├─────────────────────────────────────────────────┤
│  • hub.asciende.pro         (React + Vite)     │
│  • lab.asciende.pro         (React + Vite)     │
│  • cycling.asciende.pro     (React + Vite)     │
└─────────────────────────────────────────────────┘
                    ↓ API Calls
┌─────────────────────────────────────────────────┐
│  Backend (Supabase)                             │
├─────────────────────────────────────────────────┤
│  • ngkcbygyoobqhlmlnuvl.supabase.co            │
│    ├── Edge Functions (auth-me, auth-login...) │
│    ├── Database (PostgreSQL)                   │
│    └── Storage (archivos)                      │
└─────────────────────────────────────────────────┘
```

**TODOS los frontends llaman a Supabase, NO entre ellos.**

---

## 🏁 Checklist Final

- [x] HUB → Funcionando ✅
- [x] Cycling → Funcionando ✅
- [x] Edge functions → Configurados con CORS ✅
- [ ] **LAB → Corregir URL de validación** ⬅️ ESTO ES LO ÚNICO QUE FALTA

---

**⏱️ Tiempo de fix:** 30 segundos
**💰 Complejidad:** Muy baja
**🎯 Impacto:** Alto (LAB funcionará igual que Cycling)
