# 📡 LAB: API Endpoints de Autenticación

## ⚠️ URL Base Correcta

**TODAS las llamadas a edge functions deben ir a Supabase, NO al HUB:**

```javascript
// ✅ CORRECTO
const SUPABASE_URL = 'https://ngkcbygyoobqhlmlnuvl.supabase.co';

// ❌ INCORRECTO (causará errores de CORS)
const HUB_URL = 'https://hub.asciende.pro'; // Solo para redirecciones de UI
```

---

## 🔐 Endpoints de Autenticación

### 1. Validar Sesión (auth-me)

**Usar para:** Verificar si el token JWT es válido y obtener info del usuario

```javascript
// ✅ URL CORRECTA
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
// Respuesta: { authenticated: true, user: {...} }
```

**Cuándo llamar:**
- Al cargar LAB para verificar sesión existente
- Antes de hacer operaciones que requieran autenticación
- Para refrescar información del usuario

**Respuesta exitosa:**
```json
{
  "authenticated": true,
  "user": {
    "id": "uuid-del-usuario",
    "email": "usuario@example.com",
    "role": "athlete|trainer|admin",
    "active_plan": ["cycling_pro", "lab_premium"],
    "issued_at": 1234567890,
    "expires_at": 1234567890
  }
}
```

**Respuesta error:**
```json
{
  "authenticated": false,
  "error": "Invalid or expired token"
}
```

---

### 2. Login (auth-login)

**Usar para:** Si LAB tuviera su propio formulario de login (NO recomendado)

```javascript
// ⚠️ NO USAR - LAB debe redirigir al HUB para login
// El HUB ya maneja el login centralizado

// Solo documentado por referencia:
const response = await fetch(
  'https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/auth-login',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  }
);
```

**Recomendación:** LAB debe redirigir al HUB para login en lugar de implementar su propio formulario.

---

### 3. Logout (auth-logout)

**Usar para:** Cerrar sesión del usuario

```javascript
const response = await fetch(
  'https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/auth-logout',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  }
);

// Después del logout:
localStorage.removeItem('hub_session_token');
window.location.href = 'https://hub.asciende.pro';
```

---

### 4. Registro (auth-signup)

**Usar para:** Si LAB tuviera su propio formulario de registro (NO recomendado)

```javascript
// ⚠️ NO USAR - LAB debe redirigir al HUB para registro

// Solo documentado por referencia:
const response = await fetch(
  'https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/auth-signup',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role: 'athlete' })
  }
);
```

**Recomendación:** LAB debe redirigir al HUB para registro.

---

## 📋 Flujo Recomendado para LAB

### Escenario 1: Usuario viene desde el HUB (con token)

1. ✅ LAB captura token de URL: `?session_token=...`
2. ✅ LAB guarda token en localStorage
3. ✅ LAB llama a `/functions/v1/auth-me` para validar
4. ✅ Si válido: mostrar contenido de LAB
5. ✅ Si inválido: redirigir al HUB para login

### Escenario 2: Usuario accede directamente a LAB (sin token)

1. ✅ LAB busca token en localStorage
2. ✅ Si existe: llamar a `/functions/v1/auth-me` para validar
3. ✅ Si válido: mostrar contenido de LAB
4. ✅ Si no existe o inválido: redirigir al HUB para login

### Escenario 3: Usuario hace logout

1. ✅ LAB llama a `/functions/v1/auth-logout`
2. ✅ LAB elimina token de localStorage
3. ✅ LAB redirige al HUB

---

## 🎯 Código de Ejemplo Completo

```javascript
// Configuración
const SUPABASE_URL = 'https://ngkcbygyoobqhlmlnuvl.supabase.co';
const HUB_URL = 'https://hub.asciende.pro';

// Clase de autenticación para LAB
class LabAuth {
  constructor() {
    this.tokenKey = 'hub_session_token';
  }

  // Capturar token de URL
  captureToken() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('session_token');

    if (token) {
      localStorage.setItem(this.tokenKey, token);

      // Limpiar URL
      window.history.replaceState({}, '', window.location.pathname);
      return token;
    }

    return localStorage.getItem(this.tokenKey);
  }

  // Validar token
  async validateToken(token) {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/auth-me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) return null;

      const data = await response.json();
      return data.authenticated ? data.user : null;
    } catch (error) {
      console.error('Error validando token:', error);
      return null;
    }
  }

  // Logout
  async logout() {
    const token = localStorage.getItem(this.tokenKey);

    if (token) {
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/auth-logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.error('Error en logout:', error);
      }
    }

    localStorage.removeItem(this.tokenKey);
    window.location.href = HUB_URL;
  }

  // Redirigir al HUB para login
  redirectToHub() {
    const redirectUrl = encodeURIComponent(window.location.origin);
    window.location.href = `${HUB_URL}/auth?redirect=${redirectUrl}`;
  }

  // Verificar autenticación (llamar al cargar LAB)
  async checkAuth() {
    const token = this.captureToken();

    if (!token) {
      this.redirectToHub();
      return null;
    }

    const user = await this.validateToken(token);

    if (!user) {
      localStorage.removeItem(this.tokenKey);
      this.redirectToHub();
      return null;
    }

    return user;
  }
}

// Uso
const auth = new LabAuth();

// Al cargar la página
window.addEventListener('DOMContentLoaded', async () => {
  const user = await auth.checkAuth();

  if (user) {
    console.log('✅ Usuario autenticado:', user);
    // Inicializar LAB con datos del usuario
  }
});
```

---

## ⚡ Resumen de URLs

| Endpoint | URL Completa | Método | Uso |
|----------|-------------|--------|-----|
| **auth-me** | `https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/auth-me` | GET | ✅ Validar token (USAR ESTE) |
| **auth-logout** | `https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/auth-logout` | POST | ✅ Cerrar sesión |
| **auth-login** | `https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/auth-login` | POST | ⚠️ No usar (redirigir al HUB) |
| **auth-signup** | `https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/auth-signup` | POST | ⚠️ No usar (redirigir al HUB) |

---

## 🚨 Errores Comunes

### Error 1: CORS
```
❌ CAUSA: Llamar a https://hub.asciende.pro/functions/v1/...
✅ SOLUCIÓN: Llamar a https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/...
```

### Error 2: Token no encontrado
```
❌ CAUSA: No capturar token de URL o localStorage
✅ SOLUCIÓN: Implementar captureToken() correctamente
```

### Error 3: Loop de redirects
```
❌ CAUSA: LAB redirige al HUB, HUB redirige a LAB
✅ SOLUCIÓN: LAB debe guardar y validar token correctamente
```

---

**⏱️ Tiempo de implementación:** 15-20 minutos
**🎯 Resultado:** LAB funcionando igual que Cycling
