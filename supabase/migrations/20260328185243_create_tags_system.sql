/*
  # Create Centralized Tags System

  ## Overview
  Implements a flat, platform-wide tagging system that can be attached to multiple
  content types: gym workouts, training planifications (ATP), training programs,
  wellness check-ins, and habits.

  ## New Tables

  ### `tags`
  - Central tag repository with name, slug, category, and usage count
  - Categories: training, nutrition, recovery, performance, mindset, methodology, other

  ### Junction Tables
  - `workout_tags` — gym training sessions
  - `atp_plan_tags` — annual training plans / planifications
  - `program_tags` — training programs
  - `wellness_tags` — wellness check-in records
  - `habit_tags` — habits

  ## Security
  - RLS on all tables
  - Trainers/admins manage tags; athletes read and self-tag their content
*/

-- ============================================================
-- CENTRAL TAGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_es text,
  slug text UNIQUE NOT NULL,
  category text NOT NULL DEFAULT 'training',
  description text,
  color text DEFAULT '#fdda36',
  usage_count integer DEFAULT 0,
  source_type text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT tags_category_check CHECK (category IN ('training', 'nutrition', 'recovery', 'performance', 'mindset', 'methodology', 'other'))
);

CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);
CREATE INDEX IF NOT EXISTS idx_tags_usage_count ON tags(usage_count DESC);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read tags"
  ON tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Trainers and admins can insert tags"
  ON tags FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('trainer', 'admin')
    OR created_by = auth.uid()
  );

CREATE POLICY "Tag creators and admins can update tags"
  ON tags FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    created_by = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Tag creators and admins can delete tags"
  ON tags FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ============================================================
-- WORKOUT TAGS (gym training sessions)
-- workouts.trainer_id owns the workout
-- ============================================================
CREATE TABLE IF NOT EXISTS workout_tags (
  workout_id uuid NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (workout_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_workout_tags_tag_id ON workout_tags(tag_id);

ALTER TABLE workout_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read workout tags"
  ON workout_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Trainers and admins can tag workouts"
  ON workout_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('trainer', 'admin')
  );

CREATE POLICY "Trainers and admins can remove workout tags"
  ON workout_tags FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('trainer', 'admin')
  );

-- ============================================================
-- ATP PLAN TAGS (annual training planifications)
-- ============================================================
CREATE TABLE IF NOT EXISTS atp_plan_tags (
  plan_id uuid NOT NULL REFERENCES annual_training_plans(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (plan_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_atp_plan_tags_tag_id ON atp_plan_tags(tag_id);

ALTER TABLE atp_plan_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read atp plan tags"
  ON atp_plan_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can tag their own atp plans"
  ON atp_plan_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM annual_training_plans p
      WHERE p.id = plan_id
      AND (
        p.athlete_id = auth.uid()
        OR p.coach_id = auth.uid()
        OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
      )
    )
  );

CREATE POLICY "Users can remove tags from their atp plans"
  ON atp_plan_tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM annual_training_plans p
      WHERE p.id = plan_id
      AND (
        p.athlete_id = auth.uid()
        OR p.coach_id = auth.uid()
        OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
      )
    )
  );

-- ============================================================
-- PROGRAM TAGS (training programs)
-- ============================================================
CREATE TABLE IF NOT EXISTS program_tags (
  program_id uuid NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (program_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_program_tags_tag_id ON program_tags(tag_id);

ALTER TABLE program_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read program tags"
  ON program_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Trainers and admins can tag programs"
  ON program_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('trainer', 'admin')
  );

CREATE POLICY "Trainers and admins can remove program tags"
  ON program_tags FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('trainer', 'admin')
  );

-- ============================================================
-- WELLNESS TAGS (wellness check-ins)
-- ============================================================
CREATE TABLE IF NOT EXISTS wellness_tags (
  checkin_id uuid NOT NULL REFERENCES wellness_checkins(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (checkin_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_wellness_tags_tag_id ON wellness_tags(tag_id);

ALTER TABLE wellness_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read wellness tags"
  ON wellness_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can tag their own wellness checkins"
  ON wellness_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wellness_checkins wc
      WHERE wc.id = checkin_id
      AND wc.athlete_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove tags from their wellness checkins"
  ON wellness_tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wellness_checkins wc
      WHERE wc.id = checkin_id
      AND wc.athlete_id = auth.uid()
    )
  );

-- ============================================================
-- HABIT TAGS
-- habits.user_id is the owner
-- ============================================================
CREATE TABLE IF NOT EXISTS habit_tags (
  habit_id uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (habit_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_habit_tags_tag_id ON habit_tags(tag_id);

ALTER TABLE habit_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read habit tags"
  ON habit_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can tag their own habits"
  ON habit_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM habits h
      WHERE h.id = habit_id
      AND (
        h.user_id = auth.uid()
        OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('trainer', 'admin')
      )
    )
  );

CREATE POLICY "Users can remove tags from their habits"
  ON habit_tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM habits h
      WHERE h.id = habit_id
      AND (
        h.user_id = auth.uid()
        OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('trainer', 'admin')
      )
    )
  );

-- ============================================================
-- FUNCTION: update tag usage counts automatically
-- ============================================================
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tags SET usage_count = usage_count + 1, updated_at = now() WHERE id = NEW.tag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tags SET usage_count = GREATEST(usage_count - 1, 0), updated_at = now() WHERE id = OLD.tag_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER workout_tags_usage_count
  AFTER INSERT OR DELETE ON workout_tags
  FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

CREATE TRIGGER atp_plan_tags_usage_count
  AFTER INSERT OR DELETE ON atp_plan_tags
  FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

CREATE TRIGGER program_tags_usage_count
  AFTER INSERT OR DELETE ON program_tags
  FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

CREATE TRIGGER wellness_tags_usage_count
  AFTER INSERT OR DELETE ON wellness_tags
  FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

CREATE TRIGGER habit_tags_usage_count
  AFTER INSERT OR DELETE ON habit_tags
  FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

-- ============================================================
-- SEED: Default tags by category
-- ============================================================
INSERT INTO tags (name, name_es, slug, category, description, color) VALUES
  ('Velocity Based Training', 'Entrenamiento Basado en Velocidad', 'velocity-based-training', 'methodology', 'Training controlled by bar speed', '#fdda36'),
  ('Conjugate Method', 'Método Conjugado', 'conjugate-method', 'methodology', 'Westside-style concurrent training', '#fdda36'),
  ('Periodization', 'Periodización', 'periodization', 'methodology', 'Systematic variation of training stress', '#fdda36'),
  ('Tapering', 'Tapering', 'tapering', 'methodology', 'Pre-competition load reduction', '#fdda36'),
  ('Deload', 'Descarga', 'deload', 'recovery', 'Planned reduction in training volume/intensity', '#22c55e'),
  ('Supercompensation', 'Supercompensación', 'supercompensation', 'performance', 'Post-overload performance peak', '#3b82f6'),
  ('Squat', 'Sentadilla', 'squat', 'training', 'Squat pattern exercises', '#ef4444'),
  ('Deadlift', 'Peso Muerto', 'deadlift', 'training', 'Hip hinge / deadlift pattern', '#ef4444'),
  ('Bench Press', 'Press de Banca', 'bench-press', 'training', 'Horizontal push pattern', '#ef4444'),
  ('Olympic Lifting', 'Levantamiento Olímpico', 'olympic-lifting', 'training', 'Clean, snatch and derivatives', '#ef4444'),
  ('Plyometrics', 'Pliometría', 'plyometrics', 'performance', 'Jump training and reactive exercises', '#f97316'),
  ('Core Training', 'Trabajo de Core', 'core-training', 'training', 'Trunk stability and anti-rotation work', '#ef4444'),
  ('Aerobic Base', 'Base Aeróbica', 'aerobic-base', 'training', 'Low intensity aerobic development', '#3b82f6'),
  ('Lactate Threshold', 'Umbral Láctico', 'lactate-threshold', 'performance', 'Training at lactate threshold intensity', '#3b82f6'),
  ('VO2max', 'VO2max', 'vo2max', 'performance', 'Maximal oxygen uptake training', '#3b82f6'),
  ('HIIT', 'HIIT', 'hiit', 'training', 'High intensity interval training', '#ef4444'),
  ('Zone 2', 'Zona 2', 'zone-2', 'training', 'Conversational pace aerobic training', '#22c55e'),
  ('Carbohydrate Loading', 'Carga de Carbohidratos', 'carbohydrate-loading', 'nutrition', 'Pre-competition glycogen maximization', '#f97316'),
  ('Protein Synthesis', 'Síntesis Proteica', 'protein-synthesis', 'nutrition', 'Muscle protein synthesis optimization', '#f97316'),
  ('Hydration', 'Hidratación', 'hydration', 'nutrition', 'Fluid intake and electrolyte balance', '#06b6d4'),
  ('Fasted Training', 'Entrenamiento en Ayunas', 'fasted-training', 'nutrition', 'Training in a fasted state', '#f97316'),
  ('Sleep Optimization', 'Optimización del Sueño', 'sleep-optimization', 'recovery', 'Sleep quality and quantity focus', '#8b5cf6'),
  ('Active Recovery', 'Recuperación Activa', 'active-recovery', 'recovery', 'Low-intensity movement for recovery', '#22c55e'),
  ('Mobility Work', 'Trabajo de Movilidad', 'mobility-work', 'recovery', 'Joint range of motion improvement', '#22c55e'),
  ('Mental Toughness', 'Fortaleza Mental', 'mental-toughness', 'mindset', 'Psychological resilience training', '#ec4899'),
  ('Focus', 'Concentración', 'focus', 'mindset', 'Attentional control and concentration', '#ec4899'),
  ('Pre-competition Anxiety', 'Ansiedad Pre-competición', 'pre-competition-anxiety', 'mindset', 'Managing competitive stress', '#ec4899'),
  ('General Preparation', 'Preparación General', 'general-preparation', 'training', 'GPP phase of training', '#60a5fa'),
  ('Specific Preparation', 'Preparación Específica', 'specific-preparation', 'training', 'SPP phase with sport-specific work', '#34d399'),
  ('Competition Phase', 'Fase Competitiva', 'competition-phase', 'training', 'In-season competition management', '#f87171'),
  ('Transition', 'Transición', 'transition', 'recovery', 'Off-season recovery transition', '#9ca3af')
ON CONFLICT (slug) DO NOTHING;
