# PROMPTS PARA EL CHAT DEL SATÉLITE DE NUTRICIÓN

Copia y pega cada mensaje en orden. Espera que el chat confirme cada archivo antes de enviar el siguiente.

---

## MENSAJE 1 — Contexto inicial (enviar primero)

```
Estoy creando el Satélite de Nutrición para una app de entrenamiento deportivo llamada Asciende.

Este satélite comparte la MISMA base de datos Supabase que la app principal (Hub). Eso significa que:
- Usan el mismo VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
- Los usuarios se autentican igual (mismas credenciales)
- Las tablas de entrenamiento (training_logs, athlete_workouts, profiles) ya existen y las vamos a LEER
- Las tablas de nutrición (meal_plans, foods, nutrition_anamnesis, etc.) también ya existen

El satélite debe mostrar el módulo de nutrición completo con estas secciones:
1. Dashboard con planes de comida y fuel days (verde/amarillo/rojo según carga de entrenamiento)
2. Anamnesis nutricional (4 secciones)
3. Editor de planes de comida
4. Plantillas de menú
5. Diario alimentario 24h con análisis IA
6. Recetas
7. Plato interactivo
8. Deliverables/imprimibles
9. Lista de compras

Stack: React + Vite + TypeScript + Tailwind CSS + Supabase JS + lucide-react

Voy a enviarte los archivos uno por uno. Empieza por crear el proyecto con este package.json:
```

---

## MENSAJE 2 — package.json

```json
{
  "name": "asciende-nutricion-satelite",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
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

## MENSAJE 3 — Variables de entorno (.env)

Crea el archivo `.env` con este contenido:

```
VITE_SUPABASE_URL=https://ngkcbygyoobqhlmlnuvl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5na2NieWd5b29icWhsbWxudXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1Mjc5NzksImV4cCI6MjA3NTEwMzk3OX0.WXFVZK7HbtR-sRaraMEKCH69dvi4GfhZFgrxY1E0nL8
```

---

## MENSAJE 4 — tailwind.config.js

Copia el contenido exacto del archivo `tailwind.config.js` del Hub.

---

## MENSAJE 5 — postcss.config.js

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

---

## MENSAJE 6 — src/lib/supabase.ts

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## MENSAJE 7 — src/utils/nutritionCalculations.ts

Copia el contenido completo del archivo `src/utils/nutritionCalculations.ts` del Hub.
(Ya está en el proyecto, búscalo y pégalo íntegro)

---

## MENSAJE 8 — src/utils/openFoodFactsClient.ts

Copia el contenido completo de `src/utils/openFoodFactsClient.ts` del Hub.

---

## MENSAJE 9 — src/utils/openFoodFactsNormalizer.ts

Copia el contenido completo de `src/utils/openFoodFactsNormalizer.ts` del Hub.

---

## MENSAJE 10 — Contexts (copiar los 4 archivos)

Copia estos 4 archivos exactamente como están en el Hub:
- `src/contexts/AuthContext.tsx`
- `src/contexts/LanguageContext.tsx`
- `src/contexts/ThemeContext.tsx`
- `src/contexts/AthleteContext.tsx`

---

## MENSAJE 11 — Hooks y componentes de soporte

Copia estos archivos exactamente como están en el Hub:
- `src/hooks/useToast.ts`
- `src/hooks/useMembership.ts`
- `src/hooks/useActiveMembership.ts`
- `src/components/Toast.tsx`

---

## MENSAJE 12 — Locales

Copia los archivos de traducción del Hub:
- `src/locales/en.json`
- `src/locales/es.json`

---

## MENSAJE 13 — Todos los componentes de nutrición

Copia estos archivos (estructura de carpetas incluida):

**src/components/nutrition/**
- NutritionAnamnesis.tsx
- PlanEditor.tsx
- FoodDiary24h.tsx
- FoodDiaryReviewPanel.tsx
- FullMealEditor.tsx
- MenuTemplateBuilder.tsx
- MenuTemplateCreator.tsx
- Deliverables.tsx
- ShoppingList.tsx
- InteractivePlate.tsx
- DayNamesCustomizer.tsx
- FoodSourceBadge.tsx
- NutritionContextSidebar.tsx

**src/components/nutrition/anamnesis/**
- Section1BasicHealth.tsx
- Section2Training.tsx
- Section3Nutrition.tsx
- Section4Goals.tsx

**src/components/nutrition/recipes/**
- RecipeLibrary.tsx
- RecipeEditor.tsx
- RecipeDetail.tsx

---

## MENSAJE 14 — Páginas de nutrición

Copia estos 2 archivos del Hub:
- `src/pages/NutritionDashboardPage.tsx`
- `src/pages/AdminFoodDatabasePage.tsx`

---

## MENSAJE 15 — src/App.tsx (NUEVO — no copiar del Hub)

El App.tsx del satélite es diferente al del Hub. Dile al chat que cree este archivo:

```
Crea el archivo src/App.tsx con este contenido exacto:
```

```tsx
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AthleteProvider } from './contexts/AthleteContext';
import NutritionDashboardPage from './pages/NutritionDashboardPage';
import Toast from './components/Toast';

function AppContent() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <NutritionDashboardPage />
      <Toast />
    </div>
  );
}

function LoginPage() {
  // Se implementará en el siguiente paso
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <p className="text-gray-500">Login pendiente de configurar</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <AthleteProvider>
              <AppContent />
            </AthleteProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
```

---

## MENSAJE 16 — Login del satélite

Una vez que el proyecto carga sin errores, pide al chat que cree la pantalla de login:

```
Ahora crea un componente de login en src/pages/LoginPage.tsx.
Debe usar supabase.auth.signInWithPassword().
Diseño limpio con fondo blanco, logo con una manzana verde (icono Apple de lucide-react),
título "Nutrición — Asciende", campo email y contraseña, botón verde "Iniciar sesión".
Importa y usa este componente en App.tsx reemplazando el placeholder de LoginPage.
```

---

## MENSAJE 17 — Conectar con datos de entrenamiento del Hub

Una vez que todo compila, pide al chat que agregue la lectura de datos de entrenamiento:

```
El satélite necesita leer los datos de entrenamiento del Hub para calcular los fuel days.
Ambas apps comparten la misma base de datos Supabase, así que puedo hacer queries directas.

Agrega estas queries en NutritionDashboardPage.tsx o donde sea necesario:

1. Leer training_logs para calcular carga de entrenamiento:
   - tabla: training_logs
   - campos: training_date, duration_minutes, tss, rpe, workout_type
   - filtro: athlete_id = usuario actual

2. Leer athlete_workouts para ver entrenamientos planificados:
   - tabla: athlete_workouts
   - join con workouts (title, estimated_tss)
   - filtro: athlete_id = usuario actual, scheduled_date >= hoy

3. Usar calculateTrainingLoadScore() de nutritionCalculations.ts para calcular
   el puntaje de carga y determineFuelDayType() para el tipo de día.

También hay una edge function disponible en el mismo proyecto Supabase:
- URL: https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/nutrition-satellite-bridge
- Endpoints: /training-load, /athlete-profile, /scheduled-workouts, /nutrition-summary
- Auth: Bearer token del usuario actual

Implementa la lectura de training_logs para que los fuel days reflejen la carga real de entrenamiento.
```

---

## MENSAJE 18 — Registrar el satélite en el Hub (hacer DESPUÉS de deployar)

Una vez que el satélite esté deployado y tengas su URL, vuelve al chat del Hub y pega esto:

```
El satélite de nutrición ya está deployado. Su URL es: [PEGAR URL AQUÍ]

Por favor ejecuta esta query en Supabase para registrarlo:

INSERT INTO public.satellites (name, display_name, description, url, icon, category, is_active)
VALUES (
  'nutrition',
  'Nutrición',
  'Módulo completo de nutrición, planes de comida, recetas y diario alimentario',
  '[PEGAR URL AQUÍ]',
  'Apple',
  'nutrition',
  true
)
ON CONFLICT (name) DO UPDATE SET url = EXCLUDED.url, is_active = true;
```

---

## ORDEN RESUMIDO

1. Abre un chat nuevo en Bolt
2. Envía Mensaje 1 (contexto)
3. Envía Mensaje 2 (package.json)
4. Envía Mensaje 3 (.env)
5. Envía Mensajes 4 y 5 (tailwind + postcss)
6. Envía Mensaje 6 (supabase.ts)
7. Copia y envía los archivos de utils (Mensajes 7, 8, 9) — pega el contenido completo de cada archivo
8. Copia y envía los contexts (Mensaje 10) — uno por uno
9. Copia y envía hooks + Toast (Mensaje 11)
10. Copia y envía locales (Mensaje 12)
11. Copia y envía TODOS los componentes de nutrición (Mensaje 13) — puedes enviarlos de a varios
12. Copia y envía las páginas (Mensaje 14)
13. Crea el App.tsx nuevo (Mensaje 15)
14. Agrega el login (Mensaje 16)
15. Conecta datos de entrenamiento (Mensaje 17)
16. Deploya y registra en el Hub (Mensaje 18)

---

## NOTAS IMPORTANTES

- Cuando copies archivos grandes (PlanEditor.tsx, NutritionDashboardPage.tsx), el chat puede pedir
  que los partas en partes. Si pasa, envía: "Continuación del archivo anterior:" y sigue pegando.

- Si el chat dice que falta algún import, es porque falta copiar ese archivo.
  Revisa la lista del Mensaje 13 y busca qué falta.

- El satélite NO necesita migrar tablas. Todo ya existe en la base de datos del Hub.
  Solo lee y escribe en las mismas tablas.

- Los edge functions (analyze-food-photo, search-off-foods) ya están deployados en el mismo
  proyecto Supabase. El satélite los llama con la misma URL base.
