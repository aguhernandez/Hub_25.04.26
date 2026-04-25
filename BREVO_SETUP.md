# Configuración de Brevo (Email & Chat)

Este documento explica cómo configurar Brevo para email verification y chat con archivos.

---

## 🔐 1. CONFIGURACIÓN INICIAL DE BREVO

### Paso 1: Crear Cuenta
1. Ve a [https://www.brevo.com](https://www.brevo.com)
2. Crea una cuenta o inicia sesión
3. Ve a **Settings → SMTP & API → API Keys**
4. Crea una nueva API Key con permisos de:
   - ✅ Send transactional emails
   - ✅ Manage contacts
   - ✅ Access conversations

### Paso 2: Configurar Variables de Entorno
Agrega estas variables a tu archivo `.env`:

```bash
# Brevo API Configuration
BREVO_API_KEY=tu_api_key_aqui
BREVO_SENDER_EMAIL=info@asciende.pro
BREVO_SENDER_NAME=Asciende Team
```

---

## 📧 2. EMAIL VERIFICATION

### Configuración del Edge Function

El edge function `brevo-send-email` ya está creado en:
```
/supabase/functions/brevo-send-email/index.ts
```

### Actualizar el Flujo de Signup

Para habilitar verificación de email, actualiza `AuthContext.tsx`:

```typescript
// En la función signUp
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
    data: {
      full_name: fullName,
      sport: sport,
    },
  },
});

if (!error && data.user) {
  // Enviar email de verificación vía Brevo
  await fetch(`${supabaseUrl}/functions/v1/brevo-send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      to: email,
      subject: 'Verify your Asciende account',
      template: 'welcome',
      params: {
        name: fullName,
        verification_url: `${window.location.origin}/verify?token=${data.user.id}`,
      },
    }),
  });
}
```

### Template de Email en Brevo

1. Ve a **Campaigns → Templates** en Brevo
2. Crea un template llamado "welcome"
3. Usa este HTML:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Asciende</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #514163 0%, #fdda36 100%); padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">¡Bienvenido a Asciende!</h1>
  </div>

  <div style="background: #f9f9f9; padding: 40px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; color: #333;">Hola {{params.name}},</p>

    <p style="font-size: 16px; color: #333;">
      Gracias por registrarte en Asciende. Para completar tu registro, por favor verifica tu email haciendo click en el botón de abajo:
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{params.verification_url}}"
         style="background: #fdda36; color: #514163; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
        Verificar Email
      </a>
    </div>

    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Si no creaste esta cuenta, puedes ignorar este email.
    </p>

    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

    <p style="font-size: 12px; color: #999; text-align: center;">
      © 2024 Asciende. Todos los derechos reservados.
    </p>
  </div>
</body>
</html>
```

---

## 💬 3. BREVO CHAT (Para Archivos/Fotos/Videos)

### Paso 1: Activar Brevo Conversations

1. En tu dashboard de Brevo, ve a **Conversations**
2. Activa el módulo si no está activado
3. Ve a **Settings → Installation**
4. Copia el código del widget

### Paso 2: Integrar Widget en la App

Actualiza `/index.html` para agregar el widget de Brevo:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- ... existing head content ... -->
</head>
<body>
  <div id="root"></div>

  <!-- Brevo Conversations Widget -->
  <script>
    (function(d, w, c) {
      w.BrevoConversationsID = 'TU_BREVO_CONVERSATIONS_ID';
      w[c] = w[c] || function() {
        (w[c].q = w[c].q || []).push(arguments);
      };
      var s = d.createElement('script');
      s.async = true;
      s.src = 'https://conversations-widget.brevo.com/brevo-conversations.js';
      if (d.head) d.head.appendChild(s);
    })(document, window, 'BrevoConversations');

    // Configurar usuario cuando inicie sesión
    window.BrevoConversations('init');
  </script>

  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

### Paso 3: Actualizar ChatPage.tsx

Modifica el ChatPage para integrar Brevo:

```typescript
import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function ChatPage() {
  const { profile } = useAuth();

  useEffect(() => {
    if (profile && window.BrevoConversations) {
      // Identificar usuario en Brevo
      window.BrevoConversations('updateIntegrationData', {
        email: profile.email,
        name: profile.full_name,
        user_id: profile.id,
        attributes: {
          role: profile.role,
          sport: profile.sport,
        },
      });

      // Abrir chat automáticamente
      window.BrevoConversations('openChat', true);
    }
  }, [profile]);

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Chat con tu Entrenador
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          El chat se abrirá en la esquina inferior derecha
        </p>
      </div>
    </div>
  );
}

// Agregar tipos para TypeScript
declare global {
  interface Window {
    BrevoConversations: (action: string, ...args: any[]) => void;
    BrevoConversationsID: string;
  }
}
```

---

## 📁 4. CONFIGURACIÓN DE ARCHIVOS

### Permisos de Upload en Brevo

1. Ve a **Conversations → Settings → File Upload**
2. Habilita upload de archivos
3. Configura tipos permitidos:
   - ✅ Images (jpg, png, gif, webp)
   - ✅ Videos (mp4, mov, avi)
   - ✅ Documents (pdf, doc, xls)
4. Límite de tamaño: 10MB por archivo

### Storage de Archivos

Los archivos se guardan automáticamente en Brevo. Para guardar en Supabase también:

```typescript
// En el webhook de Brevo (opcional)
window.BrevoConversations('onNewMessage', async (message) => {
  if (message.attachment) {
    // Descargar y guardar en Supabase Storage
    const { data, error } = await supabase.storage
      .from('chat-attachments')
      .upload(`${profile.id}/${message.attachment.name}`, message.attachment.file);
  }
});
```

---

## 🔧 5. WEBHOOKS (OPCIONAL)

Para sincronizar mensajes con tu base de datos:

1. Ve a **Conversations → Settings → Webhooks**
2. Agrega URL: `https://tu-proyecto.supabase.co/functions/v1/brevo-webhook`
3. Selecciona eventos:
   - ✅ New message
   - ✅ Message read
   - ✅ New attachment

---

## ✅ 6. TESTING

### Test Email Verification

```bash
# Enviar email de prueba
curl -X POST https://tu-proyecto.supabase.co/functions/v1/brevo-send-email \
  -H "Authorization: Bearer TU_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "template": "welcome",
    "params": {
      "name": "Test User",
      "verification_url": "https://asciende.pro/verify?token=test123"
    }
  }'
```

### Test Chat Widget

1. Inicia sesión en la app
2. Ve a la página de Chat
3. Verifica que el widget aparece en la esquina
4. Envía un mensaje de prueba
5. Intenta subir una imagen

---

## 💰 7. COSTOS

### Plan Gratuito de Brevo:
- ✅ 300 emails/día
- ✅ Chat ilimitado
- ✅ Archivos hasta 10MB
- ✅ 1 usuario de soporte

### Plan Starter ($25/mes):
- ✅ 20,000 emails/mes
- ✅ Chat ilimitado
- ✅ Archivos hasta 50MB
- ✅ 3 usuarios de soporte

---

## 🎯 RESUMEN DE IMPLEMENTACIÓN

**Pasos críticos:**
1. ✅ Obtener API Key de Brevo
2. ✅ Configurar variables de entorno
3. ✅ Crear template de email
4. ✅ Integrar widget de chat
5. ✅ Actualizar AuthContext para enviar emails
6. ✅ Actualizar ChatPage para cargar widget

**Archivos a modificar:**
- `.env` → Agregar API keys
- `index.html` → Agregar script del widget
- `src/contexts/AuthContext.tsx` → Email verification
- `src/pages/ChatPage.tsx` → Widget integration

---

## 📚 RECURSOS

- [Brevo API Docs](https://developers.brevo.com/)
- [Brevo Conversations Docs](https://developers.brevo.com/docs/conversations-api)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

**Nota:** El edge function `brevo-send-email` ya está creado y listo. Solo necesitas agregar tu API key y configurar los templates en Brevo.
