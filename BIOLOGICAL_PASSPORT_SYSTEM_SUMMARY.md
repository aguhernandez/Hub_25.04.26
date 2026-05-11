# Resumen del Sistema de Pasaporte Biológico para Satélites

## Visión General

Se ha implementado un sistema completo de tokens para compartir el pasaporte biológico desde el Hub hacia los satélites (Academy, Lab, Endurance, Nutrition, Motion, Performance).

El pasaporte se captura en **Lab**, se almacena en el **Hub**, y ahora puede ser accedido por **Academy** y otros satélites usando un token seguro especial: `X-Token-Passport`.

---

## Componentes Implementados

### 1. Base de Datos: Tabla `biological_passport_tokens`

**Ubicación**: Migración Supabase
**Propósito**: Almacenar tokens hasheados de acceso a pasaportes biológicos

```sql
biological_passport_tokens:
  - id (UUID, PK)
  - athlete_id (FK: auth.users)
  - biological_passport_id (FK: biological_passports)
  - token_hash (TEXT, UNIQUE, hasheado con SHA-256)
  - is_active (BOOLEAN)
  - created_at (TIMESTAMPTZ)
  - expires_at (TIMESTAMPTZ) -- 30 días desde creación
  - last_used_at (TIMESTAMPTZ)
  - created_by (TEXT)
```

**Seguridad**:
- RLS habilitado: Solo system puede gestionar
- Tokens nunca se almacenan en plaintext
- Hash SHA-256 para verificación
- Expiración automática

---

### 2. Edge Function: `biological-passport-access`

**Endpoint**: `GET /functions/v1/biological-passport-access`

**Header Requerido**: `X-Token-Passport: {token}`

**Response**:
```json
{
  "success": true,
  "data": {
    "passport": { ...biological_passport_data },
    "athlete": {
      "id": "user_id",
      "name": "Nombre",
      "avatar_url": "...",
      "email": "..."
    }
  }
}
```

**Validaciones**:
- Verifica que el token sea válido
- Revisa que no esté expirado
- Actualiza `last_used_at` en cada acceso
- Retorna solo el pasaporte del usuario propietario

---

### 3. Modificación: Función `academy-auth`

**Cambios**:
- Genera un token de pasaporte biológico único
- Busca el pasaporte activo del usuario
- Hashea el token antes de guardarlo
- Incluye `passport_token` en la respuesta de login

**Response Actualizado**:
```json
{
  "token": "JWT de autenticación",
  "passport_token": "token seguro para acceder al pasaporte",
  "user": { ...user_data }
}
```

**Nota**: Los otros satélites (Lab, Endurance, Nutrition, Motion, Performance) también pueden recibir este token si lo necesitan.

---

### 4. Cliente TypeScript: `biologicalPassportTokenClient.ts`

**Ubicación**: `src/utils/biologicalPassportTokenClient.ts`

**Métodos**:
- `getPassport(token)` - Obtener pasaporte con token
- `getPassportFromStorage()` - Obtener desde localStorage
- `getTrainingZones()` - Calcular zonas de frecuencia cardíaca
- `getBodyComposition()` - Resumen de composición corporal
- `getAerobicCapacity()` - Datos aeróbicos
- `clearCache()` - Limpiar caché
- `getDaysSinceCreation()` - Días desde captura

**Características**:
- Caché automático (5 minutos TTL)
- Manejo de errores
- Helper methods para datos comunes
- Zero-dependency (solo fetch estándar)

---

## Flujo de Datos

```
1. Usuario inicia sesión en Academy
   ↓
2. Academy-auth autentica contra Hub
   ↓
3. Hub verifica credenciales en auth.users
   ↓
4. Hub obtiene pasaporte activo del usuario
   ↓
5. Hub genera token para pasaporte
   ↓
6. Hub hashea token y lo guarda en BD
   ↓
7. Hub responde con JWT + passport_token
   ↓
8. Academy guarda ambos tokens en localStorage
   ↓
9. Academy usa passport_token con X-Token-Passport
   ↓
10. Hub valida token, hashea y compara
   ↓
11. Hub responde con pasaporte completo
   ↓
12. Academy muestra datos en UI
```

---

## Seguridad

### Token Hashing
- **Algoritmo**: SHA-256
- **Almacenamiento**: Hash en BD, nunca plaintext
- **Transmisión**: HTTPS solo

### Validaciones
- Token debe existir y estar activo
- Token no debe estar expirado (30 días)
- Pasaporte debe perteneccer al usuario (athlete_id)
- RLS bloquea acceso desde otros usuarios

### Expiración
- **Automática**: 30 días después de creación
- **Nueva Generación**: Cada login genera nuevo token
- **Límpieza**: Tokens expirados quedan en BD como histórico

---

## Documentación Proporcionada

| Archivo | Propósito | Audiencia |
|---------|-----------|-----------|
| `BIOLOGICAL_PASSPORT_TOKEN_GUIDE.md` | Guía técnica completa | Desarrolladores |
| `ACADEMY_BIOLOGICAL_PASSPORT_PROMPT.md` | Prompt lista para copy-paste | Academy Dev Team |
| `biologicalPassportTokenClient.ts` | Cliente reutilizable | Todos los satélites |
| `biologicalPassportService.ts` (existente) | Servicio del Hub | Hub |

---

## Uso en Academy

### Paso 1: Login
```typescript
const auth = await academyAuth.login('email@example.com', 'password');
// Response includes: token, passport_token, user
```

### Paso 2: Guardar Token
```typescript
localStorage.setItem('academy_passport_token', auth.passport_token);
```

### Paso 3: Obtener Pasaporte
```typescript
const passportData = await passportClient.getPassport(auth.passport_token);
// passportData.passport = { vo2_max, zones, composición, etc }
// passportData.athlete = { nombre, avatar, etc }
```

### Paso 4: Usar Datos
```typescript
const zones = passportClient.getTrainingZones(passportData.passport);
const composition = passportClient.getBodyComposition(passportData.passport);
// Mostrar en UI...
```

---

## Extensión a Otros Satélites

Si otros satélites necesitan acceso al pasaporte biológico, el proceso es idéntico:

1. Modificar su función de autenticación para generar `passport_token` (si es necesario)
2. Copiar el cliente `biologicalPassportTokenClient.ts`
3. Usar el mismo endpoint `/biological-passport-access`
4. Usar el mismo header `X-Token-Passport`

El sistema es totalmente reutilizable.

---

## Ventajas del Diseño

✓ **Seguro**: Tokens hasheados, no en plaintext
✓ **Escalable**: Mismo patrón que X-Planner-Token
✓ **Flexible**: Funciona independientemente del JWT
✓ **Auditable**: Cada acceso se registra
✓ **Expiración Automática**: No requiere cleanup manual
✓ **Caché Opcional**: Reduce requests innecesarios
✓ **Zero-Dependency**: Solo fetch estándar

---

## Próximos Pasos

1. **Academy**: Integrar el cliente en el login de Academy
2. **UI Academy**: Mostrar datos del pasaporte en perfil/dashboard
3. **Otros Satélites**: Decidir si necesitan acceso (Lab, Endurance, etc)
4. **Monitoreo**: Revisar logs de acceso en `biological_passport_tokens.last_used_at`

---

## Troubleshooting

**P: `passport_token` es null?**
- Usuario no tiene pasaporte activo
- Academy puede funcionar sin él

**P: Error 401 al acceder al pasaporte?**
- Token expirado (30 días)
- Token no válido o inactivo
- Usuario debe hacer login nuevamente

**P: Pasaporte desactualizado?**
- Es una copia en punto-en-tiempo desde Lab
- Si Lab actualizó el pasaporte, obtener nuevo token en login

**P: ¿Cómo refrescar sin login?**
- No es posible. Requiere nuevo login para nuevo token.
- Caché local ayuda a reducir requests.
