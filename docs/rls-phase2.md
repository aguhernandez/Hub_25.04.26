# Fase 2 — acceso por atleta asignado

La migración `rls_phase2_assigned_professional_access` está aplicada en producción. Supabase la registró con la versión asignada por el proyecto (`20261026130740`). La función `professional_can_read_athlete` es SECURITY DEFINER STABLE, fija `search_path = pg_catalog, public` y solo se concede a `authenticated`. No usa `user_metadata` ni roles del JWT.

## Matriz

| Datos | Atleta | Trainer asignado | Nutritionist asignado | Head coach por equipo | Admin | Biomechanist |
|---|---|---|---|---|---|---|
| Wellness y baseline | Propios | Sí | No | Sí | No | No |
| CMJ / VBT | Propios | Sí | No | Sí | No | No |
| Hábitos | Propios | Verificar políticas actuales | Verificar políticas actuales | Verificar políticas actuales | No cambia en esta migración | No |
| Anamnesis | Propia | Sí | Sí | Sí | No | No |
| Diario: estado/fechas | Propio | Vista segura | Vista segura | Vista segura | No | No |
| Diario: entradas | Propias | No | Sí | No | No | No |
| Ejecución de entrenamiento | Propia | Política existente, revisar | Política existente, revisar | Política existente, revisar | Política existente, revisar | No |

Además de la asignación, el profesional debe pasar is_enabled_professional(auth.uid(), rol) y has_active_professional_access(auth.uid()). Un permiso vencido deja de leer.

## Cambio de superficie del dashboard

El dashboard debe consultar food_diary_session_status para mostrar estado y fechas. La vista no contiene entradas, notas ni valores nutricionales. Si TrainerDashboard continúa consultando food_diary_sessions directamente, la consulta dejará de devolver los datos del profesional y debe migrarse antes de aplicar esta migración. AdminPlatformDashboard no debe leer estas tablas de salud.

Las políticas de hábitos, external_activities, executed_sessions, athlete_workouts, antropometría y resultados de Lab no se reemplazan aquí porque tienen variantes históricas. Deben auditarse antes de conceder acceso externo.

## Pruebas SQL (no ejecutar como migración)

Usar dos atletas A/B, trainer asignado a A, trainer no asignado, nutritionist asignado a A, head coach con A en su equipo, admin y profesional con acceso vencido. En cada sesión, establecer el JWT mediante el mecanismo de pruebas de Supabase y ejecutar:

~~~sql
select athlete_id from public.wellness_checkins where athlete_id in (:athlete_a, :athlete_b);
select athlete_id from public.cmj_sessions where athlete_id in (:athlete_a, :athlete_b);
select athlete_id from public.bar_velocity_sessions where athlete_id in (:athlete_a, :athlete_b);
select athlete_id from public.nutrition_anamnesis where athlete_id in (:athlete_a, :athlete_b);
select * from public.food_diary_session_status where athlete_id in (:athlete_a, :athlete_b);
select session_id from public.food_diary_entries;
select public.has_active_professional_access(auth.uid());
~~~

Resultado esperado:

| Cuenta | A | B | Entradas del diario |
|---|---|---|---|
| Atleta A | Sí | No | Solo A |
| Trainer asignado a A | Sí | No | No |
| Trainer no asignado | No | No | No |
| Nutritionist asignado a A | Sí | No | Solo A |
| Head coach del equipo de A | Sí | No | No |
| Admin | No | No | No |
| Profesional vencido | No | No | No |

Para escritura se debe comprobar además que un profesional no puede INSERT/UPDATE/DELETE de datos de un atleta no asignado. Las políticas históricas de athlete_workouts permiten variantes de escritura y deben revisarse antes de activar la fase.

## Rendimiento esperado

Las políticas usan EXISTS, (SELECT auth.uid()) y columnas indexadas. Las consultas del dashboard deben pasar una lista de hasta 50 atletas con in(athlete_ids). Verificar con:

~~~sql
explain (analyze, buffers)
select athlete_id, created_at
from public.wellness_checkins
where athlete_id = any(:athlete_ids)
  and created_at >= now() - interval '28 days';
~~~

El plan esperado es un Bitmap/Index Scan sobre idx_wellness_checkins_athlete_created, seguido de un filtro de asignación. Si aparece un Seq Scan, detener el despliegue y revisar índices/estadísticas.

## Orden

1. Ejecutar las consultas de solo lectura y comprobar nombres de columnas. (Hecho.)
2. Cambiar TrainerDashboard a `food_diary_session_status`. (Hecho.)
3. Aplicar la migración en producción y verificar objetos/políticas. (Hecho.)
4. Ejecutar build, typecheck y tests. (En esta entrega.)
5. Crear cuentas de prueba y verificar la tabla de resultados con cada rol antes de abrir acceso externo.
6. Auditar y conectar permisos en las apps satélite (Fase C).

## Reversión

La migración contiene DROP comentados para sus objetos. La restauración de políticas antiguas debe hacerse mediante una migración explícita revisada; no se recomienda reactivar políticas globales de trainer/admin.

