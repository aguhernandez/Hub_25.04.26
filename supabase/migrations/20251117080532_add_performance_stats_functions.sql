/*
  # Add Performance Stats Functions
  
  1. New Functions
    - `get_athlete_exercises_with_counts` - Returns exercises performed by athlete with session counts
    
  2. Purpose
    - Support new Performance Stats dashboard with exercise progression tracking
    - Enable efficient querying of exercise history
*/

-- Function to get all exercises performed by an athlete with session counts
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
    e.name,
    e.category,
    COUNT(DISTINCT tl.athlete_workout_id) as session_count
  FROM exercises e
  INNER JOIN workout_exercises we ON we.exercise_id = e.id
  INNER JOIN training_logs tl ON tl.workout_exercise_id = we.id
  INNER JOIN athlete_workouts aw ON aw.id = tl.athlete_workout_id
  WHERE aw.athlete_id = p_athlete_id
  GROUP BY e.id, e.name, e.category
  ORDER BY session_count DESC, e.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
