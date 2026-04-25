/*
  # Advanced Training System

  1. New Tables
    - `training_templates` - Reusable training templates
    - `training_set_lines` - Multiple set configurations per exercise
    - `training_metrics_config` - Metric preferences per exercise
  
  2. Security
    - RLS enabled on all tables
    - Trainers manage their own content
    - Athletes can view assigned content
*/

CREATE TABLE IF NOT EXISTS training_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_set_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id uuid REFERENCES workout_exercises(id) ON DELETE CASCADE,
  set_number int NOT NULL,
  primary_metric text NOT NULL DEFAULT 'reps',
  primary_value numeric,
  secondary_metric text,
  secondary_value numeric,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_metrics_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid REFERENCES exercises(id) ON DELETE CASCADE,
  trainer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  primary_metric text NOT NULL DEFAULT 'reps',
  secondary_metric text,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(exercise_id, trainer_id)
);

-- Enable RLS
ALTER TABLE training_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_set_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_metrics_config ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Trainers manage own templates"
  ON training_templates FOR ALL
  TO authenticated
  USING (creator_id = auth.uid());

CREATE POLICY "Trainers manage set lines"
  ON training_set_lines FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE we.id = training_set_lines.workout_exercise_id
      AND w.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Athletes view set lines"
  ON training_set_lines FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_exercises we
      JOIN athlete_workouts aw ON aw.workout_id = we.workout_id
      WHERE we.id = training_set_lines.workout_exercise_id
      AND aw.athlete_id = auth.uid()
    )
  );

CREATE POLICY "Trainers manage metrics config"
  ON training_metrics_config FOR ALL
  TO authenticated
  USING (trainer_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_training_templates_creator ON training_templates(creator_id);
CREATE INDEX IF NOT EXISTS idx_training_set_lines_workout_exercise ON training_set_lines(workout_exercise_id);
CREATE INDEX IF NOT EXISTS idx_training_metrics_config_exercise_trainer ON training_metrics_config(exercise_id, trainer_id);
