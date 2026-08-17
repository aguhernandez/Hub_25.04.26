/*
  # Setup Admin/Trainer and Auto-Assignment System
  
  Creates the admin and trainer accounts, and implements automatic assignment
  of new athletes to the default trainer (Agu).
  
  1. Changes
    - Add assigned_trainer_id field to profiles
    - Create function to auto-assign new athletes to trainer
    - Create trigger to execute auto-assignment on signup
    
  2. Default Accounts
    - Admin: admin@asciende.pro
    - Trainer: agu@asciende.pro
    - All new athletes auto-assigned to Agu
    
  3. Security
    - Athletes can view their assigned trainer
    - Trainers can view their assigned athletes
    - Admins can reassign trainers
*/

-- Add assigned_trainer_id to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'assigned_trainer_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN assigned_trainer_id uuid REFERENCES profiles(id);
    CREATE INDEX IF NOT EXISTS idx_profiles_assigned_trainer ON profiles(assigned_trainer_id);
  END IF;
END $$;

-- Create function to get default trainer ID (Agu)
CREATE OR REPLACE FUNCTION get_default_trainer_id()
RETURNS uuid AS $$
DECLARE
  trainer_id uuid;
BEGIN
  -- Get Agu's user ID from auth.users by email
  SELECT au.id INTO trainer_id
  FROM auth.users au
  WHERE au.email = 'agu@asciende.pro'
  LIMIT 1;
  
  RETURN trainer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to auto-assign trainer to new athletes
CREATE OR REPLACE FUNCTION auto_assign_trainer_to_athlete()
RETURNS TRIGGER AS $$
DECLARE
  default_trainer_id uuid;
BEGIN
  -- Only assign if the user is an athlete (role = 'athlete') and doesn't have a trainer assigned
  IF NEW.role = 'athlete' AND NEW.assigned_trainer_id IS NULL THEN
    -- Get the default trainer ID
    default_trainer_id := get_default_trainer_id();
    
    -- Assign the trainer if found
    IF default_trainer_id IS NOT NULL THEN
      NEW.assigned_trainer_id := default_trainer_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-assign trainer on profile creation
DROP TRIGGER IF EXISTS trigger_auto_assign_trainer ON profiles;
CREATE TRIGGER trigger_auto_assign_trainer
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_trainer_to_athlete();

-- Create function to get trainer's athletes
CREATE OR REPLACE FUNCTION get_trainer_athletes(trainer_user_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  sport text,
  country text,
  avatar_url text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    au.email,
    p.sport,
    p.country,
    p.avatar_url,
    p.created_at
  FROM profiles p
  JOIN auth.users au ON au.id = p.id
  WHERE p.assigned_trainer_id = trainer_user_id
    AND p.role = 'athlete'
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get athlete's trainer info
CREATE OR REPLACE FUNCTION get_athlete_trainer(athlete_user_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  avatar_url text,
  country text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    au.email,
    p.avatar_url,
    p.country
  FROM profiles p
  JOIN profiles athlete ON athlete.assigned_trainer_id = p.id
  JOIN auth.users au ON au.id = p.id
  WHERE athlete.id = athlete_user_id
    AND p.role IN ('trainer', 'admin')
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policy for profiles to allow athletes to see their trainer
DROP POLICY IF EXISTS "Athletes can view their trainer" ON profiles;
CREATE POLICY "Athletes can view their trainer"
ON profiles FOR SELECT
TO authenticated
USING (
  -- User can see their assigned trainer
  id IN (
    SELECT assigned_trainer_id 
    FROM profiles 
    WHERE profiles.id = auth.uid()
  )
);

-- Update RLS policy for trainers to see their assigned athletes
DROP POLICY IF EXISTS "Trainers can view assigned athletes" ON profiles;
CREATE POLICY "Trainers can view assigned athletes"
ON profiles FOR SELECT
TO authenticated
USING (
  -- Trainers can see athletes assigned to them
  EXISTS (
    SELECT 1 FROM profiles trainer
    WHERE trainer.id = auth.uid()
    AND trainer.role IN ('trainer', 'admin')
    AND profiles.assigned_trainer_id = trainer.id
  )
);

-- Function to reassign athlete to different trainer (admin only)
CREATE OR REPLACE FUNCTION reassign_athlete_trainer(
  athlete_id uuid,
  new_trainer_id uuid
)
RETURNS boolean AS $$
DECLARE
  is_admin boolean;
  is_valid_trainer boolean;
BEGIN
  -- Check if current user is admin
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only admins can reassign trainers';
  END IF;
  
  -- Check if new trainer is valid
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = new_trainer_id AND role IN ('trainer', 'admin')
  ) INTO is_valid_trainer;
  
  IF NOT is_valid_trainer THEN
    RAISE EXCEPTION 'Invalid trainer ID';
  END IF;
  
  -- Update the assignment
  UPDATE profiles
  SET assigned_trainer_id = new_trainer_id
  WHERE id = athlete_id AND role = 'athlete';
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Assign existing athletes (without trainer) to Agu
DO $$
DECLARE
  default_trainer_id uuid;
BEGIN
  -- Get Agu's ID
  default_trainer_id := get_default_trainer_id();
  
  -- Assign all athletes without a trainer to Agu
  IF default_trainer_id IS NOT NULL THEN
    UPDATE profiles
    SET assigned_trainer_id = default_trainer_id
    WHERE role = 'athlete'
      AND assigned_trainer_id IS NULL;
  END IF;
END $$;
