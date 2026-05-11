# Prompt para Integración de Pasaporte Biológico en Academy

Usa este prompt en el proyecto de Academy para integrar el pasaporte biológico del usuario.

---

## Prompt para Academy

```
El Hub de Asciende ahora envía un token especial de pasaporte biológico en la respuesta de academy-auth.

La respuesta de login ahora incluye:

{
  "token": "JWT de autenticación",
  "passport_token": "token especial para acceder al pasaporte",
  "user": { ... }
}

El passport_token es un token de acceso seguro (hasheado en base de datos, expira en 30 días) 
que permite obtener el pasaporte biológico del usuario desde el Hub.

CAMBIOS A HACER:

1. Después del login, guarda AMBOS tokens:
   - localStorage.setItem('academy_auth_token', auth.token)
   - localStorage.setItem('academy_passport_token', auth.passport_token)

2. Si passport_token existe, obtén el pasaporte biológico:
   
   GET https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/biological-passport-access
   
   Header:
   X-Token-Passport: {passport_token}

3. El response contiene:
   {
     "success": true,
     "data": {
       "passport": {
         "vo2_max": 65.5,
         "max_heart_rate": 188,
         "fat_percentage": 12.5,
         "sport": "cycling",
         ...más campos
       },
       "athlete": {
         "id": "user_id",
         "name": "Nombre",
         "avatar_url": "...",
         "email": "..."
       }
     }
   }

4. Usa los datos del pasaporte para:
   - Mostrar zonas de entrenamiento (vo2_max, max_heart_rate)
   - Mostrar composición corporal (fat_percentage, weight_kg)
   - Personalizar contenido por deporte (sport field)
   - Mostrar datos biométricos en perfil de usuario

ARCHIVOS DE REFERENCIA EN EL HUB:
- BIOLOGICAL_PASSPORT_TOKEN_GUIDE.md - Documentación completa
- src/utils/biologicalPassportTokenClient.ts - Cliente reutilizable (puedes copiar)

El sistema usa X-Token-Passport exactamente como X-Planner-Token:
- Token seguro hasheado
- Expira automáticamente
- Se registra cada acceso
- No depende del JWT de Academy
```

---

## Pasos Detallados

### 1. Actualizar Función de Login

```typescript
async function handleAcademyLogin(email: string, password: string) {
  const response = await fetch(
    'https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/academy-auth',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }
  );

  const auth = await response.json();

  // Guardar tokens
  localStorage.setItem('academy_auth_token', auth.token);
  
  // NUEVO: Guardar passport token si existe
  if (auth.passport_token) {
    localStorage.setItem('academy_passport_token', auth.passport_token);
  }

  // NUEVO: Obtener el pasaporte si existe token
  if (auth.passport_token) {
    try {
      const passportData = await fetchPassportBiological(auth.passport_token);
      if (passportData) {
        // Usar los datos del pasaporte
        store.setUserPassport(passportData.passport);
        store.setAthleteInfo(passportData.athlete);
      }
    } catch (error) {
      console.warn('Could not fetch passport:', error);
    }
  }

  return auth;
}
```

### 2. Crear Función de Acceso al Pasaporte

```typescript
async function fetchPassportBiological(passportToken: string) {
  const response = await fetch(
    'https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/biological-passport-access',
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Token-Passport': passportToken,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch passport');
  }

  const data = await response.json();
  return data.data; // { passport, athlete }
}
```

### 3. Usar Datos del Pasaporte

```typescript
// Mostrar zonas de entrenamiento
const passport = store.getUserPassport();
if (passport?.vo2_max && passport?.max_heart_rate) {
  const zones = calculateTrainingZones(passport);
  displayZonesChart(zones);
}

// Mostrar composición corporal
if (passport?.weight_kg && passport?.fat_percentage) {
  const composition = {
    weight: passport.weight_kg,
    fat: passport.weight_kg * passport.fat_percentage / 100,
    lean: passport.weight_kg * (1 - passport.fat_percentage / 100),
  };
  displayBodyComposition(composition);
}

// Personalizar por deporte
if (passport?.sport === 'cycling') {
  showCyclingCourses();
} else if (passport?.sport === 'running') {
  showRunningCourses();
}
```

---

## Manejo de Errores

El passport_token puede no existir si:
- El usuario no tiene un pasaporte activo en el Lab
- El Lab aún no ha enviado datos al Hub

En estos casos, simplemente omitir datos del pasaporte en la UI.

```typescript
// Siempre verificar antes de usar
const passport = store.getUserPassport();
if (!passport) {
  showGenericContent(); // Sin datos del pasaporte
} else {
  showPersonalizedContent(passport); // Con datos del pasaporte
}
```

---

## Testing

```bash
# Login
curl -X POST https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/academy-auth \
  -H "Content-Type: application/json" \
  -d '{"email":"test@asciende.pro","password":"password123"}'

# Esto devuelve: { token, passport_token, user }

# Obtener pasaporte
curl -X GET https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/biological-passport-access \
  -H "X-Token-Passport: {passport_token_aqui}"
```

---

## Notas Importantes

1. **Seguridad**: El token está hasheado en la base de datos. No se almacena nunca en plaintext.
2. **Expiración**: El token expira en 30 días. En el próximo login se genera uno nuevo automáticamente.
3. **Opcional**: Si no hay pasaporte, Academy funciona normalmente sin datos biométricos.
4. **Independencia**: El token de pasaporte NO depende del JWT de Academy. Puedes tener ambos expirados/válidos independientemente.
5. **Caching**: Es recomendable cachear los datos del pasaporte por 5-10 minutos para evitar requests innecesarios.
