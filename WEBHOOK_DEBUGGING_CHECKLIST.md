# 🔍 Checklist de Debugging: Webhook de Stripe

## 📊 Estado Actual (Verificado)

### ✅ Configurado Correctamente:
- Price IDs en la base de datos:
  - **Asciende**: `price_1SpNiyErPHHgrU6UI3dnr4T8` (mensual), `price_1SmqvNErPHHgrU6UlCtJ5IKJ` (anual)
  - **PRO**: `price_1SmqgZErPHHgrU6U0Rn23mQ0` (mensual), `price_1SmqgfErPHHgrU6UDk4MRaOn` (anual)
- Webhook endpoint creado en Stripe ✅

### ❌ Problema Actual:
- **NO hay eventos de webhook en la base de datos** (tabla `stripe_webhook_events` vacía)
- Esto significa que el webhook NO está enviando eventos correctamente

---

## 🎯 Pasos para Arreglar

### PASO 1: Verificar el Webhook Secret en Supabase

**Este es el paso MÁS IMPORTANTE**

1. **Ir a Stripe Dashboard**:
   - Ve a: https://dashboard.stripe.com/test/webhooks
   - Click en tu webhook endpoint (la URL de Supabase)
   - En la sección "Signing secret", click en **"Reveal"** o **"Click to reveal"**
   - **COPIA** el secret completo (empieza con `whsec_...`)

2. **Ir a Supabase Dashboard**:
   - Ve a: https://supabase.com/dashboard/project/ngkcbygyoobqhlmlnuvl/settings/functions
   - En la sección **"Secrets"**, busca si existe `STRIPE_WEBHOOK_SECRET`

   **Si NO existe:**
   - Click en **"Add new secret"**
   - Name: `STRIPE_WEBHOOK_SECRET`
   - Value: Pega el secret que copiaste de Stripe
   - Click en **"Save"**

   **Si YA existe:**
   - Click en **"Edit"** o el ícono de editar
   - Pega el secret correcto de Stripe
   - Click en **"Save"**

3. **Verificar también STRIPE_SECRET_KEY**:
   - Debe existir una variable llamada `STRIPE_SECRET_KEY`
   - Si no existe, ve a Stripe Dashboard → Developers → API keys
   - Copia la **Secret key** (empieza con `sk_test_...` o `sk_live_...`)
   - Agrégala como secret en Supabase con el mismo proceso

---

### PASO 2: Enviar Test Webhook desde Stripe

1. **En Stripe Dashboard**:
   - Ve a: Developers → Webhooks
   - Click en tu webhook endpoint
   - Click en **"Send test webhook"**
   - Selecciona: `checkout.session.completed`
   - Click en **"Send test webhook"**

2. **Verificar el resultado**:
   - En la misma página, deberías ver el evento que acabas de enviar
   - **Status esperado**: `200` (verde) ✅
   - **Si ves otro status** (400, 401, 500):
     - Click en el evento para ver los detalles
     - Anota el error y continúa al Paso 3

---

### PASO 3: Verificar que el Evento Llegó a la Base de Datos

Después de enviar el test webhook, ejecuta esta query en Supabase SQL Editor:

```sql
SELECT
  event_id,
  event_type,
  processed,
  created_at,
  error_message,
  raw_payload
FROM stripe_webhook_events
ORDER BY created_at DESC
LIMIT 5;
```

**Resultado esperado:**
- Debes ver AL MENOS 1 evento con `event_type = 'checkout.session.completed'`

**Si la tabla está vacía:**
- El webhook NO está llegando → Continúa al Paso 4

**Si hay eventos pero `processed = false`:**
- Los eventos llegan pero no se procesan → Continúa al Paso 5

---

### PASO 4: Verificar la URL del Webhook en Stripe

1. **En Stripe Dashboard → Webhooks**:
   - Verifica que la URL sea EXACTAMENTE:
   ```
   https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/stripe-webhook
   ```

   **IMPORTANTE**: La URL NO debe tener:
   - ❌ `/auth/` en el path
   - ❌ Espacios al inicio o final
   - ❌ Https:// duplicado
   - ❌ Parámetros extras (?xxx=yyy)

2. **Verificar los eventos seleccionados**:
   - En "Events to send", debe decir **"6 events"** o más
   - Click para expandir y verificar que estén estos:
     - ✅ `checkout.session.completed`
     - ✅ `customer.subscription.created`
     - ✅ `customer.subscription.updated`
     - ✅ `customer.subscription.deleted`
     - ✅ `invoice.paid`
     - ✅ `invoice.payment_failed`

3. **Si falta alguno**:
   - Click en **"Update endpoint"** o el botón de editar
   - Selecciona los eventos faltantes
   - Guarda los cambios

---

### PASO 5: Verificar que el Edge Function Esté Desplegado

1. **En Supabase Dashboard**:
   - Ve a: Edge Functions
   - URL: https://supabase.com/dashboard/project/ngkcbygyoobqhlmlnuvl/functions

2. **Verificar que exista**: `stripe-webhook`
   - Debe aparecer en la lista de funciones
   - Debe tener status **"Deployed"** o **"Active"**

3. **Si NO aparece o no está deployed**:
   - El edge function necesita ser desplegado
   - Contáctame para ayudarte a desplegarlo

---

### PASO 6: Revisar Logs del Webhook en Stripe

1. **En Stripe Dashboard → Webhooks**:
   - Click en tu endpoint
   - Ve a la pestaña **"Events"** o **"Attempts"**

2. **Busca los últimos intentos**:
   - Debes ver una lista de intentos de envío
   - Click en cualquiera para ver los detalles

3. **Códigos de respuesta comunes**:

   **✅ 200 - Success**: Todo funciona perfecto

   **❌ 400 - Bad Request**:
   - Causa probable: El webhook secret está mal configurado
   - Solución: Repite el Paso 1

   **❌ 401 - Unauthorized**:
   - Causa probable: Falta el header de autorización o el secret
   - Solución: Verifica que `STRIPE_WEBHOOK_SECRET` esté configurado

   **❌ 500 - Internal Server Error**:
   - Causa probable: Error en el código del edge function
   - Solución: Ve al Paso 7 para revisar los logs

   **❌ 504 - Gateway Timeout**:
   - Causa probable: El edge function no está desplegado o no responde
   - Solución: Ve al Paso 5

---

### PASO 7: Revisar Logs del Edge Function

1. **En Supabase Dashboard**:
   - Ve a: Edge Functions → stripe-webhook
   - Click en la pestaña **"Logs"**

2. **Buscar errores recientes**:
   - Ordena por fecha (más reciente primero)
   - Busca líneas con ❌ o "Error"
   - Anota el mensaje de error completo

3. **Errores comunes y soluciones**:

   **"No signature"**:
   - Stripe no está enviando el header `stripe-signature`
   - Verifica la URL del webhook (Paso 4)

   **"Invalid signature"**:
   - El `STRIPE_WEBHOOK_SECRET` está mal
   - Repite el Paso 1 con mucho cuidado

   **"No customer email found"**:
   - El evento de prueba no tiene email
   - Esto es normal en eventos de prueba, prueba con una compra real

   **"Product not found"**:
   - El Price ID del checkout no coincide con ninguna membresía
   - Verifica los Price IDs (ya están correctos según la verificación)

---

### PASO 8: Prueba Real de Compra

Si los test webhooks funcionan (status 200), prueba con una compra real:

1. **En tu aplicación**:
   - Ve a la página de Membresías
   - Click en **"Suscribirse"** a cualquier membresía

2. **En el checkout de Stripe**:
   - Usa la tarjeta de prueba: `4242 4242 4242 4242`
   - Fecha: Cualquier fecha futura (ej: 12/26)
   - CVC: Cualquier 3 dígitos (ej: 123)
   - Email: Tu email real
   - Nombre: Tu nombre

3. **Completar el pago**:
   - Click en **"Subscribe"** o **"Pay"**
   - Deberías ser redirigido a una página de éxito

4. **Verificar en la base de datos**:
   ```sql
   -- Ver el evento del webhook
   SELECT * FROM stripe_webhook_events
   WHERE event_type = 'checkout.session.completed'
   ORDER BY created_at DESC
   LIMIT 1;

   -- Ver la membresía activada
   SELECT
     p.email,
     m.name_es,
     ma.status,
     ma.start_date
   FROM membership_access ma
   JOIN profiles p ON p.id = ma.user_id
   JOIN memberships m ON m.id = ma.membership_id
   WHERE ma.status = 'active'
   ORDER BY ma.start_date DESC
   LIMIT 1;
   ```

5. **Resultado esperado**:
   - Ambas queries deben devolver resultados
   - El email de ambas debe coincidir
   - La membresía debe tener `status = 'active'`

---

## 🎉 Indicadores de Éxito

Sabrás que todo funciona cuando:

### En Stripe:
- [ ] Webhook endpoint muestra status **"Enabled"**
- [ ] Events tab muestra intentos con status **200**
- [ ] No hay errores en los últimos intentos

### En la Base de Datos:
- [ ] `stripe_webhook_events` tiene eventos registrados
- [ ] Los eventos tienen `processed = true`
- [ ] `membership_access` tiene membresías con `status = 'active'`
- [ ] Las membresías tienen `source = 'stripe'`

### En el Frontend:
- [ ] Usuario ve su membresía activa en el perfil
- [ ] Badge de membresía aparece correctamente
- [ ] Tiene acceso a contenido según su nivel

---

## 📋 Resumen: Qué Revisar en Orden

1. ✅ **STRIPE_WEBHOOK_SECRET** configurado en Supabase (Paso 1)
2. ✅ **STRIPE_SECRET_KEY** configurado en Supabase (Paso 1)
3. ✅ **Test webhook** desde Stripe devuelve 200 (Paso 2)
4. ✅ **Evento aparece** en `stripe_webhook_events` (Paso 3)
5. ✅ **URL correcta** en Stripe webhook (Paso 4)
6. ✅ **Edge function** está desplegado (Paso 5)
7. ✅ **Logs** no muestran errores (Paso 7)
8. ✅ **Compra de prueba** activa la membresía (Paso 8)

---

## 🚨 Si Nada Funciona

Si después de seguir todos los pasos sigues sin recibir eventos:

1. **Copia esta información**:
   - Status HTTP del webhook en Stripe (200, 400, 500, etc.)
   - Mensaje de error completo (si hay)
   - Logs del edge function (últimas 5 líneas)
   - Si la tabla `stripe_webhook_events` tiene datos o está vacía

2. **Revisa la configuración básica**:
   ```sql
   -- Ver si las variables de entorno están disponibles
   -- (esto no muestra los valores, solo verifica la configuración)
   SELECT
     COUNT(*) as total_memberships,
     COUNT(stripe_price_id_monthly) as with_monthly_price,
     COUNT(stripe_price_id_annual) as with_annual_price
   FROM memberships;
   ```

3. **Intenta crear el webhook de nuevo**:
   - Elimina el webhook actual en Stripe
   - Crea uno nuevo con la misma URL
   - Copia el NUEVO signing secret
   - Actualiza `STRIPE_WEBHOOK_SECRET` en Supabase
   - Prueba de nuevo

---

## 📞 Información de Contacto para Soporte

Si necesitas ayuda, proporciona:
- ✅ Price IDs están configurados
- ❌ NO hay eventos en `stripe_webhook_events`
- URL del webhook: `https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/stripe-webhook`
- Status HTTP del último intento en Stripe: [AQUÍ]
- Mensaje de error (si hay): [AQUÍ]

---

## ⏰ Tiempo Estimado por Paso

- Paso 1: 3 minutos (configurar secrets)
- Paso 2: 1 minuto (enviar test webhook)
- Paso 3: 1 minuto (verificar en DB)
- Paso 4: 2 minutos (verificar URL)
- Paso 5: 1 minuto (verificar edge function)
- Paso 6: 2 minutos (revisar logs Stripe)
- Paso 7: 2 minutos (revisar logs Supabase)
- Paso 8: 5 minutos (prueba real)

**Total: ~15-20 minutos** para debugging completo
