# 🧪 Guía de Integración: Satélite LAB con HUB Asciende

## 📋 Resumen

El satélite **LAB** (`lab.asciende.pro`) es una aplicación independiente para análisis de resultados de laboratorio y métricas metabólicas que se integra con el **HUB** de Asciende para autenticación centralizada.

URL del satélite: **https://lab.asciende.pro**

---

## 🎯 Funcionalidades Implementadas en el HUB

### ✅ Lo que YA está configurado:

1. **Base de datos**
   - Tabla `satellites` con registro de LAB
   - Tabla `user_satellite_permissions` para control de acceso
   - Tabla `user_satellite_access_log` para auditoría
   - Función `check_satellite_access()` para validar permisos
   - Función `log_satellite_access()` para registro de accesos

2. **Edge Functions**
   - `auth-me`: Valida tokens JWT del HUB
   - `auth-login`: Genera tokens JWT con redirect a satélites
   - `get-session-token`: Convierte tokens de Supabase a tokens JWT del HUB
   - `satellite-access`: Gestiona permisos y accesos a satélites

3. **Frontend (HUB)**
   - Sección de Satélites en Settings
   - Botón "Abrir LAB" que genera token y abre en nueva pestaña
   - UI con ícono `FlaskConical` y colores rojos (categoría medical)
   - CORS configurado para `lab.asciende.pro`

4. **Permisos**
   - Todos los usuarios tienen acceso a LAB
   - Admin: acceso automático por rol
   - Otros roles: permiso explícito otorgado

---

## 🔐 Sistema de Autenticación

### Tipos de Tokens

El sistema usa **DOS tipos de tokens diferentes**:

1. **Token de Supabase Auth** (`session.access_token`)
   - Usado SOLO para llamadas a la API de Supabase
   - NO sirve para autenticación entre HUB y satélites

2. **Token JWT Personalizado del HUB** (generado con `JWT_SECRET`)
   - Usado para autenticación entre HUB y satélites
   - Contiene: `user_id`, `email`, `role`, `active_plan`
   - Válido por 7 días
   - Firmado con algoritmo HS256

### Flujo de Autenticación

#### 1️⃣ Acceso directo a `lab.asciende.pro` (sin sesión)

```
Usuario → lab.asciende.pro
       ↓
LAB detecta: no hay token
       ↓
LAB redirige → hub.asciende.pro/auth?redirect=https://lab.asciende.pro
       ↓
Usuario hace login en HUB
       ↓
HUB genera token JWT
       ↓
HUB redirige → lab.asciende.pro?session_token=JWT_TOKEN
       ↓
LAB captura token → valida con /auth-me → Usuario autenticado ✅
```

#### 2️⃣ Clic en botón "Abrir LAB" desde HUB (con sesión activa)

```
Usuario en HUB (ya autenticado)
       ↓
Click en "Abrir LAB"
       ↓
HUB obtiene session.access_token de Supabase
       ↓
HUB llama a /functions/v1/get-session-token
       ↓
Edge function convierte token Supabase → token JWT del HUB
       ↓
HUB abre: lab.asciende.pro?session_token=JWT_TOKEN
       ↓
LAB captura token → valida con /auth-me → Usuario autenticado ✅
```

---

## 🛠️ Implementación Requerida en el Satélite LAB

### 1. Variables de Entorno

Crear archivo `.env` con:

```env
# Supabase - MISMA configuración que el HUB
VITE_SUPABASE_URL=https://ngkcbygyoobqhlmlnuvl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5na2NieWd5b29icWhsbWxudXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc4MTM2ODcsImV4cCI6MjA0MzM4OTY4N30.vHSLU6eFN_Hg69xlJxGTdNcH3wS7zJSfHWXAHfUQwKA

# URL del HUB para redireccionamiento
VITE_HUB_URL=https://hub.asciende.pro

# Identificador del satélite
VITE_SATELLITE_NAME=lab
```

---

### 2. Lógica de Captura de Token

#### Detectar token en URL al cargar la aplicación:

```typescript
// src/utils/auth.ts o similar

export const captureSessionToken = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('session_token');

  if (token) {
    console.log('✅ Token JWT capturado de URL');

    // Guardar en localStorage
    localStorage.setItem('hub_session_token', token);

    // Limpiar URL (quitar el token por seguridad)
    const url = new URL(window.location.href);
    url.searchParams.delete('session_token');
    window.history.replaceState({}, '', url.toString());

    return token;
  }

  // Intentar recuperar de localStorage
  const storedToken = localStorage.getItem('hub_session_token');
  if (storedToken) {
    console.log('✅ Token JWT recuperado de localStorage');
    return storedToken;
  }

  console.log('❌ No hay token JWT');
  return null;
};
```

---

### 3. Validación de Token con el HUB

#### Validar token contra `/functions/v1/auth-me`:

```typescript
// src/utils/auth.ts

interface UserData {
  id: string;
  email: string;
  role: string;
  active_plan: string[];
  issued_at: number;
  expires_at: number;
}

export const validateToken = async (token: string): Promise<UserData | null> => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-me`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('❌ Token inválido o expirado');
      return null;
    }

    const data = await response.json();

    if (data.authenticated && data.user) {
      console.log('✅ Usuario autenticado:', data.user.email);
      return data.user;
    }

    return null;
  } catch (error) {
    console.error('❌ Error validando token:', error);
    return null;
  }
};
```

---

### 4. Flujo Completo de Autenticación

#### Implementar en componente principal o router:

```typescript
// src/App.tsx o equivalente
import { useEffect, useState } from 'react';
import { captureSessionToken, validateToken } from './utils/auth';

function App() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // 1. Capturar token de URL o localStorage
      const token = captureSessionToken();

      if (!token) {
        // 2. Sin token → redirigir al HUB para login
        console.log('🔄 Redirigiendo al HUB para login...');
        const hubAuthUrl = `${import.meta.env.VITE_HUB_URL}/auth?redirect=${encodeURIComponent(window.location.origin)}`;
        window.location.href = hubAuthUrl;
        return;
      }

      // 3. Con token → validar contra el HUB
      const userData = await validateToken(token);

      if (!userData) {
        // 4. Token inválido → limpiar y redirigir
        console.log('🔄 Token inválido, redirigiendo al HUB...');
        localStorage.removeItem('hub_session_token');
        const hubAuthUrl = `${import.meta.env.VITE_HUB_URL}/auth?redirect=${encodeURIComponent(window.location.origin)}`;
        window.location.href = hubAuthUrl;
        return;
      }

      // 5. Token válido → usuario autenticado
      setUser(userData);
      setLoading(false);
      console.log('✅ Autenticación completada');
    };

    initAuth();
  }, []);

  if (loading) {
    return <div>Validando sesión...</div>;
  }

  if (!user) {
    return <div>Redirigiendo al HUB...</div>;
  }

  return (
    <div>
      {/* Tu aplicación LAB aquí */}
      <h1>Bienvenido al Laboratorio, {user.email}</h1>
      <p>Rol: {user.role}</p>
    </div>
  );
}

export default App;
```

---

### 5. Botón de Logout

```typescript
// src/components/Logout.tsx

export const handleLogout = () => {
  // Limpiar token local
  localStorage.removeItem('hub_session_token');

  // Redirigir al HUB (el HUB se encargará de hacer logout completo)
  window.location.href = import.meta.env.VITE_HUB_URL;
};

// En tu componente:
<button onClick={handleLogout}>
  Cerrar Sesión
</button>
```

---

### 6. Contexto de Autenticación (Opcional pero Recomendado)

```typescript
// src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { captureSessionToken, validateToken } from '../utils/auth';

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = captureSessionToken();

      if (!token) {
        const hubAuthUrl = `${import.meta.env.VITE_HUB_URL}/auth?redirect=${encodeURIComponent(window.location.origin)}`;
        window.location.href = hubAuthUrl;
        return;
      }

      const userData = await validateToken(token);

      if (!userData) {
        localStorage.removeItem('hub_session_token');
        const hubAuthUrl = `${import.meta.env.VITE_HUB_URL}/auth?redirect=${encodeURIComponent(window.location.origin)}`;
        window.location.href = hubAuthUrl;
        return;
      }

      setUser(userData);
      setLoading(false);
    };

    initAuth();
  }, []);

  const logout = () => {
    localStorage.removeItem('hub_session_token');
    window.location.href = import.meta.env.VITE_HUB_URL;
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};
```

---

## 🔒 Seguridad

### Consideraciones Importantes:

1. **NUNCA exponer JWT_SECRET en el frontend**
   - El JWT_SECRET está SOLO en el backend (Edge Functions)
   - El frontend SOLO recibe y valida tokens ya firmados

2. **Validar SIEMPRE el token con el HUB**
   - No confíes ciegamente en tokens guardados en localStorage
   - Valida contra `/auth-me` en cada carga de la aplicación

3. **Tokens tienen expiración**
   - Los tokens JWT expiran en 7 días
   - Si un token expira, redirige al HUB para login

4. **CORS está configurado**
   - `lab.asciende.pro` está en la lista de orígenes permitidos
   - Las llamadas a edge functions funcionarán correctamente

5. **Limpiar la URL después de capturar el token**
   - Evita que el token quede expuesto en la URL
   - Usa `window.history.replaceState()` para limpiarlo

---

## 🧪 Testing

### Pruebas a Realizar:

1. **Login directo**
   ```
   1. Ir a https://lab.asciende.pro (sin sesión)
   2. Debe redirigir a hub.asciende.pro/auth
   3. Hacer login
   4. Debe volver a lab.asciende.pro con sesión activa
   ```

2. **Desde el HUB**
   ```
   1. Login en hub.asciende.pro
   2. Ir a Settings → Satélites
   3. Click en "Abrir" en LAB
   4. Debe abrir lab.asciende.pro en nueva pestaña ya autenticado
   ```

3. **Token expirado**
   ```
   1. Abrir lab.asciende.pro con sesión
   2. Modificar manualmente el token en localStorage a uno inválido
   3. Recargar página
   4. Debe redirigir al HUB para nuevo login
   ```

4. **Logout**
   ```
   1. Hacer logout en LAB
   2. Debe limpiar token y redirigir al HUB
   ```

---

## 📊 Información del Usuario

El token JWT contiene:

```typescript
{
  user_id: string;      // UUID del usuario
  email: string;        // Email del usuario
  role: string;         // 'admin' | 'trainer' | 'nutritionist' | 'athlete'
  active_plan: string[]; // Array de planes activos (ej: ['cycling_pro'])
  iat: number;          // Timestamp de emisión
  exp: number;          // Timestamp de expiración
}
```

Puedes usar esta información para:
- Mostrar el email/nombre del usuario
- Verificar permisos según el rol
- Personalizar la experiencia según planes activos

---

## 🚨 Solución de Problemas

### El token no se captura
- Verificar que la URL tenga `?session_token=...`
- Verificar console.log en `captureSessionToken()`
- Revisar permisos de localStorage

### Token inválido o expirado
- Verificar que `VITE_SUPABASE_URL` sea correcta
- El token debe ser el JWT del HUB, NO el de Supabase
- Revisar respuesta de `/auth-me` en Network tab

### CORS errors
- `lab.asciende.pro` ya está en la whitelist de `auth-me`
- Verificar que la URL del satélite sea exactamente `https://lab.asciende.pro`

### Redirección infinita
- Verificar que NO estés redirigiendo cuando ya tienes token válido
- Revisar lógica de `initAuth()` para evitar loops

---

## 📝 Checklist de Implementación

- [ ] Crear archivo `.env` con variables de entorno
- [ ] Implementar `captureSessionToken()`
- [ ] Implementar `validateToken()`
- [ ] Crear flujo de autenticación en App.tsx o router
- [ ] Implementar botón de logout
- [ ] (Opcional) Crear AuthContext
- [ ] Probar login directo a lab.asciende.pro
- [ ] Probar apertura desde botón en HUB
- [ ] Probar logout
- [ ] Probar con token expirado/inválido

---

## 🎉 ¡Listo!

Con esta guía, el satélite LAB debería integrarse perfectamente con el HUB de Asciende, proporcionando una experiencia de autenticación unificada y segura.

Para cualquier duda o problema, revisar los logs en:
- Console del navegador (frontend)
- Supabase Edge Functions logs (backend)
- Network tab para requests HTTP
