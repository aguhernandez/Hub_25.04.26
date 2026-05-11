# Índice Completo de Integración de Satélites

## Documentación de Referencia

### 1. Autenticación de Satélites
- **SATELLITE_AUTH_INTEGRATION_GUIDE.md** - Guía técnica completa de autenticación
- **SATELLITE_INTEGRATION_PROMPT.md** - Prompts listos para cada satélite
- **src/utils/satelliteAuthClient.ts** - Cliente reutilizable para auth

### 2. Pasaporte Biológico
- **BIOLOGICAL_PASSPORT_TOKEN_GUIDE.md** - Guía técnica del sistema de tokens
- **BIOLOGICAL_PASSPORT_SYSTEM_SUMMARY.md** - Resumen arquitectura completo
- **ACADEMY_BIOLOGICAL_PASSPORT_PROMPT.md** - Prompt específico para Academy
- **ACADEMY_TAGS_AND_PASSPORT_INTEGRATION.md** - Integración tags + pasaporte
- **src/utils/biologicalPassportTokenClient.ts** - Cliente para acceder pasaporte

---

## Flujo Rápido por Satélite

### Lab (lab.asciende.pro)
```
1. Usa: https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/lab-auth
2. Captura pasaporte biológico del usuario
3. Envía al Hub via push-to-hub
4. Hub almacena en biological_passports
```

### Academy (academy.asciende.pro)
```
1. Usa: https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/academy-auth
2. Recibe: token JWT + passport_token
3. Usa passport_token con X-Token-Passport para obtener pasaporte
4. Personaliza cursos y contenido según datos biométricos
```

### Endurance (endurance.asciende.pro)
```
1. Usa: https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/endurance-auth
2. Recibe: token JWT (+ passport_token si necesita)
3. Integra entrenamientos de resistencia
```

### Nutrition (nutrition.asciende.pro)
```
1. Usa: https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/nutrition-auth
2. Recibe: token JWT (+ passport_token si necesita)
3. Personaliza planes según datos del Hub
```

### Motion (motion.asciende.pro)
```
1. Usa: https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/motion-auth
2. Recibe: token JWT (+ passport_token si necesita)
3. Tracks movimiento y movilidad
```

### Performance (performance.asciende.pro)
```
1. Usa: https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/performance-auth
2. Recibe: token JWT (+ passport_token si necesita)
3. Analiza rendimiento deportivo
```

---

## Edge Functions Deployadas

| Función | Endpoint | Método | Headers |
|---------|----------|--------|---------|
| **academy-auth** | `/academy-auth` | POST | Content-Type |
| **lab-auth** | `/lab-auth` | POST | Content-Type |
| **endurance-auth** | `/endurance-auth` | POST | Content-Type |
| **nutrition-auth** | `/nutrition-auth` | POST | Content-Type |
| **motion-auth** | `/motion-auth` | POST | Content-Type |
| **performance-auth** | `/performance-auth` | POST | Content-Type |
| **biological-passport-access** | `/biological-passport-access` | GET | X-Token-Passport |

---

## Tablas de Base de Datos

### `biological_passport_tokens` (NUEVA)
```
Almacena tokens hasheados para acceder pasaportes
- id (UUID, PK)
- athlete_id (FK: auth.users)
- biological_passport_id (FK: biological_passports)
- token_hash (TEXT, UNIQUE)
- is_active (BOOLEAN)
- expires_at (TIMESTAMPTZ)
- last_used_at (TIMESTAMPTZ)
```

### `biological_passports` (EXISTENTE)
```
Contiene datos biométricos del usuario
- id (UUID, PK)
- athlete_id (FK: auth.users)
- sport (VARCHAR)
- vo2_max (NUMERIC)
- max_heart_rate (INT)
- fat_percentage (NUMERIC)
- ... más campos
```

---

## Clientes TypeScript/React

### 1. SatelliteAuthClient
**Ubicación**: `src/utils/satelliteAuthClient.ts`
**Uso**: Autenticación común para todos los satélites

```typescript
import { labAuth } from '@/utils/satelliteAuthClient';
const result = await labAuth.login('email@example.com', 'password');
```

**Métodos**:
- `login(email, password)` - Autenticar
- `logout()` - Cerrar sesión
- `getToken()` - Obtener token guardado
- `isAuthenticated()` - Verificar autenticación
- `isTokenExpiringSoon()` - Alertar expiración
- `hasRole(role)` - Verificar rol
- `hasMembership(level)` - Verificar membresía

### 2. BiologicalPassportTokenClient
**Ubicación**: `src/utils/biologicalPassportTokenClient.ts`
**Uso**: Acceder a pasaporte biológico en Academy

```typescript
import { passportClient } from '@/utils/biologicalPassportTokenClient';
const data = await passportClient.getPassport(passportToken);
```

**Métodos**:
- `getPassport(token)` - Obtener pasaporte
- `getTrainingZones(passport)` - Calcular zonas HR
- `getBodyComposition(passport)` - Composición corporal
- `getAerobicCapacity(passport)` - Datos aeróbicos
- `getDaysSinceCreation(passport)` - Días desde captura
- `clearCache()` - Limpiar caché

---

## URLs Rápidas de Referencia

### Hub Supabase
```
https://ngkcbygyoobqhlmlnuvl.supabase.co
```

### Funciones de Autenticación
```
https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/{satellite}-auth
```

### Función de Pasaporte
```
https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/biological-passport-access
```

---

## Checklist de Integración

### Para Academy
- [ ] Cambiar URL de login a academy-auth
- [ ] Guardar ambos tokens (JWT + passport_token)
- [ ] Obtener pasaporte con passport_token
- [ ] Mostrar datos biométricos en perfil
- [ ] Personalizar cursos según datos
- [ ] Mostrar zonas de entrenamiento
- [ ] Mostrar composición corporal
- [ ] Cachear datos del pasaporte

### Para Otros Satélites
- [ ] Cambiar URL de login a {satellite}-auth
- [ ] Guardar JWT token
- [ ] (Opcional) Obtener passport_token si necesita datos biométricos
- [ ] Integrar con datos existentes del Hub

---

## Testing de Endpoints

```bash
# Login
curl -X POST https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/lab-auth \
  -H "Content-Type: application/json" \
  -d '{"email":"test@asciende.pro","password":"password123"}'

# Obtener Pasaporte
curl -X GET https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/biological-passport-access \
  -H "X-Token-Passport: {passport_token_aqui}"

# Probar con jq
curl -s https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/lab-auth \
  -H "Content-Type: application/json" \
  -d '{"email":"test@asciende.pro","password":"password123"}' | jq '.passport_token'
```

---

## Seguridad

### Tokens
- **Auth JWT**: 7 días
- **Passport Token**: 30 días
- **Hashing**: SHA-256 para passport tokens
- **Storage**: Hash en BD (nunca plaintext)

### Validaciones
- RLS en todas las tablas
- Token expiration automática
- Verificación de propiedad (athlete_id)
- Auditoría de acceso (last_used_at)

### Headers CORS
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Client-Info, Apikey, X-Token-Passport
```

---

## FAQ

**P: ¿Todos los satélites reciben passport_token?**
R: Solo Academy lo recibe automáticamente. Otros pueden configurarlo si lo necesitan.

**P: ¿Qué pasa si passport_token es null?**
R: El usuario no tiene pasaporte activo. La aplicación funciona normalmente sin él.

**P: ¿Cómo refrescar el passport_token?**
R: Login nuevamente. Se genera automáticamente en cada autenticación.

**P: ¿Puedo usar el mismo token en múltiples satélites?**
R: Sí. El token es independiente de la aplicación, solo depende del usuario.

**P: ¿Expira el passport_token?**
R: Sí, después de 30 días. Nuevo login = nuevo token.

---

## Próximos Pasos

1. **Academy**: Implementar integración usando ACADEMY_BIOLOGICAL_PASSPORT_PROMPT.md
2. **Otros Satélites**: Implementar autenticación usando SATELLITE_INTEGRATION_PROMPT.md
3. **Monitoreo**: Revisar logs de acceso en `biological_passport_tokens`
4. **Optimización**: Implementar caché en satélites para reducir requests
5. **Analytics**: Trackear qué datos del pasaporte se usan más

---

## Contacto y Soporte

Para preguntas sobre:
- **Autenticación**: Ver SATELLITE_AUTH_INTEGRATION_GUIDE.md
- **Pasaporte Biológico**: Ver BIOLOGICAL_PASSPORT_SYSTEM_SUMMARY.md
- **Implementación en Academy**: Ver ACADEMY_BIOLOGICAL_PASSPORT_PROMPT.md
- **Integración de Tags**: Ver ACADEMY_TAGS_AND_PASSPORT_INTEGRATION.md
