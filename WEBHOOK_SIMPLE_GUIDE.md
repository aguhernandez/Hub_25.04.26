# Cómo Funciona el Sistema de Productos y Webhook

## 🎯 Resumen Ultra Simple

**Tu trabajo:**
1. Crear producto en Stripe Products (admin panel)
2. Copiar Checkout URL
3. Pegar URL en botón de Hostinger

**Sistema automático:**
- Usuario paga → Webhook activa acceso → Usuario puede usar el producto

---

## 📝 Paso a Paso COMPLETO

### PARTE 1: Configuración Inicial (Una sola vez)

#### A) Configurar Stripe Keys en Supabase

1. Ve a [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Copia tu **Secret Key** (empieza con `sk_test_...`)
3. Ve a Supabase → Project Settings → Edge Functions → Add Secret:
   ```
   Name: STRIPE_SECRET_KEY
   Value: sk_test_51xxxxx (tu clave)
   ```

#### B) Configurar Webhook en Stripe

1. Ve a [Stripe Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click "Add endpoint"
3. Pega esta URL:
   ```
   https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/stripe-webhook
   ```
4. Selecciona eventos:
   - `checkout.session.completed`
   - `invoice.paid`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

5. Click "Add endpoint"
6. Copia el **Signing Secret** (empieza con `whsec_...`)
7. Agrégalo a Supabase Edge Functions:
   ```
   Name: STRIPE_WEBHOOK_SECRET
   Value: whsec_xxxxx
   ```

✅ **Configuración completa**

---

### PARTE 2: Crear un Producto (Cada vez que quieras vender algo nuevo)

#### En el Admin Panel

1. Login como admin
2. Dashboard → "Stripe Products"
3. Click "New Product"

#### Ejemplo 1: Programa de 4 Semanas

```
Nombre: 4-Week Training Program
Tipo: Program
Precio: 49.00
Duración: 4 semanas
Billing Cycle: One Time
Descripción: Complete strength training program
```

4. Click **"Create in Database"** → Producto guardado en tu base de datos
5. Click **"Create Stripe Product"** → Producto creado en Stripe automáticamente
6. El sistema muestra el **Checkout URL**
7. Copia el URL (se copia automáticamente al portapapeles)

#### Ejemplo 2: Membresía Mensual

```
Nombre: Asciende Monthly
Tipo: Membership
Precio: 14.90
Billing Cycle: Monthly
Descripción: Access to all premium content
```

Mismo proceso: Create in Database → Create Stripe Product

---

### PARTE 3: Integrar en tu Landing Page (Hostinger)

1. Ve a Hostinger Builder
2. Edita la página donde vendes (ej: `/programs`)
3. Encuentra el botón "Comprar" o "Buy Now"
4. **Pega el Checkout URL** que copiaste del admin
5. Guarda y publica

✅ Ya está listo para vender

---

### PARTE 4: ¿Qué Pasa Cuando Alguien Compra?

#### Usuario hace click en "Comprar":

1. **Stripe Checkout abre** con formulario de pago
2. Usuario ingresa datos de tarjeta
3. Usuario paga
4. **Stripe procesa el pago**

#### Automáticamente (sin tocar nada):

5. **Stripe envía evento** al webhook
6. **Webhook recibe:**
   - Email del usuario
   - Producto comprado (detecta por price_id)
   - Monto pagado

7. **Webhook busca usuario:**
   - Si existe → usa su cuenta
   - Si NO existe → **crea cuenta nueva** automáticamente

8. **Webhook crea registro** en `user_purchases`:
   ```
   Usuario: juan@ejemplo.com
   Producto: 4-Week Training Program
   Estado: active
   Inicio: hoy
   Fin: hoy + 28 días (4 semanas)
   ```

9. **Usuario recibe email** (opcional, configurar después)

10. **Usuario puede entrar** a hub.asciende.pro y ver su programa

---

## 🔍 Cómo Verificar que Funcionó

### Después de una compra de prueba:

#### 1. Ver el evento recibido:

En Supabase SQL Editor:
```sql
SELECT * FROM stripe_webhook_events
ORDER BY created_at DESC
LIMIT 5;
```

Deberías ver: `checkout.session.completed`

#### 2. Ver la compra creada:

```sql
SELECT
  p.email,
  sp.name,
  up.status,
  up.start_date,
  up.end_date
FROM user_purchases up
JOIN profiles p ON p.id = up.user_id
JOIN stripe_products sp ON sp.id = up.product_id
ORDER BY up.created_at DESC
LIMIT 5;
```

Deberías ver la compra con status = `active`

#### 3. Ver si se creó el usuario:

```sql
SELECT email, full_name, created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 5;
```

---

## 🧪 Testing SIN Gastar Dinero

### Usa tarjetas de prueba de Stripe:

```
Número: 4242 4242 4242 4242
Fecha: 12/34 (cualquier fecha futura)
CVC: 123 (cualquier 3 dígitos)
ZIP: 12345 (cualquier código)
```

Esta tarjeta NUNCA cobra de verdad. Es solo para testing.

---

## 📊 Ver Todos tus Productos

### En el Admin Panel:

Dashboard → Stripe Products

Verás:
- Nombre del producto
- Precio
- Tipo (Program / Membership)
- Stripe Product ID
- Checkout URL
- Estado (Active/Inactive)

---

## 🔄 Tipos de Productos Soportados

### 1. Programas (One-time payment)

**Ejemplo:**
- 4-week program = €49
- 12-week program = €99

**Qué hace el webhook:**
- Calcula `end_date` = start + duración
- Usuario tiene acceso hasta end_date
- Después expira automáticamente

### 2. Membresías Recurrentes

**Ejemplo:**
- Monthly = €14.90/mes
- Yearly = €150/año

**Qué hace el webhook:**
- Establece `next_billing_date`
- Renueva automáticamente cada mes/año
- Si falla el pago → cancela acceso

---

## ❓ Preguntas Frecuentes

### ¿Necesito crear el webhook cada vez que creo un producto?
**NO.** El webhook se configura UNA SOLA VEZ y funciona para todos los productos.

### ¿Necesito escribir código cada vez?
**NO.** Solo crear el producto en el admin panel.

### ¿Qué pasa si el usuario ya tiene cuenta?
El webhook detecta la cuenta existente y solo agrega la compra.

### ¿Qué pasa si el usuario NO tiene cuenta?
El webhook crea la cuenta automáticamente con email y contraseña temporal.

### ¿Cómo sabe qué programa dar?
Por el `price_id` de Stripe. Cada producto tiene un price_id único.

### ¿Funciona para suscripciones mensuales?
Sí, el webhook maneja renovaciones automáticas.

### ¿Qué pasa si falla un pago?
El webhook recibe `invoice.payment_failed` y cancela el acceso.

---

## 🚨 Si Algo No Funciona

### 1. Webhook no recibe eventos

**Check:**
- ¿Está configurado el webhook en Stripe?
- ¿La URL es correcta?
- ¿Seleccionaste los eventos correctos?

**Ver logs:**
- Stripe Dashboard → Webhooks → Click tu endpoint → Ver eventos

### 2. Usuario no se crea

**Check:**
- ¿El checkout tiene email?
- Ver logs en Supabase: Functions → stripe-webhook → Logs

### 3. Producto no se encuentra

**Check:**
- ¿Creaste el producto con "Create Stripe Product"?
- Verifica que `stripe_price_id` exista en la base de datos

---

## 🎯 Resumen Ejecutivo

### Tu trabajo:
1. ✅ Crear producto en admin (1 minuto)
2. ✅ Copiar URL
3. ✅ Pegar en Hostinger (30 segundos)

### Sistema automático:
- ✅ Procesar pagos
- ✅ Crear usuarios
- ✅ Activar accesos
- ✅ Gestionar renovaciones
- ✅ Cancelar si falla pago

**TODO SIN TOCAR CÓDIGO** 🚀

---

## 📞 Próximos Pasos Opcionales

1. Agregar emails de bienvenida
2. Integrar programas de entrenamiento
3. Notificaciones in-app
4. Portal de cliente para cambiar tarjeta
5. Modo producción (cambiar keys)
