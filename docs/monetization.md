# Fase B de monetización

## Informe de solo lectura antes de cambios

La cuenta Stripe live auditada es `acct_1QHNkWErPHHgrU6U`. Tiene actividad existente, por lo que esta fase conserva todos los productos, precios, clientes, suscripciones, Payment Links, endpoints y códigos promocionales existentes.

En Supabase (`ngkcbygyoobqhlmlnuvl`) el informe previo devolvió:

| Perfil activo | Usuarios | Activos | Suscripciones profesionales activas | Acceso complimentary vigente |
|---|---:|---:|---:|---:|
| trainer | 1 | 1 | 0 | 1 |
| nutritionist | 1 | 1 | 0 | 0 |

No había perfiles `head_coach` ni `biomechanist` activos en esa consulta. Los identificadores y correos deben consultarse con el SQL de verificación y enmascararse al informar.

La migración crea `professional_roles` y deriva los perfiles profesionales actuales con `source='admin'`. Las compras nuevas escriben la fuente Stripe; la compatibilidad legacy usa `stripe_legacy`. `profiles.role` sigue siendo el perfil activo, mientras que `professional_roles` conserva los perfiles habilitados.

## Asignación de biomecánica

`profiles.assigned_biomechanist_id` es opcional. La misma persona puede ocupar también `assigned_trainer_id`; no se crea una asignación duplicada. `assign_athlete_professional` y la pantalla de equipo aceptan `biomechanist`, y la capacidad se cuenta deduplicando asignaciones directas y miembros de equipos.

## Stripe

Se creó de forma aditiva en la cuenta live `acct_1QHNkWErPHHgrU6U`, sin tocar los objetos existentes. Todos usan EUR, `tax_code=txcd_10103001` y `tax_behavior=exclusive`:

| módulo | producto | mensual | anual |
|---|---|---|---|
| endurance_planner | `prod_VVoFcLWMd4Hs8r` | `price_1UUmdeErPHHgrU6UiQl0D6iO` (40) | `price_1UUmdgErPHHgrU6UWLMg7Y3W` (400) |
| nutrition_planner | `prod_VVoFue1mRozewn` | `price_1UUmdiErPHHgrU6U22gY7PmD` (30) | `price_1UUmdkErPHHgrU6UpAcDBuTK` (300) |
| lab | `prod_VVoFxEkYfLPhpp` | `price_1UUmdmErPHHgrU6UQH6bXSOI` (30) | `price_1UUmdoErPHHgrU6UUWPvXNOy` (300) |
| performance | `prod_VVoF0R5w2waaah` | `price_1UUmdpErPHHgrU6UMQz9iMGO` (30) | `price_1UUmdrErPHHgrU6UnstTT9V7` (300) |
| biomechanics | `prod_VVoGa2OEeMlSk2` | `price_1UUmdsErPHHgrU6UdtpJo9eO` (25) | `price_1UUmduErPHHgrU6Ucj3DgxmY` (250) |
| all_access | `prod_VVoG2WYacKRBun` | `price_1UUmdvErPHHgrU6UueX7imFn` (130) | `price_1UUmdxErPHHgrU6Ua2kSENNh` (1300) |
| extra_athletes | `prod_VVoGykSYVSwBxq` | `price_1UUmdyErPHHgrU6UbneqN8cp` (15/pack) | `price_1UUme0ErPHHgrU6UehXKrHRL` (150/pack) |

El producto legacy `prod_VDsyApWSBhtc6k` con precios 49/490 se conserva. Se creó el cupón de prueba `bNSFaJZ4` y el código de una sola redención `ASCIENDE-PHASE-B`, restringidos a los productos nuevos. También se creó la configuración nueva de portal `bpc_1UUmeKErPHHgrU6UIfXz2F4n`; el secreto de Supabase debe contener ese ID en `STRIPE_BILLING_PORTAL_CONFIGURATION_ID`.

La función `stripe-create-professional-checkout` valida el catálogo, aplica el trial de 14 días únicamente a Endurance Planner, activa `automatic_tax`, `tax_id_collection` y dirección de facturación, y reutiliza el cliente Stripe existente. `stripe-create-portal-session` acepta `STRIPE_BILLING_PORTAL_CONFIGURATION_ID` para usar la configuración nueva sin modificar la existente. Los bridges permanecen en modo lectura y sin enforcement.

## Verificación de solo lectura

```sql
-- Profesionales actuales y fuente de acceso (correos enmascarados al exportar)
select p.id, left(coalesce(p.email, ''), 2) || '***' as email_mask,
       p.role, pr.role as enabled_role, pr.source,
       ps.status, ps.stripe_price_id,
       p.complimentary_access, p.complimentary_access_expires_at
from public.profiles p
left join public.professional_roles pr on pr.user_id = p.id
left join lateral (
  select * from public.professional_subscriptions x
  where x.user_id = p.id order by x.created_at desc limit 1
) ps on true
where p.role in ('trainer','nutritionist','head_coach','biomechanist');

-- Capacidad observada, con atletas deduplicados
with direct as (
  select p.id as professional_id, a.id as athlete_id
  from public.profiles p join public.profiles a on a.role = 'athlete'
  where a.assigned_trainer_id = p.id or a.assigned_nutritionist_id = p.id
     or a.assigned_biomechanist_id = p.id
), team as (
  select t.coach_id as professional_id, tm.athlete_id
  from public.teams t join public.team_members tm on tm.team_id = t.id
)
select professional_id, count(distinct athlete_id) as athletes
from (select * from direct union all select * from team) x
group by professional_id;

-- Profesionales con suscripción activa pero perfil aún athlete (pendientes de promoción)
select ps.user_id, left(coalesce(p.email, ''), 2) || '***' as email_mask,
       ps.status, ps.stripe_price_id, ps.current_period_end
from public.professional_subscriptions ps join public.profiles p on p.id = ps.user_id
where ps.status in ('active','trialing') and p.role = 'athlete';

-- Perfiles profesionales sin suscripción asociada, para revisión sin cambios
select p.id, left(coalesce(p.email, ''), 2) || '***' as email_mask, p.role
from public.profiles p
left join public.professional_subscriptions ps on ps.user_id = p.id
where p.role in ('trainer','nutritionist','head_coach','biomechanist')
  and ps.user_id is null;
```

## Fuera de esta entrega

Las migraciones `monetization_phase_b_v3` y `professional_module_catalog` ya están aplicadas en `ngkcbygyoobqhlmlnuvl`. Están desplegadas las funciones `stripe-create-professional-checkout`, `stripe-webhook` (v48), `stripe-create-portal-session` (v6) y `auth-signup` (v66). `professional_checkout_enabled` quedó activo; los interruptores de promoción y democión automática siguen apagados.

El mapeo automático `price_id → rol`, el enforcement de permisos dentro de bridges y el revertir automáticamente un rol al cancelar quedan fuera de esta entrega. La versión API asumida por el webhook queda fijada en `2024-10-28.acacia`. El endpoint activo de la cuenta es `we_1Su5ClErPHHgrU6U2xxWqx0K`; el endpoint adicional `we_1StodrErPHHgrU6UsOEJItS5` sigue habilitado por decisión operativa previa y requiere consolidar el secreto de firma antes de usar el webhook con rechazo estricto.
