# Integración de Planificadores Satélite - Prompts y Documentación

## Descripción General

El hub centralizado (`hub.asciende.pro`) actúa como servidor de integración para los satélites de planificación (Endurance Planner, Nutrition Planner, etc.). Los satélites pueden leer datos del atleta y enviar planes generados de vuelta al hub usando tokens de API.

---

## 1. SETUP INICIAL (Una sola vez en el Hub)

**Ubicación:** Settings → Planner Connections → Generate Token

**Pasos:**
1. Ir a Settings
2. Buscar "Planner Connections"
3. Click en "Generate Token"
4. Completar:
   - **Planner Name:** (ej. "Endurance Planner", "Nutrition Planner")
   - **Planner Type:** Elegir del dropdown (endurance, nutrition, strength, other)
   - **Description:** (opcional, ej. "Endurance app sync")
5. Copiar el token (se muestra una sola vez)
6. Guardar el token de forma segura en el satélite

---

## 2. PROMPT PARA ENDURANCE PLANNER

### Objetivo
El Endurance Planner debe enviar planes de entrenamiento semanales al hub. Estos aparecerán en la sección **Training → Weekly Plan** (no en la sección de "Planner Data" del dashboard).

### Prompt a Dar

```
Necesito que el Endurance Planner integre con nuestro hub centralizado en hub.asciende.pro.

REQUISITOS:
1. Al inicio, autenticarse usando el token: [INSERT_ENDURANCE_PLANNER_TOKEN]
   - Este token debe enviarse en el header: X-Planner-Token

2. LECTURA DE DATOS DEL ATLETA (GET requests):

   a) Datos del Atleta:
      GET https://hub.asciende.pro/functions/v1/planner-hub-api/athlete-profile
      Headers:
        X-Planner-Token: [token]
        Content-Type: application/json

      Response incluye:
      {
        athlete_id: string
        name: string
        sport: string
        body_composition: { weight_kg, fat_percent, muscle_kg, ...}
        nutrition_targets: { target_kcal, target_protein_g, ... }
      }

   b) Calendario de Entrenamientos:
      GET https://hub.asciende.pro/functions/v1/planner-hub-api/training-schedule
      Headers:
        X-Planner-Token: [token]
        Content-Type: application/json

      Response incluye:
      {
        scheduled_workouts: [ { date, name, duration_min, tss, intensity_level } ],
        completed_logs: [ { date, name, duration_min, tss } ],
        atp_weekly_loads: [ { week_start_date, total_hours, total_tss, sessions } ]
      }

   c) Planes de Nutrición (opcional, si necesitas contexto):
      GET https://hub.asciende.pro/functions/v1/planner-hub-api/nutrition-data?date_from=2025-02-01&date_to=2025-03-01
      Headers:
        X-Planner-Token: [token]
        Content-Type: application/json

3. ENVÍO DE PLANES (POST request):

   POST https://hub.asciende.pro/functions/v1/planner-hub-api/push-endurance-plan
   Headers:
     X-Planner-Token: [token]
     Content-Type: application/json

   Body (JSON):
   {
     "week_start_date": "2025-02-17",
     "plan_name": "VO2Max Focus Week",
     "summary": {
       "total_hours": 7.5,
       "total_tss": 380,
       "sessions": 5,
       "workouts": [
         {
           "date": "2025-02-17",
           "name": "Easy Recovery Spin",
           "duration_min": 45,
           "tss": 35,
           "type": "endurance"
         },
         {
           "date": "2025-02-18",
           "name": "VO2Max Intervals",
           "duration_min": 60,
           "tss": 85,
           "type": "interval"
         },
         ...
       ]
     },
     "plan_data": {
       // JSON adicional con detalles de la planificación
       "methodology": "Progressive overload",
       "notes": "Focus on aerobic development"
     },
     "notes": "Semana de trabajo aérobico intenso"
   }

   Response:
   {
     "success": true,
     "record": {
       "id": "uuid",
       "week_start_date": "2025-02-17",
       "plan_name": "VO2Max Focus Week",
       "updated_at": "2025-02-16T10:30:00Z"
     },
     "message": "Endurance plan for week 2025-02-17 saved to Hub successfully"
   }

4. ENVÍO PERIÓDICO:
   - Generar planes semanales cada 7 días
   - O cuando el usuario manualmente "sync" en el Endurance Planner
   - Los planes reemplazan los anteriores de la misma semana (upsert automático)

5. UBICACIÓN DE VISUALIZACIÓN EN HUB:
   - Los planes aparecerán en: Dashboard → Training → Weekly Plan / Workouts
   - NO aparecerán en "Planner Data" (eso es solo para integrar más tarde)
```

---

## 3. PROMPT PARA NUTRITION PLANNER

### Objetivo
El Nutrition Planner debe enviar planes de nutrición diarios al hub. Estos aparecerán en la sección **Nutrition Dashboard** (no en la sección de "Planner Data" del dashboard).

### Prompt a Dar

```
Necesito que el Nutrition Planner integre con nuestro hub centralizado en hub.asciende.pro.

REQUISITOS:
1. Al inicio, autenticarse usando el token: [INSERT_NUTRITION_PLANNER_TOKEN]
   - Este token debe enviarse en el header: X-Planner-Token

2. LECTURA DE DATOS DEL ATLETA (GET requests):

   a) Datos del Atleta:
      GET https://hub.asciende.pro/functions/v1/planner-hub-api/athlete-profile
      Headers:
        X-Planner-Token: [token]
        Content-Type: application/json

      Response incluye:
      {
        athlete_id: string
        name: string
        sport: string
        body_composition: { weight_kg, fat_percent, muscle_kg, bmr, ...}
        nutrition_targets: {
          target_kcal,
          target_protein_g,
          target_carbs_g,
          target_fat_g,
          macros_distribution: { protein_pct, carbs_pct, fat_pct }
        }
      }

   b) Calendario de Entrenamientos (para ajustar calorías por actividad):
      GET https://hub.asciende.pro/functions/v1/planner-hub-api/training-schedule
      Headers:
        X-Planner-Token: [token]
        Content-Type: application/json

      Response incluye:
      {
        scheduled_workouts: [ { date, name, duration_min, tss, intensity_level } ],
        completed_logs: [ { date, name, duration_min, tss } ],
        atp_weekly_loads: [ { week_start_date, total_hours, total_tss, sessions } ]
      }

   c) Planes de Endurance (opcional, para contexto de gasto de energía):
      GET https://hub.asciende.pro/functions/v1/planner-hub-api/endurance-data?date_from=2025-02-01&date_to=2025-03-01
      Headers:
        X-Planner-Token: [token]
        Content-Type: application/json

3. ENVÍO DE PLANES (POST request):

   POST https://hub.asciende.pro/functions/v1/planner-hub-api/push-nutrition-plan
   Headers:
     X-Planner-Token: [token]
     Content-Type: application/json

   Body (JSON):
   {
     "plan_date": "2025-02-17",
     "plan_name": "High Volume Training Day",
     "summary": {
       "target_kcal": 2800,
       "target_protein_g": 140,
       "target_carbs_g": 350,
       "target_fat_g": 85,
       "fuel_day_type": "green",  // "green" (high volume), "yellow" (moderate), "red" (rest)
       "meals": [
         {
           "name": "Desayuno",
           "time": "07:00",
           "kcal": 550,
           "completed": false
         },
         {
           "name": "Pre-entreno",
           "time": "11:30",
           "kcal": 200,
           "completed": false
         },
         {
           "name": "Post-entreno",
           "time": "13:30",
           "kcal": 400,
           "completed": false
         },
         {
           "name": "Almuerzo",
           "time": "14:00",
           "kcal": 700,
           "completed": false
         },
         {
           "name": "Snack",
           "time": "18:00",
           "kcal": 200,
           "completed": false
         },
         {
           "name": "Cena",
           "time": "20:30",
           "kcal": 750,
           "completed": false
         }
       ]
     },
     "plan_data": {
       // Detalles adicionales de las comidas
       "meals_detailed": [
         {
           "name": "Desayuno",
           "foods": [
             { "name": "Avena", "amount": "80g", "kcal": 300, "protein_g": 10 },
             { "name": "Banano", "amount": "1", "kcal": 90, "carbs_g": 23 },
             { "name": "Yogurt", "amount": "150ml", "kcal": 160, "protein_g": 8 }
           ]
         }
       ]
     },
     "adherence_data": {
       "adherence_score": null,  // Se calcula después en el hub
       "actual_kcal": null,
       "actual_protein_g": null
     },
     "notes": "Día de volumen alto. Asegurar carbs suficientes post-entreno."
   }

   Response:
   {
     "success": true,
     "record": {
       "id": "uuid",
       "plan_date": "2025-02-17",
       "plan_name": "High Volume Training Day",
       "updated_at": "2025-02-16T15:00:00Z"
     },
     "message": "Nutrition plan for 2025-02-17 saved to Hub successfully"
   }

4. ENVÍO PERIÓDICO:
   - Generar planes diarios (ideal: enviar cada noche para el día siguiente)
   - O cuando el usuario manualmente "sync" en el Nutrition Planner
   - Los planes reemplazan los anteriores del mismo día (upsert automático)

5. UBICACIÓN DE VISUALIZACIÓN EN HUB:
   - Los planes aparecerán en: Dashboard → Nutrition Dashboard → Meal Plans
   - También visible en: Nutrition Dashboard → Adherence tracking
   - NO aparecerán en "Planner Data" (eso es solo para futuro)
```

---

## 4. ESTRUCTURA DE DATOS ESPERADA

### Tabla: `external_endurance_plans`
```sql
- id: uuid (PK)
- athlete_id: uuid (FK)
- planner_source: string (nombre del planificador)
- plan_name: string (nullable)
- week_start_date: date
- summary: jsonb (contiene total_hours, total_tss, sessions, workouts array)
- plan_data: jsonb (detalles adicionales)
- notes: string (nullable)
- created_at: timestamp
- updated_at: timestamp
- CONSTRAINT: UNIQUE(athlete_id, week_start_date, planner_source)
```

### Tabla: `external_nutrition_plans`
```sql
- id: uuid (PK)
- athlete_id: uuid (FK)
- planner_source: string (nombre del planificador)
- plan_name: string (nullable)
- plan_date: date
- summary: jsonb (target_kcal, target_protein_g, target_carbs_g, target_fat_g, fuel_day_type, meals)
- plan_data: jsonb (detalles adicionales, meals_detailed)
- adherence_data: jsonb (adherence_score, actual_kcal, actual_protein_g)
- notes: string (nullable)
- created_at: timestamp
- updated_at: timestamp
- CONSTRAINT: UNIQUE(athlete_id, plan_date, planner_source)
```

---

## 5. CÓDIGOS DE ERROR COMUNES

| HTTP Code | Motivo | Solución |
|-----------|--------|----------|
| 401 | Token inválido o inactivo | Verificar token en Settings → Planner Connections |
| 403 | Token type no coincide con endpoint | Endurance token debe usar `/push-endurance-plan`, Nutrition token debe usar `/push-nutrition-plan` |
| 400 | Campo requerido faltante | Verificar que `week_start_date` (endurance) o `plan_date` (nutrition) esté presente |
| 500 | Error interno del servidor | Revisar logs en Supabase dashboard |

---

## 6. CAMBIOS FUTUROS (NO IMPLEMENTADOS AÚN)

Actualmente, los planes se envían a tablas separadas. Cuando esté listo, se pueden:
- Mostrar en una sección "Planner Data" unificada en el dashboard
- Crear views comparativas entre planes generados por satélites vs. datos internos
- Implementar feedback loops (el hub puede enviar datos de adherencia de vuelta a los satélites)

---

## 7. RESUMEN RÁPIDO

| Satélite | Token Type | Endpoint Push | Tabla Destino | Visualización |
|----------|-----------|--------------|---------------|--------------|
| **Endurance Planner** | `endurance` | `/push-endurance-plan` | `external_endurance_plans` | Training → Workouts |
| **Nutrition Planner** | `nutrition` | `/push-nutrition-plan` | `external_nutrition_plans` | Nutrition Dashboard → Meal Plans |
