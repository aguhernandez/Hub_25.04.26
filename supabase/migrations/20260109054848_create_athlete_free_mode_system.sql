/*
  # Athlete Free Mode - Sistema de Nutrición Autónoma

  ## Resumen
  Implementa el "Modo Atleta Libre" que permite a los atletas crear y gestionar
  planes nutricionales completos con cálculos automáticos, manteniendo trazabilidad
  completa y control del entrenador.

  ## 1. Cambios en meal_plans
    - `created_by_role`: Rastrea quién creó el plan ('athlete', 'trainer', 'admin')
    - `validated_by_trainer`: Indica si un profesional validó el plan
    - `validated_by_user_id`: ID del profesional que validó
    - `validated_at`: Timestamp de validación
    - `is_from_template`: Indica si se creó desde una plantilla
    - `template_id`: Referencia a la plantilla origen (si aplica)

  ## 2. Nueva tabla: athlete_nutrition_usage
    Rastrea límites de uso para planes Free/Pro:
    - Máximo de planes activos simultáneos
    - Límite de planes nuevos por semana (reset cada lunes)
    - Tracking de uso para monetización futura

  ## 3. Nueva tabla: meal_plan_audit_log
    Registra cambios importantes de estado:
    - created, status_changed, validated, unvalidated, archived
    - NO field-by-field (solo eventos importantes)

  ## 4. Reglas de Negocio
    - Plan activo = status = 'active' únicamente
    - Atleta puede editar plan validado PERO pierde validación automáticamente
    - Atleta NO puede editar planes creados por entrenador (read-only)
    - Límites configurables vía memberships.features (JSONB)
    - Reset semanal cada lunes 00:00

  ## 5. Security
    - RLS actualizado para nuevas reglas de permisos
    - Atleta no puede auto-validar planes
    - Solo trainer/admin pueden setear validated_by_trainer = true
*/

-- =============================================
-- 1. MODIFICAR meal_plans - Agregar flags de trazabilidad
-- =============================================

ALTER TABLE meal_plans
ADD COLUMN IF NOT EXISTS created_by_role TEXT NOT NULL DEFAULT 'athlete'
  CHECK (created_by_role IN ('athlete', 'trainer', 'admin')),
ADD COLUMN IF NOT EXISTS validated_by_trainer BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS validated_by_user_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_from_template BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES menu_templates(id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_meal_plans_created_by_role ON meal_plans(created_by_role);
CREATE INDEX IF NOT EXISTS idx_meal_plans_validated ON meal_plans(validated_by_trainer);
CREATE INDEX IF NOT EXISTS idx_meal_plans_athlete_active ON meal_plans(athlete_id, status)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_meal_plans_template ON meal_plans(template_id)
  WHERE template_id IS NOT NULL;

-- =============================================
-- 2. CREAR tabla athlete_nutrition_usage
-- =============================================

CREATE TABLE IF NOT EXISTS athlete_nutrition_usage (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  active_plans_count INT DEFAULT 0,
  plans_created_this_week INT DEFAULT 0,
  week_start_date DATE NOT NULL,
  last_plan_created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE athlete_nutrition_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies para athlete_nutrition_usage
CREATE POLICY "Users can view own usage"
  ON athlete_nutrition_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage usage"
  ON athlete_nutrition_usage FOR ALL
  TO authenticated
  USING (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('admin', 'trainer')
  );

-- Índice para búsqueda por usuario
CREATE INDEX IF NOT EXISTS idx_athlete_nutrition_usage_user ON athlete_nutrition_usage(user_id);

-- =============================================
-- 3. CREAR tabla meal_plan_audit_log
-- =============================================

CREATE TABLE IF NOT EXISTS meal_plan_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES meal_plans(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'status_changed', 'validated', 'unvalidated', 'archived', 'deleted')),
  old_status TEXT,
  new_status TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE meal_plan_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies para audit log
CREATE POLICY "Trainers and admins can view audit logs"
  ON meal_plan_audit_log FOR SELECT
  TO authenticated
  USING (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('admin', 'trainer')
    OR
    EXISTS (
      SELECT 1 FROM meal_plans mp
      WHERE mp.id = meal_plan_audit_log.plan_id
      AND mp.athlete_id = auth.uid()
    )
  );

CREATE POLICY "System can insert audit logs"
  ON meal_plan_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Índices para audit log
CREATE INDEX IF NOT EXISTS idx_meal_plan_audit_plan ON meal_plan_audit_log(plan_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meal_plan_audit_user ON meal_plan_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meal_plan_audit_action ON meal_plan_audit_log(action, created_at DESC);

-- =============================================
-- 4. FUNCIÓN: Reset contador semanal automático
-- =============================================

CREATE OR REPLACE FUNCTION reset_weekly_nutrition_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_monday DATE;
BEGIN
  -- Calcular el lunes de esta semana
  current_monday := date_trunc('week', CURRENT_DATE)::DATE;

  -- Resetear contadores si cambió la semana
  UPDATE athlete_nutrition_usage
  SET
    plans_created_this_week = 0,
    week_start_date = current_monday,
    updated_at = now()
  WHERE week_start_date < current_monday;
END;
$$;

-- =============================================
-- 5. FUNCIÓN: Auto-invalidar cuando atleta edita
-- =============================================

CREATE OR REPLACE FUNCTION invalidate_validation_on_athlete_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  editing_user_role TEXT;
BEGIN
  -- Obtener rol del usuario que está editando
  SELECT raw_app_meta_data->>'role' INTO editing_user_role
  FROM auth.users
  WHERE id = auth.uid();

  -- Si es atleta y el plan estaba validado, invalidar
  IF editing_user_role = 'athlete' AND OLD.validated_by_trainer = true THEN
    NEW.validated_by_trainer := false;
    NEW.validated_by_user_id := NULL;
    NEW.validated_at := NULL;

    -- Log en audit
    INSERT INTO meal_plan_audit_log (plan_id, user_id, action, metadata)
    VALUES (
      NEW.id,
      auth.uid(),
      'unvalidated',
      jsonb_build_object(
        'reason', 'edited_by_athlete',
        'previous_validator', OLD.validated_by_user_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger para auto-invalidar
DROP TRIGGER IF EXISTS trigger_invalidate_on_edit ON meal_plans;
CREATE TRIGGER trigger_invalidate_on_edit
  BEFORE UPDATE ON meal_plans
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION invalidate_validation_on_athlete_edit();

-- =============================================
-- 6. FUNCIÓN: Audit log automático para cambios de estado
-- =============================================

CREATE OR REPLACE FUNCTION log_meal_plan_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log de creación
  IF TG_OP = 'INSERT' THEN
    INSERT INTO meal_plan_audit_log (plan_id, user_id, action, new_status)
    VALUES (NEW.id, auth.uid(), 'created', NEW.status);
    RETURN NEW;
  END IF;

  -- Log de cambio de estado
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO meal_plan_audit_log (plan_id, user_id, action, old_status, new_status)
    VALUES (NEW.id, auth.uid(), 'status_changed', OLD.status, NEW.status);
  END IF;

  -- Log de validación
  IF TG_OP = 'UPDATE' AND OLD.validated_by_trainer = false AND NEW.validated_by_trainer = true THEN
    INSERT INTO meal_plan_audit_log (plan_id, user_id, action, metadata)
    VALUES (
      NEW.id,
      auth.uid(),
      'validated',
      jsonb_build_object('validator_id', NEW.validated_by_user_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger para audit log automático
DROP TRIGGER IF EXISTS trigger_log_meal_plan_changes ON meal_plans;
CREATE TRIGGER trigger_log_meal_plan_changes
  AFTER INSERT OR UPDATE ON meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION log_meal_plan_changes();

-- =============================================
-- 7. FUNCIÓN: Actualizar contador de planes activos
-- =============================================

CREATE OR REPLACE FUNCTION update_active_plans_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_monday DATE;
  active_count INT;
BEGIN
  current_monday := date_trunc('week', CURRENT_DATE)::DATE;

  -- Calcular planes activos del atleta
  SELECT COUNT(*) INTO active_count
  FROM meal_plans
  WHERE athlete_id = COALESCE(NEW.athlete_id, OLD.athlete_id)
    AND status = 'active';

  -- Crear o actualizar registro de uso
  INSERT INTO athlete_nutrition_usage (
    user_id,
    active_plans_count,
    plans_created_this_week,
    week_start_date,
    updated_at
  ) VALUES (
    COALESCE(NEW.athlete_id, OLD.athlete_id),
    active_count,
    CASE WHEN TG_OP = 'INSERT' THEN 1 ELSE 0 END,
    current_monday,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    active_plans_count = active_count,
    plans_created_this_week = CASE
      WHEN athlete_nutrition_usage.week_start_date < current_monday THEN 1
      WHEN TG_OP = 'INSERT' THEN athlete_nutrition_usage.plans_created_this_week + 1
      ELSE athlete_nutrition_usage.plans_created_this_week
    END,
    week_start_date = CASE
      WHEN athlete_nutrition_usage.week_start_date < current_monday THEN current_monday
      ELSE athlete_nutrition_usage.week_start_date
    END,
    last_plan_created_at = CASE WHEN TG_OP = 'INSERT' THEN now() ELSE athlete_nutrition_usage.last_plan_created_at END,
    updated_at = now();

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger para actualizar contador
DROP TRIGGER IF EXISTS trigger_update_active_plans_count ON meal_plans;
CREATE TRIGGER trigger_update_active_plans_count
  AFTER INSERT OR UPDATE OR DELETE ON meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_active_plans_count();

-- =============================================
-- 8. ACTUALIZAR RLS policies de meal_plans
-- =============================================

-- Drop existing policies que puedan entrar en conflicto
DROP POLICY IF EXISTS "Athletes can update own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can update own plans" ON meal_plans;

-- Nueva policy: Atleta solo edita planes que él creó
CREATE POLICY "Athletes can only edit their own created plans"
  ON meal_plans FOR UPDATE
  TO authenticated
  USING (
    athlete_id = auth.uid()
    AND created_by_role = 'athlete'
  )
  WITH CHECK (
    athlete_id = auth.uid()
    AND created_by_role = 'athlete'
    AND validated_by_trainer = false
  );

-- Nueva policy: Trainer puede editar todos los planes de sus atletas
CREATE POLICY "Trainers can edit all assigned athlete plans"
  ON meal_plans FOR UPDATE
  TO authenticated
  USING (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('trainer', 'admin')
  );

-- Nueva policy: Solo trainer/admin puede validar
CREATE POLICY "Only trainers can validate plans"
  ON meal_plans FOR UPDATE
  TO authenticated
  USING (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('trainer', 'admin')
  )
  WITH CHECK (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('trainer', 'admin')
    OR validated_by_trainer = false
  );

-- =============================================
-- 9. FUNCIÓN HELPER: Verificar límites del atleta
-- =============================================

CREATE OR REPLACE FUNCTION check_athlete_meal_plan_limits(
  p_athlete_id UUID,
  p_membership_id UUID DEFAULT NULL
)
RETURNS TABLE (
  can_create_plan BOOLEAN,
  active_plans_count INT,
  max_active_plans INT,
  plans_created_this_week INT,
  max_plans_per_week INT,
  limit_reached_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_usage RECORD;
  v_features JSONB;
  v_max_active INT := 3;
  v_max_weekly INT := 1;
BEGIN
  -- Obtener límites de membership
  IF p_membership_id IS NOT NULL THEN
    SELECT m.features INTO v_features
    FROM memberships m
    JOIN user_memberships um ON um.membership_id = m.id
    WHERE um.user_id = p_athlete_id
      AND um.status = 'active'
    LIMIT 1;

    IF v_features IS NOT NULL THEN
      v_max_active := COALESCE((v_features->>'nutrition_max_active_plans')::INT, 3);
      v_max_weekly := COALESCE((v_features->>'nutrition_plans_per_week')::INT, 1);
    END IF;
  END IF;

  -- Obtener uso actual
  SELECT * INTO v_usage
  FROM athlete_nutrition_usage
  WHERE user_id = p_athlete_id;

  -- Si no existe registro, crear uno
  IF v_usage IS NULL THEN
    v_usage.active_plans_count := 0;
    v_usage.plans_created_this_week := 0;
  END IF;

  -- Verificar límites
  RETURN QUERY SELECT
    (v_usage.active_plans_count < v_max_active AND v_usage.plans_created_this_week < v_max_weekly) AS can_create_plan,
    v_usage.active_plans_count AS active_plans_count,
    v_max_active AS max_active_plans,
    v_usage.plans_created_this_week AS plans_created_this_week,
    v_max_weekly AS max_plans_per_week,
    CASE
      WHEN v_usage.active_plans_count >= v_max_active THEN 'max_active_reached'
      WHEN v_usage.plans_created_this_week >= v_max_weekly THEN 'weekly_limit_reached'
      ELSE NULL
    END AS limit_reached_reason;
END;
$$;

-- =============================================
-- 10. ACTUALIZAR memberships con límites por defecto
-- =============================================

DO $$
BEGIN
  UPDATE memberships
  SET features = COALESCE(features, '{}'::jsonb) ||
    '{"nutrition_max_active_plans": 3, "nutrition_plans_per_week": 1}'::jsonb
  WHERE NOT (features ? 'nutrition_max_active_plans');
END $$;

-- =============================================
-- 11. COMENTARIOS finales
-- =============================================

COMMENT ON COLUMN meal_plans.created_by_role IS 'Rol de quien creó el plan: athlete, trainer, admin';
COMMENT ON COLUMN meal_plans.validated_by_trainer IS 'Indica si el plan fue validado por un profesional';
COMMENT ON COLUMN meal_plans.validated_by_user_id IS 'ID del profesional que validó el plan';
COMMENT ON COLUMN meal_plans.validated_at IS 'Timestamp de cuando se validó el plan';
COMMENT ON COLUMN meal_plans.is_from_template IS 'Indica si el plan fue creado desde una plantilla';
COMMENT ON COLUMN meal_plans.template_id IS 'ID de la plantilla desde la que se creó (si aplica)';

COMMENT ON TABLE athlete_nutrition_usage IS 'Rastrea uso de límites nutricionales por atleta (planes activos, límite semanal)';
COMMENT ON TABLE meal_plan_audit_log IS 'Log de eventos importantes en planes nutricionales (no field-by-field)';

COMMENT ON FUNCTION check_athlete_meal_plan_limits IS 'Verifica si un atleta puede crear un nuevo plan según sus límites de membership';
