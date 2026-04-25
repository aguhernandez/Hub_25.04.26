# 🛰️ Sistema de Gestión de Satélites - Guía Completa

## 📋 Índice
1. [Introducción](#introducción)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Permisos por Rol](#permisos-por-rol)
4. [Gestión de Accesos](#gestión-de-accesos)
5. [Sincronización de Datos](#sincronización-de-datos)
6. [Integración para Satélites](#integración-para-satélites)

---

## Introducción

El sistema de satélites de Asciende permite gestionar múltiples aplicaciones especializadas que comparten una autenticación centralizada y una base de datos común.

### Satélites Disponibles:
- 🚴 **Cycling** - Planificación y análisis de entrenamientos de ciclismo
- 🧪 **Lab** - Análisis de resultados de laboratorio y métricas metabólicas
- 🍎 **Nutrition** - Planificación nutricional y seguimiento de dietas
- 🏃 **Running** - Entrenamiento de carrera y análisis de rendimiento

---

## Arquitectura del Sistema

### Base de Datos Compartida

```
┌─────────────────────────────────────────┐
│          BASE DE DATOS ÚNICA            │
│           (Supabase)                    │
└─────────────────────────────────────────┘
          ↑         ↑         ↑
          │         │         │
     ┌────┴────┬────┴────┬────┴────┐
     │   HUB   │ Cycling │   Lab   │
     └─────────┴─────────┴─────────┘
```

**Ventajas:**
- ✅ **Sin sincronización**: Los cambios son instantáneos
- ✅ **Datos coherentes**: Una sola fuente de verdad
- ✅ **RLS unificado**: Seguridad centralizada

---

## Permisos por Rol

### 👑 Administrador (admin)
- **Acceso completo** a todos los satélites
- Puede otorgar/revocar permisos a cualquier usuario
- Ve estadísticas de uso de todos los satélites

### 🏋️ Entrenador (trainer)
- **Acceso automático** a satélites de categoría `training`:
  - Cycling ✅
  - Running ✅
- **Sin acceso** a:
  - Nutrition ❌
  - Lab ❌ (requiere permiso especial)

### 🥗 Nutricionista (nutritionist)
- **Acceso automático** solo a:
  - Nutrition ✅
- **Sin acceso** a:
  - Cycling ❌
  - Running ❌
  - Lab ❌

### 🏃‍♂️ Atleta (athlete)
- **Acceso automático** a:
  - Todos los satélites excepto los que requieren permiso especial
  - Cycling ✅
  - Running ✅
  - Nutrition ✅
- **Requiere permiso** para:
  - Lab ❌ (permiso especial)

---

## Gestión de Accesos

### Desde el HUB (Settings → Satélites)

Los usuarios pueden ver:
1. **Satélites disponibles** con estado de acceso
2. **Historial de uso**:
   - Última vez que accedieron
   - Total de accesos
3. **Estado de permisos**:
   - Acceso por rol (automático)
   - Acceso otorgado explícitamente
   - Acceso denegado

### Validación de Acceso (Edge Function)

**Endpoint:** `POST /functions/v1/satellite-access`

```typescript
// Validar acceso desde un satélite
const response = await fetch(`${HUB_URL}/functions/v1/satellite-access`, {
  method: 'POST',
  credentials: 'include', // Importante para cookies
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    satellite_name: 'cycling'
  })
});

const data = await response.json();
console.log(data.has_access); // true/false
```

**Respuesta:**
```json
{
  "success": true,
  "has_access": true,
  "satellite": {
    "id": "uuid",
    "name": "cycling",
    "display_name": "Ciclismo",
    "category": "training"
  },
  "message": "Access granted to cycling"
}
```

---

## Sincronización de Datos

### ⚡ Datos Instantáneos

**NO hay sincronización** porque todos los satélites comparten la misma base de datos.

#### Ejemplo Práctico:

```typescript
// Satélite Cycling: Usuario crea un workout
// =========================================
await supabase
  .from('cycling_workouts')
  .insert({
    athlete_id: user.id,
    title: 'Entrenamiento Z2',
    duration: 7200,
    intensity: 'moderate'
  });

// HUB: 0.5 segundos después
// =========================
const { data: workouts } = await supabase
  .from('cycling_workouts')
  .select('*')
  .eq('athlete_id', user.id)
  .order('created_at', { ascending: false });

// ✅ El workout YA está disponible!
console.log(workouts[0].title); // "Entrenamiento Z2"
```

### 🔄 Actualizaciones en Tiempo Real (Opcional)

Si necesitas **notificaciones en tiempo real**, usa Supabase Realtime:

```typescript
// En el HUB: Suscribirse a cambios de cycling
const subscription = supabase
  .channel('cycling-updates')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'cycling_workouts',
      filter: `athlete_id=eq.${userId}`
    },
    (payload) => {
      console.log('Nuevo workout!', payload.new);
      // Actualizar UI inmediatamente
    }
  )
  .subscribe();
```

---

## Integración para Satélites

### 1. Validar Acceso al Cargar la App

```typescript
// En tu satélite (ej: Cycling)
import { useEffect, useState } from 'react';

export function useSatelliteAuth(satelliteName: string) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_HUB_URL}/functions/v1/satellite-access`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ satellite_name: satelliteName })
          }
        );

        const data = await response.json();
        setHasAccess(data.has_access);
      } catch (error) {
        console.error('Error checking satellite access:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [satelliteName]);

  return { hasAccess, loading };
}
```

### 2. Proteger Rutas

```typescript
// ProtectedRoute.tsx
import { useSatelliteAuth } from './useSatelliteAuth';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { hasAccess, loading } = useSatelliteAuth('cycling');

  if (loading) {
    return <div>Verificando acceso...</div>;
  }

  if (!hasAccess) {
    return (
      <div className="text-center p-8">
        <h2>Acceso Denegado</h2>
        <p>No tienes permiso para acceder a este satélite.</p>
        <a href={`${import.meta.env.VITE_HUB_URL}/settings?tab=satellites`}>
          Gestionar Permisos
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
```

### 3. Leer Datos Entre Apps

#### Desde Cycling → Leer datos del HUB (gym workouts)

```typescript
// En satélite Cycling
const { data: gymWorkouts } = await supabase
  .from('training_logs')
  .select('*')
  .eq('athlete_id', userId)
  .eq('workout_type', 'gym')
  .gte('date', startDate)
  .lte('date', endDate);

console.log('Entrenamientos de gimnasio:', gymWorkouts);
```

#### Desde HUB → Leer datos de Cycling

```typescript
// En HUB
const { data: cyclingWorkouts } = await supabase
  .from('cycling_workouts')
  .select('*')
  .eq('athlete_id', userId)
  .gte('date', startDate)
  .lte('date', endDate);

console.log('Entrenamientos de ciclismo:', cyclingWorkouts);
```

---

## 🔐 Seguridad y RLS

### Políticas de Acceso

Las **Row Level Security (RLS) policies** controlan quién puede ver qué datos:

```sql
-- Ejemplo: Solo el atleta y su entrenador ven cycling_workouts
CREATE POLICY "Athletes and trainers can view cycling workouts"
  ON cycling_workouts FOR SELECT
  TO authenticated
  USING (
    athlete_id = auth.uid()
    OR auth.uid() IN (
      SELECT trainer_id FROM athlete_workouts WHERE athlete_id = cycling_workouts.athlete_id
    )
    OR (auth.jwt()->>'user_metadata')::jsonb->>'role' = 'admin'
  );
```

---

## 📊 Tracking y Analytics

### Registro Automático de Accesos

Cada vez que un usuario accede a un satélite, se registra:
- Fecha y hora
- IP address
- User agent
- Duración de sesión (opcional)

### Ver Estadísticas

```typescript
// GET /functions/v1/satellite-access
const response = await fetch(
  `${HUB_URL}/functions/v1/satellite-access`,
  {
    method: 'GET',
    credentials: 'include'
  }
);

const data = await response.json();
console.log(data.satellites);
// [
//   {
//     satellite_name: 'cycling',
//     total_accesses: 45,
//     last_access_at: '2024-01-15T10:30:00Z',
//     has_access: true
//   },
//   ...
// ]
```

---

## 🚀 Casos de Uso

### Caso 1: Entrenador Carga Plan de Ciclismo

1. **Entrenador** entra al satélite **Cycling**
2. Crea un plan de entrenamiento para su atleta
3. **Automáticamente**, el atleta lo ve en:
   - Satélite Cycling (detalles completos)
   - HUB (resumen en calendario)

### Caso 2: Nutricionista NO Accede a Cycling

1. **Nutricionista** intenta entrar a **Cycling**
2. Sistema verifica permisos: `category=training`, `role=nutritionist`
3. **Acceso denegado** → Redirige a página de error
4. Mensaje: "Solo puedes acceder al satélite de Nutrición"

### Caso 3: Admin Otorga Permiso Especial

1. **Admin** va a Settings → Admin → Gestión de Permisos
2. Busca al usuario y selecciona satélite **Lab**
3. Otorga permiso explícito
4. **Inmediatamente**, el usuario puede acceder a Lab

---

## 🛠️ Troubleshooting

### Usuario No Ve Satélite en Settings

**Causa:** El satélite está marcado como `is_active = false`

**Solución:**
```sql
UPDATE satellites SET is_active = true WHERE name = 'cycling';
```

### Acceso Denegado Inesperado

**Verificar:**
1. Permisos explícitos en `user_satellite_permissions`
2. Rol del usuario en `profiles.role`
3. Categoría del satélite en `satellites.category`

**Debug:**
```sql
SELECT check_satellite_access('user-uuid', 'cycling');
-- Retorna: true/false
```

### Datos No Aparecen en Tiempo Real

**Problema:** No estás usando Supabase Realtime

**Solución:** Los datos SÍ están disponibles, solo refresca:
```typescript
// Recargar datos
const { data } = await supabase
  .from('cycling_workouts')
  .select('*')
  .eq('athlete_id', userId);
```

---

## 📚 Recursos Adicionales

- [Documentación de Autenticación Centralizada](./CENTRALIZED_AUTH_HUB.md)
- [Guía Rápida de Satélites](./SATELLITE_AUTH_QUICK_GUIDE.md)
- [Guía del Satélite Cycling](./CYCLING_APP_SATELLITE_GUIDE.md)
- [Implementación de Satélites](./SATELLITE_AUTH_IMPLEMENTATION.md)

---

## ✅ Resumen

1. **Base de datos compartida** → Sin sincronización necesaria
2. **Permisos por rol** → Automáticos según función del usuario
3. **Tracking de accesos** → Analytics y auditoría
4. **RLS policies** → Seguridad a nivel de datos
5. **Datos instantáneos** → Cambios visibles en 0.5 segundos

**¿Preguntas?** Consulta la documentación o contacta al equipo de desarrollo.
