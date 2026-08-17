# Configuración de Storage para Avatars

## 🎯 Resumen

He implementado un sistema completo de gestión de perfiles con upload de fotos de perfil (avatars). Dado que no podemos crear buckets de storage desde migraciones SQL, necesitas configurar el bucket manualmente.

---

## 📦 PASO 1: Crear Bucket de Avatars en Supabase

### Opción A: Desde Supabase Dashboard (Recomendado)

1. Ve a tu proyecto en [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. En el menú lateral, click en **Storage**
3. Click en **"Create a new bucket"**
4. Configura el bucket con estos valores:

```
Bucket name: avatars
Public bucket: ✅ Yes
File size limit: 5242880 (5MB)
Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp, image/gif
```

5. Click **"Create bucket"**

### Opción B: Via SQL (Alternativa)

Si prefieres hacerlo via SQL, ejecuta esto en el SQL Editor de Supabase:

```sql
-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;
```

---

## 🔐 PASO 2: Configurar RLS Policies

Después de crear el bucket, configura las políticas de seguridad:

```sql
-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can upload their own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Anyone can view avatars (public bucket)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Policy: Users can update their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## ✅ PASO 3: Verificar que Funcione

### Test desde la UI:

1. Inicia sesión en tu app
2. Ve a **Settings / Configuración**
3. Click en **"Change Photo" / "Cambiar Foto"**
4. Selecciona una imagen (< 5MB)
5. Debería subir y aparecer en el perfil

### Test desde SQL:

```sql
-- Ver avatars subidos
SELECT
  name,
  bucket_id,
  owner,
  created_at,
  metadata->>'size' as size_bytes
FROM storage.objects
WHERE bucket_id = 'avatars'
ORDER BY created_at DESC;
```

---

## 📂 ESTRUCTURA DE ARCHIVOS

Los avatars se guardan con esta estructura:

```
avatars/
  ├── {user_id_1}/
  │   └── avatar.jpg
  ├── {user_id_2}/
  │   └── avatar.png
  └── {user_id_3}/
      └── avatar.webp
```

Cada usuario tiene su propia carpeta identificada por su `user_id`.

---

## 🎨 FEATURES IMPLEMENTADAS

### 1. **Settings Page Completa**

**3 Secciones principales:**

#### 📝 **Perfil**
- **Foto de perfil** (upload con preview)
- **Información personal:**
  - Nombre y apellido
  - Email (read-only)
  - Teléfono
  - Fecha de nacimiento
  - Género
  - País
- **Información deportiva:**
  - Deporte principal y secundario
  - Años de experiencia
  - Nivel actual (beginner → elite)
  - Bio del atleta (500 caracteres)
- **Contacto de emergencia:**
  - Nombre
  - Teléfono
  - Relación (madre, padre, etc.)
- **Redes sociales:**
  - Instagram (@usuario)
  - Twitter/X (@usuario)
  - Strava (URL)

#### 👑 **Membresía**
- Badge visual del plan (Free, Basic, Pro, Elite)
- Fecha de inicio
- Estado (Activo/Inactivo)
- Botón "Upgrade" para mejorar plan

#### 🔔 **Preferencias**
- Toggle para notificaciones por email
- Toggle para notificaciones push
- Selector de visibilidad del perfil:
  - Privado (solo yo)
  - Equipo (coach y compañeros)
  - Público (todos)

### 2. **Avatar Upload en Signup**

**Step 2 del registro ahora incluye:**
- Preview circular del avatar (o icono default)
- Botón "Upload Photo" / "Subir Foto"
- Texto "Opcional • Máx 5MB"
- Loading state mientras sube
- Skip button para omitir

**Características:**
- ✅ Completamente opcional
- ✅ Validación de tamaño (5MB max)
- ✅ Validación de tipo (solo imágenes)
- ✅ Upload instantáneo a Supabase Storage
- ✅ Preview inmediato
- ✅ Se puede cambiar después en Settings

---

## 🗃️ CAMPOS AGREGADOS A LA BD

```sql
-- Nuevos campos en profiles table:
- bio (text)
- athlete_bio (text)
- membership_plan (text) DEFAULT 'free'
- membership_status (text) DEFAULT 'active'
- membership_start_date (timestamptz)
- membership_end_date (timestamptz)
- emergency_contact_name (text)
- emergency_contact_phone (text)
- emergency_contact_relationship (text)
- instagram_handle (text)
- twitter_handle (text)
- strava_profile (text)
- email_notifications (boolean) DEFAULT true
- push_notifications (boolean) DEFAULT true
- secondary_sport (text)
- years_of_experience (integer)
- current_level (text)
- timezone (text) DEFAULT 'UTC'
- profile_visibility (text) DEFAULT 'private'
```

---

## 🔒 SEGURIDAD

### Storage RLS:
- ✅ Solo el dueño puede subir/actualizar/eliminar su avatar
- ✅ Todos pueden ver avatars (bucket público)
- ✅ Avatars organizados por carpeta de user_id
- ✅ Validación de tamaño en cliente y servidor

### Profile RLS:
- ✅ Usuarios solo pueden editar su propio perfil
- ✅ Coaches pueden ver perfiles de sus atletas
- ✅ Visibilidad respeta settings de privacidad

---

## 🎯 FLUJO DE USUARIO

### Signup:
```
1. Email + Password + Name → Registro
2. [OPCIONAL] Upload foto + Fecha nacimiento + Género + Deporte
3. Skip o Complete → Dashboard
```

### Settings:
```
1. Click en Settings en sidebar
2. Tabs: Perfil / Membresía / Preferencias
3. Editar campos
4. Click "Guardar Cambios"
5. ✅ Perfil actualizado
```

---

## 📸 URL DEL AVATAR

El avatar se guarda en `profiles.avatar_url` con este formato:

```
https://{project-id}.supabase.co/storage/v1/object/public/avatars/{user-id}/avatar.{ext}

Ejemplo:
https://abc123.supabase.co/storage/v1/object/public/avatars/uuid-1234/avatar.jpg
```

---

## 🐛 TROUBLESHOOTING

### "Bucket not found"
- Verifica que creaste el bucket "avatars" en Supabase Dashboard
- Verifica que el nombre sea exactamente "avatars" (minúsculas)

### "Row Level Security policy violation"
- Ejecuta las RLS policies del Paso 2
- Verifica que el usuario esté autenticado

### "File too large"
- Verifica que la imagen sea < 5MB
- Comprime la imagen antes de subirla

### Avatar no se muestra
- Verifica que el bucket sea público (public: true)
- Check la URL en `profiles.avatar_url`
- Abre la URL en navegador para verificar acceso

---

## 📊 TESTING

### Test completo del flujo:

```bash
# 1. Signup nuevo usuario
- Ir a /auth
- Registrarse con email/password
- En step 2, subir una foto
- Completar perfil

# 2. Verificar en Settings
- Ir a Settings
- Debería mostrar la foto subida
- Cambiar foto
- Guardar cambios

# 3. Verificar en Dashboard
- Volver al Dashboard
- Avatar debería aparecer en header/sidebar

# 4. Verificar en BD
SELECT avatar_url FROM profiles WHERE id = 'tu-user-id';
```

---

## 🚀 PRÓXIMOS PASOS OPCIONALES

1. **Image optimization:**
   - Resize automático a 400x400px
   - Conversión a WebP para menor tamaño
   - Edge function para processing

2. **Multiple avatars:**
   - Galería de fotos
   - Cover photo (banner)
   - Sport-specific photos

3. **Avatar presets:**
   - Avatars generados (UI Avatars)
   - Avatars de deportes
   - Gradients personalizados

---

## ✅ CHECKLIST DE CONFIGURACIÓN

```
□ Bucket "avatars" creado en Supabase
□ Bucket configurado como público
□ File size limit: 5MB
□ MIME types: image/*
□ RLS policies aplicadas
□ Test upload desde signup
□ Test upload desde settings
□ Avatar se muestra en perfil
```

---

**¡Todo listo! Los usuarios ya pueden subir fotos de perfil tanto en signup como en settings.**
