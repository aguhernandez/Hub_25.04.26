PRIORIDAD ALTA — antes de dar acceso a profesionales externos: aplicar RLS por atleta asignado para CMJ, VBT, wellness y diario (hoy cualquier trainer o admin puede leer todos los registros de esas tablas).

## Lote backend priorizado

1. Corregir RLS de `cmj_sessions`, `cmj_jumps`, `bar_velocity_sessions`, `bar_velocity_reps`, `wellness_checkins` y `food_diary_sessions`/`food_diary_entries` para comprobar `assigned_trainer_id`, `assigned_nutritionist_id` o pertenencia a un equipo según el rol. Incluir `head_coach` por equipos.
2. Definir el acceso del nutricionista a entrenamiento, wellness, CMJ y VBT; hoy varias políticas solo contemplan `trainer`.
3. Definir el acceso del `head_coach` por equipos para hábitos, anamnesis, diario, CMJ y VBT.
4. Añadir lectura agregada de hábitos para equipos y logs asociados, conservando el detalle privado.
5. Añadir índices compuestos `athlete_id + fecha` en las tablas históricas usadas por el dashboard.
6. Evaluar una vista o RPC de estados agregados (sin contenido crudo) si las consultas por lote siguen consumiendo demasiado Disk IO.
7. Definir de forma única el vencimiento de membresías y qué pagos corresponden a un servicio profesional. La pantalla actual omite pagos porque `payments` solo permite leer al propio usuario o a admin.
8. Regenerar `src/lib/database.types.ts` desde el esquema cuando el contrato de acceso se estabilice. La V1 usa tipos locales mínimos.

## Estado de acceso usado en la V1

`Sin acceso` no genera alerta ni semáforo rojo. Con el RLS actual queda así:

- Trainer: puede consultar planificado, wellness, hábitos, anamnesis, diario y `membership_access`; CMJ/VBT siguen demasiado amplios y requieren corregirse antes de exponerlos.
- Nutritionist: acceso fiable para hábitos de atletas asignados; planificado, wellness, anamnesis, diario, CMJ/VBT y membresía se muestran como `Sin acceso` hasta confirmar políticas específicas.
- Head coach: puede resolver atletas de sus equipos, pero las políticas de hábitos y varios módulos no reconocen el equipo; esos módulos se muestran como `Sin acceso`.

La pantalla no lee contenido de anamnesis ni entradas del diario: solo estado, fecha y periodo.

## Dashboard admin V1

- La pantalla usa el guard de aplicación `RoleGuard` con `profile.role = 'admin'`; el acceso efectivo sigue dependiendo de las políticas RLS de cada tabla. No se usa `user_metadata` para autorizar este dashboard. Las políticas que confían en metadata en otros módulos requieren una revisión separada antes de considerarlas una frontera de seguridad.
- La definición operativa de «activo 7 días» en esta V1 es al menos una fila de `external_activities` del usuario en los últimos siete días. Si RLS no permite leer esa tabla, el KPI queda en «Sin datos» y no se infiere actividad.
- Strava se representa con actividad cuyo `source` es `strava`; Open Wearables usa el `admin-overview` existente y sus estados de conexión, error y último sync. Para contar conexiones reales de Strava haría falta una lectura administrativa agregada de `strava_connections`, que hoy no está garantizada por RLS.
- `professional_subscriptions.max_athletes` existe y lo consume `AdminUsersPage`, pero no hay un contrato único y estable para comparar plan, capacidad y atletas activos en este dashboard. Por eso la V1 muestra la ocupación observada y documenta el límite como no disponible.
- La salud técnica solo usa `stripe_webhook_logs` y el resumen de Open Wearables cuando son legibles. Observabilidad completa, cohortes, retención, proyecciones, nuevos índices, vistas/RPC y cambios de roles/RLS quedan fuera y requieren el lote backend priorizado anterior.
