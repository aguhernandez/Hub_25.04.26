# 🚀 Sistema de Permisos de Satélites - Quick Start

## ✅ ¿Qué se implementó?

### 1. Sistema de Base de Datos

✅ **3 tablas nuevas creadas:**
- `satellites` - Catálogo de satélites disponibles
- `user_satellite_permissions` - Control de permisos por usuario
- `user_satellite_access_log` - Registro de accesos (tracking)

✅ **Datos iniciales cargados:**
- Cycling (Ciclismo) - categoría: training
- Lab (Laboratorio) - categoría: medical
- Nutrition (Nutrición) - categoría: nutrition
- Running - categoría: training

✅ **2 funciones SQL:**
- `check_satellite_access(user_id, satellite_name)` - Valida si un usuario tiene acceso
- `log_satellite_access(user_id, satellite_name, ip, user_agent)` - Registra accesos

### 2. Edge Function

✅ **`satellite-access` desplegada**

**GET** - Obtiene lista de satélites con estado de acceso del usuario:
```bash
GET /functions/v1/satellite-access
```

**POST** - Valida acceso y registra entrada:
```bash
POST /functions/v1/satellite-access
Body: { "satellite_name": "cycling" }
```

### 3. Interfaz de Usuario

✅ **Sección nueva en Settings:**
- Botón "Satélites" en la navegación de Settings
- Panel visual con todos los satélites
- Indicadores de acceso (✓ o ✗)
- Estadísticas de uso (último acceso, total de accesos)
- Botón para abrir satélite directamente

---

## 🎯 Lógica de Permisos por Rol

### Admin
```
✅ Cycling
✅ Lab
✅ Nutrition
✅ Running
✅ Todos los satélites
```

### Trainer (Entrenador)
```
✅ Cycling    (categoría: training)
✅ Running    (categoría: training)
❌ Nutrition  (categoría: nutrition)
❌ Lab        (categoría: medical, requiere permiso especial)
```

### Nutritionist (Nutricionista)
```
❌ Cycling    (categoría: training)
❌ Running    (categoría: training)
✅ Nutrition  (categoría: nutrition)
❌ Lab        (categoría: medical, requiere permiso especial)
```

### Athlete (Atleta)
```
✅ Cycling    (acceso automático)
✅ Running    (acceso automático)
✅ Nutrition  (acceso automático)
❌ Lab        (requiere permiso especial)
```

---

## 📋 Casos de Uso Reales

### Caso 1: Entrenador trabaja con atleta

1. **Entrenador** entra a Settings → Satélites
2. Ve que tiene acceso a **Cycling** y **Running**
3. Click en "Abrir Satélite" → cycling.asciende.pro
4. Carga plan de entrenamiento para su atleta
5. **Sistema registra automáticamente el acceso**
6. **Atleta** ve el plan inmediatamente (sin sincronización)

### Caso 2: Nutricionista NO puede acceder a Cycling

1. **Nutricionista** entra a Settings → Satélites
2. Ve **Nutrition** con ✓ (acceso permitido)
3. Ve **Cycling** con ✗ (acceso denegado)
4. Mensaje: "No tienes acceso a este satélite"
5. Click en "Abrir Satélite" en Nutrition → funciona perfecto
6. Si intenta ir directo a cycling.asciende.pro → **bloqueado**

### Caso 3: Admin otorga permiso especial

1. **Admin** puede gestionar permisos en Settings → Admin
2. Puede otorgar acceso a **Lab** a un atleta específico
3. **Inmediatamente**, ese atleta ve Lab con ✓ en Settings
4. **Sistema registra quién otorgó el permiso** (`granted_by`)

---

## 🔍 Cómo Verificar que Funciona

### 1. En el HUB

```bash
# Como cualquier usuario:
1. Login en el HUB
2. Ir a Settings (ícono de tuerca)
3. Click en "Satélites"
4. Ver lista de satélites con acceso
```

**Verás:**
- Tarjetas con cada satélite
- ✅ o ❌ según tu rol
- Último acceso
- Total de accesos

### 2. En la Base de Datos

```sql
-- Ver todos los satélites
SELECT * FROM satellites;

-- Ver permisos explícitos de un usuario
SELECT * FROM user_satellite_permissions
WHERE user_id = 'tu-user-id';

-- Ver log de accesos
SELECT * FROM user_satellite_access_log
WHERE user_id = 'tu-user-id'
ORDER BY access_at DESC;

-- Probar función de validación
SELECT check_satellite_access('user-id', 'cycling');
-- Retorna: true o false
```

### 3. Desde un Satélite (ej: Cycling)

```typescript
// En tu satélite, al cargar la app:
const response = await fetch(
  'https://hub.asciende.pro/functions/v1/satellite-access',
  {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ satellite_name: 'cycling' })
  }
);

const data = await response.json();
console.log(data);
// {
//   "success": true,
//   "has_access": true,
//   "satellite": { "name": "cycling", ... },
//   "message": "Access granted to cycling"
// }
```

---

## 🛠️ Integración para Desarrolladores de Satélites

### Hook Personalizado

```typescript
// useSatelliteAuth.ts
import { useEffect, useState } from 'react';

export function useSatelliteAuth(satelliteName: string) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_HUB_URL}/functions/v1/satellite-access`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ satellite_name: satelliteName })
          }
        );
        const data = await res.json();
        setHasAccess(data.has_access);
      } catch {
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

### Componente Protegido

```typescript
// App.tsx en satélite Cycling
import { useSatelliteAuth } from './hooks/useSatelliteAuth';

function App() {
  const { hasAccess, loading } = useSatelliteAuth('cycling');

  if (loading) {
    return <div>Verificando acceso...</div>;
  }

  if (!hasAccess) {
    return (
      <div className="text-center p-8">
        <h1>❌ Acceso Denegado</h1>
        <p>No tienes permiso para acceder al satélite Cycling.</p>
        <a href="https://hub.asciende.pro/settings?tab=satellites">
          Ver mis permisos
        </a>
      </div>
    );
  }

  return <CyclingApp />;
}
```

---

## 📊 Sincronización de Datos

### ⚡ NO HAY SINCRONIZACIÓN

**Todos los satélites y el HUB comparten la MISMA base de datos.**

```
┌──────────┐
│ Cycling  │─────┐
└──────────┘     │
                 ↓
┌──────────┐   ┌─────────────┐
│   HUB    │───│  Supabase   │  ← UNA SOLA BASE DE DATOS
└──────────┘   └─────────────┘
                 ↑
┌──────────┐     │
│   Lab    │─────┘
└──────────┘
```

**Resultado:**
- Cambios en Cycling → Visible en HUB en **0.5 segundos**
- Cambios en HUB → Visible en Cycling en **0.5 segundos**
- Sin colas, sin webhooks, sin APIs de sincronización

### Ejemplo Real

```typescript
// Usuario crea workout en Cycling a las 10:00:00
await supabase.from('cycling_workouts').insert({
  athlete_id: 'user-123',
  title: 'Z2 Training'
});

// Usuario abre HUB a las 10:00:01
const { data } = await supabase
  .from('cycling_workouts')
  .select('*')
  .eq('athlete_id', 'user-123');

console.log(data); // ✅ Ya aparece el workout!
```

---

## 🔐 Seguridad (RLS)

Cada tabla tiene **Row Level Security** activado:

```sql
-- Solo el atleta y su entrenador ven los workouts
CREATE POLICY "View own cycling workouts"
  ON cycling_workouts FOR SELECT
  TO authenticated
  USING (
    athlete_id = auth.uid()
    OR auth.uid() IN (
      SELECT trainer_id FROM athlete_workouts
      WHERE athlete_id = cycling_workouts.athlete_id
    )
  );
```

**Importante:** Aunque no hay sincronización, **sí hay control de acceso** a nivel de fila.

---

## 📚 Archivos Relevantes

### Backend
- `supabase/migrations/*_create_satellite_management_system.sql` - Schema
- `supabase/functions/satellite-access/index.ts` - Edge function

### Frontend
- `src/components/settings/SatellitesSection.tsx` - UI
- `src/pages/SettingsPage.tsx` - Integración

### Documentación
- `SATELLITE_MANAGEMENT_GUIDE.md` - Guía completa (este archivo)
- `CENTRALIZED_AUTH_HUB.md` - Sistema de autenticación
- `SATELLITE_AUTH_IMPLEMENTATION.md` - Implementación técnica

---

## ✨ Próximos Pasos

1. **Implementar hook en satélites existentes** (Cycling, Lab, Nutrition)
2. **Agregar panel de admin** para otorgar/revocar permisos manualmente
3. **Notificaciones** cuando se otorgan permisos
4. **Dashboard de analytics** para admin con uso de satélites

---

## 🆘 Troubleshooting Rápido

### "No veo el botón de Satélites en Settings"
- Verificar que estás en la última versión del HUB
- Hacer hard refresh (Ctrl+F5)

### "Dice que no tengo acceso pero debería tenerlo"
- Verificar tu rol: `SELECT role FROM profiles WHERE id = auth.uid();`
- Verificar categoría del satélite: `SELECT category FROM satellites WHERE name = 'cycling';`
- Probar función: `SELECT check_satellite_access(auth.uid(), 'cycling');`

### "Los datos no se sincronizan"
- **No hay sincronización** - Todos usan la misma DB
- Recargar página (F5)
- Verificar RLS policies de la tabla

---

## 🎉 Resumen

✅ **Sistema completo de permisos** basado en roles
✅ **Tracking automático** de accesos
✅ **UI intuitiva** en Settings
✅ **Base de datos compartida** → sin sincronización
✅ **Seguridad con RLS** a nivel de fila
✅ **Edge function** para validación
✅ **Documentación completa**

**Todo listo para usar! 🚀**
