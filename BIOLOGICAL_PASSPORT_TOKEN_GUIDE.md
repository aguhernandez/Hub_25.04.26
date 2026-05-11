# Guía de Token de Pasaporte Biológico para Academy

## Descripción General

Cuando un usuario inicia sesión en Academy a través de la función `academy-auth`, recibe dos tokens:

1. **JWT Token** - Para autenticación en Academy
2. **Passport Token** (`passport_token`) - Para acceder al pasaporte biológico desde el Hub

El pasaporte biológico se obtiene desde el Lab y se almacena en el Hub. Academy puede acceder a este pasaporte usando el token especial `X-Token-Passport`.

---

## Response de academy-auth

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "passport_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6...",
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

---

## Obtener el Pasaporte Biológico en Academy

### Endpoint

```
GET https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/biological-passport-access
```

### Headers Requeridos

```javascript
{
  'Content-Type': 'application/json',
  'X-Token-Passport': 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6...'
}
```

### Request

```bash
curl -X GET https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/biological-passport-access \
  -H "Content-Type: application/json" \
  -H "X-Token-Passport: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
```

### Response Success (200)

```json
{
  "success": true,
  "data": {
    "passport": {
      "id": "550e8400-e29b-41d4-a716-446655440111",
      "athlete_id": "550e8400-e29b-41d4-a716-446655440000",
      "sport": "cycling",
      "vo2_max": 65.5,
      "ventilatory_threshold": 58.2,
      "aerobic_threshold": 45.8,
      "lactate_threshold": 52.1,
      "max_heart_rate": 188,
      "resting_heart_rate": 42,
      "height_cm": 180,
      "weight_kg": 75,
      "fat_percentage": 12.5,
      "muscle_mass_kg": 65,
      "body_composition_method": "dexa",
      "status": "active",
      "version_number": 1,
      "source": "lab",
      "created_at": "2026-05-10T14:30:00Z",
      "updated_at": "2026-05-10T14:30:00Z",
      ...
    },
    "athlete": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Nombre Usuario",
      "avatar_url": "https://...",
      "email": "usuario@example.com"
    }
  }
}
```

### Response Errors

| Código | Significado |
|--------|------------|
| **400** | X-Token-Passport header faltante |
| **401** | Token inválido, expirado o inactivo |
| **404** | Pasaporte no encontrado |
| **405** | Método HTTP no soportado (solo GET) |
| **500** | Error interno del servidor |

---

## Implementación en Academy

### TypeScript/React

```typescript
async function fetchPassportBiological(passportToken: string) {
  const apiUrl = 'https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/biological-passport-access';
  
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Token-Passport': passportToken,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch passport');
    }

    const data = await response.json();
    return data.data; // { passport, athlete }
  } catch (error) {
    console.error('Passport fetch error:', error);
    throw error;
  }
}

// Uso después del login
async function handleAcademyLogin(email: string, password: string) {
  const authResponse = await fetch('https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/academy-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const auth = await authResponse.json();
  
  // Guardar tokens
  localStorage.setItem('academy_auth_token', auth.token);
  localStorage.setItem('academy_passport_token', auth.passport_token);

  // Si hay passport_token, obtener el pasaporte
  if (auth.passport_token) {
    try {
      const passportData = await fetchPassportBiological(auth.passport_token);
      console.log('Passport:', passportData.passport);
      console.log('Athlete:', passportData.athlete);
      // Usar los datos del pasaporte en Academy
      store.setPassport(passportData.passport);
    } catch (error) {
      console.warn('Could not fetch passport:', error);
      // Academy puede funcionar sin pasaporte
    }
  }

  return auth;
}
```

---

## Características del Token de Pasaporte

| Propiedad | Descripción |
|-----------|------------|
| **Duración** | 30 días |
| **Tipo de Almacenamiento** | Hash SHA-256 (nunca se almacena en plaintext) |
| **Acceso** | Solo a través del header `X-Token-Passport` |
| **Expiración** | Automática después de 30 días |
| **Vinculación** | 1 token por pasaporte activo por usuario |

---

## Casos de Uso en Academy

### 1. Mostrar Datos de Rendimiento del Athlete

Usar los datos de `vo2_max`, `ventilatory_threshold`, `aerobic_threshold` para mostrar zonas de entrenamiento.

```typescript
const passport = await fetchPassportBiological(passportToken);
const zones = calculateTrainingZones({
  vo2_max: passport.passport.vo2_max,
  max_heart_rate: passport.passport.max_heart_rate,
  threshold: passport.passport.ventilatory_threshold,
});
```

### 2. Mostrar Composición Corporal

Usar `fat_percentage`, `muscle_mass_kg`, `weight_kg` para visualizar cambios en el tiempo.

```typescript
const composition = {
  fat: passport.passport.fat_percentage,
  muscle: passport.passport.muscle_mass_kg,
  total_weight: passport.passport.weight_kg,
  lean_mass: passport.passport.weight_kg - (passport.passport.weight_kg * passport.passport.fat_percentage / 100),
};
```

### 3. Personalizar Contenido por Deporte

El campo `sport` indica para qué deporte fue medido el pasaporte.

```typescript
if (passport.passport.sport === 'cycling') {
  // Mostrar contenido específico para ciclismo
  showCyclingSpecificCourses();
} else if (passport.passport.sport === 'running') {
  // Mostrar contenido específico para running
  showRunningSpecificCourses();
}
```

---

## Ventajas del Sistema

1. **Seguro** - Token hasheado, no se almacena en plaintext
2. **Escalable** - Mismo sistema que X-Planner-Token
3. **Expiración Automática** - 30 días de validez
4. **Auditable** - Se registra cada acceso
5. **Flexible** - Funciona independientemente del JWT de Academy

---

## FAQ

**P: ¿Qué pasa si el passport_token es null?**
R: El usuario no tiene pasaporte activo. Academy puede funcionar sin él, solo sin datos biométricos.

**P: ¿Se puede refrescar el passport_token?**
R: No. Expira en 30 días. En el siguiente login se genera uno nuevo automáticamente.

**P: ¿Puedo usar el passport_token en otros satélites?**
R: No. Cada satélite (Lab, Endurance, Nutrition, Motion, Performance) tiene su propio sistema si lo necesita.

**P: ¿El passport_token se valida en cada request?**
R: Sí. Cada acceso valida el token y actualiza `last_used_at`.

**P: ¿Qué datos incluye el pasaporte?**
R: Todos los datos biométricos capturados por el Lab: VO2max, umbrales, composición corporal, frecuencia cardíaca, etc.
