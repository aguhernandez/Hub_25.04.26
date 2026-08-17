# Guía Completa: Configuración de Webhooks de Stripe

## 🎯 Problema Actual

Stripe está procesando los pagos correctamente y cobrando el dinero, **PERO** los webhooks no están llegando a tu aplicación, por lo que:
- ❌ La membresía no se activa automáticamente
- ❌ No se registran eventos en la base de datos
- ❌ El usuario paga pero su perfil no cambia

## ✅ Solución: Configurar Webhooks en Stripe

---

## PASO 1: Configurar el Webhook en Stripe Dashboard

### 1.1 Accede a Stripe Dashboard
1. Ve a [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Asegúrate de estar en el modo correcto:
   - **Test Mode** para pruebas
   - **Live Mode** para producción

### 1.2 Crear el Webhook Endpoint
1. En el menú lateral, ve a: **Developers → Webhooks**
2. Click en **"Add endpoint"** o **"+ Add an endpoint"**
3. **Endpoint URL**: Ingresa la URL de tu edge function:
   ```
   https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/stripe-webhook
   ```

### 1.3 Seleccionar Eventos a Escuchar
Marca los siguientes eventos (son los que tu aplicación procesa):

**Para Membresías:**
- ✅ `checkout.session.completed` - Cuando se completa el checkout
- ✅ `customer.subscription.created` - Cuando se crea una suscripción
- ✅ `customer.subscription.updated` - Cuando se actualiza una suscripción
- ✅ `customer.subscription.deleted` - Cuando se cancela una suscripción
- ✅ `invoice.paid` - Cuando se paga una factura recurrente
- ✅ `invoice.payment_failed` - Cuando falla un pago

**Para Productos/Programas:**
- ✅ `payment_intent.succeeded` - Cuando se completa un pago único

### 1.4 Guardar el Webhook
1. Click en **"Add endpoint"**
2. ⚠️ **MUY IMPORTANTE**: Stripe te mostrará el **Signing Secret** (comienza con `whsec_...`)
3. **COPIA Y GUARDA** este secret inmediatamente (solo se muestra una vez)

---

## PASO 2: Configurar Variables de Entorno

### 2.1 Variables Necesarias

Tu aplicación necesita estas variables de entorno en Supabase:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_... o sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...  # ← Este es el que falta!
```

### 2.2 Cómo Obtener STRIPE_SECRET_KEY
1. En Stripe Dashboard: **Developers → API keys**
2. Copia la **Secret key** (comienza con `sk_test_` o `sk_live_`)

### 2.3 Cómo Agregar las Variables en Supabase

#### Opción A: Desde Supabase Dashboard
1. Ve a tu proyecto: https://supabase.com/dashboard/project/ngkcbygyoobqhlmlnuvl
2. Ve a **Settings → Edge Functions**
3. En la sección **Secrets**, agrega:
   - `STRIPE_SECRET_KEY` = tu secret key
   - `STRIPE_WEBHOOK_SECRET` = el signing secret del webhook

#### Opción B: Desde CLI (si tienes Supabase CLI instalado)
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

---

## PASO 3: Configurar Price IDs en las Membresías

### 3.1 Crear Productos y Precios en Stripe

1. En Stripe Dashboard: **Products → + Add product**
2. Para cada membresía (Free, Base, Premium, Pro):
   - **Name**: Nombre de la membresía
   - **Description**: Descripción
   - **Pricing**:
     - Crea dos precios por membresía:
       - Precio Mensual: Recurring → Monthly
       - Precio Anual: Recurring → Yearly

3. **Copia los Price IDs** de cada precio creado (comienzan con `price_...`)

### 3.2 Actualizar Membresías en tu Base de Datos

Ejecuta este SQL en Supabase para actualizar cada membresía:

```sql
-- Ejemplo para membresía BASE
UPDATE memberships
SET
  stripe_price_id_monthly = 'price_xxxxx_monthly',
  stripe_price_id_annual = 'price_xxxxx_annual'
WHERE slug = 'base';

-- Repite para 'premium' y 'pro'
```

---

## PASO 4: Verificar la Configuración

### 4.1 Test del Webhook desde Stripe

1. En Stripe Dashboard: **Developers → Webhooks**
2. Click en tu webhook endpoint
3. Click en **"Send test webhook"**
4. Selecciona `checkout.session.completed`
5. Click **"Send test webhook"**

### 4.2 Verificar que Llegó el Evento

Ejecuta este SQL en Supabase:

```sql
SELECT * FROM stripe_webhook_events
ORDER BY created_at DESC
LIMIT 5;
```

Deberías ver el evento de prueba registrado.

### 4.3 Prueba Real de Compra

1. Usa una tarjeta de prueba de Stripe:
   - Número: `4242 4242 4242 4242`
   - Fecha: Cualquier fecha futura
   - CVC: Cualquier 3 dígitos
   - ZIP: Cualquier código postal

2. Realiza una compra de membresía

3. Verifica que se creó el registro:

```sql
-- Ver el evento del webhook
SELECT * FROM stripe_webhook_events
WHERE event_type = 'checkout.session.completed'
ORDER BY created_at DESC LIMIT 1;

-- Ver la membresía activada
SELECT * FROM membership_access
WHERE status = 'active'
ORDER BY start_date DESC LIMIT 1;
```

---

## PASO 5: Troubleshooting

### Problema: El webhook no llega

**Solución 1: Verifica la URL**
```bash
# La URL correcta es:
https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/stripe-webhook

# NO debe tener /auth/ en el path
```

**Solución 2: Verifica que el edge function esté desplegado**
```bash
# Desde Supabase Dashboard:
# Settings → Edge Functions → Verifica que 'stripe-webhook' aparezca listado
```

**Solución 3: Revisa los logs del webhook en Stripe**
1. Stripe Dashboard → Developers → Webhooks
2. Click en tu endpoint
3. Ve a la pestaña **"Events"** o **"Attempts"**
4. Verás si hay errores 400, 401, 500, etc.

### Problema: Eventos llegan pero no se procesan

**Chequear logs del Edge Function:**
```bash
# En Supabase Dashboard:
# Edge Functions → stripe-webhook → Logs

# O vía CLI:
supabase functions logs stripe-webhook
```

### Problema: Error de firma inválida

**Causa**: `STRIPE_WEBHOOK_SECRET` está mal configurado o falta

**Solución**:
1. Ve a Stripe Dashboard → Developers → Webhooks → Tu endpoint
2. Click en **"Reveal"** para ver el signing secret
3. Actualiza la variable de entorno en Supabase

---

## 📋 Checklist Final

Antes de declarar que está funcionando, verifica:

- [ ] Webhook creado en Stripe Dashboard
- [ ] Los 6+ eventos están seleccionados
- [ ] `STRIPE_SECRET_KEY` configurada en Supabase
- [ ] `STRIPE_WEBHOOK_SECRET` configurada en Supabase
- [ ] Price IDs configurados en las membresías
- [ ] Edge function `stripe-webhook` está desplegado
- [ ] Test webhook desde Stripe funciona
- [ ] Evento de prueba aparece en `stripe_webhook_events`
- [ ] Compra de prueba activa la membresía correctamente

---

## 🎉 ¿Cómo Saber que Funciona?

Después de configurar todo:

1. **Realiza una compra de prueba**
2. **Verifica automáticamente**:
   - ✅ Se registra en `stripe_webhook_events`
   - ✅ Se crea registro en `membership_access` con `status='active'`
   - ✅ El usuario ve su nueva membresía en el perfil
   - ✅ El badge de membresía aparece en toda la aplicación

---

## 🔐 Seguridad en Producción

Cuando pases a producción:

1. **Cambia a Live Mode en Stripe**
2. **Crea un NUEVO webhook** para producción (la URL será la misma pero en Live Mode)
3. **Actualiza las variables de entorno** con las keys de producción:
   - `STRIPE_SECRET_KEY` = `sk_live_...`
   - `STRIPE_WEBHOOK_SECRET` = `whsec_...` (el nuevo de producción)
4. **Actualiza los Price IDs** en las membresías con los de producción

---

## 📞 Soporte

Si después de seguir todos los pasos sigues teniendo problemas:

1. Revisa los logs del Edge Function en Supabase
2. Revisa los logs del webhook en Stripe Dashboard
3. Verifica que los metadatos se estén enviando correctamente en el checkout

**Logs útiles para debugging:**

```sql
-- Ver todos los webhooks recibidos
SELECT event_type, processed, created_at
FROM stripe_webhook_events
ORDER BY created_at DESC;

-- Ver membresías activas
SELECT m.name, ma.status, ma.start_date, p.email
FROM membership_access ma
JOIN memberships m ON m.id = ma.membership_id
JOIN profiles p ON p.id = ma.user_id
WHERE ma.status = 'active'
ORDER BY ma.start_date DESC;
```

---

## 🚀 Resumen Ejecutivo

**Lo que falta para que funcione:**

1. ⚠️ **Configurar el webhook endpoint en Stripe** (5 minutos)
2. ⚠️ **Agregar `STRIPE_WEBHOOK_SECRET` en Supabase** (2 minutos)
3. ⚠️ **Verificar que `STRIPE_SECRET_KEY` esté configurada** (1 minuto)
4. ✅ **Configurar Price IDs** (opcional si ya existen productos en Stripe)

**Total: ~10 minutos de configuración**

Una vez hecho esto, los pagos funcionarán completamente de ida y vuelta, activando automáticamente las membresías.
