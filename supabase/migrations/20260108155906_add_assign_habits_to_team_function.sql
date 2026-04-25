/*
  # Add Assign Habits to Team Function

  1. New Functions
    - `assign_habits_to_team` - Assigns multiple habits to all members of a team
      - Parameters:
        - p_habit_ids: Array of habit template IDs to assign
        - p_team_id: Target team UUID
        - p_trainer_id: Trainer creating the assignments
      - Returns: Count of total habit assignments created

  2. Security
    - Function runs with SECURITY DEFINER to bypass RLS
    - Internal checks ensure only trainer owns the team
*/

CREATE OR REPLACE FUNCTION assign_habits_to_team(
  p_habit_ids UUID[],
  p_team_id UUID,
  p_trainer_id UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_athlete_id UUID;
  v_habit_id UUID;
  v_count INT := 0;
BEGIN
  -- Verify trainer owns this team
  IF NOT EXISTS (
    SELECT 1 FROM teams
    WHERE id = p_team_id AND coach_id = p_trainer_id
  ) THEN
    RAISE EXCEPTION 'Trainer does not own this team';
  END IF;

  -- Loop through each athlete in the team
  FOR v_athlete_id IN
    SELECT athlete_id
    FROM team_members
    WHERE team_id = p_team_id
  LOOP
    -- Loop through each habit template
    FOREACH v_habit_id IN ARRAY p_habit_ids
    LOOP
      -- Get habit template details
      DECLARE
        v_template RECORD;
      BEGIN
        SELECT name, description, tracking_type, numeric_unit, numeric_target
        INTO v_template
        FROM habit_templates
        WHERE id = v_habit_id;

        -- Create habit for this athlete (skip if already exists)
        INSERT INTO user_habits (
          user_id,
          name,
          description,
          tracking_type,
          numeric_unit,
          numeric_target,
          is_active
        )
        VALUES (
          v_athlete_id,
          v_template.name,
          v_template.description,
          v_template.tracking_type,
          v_template.numeric_unit,
          v_template.numeric_target,
          true
        )
        ON CONFLICT DO NOTHING;

        v_count := v_count + 1;
      END;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$$;
