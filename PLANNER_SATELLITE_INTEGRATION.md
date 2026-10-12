# Integración de Planificadores Satélite - Prompts y Documentación

## 0. Lectura y revisión de entrenamientos importados (Endurance Planner)

Estas cuatro acciones usan `POST https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/endurance-satellite-bridge`.
Se requieren **ambos** encabezados: el secreto del Planner (`X-Planner-Token`) y un JWT de sesión válido de Hub (`Authorization: Bearer <Hub access_token>`). `Authorization` debe ser la sesión del usuario autenticada en el proyecto Supabase de Hub; un JWT de la propia aplicación Planner no sirve salvo que esa aplicación comparta el Auth de Hub. No existe un encabezado `X-Hub-Token` en este contrato.

El Hub deriva la identidad del usuario del JWT. `athlete_id`, si se envía, solo sirve como filtro adicional y debe coincidir con el propietario resuelto desde la sesión/entrenamiento. Los atletas pueden leer sus propias sesiones; coaches/head coaches, las de perfiles cuyo `assigned_trainer_id` sea su propio ID; admins, todas. La bandeja de un atleta se limita a sí mismo. `save-review` requiere rol coach, head_coach o admin y consentimiento wearable registrado cuando la acción se reenvía a Open Wearables. Las lecturas de datos de otro usuario se registran en `wearable_access_log`.

### A. `get-session-analysis`

Request:

```http
POST /functions/v1/endurance-satellite-bridge
X-Planner-Token: <planner-secret>
Authorization: Bearer <hub-user-access-token>
Content-Type: application/json
```

```json
{"action":"get-session-analysis","executed_session_id":"<uuid>"}
```

Response (campos exactos; los valores pueden ser `null`):

```json
{
  "session": {"source":"watch","id":"<uuid>","planned_workout_id":null,"start_time":"2026-10-11T08:00:00Z","duration_seconds":3600,"distance_m":5000,"avg_hr":120,"max_hr":150,"calories":300,"sport":"walking","name":null,"athlete_feedback":null},
  "metrics": {"has_hr":true,"has_power":false,"sample_count":3600,"coverage_pct":95,"avg_power":null,"max_power":null,"normalized_power":null,"variability_index":null,"intensity_factor":null,"tss":null,"power_zone_seconds":null,"hr_zone_seconds":{},"ftp_used":null,"zones_used":{},"computed_at":"2026-10-11T09:05:00Z"},
  "match": {"executed_session_id":"<uuid>","planned_workout_id":"<uuid>","status":"matched","score":0.9},
  "planned_workout": {"id":"<uuid>","scheduled_date":"2026-10-11","scheduled_time":"08:00:00","duration_minutes":60,"sport":"run","sub_discipline":null,"steps":[],"intensity_basis":"hr"},
  "planned_zone_time": {"zones5":{},"zones7":{}},
  "zones_used": {},
  "biological_passport_date": "2026-09-01",
  "capabilities": {"hr":true,"power":false,"gps":false,"altitude":false,"cadence":false,"laps":false},
  "coach_comment": null,
  "diagnostics": []
}
```

`session` intentionally omits the raw event. `capabilities` reports `{hr,power,gps,altitude,cadence,laps}`; GPS/altitude/cadence/laps are false unless the Hub can verify them for the analysis.

### B. `get-session-timeseries`

Request by completed session:

```json
{"action":"get-session-timeseries","executed_session_id":"<uuid>","types":["heart_rate","latitude","longitude","elevation"]}
```

Or request the time series around a planned workout:

```json
{"action":"get-session-timeseries","planned_workout_id":"<external-workout-uuid>"}
```

`types` is optional and must contain series type strings allowed by the connected Open Wearables instance. The response follows this shape (series/capability values depend on data available):

```json
{
  "executed_session_id":"<uuid>",
  "window":{"start_time":"2026-10-11T08:00:00Z","end_time":"2026-10-11T09:00:00Z"},
  "series":{"heart_rate":[{"timestamp":1791705600,"value":120,"type":"heart_rate"}]},
  "route":null,
  "elevation_gain_m":null,
  "elevation_loss_m":null,
  "capabilities":{"gps":false,"altitude":false,"hr":true,"power":false},
  "hr_zone_seconds":{"zones5":{},"zones7":{}},
  "power_zone_seconds":null,
  "power_metrics":null,
  "zones_used":{"source":"biological_passport","measurement_date":"2026-09-01","zones5":{},"zones7":{}},
  "derived":{},
  "diagnostics":[]
}
```

`capabilities` here is `{gps,altitude,hr,power}`. GPS route, ascent/descent, and HR/power zone seconds appear only when the corresponding series are present. A valid start and end (or duration) must be available to query Open Wearables; otherwise the Hub returns HTTP 422 with an explanation.

### C. `list-review-inbox`

Request for the authenticated coach's athletes (or the authenticated athlete's own sessions):

```json
{"action":"list-review-inbox","date_from":"2026-10-01","date_to":"2026-10-12"}
```

Optional `athlete_id` narrows the response only after the Hub verifies that athlete is within the caller's permissions. Dates are `YYYY-MM-DD`; omitted dates default to the last 14 days through today. Response:

```json
{
  "inbox":[{
    "athlete_id":"<uuid>","athlete_name":"Athlete Name","executed_session_id":"<uuid>","ow_event_id":"<event-id>",
    "provider":"polar","sport":"walking","start_time":"2026-10-11T08:00:00Z","end_time":"2026-10-11T09:00:00Z",
    "duration_seconds":3600,"distance_m":5000,"avg_hr":120,"max_hr":150,"calories":300,
    "match_status":"matched","match_score":0.9,"planned_workout":{"id":"<uuid>","scheduled_date":"2026-10-11","name":"Easy run"},
    "review_status":null,"review_comment":null,"review_id":null,
    "capabilities":{"hr":true,"power":false,"zones":false,"gps":false,"altitude":false,"cadence":false,"laps":false}
  }],"count":1,"date_from":"2026-10-01","date_to":"2026-10-12"
}
```

Inbox `capabilities` is a lightweight summary `{hr,power,zones,gps,altitude,cadence,laps}`. `gps`, `altitude`, `cadence` and `laps` are not inspected in the inbox and therefore remain false there; call `get-session-timeseries` for verified GPS/altitude/series availability.

### D. `save-review`

Request (coach/head_coach/admin only):

```json
{"action":"save-review","executed_session_id":"<uuid>","comment":"Good pacing; keep the recovery easy.","status":"reviewed","visible_to_athlete":true}
```

`status` is normalized to `pending` only when explicitly set to `pending`; otherwise it is stored as `reviewed`. Send either `executed_session_id` or an `external_endurance_workouts` `planned_workout_id` (or both if they belong to the same athlete). Weekly-plan synthetic IDs cannot be used for review persistence. Response:

```json
{"success":true,"review":{"id":"<uuid>","executed_session_id":"<uuid>","athlete_id":"<uuid>","status":"reviewed","comment":"Good pacing; keep the recovery easy.","visible_to_athlete":true},"review_id":"<uuid>"}
```

`save-review` has no `capabilities` field. Error responses use `{ "error": "..." }` and appropriate HTTP status codes (for example 401 missing/invalid authentication, 403 insufficient athlete/role/consent permission, 404 unknown session, 422 unavailable timeseries window).

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
