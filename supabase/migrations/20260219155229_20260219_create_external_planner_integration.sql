/*
  # Integración con Planners Externos (Nutrition Planner / Endurance Planner)

  Este módulo permite que aplicaciones externas (Nutrition Planner, Endurance Planner)
  se conecten a este Hub para intercambiar datos bidireccionales.

  ## Concepto
  - El Hub es la fuente de verdad central.
  - Los planners externos leen del Hub y escriben sus resultados de vuelta.
  - Cada planner se autentica con un API key registrado en external_planner_tokens.

  ## Nuevas Tablas

  1. external_planner_tokens
     - Tokens de autenticación para cada planner externo registrado.
     - El admin del Hub genera un token para cada planner.

  2. external_nutrition_plans
     - Planes nutricionales enviados por el Nutrition Planner al Hub.
     - Se muestran en el perfil del atleta dentro del Hub.

  3. external_endurance_plans
     - Planes de endurance enviados por el Endurance Planner al Hub.

  4. external_planner_access_log
     - Auditoría de accesos de planners externos.

  ## Seguridad
  - RLS habilitado en todas las tablas
  - Solo admin puede gestionar tokens
  - Los atletas y trainers solo leen sus propios datos
*/

-- ============================================================
-- 1. TOKENS DE ACCESO PARA PLANNERS EXTERNOS
-- ============================================================
CREATE TABLE IF NOT EXISTS external_planner_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planner_name TEXT NOT NULL,
  planner_type TEXT NOT NULL CHECK (planner_type IN ('nutrition', 'endurance', 'strength', 'other')),
  token_hash TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE external_planner_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view planner tokens"
  ON external_planner_tokens FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
    OR (auth.jwt()->'user_metadata'->>'role') = 'admin'
  );

CREATE POLICY "Admin can insert planner tokens"
  ON external_planner_tokens FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
    OR (auth.jwt()->'user_metadata'->>'role') = 'admin'
  );

CREATE POLICY "Admin can update planner tokens"
  ON external_planner_tokens FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
    OR (auth.jwt()->'user_metadata'->>'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
    OR (auth.jwt()->'user_metadata'->>'role') = 'admin'
  );

-- ============================================================
-- 2. PLANES NUTRICIONALES RECIBIDOS DE NUTRITION PLANNER
-- ============================================================
CREATE TABLE IF NOT EXISTS external_nutrition_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES profiles(id),
  planner_source TEXT NOT NULL DEFAULT 'nutrition_planner',
  plan_name TEXT,
  plan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  summary JSONB DEFAULT '{}',
  plan_data JSONB DEFAULT '{}',
  adherence_data JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(athlete_id, plan_date, planner_source)
);

ALTER TABLE external_nutrition_plans ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ext_nutrition_plans_athlete ON external_nutrition_plans(athlete_id);
CREATE INDEX IF NOT EXISTS idx_ext_nutrition_plans_date ON external_nutrition_plans(plan_date);

CREATE POLICY "Athletes can view own external nutrition plans"
  ON external_nutrition_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = athlete_id);

CREATE POLICY "Trainers and admins can view external nutrition plans"
  ON external_nutrition_plans FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'role') IN ('admin', 'trainer')
    OR (auth.jwt()->'user_metadata'->>'role') IN ('admin', 'trainer')
  );

-- ============================================================
-- 3. DATOS DE ENDURANCE RECIBIDOS DE ENDURANCE PLANNER
-- ============================================================
CREATE TABLE IF NOT EXISTS external_endurance_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES profiles(id),
  planner_source TEXT NOT NULL DEFAULT 'endurance_planner',
  plan_name TEXT,
  week_start_date DATE NOT NULL,
  summary JSONB DEFAULT '{}',
  plan_data JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(athlete_id, week_start_date, planner_source)
);

ALTER TABLE external_endurance_plans ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ext_endurance_plans_athlete ON external_endurance_plans(athlete_id);
CREATE INDEX IF NOT EXISTS idx_ext_endurance_plans_week ON external_endurance_plans(week_start_date);

CREATE POLICY "Athletes can view own external endurance plans"
  ON external_endurance_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = athlete_id);

CREATE POLICY "Trainers and admins can view external endurance plans"
  ON external_endurance_plans FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'role') IN ('admin', 'trainer')
    OR (auth.jwt()->'user_metadata'->>'role') IN ('admin', 'trainer')
  );

-- ============================================================
-- 4. LOG DE ACCESOS DE PLANNERS EXTERNOS
-- ============================================================
CREATE TABLE IF NOT EXISTS external_planner_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planner_token_id UUID REFERENCES external_planner_tokens(id),
  athlete_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  endpoint TEXT,
  status_code INTEGER,
  accessed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE external_planner_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view access log"
  ON external_planner_access_log FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
    OR (auth.jwt()->'user_metadata'->>'role') = 'admin'
  );
