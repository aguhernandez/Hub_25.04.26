# 💳 Flujo Completo de Pagos con Stripe

## 🔄 Diagrama del Flujo

```
┌─────────────┐
│   USUARIO   │
│ (Frontend)  │
└──────┬──────┘
       │
       │ 1. Click "Suscribirse"
       ▼
┌─────────────────────────────────────────────┐
│  Edge Function: stripe-create-membership-   │
│              checkout                       │
│                                             │
│  • Valida usuario autenticado              │
│  • Obtiene datos de la membresía           │
│  • Crea sesión de Stripe con metadata:     │
│    - user_id                                │
│    - membership_id                          │
│    - billing_cycle                          │
│    - type: 'membership_subscription'        │
└──────┬──────────────────────────────────────┘
       │
       │ 2. Devuelve URL de checkout
       ▼
┌─────────────┐
│   STRIPE    │◄──── 3. Usuario completa el pago
│  Checkout   │
└──────┬──────┘
       │
       │ 4a. Pago exitoso → checkout.session.completed
       │ 4b. Factura pagada → invoice.paid
       │ 4c. Suscripción creada → customer.subscription.created
       │
       ▼
┌─────────────────────────────────────────────┐
│         🔐 WEBHOOK ENDPOINT                 │
│  https://[tu-proyecto].supabase.co/         │
│         functions/v1/stripe-webhook         │
│                                             │
│  ⚠️ AQUÍ ES DONDE FALLA ACTUALMENTE         │
│  ❌ No está configurado en Stripe           │
└──────┬──────────────────────────────────────┘
       │
       │ 5. Stripe envía evento con los datos del pago
       │
       ▼
┌─────────────────────────────────────────────┐
│  Edge Function: stripe-webhook              │
│                                             │
│  • Verifica firma del webhook (seguridad)   │
│  • Registra evento en stripe_webhook_events │
│  • Procesa según tipo de evento:            │
│                                             │
│    Si type = 'membership_subscription':     │
│      → Crea registro en membership_access   │
│      → status = 'active'                    │
│      → Guarda subscription_id               │
│                                             │
│    Si type = 'program_purchase':            │
│      → Actualiza program_purchases          │
│      → status = 'completed'                 │
│                                             │
│  • Marca evento como procesado              │
└──────┬──────────────────────────────────────┘
       │
       │ 6. Membresía activada
       ▼
┌──────────────────────────┐
│   BASE DE DATOS          │
│                          │
│  membership_access       │
│  ├─ user_id             │
│  ├─ membership_id       │
│  ├─ status: 'active'    │
│  ├─ start_date          │
│  ├─ stripe_subscription │
│  └─ source: 'stripe'    │
└──────────────────────────┘
       │
       │ 7. Usuario ve su nueva membresía
       ▼
┌─────────────┐
│   USUARIO   │
│ ✅ Membresía│
│   Activa    │
└─────────────┘
```

---

## 🎯 El Problema Actual

### ❌ Flujo Actual (Roto)

```
Usuario → Paga → Stripe cobra ✅
                      ↓
                  Webhook ❌ (no configurado)
                      ↓
                  (Nada pasa)
                      ↓
            Membresía NO se activa ❌
```

### ✅ Flujo Esperado (Cuando funcione)

```
Usuario → Paga → Stripe cobra ✅
                      ↓
                  Webhook ✅ (configurado)
                      ↓
              stripe-webhook function ✅
                      ↓
          Registra en base de datos ✅
                      ↓
            Membresía se activa ✅
```

---

## 🔧 Qué Falta Configurar

### 1. ⚠️ Webhook Endpoint en Stripe

**Estado**: ❌ NO CONFIGURADO

**URL que debe configurarse**:
```
https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/stripe-webhook
```

**Eventos a escuchar**:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

### 2. ⚠️ Webhook Secret

**Estado**: ❌ FALTA VARIABLE DE ENTORNO

**Variable necesaria**:
```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

**Dónde obtenerlo**:
- Stripe Dashboard → Developers → Webhooks → [Tu endpoint] → Reveal signing secret

**Dónde configurarlo**:
- Supabase Dashboard → Settings → Edge Functions → Secrets

### 3. ⚠️ Stripe Secret Key

**Estado**: ⚠️ VERIFICAR SI ESTÁ CONFIGURADA

**Variable necesaria**:
```bash
STRIPE_SECRET_KEY=sk_test_xxxxx  # o sk_live_xxxxx en producción
```

---

## 📋 Metadata Enviado en el Checkout

Cuando un usuario compra una membresía, se envían estos metadatos a Stripe:

```javascript
{
  // En la sesión de checkout
  metadata: {
    user_id: "uuid-del-usuario",
    membership_id: "uuid-de-la-membresia",
    billing_cycle: "monthly" | "annual",
    type: "membership_subscription"
  },

  // También en los datos de la suscripción
  subscription_data: {
    metadata: {
      user_id: "uuid-del-usuario",
      membership_id: "uuid-de-la-membresia",
      billing_cycle: "monthly" | "annual"
    }
  }
}
```

Estos metadatos viajan de ida y vuelta:
1. Frontend → Edge Function → Stripe ✅
2. Stripe → Webhook → Base de datos ❌ (aquí está roto)

---

## 🧪 Cómo Probar que Funciona

### Paso 1: Ejecutar Script de Diagnóstico

```bash
npm run verify-stripe
```

Este script te dirá:
- ✅ Si hay eventos de webhook registrados
- ✅ Si hay membresías activadas
- ✅ Configuración de las membresías
- ❌ Qué falta configurar

### Paso 2: Prueba Manual desde Stripe

1. Ve a Stripe Dashboard → Developers → Webhooks
2. Click en tu endpoint
3. Click "Send test webhook"
4. Selecciona `checkout.session.completed`
5. Click "Send test webhook"

### Paso 3: Verifica en la Base de Datos

```sql
-- Debe aparecer el evento de prueba
SELECT * FROM stripe_webhook_events
ORDER BY created_at DESC
LIMIT 1;
```

### Paso 4: Prueba Real de Compra

1. Usa tarjeta de prueba: `4242 4242 4242 4242`
2. Realiza una compra de membresía
3. Verifica que se active:

```sql
-- Debe aparecer la membresía activa
SELECT * FROM membership_access
WHERE status = 'active'
ORDER BY start_date DESC
LIMIT 1;
```

---

## 🎉 Indicadores de Éxito

Sabrás que todo funciona cuando:

### 1. En la Base de Datos

```sql
-- Hay eventos registrados
SELECT COUNT(*) FROM stripe_webhook_events;
-- Resultado esperado: > 0

-- Hay membresías activas
SELECT COUNT(*) FROM membership_access WHERE status = 'active';
-- Resultado esperado: > 0

-- Los eventos se procesaron correctamente
SELECT processed, COUNT(*)
FROM stripe_webhook_events
GROUP BY processed;
-- Resultado esperado: processed = true para todos
```

### 2. En el Frontend

- ✅ Usuario compra membresía
- ✅ Es redirigido a página de éxito
- ✅ Ve su nueva membresía en el perfil
- ✅ Badge de membresía aparece en toda la app
- ✅ Tiene acceso a contenido premium

### 3. En Stripe Dashboard

- ✅ En Developers → Webhooks → [Tu endpoint] → Events
- ✅ Ves eventos con status 200 (exitosos)
- ✅ No hay errores 400, 401, 500

---

## 🚨 Errores Comunes y Soluciones

### Error: "No signature"

**Causa**: Stripe no envía el header `stripe-signature`

**Solución**:
- Verifica que la URL del webhook en Stripe sea exactamente:
  `https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/stripe-webhook`

### Error: "Invalid signature"

**Causa**: `STRIPE_WEBHOOK_SECRET` está mal o no está configurado

**Solución**:
1. Ve a Stripe → Webhooks → Tu endpoint
2. Copia el signing secret (empieza con `whsec_`)
3. Configúralo en Supabase: Settings → Edge Functions → Secrets

### Error: "No customer email found"

**Causa**: El checkout no incluye el email del cliente

**Solución**:
- Ya está resuelto en el código: se usa `profile?.email || user.email`

### Error: "Product not found"

**Causa**: Los `stripe_price_id_monthly` o `stripe_price_id_annual` no están configurados

**Solución**:
```sql
UPDATE memberships
SET
  stripe_price_id_monthly = 'price_xxxxx',
  stripe_price_id_annual = 'price_yyyyy'
WHERE slug = 'base';
```

---

## 📞 Soporte Adicional

### Logs Útiles

**Ver logs del Edge Function:**
```bash
# En Supabase Dashboard
Edge Functions → stripe-webhook → Logs

# O en la CLI
supabase functions logs stripe-webhook --follow
```

**Ver logs del webhook en Stripe:**
```
Stripe Dashboard → Developers → Webhooks → [Tu endpoint] → Attempts
```

### Queries Útiles

```sql
-- Ver eventos sin procesar
SELECT * FROM stripe_webhook_events
WHERE processed = false
ORDER BY created_at DESC;

-- Ver membresías por fuente
SELECT source, COUNT(*)
FROM membership_access
GROUP BY source;
-- Resultado esperado:
-- stripe: X (pagos automáticos)
-- admin: Y (asignaciones manuales)

-- Ver suscripciones activas con datos de Stripe
SELECT
  p.email,
  m.name_es as membresia,
  ma.stripe_subscription_id,
  ma.start_date
FROM membership_access ma
JOIN profiles p ON p.id = ma.user_id
JOIN memberships m ON m.id = ma.membership_id
WHERE ma.status = 'active'
  AND ma.source = 'stripe';
```

---

## 🎯 Resumen: 3 Pasos para Arreglar

1. **Configurar Webhook en Stripe** (5 min)
   - URL: `https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/stripe-webhook`
   - Seleccionar los 6 eventos mencionados
   - Copiar el signing secret

2. **Configurar Variables de Entorno en Supabase** (2 min)
   - `STRIPE_WEBHOOK_SECRET` = signing secret de Stripe
   - `STRIPE_SECRET_KEY` = tu API key secreta de Stripe

3. **Probar** (3 min)
   - Enviar test webhook desde Stripe
   - Ejecutar `npm run verify-stripe`
   - Realizar compra de prueba

**Total: ~10 minutos**

Después de esto, los pagos funcionarán automáticamente de principio a fin.
