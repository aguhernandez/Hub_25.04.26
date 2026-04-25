# Sistema de Autenticación Centralizada - Guía de Implementación para Satélites

## 🎯 Resumen Ejecutivo

El **HUB (hub.asciende.pro)** maneja toda la autenticación. Los satélites solo validan la sesión mediante cookies compartidas.

### **✅ Estado del Sistema**
- ✅ Edge Functions desplegadas
- ✅ Autenticación JWT implementada
- ✅ Soporte de redirect en AuthPage
- ✅ Cookies compartidas en dominio `.asciende.pro`

---

## 🚀 Implementación Rápida (15 minutos)

### **Paso 1: Configurar Variables de Entorno**

En tu aplicación satélite, usa las **MISMAS** credenciales del HUB:

```bash
# .env
VITE_SUPABASE_URL=https://ngkcbygyoobqhlmlnuvl.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

### **Paso 2: Crear Hook de Autenticación**

Crea `src/hooks/useSatelliteAuth.ts`:

```typescript
import { useState, useEffect } from 'react';

const HUB_URL = 'https://hub.asciende.pro';
// Para desarrollo local: const HUB_URL = 'http://localhost:5173';

interface User {
  id: string;
  email: string;
  role: 'athlete' | 'trainer' | 'admin';
  active_plan: string[];
}

export function useSatelliteAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch(`${HUB_URL}/functions/v1/auth-me`, {
        method: 'GET',
        credentials: 'include', // CRÍTICO: Envía cookies
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          setUser(data.user);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    const currentUrl = window.location.href;
    window.location.href = `${HUB_URL}?redirect=${encodeURIComponent(currentUrl)}`;
  };

  const logout = async () => {
    await fetch(`${HUB_URL}/functions/v1/auth-logout`, {
      method: 'POST',
      credentials: 'include',
    });
    window.location.href = HUB_URL;
  };

  return { user, loading, login, logout, checkAuth };
}
```

### **Paso 3: Proteger Rutas**

Crea `src/components/ProtectedRoute.tsx`:

```typescript
import { useEffect } from 'react';
import { useSatelliteAuth } from '../hooks/useSatelliteAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, login } = useSatelliteAuth();

  useEffect(() => {
    if (!loading && !user) {
      login(); // Redirige al HUB para autenticación
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Se está redirigiendo al HUB
  }

  return <>{children}</>;
}
```

### **Paso 4: Usar en tu App**

```typescript
// src/App.tsx
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Training from './pages/Training';

function App() {
  return (
    <Routes>
      <Route path="/" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/training" element={
        <ProtectedRoute>
          <Training />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default App;
```

---

## 🔄 Flujo de Autenticación

```
┌─────────────┐
│  Satélite   │  Usuario accede sin sesión
└──────┬──────┘
       │
       ↓
┌─────────────┐
│    HUB      │  Redirige: hub.asciende.pro?redirect=satellite.asciende.pro
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  Usuario    │  Ingresa email/password
│   Login     │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│    HUB      │  Genera JWT → Cookie asciende_auth
└──────┬──────┘  Domain: .asciende.pro
       │
       ↓
┌─────────────┐
│  Satélite   │  Redirige de vuelta con cookie válida
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  Satélite   │  Valida sesión: GET /auth/me
└──────┬──────┘  credentials: 'include'
       │
       ↓
┌─────────────┐
│   Usuario   │  Autenticado ✅
│  Autenticado│
└─────────────┘
```

---

## 📚 Endpoints Disponibles

### **1. GET /functions/v1/auth-me**

Valida la sesión y obtiene datos del usuario.

```javascript
const response = await fetch('https://hub.asciende.pro/functions/v1/auth-me', {
  method: 'GET',
  credentials: 'include', // SIEMPRE incluir
});

const data = await response.json();
// {
//   authenticated: true,
//   user: {
//     id: "uuid",
//     email: "user@example.com",
//     role: "athlete",
//     active_plan: ["asciende_pro"],
//     issued_at: 1234567890,
//     expires_at: 1234567890
//   }
// }
```

### **2. POST /functions/v1/auth-logout**

Cierra la sesión y limpia la cookie.

```javascript
await fetch('https://hub.asciende.pro/functions/v1/auth-logout', {
  method: 'POST',
  credentials: 'include',
});

// Redirigir al HUB
window.location.href = 'https://hub.asciende.pro';
```

### **3. POST /functions/v1/auth-login** (Solo para HUB)

Los satélites NO llaman directamente a este endpoint. Se usa internamente cuando el usuario inicia sesión en el HUB.

---

## 🔒 Seguridad

### **Configuración de Cookies**

```javascript
// Producción
Domain: .asciende.pro
HttpOnly: true
Secure: true
SameSite: Lax
Max-Age: 604800 (7 días)

// Desarrollo
Domain: localhost
HttpOnly: true
Secure: false
SameSite: Lax
```

### **Validación de Dominios**

Solo estos dominios pueden usar el redirect:
- `localhost` (desarrollo)
- `127.0.0.1` (desarrollo)
- `*.asciende.pro` (producción)
- `webcontainer` (Bolt.new)

---

## 🗄️ Acceso a Datos Compartidos

### **Leer Entrenamientos de Gym desde Satélite Cycling**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Obtener workouts de gym del atleta
const { data: gymWorkouts } = await supabase
  .from('workouts')
  .select(`
    *,
    workout_exercises (
      *,
      exercises (name_es, name_en)
    )
  `)
  .eq('athlete_id', userId)
  .gte('workout_date', startDate)
  .lte('workout_date', endDate);
```

### **Leer Entrenamientos de Cycling desde HUB**

```typescript
// Obtener workouts de cycling del atleta
const { data: cyclingWorkouts } = await supabase
  .from('cycling_workouts')
  .select(`
    *,
    cycling_workout_intervals (*)
  `)
  .eq('athlete_id', userId)
  .gte('workout_date', startDate)
  .lte('workout_date', endDate);
```

### **Vista Integrada de Calendario**

```typescript
// Combinar ambos tipos de entrenamientos
const fetchAllTraining = async (athleteId: string, month: string) => {
  const [gym, cycling] = await Promise.all([
    supabase
      .from('workouts')
      .select('id, workout_date, title, status')
      .eq('athlete_id', athleteId)
      .gte('workout_date', `${month}-01`)
      .lte('workout_date', `${month}-31`),

    supabase
      .from('cycling_workouts')
      .select('id, workout_date, title, status')
      .eq('athlete_id', athleteId)
      .gte('workout_date', `${month}-01`)
      .lte('workout_date', `${month}-31`)
  ]);

  return {
    gym: gym.data || [],
    cycling: cycling.data || []
  };
};
```

---

## 🎨 Mantener Consistencia de Diseño

### **Colores del HUB**

```css
/* Brand Colors */
--primary-yellow: #fdda36;
--primary-purple: #514163;

/* Backgrounds */
--bg-light: #ffffff;
--bg-gray-800: #1f2937;

/* Dark Mode */
.dark {
  --bg-primary: #111827;
  --text-primary: #f9fafb;
}
```

### **Componentes Estándar**

```jsx
// Botón Primario
<button className="px-4 py-2 bg-[#fdda36] text-[#514163] font-semibold rounded-lg hover:bg-[#fce76a] transition-colors">
  Acción
</button>

// Card
<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
  Contenido
</div>
```

---

## 🐛 Troubleshooting

### **Error: "No authentication cookie found"**

**Causa:** La cookie no se está enviando.

**Solución:**
```javascript
// Asegúrate de usar credentials: 'include'
fetch(url, {
  credentials: 'include' // ← CRÍTICO
});
```

### **Error: CORS**

**Causa:** Tu dominio no está en la whitelist.

**Solución:** Verifica que tu satélite esté en:
- `*.asciende.pro` para producción
- `localhost` para desarrollo

### **Error: "Invalid or expired token"**

**Causa:** El token JWT expiró (7 días).

**Solución:** Redirige al usuario al HUB para reautenticación:
```javascript
if (!data.authenticated) {
  login(); // Redirige al HUB
}
```

---

## 📝 Checklist de Implementación

- [ ] Variables de entorno configuradas (MISMAS del HUB)
- [ ] Hook `useSatelliteAuth` creado
- [ ] Componente `ProtectedRoute` implementado
- [ ] Rutas protegidas con `ProtectedRoute`
- [ ] Validación de sesión en cada carga de página
- [ ] Botón de logout implementado
- [ ] Manejo de sesión expirada
- [ ] CORS configurado correctamente
- [ ] `credentials: 'include'` en todas las peticiones
- [ ] Diseño consistente con HUB

---

## 🚦 Ejemplo Completo Funcional

```typescript
// src/App.tsx
import { useSatelliteAuth } from './hooks/useSatelliteAuth';

function App() {
  const { user, loading, login, logout } = useSatelliteAuth();

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <button onClick={login} className="px-6 py-3 bg-[#fdda36] text-[#514163] rounded-lg font-semibold">
          Iniciar Sesión con Asciende
        </button>
      </div>
    );
  }

  return (
    <div>
      <header>
        <p>Bienvenido, {user.email}</p>
        <p>Rol: {user.role}</p>
        <button onClick={logout}>Cerrar Sesión</button>
      </header>
      <main>
        {/* Tu contenido aquí */}
      </main>
    </div>
  );
}

export default App;
```

---

## 🎓 Conceptos Clave

1. **Nunca almacenes passwords** en el satélite
2. **Siempre usa `credentials: 'include'`** en fetch
3. **No accedas a la cookie** directamente con JavaScript (es HttpOnly)
4. **Valida la sesión** en cada carga de página
5. **Redirige al HUB** para login/logout
6. **Usa las mismas credenciales** de Supabase que el HUB

---

## 📞 Soporte

Si algo no funciona:
1. Verifica que estés usando `credentials: 'include'`
2. Verifica que tu dominio esté en `.asciende.pro`
3. Revisa los logs de las Edge Functions en Supabase
4. Verifica que las credenciales de Supabase sean correctas

---

## 🎯 Próximos Pasos

Una vez implementada la autenticación:
1. Crea tablas específicas para tu satélite (ej: `cycling_workouts`)
2. Implementa RLS policies para seguridad
3. Lee datos del HUB cuando sea necesario
4. Mantén el diseño consistente con el HUB

¡Listo! Tu satélite ahora está conectado al sistema de autenticación centralizada del HUB. 🚀
