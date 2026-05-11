# Integración de Tags y Pasaporte Biológico en Academy

## Resumen

Academy recibe tanto **tags** (categorías de cursos) como **passport_token** (acceso a pasaporte biológico) en la respuesta de login. Este documento muestra cómo usar ambos en conjunto.

---

## Response Completo de academy-auth

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "passport_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "usuario@example.com",
    "name": "Nombre Usuario",
    "role": "athlete",
    "membership_slug": "pro",
    "membership_name": "Asciende Pro"
  }
}
```

---

## 1. Tags para Filtrar Cursos

### Obtener Tags Disponibles

```typescript
async function getAcademyTags() {
  const response = await fetch(
    'https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/fetch-academy-courses',
    {
      headers: {
        'Authorization': `Bearer ${auth.token}`,
      },
    }
  );
  
  const data = await response.json();
  return data.tags; // Lista de tags disponibles
}
```

### Tags Típicos
- `strength` - Cursos de fuerza
- `endurance` - Cursos de resistencia
- `cycling` - Cursos específicos para ciclismo
- `running` - Cursos específicos para running
- `nutrition` - Cursos de nutrición
- `recovery` - Cursos de recuperación
- `mental` - Cursos mentales

---

## 2. Pasaporte Biológico para Personalización

### Obtener Pasaporte

```typescript
async function loadPassportOnLogin(passportToken: string) {
  if (!passportToken) return null;

  const response = await fetch(
    'https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/biological-passport-access',
    {
      headers: {
        'X-Token-Passport': passportToken,
      },
    }
  );

  const data = await response.json();
  return data.data; // { passport, athlete }
}
```

---

## 3. Usar Ambos Juntos: Filtrar Cursos Inteligentemente

### Lógica de Personalización

```typescript
interface PersonalizedCourseFilter {
  tags: string[];
  voMax?: number;
  sport?: string;
  membershipLevel?: string;
}

function buildPersonalizedFilter(passport, user): PersonalizedCourseFilter {
  const filter: PersonalizedCourseFilter = {
    tags: [],
    membershipLevel: user.membership_slug,
  };

  // 1. Agregar tags según el deporte
  if (passport?.sport) {
    filter.tags.push(passport.sport); // 'cycling', 'running', etc.
  }

  // 2. Agregar tags según capacidad aeróbica
  if (passport?.vo2_max) {
    if (passport.vo2_max > 60) {
      filter.tags.push('endurance'); // Para atletas con alto VO2max
    } else if (passport.vo2_max < 40) {
      filter.tags.push('recovery'); // Para atletas que necesitan mejorar
    }
  }

  // 3. Agregar tags según membresía
  if (user.membership_slug === 'elite') {
    filter.tags.push('advanced', 'performance');
  } else if (user.membership_slug === 'pro') {
    filter.tags.push('intermediate');
  }

  return filter;
}

// Uso
const filter = buildPersonalizedFilter(passport, user);
const recommendedCourses = await fetchCoursesByFilter(filter);
```

---

## 4. Ejemplo Completo de Flow

```typescript
// ============================================
// PASO 1: LOGIN Y OBTENER AMBOS TOKENS
// ============================================

async function handleFullLogin(email: string, password: string) {
  // Autenticar
  const authResponse = await fetch(
    'https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/academy-auth',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }
  );

  const auth = await authResponse.json();

  // Guardar ambos tokens
  localStorage.setItem('academy_auth_token', auth.token);
  localStorage.setItem('academy_passport_token', auth.passport_token);
  localStorage.setItem('user_data', JSON.stringify(auth.user));

  return auth;
}

// ============================================
// PASO 2: CARGAR DATOS ADICIONALES
// ============================================

async function loadDashboardData(auth) {
  // Cargar pasaporte en paralelo
  const passportPromise = loadPassportBiological(auth.passport_token);

  // Cargar tags disponibles en paralelo
  const tagsPromise = getAcademyTags();

  const [passportData, availableTags] = await Promise.all([
    passportPromise,
    tagsPromise,
  ]);

  return {
    passport: passportData?.passport,
    athlete: passportData?.athlete,
    tags: availableTags,
  };
}

// ============================================
// PASO 3: PERSONALIZAR CONTENIDO
// ============================================

async function displayPersonalizedDashboard(auth, dashboardData) {
  // Construir filtro personalizado
  const filter = buildPersonalizedFilter(dashboardData.passport, auth.user);

  // Obtener cursos recomendados
  const recommendedCourses = await fetchCoursesByTags(filter.tags);

  // Mostrar en UI
  displayRecommendedCourses(recommendedCourses);

  // Mostrar datos del atleta
  displayAthleteMetrics({
    vo2_max: dashboardData.passport?.vo2_max,
    sport: dashboardData.passport?.sport,
    zones: calculateTrainingZones(dashboardData.passport),
  });

  // Mostrar progreso si hay datos históricos
  displayProgressMetrics(dashboardData.passport);
}

// ============================================
// USO COMPLETO
// ============================================

const auth = await handleFullLogin('test@asciende.pro', 'password');
const dashboardData = await loadDashboardData(auth);
await displayPersonalizedDashboard(auth, dashboardData);
```

---

## 5. Casos de Uso Específicos

### A. Recomendar Cursos de Fuerza

```typescript
function recommendStrengthCourses(passport, membershipLevel) {
  const recommendations = [];

  // Si el pasaporte muestra bajo VO2max, sugerir fuerza como complemento
  if (passport?.vo2_max && passport.vo2_max < 45) {
    recommendations.push('strength', 'power');
  }

  // Si es deporte de fuerza, recomendar cursos específicos
  if (passport?.sport === 'weightlifting') {
    recommendations.push('strength', 'technique');
  }

  // Filtrar por membresía
  if (membershipLevel !== 'elite') {
    recommendations = recommendations.filter(tag => tag !== 'advanced');
  }

  return recommendations;
}
```

### B. Sugerir Recuperación Basada en Composición Corporal

```typescript
function recommendRecoveryCourses(passport) {
  if (!passport) return [];

  const recommendations = [];

  // Alto porcentaje de grasa corporal = mayor enfoque en recuperación
  if (passport.fat_percentage && passport.fat_percentage > 20) {
    recommendations.push('recovery', 'nutrition');
  }

  // Bajo porcentaje muscular = fortalecer
  if (passport.muscle_mass_kg && passport.muscle_mass_kg < 60) {
    recommendations.push('strength', 'nutrition');
  }

  return recommendations;
}
```

### C. Progresión de Cursos

```typescript
function calculateCourseProgression(passport, membershipLevel, daysSinceCreation) {
  const progression = {
    level: 'beginner',
    recommended_tags: [],
  };

  // Nivel basado en VO2max
  if (passport?.vo2_max) {
    if (passport.vo2_max > 65) {
      progression.level = 'elite';
    } else if (passport.vo2_max > 55) {
      progression.level = 'advanced';
    } else if (passport.vo2_max > 40) {
      progression.level = 'intermediate';
    }
  }

  // Progresión según días con el programa
  if (daysSinceCreation > 90) {
    progression.recommended_tags.push('advanced', 'specialization');
  } else if (daysSinceCreation > 30) {
    progression.recommended_tags.push('intermediate', 'optimization');
  } else {
    progression.recommended_tags.push('beginner', 'fundamentals');
  }

  // Acceso según membresía
  if (membershipLevel === 'pro') {
    progression.recommended_tags.push('premium');
  } else if (membershipLevel === 'elite') {
    progression.recommended_tags.push('premium', 'elite-access');
  }

  return progression;
}
```

---

## 6. Visualización en UI

### Card de Curso Personalizado

```tsx
function CourseCard({ course, passport, userRole }) {
  const isRecommended = course.tags.some(tag => 
    matchesUserProfile(tag, passport, userRole)
  );

  return (
    <div className={`course-card ${isRecommended ? 'recommended' : ''}`}>
      <h3>{course.title}</h3>
      <p>{course.description}</p>
      
      {/* Mostrar razón de recomendación */}
      {isRecommended && (
        <badge className="recommended-for-you">
          Recomendado para {passport?.sport || 'ti'}
        </badge>
      )}

      {/* Mostrar si es relevante para los datos biométricos */}
      {isRelevantToPassport(course.tags, passport) && (
        <badge className="matches-metrics">
          Optimizado para tu VO2max
        </badge>
      )}

      <button>Tomar Curso</button>
    </div>
  );
}
```

---

## 7. Dashboard Completo

```tsx
export function AcademyDashboard() {
  const [auth, setAuth] = useState(null);
  const [passport, setPassport] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    try {
      // 1. Obtener auth (ya tendríamos del login)
      const authData = JSON.parse(localStorage.getItem('user_data'));
      const passportToken = localStorage.getItem('academy_passport_token');

      // 2. Cargar pasaporte
      const passportResp = await fetch(
        'https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/biological-passport-access',
        {
          headers: { 'X-Token-Passport': passportToken },
        }
      );
      const passportData = await passportResp.json();
      setPassport(passportData.data.passport);

      // 3. Cargar cursos recomendados
      const filter = buildPersonalizedFilter(
        passportData.data.passport,
        authData
      );
      const coursesResp = await fetch(
        'https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/fetch-academy-courses',
        {
          headers: { 'Authorization': `Bearer ${authData.token}` },
        }
      );
      const coursesData = await coursesResp.json();
      const filtered = filterCoursesByTags(coursesData.courses, filter.tags);
      setCourses(filtered);

      setAuth(authData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="academy-dashboard">
      <h1>Bienvenido, {auth?.name}</h1>

      {/* Sección de Métricas */}
      <MetricsSection passport={passport} />

      {/* Sección de Cursos Recomendados */}
      <RecommendedCoursesSection 
        courses={courses}
        passport={passport}
      />

      {/* Sección de Progreso */}
      <ProgressSection passport={passport} />
    </div>
  );
}
```

---

## Resumen

| Elemento | Fuente | Uso |
|----------|--------|-----|
| **Tags** | `fetch-academy-courses` | Filtrar y categorizar cursos |
| **Passport Token** | `academy-auth` response | Acceder a datos biométricos |
| **JWT Token** | `academy-auth` response | Autenticar requests |
| **Pasaporte Data** | `biological-passport-access` | Personalizar recomendaciones |

El sistema permite una experiencia completamente personalizada basada en:
- Deporte del usuario
- Capacidad aeróbica (VO2max)
- Composición corporal
- Membresía
- Histórico de progreso
