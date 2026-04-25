# Nutrition Satellite - Complete Handoff Guide

This document tells you exactly what to copy, in what order, and how to wire the Nutrition Satellite
so it communicates with the Hub (main app) and vice versa.

---

## ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────┐
│                   HUB (this app)                    │
│  - Manages training, athletes, memberships, etc.    │
│  - Reads nutrition summaries FROM the satellite      │
│  - Shares training load data WITH the satellite     │
│  - Same Supabase project / same database             │
└────────────────┬────────────────────────────────────┘
                 │  Shared Supabase DB
                 │  (same project, same tables)
┌────────────────▼────────────────────────────────────┐
│         NUTRITION SATELLITE (new Bolt app)          │
│  - Full nutrition module UI                         │
│  - Reads training_logs from Hub's tables            │
│  - Writes meal plans, diary, anamnesis              │
│  - Uses SAME Supabase URL + ANON KEY as Hub         │
└─────────────────────────────────────────────────────┘
```

**Key insight**: Both apps share the **same Supabase database**. The satellite does NOT need
its own Supabase project. Use the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

---

## STEP 1 — Create a new Bolt project for the Satellite

1. Open a new Bolt chat
2. Tell it: "Create a new React + Vite + TypeScript + Tailwind app"
3. Add the same `.env` values as the Hub:

```
VITE_SUPABASE_URL=https://ngkcbygyoobqhlmlnuvl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5na2NieWd5b29icWhsbWxudXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1Mjc5NzksImV4cCI6MjA3NTEwMzk3OX0.WXFVZK7HbtR-sRaraMEKCH69dvi4GfhZFgrxY1E0nL8
```

---

## STEP 2 — Files to copy to the Satellite

Copy each file below **exactly as-is** (no changes needed) into the satellite project
at the same relative path.

### 2a. Infrastructure (copy first)

| Source file | Destination in satellite |
|---|---|
| `src/lib/supabase.ts` | `src/lib/supabase.ts` |
| `src/lib/database.types.ts` | `src/lib/database.types.ts` |
| `src/contexts/AuthContext.tsx` | `src/contexts/AuthContext.tsx` |
| `src/contexts/LanguageContext.tsx` | `src/contexts/LanguageContext.tsx` |
| `src/contexts/ThemeContext.tsx` | `src/contexts/ThemeContext.tsx` |
| `src/contexts/AthleteContext.tsx` | `src/contexts/AthleteContext.tsx` |
| `src/hooks/useToast.ts` | `src/hooks/useToast.ts` |
| `src/hooks/useMembership.ts` | `src/hooks/useMembership.ts` |
| `src/hooks/useActiveMembership.ts` | `src/hooks/useActiveMembership.ts` |
| `src/components/Toast.tsx` | `src/components/Toast.tsx` |
| `src/locales/en.json` | `src/locales/en.json` |
| `src/locales/es.json` | `src/locales/es.json` |
| `src/index.css` | `src/index.css` |
| `tailwind.config.js` | `tailwind.config.js` |
| `postcss.config.js` | `postcss.config.js` |
| `src/data/foods.json` | `src/data/foods.json` |

### 2b. Utility functions

| Source file | Destination in satellite |
|---|---|
| `src/utils/nutritionCalculations.ts` | `src/utils/nutritionCalculations.ts` |
| `src/utils/openFoodFactsClient.ts` | `src/utils/openFoodFactsClient.ts` |
| `src/utils/openFoodFactsNormalizer.ts` | `src/utils/openFoodFactsNormalizer.ts` |

### 2c. Nutrition pages

| Source file | Destination in satellite |
|---|---|
| `src/pages/NutritionDashboardPage.tsx` | `src/pages/NutritionDashboardPage.tsx` |
| `src/pages/AdminFoodDatabasePage.tsx` | `src/pages/AdminFoodDatabasePage.tsx` |

### 2d. Nutrition components (main level)

| Source file | Destination in satellite |
|---|---|
| `src/components/nutrition/NutritionAnamnesis.tsx` | same path |
| `src/components/nutrition/PlanEditor.tsx` | same path |
| `src/components/nutrition/FoodDiary24h.tsx` | same path |
| `src/components/nutrition/FoodDiaryReviewPanel.tsx` | same path |
| `src/components/nutrition/FullMealEditor.tsx` | same path |
| `src/components/nutrition/MenuTemplateBuilder.tsx` | same path |
| `src/components/nutrition/MenuTemplateCreator.tsx` | same path |
| `src/components/nutrition/Deliverables.tsx` | same path |
| `src/components/nutrition/ShoppingList.tsx` | same path |
| `src/components/nutrition/InteractivePlate.tsx` | same path |
| `src/components/nutrition/DayNamesCustomizer.tsx` | same path |
| `src/components/nutrition/FoodSourceBadge.tsx` | same path |
| `src/components/nutrition/NutritionContextSidebar.tsx` | same path |

### 2e. Anamnesis sub-components

| Source file | Destination in satellite |
|---|---|
| `src/components/nutrition/anamnesis/Section1BasicHealth.tsx` | same path |
| `src/components/nutrition/anamnesis/Section2Training.tsx` | same path |
| `src/components/nutrition/anamnesis/Section3Nutrition.tsx` | same path |
| `src/components/nutrition/anamnesis/Section4Goals.tsx` | same path |

### 2f. Recipe sub-components

| Source file | Destination in satellite |
|---|---|
| `src/components/nutrition/recipes/RecipeLibrary.tsx` | same path |
| `src/components/nutrition/recipes/RecipeEditor.tsx` | same path |
| `src/components/nutrition/recipes/RecipeDetail.tsx` | same path |

### 2g. Edge functions (deploy to same Supabase project)

These already exist in the Supabase project — you do NOT need to redeploy them.
The satellite will call the same endpoints:

- `analyze-food-photo`
- `search-off-foods`
- `load-usda-foods`

---

## STEP 3 — Create the Satellite's `src/App.tsx`

The satellite needs a minimal App.tsx that renders the nutrition module directly.
Tell Bolt to create this:

```tsx
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AthleteProvider } from './contexts/AthleteContext';
import NutritionDashboardPage from './pages/NutritionDashboardPage';
import Toast from './components/Toast';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <AthleteProvider>
              <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <NutritionDashboardPage />
                <Toast />
              </div>
            </AthleteProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
```

---

## STEP 4 — Cross-communication: Training → Nutrition

The Nutrition Satellite needs to see the athlete's training load to calculate fuel day types
(Green/Yellow/Red days). It reads this directly from the Hub's shared tables.

The satellite already uses these Hub tables (no extra setup needed):
- `training_logs` — to compute training load per day
- `athlete_workouts` — to see scheduled training
- `profiles` — to get athlete body composition data
- `anthropometry_measurements` / `anthropometry_kerr_results` — for body composition

**These tables already exist in the shared database. The satellite reads them with the same
Supabase client. No API calls between apps needed.**

The `nutritionCalculations.ts` utility already implements:
```typescript
calculateTrainingLoadScore(trainingLog) // reads from training_logs
determineFuelDayType(trainingLoadScore) // returns 'green' | 'yellow' | 'red'
```

---

## STEP 5 — Cross-communication: Nutrition → Hub (what Hub reads back)

The Hub needs to show nutrition summaries on the athlete dashboard.
These tables are already shared:
- `meal_plans` — active meal plans per athlete
- `nutrition_targets` — macro targets
- `food_diary_sessions` / `food_diary_entries` — recent diary entries
- `meal_adherence` — adherence scores
- `nutrition_anamnesis` — anamnesis answers (for context sidebar)

**The Hub can query these tables directly** — they are in the same Supabase project.

---

## STEP 6 — Register the Satellite in the Hub

Once the satellite is deployed and has a URL, register it in the Hub's database:

```sql
INSERT INTO public.satellites (name, display_name, description, url, icon, category, is_active)
VALUES (
  'nutrition',
  'Nutrición',
  'Módulo completo de nutrición, planes de comida, recetas y diario alimentario',
  'https://YOUR-NUTRITION-SATELLITE-URL.bolt.new',
  'Apple',
  'nutrition',
  true
)
ON CONFLICT (name) DO UPDATE SET url = EXCLUDED.url;
```

Replace `YOUR-NUTRITION-SATELLITE-URL` with the actual Bolt deployment URL.

---

## STEP 7 — Add a "Nutrition Summary" widget to the Hub's Athlete Dashboard

In the Hub, the Athlete Dashboard (`src/pages/AthleteDashboard.tsx`) can show a summary
card that reads nutrition data from the shared tables.

Add this query to `AthleteDashboard.tsx`:

```typescript
// Read active nutrition plan from shared table
const { data: activePlan } = await supabase
  .from('meal_plans')
  .select('id, plan_name, status, target_kcal, target_protein_g, target_carbs_g, target_fat_g')
  .eq('athlete_id', profile.id)
  .eq('status', 'active')
  .maybeSingle();

// Read today's adherence
const { data: todayAdherence } = await supabase
  .from('meal_adherence')
  .select('adherence_score, actual_kcal, target_kcal')
  .eq('athlete_id', profile.id)
  .eq('date', new Date().toISOString().split('T')[0])
  .maybeSingle();
```

Then render a small summary card with a "Ver Nutrición" button that links to the satellite URL.

---

## STEP 8 — Authentication flow between Hub and Satellite

Both apps use the **same Supabase auth**. When an athlete is logged into the Hub and
clicks "Open Nutrition Satellite", the satellite needs to receive the session.

**Option A — Direct navigation (simplest):**
The satellite link opens in a new tab. The user must log in again with the same credentials.
Supabase will restore the session from localStorage automatically if opened in the same browser.

**Option B — Token passthrough (seamless):**
In the Hub, when opening the satellite:
```typescript
const { data: { session } } = await supabase.auth.getSession();
const satelliteUrl = `https://YOUR-SATELLITE-URL/?token=${session.access_token}`;
window.open(satelliteUrl, '_blank');
```

In the satellite's `AuthContext.tsx`, on mount, check for the `?token` query param:
```typescript
const params = new URLSearchParams(window.location.search);
const token = params.get('token');
if (token) {
  await supabase.auth.setSession({ access_token: token, refresh_token: token });
  // clean URL
  window.history.replaceState({}, '', window.location.pathname);
}
```

**Option A is recommended** — Bolt apps share localStorage in the same browser,
so Supabase sessions persist automatically without token passing.

---

## STEP 9 — What the satellite shows to the Trainer

The Trainer opens the satellite and can see:
1. Their athletes' nutrition plans (via `AthleteContext` — same selector UI)
2. Food diary reviews needing approval
3. Anamnesis history per athlete
4. Training load fed into fuel day calculation (read from `training_logs`)

The satellite reuses `AthleteContext.tsx` which gives trainers the same athlete selector dropdown.

---

## DATABASE TABLES SUMMARY

All these tables live in the **shared Supabase project** (`ngkcbygyoobqhlmlnuvl`).
No new database setup is needed for the satellite — everything is already there.

### Written by Nutrition Satellite:
- `meal_plans`
- `meal_plan_meals`
- `meal_plan_items`
- `nutrition_targets`
- `nutrition_anamnesis`
- `food_diary_sessions`
- `food_diary_entries`
- `meal_adherence`
- `menu_templates` / `menu_template_meals` / `menu_template_items`
- `meal_templates` / `meal_template_items`
- `foods` (custom foods added by users)
- `nutrition_recipes` / `nutrition_recipe_ingredients` / `nutrition_recipe_nutrition_snapshot`
- `food_substitutions`

### Read by Nutrition Satellite FROM Hub tables:
- `profiles` — athlete profile + body composition metrics
- `training_logs` — training load per day (for fuel day calculation)
- `athlete_workouts` — scheduled training sessions
- `anthropometry_measurements` — weight, body fat
- `anthropometry_kerr_results` — Kerr body composition model results
- `team_members` — for trainer → athlete access control

### Read by Hub FROM Nutrition Satellite tables:
- `meal_plans` (status, macro targets)
- `meal_adherence` (adherence score for dashboard widget)
- `food_diary_sessions` (last diary entry date)
- `nutrition_targets` (current macro targets)

---

## DEPENDENCIES TO INSTALL IN THE SATELLITE

The satellite needs the same npm packages as the Hub:

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.57.4",
    "lucide-react": "^0.344.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^7.9.4"
  },
  "devDependencies": {
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.7.0",
    "autoprefixer": "^10.4.22",
    "postcss": "^8.5.6",
    "tailwindcss": "^3.4.18",
    "typescript": "^5.9.3",
    "vite": "^5.4.21"
  }
}
```

---

## QUICK CHECKLIST

- [ ] Created new Bolt project for Nutrition Satellite
- [ ] Copied all files from Step 2 (infrastructure, utils, pages, components)
- [ ] Created `src/App.tsx` from Step 3
- [ ] Added `.env` with same Supabase URL + Key as Hub
- [ ] Deployed satellite and got its URL
- [ ] Registered satellite URL in Hub's `satellites` table (Step 6)
- [ ] (Optional) Added Nutrition Summary card to Hub's AthleteDashboard (Step 7)
- [ ] Verified login works in satellite (same credentials as Hub)
- [ ] Verified trainer can select athletes and see their nutrition plans
- [ ] Verified fuel day types show correctly (reads training_logs from Hub)

---

## PROMPT TO START THE SATELLITE CHAT

Use this prompt to start the new Bolt chat for the Nutrition Satellite:

```
Estoy creando un satélite de nutrición para una aplicación de entrenamiento deportivo.
Este satélite usa el mismo proyecto Supabase que la app principal (Hub), por lo que
comparten la misma base de datos.

El satélite debe mostrar el módulo de nutrición completo:
- Dashboard con planes de comida y fuel days (verde/amarillo/rojo)
- Anamnesis nutricional (4 secciones)
- Editor de planes de comida
- Plantillas de menú
- Diario alimentario 24h con análisis IA
- Recetas
- Plato interactivo
- Deliverables (PDF / imprimibles)
- Lista de compras

Voy a pegarte los archivos uno por uno. El primero es la configuración de Supabase...
```

Then paste each file from the checklist in Step 2, one at a time.
