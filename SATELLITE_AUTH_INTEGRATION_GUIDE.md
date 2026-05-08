# Integración de Autenticación de Satélites con Hub

Esta guía describe cómo cada satélite (Lab, Endurance, Nutrition, Motion, Performance) debe autenticarse contra el Hub de Asciende.

## Información General

- **Hub Supabase URL**: `https://ngkcbygyoobqhlmlnuvl.supabase.co`
- **JWT Secret**: Compartido con todos los satélites (heredado del .env del Hub)
- **Token Duración**: 7 días
- **Autenticación**: Email + Password (credenciales del Hub)

---

## URLs de las Funciones de Autenticación

Cada satélite tiene su propia función de autenticación en el Hub:

| Satélite | URL | Endpoint |
|----------|-----|----------|
| **Academy** | `https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/academy-auth` | POST /academy-auth |
| **Lab** | `https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/lab-auth` | POST /lab-auth |
| **Endurance** | `https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/endurance-auth` | POST /endurance-auth |
| **Nutrition** | `https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/nutrition-auth` | POST /nutrition-auth |
| **Motion** | `https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/motion-auth` | POST /motion-auth |
| **Performance** | `https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/performance-auth` | POST /performance-auth |

---

## Implementación en Cada Satélite

### 1. Reemplazar la URL de Autenticación

En tu proyecto (Lab, Endurance, Nutrition, Motion o Performance), **busca todos los lugares donde hace fetch a una función de autenticación** y actualiza la URL.

**Reemplaza:**
```javascript
// Incorrecto - apuntando a Hub como proxy o Supabase local
fetch('https://hub.asciende.pro/functions/v1/...-auth', ...)
fetch('https://xaatkjdbtlptbkdqbmih.supabase.co/functions/v1/...-auth', ...)
```

**Por:**
```javascript
// Correcto - apuntando directo al Hub Supabase
fetch('https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/{SATELLITE}-auth', ...)
```

### 2. Request Payload

**Método**: `POST`
**Headers**:
```javascript
{
  'Content-Type': 'application/json',
  'Origin': 'https://{satellite}.asciende.pro'
}
```

**Body**:
```json
{
  "email": "usuario@example.com",
  "password": "contraseña"
}
```

### 3. Response Success (200)

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "usuario@example.com",
    "name": "Nombre Usuario",
    "role": "athlete",
    "membership_slug": "pro",
    "membership_name": "Asciende Pro"
  }
}
```

### 4. Response Errors

| Código | Significado |
|--------|------------|
| **400** | Email o password faltantes |
| **401** | Credenciales inválidas |
| **405** | Método HTTP no soportado (solo POST/OPTIONS) |
| **500** | Error interno del servidor |

---

## Ejemplo de Implementación Completa

### TypeScript/React

```typescript
async function authenticateWithHub(email: string, password: string, satellite: string) {
  const apiUrl = `https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/${satellite}-auth`;
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Authentication failed');
    }

    const data = await response.json();
    
    // Guardar token en localStorage o sessionStorage
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('user_data', JSON.stringify(data.user));
    
    return data;
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
}

// Uso en Lab
authenticateWithHub('test@asciende.pro', 'password123', 'lab');

// Uso en Endurance
authenticateWithHub('test@asciende.pro', 'password123', 'endurance');

// Y así sucesivamente...
```

---

## Validación del Token

El token JWT contiene estos claims:

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "usuario@example.com",
  "role": "athlete",
  "membership_slug": "pro",
  "membership_name": "Asciende Pro",
  "iat": 1715252345,
  "exp": 1716032345
}
```

**Para validar el token en el satélite:**

1. Decodifica el JWT (sin verificar firma, solo lectura local)
2. Verifica que `exp > Date.now() / 1000`
3. Usa `user_id`, `role`, `membership_slug` para autorización

---

## CORS

Las funciones de autenticación aceptan peticiones desde cualquier origen (`Access-Control-Allow-Origin: *`). No debería haber problemas de CORS.

Si aún hay errores de CORS:
1. Verifica que el método sea POST
2. Usa `Content-Type: application/json`
3. Comprueba que la URL sea exactamente: `https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/{satellite}-auth`

---

## Testing Rápido

```bash
# Test Lab Auth
curl -X POST https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/lab-auth \
  -H "Content-Type: application/json" \
  -d '{"email":"test@asciende.pro","password":"password123"}'

# Test Endurance Auth
curl -X POST https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/endurance-auth \
  -H "Content-Type: application/json" \
  -d '{"email":"test@asciende.pro","password":"password123"}'

# Y así para nutrition, motion, performance...
```

---

## Resumen de Cambios por Satélite

| Satélite | Busca | Reemplaza Por |
|----------|-------|-----------------|
| **Lab** | Cualquier fetch a auth | `https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/lab-auth` |
| **Endurance** | Cualquier fetch a auth | `https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/endurance-auth` |
| **Nutrition** | Cualquier fetch a auth | `https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/nutrition-auth` |
| **Motion** | Cualquier fetch a auth | `https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/motion-auth` |
| **Performance** | Cualquier fetch a auth | `https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/performance-auth` |

Todas usan la misma lógica. El único cambio es el nombre de la función en la URL.

---

## Preguntas Frecuentes

**P: ¿Qué pasa si expira el token?**
R: El usuario debe volver a autenticarse. El token tiene 7 días de duración.

**P: ¿Puedo verificar el token sin hacer otra petición?**
R: Sí, decodifica el JWT y verifica el timestamp `exp`. No necesitas hacer un call adicional.

**P: ¿Y si necesito actualizar la contraseña?**
R: Las contraseñas se actualizan en el Hub de Supabase, no en los satélites. Los satélites solo leen credenciales.

**P: ¿Qué pasa si los servidores del Hub están caídos?**
R: El usuario no podrá autenticarse. Todos los satélites dependen del Hub para autenticación.
