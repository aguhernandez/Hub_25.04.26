# 🔌 API Integration Guide - Asciende Platform

Complete guide for integrating external APIs into the Asciende platform.

---

## 🔐 IMPORTANTE: Seguridad de API Keys

**⚠️ ANTES DE CONTINUAR, LEE ESTO:**

Para configuración SEGURA de API keys con permisos restringidos, consulta:
**[API_KEYS_SECURITY_GUIDE.md](./API_KEYS_SECURITY_GUIDE.md)**

Esta guía explica:
- ✅ Cómo crear claves restringidas (NO usar claves principales)
- ✅ Permisos mínimos requeridos para cada API
- ✅ Configuración segura en Supabase
- ✅ Qué hacer si una clave se compromete

**NUNCA uses claves con acceso completo en producción.**

---

## 📋 Overview

The platform is fully structured and ready for production. All API integrations are modular and can be activated by adding the required API keys to environment variables.

### ✅ Implemented Features
- Stripe checkout and webhooks (Restricted Key)
- Zoom meeting creation (Server-to-Server OAuth)
- Brevo email notifications (Limited Permissions)
- Payment tracking
- Notification queue system
- Performance Digest automation

---

## 🔐 Environment Variables Setup

**IMPORTANTE:** Las variables se configuran en Supabase Edge Functions, NO en archivos `.env` locales.

### Método recomendado: Supabase Dashboard

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Settings → Edge Functions → Secrets
3. Add new secret para cada variable

### Required Variables:

```env
# Brevo Email Service (Restricted API Key)
BREVO_API_KEY=xkeysib-... (permisos: solo transactional emails)
BREVO_SENDER_EMAIL=info@asciende.pro
BREVO_SENDER_NAME=Asciende Team

# Stripe Payment Integration (Restricted Key)
STRIPE_SECRET_KEY=rk_test_... (NO usar sk_test_!)
STRIPE_WEBHOOK_SECRET=whsec_...

# Zoom Video Integration (Server-to-Server OAuth)
ZOOM_ACCOUNT_ID=tu_account_id
ZOOM_CLIENT_ID=tu_client_id
ZOOM_CLIENT_SECRET=tu_client_secret
FIREBASE_PROJECT_ID=your-project
FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abc
```

---

## 💳 Stripe Integration

### 1. Get Your Keys
1. Create account at [stripe.com](https://stripe.com)
2. Navigate to **Developers → API Keys**
3. Copy **Publishable key** and **Secret key**
4. For webhooks, go to **Developers → Webhooks**

### 2. Configure Webhook
- **Endpoint URL**: `https://your-project.supabase.co/functions/v1/stripe-webhook`
- **Events to listen**:
  - `checkout.session.completed`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `customer.subscription.deleted`

### 3. Test Mode
Use test keys (prefix `pk_test_` and `sk_test_`) for development.

### Edge Functions Deployed:
- ✅ `/functions/v1/stripe-create-checkout` - Creates checkout session
- ✅ `/functions/v1/stripe-webhook` - Handles payment events

### Frontend Integration:
```typescript
import { stripeApi } from './lib/apiIntegrations';

// Create checkout
const { url } = await stripeApi.createCheckoutSession({
  membershipId: 'membership-id',
  billingCycle: 'monthly',
  userId: 'user-id'
});

await stripeApi.redirectToCheckout(url);
```

---

## 🎥 Zoom Integration

### 1. Get Your Keys
1. Create account at [marketplace.zoom.us](https://marketplace.zoom.us)
2. Create **Server-to-Server OAuth** app
3. Copy **Account ID**, **Client ID**, **Client Secret**

### 2. Scopes Required
- `meeting:write:admin`
- `meeting:read:admin`

### Edge Function Deployed:
- ✅ `/functions/v1/zoom-create-meeting` - Creates Zoom meetings

### Frontend Integration:
```typescript
import { zoomApi } from './lib/apiIntegrations';

const meeting = await zoomApi.createMeeting({
  eventId: 'event-id',
  topic: 'Live Training Session',
  startTime: '2025-10-10T10:00:00Z',
  duration: 60
});

console.log('Join URL:', meeting.join_url);
```

---

## 📧 Brevo Email Integration

### 1. Get Your API Key
1. Create account at [brevo.com](https://www.brevo.com)
2. Navigate to **Settings → API Keys**
3. Create new API key

### Edge Function Deployed:
- ✅ `/functions/v1/brevo-send-email` - Sends emails

### Frontend Integration:
```typescript
import { brevoApi } from './lib/apiIntegrations';

// Send email
await brevoApi.sendEmail({
  to: 'user@example.com',
  subject: 'Welcome to Asciende',
  content: '<h1>Welcome!</h1><p>Your account is active.</p>',
  type: 'welcome_email'
});

// Queue notification
await brevoApi.queueNotification(
  userId,
  'training_reminder',
  'Training Tomorrow',
  'Don\'t forget your session at 9 AM!'
);
```

---

## 📊 Database Tables

### New Tables Created:

#### `payments`
Tracks all payment transactions.
```sql
- id (uuid)
- user_id (uuid)
- membership_id (uuid)
- stripe_payment_id (text)
- stripe_customer_id (text)
- amount (numeric)
- currency (text)
- status (text) -- pending, succeeded, failed, refunded
- created_at, updated_at
```

#### `zoom_meetings`
Stores Zoom meeting details.
```sql
- id (uuid)
- event_id (uuid)
- zoom_meeting_id (text)
- zoom_join_url (text)
- zoom_start_url (text)
- host_id (uuid)
- meeting_password (text)
- created_at
```

#### `notification_queue`
Queues email notifications.
```sql
- id (uuid)
- user_id (uuid)
- notification_type (text)
- subject (text)
- content (text)
- status (text) -- pending, sent, failed
- scheduled_for (timestamptz)
- sent_at (timestamptz)
- created_at
```

---

## 🤖 Automated Features

### Weekly Performance Digest
Automatically sends performance tips from `src/data/digest.json`.

```typescript
import { sendWeeklyDigest } from './lib/apiIntegrations';

// Run weekly (e.g., via cron job)
await sendWeeklyDigest();
```

### Event Reminders
Automatically schedules 24-hour reminders for events.

```typescript
import { scheduleEventReminders } from './lib/apiIntegrations';

await scheduleEventReminders(eventId, eventDate);
```

---

## 🧪 Testing Without API Keys

All functions work in **mock mode** when API keys aren't configured:

- **Stripe**: Returns mock session and success URL
- **Zoom**: Creates mock meeting with placeholder link
- **Brevo**: Logs email to console instead of sending

This allows full testing without external services.

---

## 🚀 Production Deployment

### Supabase Dashboard
1. Go to **Edge Functions** → **Secrets**
2. Add all environment variables
3. Functions auto-deploy when you push code

### Update User Membership Status
The webhook automatically:
- ✅ Creates payment record
- ✅ Updates user membership to "active"
- ✅ Sets billing cycle and renewal date
- ✅ Sends welcome email

### Monitoring
Check logs in Supabase Dashboard:
- **Edge Functions → Logs**
- **Database → Table Editor → payments**
- **Database → Table Editor → notification_queue**

---

## 📖 API Helper Functions

All integrations are available through:
```typescript
import {
  stripeApi,
  zoomApi,
  brevoApi,
  scheduleEventReminders,
  sendWeeklyDigest,
  notificationTypes
} from './lib/apiIntegrations';
```

### Notification Types:
```typescript
notificationTypes.PAYMENT_CONFIRMATION
notificationTypes.PAYMENT_FAILED
notificationTypes.TRAINING_REMINDER
notificationTypes.HABIT_REMINDER
notificationTypes.EVENT_REMINDER
notificationTypes.PERFORMANCE_DIGEST
notificationTypes.MEMBERSHIP_CANCELLED
notificationTypes.MEMBERSHIP_UPGRADED
```

---

## 🎯 Quick Start Checklist

- [ ] Copy `.env.example` to `.env`
- [ ] Add Stripe keys (test mode)
- [ ] Add Brevo API key
- [ ] Add Zoom credentials (optional)
- [ ] Test payment flow in dev
- [ ] Configure Stripe webhook URL
- [ ] Test email notifications
- [ ] Switch to production keys when ready

---

## 🐛 Troubleshooting

### Stripe Checkout Not Working
- Verify `STRIPE_SECRET_KEY` is set in Supabase Edge Function secrets
- Check browser console for errors
- Ensure Stripe is in test mode with test cards

### Emails Not Sending
- Verify `BREVO_API_KEY` is valid
- Check Brevo dashboard for API usage
- Review `notification_queue` table for failed sends

### Zoom Meetings
- Ensure OAuth app has correct scopes
- Token expires every hour in dev (use Server-to-Server OAuth)
- Check `zoom_meetings` table for stored links

---

## 📝 Notes

- All Edge Functions have CORS enabled
- RLS policies protect all tables
- Payment webhooks are **not** JWT-protected (Stripe signature verification)
- Mock mode allows development without external services
- Production-ready architecture with minimal config needed

---

**Status**: ✅ Production Ready
**Last Updated**: October 2025
**Version**: 1.0
