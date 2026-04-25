# Cycling App Satellite - Technical Integration Guide

## Overview
This document provides complete instructions to build a satellite cycling training application that shares authentication, database, and design system with the main Asciende Hub. The main hub handles gym/strength training, while the cycling app handles cycling-specific training planning and execution.

---

## 1. Database Connection - Shared Supabase Instance

### Supabase Configuration
Both applications use the **SAME** Supabase project. Copy these exact connection details:

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
});
```

### Environment Variables (.env file)
```bash
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**CRITICAL**: Use the exact same URL and anon key from the main hub to ensure shared authentication and data.

---

## 2. Authentication System - Shared Users

### Auth Context Implementation
The cycling app MUST use the same authentication system. Here's the complete auth context:

```typescript
// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'athlete' | 'trainer' | 'admin';
  avatar_url: string | null;
  created_at: string;
  sport?: string;
}

interface AuthContextType {
  user: any;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

### Key Tables Used
- **profiles**: User profiles (id, email, full_name, role, avatar_url, sport)
- **roles**: 'athlete', 'trainer', 'admin'

---

## 3. Design System - UI/UX Guidelines

### Color Palette
```css
/* Primary Brand Colors */
--primary-yellow: #fdda36;
--primary-purple: #514163;
--dark-purple: #2a1f35;

/* Background Colors */
--bg-light: #ffffff;
--bg-gray-50: #f9fafb;
--bg-gray-100: #f3f4f6;
--bg-gray-800: #1f2937;
--bg-gray-900: #111827;

/* Text Colors */
--text-dark: #111827;
--text-gray-600: #4b5563;
--text-gray-400: #9ca3af;

/* Dark Mode */
.dark {
  --bg-primary: #111827;
  --bg-secondary: #1f2937;
  --bg-tertiary: #374151;
  --text-primary: #f9fafb;
  --text-secondary: #d1d5db;
}
```

### Typography
```css
/* Font Stack */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;

/* Font Sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Component Patterns

#### Primary Button
```jsx
<button className="px-4 py-2 bg-[#fdda36] text-[#514163] font-semibold rounded-lg hover:bg-[#fce76a] transition-colors">
  Action
</button>
```

#### Secondary Button
```jsx
<button className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
  Action
</button>
```

#### Card Container
```jsx
<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
  {/* Content */}
</div>
```

#### Input Field
```jsx
<input
  type="text"
  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36] focus:border-transparent"
  placeholder="Enter value"
/>
```

#### Badge
```jsx
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#fdda36] text-[#514163]">
  Label
</span>
```

### Layout Principles
1. **Responsive**: Mobile-first design with breakpoints at 640px, 768px, 1024px, 1280px
2. **Spacing**: Use 8px grid system (space-2, space-4, space-6, space-8)
3. **Dark Mode**: All components must support dark mode with `dark:` prefixes
4. **Consistent Padding**: Cards use p-4 or p-6, containers use p-4 to p-8
5. **Border Radius**: Small elements: rounded-lg (0.5rem), Cards: rounded-xl (0.75rem)

### Icons
Use **lucide-react** for all icons:
```bash
npm install lucide-react
```

Common icons:
- Calendar, Clock, User, Users, Settings, ChevronDown, ChevronRight, Plus, X, Check, AlertCircle, Info, TrendingUp, TrendingDown

---

## 4. Database Schema - Relevant Tables

### Core Tables You MUST Use

#### profiles
```sql
id: uuid (PK)
email: text
full_name: text
role: text ('athlete' | 'trainer' | 'admin')
avatar_url: text
sport: text
created_at: timestamptz
```

#### athlete_profile_details
```sql
id: uuid (PK)
athlete_id: uuid (FK -> profiles.id)
date_of_birth: date
gender: text
weight_kg: numeric
height_cm: numeric
ftp: numeric (Functional Threshold Power for cycling)
max_heart_rate: integer
goals: text
```

### Create New Tables for Cycling

You'll need to create these tables in Supabase:

#### cycling_workouts
```sql
id: uuid (PK, default gen_random_uuid())
athlete_id: uuid (FK -> profiles.id)
coach_id: uuid (FK -> profiles.id)
workout_date: date
workout_type: text ('endurance', 'interval', 'recovery', 'race', 'test')
title: text
description: text
planned_duration_minutes: integer
planned_distance_km: numeric
planned_tss: numeric (Training Stress Score)
status: text ('planned', 'completed', 'skipped')
created_at: timestamptz (default now())
updated_at: timestamptz
```

#### cycling_workout_intervals
```sql
id: uuid (PK, default gen_random_uuid())
workout_id: uuid (FK -> cycling_workouts.id, ON DELETE CASCADE)
interval_order: integer
duration_minutes: integer
target_power_watts: integer
target_power_percent_ftp: integer
target_heart_rate: integer
cadence_rpm: integer
description: text
```

#### cycling_activity_logs
```sql
id: uuid (PK, default gen_random_uuid())
athlete_id: uuid (FK -> profiles.id)
workout_id: uuid (FK -> cycling_workouts.id, nullable)
activity_date: date
activity_type: text ('ride', 'race', 'test')
duration_minutes: integer
distance_km: numeric
avg_power_watts: integer
normalized_power_watts: integer
avg_heart_rate: integer
max_heart_rate: integer
avg_cadence_rpm: integer
elevation_gain_m: integer
tss: numeric
intensity_factor: numeric
notes: text
source: text ('manual', 'strava', 'garmin', 'trainingpeaks')
external_id: text
created_at: timestamptz (default now())
```

#### cycling_ftp_tests
```sql
id: uuid (PK, default gen_random_uuid())
athlete_id: uuid (FK -> profiles.id)
test_date: date
test_type: text ('20min', '8min', 'ramp')
ftp_watts: integer
test_avg_power: integer
test_duration_minutes: integer
notes: text
created_at: timestamptz (default now())
```

### RLS Policies Pattern
For EVERY table, implement these RLS policies:

```sql
-- Enable RLS
ALTER TABLE cycling_workouts ENABLE ROW LEVEL SECURITY;

-- Athletes can view their own data
CREATE POLICY "Athletes can view own cycling workouts"
  ON cycling_workouts FOR SELECT
  TO authenticated
  USING (
    auth.uid() = athlete_id
  );

-- Trainers can view their athletes' data
CREATE POLICY "Trainers can view assigned athletes cycling workouts"
  ON cycling_workouts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'trainer'
    )
  );

-- Trainers can create workouts for athletes
CREATE POLICY "Trainers can create cycling workouts"
  ON cycling_workouts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('trainer', 'admin')
    )
  );

-- Athletes can update their own workouts (status, notes)
CREATE POLICY "Athletes can update own cycling workouts"
  ON cycling_workouts FOR UPDATE
  TO authenticated
  USING (auth.uid() = athlete_id)
  WITH CHECK (auth.uid() = athlete_id);

-- Trainers can update workouts they created
CREATE POLICY "Trainers can update cycling workouts"
  ON cycling_workouts FOR UPDATE
  TO authenticated
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);
```

---

## 5. Cross-App Data Reading

### Reading Gym Workouts from Cycling App

```typescript
// In cycling app, fetch gym workouts for context
const fetchGymWorkouts = async (athleteId: string, startDate: string, endDate: string) => {
  const { data, error } = await supabase
    .from('workouts')
    .select(`
      *,
      workout_exercises (
        *,
        exercises (name_es, name_en, category)
      )
    `)
    .eq('athlete_id', athleteId)
    .gte('workout_date', startDate)
    .lte('workout_date', endDate)
    .order('workout_date', { ascending: true });

  if (error) throw error;
  return data;
};
```

### Reading Cycling Workouts from Main Hub

```typescript
// In main hub, fetch cycling workouts for integrated view
const fetchCyclingWorkouts = async (athleteId: string, startDate: string, endDate: string) => {
  const { data, error } = await supabase
    .from('cycling_workouts')
    .select(`
      *,
      cycling_workout_intervals (*)
    `)
    .eq('athlete_id', athleteId)
    .gte('workout_date', startDate)
    .lte('workout_date', endDate)
    .order('workout_date', { ascending: true });

  if (error) throw error;
  return data;
};
```

### Integrated Calendar View
Both apps should be able to show a unified calendar:

```typescript
const fetchAllTrainingActivities = async (athleteId: string, month: string) => {
  const [gymWorkouts, cyclingWorkouts] = await Promise.all([
    supabase
      .from('workouts')
      .select('id, workout_date, title, status')
      .eq('athlete_id', athleteId)
      .gte('workout_date', `${month}-01`)
      .lte('workout_date', `${month}-31`),

    supabase
      .from('cycling_workouts')
      .select('id, workout_date, title, status')
      .eq('athlete_id', athleteId)
      .gte('workout_date', `${month}-01`)
      .lte('workout_date', `${month}-31`)
  ]);

  return {
    gym: gymWorkouts.data || [],
    cycling: cyclingWorkouts.data || []
  };
};
```

---

## 6. Athlete Context - Shared Pattern

The cycling app should implement the same AthleteContext for trainer view:

```typescript
// src/contexts/AthleteContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

interface AthleteContextType {
  selectedAthleteId: string | null;
  selectedAthleteName: string | null;
  setSelectedAthlete: (id: string | null, name: string | null) => void;
}

const AthleteContext = createContext<AthleteContextType | undefined>(undefined);

export function AthleteProvider({ children }: { children: ReactNode }) {
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [selectedAthleteName, setSelectedAthleteName] = useState<string | null>(null);

  const setSelectedAthlete = (id: string | null, name: string | null) => {
    setSelectedAthleteId(id);
    setSelectedAthleteName(name);
  };

  return (
    <AthleteContext.Provider value={{ selectedAthleteId, selectedAthleteName, setSelectedAthlete }}>
      {children}
    </AthleteContext.Provider>
  );
}

export const useAthlete = () => {
  const context = useContext(AthleteContext);
  if (!context) throw new Error('useAthlete must be used within AthleteProvider');
  return context;
};
```

---

## 7. Navigation Structure

### Main Routes for Cycling App
```typescript
// src/App.tsx routes
<Routes>
  <Route path="/" element={<AuthPage />} />
  <Route path="/dashboard" element={<CyclingDashboard />} />
  <Route path="/calendar" element={<CyclingCalendar />} />
  <Route path="/workouts" element={<WorkoutLibrary />} />
  <Route path="/workout/:id" element={<WorkoutDetail />} />
  <Route path="/plan" element={<WorkoutPlanner />} />
  <Route path="/activities" element={<ActivityLog />} />
  <Route path="/analytics" element={<PerformanceAnalytics />} />
  <Route path="/ftp-test" element={<FTPTesting />} />
  <Route path="/settings" element={<Settings />} />
</Routes>
```

### Adaptive Navigation (Same Pattern)
```jsx
// Show different navigation based on role
{profile?.role === 'trainer' && (
  <>
    <NavLink to="/my-athletes">My Athletes</NavLink>
    <NavLink to="/plan">Plan Workouts</NavLink>
  </>
)}

{profile?.role === 'athlete' && (
  <>
    <NavLink to="/calendar">My Calendar</NavLink>
    <NavLink to="/activities">Activity Log</NavLink>
  </>
)}
```

---

## 8. Language Support

Implement the same i18n pattern:

```typescript
// src/contexts/LanguageContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'es' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  es: {
    'dashboard': 'Panel Principal',
    'workouts': 'Entrenamientos',
    'calendar': 'Calendario',
    'activities': 'Actividades',
    // Add all translations
  },
  en: {
    'dashboard': 'Dashboard',
    'workouts': 'Workouts',
    'calendar': 'Calendar',
    'activities': 'Activities',
    // Add all translations
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('es');

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
```

---

## 9. Key Cycling Metrics & Calculations

### FTP-Based Power Zones
```typescript
const calculatePowerZones = (ftp: number) => {
  return {
    recovery: { min: 0, max: Math.round(ftp * 0.55), name: 'Recovery', color: '#94a3b8' },
    endurance: { min: Math.round(ftp * 0.56), max: Math.round(ftp * 0.75), name: 'Endurance', color: '#60a5fa' },
    tempo: { min: Math.round(ftp * 0.76), max: Math.round(ftp * 0.90), name: 'Tempo', color: '#34d399' },
    threshold: { min: Math.round(ftp * 0.91), max: Math.round(ftp * 1.05), name: 'Threshold', color: '#fbbf24' },
    vo2max: { min: Math.round(ftp * 1.06), max: Math.round(ftp * 1.20), name: 'VO2 Max', color: '#f87171' },
    anaerobic: { min: Math.round(ftp * 1.21), max: Infinity, name: 'Anaerobic', color: '#c084fc' }
  };
};
```

### Training Stress Score (TSS)
```typescript
const calculateTSS = (
  duration_seconds: number,
  normalized_power: number,
  ftp: number
): number => {
  const intensity_factor = normalized_power / ftp;
  const tss = (duration_seconds * normalized_power * intensity_factor) / (ftp * 3600) * 100;
  return Math.round(tss);
};
```

### Normalized Power (NP)
```typescript
const calculateNormalizedPower = (powerData: number[]): number => {
  // 30-second rolling average
  const rollingAvg: number[] = [];
  for (let i = 0; i < powerData.length - 29; i++) {
    const sum = powerData.slice(i, i + 30).reduce((a, b) => a + b, 0);
    rollingAvg.push(sum / 30);
  }

  // Raise to 4th power, average, then take 4th root
  const fourthPowers = rollingAvg.map(p => Math.pow(p, 4));
  const avgFourthPower = fourthPowers.reduce((a, b) => a + b, 0) / fourthPowers.length;
  return Math.round(Math.pow(avgFourthPower, 0.25));
};
```

### Intensity Factor (IF)
```typescript
const calculateIntensityFactor = (normalized_power: number, ftp: number): number => {
  return Number((normalized_power / ftp).toFixed(2));
};
```

---

## 10. Integration Points Summary

### What Trainers Do in Each App

**Main Hub (Gym Training)**:
- Create strength/gym workouts
- Assign exercises with sets/reps
- Track 1RM progression
- Monitor strength metrics

**Cycling App**:
- Create cycling workouts with power/HR targets
- Plan interval sessions
- Set weekly TSS targets
- Monitor cycling performance

### What Athletes See

**Main Hub**:
- Today's gym workout
- Strength progress charts
- Exercise history

**Cycling App**:
- Today's cycling workout
- Power/HR targets
- Activity log with TSS/IF
- Performance trends

**Both Apps** (Integrated View):
- Full training calendar showing gym + cycling
- Combined training load
- Recovery status
- Overall periodization

---

## 11. Technical Stack (Same as Main Hub)

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.57.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^7.9.4",
    "lucide-react": "^0.344.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.7.0",
    "tailwindcss": "^3.4.18",
    "typescript": "^5.9.3",
    "vite": "^5.4.21"
  }
}
```

---

## 12. Deployment Considerations

### Environment Variables
Both apps share:
- Same `VITE_SUPABASE_URL`
- Same `VITE_SUPABASE_ANON_KEY`

### Separate Deployments
- Main Hub: `app.asciende.com`
- Cycling App: `cycling.asciende.com` or `bike.asciende.com`

### Cross-Origin Setup
If deployed on different domains, ensure CORS is configured in Supabase:
- Add both domains to allowed origins
- Configure redirect URLs for both apps

---

## 13. Implementation Priority

### Phase 1: Foundation
1. Set up project with same tech stack
2. Implement authentication using shared Supabase
3. Create base layout with design system
4. Implement navigation structure

### Phase 2: Core Features
1. Create cycling workout tables
2. Implement workout planner (trainer view)
3. Build workout calendar (athlete view)
4. Add workout execution logging

### Phase 3: Integration
1. Cross-app calendar view
2. Combined training load metrics
3. Integrated analytics dashboard
4. Bidirectional workout reading

### Phase 4: Advanced Features
1. FTP testing protocols
2. Power-based interval builder
3. Strava/Garmin integration
4. Advanced analytics (PMC, CTL, ATL, TSB)

---

## 14. Code Examples - Key Components

### Workout Planner Component Structure
```typescript
interface CyclingWorkout {
  id: string;
  athlete_id: string;
  coach_id: string;
  workout_date: string;
  workout_type: string;
  title: string;
  description: string;
  planned_duration_minutes: number;
  planned_tss: number;
  intervals: WorkoutInterval[];
}

interface WorkoutInterval {
  duration_minutes: number;
  target_power_watts: number;
  target_power_percent_ftp: number;
  description: string;
}
```

### Calendar Integration
```typescript
// Fetch all training for a week
const fetchWeekTraining = async (athleteId: string, weekStart: string) => {
  const weekEnd = addDays(weekStart, 6);

  const [gym, cycling] = await Promise.all([
    supabase
      .from('workouts')
      .select('*')
      .eq('athlete_id', athleteId)
      .gte('workout_date', weekStart)
      .lte('workout_date', weekEnd),

    supabase
      .from('cycling_workouts')
      .select('*')
      .eq('athlete_id', athleteId)
      .gte('workout_date', weekStart)
      .lte('workout_date', weekEnd)
  ]);

  return { gym: gym.data || [], cycling: cycling.data || [] };
};
```

---

## Summary Checklist

✅ **Database**: Use SAME Supabase project, same credentials
✅ **Authentication**: Shared users table, same auth flow
✅ **Design System**: Copy color palette, typography, component patterns
✅ **RLS Policies**: Implement for all new tables (athlete/trainer separation)
✅ **Context Providers**: AuthContext, AthleteContext, LanguageContext
✅ **Cross-Reading**: Both apps can read each other's workout data
✅ **Roles**: Respect athlete/trainer/admin roles from profiles table
✅ **Icons**: Use lucide-react
✅ **Styling**: Tailwind CSS with dark mode support
✅ **Responsive**: Mobile-first approach

---

## Questions to Address

Before starting implementation in the cycling app, clarify:

1. **FTP Source**: Will FTP be stored in `athlete_profile_details.ftp` or separate table?
2. **Strava Integration**: Should it auto-import activities?
3. **Calendar View**: Should main hub show cycling workouts inline or separate section?
4. **Notifications**: Should workout assignments notify in both apps?
5. **Workout Templates**: Should trainers have a library of pre-built cycling workouts?

---

## Contact Points Between Apps

### Main Hub Reads From Cycling App:
```sql
-- Show cycling activities in main dashboard
SELECT * FROM cycling_activity_logs WHERE athlete_id = ? ORDER BY activity_date DESC LIMIT 5;

-- Show this week's cycling plan
SELECT * FROM cycling_workouts WHERE athlete_id = ? AND workout_date BETWEEN ? AND ?;
```

### Cycling App Reads From Main Hub:
```sql
-- Show recent gym sessions for recovery consideration
SELECT * FROM workouts WHERE athlete_id = ? ORDER BY workout_date DESC LIMIT 5;

-- Check gym training load for combined planning
SELECT workout_date, status FROM workouts WHERE athlete_id = ? AND workout_date BETWEEN ? AND ?;
```

---

## Final Notes

This cycling app is a **satellite application** that operates independently but shares:
- Same users/authentication
- Same database
- Same design language
- Cross-app data visibility

Think of it as a specialized module within the same ecosystem, just deployed separately for better performance and specialized cycling features.

The main hub remains the central point for athlete management, nutrition, anthropometry, and strength training. The cycling app focuses exclusively on cycling-specific training planning and execution.

Both apps together provide a complete training solution for multisport athletes and their coaches.
