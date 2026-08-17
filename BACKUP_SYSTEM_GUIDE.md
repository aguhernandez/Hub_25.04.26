# Sistema de Backup Completo - Guía

## Descripción General

Este proyecto cuenta con un sistema de backup completo que te permite respaldar y restaurar **TODO** el proyecto, no solo los datos.

## Tipos de Backup Disponibles

### 1. Backup Rápido (Solo Datos)
```bash
npm run backup
```

**Incluye:**
- Datos de todas las tablas (128 tablas)
- Formato JSON para cada tabla
- Resumen del backup

**Ubicación:** `./backups/YYYY-MM-DD/`

**Cuándo usar:** Para backups diarios rápidos de los datos.

---

### 2. Backup Completo (Todo el Sistema)
```bash
npm run backup:complete
```

**Incluye:**
- ✅ **Datos** - Todas las tablas con sus registros (JSON)
- ✅ **Schema** - Estructura completa de la base de datos
- ✅ **Migraciones** - Todos los archivos SQL de migración
- ✅ **Edge Functions** - Todas las funciones Supabase
- ✅ **Configuración** - package.json, vite.config, tailwind, etc.
- ✅ **Storage Info** - Configuración de buckets de almacenamiento
- ✅ **Guía de Restauración** - Instrucciones completas

**Ubicación:** `./complete-backups/YYYY-MM-DD_timestamp/`

**Cuándo usar:**
- Antes de cambios importantes
- Backups semanales/mensuales
- Antes de migraciones complejas
- Para tener un snapshot completo del proyecto

---

## Restauración de Backups

### Restaurar Solo Datos
```bash
npm run restore 2026-01-15
```

Esto restaura los datos desde `./backups/2026-01-15/`

### Restaurar Sistema Completo

Ver el archivo `RESTORATION_GUIDE.md` dentro del directorio de backup completo.

Pasos básicos:
1. Crear nuevo proyecto Supabase
2. Aplicar migraciones
3. Desplegar edge functions
4. Restaurar datos
5. Configurar secrets y API keys

---

## Qué Incluye Cada Backup Completo

```
complete-backups/
└── 2026-01-15_1737039600000/
    ├── RESTORATION_GUIDE.md          # Guía completa de restauración
    ├── backup_summary.json            # Resumen del backup
    │
    ├── data/                          # 📊 DATOS DE TABLAS
    │   ├── profiles.json              # (25 registros actuales)
    │   ├── workouts.json
    │   ├── exercises.json
    │   └── ... (128 tablas)
    │
    ├── schema/                        # 📐 ESTRUCTURA BD
    │   ├── tables_structure.json      # Definición de tablas
    │   ├── indexes.json               # Índices
    │   ├── database_functions.json    # Funciones SQL
    │   ├── triggers.json              # Triggers
    │   └── storage_buckets.json       # Buckets de storage
    │
    ├── migrations/                    # 📜 MIGRACIONES SQL
    │   ├── 20251004125442_...sql      # (Todo el historial)
    │   ├── 20251005170309_...sql
    │   └── ... (todas las migraciones)
    │
    ├── functions/                     # ⚡ EDGE FUNCTIONS
    │   ├── analyze-food-photo/
    │   ├── brevo-send-email/
    │   ├── calculate-kerr-results/
    │   ├── stripe-webhook/
    │   └── ... (todas las funciones)
    │
    └── config/                        # ⚙️ CONFIGURACIÓN
        ├── package.json               # Dependencias
        ├── vite.config.ts             # Config de Vite
        ├── tailwind.config.js         # Config de Tailwind
        ├── tsconfig.json              # Config de TypeScript
        └── env_template.json          # Template de .env
```

---

## Lo Que NO Se Incluye en los Backups

### 1. Archivos Subidos (Storage)
**No incluido:** Avatares, imágenes, PDFs, videos

**Cómo respaldar:**
- Supabase Dashboard → Storage → Exportar
- Usar `supabase storage export` (CLI)

**Cómo restaurar:**
- Subir manualmente a los buckets correspondientes

### 2. Secrets y API Keys
**No incluido:** Claves reales de APIs y servicios

**Debes reconfigurar:**
- Stripe API keys
- Strava OAuth credentials
- TrainingPeaks API
- OpenAI API keys
- Brevo/SendinBlue API keys
- Cualquier otro servicio externo

**Ubicación:**
- Variables de entorno (`.env`)
- Supabase Dashboard → Edge Functions → Secrets

### 3. Configuración de Supabase
**No incluido automáticamente:**
- Configuración de Auth (email templates, providers)
- URL del proyecto Supabase
- Configuración de rate limiting
- Configuración de CORS

**Debes reconfigurar:**
- Supabase Dashboard → Authentication → Settings
- Supabase Dashboard → Settings → API

---

## Estrategia de Backup Recomendada

### Backups Automáticos Diarios (Solo Datos)
```bash
# Agregar a cron job
0 3 * * * cd /path/to/project && npm run backup
```

### Backups Completos Semanales
```bash
# Cada domingo a las 2 AM
0 2 * * 0 cd /path/to/project && npm run backup:complete
```

### Backups Manuales Importantes
Ejecutar `npm run backup:complete` antes de:
- Actualizar Supabase
- Hacer cambios importantes en schema
- Desplegar funciones críticas
- Cambios de versión mayor
- Antes de migraciones de datos

---

## Verificación de Backups

### 1. Verificar Backup de Datos
```bash
# Ver resumen
cat backups/2026-01-15/_backup_summary.json

# Verificar una tabla específica
cat backups/2026-01-15/profiles.json | jq length
```

### 2. Verificar Backup Completo
```bash
# Ver resumen completo
cat complete-backups/2026-01-15_*/backup_summary.json

# Ver guía de restauración
cat complete-backups/2026-01-15_*/RESTORATION_GUIDE.md
```

---

## Limpieza de Backups Antiguos

### Borrar backups de más de 30 días
```bash
find ./backups -type d -mtime +30 -exec rm -rf {} \;
find ./complete-backups -type d -mtime +30 -exec rm -rf {} \;
```

### Mantener solo últimos 5 backups completos
```bash
ls -t complete-backups/ | tail -n +6 | xargs -I {} rm -rf complete-backups/{}
```

---

## Escenarios de Uso

### Escenario 1: Recuperar datos borrados accidentalmente
```bash
# Encontrar backup más reciente
ls -lt backups/

# Restaurar datos
npm run restore 2026-01-15
```

### Escenario 2: Migrar a nuevo servidor
```bash
# 1. Hacer backup completo
npm run backup:complete

# 2. En el nuevo servidor:
#    - Crear nuevo proyecto Supabase
#    - Seguir RESTORATION_GUIDE.md del backup
```

### Escenario 3: Rollback después de error
```bash
# 1. Identificar último backup bueno
ls -lt complete-backups/

# 2. Seguir guía de restauración completa
cat complete-backups/2026-01-14_*/RESTORATION_GUIDE.md
```

### Escenario 4: Clonar proyecto para desarrollo
```bash
# 1. Hacer backup completo del proyecto productivo
npm run backup:complete

# 2. Crear nuevo proyecto Supabase para desarrollo
# 3. Restaurar todo siguiendo RESTORATION_GUIDE.md
```

---

## Monitoreo de Backups

### Script de monitoreo (ejemplo)
```bash
#!/bin/bash
# check-backups.sh

BACKUP_DIR="./backups"
TODAY=$(date +%Y-%m-%d)

if [ ! -d "$BACKUP_DIR/$TODAY" ]; then
    echo "❌ No hay backup de hoy!"
    # Enviar alerta (email, Slack, etc.)
    exit 1
fi

RECORDS=$(cat "$BACKUP_DIR/$TODAY/_backup_summary.json" | jq .totalRecords)
echo "✅ Backup de hoy: $RECORDS registros"
```

---

## Preguntas Frecuentes

### ¿Puedo automatizar los backups completos?
Sí, pero ten en cuenta que son más pesados. Recomendamos:
- Backups de datos: Diarios (ligeros)
- Backups completos: Semanales o antes de cambios importantes

### ¿Los backups incluyen contraseñas de usuarios?
Sí, pero están hasheadas y seguras. Las contraseñas nunca se guardan en texto plano.

### ¿Puedo restaurar solo una tabla específica?
Sí, modifica `restore-backup.js` para comentar las tablas que no quieres restaurar.

### ¿Cuánto espacio ocupan los backups?
- Backup de datos: ~1-10 MB (depende de tus datos)
- Backup completo: ~20-50 MB (incluye todo el código)

### ¿Los backups son compatibles entre versiones?
Los backups de datos sí, pero si cambia el schema necesitarás ajustar.
Los backups completos incluyen las migraciones, así que son autosuficientes.

---

## Soporte

Si tienes problemas con los backups:
1. Revisa los logs del script de backup
2. Verifica que tienes las credenciales correctas en `.env`
3. Asegúrate de tener espacio en disco suficiente
4. Revisa que tienes permisos de escritura en los directorios

Para restauración:
1. Lee completamente `RESTORATION_GUIDE.md` del backup
2. Verifica que estás restaurando a la base de datos correcta
3. Ten cuidado con RLS y permisos
4. Prueba primero en un entorno de desarrollo

---

**Última actualización:** 15 de enero de 2026
