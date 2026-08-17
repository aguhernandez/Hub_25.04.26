# Configuración de Membresías con Stripe

Este documento explica cómo configurar correctamente las membresías con Stripe para que el botón "Create in Stripe" funcione correctamente.

## Problema Actual

El botón "Create in Stripe" (o "Crear en Stripe") en la página de Admin > Memberships no funciona porque faltan las credenciales de Stripe.

## Solución Paso a Paso

### 1. Obtener las Claves de Stripe

1. Ve a tu [Dashboard de Stripe](https://dashboard.stripe.com/)
2. Inicia sesión o crea una cuenta si no tienes una
3. Ve a **Developers > API Keys**
4. Encontrarás dos claves importantes:
   - **Publishable key** (empieza con `pk_test_` o `pk_live_`)
   - **Secret key** (empieza con `sk_test_` o `sk_live_`)
5. También necesitarás el **Webhook Secret** (lo configuraremos más adelante)

### 2. Configurar Variables de Entorno Locales

1. Abre el archivo `.env` en la raíz del proyecto
2. Reemplaza los valores de ejemplo con tus claves reales:

```env
# Stripe Integration
STRIPE_PUBLIC_KEY=pk_test_tu_clave_publica_de_stripe
STRIPE_SECRET_KEY=sk_test_tu_clave_secreta_de_stripe
STRIPE_WEBHOOK_SECRET=whsec_tu_secreto_de_webhook
```

**Importante**: Para producción, usa las claves que empiezan con `pk_live_` y `sk_live_`. Para pruebas, usa las que empiezan con `pk_test_` y `sk_test_`.

### 3. Configurar Secretos en Supabase

Las Edge Functions de Supabase necesitan acceso a estas variables. Debes configurarlas como secretos:

#### Opción A: Usando el Dashboard de Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Ve a **Settings > Edge Functions**
3. En la sección **Secrets**, agrega las siguientes variables:
   - `STRIPE_PUBLIC_KEY` = tu clave pública
   - `STRIPE_SECRET_KEY` = tu clave secreta
   - `STRIPE_WEBHOOK_SECRET` = tu secreto de webhook

#### Opción B: Usando Supabase CLI (si lo tienes instalado)

```bash
supabase secrets set STRIPE_PUBLIC_KEY=pk_test_tu_clave
supabase secrets set STRIPE_SECRET_KEY=sk_test_tu_clave
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_tu_secreto
```

### 4. Configurar el Webhook de Stripe (Opcional pero Recomendado)

Para recibir eventos de Stripe (pagos exitosos, cancelaciones, etc.):

1. Ve a **Developers > Webhooks** en el Dashboard de Stripe
2. Haz clic en **Add endpoint**
3. Ingresa la URL de tu Edge Function:
   ```
   https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/stripe-webhook
   ```
4. Selecciona los eventos que quieres escuchar:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copia el **Signing secret** (empieza con `whsec_`) y úsalo como `STRIPE_WEBHOOK_SECRET`

### 5. Verificar la Configuración

1. Reinicia tu aplicación local
2. Ve a la página de Admin > Memberships
3. Selecciona una membresía existente o crea una nueva
4. Haz clic en "Create in Stripe" para el precio mensual o anual
5. Deberías ver el mensaje "Stripe product created (monthly/annual)"

## Cómo Funciona

1. **Creación del Producto**: La primera vez que haces clic en "Create in Stripe", se crea un **Producto** en Stripe con el nombre y descripción de la membresía
2. **Creación del Precio**: Se crea un **Precio** en Stripe con el valor mensual o anual
3. **Mapeo en Base de Datos**: Se guarda la relación entre la membresía local y los IDs de Stripe
4. **URL de Checkout**: Se genera una URL de checkout para que los usuarios puedan comprar

## Estructura de Membresías en la Base de Datos

La tabla `memberships` tiene los siguientes campos importantes para Stripe:

- `stripe_product_id`: ID del producto en Stripe
- `stripe_price_id_monthly`: ID del precio mensual en Stripe
- `stripe_price_id_annual`: ID del precio anual en Stripe
- `price_monthly`: Precio mensual en tu moneda local
- `price_annual`: Precio anual en tu moneda local
- `currency`: Moneda (USD, EUR, GBP, etc.)

## Edge Functions Involucradas

1. **stripe-create-membership-product**: Crea productos y precios en Stripe
2. **stripe-create-membership-checkout**: Crea sesiones de checkout para comprar membresías
3. **stripe-webhook**: Recibe notificaciones de Stripe sobre eventos de pago

## Troubleshooting

### Error: "Not authenticated" o "Unauthorized"
- Verifica que estés logueado como admin o trainer
- Verifica que tu token de sesión sea válido

### Error: "Missing required fields"
- Verifica que la membresía tenga `price_monthly` o `price_annual` configurado
- Verifica que el `billing_cycle` sea 'monthly' o 'annual'

### Error: "Stripe API error"
- Verifica que las claves de Stripe sean correctas
- Verifica que las claves estén configuradas en Supabase (no solo localmente)
- Verifica que uses claves de test (`sk_test_`) para desarrollo

### El botón no hace nada
- Abre la consola del navegador (F12) para ver errores
- Verifica que la Edge Function esté desplegada: `stripe-create-membership-product`
- Verifica que las variables de entorno estén configuradas en Supabase

## Flujo de Compra de Membresías

Una vez configurado:

1. Usuario ve las membresías en el marketplace
2. Hace clic en "Suscribirse" o similar
3. Se crea una sesión de checkout en Stripe
4. Usuario es redirigido a Stripe para pagar
5. Stripe procesa el pago
6. Webhook notifica a tu sistema
7. Se actualiza la tabla `user_memberships` con la suscripción activa
8. Usuario tiene acceso a las funcionalidades de su membresía

## Próximos Pasos

1. Configura las claves de Stripe siguiendo esta guía
2. Prueba crear un producto en Stripe desde la página de admin
3. Verifica que el producto aparezca en tu Dashboard de Stripe
4. Prueba el flujo de checkout completo con una tarjeta de prueba de Stripe
5. Configura el webhook para recibir eventos de pago

## Tarjetas de Prueba de Stripe

Para probar pagos en modo test:

- **Éxito**: 4242 4242 4242 4242
- **Requiere 3D Secure**: 4000 0027 6000 3184
- **Declinada**: 4000 0000 0000 0002

Usa cualquier fecha futura y cualquier CVC de 3 dígitos.

---

Para más información, consulta la [documentación oficial de Stripe](https://stripe.com/docs).
