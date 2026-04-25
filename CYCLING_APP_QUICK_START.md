# Cycling App Satellite - Quick Start Guide

## Copy-Paste Instructions for New Bolt Chat

Hello Bolt! I need you to create a cycling training application that integrates with an existing Asciende Hub.

### Context
This is a **satellite application** that shares authentication and database with a main fitness hub. The main hub handles gym/strength training, while this cycling app will handle cycling-specific training.

### Your Mission
Build a cycling training platform with these requirements:

#### 1. Core Features Needed
- **Trainer View**: Plan cycling workouts for athletes (intervals, power targets, TSS)
- **Athlete View**: See assigned workouts, log completed rides
- **Calendar**: Unified view showing both gym and cycling workouts
- **Performance Analytics**: Power curves, FTP tracking, TSS/CTL charts
- **Workout Builder**: Interval-based workout creator with power zones

#### 2. Technical Foundation (CRITICAL)

**Use These EXACT Database Credentials:**
```bash
VITE_SUPABASE_URL=https://ngkcbygyoobqhlmlnuvl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5na2NieWd5b29icWhsbWxudXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1Mjc5NzksImV4cCI6MjA3NTEwMzk3OX0.WXFVZK7HbtR-sRaraMEKCH69dvi4GfhZFgrxY1E0nL8
```

**Tech Stack:**
- React + TypeScript + Vite
- Tailwind CSS (with dark mode support)
- Supabase for database
- React Router for navigation
- lucide-react for icons

#### 3. Design System (MUST FOLLOW)

**Colors:**
- Primary: `#fdda36` (yellow)
- Secondary: `#514163` (purple)
- Background light: `white`, dark: `#111827`

**Component Patterns:**
```jsx
// Primary Button
<button className="px-4 py-2 bg-[#fdda36] text-[#514163] font-semibold rounded-lg hover:bg-[#fce76a]">

// Card
<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">

// Input
<input className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]">
```

#### 4. Database Schema to Create

**Create these tables in Supabase:**

```sql
-- Cycling Workouts
CREATE TABLE cycling_workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES profiles(id) NOT NULL,
  coach_id uuid REFERENCES profiles(id),
  workout_date date NOT NULL,
  workout_type text NOT NULL,
  title text NOT NULL,
  description text,
  planned_duration_minutes integer,
  planned_distance_km numeric,
  planned_tss numeric,
  status text DEFAULT 'planned',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Workout Intervals
CREATE TABLE cycling_workout_intervals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid REFERENCES cycling_workouts(id) ON DELETE CASCADE,
  interval_order integer NOT NULL,
  duration_minutes integer,
  target_power_watts integer,
  target_power_percent_ftp integer,
  target_heart_rate integer,
  cadence_rpm integer,
  description text
);

-- Activity Logs
CREATE TABLE cycling_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES profiles(id) NOT NULL,
  workout_id uuid REFERENCES cycling_workouts(id),
  activity_date date NOT NULL,
  activity_type text,
  duration_minutes integer,
  distance_km numeric,
  avg_power_watts integer,
  normalized_power_watts integer,
  avg_heart_rate integer,
  max_heart_rate integer,
  avg_cadence_rpm integer,
  elevation_gain_m integer,
  tss numeric,
  intensity_factor numeric,
  notes text,
  source text DEFAULT 'manual',
  external_id text,
  created_at timestamptz DEFAULT now()
);

-- FTP Tests
CREATE TABLE cycling_ftp_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES profiles(id) NOT NULL,
  test_date date NOT NULL,
  test_type text,
  ftp_watts integer NOT NULL,
  test_avg_power integer,
  test_duration_minutes integer,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE cycling_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycling_workout_intervals ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycling_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycling_ftp_tests ENABLE ROW LEVEL SECURITY;

-- RLS Policies (athletes see own data, trainers see their athletes)
CREATE POLICY "Athletes can view own cycling workouts"
  ON cycling_workouts FOR SELECT
  TO authenticated
  USING (auth.uid() = athlete_id);

CREATE POLICY "Trainers can view all cycling workouts"
  ON cycling_workouts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('trainer', 'admin')
    )
  );

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

-- Similar policies for other tables...
```

#### 5. Existing Tables You Can Use

**DO NOT CREATE** these tables (they already exist):
- `profiles` - Users (id, email, full_name, role, avatar_url)
- `athlete_profile_details` - Athlete data (weight, height, **ftp**, max_heart_rate)
- `workouts` - Gym workouts (read these to show in calendar)
- `teams` - Team management
- `team_members` - Team assignments

#### 6. Authentication (Already Set Up)

Users already exist in the database. Your auth should work like this:

```typescript
// Login with existing credentials
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// Get user profile
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single();

// Profile has: role ('athlete' | 'trainer' | 'admin')
```

#### 7. Key Cycling Calculations

**Power Zones (based on FTP):**
```typescript
const zones = {
  recovery: 0.55 * ftp,
  endurance: 0.75 * ftp,
  tempo: 0.90 * ftp,
  threshold: 1.05 * ftp,
  vo2max: 1.20 * ftp,
  anaerobic: 1.21 * ftp
};
```

**Training Stress Score (TSS):**
```typescript
TSS = (duration_sec × NP × IF) / (FTP × 3600) × 100
where IF = NP / FTP
```

#### 8. Pages to Build

**Priority 1:**
1. Dashboard - Overview of this week's workouts
2. Calendar - Weekly/monthly view with gym + cycling
3. Workout Planner - Create interval workouts (trainer only)
4. Workout Detail - Execute/view workout

**Priority 2:**
5. Activity Log - List of completed rides
6. Performance Analytics - Power curves, TSS over time
7. FTP Testing - Guided FTP test protocols
8. Settings - User preferences

#### 9. User Roles & Permissions

**Trainer:**
- Select athlete from dropdown
- Create workouts for athletes
- View all athletes' data
- Assign workouts

**Athlete:**
- View own calendar
- See assigned workouts
- Log completed activities
- Track performance

**Admin:**
- Everything trainers can do
- Manage users

#### 10. Cross-App Integration

**Read Gym Workouts:**
```typescript
// Show gym workouts in cycling calendar
const { data: gymWorkouts } = await supabase
  .from('workouts')
  .select('id, workout_date, title, status')
  .eq('athlete_id', athleteId)
  .gte('workout_date', startDate)
  .lte('workout_date', endDate);
```

**Update FTP in Shared Table:**
```typescript
// After FTP test, update athlete profile
await supabase
  .from('athlete_profile_details')
  .update({ ftp: newFtpValue })
  .eq('athlete_id', athleteId);
```

#### 11. UI/UX Requirements

- **Mobile-first responsive design**
- **Dark mode support** (use `dark:` classes)
- **Loading states** for all async operations
- **Error handling** with user-friendly messages
- **Confirmation dialogs** for destructive actions
- **Toast notifications** for success/error feedback

#### 12. Key Components to Build

**WorkoutBuilder:**
- Interval editor (drag to reorder)
- Power zone selector
- Duration picker
- TSS calculator (auto-calculate from intervals)

**Calendar:**
- Weekly view with both gym and cycling
- Color-coded workouts (planned, completed, skipped)
- Click to view/edit workout
- Drag-and-drop to reschedule

**ActivityLog:**
- List/grid view toggle
- Filters (date range, type)
- Quick stats (total distance, TSS, hours)
- Export to CSV

**PerformanceCharts:**
- Power curve (1s, 5s, 1min, 5min, 20min, 60min bests)
- TSS/week bar chart
- Fitness (CTL), Fatigue (ATL), Form (TSB) lines
- FTP progression line

#### 13. Sample Workout Structure

```typescript
{
  title: "Threshold Intervals",
  workout_type: "interval",
  planned_duration_minutes: 90,
  planned_tss: 85,
  intervals: [
    { duration_minutes: 15, target_power_percent_ftp: 65, description: "Warm up" },
    { duration_minutes: 3, target_power_percent_ftp: 100, description: "Build to threshold" },
    { duration_minutes: 10, target_power_percent_ftp: 95, description: "Threshold interval" },
    { duration_minutes: 5, target_power_percent_ftp: 60, description: "Recovery" },
    { duration_minutes: 10, target_power_percent_ftp: 95, description: "Threshold interval" },
    { duration_minutes: 5, target_power_percent_ftp: 60, description: "Recovery" },
    { duration_minutes: 10, target_power_percent_ftp: 95, description: "Threshold interval" },
    { duration_minutes: 15, target_power_percent_ftp: 55, description: "Cool down" }
  ]
}
```

#### 14. Testing Users

Use these credentials to test:

**Admin/Trainer:**
- Email: Check existing profiles in database
- These users have role = 'trainer' or 'admin'

**Athletes:**
- Any user with role = 'athlete'
- They should only see their own data

#### 15. Deployment

Once built:
- Deploy to Netlify/Vercel
- Use same `.env` variables
- Configure domain: `cycling.asciende.com` or similar

---

## Implementation Steps

1. ✅ Create new Vite + React + TypeScript project
2. ✅ Install dependencies (supabase-js, react-router-dom, lucide-react)
3. ✅ Set up Tailwind CSS with dark mode
4. ✅ Create `.env` with Supabase credentials (see above)
5. ✅ Set up `src/lib/supabase.ts` client
6. ✅ Create `AuthContext` for authentication
7. ✅ Create database tables (run SQL in Supabase dashboard)
8. ✅ Build authentication page
9. ✅ Create layout with navigation
10. ✅ Build dashboard page
11. ✅ Build workout planner (trainer)
12. ✅ Build calendar view
13. ✅ Build workout execution (athlete)
14. ✅ Add activity logging
15. ✅ Build analytics dashboard
16. ✅ Test cross-app integration
17. ✅ Polish UI/UX
18. ✅ Deploy

---

## Important Reminders

⚠️ **DO NOT create a new Supabase project** - use the existing one
⚠️ **DO NOT modify existing tables** - only create new cycling tables
⚠️ **DO follow the design system** - use the exact colors and styles
⚠️ **DO implement RLS policies** - security is critical
⚠️ **DO support dark mode** - all components must work in both modes
⚠️ **DO make it responsive** - mobile, tablet, desktop
⚠️ **DO add loading states** - better UX
⚠️ **DO handle errors gracefully** - show user-friendly messages

---

## Questions to Ask During Development

1. Should Strava integration auto-import activities?
2. Should the main hub show a "Cycling" tab with cycling workouts?
3. Do you want TrainingPeaks export/import functionality?
4. Should there be pre-built workout templates?
5. Do you want team-based features (team workouts, group rides)?

---

## Success Criteria

The cycling app is complete when:
- ✅ Trainer can log in and create workouts for athletes
- ✅ Athlete can log in and see assigned workouts
- ✅ Calendar shows both gym and cycling workouts
- ✅ FTP tests update the athlete profile
- ✅ Activity logs calculate TSS correctly
- ✅ Performance charts show power curves and fitness trends
- ✅ Dark mode works perfectly
- ✅ Mobile responsive
- ✅ No database permission errors

---

## Full Technical Documentation

For complete implementation details, see:
- `CYCLING_APP_SATELLITE_GUIDE.md` - Complete technical guide
- `CYCLING_APP_DATABASE_CREDENTIALS.md` - Database setup and credentials

---

Good luck! Build something amazing! 🚴‍♂️💪
