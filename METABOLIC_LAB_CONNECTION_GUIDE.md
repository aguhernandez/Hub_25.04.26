# Guía de Conexión: Metabolic Lab → Base de Datos Asciende

## ❌ PROBLEMA IDENTIFICADO

Actualmente tienes **DOS bases de datos**, lo cual es **INCORRECTO** y causará problemas serios:
- Duplicación de datos
- Inconsistencias entre sistemas
- Mantenimiento doble
- Costos duplicados

## ✅ SOLUCIÓN CORRECTA

**Ambos proyectos (Asciende y Metabolic Lab) deben usar LA MISMA base de datos.**

---

## 📌 CREDENCIALES CORRECTAS

Copia estas credenciales **EXACTAMENTE** en el archivo `.env` de **Metabolic Lab**:

```env
VITE_SUPABASE_URL=https://ngkcbygyoobqhlmlnuvl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5na2NieWd5b29icWhsbWxudXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1Mjc5NzksImV4cCI6MjA3NTEwMzk3OX0.WXFVZK7HbtR-sRaraMEKCH69dvi4GfhZFgrxY1E0nL8
```

---

## 👥 USUARIOS DISPONIBLES

### 1. Usuario Atleta (para testing)
```
Email: aguhernandezbk@gmail.com
Rol: athlete
Nombre: Agu atleta
```

### 2. Usuario Trainer
```
Email: agu@asciende.pro
Rol: trainer
```

### 3. Usuario Admin
```
Email: admin@asciende.pro
Rol: admin
```

---

## 🔧 PASOS PARA CONECTAR METABOLIC LAB

### Paso 1: Actualizar .env en Metabolic Lab

Abre el archivo `.env` en la raíz de Metabolic Lab y reemplaza TODO el contenido con:

```env
VITE_SUPABASE_URL=https://ngkcbygyoobqhlmlnuvl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5na2NieWd5b29icWhsbWxudXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1Mjc5NzksImV4cCI6MjA3NTEwMzk3OX0.WXFVZK7HbtR-sRaraMEKCH69dvi4GfhZFgrxY1E0nL8
```

### Paso 2: Reiniciar el servidor de desarrollo

```bash
# Detén el servidor si está corriendo (Ctrl+C)
# Limpia la caché
rm -rf node_modules/.vite

# Inicia de nuevo
npm run dev
```

### Paso 3: Verificar la conexión

Crea un archivo temporal `test-connection.js` en Metabolic Lab:

```javascript
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function testConnection() {
  console.log('🔗 Probando conexión a:', process.env.VITE_SUPABASE_URL)

  // Test 1: Listar usuarios
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, role, full_name')
    .limit(10)

  if (profilesError) {
    console.error('❌ Error obteniendo perfiles:', profilesError)
    console.log('Mensaje:', profilesError.message)
    console.log('Detalles:', profilesError.details)
    console.log('Hint:', profilesError.hint)
  } else {
    console.log('✅ Perfiles encontrados:', profiles.length)
    profiles.forEach(p => {
      console.log(`  - ${p.email} (${p.role}) - ${p.full_name || 'Sin nombre'}`)
    })
  }

  // Test 2: Verificar autenticación
  const { data: session } = await supabase.auth.getSession()
  console.log('\n🔐 Sesión activa:', session ? 'Sí' : 'No')
}

testConnection()
```

Ejecuta:
```bash
node test-connection.js
```

---

## 🚨 SI SIGUE DICIENDO "NO HAY USUARIOS"

### Problema 1: RLS (Row Level Security)

La tabla `profiles` tiene políticas de seguridad. Si no estás autenticado, puede que no veas nada.

**Solución temporal para testing:** Deshabilita RLS temporalmente

```sql
-- Ejecuta esto en el SQL Editor de Supabase
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Cuando termines de probar, vuelve a habilitarlo
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

### Problema 2: Variables de entorno no se cargan

**Para React/Vite:**
- Las variables DEBEN empezar con `VITE_`
- Debes reiniciar el servidor después de cambiar `.env`
- Las variables solo están disponibles en el build time

**Verifica en el código:**

```javascript
console.log('URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('Key:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...')
```

Si imprime `undefined`, las variables no se están cargando.

### Problema 3: Estás consultando la tabla equivocada

Asegúrate de consultar `profiles`, NO `users` (que es una tabla del sistema).

```javascript
// ❌ INCORRECTO
const { data } = await supabase.from('users').select()

// ✅ CORRECTO
const { data } = await supabase.from('profiles').select()
```

---

## 🎯 CÓDIGO DE EJEMPLO PARA METABOLIC LAB

### Configuración del cliente Supabase

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Obtener lista de usuarios/atletas

```typescript
// src/utils/getAthletes.ts
import { supabase } from './lib/supabase'

export async function getAthletes() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, role, full_name, sport, country')
    .eq('role', 'athlete')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error obteniendo atletas:', error)
    throw error
  }

  return data
}
```

### Obtener datos de un atleta específico

```typescript
export async function getAthleteData(athleteId: string) {
  // Obtener perfil
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', athleteId)
    .single()

  if (profileError) throw profileError

  // Obtener datos antropométricos
  const { data: anthropometry, error: anthroError } = await supabase
    .from('anthropometry_records')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('measurement_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Obtener bioimpedancia
  const { data: bioimpedance, error: bioError } = await supabase
    .from('bioimpedance_measurements')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('measurement_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    profile,
    anthropometry,
    bioimpedance
  }
}
```

---

## 📊 ESTRUCTURA DE LA BASE DE DATOS

### Tablas principales disponibles:

```
profiles                      → Usuarios (atletas, trainers, admins)
anthropometry_records         → Mediciones antropométricas
bioimpedance_measurements     → Mediciones de bioimpedancia
training_logs                 → Registros de entrenamientos
meal_plans                    → Planes nutricionales
food_diary_entries            → Diario de comidas
performance_sessions          → Sesiones de rendimiento
```

---

## ✅ CHECKLIST FINAL

- [ ] Variables de entorno copiadas EXACTAMENTE
- [ ] Servidor de desarrollo reiniciado
- [ ] Caché de Vite limpiada
- [ ] Archivo `.env` en la raíz del proyecto
- [ ] Variables empiezan con `VITE_`
- [ ] Consultando la tabla `profiles` (no `users`)
- [ ] Manejando RLS correctamente

---

## 🆘 SI NECESITAS AYUDA

1. **Muéstrame el error exacto** que recibes
2. **Copia y pega** la salida de `test-connection.js`
3. **Verifica** que las variables se carguen: `console.log(import.meta.env)`
4. **Manda** el código donde intentas obtener los usuarios

---

## 💡 RECOMENDACIÓN ARQUITECTÓNICA

**Consolidación futura:**

1. **Asciende** → Sistema principal de gestión de atletas y entrenamiento
2. **Metabolic Lab** → Módulo especializado en análisis metabólico

Ambos comparten:
- ✅ La misma base de datos
- ✅ Los mismos usuarios
- ✅ La misma autenticación
- ✅ Los mismos datos de atletas

Esto te permite:
- Navegar entre ambos sistemas sin re-autenticación
- Compartir datos en tiempo real
- Mantener consistencia
- Reducir costos
