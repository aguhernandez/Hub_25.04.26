/*
  # Fix Workouts RLS for JOINs

  1. Problem
    - Athletes cannot view workouts through JOINs with athlete_workouts
    - The subquery in the policy causes 400 errors when used in JOINs
    - Athletes need to see workouts both when they created them AND when assigned

  2. Solution
    - Simplify the athlete policy to work with JOINs
    - Allow athletes to see workouts they created OR that exist in athlete_workouts
    - Use a more permissive approach that works with Supabase's JOIN handling
*/

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Athletes can view assigned workouts" ON workouts;
DROP POLICY IF EXISTS "athletes_view_own_workouts" ON workouts;

-- Create a working policy for athletes
CREATE POLICY "Athletes can view their workouts"
  ON workouts
  FOR SELECT
  TO authenticated
  USING (
    -- Athletes can see workouts they created
    (trainer_id = auth.uid() AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'athlete'
    ))
    OR
    -- OR workouts assigned to them (this works with JOINs)
    (id IN (
      SELECT workout_id 
      FROM athlete_workouts 
      WHERE athlete_workouts.athlete_id = auth.uid()
    ))
  );