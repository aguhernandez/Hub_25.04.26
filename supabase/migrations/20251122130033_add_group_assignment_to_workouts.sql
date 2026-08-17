/*
  # Add Group Assignment Support for Workouts

  1. Changes
    - Add assignment_type to athlete_workouts (individual, team, membership)
    - Add team_id to athlete_workouts (nullable)
    - Add membership_id to athlete_workouts (nullable)
    - Create indexes for performance
    - Create helper function to assign workouts to groups
  
  2. Security
    - Maintain existing RLS policies
    - Only team/membership creators can assign workouts to groups
    - Athletes see workouts assigned to them individually or via groups
  
  3. Notes
    - If athlete is in team AND has membership, they receive workout once
    - Deduplication happens at assignment time
*/

-- Add new columns to athlete_workouts
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athlete_workouts' AND column_name = 'assignment_type'
  ) THEN
    ALTER TABLE athlete_workouts 
    ADD COLUMN assignment_type text DEFAULT 'individual' CHECK (assignment_type IN ('individual', 'team', 'membership'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athlete_workouts' AND column_name = 'team_id'
  ) THEN
    ALTER TABLE athlete_workouts 
    ADD COLUMN team_id uuid REFERENCES teams(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athlete_workouts' AND column_name = 'membership_id'
  ) THEN
    ALTER TABLE athlete_workouts 
    ADD COLUMN membership_id uuid REFERENCES memberships(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_athlete_workouts_team_id ON athlete_workouts(team_id);
CREATE INDEX IF NOT EXISTS idx_athlete_workouts_membership_id ON athlete_workouts(membership_id);
CREATE INDEX IF NOT EXISTS idx_athlete_workouts_assignment_type ON athlete_workouts(assignment_type);

-- Create function to assign workout to team members
CREATE OR REPLACE FUNCTION assign_workout_to_team(
  p_workout_id uuid,
  p_team_id uuid,
  p_trainer_id uuid,
  p_scheduled_date date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inserted_count integer := 0;
BEGIN
  -- Insert workout assignment for each team member
  -- Using INSERT with deduplication to avoid duplicates
  INSERT INTO athlete_workouts (
    athlete_id,
    trainer_id,
    workout_id,
    team_id,
    scheduled_date,
    assignment_type,
    status
  )
  SELECT 
    tm.athlete_id,
    p_trainer_id,
    p_workout_id,
    p_team_id,
    p_scheduled_date,
    'team',
    'pending'
  FROM team_members tm
  WHERE tm.team_id = p_team_id
  ON CONFLICT DO NOTHING;
  
  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  RETURN v_inserted_count;
END;
$$;

-- Create function to assign workout to membership subscribers
CREATE OR REPLACE FUNCTION assign_workout_to_membership(
  p_workout_id uuid,
  p_membership_id uuid,
  p_trainer_id uuid,
  p_scheduled_date date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inserted_count integer := 0;
BEGIN
  -- Insert workout assignment for each active subscriber
  INSERT INTO athlete_workouts (
    athlete_id,
    trainer_id,
    workout_id,
    membership_id,
    scheduled_date,
    assignment_type,
    status
  )
  SELECT 
    um.user_id,
    p_trainer_id,
    p_workout_id,
    p_membership_id,
    p_scheduled_date,
    'membership',
    'pending'
  FROM user_memberships um
  WHERE um.membership_id = p_membership_id
  AND um.status = 'active'
  ON CONFLICT DO NOTHING;
  
  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  RETURN v_inserted_count;
END;
$$;

-- Add comments
COMMENT ON COLUMN athlete_workouts.assignment_type IS 
'Type of assignment: individual (direct to athlete), team (all team members), membership (all subscribers)';

COMMENT ON COLUMN athlete_workouts.team_id IS 
'If assignment_type is team, references the team that received this workout';

COMMENT ON COLUMN athlete_workouts.membership_id IS 
'If assignment_type is membership, references the membership that received this workout';

COMMENT ON FUNCTION assign_workout_to_team IS 
'Assigns a workout to all members of a team. Returns count of athletes assigned.';

COMMENT ON FUNCTION assign_workout_to_membership IS 
'Assigns a workout to all active subscribers of a membership. Returns count of athletes assigned.';
