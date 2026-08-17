/*
  # Add Mesocycles and Movement Patterns to ATP System

  ## Changes

  1. Add movement_patterns column to atp_weekly_loads
     - Stores planned sets per movement pattern (Push, Pull, Squat, Hinge, Core, Vertical Push, Vertical Pull)

  2. Create atp_mesocycles table
     - Groups 4-6 weeks into mesocycles within macrocycles
     - Enables better periodization planning

  3. Add mesocycle_id to atp_weekly_loads
     - Links weeks to their parent mesocycle

  ## Security
  - RLS policies match parent ATP access control
*/

-- Add movement_patterns JSONB column to atp_weekly_loads
ALTER TABLE atp_weekly_loads
ADD COLUMN IF NOT EXISTS movement_patterns jsonb DEFAULT '{
  "push": 0,
  "pull": 0,
  "squat": 0,
  "hinge": 0,
  "core": 0,
  "vertical_push": 0,
  "vertical_pull": 0
}'::jsonb;

-- Create atp_mesocycles table
CREATE TABLE IF NOT EXISTS atp_mesocycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atp_id uuid REFERENCES annual_training_plans(id) ON DELETE CASCADE NOT NULL,
  macrocycle_id uuid REFERENCES atp_macrocycles(id) ON DELETE CASCADE,
  title text NOT NULL,
  start_week integer NOT NULL CHECK (start_week BETWEEN 1 AND 52),
  end_week integer NOT NULL CHECK (end_week BETWEEN 1 AND 52),
  focus text,
  description text,
  target_tonnage numeric(10, 2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_mesocycle_week_range CHECK (start_week <= end_week),
  CONSTRAINT mesocycle_duration CHECK (end_week - start_week + 1 BETWEEN 3 AND 8)
);

-- Add mesocycle_id to atp_weekly_loads
ALTER TABLE atp_weekly_loads
ADD COLUMN IF NOT EXISTS mesocycle_id uuid REFERENCES atp_mesocycles(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_atp_mesocycles_atp ON atp_mesocycles(atp_id);
CREATE INDEX IF NOT EXISTS idx_atp_mesocycles_macrocycle ON atp_mesocycles(macrocycle_id);
CREATE INDEX IF NOT EXISTS idx_atp_weekly_loads_mesocycle ON atp_weekly_loads(mesocycle_id);

-- Enable RLS
ALTER TABLE atp_mesocycles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for atp_mesocycles
CREATE POLICY "Users can view mesocycles of accessible ATPs"
  ON atp_mesocycles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM annual_training_plans
      WHERE id = atp_mesocycles.atp_id
      AND (
        coach_id = auth.uid() OR
        athlete_id = auth.uid() OR
        team_id IN (SELECT team_id FROM team_members WHERE athlete_id = auth.uid())
      )
    )
  );

CREATE POLICY "Coaches can manage mesocycles of their ATPs"
  ON atp_mesocycles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM annual_training_plans
      WHERE id = atp_mesocycles.atp_id
      AND coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can update mesocycles of their ATPs"
  ON atp_mesocycles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM annual_training_plans
      WHERE id = atp_mesocycles.atp_id
      AND coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can delete mesocycles of their ATPs"
  ON atp_mesocycles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM annual_training_plans
      WHERE id = atp_mesocycles.atp_id
      AND coach_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all mesocycles"
  ON atp_mesocycles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Update trigger for mesocycles
DROP TRIGGER IF EXISTS update_atp_mesocycles_updated_at ON atp_mesocycles;
CREATE TRIGGER update_atp_mesocycles_updated_at
  BEFORE UPDATE ON atp_mesocycles
  FOR EACH ROW
  EXECUTE FUNCTION update_atp_updated_at();

-- Comments
COMMENT ON TABLE atp_mesocycles IS 'Mesocycles (4-6 week blocks) within ATP macrocycles for detailed periodization';
COMMENT ON COLUMN atp_weekly_loads.movement_patterns IS 'Planned sets per movement pattern (push, pull, squat, hinge, core, vertical_push, vertical_pull)';
COMMENT ON COLUMN atp_weekly_loads.mesocycle_id IS 'Parent mesocycle for this week';
