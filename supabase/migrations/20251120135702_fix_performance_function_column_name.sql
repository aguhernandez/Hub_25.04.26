/*
  # Fix Performance Function Column Name
  
  1. Changes
    - Update get_athlete_exercises_with_counts to use 'exercise' instead of 'name'
    - The exercises table has column 'exercise', not 'name'
    
  2. Purpose
    - Fix 400 error when calling the RPC function
*/

CREATE OR REPLACE FUNCTION get_athlete_exercises_with_counts(p_athlete_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  category text,
  session_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    e.id,
    e.exercise as name,
    e.category,
    COUNT(DISTINCT tl.athlete_workout_id) as session_count
  FROM exercises e
  INNER JOIN workout_exercises we ON we.exercise_id = e.id
  INNER JOIN training_logs tl ON tl.workout_exercise_id = we.id
  INNER JOIN athlete_workouts aw ON aw.id = tl.athlete_workout_id
  WHERE aw.athlete_id = p_athlete_id
  GROUP BY e.id, e.exercise, e.category
  ORDER BY session_count DESC, e.exercise ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
