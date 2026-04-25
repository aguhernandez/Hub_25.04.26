# ⚡ Configuración Rápida de Stripe Webhooks

## 🎯 Objetivo
Hacer que los pagos de Stripe activen automáticamente las membresías en tu aplicación.

---

## ✅ Checklist de Configuración

### PASO 1: Configurar Webhook en Stripe (5 minutos)

- [ ] **1.1** Ir a [Stripe Dashboard](https://dashboard.stripe.com)
- [ ] **1.2** Asegurarte de estar en **Test Mode** (para pruebas)
- [ ] **1.3** Ir a: **Developers → Webhooks**
- [ ] **1.4** Click en **"Add endpoint"**
- [ ] **1.5** Ingresar URL del endpoint:
  ```
  https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/stripe-webhook
  ```
- [ ] **1.6** En "Listen to", seleccionar **"Events on your account"**
- [ ] **1.7** Seleccionar estos eventos:
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `invoice.paid`
  - [ ] `invoice.payment_failed`
- [ ] **1.8** Click en **"Add endpoint"**
- [ ] **1.9** **⚠️ IMPORTANTE**: Copiar el **Signing Secret** (comienza con `whsec_...`)
  - Solo se muestra una vez, guárdalo en un lugar seguro

---

### PASO 2: Configurar Variables de Entorno en Supabase (3 minutos)

- [ ] **2.1** Ir a [Supabase Dashboard](https://supabase.com/dashboard/project/ngkcbygyoobqhlmlnuvl)
- [ ] **2.2** Ir a: **Settings → Edge Functions**
- [ ] **2.3** En la sección **"Secrets"**, agregar o verificar:

  **Variable 1: STRIPE_SECRET_KEY**
  - [ ] Click en **"Add new secret"**
  - [ ] Name: `STRIPE_SECRET_KEY`
  - [ ] Value: Tu Stripe Secret Key (comienza con `sk_test_...` o `sk_live_...`)
  - [ ] Obtener de: [Stripe Dashboard → Developers → API keys](https://dashboard.stripe.com/test/apikeys)

  **Variable 2: STRIPE_WEBHOOK_SECRET**
  - [ ] Click en **"Add new secret"**
  - [ ] Name: `STRIPE_WEBHOOK_SECRET`
  - [ ] Value: El signing secret que copiaste en el Paso 1.9 (comienza con `whsec_...`)

---

### PASO 3: Verificar Edge Functions (2 minutos)

- [ ] **3.1** En Supabase Dashboard, ir a: **Edge Functions**
- [ ] **3.2** Verificar que existan estas funciones:
  - [ ] `stripe-webhook` (la más importante)
  - [ ] `stripe-create-membership-checkout`
  - [ ] `stripe-create-checkout`

Si no aparecen, necesitas desplegarlas:
```bash
# Si tienes Supabase CLI instalado
supabase functions deploy stripe-webhook
supabase functions deploy stripe-create-membership-checkout
```

---

### PASO 4: Configurar Price IDs (Opcional - 5 minutos)

Solo si aún no tienes productos en Stripe:

#### En Stripe Dashboard:

- [ ] **4.1** Ir a: **Products → "+ Add product"**

Para cada membresía (BASE, PREMIUM, PRO):

- [ ] **4.2** Crear producto:
  - Name: `Membresía [NOMBRE]`
  - Description: Descripción de la membresía

- [ ] **4.3** Agregar precio mensual:
  - Recurring: Monthly
  - Price: (el precio mensual)
  - Copiar el **Price ID** (comienza con `price_...`)

- [ ] **4.4** Agregar precio anual:
  - Click "+ Add another price"
  - Recurring: Yearly
  - Price: (el precio anual)
  - Copiar el **Price ID**

#### En Supabase:

- [ ] **4.5** Ejecutar este SQL para cada membresía:

```sql
UPDATE memberships
SET
  stripe_price_id_monthly = 'price_xxxxx',  -- Reemplazar con el Price ID mensual
  stripe_price_id_annual = 'price_yyyyy'    -- Reemplazar con el Price ID anual
WHERE slug = 'base';  -- Cambiar por 'premium' o 'pro' según corresponda
```

---

### PASO 5: Probar la Configuración (5 minutos)

#### Test 1: Enviar webhook de prueba desde Stripe

- [ ] **5.1** En Stripe Dashboard: **Developers → Webhooks**
- [ ] **5.2** Click en tu endpoint (el que acabas de crear)
- [ ] **5.3** Click en **"Send test webhook"**
- [ ] **5.4** Seleccionar evento: `checkout.session.completed`
- [ ] **5.5** Click en **"Send test webhook"**
- [ ] **5.6** Verificar que aparezca con status **"200 OK"**

#### Test 2: Verificar en la base de datos

- [ ] **5.7** Ejecutar script de diagnóstico:
```bash
npm run verify-stripe
```

O ejecutar este SQL en Supabase:
```sql
SELECT * FROM stripe_webhook_events
ORDER BY created_at DESC
LIMIT 5;
```

- [ ] **5.8** Deberías ver al menos 1 evento registrado

#### Test 3: Compra de prueba

- [ ] **5.9** En tu aplicación, ir a: **Membresías**
- [ ] **5.10** Click en **"Suscribirse"** a cualquier membresía
- [ ] **5.11** Usar tarjeta de prueba de Stripe:
  - **Número**: `4242 4242 4242 4242`
  - **Fecha**: Cualquier fecha futura (ej: 12/25)
  - **CVC**: Cualquier 3 dígitos (ej: 123)
  - **ZIP**: Cualquier código postal

- [ ] **5.12** Completar el pago
- [ ] **5.13** Verificar que se redirige a página de éxito
- [ ] **5.14** Verificar en el perfil que la membresía está activa

```sql
-- Verificar membresía activada
SELECT
  p.email,
  m.name_es,
  ma.status,
  ma.start_date,
  ma.source
FROM membership_access ma
JOIN profiles p ON p.id = ma.user_id
JOIN memberships m ON m.id = ma.membership_id
WHERE ma.status = 'active'
ORDER BY ma.start_date DESC
LIMIT 5;
```

---

## 🎉 ¡Listo! ¿Cómo Saber que Funciona?

### Indicadores de Éxito:

- ✅ **En Stripe**: Webhook muestra eventos con status 200 OK
- ✅ **En Base de Datos**: Tabla `stripe_webhook_events` tiene registros
- ✅ **En Base de Datos**: Tabla `membership_access` tiene membresías activas
- ✅ **En Frontend**: Usuario ve su membresía activa en el perfil
- ✅ **En Frontend**: Badge de membresía aparece en toda la app

### Si algo falla:

1. Ejecuta el script de diagnóstico:
   ```bash
   npm run verify-stripe
   ```

2. Revisa los logs del edge function:
   - Supabase Dashboard → Edge Functions → stripe-webhook → Logs

3. Revisa los logs del webhook en Stripe:
   - Stripe Dashboard → Developers → Webhooks → [Tu endpoint] → Events

4. Lee la guía completa: `STRIPE_WEBHOOK_SETUP_GUIDE.md`

---

## 🔄 Para Pasar a Producción

Cuando todo funcione en test mode:

- [ ] **P.1** En Stripe Dashboard, cambiar a **Live Mode**
- [ ] **P.2** Crear un NUEVO webhook endpoint (misma URL, pero en Live Mode)
- [ ] **P.3** Seleccionar los mismos eventos
- [ ] **P.4** Copiar el NUEVO signing secret de producción
- [ ] **P.5** En Supabase, actualizar las variables de entorno:
  - `STRIPE_SECRET_KEY` → Usar la key de producción (`sk_live_...`)
  - `STRIPE_WEBHOOK_SECRET` → Usar el signing secret de producción
- [ ] **P.6** Actualizar los Price IDs en las membresías (usar los de producción)

---

## 📞 Ayuda Rápida

### Comandos Útiles

```bash
# Verificar configuración
npm run verify-stripe

# Ver logs en tiempo real (si tienes Supabase CLI)
supabase functions logs stripe-webhook --follow
```

### Queries Útiles

```sql
-- Ver eventos recientes
SELECT event_type, processed, created_at
FROM stripe_webhook_events
ORDER BY created_at DESC
LIMIT 10;

-- Ver eventos sin procesar
SELECT *
FROM stripe_webhook_events
WHERE processed = false;

-- Ver membresías activas
SELECT
  p.email,
  m.name_es,
  ma.source,
  ma.start_date
FROM membership_access ma
JOIN profiles p ON p.id = ma.user_id
JOIN memberships m ON m.id = ma.membership_id
WHERE ma.status = 'active'
ORDER BY ma.start_date DESC;
```

---

## 🚨 Problemas Comunes

| Síntoma | Causa Probable | Solución |
|---------|---------------|----------|
| No hay eventos en `stripe_webhook_events` | Webhook no configurado | Ver Paso 1 |
| Error "Invalid signature" | `STRIPE_WEBHOOK_SECRET` mal configurado | Copiar el secret correctamente del Paso 1.9 |
| Eventos llegan pero no se procesan | Error en el edge function | Revisar logs del edge function |
| "Missing Stripe price ID" | Price IDs no configurados | Ver Paso 4 |
| Webhook muestra error 500 en Stripe | Error en el código del edge function | Revisar logs detallados |

---

## ⏱️ Tiempo Total Estimado

- ✅ Configuración básica: **10-15 minutos**
- ✅ Con configuración de productos: **20 minutos**
- ✅ Pruebas completas: **5 minutos**

**Total: ~25 minutos** para tener todo funcionando perfectamente.

---

¿Preguntas? Lee la guía completa en: **STRIPE_WEBHOOK_SETUP_GUIDE.md**
