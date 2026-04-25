# 🔐 Guía de Configuración Segura de API Keys

## ⚠️ IMPORTANTE: Seguridad de API Keys

**NUNCA compartas tus API keys completas con terceros.** Esta guía te explica cómo configurar claves restringidas de forma segura.

---

## 📋 Resumen de APIs

| API | Tipo de Clave | Nivel de Restricción | Dónde se Usa |
|-----|---------------|---------------------|--------------|
| **Brevo** | API Key | Permisos específicos | Edge Function |
| **Stripe** | Secret Key | Restricted Key | Edge Function |
| **Zoom** | Server-to-Server OAuth | Scopes limitados | Edge Function |

**Todas las claves se almacenan en Supabase Edge Functions como variables de entorno.**

---

## 🔵 1. BREVO (Email & Chat)

### **Tipo de Clave Recomendada: API Key con Permisos Limitados**

### **Paso 1: Crear API Key Restringida**

1. Ve a [Brevo Dashboard](https://app.brevo.com) → Login
2. Click en tu nombre (esquina superior derecha) → **API Keys**
3. Click **"Generate a new API key"**
4. Configurar permisos:

```
Nombre: Asciende Production API

✅ Permisos NECESARIOS:
  ✅ Transactional Emails → Send
  ✅ Transactional Emails → Templates
  ✅ Contacts → View
  ✅ Contacts → Create/Update
  ✅ Conversations → View
  ✅ Conversations → Send

❌ Permisos NO NECESARIOS (deshabilitar):
  ❌ Email Campaigns
  ❌ SMS Campaigns
  ❌ WhatsApp Campaigns
  ❌ Account Settings
  ❌ Payment
  ❌ Statistics (opcional)
```

5. Click **"Generate"**
6. **COPIA la clave INMEDIATAMENTE** (solo se muestra una vez)
7. Guárdala temporalmente en un lugar seguro

### **Paso 2: Configurar en Supabase**

```bash
# En Supabase Dashboard:
# Settings → Edge Functions → Secrets

BREVO_API_KEY=xkeysib-tu-clave-aqui
BREVO_SENDER_EMAIL=info@asciende.pro
BREVO_SENDER_NAME=Asciende Team
```

### **¿Por qué es seguro?**

- ✅ La clave está en el servidor (Supabase), no en el frontend
- ✅ Solo tiene permisos para enviar emails
- ✅ No puede modificar configuración de cuenta
- ✅ No puede acceder a billing/pagos
- ✅ Puedes revocarla en cualquier momento

### **Testing:**

```bash
curl -X POST https://api.brevo.com/v3/smtp/email \
  -H "api-key: TU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "sender": {"name": "Test", "email": "test@asciende.pro"},
    "to": [{"email": "destination@example.com"}],
    "subject": "Test",
    "htmlContent": "<p>Test email</p>"
  }'
```

**Respuesta esperada:** `{"messageId": "..."}`

---

## 💳 2. STRIPE (Pagos)

### **Tipo de Clave Recomendada: Restricted Secret Key**

Stripe permite crear claves con permisos específicos. **NUNCA uses tu Secret Key principal.**

### **Paso 1: Crear Restricted Key**

1. Ve a [Stripe Dashboard](https://dashboard.stripe.com) → Login
2. Developers → **API keys**
3. Click **"Create restricted key"**
4. Configurar:

```
Nombre: Asciende Edge Functions

✅ Permisos NECESARIOS:

Core Resources:
  ✅ Customers → Write
  ✅ Payment Intents → Write
  ✅ Subscriptions → Write
  ✅ Prices → Read
  ✅ Products → Read

Checkout:
  ✅ Sessions → Write

Billing:
  ✅ Invoices → Read
  ✅ Invoice Items → Write

Webhooks:
  ✅ Webhook Endpoints → Read

❌ Permisos NO NECESARIOS:
  ❌ Balance
  ❌ Payouts
  ❌ Transfers
  ❌ Account (settings)
  ❌ Reporting
  ❌ Issuing
```

5. Click **"Create key"**
6. **COPIA la clave** (rk_live_... o rk_test_...)

### **Paso 2: Configurar Webhook Secret**

1. Developers → **Webhooks**
2. Click **"Add endpoint"**
3. URL: `https://tu-proyecto.supabase.co/functions/v1/stripe-webhook`
4. Seleccionar eventos:

```
✅ checkout.session.completed
✅ invoice.paid
✅ invoice.payment_failed
✅ customer.subscription.created
✅ customer.subscription.updated
✅ customer.subscription.deleted
```

5. Click **"Add endpoint"**
6. Click en el webhook → **"Reveal signing secret"**
7. Copia el secret (whsec_...)

### **Paso 3: Configurar en Supabase**

```bash
# Test Mode (desarrollo):
STRIPE_SECRET_KEY=rk_test_tu_clave_restringida
STRIPE_WEBHOOK_SECRET=whsec_tu_webhook_secret

# Production Mode:
STRIPE_SECRET_KEY=rk_live_tu_clave_restringida
STRIPE_WEBHOOK_SECRET=whsec_tu_webhook_secret_prod
```

### **¿Por qué es seguro?**

- ✅ Clave restringida solo para checkout y subscripciones
- ✅ No puede hacer transferencias de dinero
- ✅ No puede modificar configuración de cuenta
- ✅ No puede acceder a balance/payouts
- ✅ Webhook signature verifica que requests son de Stripe
- ✅ Puedes revocarla sin afectar otras integraciones

### **Testing:**

```bash
# Verificar que la clave funciona:
curl https://api.stripe.com/v1/products \
  -u rk_test_TU_CLAVE:

# Respuesta esperada: lista de productos
```

---

## 📹 3. ZOOM (Videollamadas)

### **Tipo de Clave Recomendada: Server-to-Server OAuth App**

Zoom recomienda **Server-to-Server OAuth** para aplicaciones backend (más seguro que JWT).

### **Paso 1: Crear Server-to-Server OAuth App**

1. Ve a [Zoom App Marketplace](https://marketplace.zoom.us/) → Login
2. Click **"Develop"** → **"Build App"**
3. Selecciona **"Server-to-Server OAuth"**
4. Llenar información básica:

```
App name: Asciende Meetings
Short description: Meeting management for Asciende platform
Company name: Tu empresa
Developer contact: tu@email.com
```

5. Click **"Create"**

### **Paso 2: Configurar Scopes (Permisos)**

En la pestaña **"Scopes"**, agregar SOLO estos permisos:

```
✅ Permisos NECESARIOS:

Meeting:
  ✅ meeting:write:admin → Create meetings
  ✅ meeting:read:admin → View meeting details
  ✅ meeting:update:admin → Update meetings
  ✅ meeting:delete:admin → Delete meetings

User:
  ✅ user:read:admin → Read user info

❌ Permisos NO NECESARIOS:
  ❌ Webinar
  ❌ Recording
  ❌ Dashboard
  ❌ Account
  ❌ Billing
  ❌ Phone
```

### **Paso 3: Obtener Credenciales**

1. Ve a la pestaña **"App Credentials"**
2. Verás 3 valores importantes:

```
Account ID: abc123...
Client ID: xyz789...
Client Secret: def456... (click "View" para revelar)
```

3. **COPIA los 3 valores**

### **Paso 4: Activar la App**

1. Click **"Activation"** en el menú izquierdo
2. Toggle para activar la app
3. Confirma que quieres activarla

### **Paso 5: Configurar en Supabase**

```bash
ZOOM_ACCOUNT_ID=tu_account_id
ZOOM_CLIENT_ID=tu_client_id
ZOOM_CLIENT_SECRET=tu_client_secret
```

### **¿Por qué es seguro?**

- ✅ OAuth es más seguro que API Key/Secret tradicional
- ✅ Tokens se renuevan automáticamente
- ✅ Scopes limitados solo a gestión de meetings
- ✅ No puede acceder a recordings
- ✅ No puede modificar configuración de cuenta
- ✅ No puede acceder a billing
- ✅ Puedes desactivar la app en cualquier momento

### **Testing:**

```bash
# 1. Obtener Access Token
curl -X POST https://zoom.us/oauth/token \
  -H "Authorization: Basic $(echo -n CLIENT_ID:CLIENT_SECRET | base64)" \
  -d "grant_type=account_credentials&account_id=ACCOUNT_ID"

# Respuesta: {"access_token": "...", "expires_in": 3600}

# 2. Crear meeting de prueba
curl -X POST https://api.zoom.us/v2/users/me/meetings \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Test Meeting",
    "type": 2,
    "start_time": "2024-12-01T10:00:00Z",
    "duration": 30
  }'
```

---

## 🔐 CONFIGURACIÓN EN SUPABASE

### **Método 1: Supabase Dashboard (Recomendado)**

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Settings → **Edge Functions**
3. Tab **"Secrets"**
4. Click **"Add new secret"**
5. Agregar cada variable:

```bash
# Brevo
BREVO_API_KEY=xkeysib-...
BREVO_SENDER_EMAIL=info@asciende.pro
BREVO_SENDER_NAME=Asciende Team

# Stripe
STRIPE_SECRET_KEY=rk_test_... (o rk_live_...)
STRIPE_WEBHOOK_SECRET=whsec_...

# Zoom
ZOOM_ACCOUNT_ID=...
ZOOM_CLIENT_ID=...
ZOOM_CLIENT_SECRET=...
```

### **Método 2: Supabase CLI**

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link a tu proyecto
supabase link --project-ref tu-project-ref

# Configurar secrets
supabase secrets set BREVO_API_KEY=xkeysib-...
supabase secrets set STRIPE_SECRET_KEY=rk_test_...
supabase secrets set ZOOM_ACCOUNT_ID=...
```

---

## ✅ VERIFICACIÓN DE SEGURIDAD

### **Checklist de Seguridad:**

```
Brevo:
□ API Key con permisos limitados (no full access)
□ Solo permisos de transactional emails
□ Sin acceso a billing/account settings
□ Clave almacenada en Supabase secrets (no en código)

Stripe:
□ Restricted Key (no Secret Key principal)
□ Solo permisos de checkout y subscriptions
□ Sin acceso a transfers/payouts
□ Webhook secret configurado
□ Usando test mode para desarrollo
□ Clave almacenada en Supabase secrets

Zoom:
□ Server-to-Server OAuth (no JWT/API Key)
□ Scopes limitados a meetings
□ Sin acceso a recordings/account/billing
□ App activada correctamente
□ Credenciales almacenadas en Supabase secrets

General:
□ Variables de entorno NUNCA en código
□ Archivo .env en .gitignore
□ Secrets solo en Supabase Dashboard
□ Documentación sin claves reales
```

---

## 🚨 ¿QUÉ HACER SI UNA CLAVE SE COMPROMETE?

### **Brevo:**
1. Dashboard → API Keys
2. Click **"Delete"** en la clave comprometida
3. Generar nueva clave
4. Actualizar en Supabase secrets

### **Stripe:**
1. Dashboard → Developers → API keys
2. Click en la clave → **"Delete"**
3. Crear nueva restricted key
4. Actualizar en Supabase secrets
5. Si la clave principal se comprometió → **Roll key**

### **Zoom:**
1. App Marketplace → Manage → Tu app
2. App Credentials → **"Regenerate Secret"**
3. O desactivar app completamente
4. Actualizar credenciales en Supabase

---

## 📊 COMPARACIÓN: Clave Completa vs Restringida

### **Brevo API Key:**

| Tipo | Puede Hacer | Riesgo |
|------|-------------|--------|
| **Full Access** | Enviar emails, modificar cuenta, acceder a billing, eliminar datos | 🔴 ALTO |
| **Restringida** ✅ | Solo enviar transactional emails | 🟢 BAJO |

### **Stripe Secret Key:**

| Tipo | Puede Hacer | Riesgo |
|------|-------------|--------|
| **Secret Key (sk_)** | Todo: cobros, transfers, payouts, settings | 🔴 MUY ALTO |
| **Restricted Key (rk_)** ✅ | Solo checkout y subscriptions | 🟢 BAJO |

### **Zoom Auth:**

| Tipo | Puede Hacer | Riesgo |
|------|-------------|--------|
| **JWT (deprecated)** | Acceso completo a cuenta | 🔴 ALTO |
| **Server-to-Server OAuth** ✅ | Solo meetings (scopes limitados) | 🟢 BAJO |

---

## 🎯 RESUMEN EJECUTIVO

### **Para compartir con terceros (desarrolladores):**

```
# Variables de entorno requeridas:

# Brevo (Email)
BREVO_API_KEY=<crear API key con permisos: transactional emails>
BREVO_SENDER_EMAIL=noreply@tudominio.com
BREVO_SENDER_NAME=Tu App

# Stripe (Pagos)
STRIPE_SECRET_KEY=<crear restricted key con permisos: checkout, subscriptions>
STRIPE_WEBHOOK_SECRET=<obtener de webhook endpoint>

# Zoom (Meetings)
ZOOM_ACCOUNT_ID=<crear Server-to-Server OAuth app>
ZOOM_CLIENT_ID=<obtener de app credentials>
ZOOM_CLIENT_SECRET=<obtener de app credentials>
```

**NUNCA compartas:**
- ❌ Secret Key principal de Stripe (sk_live_...)
- ❌ API Key de Brevo con full access
- ❌ Credenciales de admin de Zoom

**SIEMPRE usa:**
- ✅ Restricted keys con permisos mínimos necesarios
- ✅ Variables de entorno en Supabase
- ✅ Different keys para test y production

---

## 📚 RECURSOS ADICIONALES

### **Brevo:**
- [API Keys Documentation](https://developers.brevo.com/docs/getting-started)
- [Permission Levels](https://help.brevo.com/hc/en-us/articles/209467485)

### **Stripe:**
- [Restricted API Keys](https://stripe.com/docs/keys#limit-access)
- [Webhooks Security](https://stripe.com/docs/webhooks/signatures)
- [Testing with Test Mode](https://stripe.com/docs/testing)

### **Zoom:**
- [Server-to-Server OAuth](https://marketplace.zoom.us/docs/guides/build/server-to-server-oauth-app/)
- [OAuth Scopes](https://marketplace.zoom.us/docs/guides/authorization/permissions/)
- [Meeting API](https://marketplace.zoom.us/docs/api-reference/zoom-api/methods/#tag/Meetings)

---

## ✅ CHECKLIST FINAL

```
Configuración Completada:
□ Brevo API key restringida creada
□ Brevo secrets configurados en Supabase
□ Stripe restricted key creada
□ Stripe webhook configurado
□ Stripe secrets en Supabase
□ Zoom Server-to-Server OAuth app creada
□ Zoom scopes configurados (solo meetings)
□ Zoom secrets en Supabase
□ Todas las claves probadas
□ Documentación sin claves reales
□ .env en .gitignore
□ Plan de respuesta si clave se compromete
```

---

**¡Listo! Configuración segura completada.** 🔐✅

Ahora puedes compartir esta guía con desarrolladores sin exponer tus claves sensibles.
