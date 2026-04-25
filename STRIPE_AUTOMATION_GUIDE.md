# Stripe Products & Webhooks - Complete Automation Guide

## ✅ Sistema Completo Implementado

Has sido configurado un sistema **100% automatizado** para gestionar productos, membresías y webhooks de Stripe sin necesidad de tocar código cada vez.

---

## 🎯 ¿Qué hace este sistema?

1. **Panel de Admin** para crear productos y membresías
2. **Integración automática con Stripe** (crea productos y precios con un click)
3. **Webhook que activa accesos automáticamente** cuando alguien compra
4. **Gestión de usuarios** (crea cuentas si no existen)
5. **Sin código adicional necesario** - todo es reutilizable

---

## 📋 Paso a Paso: Configuración Inicial

### 1️⃣ Configurar Variables de Entorno en Supabase

Ve a tu proyecto Supabase → **Project Settings** → **Edge Functions** → **Secrets**

Agrega:
```
STRIPE_SECRET_KEY = sk_test_xxxxx (tu clave secreta de Stripe en modo test)
```

**IMPORTANTE:** Usa `sk_test_` para testing, luego cambia a `sk_live_` en producción.

---

### 2️⃣ Configurar Webhook en Stripe Dashboard

1. Ve a [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. Pega esta URL:
   ```
   https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/stripe-webhook
   ```
4. Selecciona estos eventos:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.paid`
   - ✅ `invoice.payment_failed`

5. Click **"Add endpoint"**
6. Copia el **Signing Secret** (empieza con `whsec_...`)
7. Agrégalo como variable de entorno en Supabase:
   ```
   STRIPE_WEBHOOK_SECRET = whsec_xxxxx
   ```

---

## 🚀 Uso Diario: Crear Productos

### Desde el Panel de Admin

1. **Login como Admin** en tu aplicación
2. Ve a **Dashboard** → **Stripe Products**
3. Click **"New Product"**

### Crear un Programa de Entrenamiento

```
Nombre: 4-Week Training Program
Tipo: Program
Precio: 49.00 €
Duración: 4 semanas
Billing Cycle: One Time
Descripción: Complete 4-week strength training program
```

4. Click **"Create in Database"** ✅
5. El producto aparecerá en la lista
6. Click **"Create Stripe Product"** ✅
7. El sistema automáticamente:
   - Crea el producto en Stripe
   - Crea el precio
   - Genera el Checkout URL
   - Lo copia al portapapeles

### Crear una Membresía

```
Nombre: Asciende Monthly Membership
Tipo: Membership
Precio: 14.90 €
Billing Cycle: Monthly
Descripción: Access to all premium content
```

Mismo proceso: **Create in Database** → **Create Stripe Product**

---

## 🔗 Integración con Hostinger Builder

### En tu Landing Page (asciende.pro)

1. Edita la página de productos/membresías
2. Para cada card/botón de compra:
   - Usa el **Checkout URL** que generó el sistema
   - Ejemplo: `https://checkout.stripe.com/c/pay/cs_test_xxxxx`

3. Configura las URLs de éxito/cancelación:
   - Success: `https://asciende.pro/thank-you?session_id={CHECKOUT_SESSION_ID}`
   - Cancel: `https://asciende.pro/programs`

---

## 🔄 ¿Qué pasa cuando alguien compra?

### Flujo Automático:

1. **Usuario compra** en asciende.pro usando Checkout URL
2. **Stripe procesa el pago**
3. **Stripe envía evento** `checkout.session.completed` al webhook
4. **Webhook automáticamente:**
   - ✅ Busca al usuario por email
   - ✅ Si no existe → **crea la cuenta automáticamente**
   - ✅ Crea registro en `user_purchases`
   - ✅ Activa acceso según el tipo:
     - **Programa:** Calcula `end_date` = hoy + duración en semanas
     - **Membresía:** Establece `next_billing_date` según el ciclo
   - ✅ Estado = `active`
   - ✅ Guarda metadata (nombre, monto pagado, etc.)

5. **Usuario puede acceder** inmediatamente al contenido

---

## 🗂️ Estructura de Base de Datos

### Tablas Creadas:

**`stripe_products`**
- Todos los productos y membresías que creas
- Guarda IDs de Stripe (`stripe_product_id`, `stripe_price_id`)
- Checkout URLs

**`user_purchases`**
- Registro de todas las compras
- Estados: `active`, `canceled`, `expired`
- Fechas de inicio, fin, próximo cobro

**`stripe_webhook_events`**
- Log de todos los eventos recibidos
- Para auditoría y debugging

---

## 🔍 Ver Compras de Usuarios

### Como Admin:

```sql
-- Ver todas las compras activas
SELECT
  p.email,
  sp.name as product_name,
  up.status,
  up.start_date,
  up.end_date,
  up.next_billing_date
FROM user_purchases up
JOIN profiles p ON p.id = up.user_id
JOIN stripe_products sp ON sp.id = up.product_id
WHERE up.status = 'active'
ORDER BY up.created_at DESC;
```

---

## 🧪 Testing con Stripe CLI

### Instalación:

```bash
# Mac
brew install stripe/stripe-cli/stripe

# Windows (Chocolatey)
choco install stripe-cli

# Linux
# Download from https://github.com/stripe/stripe-cli/releases
```

### Testing Local:

```bash
# 1. Login
stripe login

# 2. Forward eventos al webhook
stripe listen --forward-to https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/stripe-webhook

# 3. Trigger un evento de prueba
stripe trigger checkout.session.completed
```

### Testing con Tarjeta de Prueba:

```
Número: 4242 4242 4242 4242
Fecha: Cualquier fecha futura
CVC: Cualquier 3 dígitos
ZIP: Cualquier código
```

---

## 📊 Verificar que Todo Funciona

### Checklist:

1. ✅ Crear producto en admin panel
2. ✅ Crear producto en Stripe (botón)
3. ✅ Copiar Checkout URL
4. ✅ Hacer compra de prueba (tarjeta 4242...)
5. ✅ Verificar evento recibido:
   ```sql
   SELECT * FROM stripe_webhook_events
   ORDER BY created_at DESC LIMIT 5;
   ```
6. ✅ Verificar compra creada:
   ```sql
   SELECT * FROM user_purchases
   ORDER BY created_at DESC LIMIT 5;
   ```

---

## 🔄 Gestión de Suscripciones

### Cancelaciones Automáticas:

Cuando Stripe envía `customer.subscription.deleted`:
- Status → `canceled`
- `end_date` → ahora
- Usuario pierde acceso

### Actualizaciones Automáticas:

Cuando Stripe envía `customer.subscription.updated`:
- Actualiza `next_billing_date`
- Mantiene acceso activo

### Pagos Fallidos:

Cuando Stripe envía `invoice.payment_failed`:
- Status → `canceled`
- Usuario pierde acceso
- *TODO: Agregar email de notificación*

---

## 🎨 Customización Futura

### Agregar Notificaciones por Email:

En `stripe-webhook/index.ts`, línea ~150:

```typescript
// TODO: Send notification/email to user
// Aquí puedes agregar:
await sendWelcomeEmail(userId, product.name);
```

### Agregar Programas Específicos:

Cuando el producto es un programa, puedes:
1. Duplicar template de entrenamiento
2. Asignarlo al usuario
3. Establecer fechas de inicio/fin

---

## 🔐 Seguridad

### RLS Policies Configuradas:

- ✅ Solo admins pueden crear/editar productos
- ✅ Usuarios solo ven sus propias compras
- ✅ Webhook events solo visibles por admins
- ✅ Webhook firma verificada (signature)

---

## 🚨 Troubleshooting

### "No signature found"
→ Verifica que `STRIPE_WEBHOOK_SECRET` esté configurado

### "Product not found for price_id"
→ Asegúrate de crear el producto en Stripe desde el admin panel

### "User not created"
→ Verifica que el email esté presente en el checkout

### Ver Logs del Webhook:

```bash
# En Supabase Edge Functions logs
supabase functions logs stripe-webhook
```

O en el dashboard de Supabase: Functions → stripe-webhook → Logs

---

## 📈 Próximos Pasos

1. ✅ Sistema base implementado
2. ⏳ Testing en modo test
3. ⏳ Agregar notificaciones por email
4. ⏳ Integrar con programas de entrenamiento
5. ⏳ Cambiar a modo producción (`sk_live_`)

---

## 🎯 Resumen Ejecutivo

**Ahora puedes:**
- ✅ Crear infinitos productos/membresías sin tocar código
- ✅ Generar Checkout URLs automáticamente
- ✅ Recibir pagos en Stripe
- ✅ Activar acceso automáticamente
- ✅ Gestionar suscripciones automáticamente
- ✅ Ver todas las compras en tiempo real

**Todo es reutilizable y escalable.** 🚀

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs del webhook
2. Verifica las variables de entorno
3. Prueba con Stripe CLI
4. Consulta la tabla `stripe_webhook_events` para ver eventos recibidos
