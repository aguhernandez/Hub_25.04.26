/*
  # Sistema de Bienestar y Planificación IA

  ## Resumen
  Este módulo añade cuestionarios de bienestar diario del atleta
  y soporte para OpenAI en la configuración de APIs.

  ## Nuevas Tablas

  ### 1. wellness_checkins
  Registro diario del estado del atleta ANTES del entrenamiento.
  La IA usa este historial para adaptar la progresión.
  Campos:
    - athlete_id: referencia al atleta
    - checkin_date: fecha del check-in (una por día)
    - sleep_quality: calidad del sueño 1-5
    - sleep_hours: horas dormidas
    - stress_level: nivel de estrés 1-5
    - fatigue_level: nivel de fatiga 1-5
    - muscle_soreness: dolor muscular 1-5
    - motivation: motivación 1-5
    - hydration: hidratación (low/normal/high)
    - nutrition_quality: calidad nutricional 1-5
    - injury_notes: notas de lesiones/molestias
    - general_notes: notas generales del atleta
    - ready_to_train: booleano si el atleta se siente listo
    - overall_score: score calculado automáticamente

  ### 2. ai_training_plans
  Planes de entrenamiento generados por IA con contexto completo.
  Permite guardar el plan, las recomendaciones y los ajustes de progresión.
  Campos:
    - athlete_id
    - generated_at
    - model_used: gpt-4o, gpt-4o-mini, etc.
    - context_data: JSON con los datos de entrada usados
    - plan_data: JSON con el plan generado
    - progression_notes: notas de progresión calculadas
    - week_number: semana dentro del plan

  ## Seguridad
  - RLS habilitado en todas las tablas
  - Atletas solo ven sus propios datos
  - Trainers ven datos de sus atletas
*/

-- ============================================================
-- 1. TABLA: wellness_checkins
-- ============================================================
CREATE TABLE IF NOT EXISTS wellness_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Sueño
  sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 5),
  sleep_hours NUMERIC(3,1) CHECK (sleep_hours BETWEEN 0 AND 24),

  -- Estado físico y mental
  stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 5),
  fatigue_level INTEGER CHECK (fatigue_level BETWEEN 1 AND 5),
  muscle_soreness INTEGER CHECK (muscle_soreness BETWEEN 1 AND 5),
  motivation INTEGER CHECK (motivation BETWEEN 1 AND 5),

  -- Nutrición e hidratación
  hydration TEXT CHECK (hydration IN ('low', 'normal', 'high')) DEFAULT 'normal',
  nutrition_quality INTEGER CHECK (nutrition_quality BETWEEN 1 AND 5),

  -- Notas
  injury_notes TEXT,
  general_notes TEXT,

  -- Readiness
  ready_to_train BOOLEAN DEFAULT true,
  overall_score NUMERIC(4,2) GENERATED ALWAYS AS (
    CASE
      WHEN sleep_quality IS NOT NULL AND fatigue_level IS NOT NULL
           AND motivation IS NOT NULL AND stress_level IS NOT NULL THEN
        ROUND((
          (sleep_quality::NUMERIC * 1.5) +
          ((6 - fatigue_level)::NUMERIC * 1.5) +
          (motivation::NUMERIC * 1.0) +
          ((6 - stress_level)::NUMERIC * 1.0) +
          (COALESCE(6 - muscle_soreness, 3)::NUMERIC * 0.5) +
          (COALESCE(nutrition_quality, 3)::NUMERIC * 0.5)
        ) / 6.0, 2)
      ELSE NULL
    END
  ) STORED,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(athlete_id, checkin_date)
);

ALTER TABLE wellness_checkins ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_wellness_checkins_athlete ON wellness_checkins(athlete_id);
CREATE INDEX IF NOT EXISTS idx_wellness_checkins_date ON wellness_checkins(checkin_date);

CREATE POLICY "Athletes can view own wellness checkins"
  ON wellness_checkins FOR SELECT
  TO authenticated
  USING (auth.uid() = athlete_id);

CREATE POLICY "Athletes can insert own wellness checkins"
  ON wellness_checkins FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Athletes can update own wellness checkins"
  ON wellness_checkins FOR UPDATE
  TO authenticated
  USING (auth.uid() = athlete_id)
  WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Trainers and admins can view wellness checkins"
  ON wellness_checkins FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'role') IN ('admin', 'trainer')
    OR (auth.jwt()->'user_metadata'->>'role') IN ('admin', 'trainer')
  );

-- ============================================================
-- 2. TABLA: ai_training_plans
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ DEFAULT now(),
  model_used TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  session_type TEXT,
  target_date DATE,

  -- Contexto usado para generar
  context_data JSONB DEFAULT '{}',

  -- Plan generado
  plan_data JSONB DEFAULT '{}',

  -- Análisis de progresión
  progression_analysis JSONB DEFAULT '{}',

  -- Notas del estado del atleta al momento de generación
  athlete_readiness_score NUMERIC(4,2),
  athlete_readiness_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ai_training_plans ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ai_training_plans_athlete ON ai_training_plans(athlete_id);
CREATE INDEX IF NOT EXISTS idx_ai_training_plans_date ON ai_training_plans(generated_at);

CREATE POLICY "Athletes can view own ai plans"
  ON ai_training_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = athlete_id);

CREATE POLICY "Athletes can insert own ai plans"
  ON ai_training_plans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Trainers and admins can view ai plans"
  ON ai_training_plans FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'role') IN ('admin', 'trainer')
    OR (auth.jwt()->'user_metadata'->>'role') IN ('admin', 'trainer')
  );

-- ============================================================
-- 3. Agregar openai a api_configurations (si no existe la restricción)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'api_configurations'
      AND constraint_name = 'api_configurations_service_name_check'
  ) THEN
    ALTER TABLE api_configurations
      DROP CONSTRAINT api_configurations_service_name_check;

    ALTER TABLE api_configurations
      ADD CONSTRAINT api_configurations_service_name_check
      CHECK (service_name IN ('brevo', 'stripe', 'zoom', 'openai'));
  END IF;
END $$;
