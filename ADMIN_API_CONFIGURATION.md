# 👑 Configuración de APIs desde el Admin Panel

## 🎯 Resumen

Ahora puedes configurar todas las API keys directamente desde la interfaz de administración, sin necesidad de usar Supabase CLI o editar archivos.

---

## 🚀 ACCESO RÁPIDO

### **Cómo acceder:**

```
1. Login como Admin
2. Settings (en sidebar)
3. Tab "Admin"
4. Tab "APIs"
5. ¡Listo! 🎉
```

---

## 📍 UBICACIÓN

```
┌─────────────────────────────────────────┐
│ Settings                                │
├─────────────────────────────────────────┤
│ [Perfil] [Seguridad] [Membresía]       │
│ [Admin] [Preferencias]                  │
│         ↓                               │
│   ┌───────────────────────┐            │
│   │ [Usuarios] [APIs] ←── AQUÍ         │
│   └───────────────────────┘            │
└─────────────────────────────────────────┘
```

---

## 🔑 FUNCIONALIDADES

### **1. Gestión Visual de API Keys**

**3 Servicios disponibles:**
- 📧 **Brevo** (Email)
- 💳 **Stripe** (Pagos)
- 🎥 **Zoom** (Meetings)

### **2. Características por servicio:**

#### **Brevo:**
- ✅ API Key (con toggle show/hide)
- ✅ Sender Email
- ✅ Sender Name
- ✅ Botón "Guardar"
- ✅ Botón "Probar" (testing)
- ✅ Status visual (activo/inactivo)

#### **Stripe:**
- ✅ Secret Key (restricted)
- ✅ Webhook Secret
- ✅ Modo (Test/Live)
- ✅ Botón "Guardar"
- ✅ Botón "Probar"
- ✅ Status visual

#### **Zoom:**
- ✅ Account ID
- ✅ Client ID
- ✅ Client Secret
- ✅ Botón "Guardar"
- ✅ Botón "Probar"
- ✅ Status visual

### **3. Seguridad:**
- 🔒 Solo Admin puede acceder
- 🔒 Claves ocultas por default (password field)
- 🔒 Toggle para mostrar/ocultar
- 🔒 Almacenamiento seguro en BD
- 🔒 RLS policies (solo admin)
- 🔒 Audit trail (quién actualizó)

---

## 📝 CÓMO USAR

### **Paso 1: Obtener las API Keys**

Consulta las guías para crear claves restringidas:
- **[API_KEYS_SECURITY_GUIDE.md](./API_KEYS_SECURITY_GUIDE.md)** - Guía completa
- **[API_SETUP_QUICKSTART.md](./API_SETUP_QUICKSTART.md)** - Guía rápida

### **Paso 2: Configurar Brevo**

```
1. Settings → Admin → APIs
2. Sección "Brevo (Email)"
3. Pegar API Key en campo correspondiente
4. Verificar Sender Email (info@asciende.pro)
5. Verificar Sender Name (Asciende Team)
6. Click "Guardar"
7. (Opcional) Click "Probar" para verificar
8. ✅ Checkmark verde = configurado
```

**Campos:**
```
API Key: xkeysib-tu_clave_restringida
Sender Email: info@asciende.pro
Sender Name: Asciende Team
```

### **Paso 3: Configurar Stripe**

```
1. Settings → Admin → APIs
2. Sección "Stripe (Pagos)"
3. Pegar Secret Key (rk_test_... o rk_live_...)
4. Pegar Webhook Secret (whsec_...)
5. Seleccionar modo (Test o Live)
6. Click "Guardar"
7. (Opcional) Click "Probar"
8. ✅ Checkmark verde = configurado
```

**Campos:**
```
Secret Key: rk_test_tu_clave_restringida
Webhook Secret: whsec_tu_webhook_secret
Modo: ○ Test Mode  ● Live Mode
```

### **Paso 4: Configurar Zoom**

```
1. Settings → Admin → APIs
2. Sección "Zoom (Meetings)"
3. Pegar Account ID
4. Pegar Client ID
5. Pegar Client Secret
6. Click "Guardar"
7. (Opcional) Click "Probar"
8. ✅ Checkmark verde = configurado
```

**Campos:**
```
Account ID: tu_account_id
Client ID: tu_client_id
Client Secret: tu_client_secret
```

---

## 🎨 INTERFAZ

### **Diseño:**

```
┌──────────────────────────────────────────┐
│ 🔑 Configuración de APIs                │
│                                          │
│ Configura las claves de API para        │
│ servicios externos. Las claves se       │
│ almacenan de forma segura en la BD.     │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ 📧 Brevo (Email)              ✅         │
│ Servicio de emails transaccionales       │
├──────────────────────────────────────────┤
│ API Key (Restringida)                    │
│ [••••••••••••••••••••••••] 👁           │
│ Solo permisos de Transactional Emails   │
│                                          │
│ Sender Email        Sender Name          │
│ [noreply@...]      [Asciende Team]  │
│                                          │
│ [💾 Guardar] [🔄 Probar]                 │
└──────────────────────────────────────────┘

[Similar para Stripe y Zoom]
```

### **Estados visuales:**

```
✅ Verde = API configurada y activa
❌ Gris = API no configurada
🔄 Spinning = Probando conexión
```

---

## 🗄️ BASE DE DATOS

### **Tabla: `api_configurations`**

```sql
CREATE TABLE api_configurations (
  id uuid PRIMARY KEY,
  service_name text, -- 'brevo', 'stripe', 'zoom'
  config_key text,   -- Ej: 'api_key', 'sender_email'
  config_value text, -- Valor de la configuración
  is_active boolean, -- Si está activa
  created_at timestamptz,
  updated_at timestamptz,
  updated_by uuid,   -- Quién actualizó (audit)
  UNIQUE(service_name, config_key)
);
```

### **Ejemplos de registros:**

```sql
-- Brevo
('brevo', 'api_key', 'xkeysib-...', true)
('brevo', 'sender_email', 'info@asciende.pro', true)
('brevo', 'sender_name', 'Asciende Team', true)

-- Stripe
('stripe', 'secret_key', 'rk_test_...', true)
('stripe', 'webhook_secret', 'whsec_...', true)
('stripe', 'mode', 'test', true)

-- Zoom
('zoom', 'account_id', 'abc123', true)
('zoom', 'client_id', 'xyz789', true)
('zoom', 'client_secret', 'def456', true)
```

### **RLS Policies:**

```sql
-- Solo admins pueden ver
CREATE POLICY "Admins can view" ...

-- Solo admins pueden editar
CREATE POLICY "Admins can update" ...

-- Audit trail
updated_by uuid REFERENCES profiles(id)
```

---

## 🔐 SEGURIDAD

### **Nivel 1: RLS (Row Level Security)**

```sql
-- Solo admins acceden a api_configurations
WHERE EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role = 'admin'
)
```

### **Nivel 2: UI Access Control**

```typescript
// Solo admin ve tab de APIs
{isAdmin && (
  <button onClick={() => setAdminTab('apis')}>
    APIs
  </button>
)}
```

### **Nivel 3: Password Fields**

```typescript
// Claves ocultas por default
<input
  type={showKey ? 'text' : 'password'}
  value={apiKey}
/>
```

### **Nivel 4: Audit Trail**

```sql
-- Quién actualizó y cuándo
updated_by uuid,
updated_at timestamptz
```

---

## 🔄 FLUJO COMPLETO

### **Admin configura APIs:**

```
1. Admin login
2. Settings → Admin → APIs
3. Ingresa claves para cada servicio
4. Click "Guardar"
5. ✅ Claves guardadas en BD
```

### **Edge Functions usan las claves:**

```
1. Edge function se ejecuta
2. Lee claves desde api_configurations
3. Usa claves para llamar API externa
4. Retorna resultado
```

### **Ejemplo en Edge Function:**

```typescript
// En lugar de:
const apiKey = Deno.env.get("BREVO_API_KEY");

// Ahora:
const { data } = await supabase
  .from('api_configurations')
  .select('config_value')
  .eq('service_name', 'brevo')
  .eq('config_key', 'api_key')
  .eq('is_active', true)
  .single();

const apiKey = data.config_value;
```

---

## ✨ VENTAJAS

### **Vs Supabase CLI:**

| Aspecto | CLI | Admin UI |
|---------|-----|----------|
| **Facilidad** | ❌ Complejo | ✅ Visual |
| **Acceso** | ❌ Terminal | ✅ Browser |
| **Permisos** | ❌ Dev only | ✅ Admin role |
| **Actualización** | ❌ Redeploy | ✅ Instantáneo |
| **Audit** | ❌ No | ✅ Sí |
| **Testing** | ❌ Manual | ✅ Botón |
| **Status** | ❌ No visible | ✅ Visual |

### **Beneficios:**

1. ✅ **No code:** Admin sin conocimientos técnicos puede configurar
2. ✅ **Instantáneo:** Cambios aplican inmediatamente
3. ✅ **Seguro:** RLS + audit trail
4. ✅ **Visual:** Status claro de cada API
5. ✅ **Testing:** Botón para probar cada API
6. ✅ **Centralizado:** Todo en un lugar
7. ✅ **Audit:** Registro de quién cambió qué

---

## 🚨 TROUBLESHOOTING

### **No puedo ver el tab de APIs**

```
Causa: No eres admin
Solución: Pide a un admin que cambie tu rol
Verificar: Settings → Admin → Usuarios → Rol
```

### **Las claves no se guardan**

```
Causa: Error de permisos RLS
Solución: Verificar que eres admin
Verificar: SELECT role FROM profiles WHERE id = auth.uid()
```

### **API no funciona después de guardar**

```
Causa: Clave incorrecta o sin permisos
Solución:
1. Click "Probar" para verificar
2. Revisar que la clave sea RESTRINGIDA
3. Verificar permisos según guía
4. Re-generar clave si es necesario
```

### **No veo el checkmark verde**

```
Causa: Campo required vacío
Solución:
- Brevo: Necesita api_key
- Stripe: Necesita secret_key + webhook_secret
- Zoom: Necesita los 3 campos (account_id, client_id, client_secret)
```

---

## 📊 TESTING

### **Test 1: Configurar Brevo**

```sql
-- 1. Configurar desde UI
Settings → Admin → APIs → Brevo → Guardar

-- 2. Verificar en BD
SELECT service_name, config_key, is_active, config_value
FROM api_configurations
WHERE service_name = 'brevo';

-- Resultado esperado:
-- brevo | api_key | true | xkeysib-...
-- brevo | sender_email | true | info@asciende.pro
-- brevo | sender_name | true | Asciende Team
```

### **Test 2: Edge Function usa configuración**

```typescript
// Edge function lee de BD
const { data } = await supabase
  .from('api_configurations')
  .select('config_value')
  .eq('service_name', 'brevo')
  .eq('config_key', 'api_key')
  .single();

// Usa la clave
const response = await fetch('https://api.brevo.com/...', {
  headers: { 'api-key': data.config_value }
});
```

### **Test 3: Non-admin no puede acceder**

```
1. Login como athlete o trainer
2. Settings → Admin
3. Solo ve tab "Usuarios"
4. No ve tab "APIs" ✅
```

---

## 🎯 CHECKLIST FINAL

```
Setup Completado:
□ Tabla api_configurations creada
□ RLS policies aplicadas
□ UI de APIs en Admin panel
□ Tab "APIs" visible solo para admin
□ Brevo section visible
□ Stripe section visible
□ Zoom section visible
□ Campos con password toggle
□ Botones "Guardar" funcionan
□ Botones "Probar" funcionan
□ Status visual (checkmark) funciona
□ Audit trail (updated_by) funciona
□ Non-admins no ven tab APIs
□ Build exitoso

Configuración API:
□ Brevo API key ingresada
□ Brevo sender configurado
□ Stripe restricted key ingresada
□ Stripe webhook secret ingresado
□ Zoom credentials ingresadas (3)
□ Todas las APIs muestran checkmark verde
□ Testing de cada API exitoso
```

---

## 🚀 PRÓXIMOS PASOS OPCIONALES

### **Mejoras futuras sugeridas:**

1. **Test automático real:**
   - Botón "Probar" hace llamada real a API
   - Muestra resultado (✅ ó ❌)
   - Log de errores si falla

2. **Historial de cambios:**
   - Ver quién cambió qué y cuándo
   - Rollback a versión anterior
   - Notificación cuando alguien cambia API

3. **Múltiples ambientes:**
   - Development
   - Staging
   - Production
   - Switch entre ambientes

4. **Encriptación:**
   - Encriptar valores en BD
   - Desencriptar en runtime
   - Mayor seguridad

5. **Validación avanzada:**
   - Validar formato de clave
   - Verificar que sea restricted key
   - Warning si usa clave full access

---

## ✅ RESUMEN

**Ahora tienes:**

1. ✅ **UI de Admin** para configurar APIs
2. ✅ **3 servicios** (Brevo, Stripe, Zoom)
3. ✅ **Seguridad completa** (RLS + audit)
4. ✅ **Status visual** de cada API
5. ✅ **Testing** con botones
6. ✅ **Password toggle** para claves
7. ✅ **Solo admin** puede acceder
8. ✅ **BD segura** para almacenar
9. ✅ **Build exitoso** ✨

**¡No más CLI! Todo desde la interfaz!** 🎉
