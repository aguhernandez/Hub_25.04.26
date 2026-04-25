# Cycling App - Database Credentials & Connection

## CRITICAL: Copy These Exact Credentials

To ensure the cycling app shares the same authentication and database with the main Asciende Hub, you MUST use these exact environment variables:

### Environment Variables (.env file)

Create a `.env` file in the root of your cycling app project with these EXACT values:

```bash
# EXACT credentials - Copy these values
VITE_SUPABASE_URL=https://ngkcbygyoobqhlmlnuvl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5na2NieWd5b29icWhsbWxudXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1Mjc5NzksImV4cCI6MjA3NTEwMzk3OX0.WXFVZK7HbtR-sRaraMEKCH69dvi4GfhZFgrxY1E0nL8
```

## How to Get These Values

1. In the main Asciende Hub project, open the `.env` file
2. Copy the `VITE_SUPABASE_URL` value exactly as it appears
3. Copy the `VITE_SUPABASE_ANON_KEY` value exactly as it appears
4. Paste them into the cycling app's `.env` file

## Verification

After setting up the credentials, verify the connection works by:

1. Starting the cycling app
2. Trying to log in with an existing user from the main hub
3. If login succeeds, the database connection is correct

## Database Tables Available

The cycling app will have access to ALL tables in the Supabase database, including:

### Shared Tables (Already Exist)
- `profiles` - User accounts and roles
- `athlete_profile_details` - Athlete information (weight, height, FTP, etc.)
- `workouts` - Gym workouts (read-only from cycling app perspective)
- `training_logs` - Gym training execution logs
- `teams` - Team management
- `team_members` - Team memberships

### New Tables to Create (Cycling Specific)

You will need to create these tables via Supabase migrations:

1. `cycling_workouts` - Planned cycling workouts
2. `cycling_workout_intervals` - Interval details for workouts
3. `cycling_activity_logs` - Completed cycling activities
4. `cycling_ftp_tests` - FTP test results history

See the main guide (`CYCLING_APP_SATELLITE_GUIDE.md`) for the complete schema definitions and RLS policies.

## Important Security Notes

### DO NOT:
- ❌ Create a new Supabase project
- ❌ Use different credentials
- ❌ Share these credentials publicly
- ❌ Commit the `.env` file to git

### DO:
- ✅ Use the exact same Supabase project
- ✅ Add `.env` to `.gitignore`
- ✅ Use `.env.example` for documentation
- ✅ Keep credentials secure

## Testing Database Connection

Here's a simple test to verify the database connection:

```typescript
// Test file: src/test-db-connection.ts
import { supabase } from './lib/supabase';

async function testConnection() {
  try {
    // Test 1: Check authentication
    const { data: session } = await supabase.auth.getSession();
    console.log('✅ Auth connection successful');

    // Test 2: Query profiles table
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, role')
      .limit(1);

    if (error) throw error;
    console.log('✅ Database query successful');
    console.log('Sample profile:', profiles[0]);

    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error);
    return false;
  }
}

testConnection();
```

Run this test with: `npx tsx src/test-db-connection.ts`

## Cross-App Data Flow

### Data Written by Main Hub (Read by Cycling App):
- User profiles and authentication
- Gym workouts and training logs
- Athlete details (weight, FTP from tests)
- Team assignments

### Data Written by Cycling App (Read by Main Hub):
- Cycling workouts and plans
- Cycling activity logs
- FTP test results (updates `athlete_profile_details.ftp`)
- Cycling-specific metrics

### Shared/Updated by Both:
- `athlete_profile_details.ftp` - FTP value
- `athlete_profile_details.weight_kg` - Body weight
- `athlete_profile_details.max_heart_rate` - Max HR

## Database Migration Strategy

When creating new tables in the cycling app:

1. **Option A: Use Supabase Dashboard**
   - Go to Supabase project dashboard
   - Navigate to SQL Editor
   - Run CREATE TABLE statements
   - Apply RLS policies

2. **Option B: Use Supabase CLI (Recommended)**
   ```bash
   # Install Supabase CLI
   npm install -g supabase

   # Link to existing project
   supabase link --project-ref your-project-ref

   # Create new migration
   supabase migration new create_cycling_tables

   # Edit migration file
   # Apply migration
   supabase db push
   ```

3. **Option C: Use Edge Functions**
   - Create a Supabase Edge Function that runs migrations
   - Call it once to set up tables

## Accessing Existing Data

To verify you can access the main hub's data:

```typescript
// Fetch all athletes (for trainer view)
const { data: athletes } = await supabase
  .from('profiles')
  .select('id, full_name, email, avatar_url')
  .eq('role', 'athlete')
  .order('full_name');

// Fetch gym workouts for an athlete
const { data: gymWorkouts } = await supabase
  .from('workouts')
  .select('*')
  .eq('athlete_id', athleteId)
  .gte('workout_date', '2024-01-01')
  .order('workout_date');

// Fetch athlete details including FTP
const { data: athleteDetails } = await supabase
  .from('athlete_profile_details')
  .select('*')
  .eq('athlete_id', athleteId)
  .single();
```

If these queries work, your database connection is properly configured.

## Troubleshooting

### "Invalid API key" error
- Double-check you copied the `VITE_SUPABASE_ANON_KEY` correctly
- Ensure no extra spaces or line breaks
- Verify the key starts with "eyJ..."

### "Failed to fetch" error
- Check the `VITE_SUPABASE_URL` is correct
- Ensure it starts with "https://" and ends with ".supabase.co"
- Verify your internet connection

### "Permission denied" errors
- RLS policies are enforced
- Make sure you're authenticated before querying
- Check that policies allow your role to access the data

### "Table does not exist" error
- For cycling-specific tables, you need to create them first
- Follow the schema in the main guide
- For shared tables, they should already exist

## Next Steps

1. ✅ Copy credentials from main hub `.env`
2. ✅ Create `.env` file in cycling app
3. ✅ Set up Supabase client
4. ✅ Test authentication
5. ✅ Test database queries
6. ✅ Create cycling-specific tables
7. ✅ Implement RLS policies
8. ✅ Start building features

Once you verify the database connection works and you can authenticate with existing users, you're ready to start building the cycling app features.
