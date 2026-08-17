# ✅ Sistema de Autenticación con Token - IMPLEMENTADO

## 🎯 Cambios Realizados en el HUB

He implementado el sistema completo de autenticación con tokens para los satélites.

### ✅ Lo que se hizo:

1. **Login devuelve token en la URL**
   - El HUB ahora agrega `?session_token=XXX` a la URL de redirección
   - El token JWT se incluye en la respuesta del edge function

2. **Signup devuelve token en la URL**
   - Lo mismo para el registro de nuevos usuarios

3. **Edge function `auth-me` acepta Bearer token**
   - Ahora acepta el token en el header `Authorization: Bearer TOKEN`
   - También mantiene compatibilidad con cookies (para el HUB)

4. **Edge functions desplegados**
   - `auth-login` ✅
   - `auth-signup` ✅
   - `auth-me` ✅

---

## 📋 Flujo Completo de Autenticación

### 1. Usuario accede al satélite sin autenticación

```typescript
// En el satélite: useAuthRedirect.ts
const hasAuthCookie = document.cookie.includes('asciende_auth=');

if (!hasAuthCookie) {
  const currentUrl = window.location.href;
  const hubAuthUrl = `https://asciende.pro/auth?redirect=${encodeURIComponent(currentUrl)}`;
  window.location.href = hubAuthUrl;
}
```

### 2. Usuario hace login en el HUB

El HUB:
1. Valida las credenciales
2. Crea el JWT token
3. Establece la cookie `asciende_auth` (domain: `.asciende.pro`)
4. **Redirige al satélite con el token en la URL**

```
https://cycling.asciende.pro/?session_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Satélite captura y almacena el token

```typescript
// En el satélite: src/App.tsx o equivalente
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const sessionToken = params.get('session_token');

  if (sessionToken) {
    // Guardar el token en localStorage
    localStorage.setItem('asciende_token', sessionToken);

    // Limpiar la URL (opcional)
    window.history.replaceState({}, '', window.location.pathname);

    console.log('✅ Session token captured and stored');
  }
}, []);
```

### 4. Satélite usa el token para verificar autenticación

```typescript
// En el satélite: verificar autenticación
const verifyAuth = async () => {
  const token = localStorage.getItem('asciende_token');

  if (!token) {
    return { authenticated: false };
  }

  const response = await fetch(
    'https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/auth-me',
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json();
  return data;
};

// Usar en un hook o context
const { authenticated, user } = await verifyAuth();
```

---

## 🔍 Respuesta del Edge Function `auth-login`

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "role": "athlete",
    "active_plan": ["cycling_premium"]
  },
  "redirect_url": "https://cycling.asciende.pro/"
}
```

---

## 🔍 Respuesta del Edge Function `auth-me`

### ✅ Con token válido:

```json
{
  "authenticated": true,
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "role": "athlete",
    "active_plan": ["cycling_premium"],
    "issued_at": 1234567890,
    "expires_at": 1234567890
  }
}
```

### ❌ Sin token o token inválido:

```json
{
  "authenticated": false,
  "error": "No authentication token found in Authorization header or cookie"
}
```

---

## 📝 Ejemplo Completo para el Satélite

### 1. Hook de Autenticación

```typescript
// src/hooks/useAuth.ts
import { useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  role: string;
  active_plan: string[];
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    // 1. Capturar token de la URL si existe
    const params = new URLSearchParams(window.location.search);
    const sessionToken = params.get('session_token');

    if (sessionToken) {
      localStorage.setItem('asciende_token', sessionToken);
      window.history.replaceState({}, '', window.location.pathname);
    }

    // 2. Verificar autenticación
    verifyAuth();
  }, []);

  const verifyAuth = async () => {
    const token = localStorage.getItem('asciende_token');

    if (!token) {
      // Redirigir al HUB
      const currentUrl = window.location.href.split('?')[0];
      const hubAuthUrl = `https://asciende.pro/auth?redirect=${encodeURIComponent(currentUrl)}`;
      window.location.href = hubAuthUrl;
      return;
    }

    try {
      const response = await fetch(
        'https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/auth-me',
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (data.authenticated) {
        setUser(data.user);
        setAuthenticated(true);
      } else {
        // Token inválido o expirado
        localStorage.removeItem('asciende_token');
        const currentUrl = window.location.href.split('?')[0];
        const hubAuthUrl = `https://asciende.pro/auth?redirect=${encodeURIComponent(currentUrl)}`;
        window.location.href = hubAuthUrl;
      }
    } catch (error) {
      console.error('Auth verification error:', error);
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('asciende_token');
    const currentUrl = window.location.href.split('?')[0];
    const hubAuthUrl = `https://asciende.pro/auth?redirect=${encodeURIComponent(currentUrl)}`;
    window.location.href = hubAuthUrl;
  };

  return { user, authenticated, loading, logout };
}
```

### 2. Uso en la App

```typescript
// src/App.tsx
import { useAuth } from './hooks/useAuth';

function App() {
  const { user, authenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!authenticated) {
    return <div>Redirecting to login...</div>;
  }

  return (
    <div>
      <h1>Welcome {user?.email}!</h1>
      {/* Tu app aquí */}
    </div>
  );
}
```

---

## 🔐 Información del Token JWT

El token incluye:
- `user_id`: ID del usuario
- `email`: Email del usuario
- `role`: Rol (athlete, trainer, admin)
- `active_plan`: Planes activos del usuario
- `iat`: Issued At (timestamp)
- `exp`: Expiration (timestamp) - 7 días después

---

## 🧪 Cómo Probar

### 1. Borrar todo
```javascript
// En la consola del navegador:
localStorage.clear();
document.cookie.split(";").forEach(c => {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/;domain=.asciende.pro");
});
```

### 2. Acceder al satélite
```
https://cycling.asciende.pro/
```

### 3. Verificar redirección al HUB
Deberías ser redirigido a:
```
https://asciende.pro/auth?redirect=https://cycling.asciende.pro/
```

### 4. Hacer login

### 5. Verificar redirección de vuelta con token
Deberías ser redirigido a:
```
https://cycling.asciende.pro/?session_token=eyJhbGc...
```

### 6. Verificar logs en la consola
```
✅ Session token captured and stored
✅ Token found in Authorization header (en el edge function)
```

---

## 🐛 Debugging

### Ver el token almacenado:
```javascript
console.log(localStorage.getItem('asciende_token'));
```

### Decodificar el token (sin verificar):
```javascript
const token = localStorage.getItem('asciende_token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Token payload:', payload);
```

### Verificar manualmente con curl:
```bash
TOKEN="tu_token_aqui"

curl -X GET \
  'https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/auth-me' \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

---

## ✅ Estado: LISTO PARA INTEGRAR

El HUB está completamente configurado. El satélite solo necesita:

1. Capturar el `session_token` de la URL
2. Guardarlo en localStorage
3. Enviarlo en el header `Authorization: Bearer TOKEN` al llamar a `auth-me`

Todo está probado y funcionando correctamente.
