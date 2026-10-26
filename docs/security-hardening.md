# Security hardening — Fase 1

La fase quedó aplicada en producción sobre `ngkcbygyoobqhlmlnuvl`. Las migraciones de seguimiento son idempotentes y permanecen en el repositorio para reproducibilidad.

## Orden de aplicación

1. Revisar y rotar secretos expuestos. Confirmar en los logs de Supabase si las funciones de administración heredadas fueron invocadas.
2. Aplicar `20261026120000_security_hardening_phase1.sql`, `20261026190000_monetization_security_followup.sql` y `20261026194000_scope_professional_content_policies.sql`.
3. Desplegar `auth-signup` v68, `stripe-create-professional-checkout` v5, `stripe-create-portal-session` v8 y `stripe-webhook` v52.
4. Verificar con las consultas de solo lectura de este documento.
5. Ejecutar el plan de pruebas con cuentas separadas de atleta, trainer y admin.

La CLI de Supabase no está instalada en este entorno, por lo que la migración se creó manualmente con nombre determinista.

## Cambios incluidos

- `profiles.requested_role` guarda la solicitud profesional sin otorgar permisos.
- `auth-signup` valida el tipo solicitado, pero el rol efectivo siempre es `athlete`.
- `handle_new_user` deja de usar el rol de `raw_user_meta_data`; crea siempre atletas.
- El webhook busca `client_reference_id` y `profiles.requested_role`. Sigue creando `professional_subscriptions`, pero no cambia `profiles.role`.
- El administrador ve la solicitud profesional y el estado de `professional_subscriptions` en la tabla existente de usuarios.
- Las columnas sensibles de `profiles` quedan protegidas para sesiones `authenticated` y `anon`.
- La gestión de membresía pasa de una actualización directa a `admin_set_user_membership`. La sección deja de estar disponible para trainers.
- Se eliminaron del repositorio `create-admin-trainer`, `reset-admin-trainer-passwords` y `reset-demo-passwords`.
- `createDemoUsers` requiere `VITE_DEMO_ADMIN_PASSWORD` y `VITE_DEMO_TRAINER_PASSWORD`; no contiene contraseñas.
- Las políticas de autorización que usaban `user_metadata.role` para wellness, planes IA y planners externos usan `has_profile_role()`.

## Qué ve un profesional antes de ser promovido

Después del registro y antes del pago queda como atleta. Puede confirmar su email y completar su perfil, pero no recibe permisos de trainer, nutritionist ni head_coach.

Después de un pago confirmado, el webhook crea o actualiza su suscripción profesional y conserva `requested_role`. La cuenta sigue mostrando rol atleta hasta que un administrador la promueve mediante `admin_set_profile_role`.

Texto previsto al volver del checkout:

- ES: “Pago recibido. Tu cuenta profesional será activada por el equipo de Asciende”
- EN: “Payment received. Your professional account will be activated by the Asciende team”

El mapeo automático `price_id → rol` queda fuera de esta entrega.

## Clasificación de `user_metadata`

### Usos de autorización corregidos

- `wellness_checkins`: acceso de trainers/admins.
- `ai_training_plans`: acceso de trainers/admins.
- `external_planner_tokens`: lectura, inserción y actualización de admins.
- `external_nutrition_plans`: lectura de trainers/admins.
- `external_endurance_plans`: lectura de trainers/admins.
- `external_planner_access_log`: lectura de admins.
- RPC de acceso complementario: validación administrativa.

### Usos auxiliares conservados

Estos no conceden permisos y no se modificaron:

- `full_name`, `name`, `avatar_url` y datos del proveedor OAuth para crear o completar el perfil.
- Los datos de nombre y proveedor en `raw_user_meta_data` son auxiliares de perfil; `requested_role` ya no se copia allí.
- Referencias históricas en comentarios o documentación.

También existen políticas antiguas que usan `auth.jwt()->>'role'` en perfiles, equipos y membresías. No se reescribieron porque quedan fuera del alcance de esta fase; deben revisarse en una fase posterior.

## Plan de pruebas

Usar tres cuentas aisladas: una atleta, un trainer y un admin.

1. Registro atleta: solicitar `athlete`; comprobar `profiles.role = 'athlete'` y `requested_role IS NULL`.
2. Registro profesional: solicitar cada uno de `trainer`, `nutritionist` y `head_coach`; comprobar `profiles.role = 'athlete'`, `requested_role` correcto y ausencia de permisos profesionales.
3. Webhook repetido: enviar el mismo evento firmado dos veces; comprobar una sola fila de suscripción.
4. Webhook profesional: usar `client_reference_id` de un atleta con solicitud; comprobar que crea/actualiza `professional_subscriptions` y no modifica `profiles.role`.
5. Atleta: intentar actualizar `role`, `is_active`, `assigned_trainer_id`, `assigned_nutritionist_id`, `requested_role` y `membership_*`; cada intento debe fallar.
6. Trainer: comprobar que puede usar la asignación RPC autorizada y que no puede gestionar membresías desde Settings.
7. Admin: comprobar `admin_set_profile_role`, `admin_set_user_status` y `admin_set_user_membership`.
8. Creación de atleta por trainer: comprobar que conserva rol atleta y asignación.
9. Trigger de alta: crear usuario por Auth y comprobar rol atleta y asignación por defecto.
10. RLS: repetir lecturas de wellness, IA y planners con atleta, trainer y admin; comprobar que el resultado coincide con la semántica anterior sin aceptar `user_metadata.role`.

## SQL de verificación — solo lectura

Ejecutar antes y después en producción:

```sql
select id, email, role, requested_role, is_active, created_at
from public.profiles
where role in ('admin','trainer','nutritionist','head_coach')
   or requested_role is not null
order by created_at desc;

select p.id, p.email, p.requested_role, ps.status,
       ps.stripe_price_id, ps.current_period_end
from public.profiles p
join public.professional_subscriptions ps on ps.user_id = p.id
where p.role = 'athlete'
  and p.requested_role in ('trainer','nutritionist','head_coach')
  and ps.status in ('trialing','active');

select p.id, p.email, p.role, p.requested_role
from public.profiles p
left join public.professional_subscriptions ps on ps.user_id = p.id
where p.role in ('trainer','nutritionist','head_coach')
  and ps.id is null
order by p.created_at desc;

select p.id, p.email, p.requested_role
from public.profiles p
left join public.professional_subscriptions ps on ps.user_id = p.id
where p.role = 'athlete'
  and p.requested_role is not null
  and ps.id is null
order by p.created_at desc;

select n.nspname as schema_name, p.proname, pg_get_function_identity_arguments(p.oid)
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname in (
  'admin_set_profile_role', 'admin_set_user_status',
  'admin_set_user_membership', 'assign_athlete_to_professional',
  'handle_new_user'
)
order by p.proname;

select schemaname, tablename, policyname, qual, with_check
from pg_policies
where coalesce(qual, '') ilike '%user_metadata%'
   or coalesce(with_check, '') ilike '%user_metadata%';
```

## Secretos y migraciones históricas

Se eliminaron las funciones de creación/reset del repositorio y se limpiaron contraseñas de documentación. No se modificaron migraciones ya ejecutadas que contienen literalmente credenciales históricas; deben rotarse y revisarse en producción. Los emails se deben revisar también, pero no se reproducen aquí en texto completo.

## Estado pendiente

Las funciones heredadas `create-admin-trainer`, `reset-admin-trainer-passwords` y `reset-demo-passwords` ya no ejecutan lógica: fueron reemplazadas en producción por stubs de retirada (versiones 24/28/24), requieren JWT y responden `410`. El conector no expone borrado físico de funciones; si se necesita que desaparezcan del listado, hay que eliminarlas desde Supabase Dashboard.

## Fuera de alcance

- Mapeo automático server-side `price_id → rol`.
- Reversión automática del rol cuando una suscripción profesional se cancela o vence.
- Scoping por atleta de CMJ, VBT, wellness y diario.
- Dashboards y funciones de cálculo.
- Aplicación de migraciones, despliegue y cambios de datos existentes.
