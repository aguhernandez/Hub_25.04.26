# 🚀 API Setup - Guía Rápida para Desarrolladores

## Para Terceros: Configuración Segura de APIs

**Si eres desarrollador integrando estas APIs, sigue esta guía.**

---

## ⚠️ REGLA DE ORO

**NUNCA uses claves de acceso completo (full access keys).**

Solo crea claves RESTRINGIDAS con los permisos mínimos necesarios.

---

## 1️⃣ BREVO (Email)

### Crear API Key Restringida:

1. [Brevo Dashboard](https://app.brevo.com) → API Keys
2. **"Generate a new API key"**
3. Nombre: `Asciende Production`
4. **Permisos (SOLO estos):**
   - ✅ Transactional Emails → Send
   - ✅ Transactional Emails → Templates
   - ✅ Contacts → View, Create, Update
   - ✅ Conversations → View, Send
   - ❌ TODO LO DEMÁS (Account, Billing, Campaigns)

5. Copiar clave: `xkeysib-...`

### Variables requeridas:

```bash
BREVO_API_KEY=xkeysib-tu_clave_restringida_aqui
BREVO_SENDER_EMAIL=info@asciende.pro
BREVO_SENDER_NAME=Asciende Team
```

### ✅ Test:

```bash
curl -X POST https://api.brevo.com/v3/smtp/email \
  -H "api-key: xkeysib-..." \
  -H "Content-Type: application/json" \
  -d '{"sender":{"email":"test@asciende.pro"},"to":[{"email":"destino@test.com"}],"subject":"Test","htmlContent":"<p>Test</p>"}'
```

**Resultado esperado:** `{"messageId": "..."}`

---

## 2️⃣ STRIPE (Pagos)

### Crear Restricted Key:

1. [Stripe Dashboard](https://dashboard.stripe.com) → Developers → API keys
2. **"Create restricted key"**
3. Nombre: `Asciende Edge Functions`
4. **Permisos (SOLO estos):**
   - ✅ Customers → Write
   - ✅ Payment Intents → Write
   - ✅ Subscriptions → Write
   - ✅ Prices → Read
   - ✅ Products → Read
   - ✅ Checkout Sessions → Write
   - ✅ Invoices → Read
   - ❌ TODO LO DEMÁS (Balance, Transfers, Payouts)

5. Copiar clave: `rk_test_...` (test) o `rk_live_...` (prod)

### Configurar Webhook:

1. Developers → Webhooks → **"Add endpoint"**
2. URL: `https://tu-proyecto.supabase.co/functions/v1/stripe-webhook`
3. Eventos:
   - ✅ checkout.session.completed
   - ✅ invoice.paid
   - ✅ invoice.payment_failed
   - ✅ customer.subscription.*

4. Copiar webhook secret: `whsec_...`

### Variables requeridas:

```bash
STRIPE_SECRET_KEY=rk_test_tu_clave_restringida_aqui
STRIPE_WEBHOOK_SECRET=whsec_tu_webhook_secret
```

### ✅ Test:

```bash
curl https://api.stripe.com/v1/products \
  -u rk_test_...:
```

**Resultado esperado:** Lista de productos

---

## 3️⃣ ZOOM (Meetings)

### Crear Server-to-Server OAuth App:

1. [Zoom Marketplace](https://marketplace.zoom.us/) → Develop → Build App
2. Tipo: **"Server-to-Server OAuth"**
3. Información básica:
   - App name: `Asciende Meetings`
   - Description: `Meeting management`
   - Company: Tu empresa

4. **Scopes (SOLO estos):**
   - ✅ meeting:write:admin
   - ✅ meeting:read:admin
   - ✅ meeting:update:admin
   - ✅ meeting:delete:admin
   - ✅ user:read:admin
   - ❌ TODO LO DEMÁS (Webinar, Recording, Account, Billing)

5. **Activar app** (toggle en "Activation")

6. Copiar credenciales (en "App Credentials"):
   - Account ID
   - Client ID
   - Client Secret

### Variables requeridas:

```bash
ZOOM_ACCOUNT_ID=tu_account_id
ZOOM_CLIENT_ID=tu_client_id
ZOOM_CLIENT_SECRET=tu_client_secret
```

### ✅ Test:

```bash
# 1. Get access token
TOKEN=$(curl -s -X POST "https://zoom.us/oauth/token?grant_type=account_credentials&account_id=ACCOUNT_ID" \
  -H "Authorization: Basic $(echo -n CLIENT_ID:CLIENT_SECRET | base64)" | jq -r .access_token)

# 2. Create test meeting
curl -X POST https://api.zoom.us/v2/users/me/meetings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"topic":"Test","type":2,"start_time":"2024-12-01T10:00:00Z","duration":30}'
```

**Resultado esperado:** JSON con `id`, `join_url`, etc.

---

## 🔧 CONFIGURAR EN SUPABASE

### Via Dashboard (Recomendado):

1. [Supabase Dashboard](https://supabase.com/dashboard)
2. Tu proyecto → Settings → **Edge Functions**
3. Tab **"Secrets"**
4. **"Add new secret"** para cada variable
5. Agregar las 9 variables listadas arriba

### Via CLI (Alternativa):

```bash
# Instalar CLI
npm install -g supabase

# Login y link
supabase login
supabase link --project-ref tu-proyecto

# Agregar secrets
supabase secrets set BREVO_API_KEY=xkeysib-...
supabase secrets set STRIPE_SECRET_KEY=rk_test_...
supabase secrets set ZOOM_ACCOUNT_ID=...
# ... (resto de variables)
```

---

## ✅ VERIFICACIÓN FINAL

### Checklist:

```
Brevo:
□ API Key restringida creada (no full access)
□ Solo permisos de emails transaccionales
□ Variables en Supabase secrets
□ Test curl exitoso

Stripe:
□ Restricted key creada (rk_*, NO sk_*)
□ Solo permisos de checkout/subscriptions
□ Webhook configurado
□ Webhook secret obtenido
□ Variables en Supabase secrets
□ Test curl exitoso

Zoom:
□ Server-to-Server OAuth app creada
□ Scopes limitados a meetings
□ App activada
□ Credenciales copiadas (3 valores)
□ Variables en Supabase secrets
□ Test curl exitoso

Supabase:
□ 9 secrets configurados
□ Edge functions deployados
□ Sin errores en logs
```

---

## 🚨 SI ALGO FALLA

### Error: "API key invalid"
- Verifica que copiaste la clave completa
- Verifica que la clave tiene los permisos necesarios
- Para Stripe: asegúrate de usar `rk_*` no `sk_*`

### Error: "Insufficient permissions"
- Revisa los permisos de la clave
- Brevo: debe tener "Transactional Emails → Send"
- Stripe: debe tener "Checkout Sessions → Write"
- Zoom: debe tener "meeting:write:admin"

### Error: "Unauthorized"
- Zoom: verifica que la app esté activada
- Verifica Account ID, Client ID, Client Secret
- Test el access token manualmente

### Error en Webhook de Stripe:
- URL correcta: `https://TU-PROYECTO.supabase.co/functions/v1/stripe-webhook`
- Webhook secret en Supabase secrets
- Eventos seleccionados correctamente

---

## 📚 MÁS INFO

**Guía completa de seguridad:**
[API_KEYS_SECURITY_GUIDE.md](./API_KEYS_SECURITY_GUIDE.md)

**Guía técnica detallada:**
[API_INTEGRATION_GUIDE.md](./API_INTEGRATION_GUIDE.md)

**Documentación oficial:**
- [Brevo API Docs](https://developers.brevo.com/)
- [Stripe Restricted Keys](https://stripe.com/docs/keys#limit-access)
- [Zoom Server-to-Server OAuth](https://marketplace.zoom.us/docs/guides/build/server-to-server-oauth-app/)

---

## 💡 TIPS FINALES

1. **Usa test mode primero:**
   - Brevo: usa cuenta de test
   - Stripe: usa `rk_test_*` y tarjetas de prueba
   - Zoom: crea meetings de prueba

2. **Rota claves regularmente:**
   - Cada 3-6 meses
   - Inmediatamente si se comprometen

3. **Monitorea uso:**
   - Brevo: Email usage dashboard
   - Stripe: Dashboard → Logs
   - Zoom: Marketplace → App usage

4. **Documenta tus claves:**
   - Dónde están guardadas (Supabase)
   - Qué permisos tienen
   - Fecha de creación
   - Cuándo rotar

---

## ✅ LISTO!

Una vez configuradas las 3 APIs, la plataforma tendrá:

- 📧 **Emails automáticos** (Brevo)
- 💳 **Pagos de membresías** (Stripe)
- 🎥 **Video meetings** (Zoom)

Todo funcionando de forma **SEGURA** con claves restringidas.

---

**¿Dudas?** Consulta las guías completas o contacta al equipo de desarrollo.
