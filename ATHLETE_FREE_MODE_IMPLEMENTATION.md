# Athlete Free Mode - Sistema de Nutrición Autónoma

## 📋 Resumen Ejecutivo

Se ha implementado el **Modo Atleta Libre** que permite a los atletas crear y gestionar planes nutricionales completos con cálculos automáticos de macros y micros, manteniendo trazabilidad completa y control del entrenador.

---

## ✅ Decisiones de Diseño Confirmadas

### 1. **Plan Activo**
- **Definición**: `status = 'active'` únicamente
- `draft` = experimento / boceto
- `active` = cuenta para límites
- `completed` / `archived` = no cuentan

### 2. **Reset Semanal**
- Cada **lunes 00:00** (semana calendario)
- Tabla `athlete_nutrition_usage` rastrea uso
- Función `reset_weekly_nutrition_limits()` disponible

### 3. **Flags de Trazabilidad**
- ✅ Flags **SOLO en meal_plans**
- ❌ NO duplicación en `meal_plan_meals` ni `meal_plan_items`
- ✅ Audit log en `meal_plan_audit_log` para eventos importantes

### 4. **Source Type Simplificado**
```sql
created_by_role: 'athlete' | 'trainer' | 'admin'
is_from_template: BOOLEAN
template_id: UUID (nullable)
```

### 5. **Proceso de Validación**
- Atleta **PUEDE** editar plan validado
- Cualquier edición por atleta → **pierde validación automáticamente**
- Trigger `invalidate_validation_on_athlete_edit()` maneja esto

### 6. **Permisos Simples**
- Atleta **NUNCA** edita planes del entrenador (read-only)
- Sin tabla de permisos adicional
- RLS maneja todo

### 7. **Límites por Tier**
- Configurados en `memberships.features` (JSONB)
- Cambios sin deploy
- Defaults:
  - Free: 3 planes activos, 1 plan/semana
  - Pro: Personalizable

### 8. **Logging Básico**
- Solo eventos importantes: `created`, `status_changed`, `validated`, `unvalidated`, `archived`
- NO field-by-field

### 9. **Entidad Primaria**
- `meal_plans` es la tabla primaria
- `nutrition_daily_plans` deriva de ella
- Flags se heredan por JOIN

### 10. **Anamnesis**
- Sugerida con warning (no obligatoria)
- Componente `AnamnesisWarning` disponible

---

## 🗄️ Cambios en Base de Datos

### ✅ Migración Aplicada: `create_athlete_free_mode_system`

#### Nuevas Columnas en `meal_plans`:
```sql
- created_by_role TEXT NOT NULL DEFAULT 'athlete'
- validated_by_trainer BOOLEAN DEFAULT FALSE
- validated_by_user_id UUID REFERENCES profiles(id)
- validated_at TIMESTAMPTZ
- is_from_template BOOLEAN DEFAULT FALSE
- template_id UUID REFERENCES menu_templates(id)
```

#### Nueva Tabla: `athlete_nutrition_usage`
```sql
CREATE TABLE athlete_nutrition_usage (
  user_id UUID PRIMARY KEY,
  active_plans_count INT DEFAULT 0,
  plans_created_this_week INT DEFAULT 0,
  week_start_date DATE NOT NULL,
  last_plan_created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Nueva Tabla: `meal_plan_audit_log`
```sql
CREATE TABLE meal_plan_audit_log (
  id UUID PRIMARY KEY,
  plan_id UUID REFERENCES meal_plans(id),
  user_id UUID REFERENCES profiles(id),
  action TEXT CHECK (action IN ('created', 'status_changed', 'validated', 'unvalidated', 'archived', 'deleted')),
  old_status TEXT,
  new_status TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
);
```

---

## 🔧 Funciones SQL Disponibles

### 1. `check_athlete_meal_plan_limits(p_athlete_id, p_membership_id)`
Verifica si un atleta puede crear un nuevo plan.

**Retorna**:
```typescript
{
  can_create_plan: boolean;
  active_plans_count: number;
  max_active_plans: number;
  plans_created_this_week: number;
  max_plans_per_week: number;
  limit_reached_reason: 'max_active_reached' | 'weekly_limit_reached' | null;
}
```

**Uso desde SQL**:
```sql
SELECT * FROM check_athlete_meal_plan_limits(
  'user-uuid-here',
  NULL  -- or membership_id
);
```

### 2. `reset_weekly_nutrition_limits()`
Resetea contadores semanales cada lunes.

**Uso**:
```sql
SELECT reset_weekly_nutrition_limits();
```

**Nota**: Esta función debe ser llamada vía cron job cada lunes 00:00.

### 3. Triggers Automáticos
- ✅ `trigger_invalidate_on_edit`: Auto-invalida cuando atleta edita
- ✅ `trigger_log_meal_plan_changes`: Log automático de cambios
- ✅ `trigger_update_active_plans_count`: Actualiza contadores

---

## 🎨 Componentes Frontend Disponibles

### 1. **Hook: `useMealPlanLimits`**

**Ubicación**: `src/hooks/useMealPlanLimits.ts`

**Uso**:
```typescript
import { useMealPlanLimits } from '../hooks/useMealPlanLimits';

function CreatePlanComponent() {
  const {
    canCreatePlan,
    activePlansCount,
    maxActivePlans,
    plansCreatedThisWeek,
    maxPlansPerWeek,
    limitReachedReason,
    isLoading,
    getLimitMessage
  } = useMealPlanLimits(athleteId);

  if (isLoading) return <div>Cargando...</div>;

  if (!canCreatePlan) {
    return (
      <div className="alert alert-warning">
        {getLimitMessage('es')}
      </div>
    );
  }

  return <CreatePlanForm />;
}
```

### 2. **Componente: `MealPlanBadge`**

**Ubicación**: `src/components/nutrition/MealPlanBadge.tsx`

**Uso**:
```typescript
import { MealPlanBadge } from '../components/nutrition/MealPlanBadge';

<MealPlanBadge
  createdByRole={plan.created_by_role}
  validatedByTrainer={plan.validated_by_trainer}
  validatedAt={plan.validated_at}
  validatedByUserName={plan.validator_name}
  size="md"
  showTooltip={true}
/>
```

**Variantes disponibles**:
- `MealPlanValidationWarning`: Warning para planes no validados
- `MealPlanProfessionalCTA`: CTA para servicios profesionales

### 3. **Componente: `AnamnesisWarning`**

**Ubicación**: `src/components/nutrition/AnamnesisWarning.tsx`

**Uso**:
```typescript
import { AnamnesisWarning } from '../components/nutrition/AnamnesisWarning';

<AnamnesisWarning
  hasAnamnesis={!!anamnesisData}
  onCompleteAnamnesis={() => navigate('/nutrition/anamnesis')}
/>
```

---

## 🔐 Políticas RLS Actualizadas

### `meal_plans` - Políticas de UPDATE

#### 1. Athletes can only edit their own created plans
```sql
USING (
  athlete_id = auth.uid()
  AND created_by_role = 'athlete'
)
WITH CHECK (
  athlete_id = auth.uid()
  AND created_by_role = 'athlete'
  AND validated_by_trainer = false  -- No puede auto-validar
)
```

#### 2. Trainers can edit all assigned athlete plans
```sql
USING (
  role IN ('trainer', 'admin')
)
```

#### 3. Only trainers can validate plans
```sql
WITH CHECK (
  role IN ('trainer', 'admin')
  OR validated_by_trainer = false
)
```

---

## 📊 Límites Configurables

### Configuración en `memberships.features` (JSONB)

**Ejemplo**:
```json
{
  "nutrition_max_active_plans": 5,
  "nutrition_plans_per_week": 2
}
```

**Actualizar límites**:
```sql
UPDATE memberships
SET features = features || '{"nutrition_max_active_plans": 10, "nutrition_plans_per_week": 5}'::jsonb
WHERE name = 'Pro';
```

---

## 📝 Flujos de Usuario

### Flujo 1: Atleta Crea Plan

1. **Verificar límites**:
```typescript
const { canCreatePlan, getLimitMessage } = useMealPlanLimits(athleteId);

if (!canCreatePlan) {
  showToast(getLimitMessage('es'));
  return;
}
```

2. **Crear plan** con flags correctos:
```typescript
const { data, error } = await supabase
  .from('meal_plans')
  .insert({
    athlete_id: userId,
    coach_id: null,
    title: 'Mi Plan',
    status: 'draft',
    created_by_role: 'athlete',  // ✅ Automático por default
    validated_by_trainer: false,  // ✅ Automático
    // ... resto de datos
  });
```

3. **Trigger automático** actualiza `athlete_nutrition_usage`

4. **Audit log** registra creación

### Flujo 2: Atleta Edita Plan Validado

1. **Atleta hace cambios** en plan validado

2. **Trigger `invalidate_validation_on_athlete_edit()`** se ejecuta:
   - Detecta que `editing_user_role = 'athlete'`
   - Detecta que `OLD.validated_by_trainer = true`
   - Setea flags a NULL/false
   - Registra en audit log

3. **Badge cambia** de "Validado" a "No validado"

### Flujo 3: Entrenador Valida Plan

```typescript
const { error } = await supabase
  .from('meal_plans')
  .update({
    validated_by_trainer: true,
    validated_by_user_id: trainerId,
    validated_at: new Date().toISOString(),
  })
  .eq('id', planId);
```

**Trigger automático** registra validación en audit log.

---

## 🎯 Copy de UI Definido

### Plan No Validado
```
"Este plan fue creado por vos. No cuenta con validación profesional."
```

### Plan Validado
```
"Este plan fue revisado y validado por un profesional."
```

### Límite Activo Alcanzado
```
"Llegaste al límite de planes activos (X). Podés seguir registrando comidas o trabajar este plan con un profesional."
```

### Límite Semanal Alcanzado
```
"Llegaste al límite de X planes nuevos por semana. Podrás crear más el próximo lunes."
```

### CTA Servicios
```
"¿Querés una revisión profesional de tu nutrición?"
```

---

## 🔄 Mantenimiento y Cron Jobs

### Cron Job Requerido

**Frecuencia**: Cada lunes 00:00

**Comando**:
```sql
SELECT reset_weekly_nutrition_limits();
```

**Configuración en Supabase**:
1. Crear Edge Function o usar pg_cron
2. Programar ejecución semanal
3. Monitorear logs

---

## ✅ Checklist de Integración

### Backend
- [x] Migración aplicada
- [x] Triggers configurados
- [x] RLS policies actualizadas
- [x] Funciones SQL creadas
- [ ] Cron job configurado (pendiente)

### Frontend
- [x] Hook `useMealPlanLimits` creado
- [x] Componente `MealPlanBadge` creado
- [x] Componente `AnamnesisWarning` creado
- [ ] Integración en páginas de creación de planes
- [ ] Integración en listados de planes
- [ ] Tests de UI

### Testing
- [ ] Crear plan como atleta
- [ ] Validar límites (activos y semanales)
- [ ] Editar plan validado (verificar auto-invalidación)
- [ ] Entrenador valida plan
- [ ] Entrenador edita plan de atleta
- [ ] Audit log se genera correctamente

---

## 🚀 Próximos Pasos

### Fase 1: UI Integration (Actual)
1. Integrar `useMealPlanLimits` en páginas de creación
2. Agregar `MealPlanBadge` en listados
3. Mostrar `AnamnesisWarning` al crear primer plan
4. Agregar `MealPlanProfessionalCTA` en planes no validados

### Fase 2: Cron Setup
1. Configurar cron job para reset semanal
2. Agregar monitoring de límites
3. Dashboard de uso para admins

### Fase 3: Analytics
1. Tracking de conversión (atleta → profesional)
2. Métricas de uso por tier
3. A/B testing de CTAs

---

## 📚 Recursos Adicionales

### Archivos Creados
- `supabase/migrations/..._create_athlete_free_mode_system.sql`
- `src/hooks/useMealPlanLimits.ts`
- `src/components/nutrition/MealPlanBadge.tsx`
- `src/components/nutrition/AnamnesisWarning.tsx`

### Documentación Relacionada
- `NUTRITION_MODULE_SUMMARY.md`
- `NUTRITION_SYSTEM_COMPLETE.md`
- `API_INTEGRATION_GUIDE.md`

---

## ⚠️ Notas Importantes

1. **NO se eliminaron funcionalidades existentes**
2. **NO se creó un satélite separado**
3. **TODO está dentro de la arquitectura actual**
4. **Monetización mediante servicios externos, no features bloqueadas**
5. **Sistema preparado para escalar a SaaS en el futuro**

---

## 🤝 Soporte

Para dudas sobre implementación, consultar:
- Este documento
- Código comentado en migraciones
- Tests de integración (pendientes)
