# Group Workout Assignment System - Guía Completa

## 📋 Overview

El Workout Builder ahora permite asignar entrenamientos no solo a atletas individuales, sino también a equipos completos y membresías. Esto simplifica enormemente la gestión de entrenamientos grupales.

## 🎯 Tipos de Asignación

### 1. **Individual** (Como antes)
- Asigna el entrenamiento a un atleta específico
- Selección directa del atleta de la lista

### 2. **Team** (NUEVO)
- Asigna el entrenamiento a todos los miembros de un equipo
- Útil para entrenamientos de equipo o sesiones grupales
- Conectado directamente con Teams & Sport

### 3. **Membership** (NUEVO)
- Asigna el entrenamiento a todos los suscriptores activos de una membresía
- Perfecto para programas de entrenamiento premium
- Solo usuarios con membresía activa reciben el entrenamiento

## 🎨 Interfaz de Usuario

### Selector de Tipo de Asignación

```
┌─────────────────────────────────────────────┐
│ Asignar a:                                  │
│ ┌────────────┬────────────┬──────────────┐ │
│ │ Individual │   Equipo   │  Membresía   │ │
│ └────────────┴────────────┴──────────────┘ │
└─────────────────────────────────────────────┘
```

### Vista Individual
```
Seleccionar Atleta
┌────────────────────────────────────────┐
│ Juan Pérez                            ▼│
├────────────────────────────────────────┤
│ Sin asignar                            │
│ Juan Pérez                             │
│ María García                           │
│ Carlos López                           │
└────────────────────────────────────────┘
```

### Vista Team
```
Seleccionar Equipo
┌────────────────────────────────────────┐
│ Beach Volleyball (Beach Volleyball)  ▼│
├────────────────────────────────────────┤
│ Selecciona un equipo                   │
│ Beach Volleyball (Beach Volleyball)    │
│ Cycling Squad (Cycling)                │
└────────────────────────────────────────┘
✓ Se asignará a todos los miembros del equipo
```

### Vista Membership
```
Seleccionar Membresía
┌────────────────────────────────────────┐
│ Premium Training Program              ▼│
├────────────────────────────────────────┤
│ Selecciona una membresía               │
│ Premium Training Program               │
│ Elite Performance Plan                 │
└────────────────────────────────────────┘
✓ Se asignará a todos los suscriptores activos
```

## 🔧 Cómo Funciona

### Backend - Funciones SQL

#### `assign_workout_to_team()`
```sql
SELECT assign_workout_to_team(
  p_workout_id := 'workout-uuid',
  p_team_id := 'team-uuid',
  p_trainer_id := 'trainer-uuid',
  p_scheduled_date := '2025-11-25'
);
-- Returns: número de atletas asignados
```

**Proceso:**
1. Busca todos los miembros del equipo en `team_members`
2. Crea una entrada en `athlete_workouts` para cada miembro
3. Marca `assignment_type = 'team'`
4. Previene duplicados con `ON CONFLICT DO NOTHING`

#### `assign_workout_to_membership()`
```sql
SELECT assign_workout_to_membership(
  p_workout_id := 'workout-uuid',
  p_membership_id := 'membership-uuid',
  p_trainer_id := 'trainer-uuid',
  p_scheduled_date := '2025-11-25'
);
-- Returns: número de suscriptores asignados
```

**Proceso:**
1. Busca todos los suscriptores activos en `user_memberships`
2. Solo incluye `status = 'active'`
3. Crea una entrada en `athlete_workouts` para cada suscriptor
4. Marca `assignment_type = 'membership'`
5. Previene duplicados

### Estructura de Datos

#### Tabla `athlete_workouts` - Nuevos Campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `assignment_type` | text | 'individual', 'team', 'membership' |
| `team_id` | uuid | Referencia al equipo (si aplica) |
| `membership_id` | uuid | Referencia a la membresía (si aplica) |

## 🔐 Seguridad (RLS)

### Permisos de Lectura
```sql
-- Atletas ven:
- Workouts asignados directamente (athlete_id = auth.uid())
- Workouts de sus equipos (via team_id)
- Workouts de sus membresías (via membership_id)

-- Entrenadores ven:
- Workouts que ellos asignaron (trainer_id = auth.uid())

-- Admin ve:
- Todos los workouts
```

### Permisos de Escritura
```sql
-- Solo pueden asignar:
- Creador del team (coach_id)
- Admin
- Trainer (para sus propios teams/memberships)
```

## 📊 Casos de Uso

### Caso 1: Entrenamiento de Equipo
```
Entrenador crea workout:
"Sesión de Fuerza - Semana 3"

Selecciona:
- Tipo: Team
- Team: "Beach Volleyball"
- Fecha: 2025-11-25

Resultado:
✅ Todos los miembros del equipo reciben el workout
✅ Se crea una entrada por cada atleta
✅ Todos ven el workout en su calendario
```

### Caso 2: Programa Premium
```
Entrenador crea workout:
"Elite Strength Program - Day 1"

Selecciona:
- Tipo: Membership
- Membership: "Premium Training Program"
- Fecha: 2025-11-25

Resultado:
✅ Solo suscriptores activos reciben el workout
✅ Si alguien cancela membresía, no recibe futuros workouts
✅ Nuevos suscriptores no reciben workouts pasados
```

### Caso 3: Atleta Individual
```
Entrenador crea workout:
"Recuperación Personalizada - Juan"

Selecciona:
- Tipo: Individual
- Atleta: Juan Pérez
- Fecha: 2025-11-25

Resultado:
✅ Solo Juan recibe el workout
✅ Funcionamiento como siempre
```

## 🎯 Deduplicación

**Problema:** ¿Qué pasa si un atleta está en un Team Y tiene una Membresía?

**Solución Implementada:**

```sql
-- La función usa ON CONFLICT DO NOTHING
-- Esto previene duplicados si el atleta ya tiene ese workout

INSERT INTO athlete_workouts (...)
ON CONFLICT DO NOTHING;
```

**Escenario:**
1. Atleta está en "Beach Volleyball Team"
2. Atleta tiene "Premium Membership"
3. Entrenador asigna workout al Team → ✅ Recibe workout
4. Entrenador asigna MISMO workout a Membership → ❌ No duplica

## 🧪 Testing

### Test 1: Asignación a Team
```javascript
// Como entrenador
1. Ir a Workout Builder
2. Crear workout básico
3. Seleccionar tipo: "Equipo"
4. Elegir un team que creaste
5. Seleccionar fecha
6. Guardar

Verificar:
- Console log muestra "Assigned to N team members"
- Cada atleta del team ve el workout en Training
```

### Test 2: Asignación a Membership
```javascript
// Como entrenador
1. Ir a Workout Builder
2. Crear workout básico
3. Seleccionar tipo: "Membresía"
4. Elegir una membresía activa
5. Seleccionar fecha
6. Guardar

Verificar:
- Console log muestra "Assigned to N membership subscribers"
- Solo suscriptores activos ven el workout
```

### Test 3: Cambio de Tipo
```javascript
// Como entrenador
1. Seleccionar tipo: "Individual"
2. Ver lista de atletas
3. Cambiar a tipo: "Equipo"
4. Ver lista de equipos (atletas se limpian)
5. Cambiar a tipo: "Membresía"
6. Ver lista de membresías (equipos se limpian)

Verificar:
- Solo se muestra el selector apropiado
- Selecciones previas se limpian al cambiar tipo
```

## 🔄 Flujo Completo

```
Entrenador crea Workout
         ↓
Selecciona tipo de asignación
         ↓
    ┌────┴────┬────────┐
    │         │        │
Individual   Team  Membership
    │         │        │
    ↓         ↓        ↓
 1 atleta  N atletas  M suscriptores
    │         │        │
    └─────────┴────────┘
           ↓
  athlete_workouts (N entries)
           ↓
  Atletas ven en Training
```

## 💡 Beneficios

### Para Entrenadores
✅ Asignación masiva en un click
✅ No necesidad de asignar individualmente
✅ Gestión simplificada de grupos
✅ Integración directa con Teams & Memberships

### Para Atletas
✅ Reciben automáticamente workouts de sus grupos
✅ Vista unificada en Training page
✅ No diferencia visible entre tipos de asignación

### Para la Plataforma
✅ Monetización clara via membresías
✅ Valor agregado para teams
✅ Escalabilidad (1 acción → N atletas)
✅ Deduplicación automática

## 📝 Notas Técnicas

### Índices Creados
```sql
CREATE INDEX idx_athlete_workouts_team_id ON athlete_workouts(team_id);
CREATE INDEX idx_athlete_workouts_membership_id ON athlete_workouts(membership_id);
CREATE INDEX idx_athlete_workouts_assignment_type ON athlete_workouts(assignment_type);
```

### Restricciones
- `assignment_type` solo puede ser: 'individual', 'team', 'membership'
- Si `assignment_type = 'team'`, `team_id` debe existir
- Si `assignment_type = 'membership'`, `membership_id` debe existir
- `athlete_id` siempre es requerido (se expande desde grupos)

### Console Logs
```javascript
// Para debugging
console.log(`Assigned to ${result} team members`);
console.log(`Assigned to ${result} membership subscribers`);
```

## 🎯 My Athletes Page - Vista de Teams (✅ IMPLEMENTADO)

### Tres Vistas Disponibles

**Vista "Todos":**
- Muestra todos los atletas en cuadrícula
- Individuales + Teams mezclados

**Vista "1 a 1":**
- Solo atletas asignados directamente
- Filtra los de teams

**Vista "En Equipos" (NUEVO):**
- Agrupa atletas por team
- Header con gradiente morado + icono
- Muestra nombre del team y contador de atletas
- Cards compactas dentro de cada grupo

### Diseño de la Vista de Teams

```
┌─ Beach Volleyball ─────────────────────────┐
│ 👥 Beach Volleyball                        │
│ 8 atletas                                  │
├────────────────────────────────────────────┤
│ [Atleta 1] [Atleta 2] [Atleta 3]          │
│ [Atleta 4] [Atleta 5] [Atleta 6]          │
│ [Atleta 7] [Atleta 8]                      │
└────────────────────────────────────────────┘
```

### Beneficios

✅ Vista clara de la estructura de equipos
✅ Acceso rápido a todos los miembros de un team
✅ Integración perfecta con Workout Builder
✅ Mismo acceso a funciones (Calendario, Nutrición, Performance, etc.)

## 🚀 Próximos Pasos Sugeridos (Opcionales)

### Historial de Asignaciones
Ver qué workouts fueron asignados a grupos y cuándo

### Notificaciones
Enviar notificación a todos los miembros cuando se asigna a grupo

### Estadísticas
Dashboard mostrando workouts asignados por tipo

## 🎓 Preguntas Frecuentes

**Q: ¿Puedo asignar a múltiples equipos a la vez?**
A: No por ahora. Debes hacer asignaciones separadas para cada equipo.

**Q: ¿Qué pasa si un atleta se une al equipo después de asignar el workout?**
A: No recibe workouts pasados. Solo recibe futuros workouts asignados después de unirse.

**Q: ¿Puedo ver cuántos atletas recibirán el workout antes de asignar?**
A: Actualmente no, pero el console log muestra el count después de asignar.

**Q: ¿Los atletas saben que el workout viene de un team o membership?**
A: Actualmente no hay indicador visual, todos ven el workout igual.

## ✅ Completado

- ✅ Base de datos: Nuevos campos y funciones
- ✅ RLS: Policies actualizadas
- ✅ UI Workout Builder: Selector de tres tipos (Individual/Team/Membership)
- ✅ Backend: Lógica de asignación masiva
- ✅ Deduplicación: ON CONFLICT DO NOTHING
- ✅ Permisos: Solo creadores pueden asignar
- ✅ My Athletes: Vista agrupada por teams
- ✅ Build: Exitoso sin errores

¡El sistema está completamente listo para usar! 🎉
