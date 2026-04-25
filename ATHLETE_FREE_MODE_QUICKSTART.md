# Athlete Free Mode - Quickstart Guide

## ✅ ¿Qué se implementó?

El sistema completo de **Modo Atleta Libre** está implementado y listo para usar:

### Backend ✅
- ✅ Migración de base de datos aplicada
- ✅ Flags de trazabilidad en `meal_plans`
- ✅ Tabla `athlete_nutrition_usage` para límites
- ✅ Tabla `meal_plan_audit_log` para auditoría
- ✅ Triggers automáticos para invalidación y logging
- ✅ RLS policies actualizadas
- ✅ Función `check_athlete_meal_plan_limits()` disponible

### Frontend ✅
- ✅ Hook `useMealPlanLimits` creado
- ✅ Componente `MealPlanBadge` con variantes
- ✅ Componente `AnamnesisWarning` creado
- ✅ Traducciones ES/EN agregadas

---

## 🚀 Cómo Integrar en 3 Pasos

### 1. Verificar Límites Antes de Crear Plan

```typescript
import { useMealPlanLimits } from '../hooks/useMealPlanLimits';

function CreateMealPlanButton({ athleteId }: { athleteId: string }) {
  const { canCreatePlan, isLoading, getLimitMessage } = useMealPlanLimits(athleteId);

  if (isLoading) return <div>Verificando límites...</div>;

  if (!canCreatePlan) {
    return (
      <div className="alert alert-warning">
        {getLimitMessage('es')}
      </div>
    );
  }

  return <button onClick={handleCreatePlan}>Crear Plan Nutricional</button>;
}
```

### 2. Mostrar Badges en Listados de Planes

```typescript
import { MealPlanBadge } from '../components/nutrition/MealPlanBadge';

function MealPlanCard({ plan }: { plan: MealPlan }) {
  return (
    <div className="plan-card">
      <h3>{plan.title}</h3>

      <MealPlanBadge
        createdByRole={plan.created_by_role}
        validatedByTrainer={plan.validated_by_trainer}
        validatedAt={plan.validated_at}
        size="md"
      />

      {/* Resto del contenido */}
    </div>
  );
}
```

### 3. Mostrar Warning de Anamnesis

```typescript
import { AnamnesisWarning } from '../components/nutrition/AnamnesisWarning';

function CreatePlanPage() {
  const [hasAnamnesis, setHasAnamnesis] = useState(false);

  useEffect(() => {
    checkAnamnesisExists();
  }, []);

  return (
    <div>
      <AnamnesisWarning
        hasAnamnesis={hasAnamnesis}
        onCompleteAnamnesis={() => navigate('/nutrition/anamnesis')}
      />

      {/* Formulario de creación de plan */}
    </div>
  );
}
```

---

## 📝 Crear un Plan con los Flags Correctos

```typescript
const { data, error } = await supabase
  .from('meal_plans')
  .insert({
    athlete_id: userId,
    coach_id: null,
    title: 'Mi Plan Semanal',
    status: 'draft', // o 'active'
    created_by_role: 'athlete', // Automático por default
    // validated_by_trainer: false // Automático por default
    protein_goal: 150,
    carbs_goal: 300,
    fats_goal: 60,
    // ... resto de campos
  });
```

El sistema automáticamente:
- ✅ Registrará la creación en `meal_plan_audit_log`
- ✅ Actualizará `athlete_nutrition_usage`
- ✅ Aplicará RLS para permisos correctos

---

## 🎯 Validar un Plan (Solo Trainer/Admin)

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

El trigger automáticamente registrará esto en el audit log.

---

## ⚠️ Importante: Auto-Invalidación

Si un atleta edita un plan validado, el sistema **automáticamente**:
1. Setea `validated_by_trainer = false`
2. Limpia `validated_by_user_id` y `validated_at`
3. Registra el evento en `meal_plan_audit_log`

**No necesitas hacer nada manualmente.**

---

## 🔄 Reset Semanal de Límites

**Pendiente**: Configurar cron job que ejecute cada lunes 00:00:

```sql
SELECT reset_weekly_nutrition_limits();
```

Opciones:
1. **pg_cron** (Supabase)
2. **Edge Function** + Supabase Scheduled Tasks
3. **Vercel Cron** (si usas Vercel)

---

## 📊 Ver Uso del Atleta (Trainer/Admin)

```typescript
const { data } = await supabase
  .from('athlete_nutrition_usage')
  .select('*')
  .eq('user_id', athleteId)
  .single();

console.log('Planes activos:', data.active_plans_count);
console.log('Planes esta semana:', data.plans_created_this_week);
```

---

## 🎨 Componentes Visuales Disponibles

### `MealPlanBadge`
Muestra badges de origen y validación.

### `MealPlanValidationWarning`
Warning para planes no validados.

### `MealPlanProfessionalCTA`
CTA para servicios profesionales.

### `AnamnesisWarning`
Sugiere completar anamnesis.

---

## 📚 Documentación Completa

Ver `ATHLETE_FREE_MODE_IMPLEMENTATION.md` para:
- Arquitectura detallada
- Flujos completos
- Políticas RLS
- Funciones SQL
- Copy de UI exacto
- Casos de uso avanzados

---

## ✅ Checklist Pre-Producción

- [ ] Integrar `useMealPlanLimits` en formulario de creación
- [ ] Agregar `MealPlanBadge` en listados
- [ ] Mostrar `AnamnesisWarning` en primera creación
- [ ] Agregar `MealPlanProfessionalCTA` en planes no validados
- [ ] Configurar cron job para reset semanal
- [ ] Testear validación y auto-invalidación
- [ ] Testear RLS (atleta vs trainer vs admin)
- [ ] Verificar audit logs se generan correctamente

---

## 🆘 Troubleshooting

### "Cannot create plan" aunque debería poder
1. Verificar `athlete_nutrition_usage.week_start_date`
2. Ejecutar manualmente `SELECT reset_weekly_nutrition_limits();`
3. Verificar membership del usuario tiene los límites en `features`

### Plan no se invalida al editar
1. Verificar trigger `trigger_invalidate_on_edit` existe
2. Verificar rol del usuario en `auth.users.raw_app_meta_data`
3. Revisar logs de `meal_plan_audit_log`

### RLS blocking updates
1. Verificar `created_by_role` del plan
2. Verificar rol del usuario
3. Solo trainers pueden editar planes de otros

---

## 📞 Soporte

Para dudas, consultar:
- `ATHLETE_FREE_MODE_IMPLEMENTATION.md` (completo)
- Este quickstart
- Código en `/src/hooks/useMealPlanLimits.ts`
- Componentes en `/src/components/nutrition/`
