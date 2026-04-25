/*
  # Sistema de Gestión de Satélites

  1. Nuevas Tablas
    - `satellites`
      - Catálogo de satélites disponibles (Cycling, Lab, Nutrition, etc.)
      - Configuración global de cada satélite
    
    - `user_satellite_permissions`
      - Control de acceso: qué usuarios pueden acceder a qué satélites
      - Basado en roles y asignaciones específicas
      - Campos: user_id, satellite_id, enabled, granted_by, granted_at
    
    - `user_satellite_access_log`
      - Tracking de accesos: registro de cada acceso a satélites
      - Analytics y auditoría
      - Campos: user_id, satellite_id, access_at, ip_address, user_agent

  2. Seguridad
    - RLS habilitado en todas las tablas
    - Políticas para admin, trainers, nutritionists, athletes
    - Validación de permisos antes de acceso a satélite

  3. Lógica de Permisos
    - Admin: acceso completo a todos los satélites
    - Trainer: acceso a satélites de entrenamiento (cycling, running, etc.)
    - Nutritionist: acceso solo a satélite nutrition
    - Athlete: acceso a satélites donde tiene planes asignados
*/

-- ====================
-- 1. TABLA: satellites
-- ====================
CREATE TABLE IF NOT EXISTS satellites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL, -- 'cycling', 'lab', 'nutrition', 'running'
  display_name TEXT NOT NULL, -- 'Ciclismo', 'Laboratorio', 'Nutrición'
  description TEXT,
  url TEXT NOT NULL, -- URL del satélite
  icon TEXT, -- Nombre del ícono de lucide-react
  category TEXT NOT NULL, -- 'training', 'nutrition', 'medical', 'analysis'
  is_active BOOLEAN DEFAULT true,
  requires_special_permission BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE satellites ENABLE ROW LEVEL SECURITY;

-- Políticas para satellites: todos pueden leer satélites activos
CREATE POLICY "Anyone can view active satellites"
  ON satellites FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admin can manage satellites"
  ON satellites FOR ALL
  TO authenticated
  USING ((auth.jwt()->>'user_metadata')::jsonb->>'role' = 'admin')
  WITH CHECK ((auth.jwt()->>'user_metadata')::jsonb->>'role' = 'admin');

-- ====================
-- 2. TABLA: user_satellite_permissions
-- ====================
CREATE TABLE IF NOT EXISTS user_satellite_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  satellite_id UUID NOT NULL REFERENCES satellites(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  granted_by UUID REFERENCES profiles(id), -- Quién otorgó el permiso
  granted_at TIMESTAMPTZ DEFAULT now(),
  disabled_at TIMESTAMPTZ,
  disabled_by UUID REFERENCES profiles(id),
  notes TEXT, -- Notas sobre el permiso
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, satellite_id)
);

ALTER TABLE user_satellite_permissions ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden ver sus propios permisos
CREATE POLICY "Users can view own satellite permissions"
  ON user_satellite_permissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admin y trainers pueden ver permisos de sus atletas
CREATE POLICY "Admin can view all satellite permissions"
  ON user_satellite_permissions FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'user_metadata')::jsonb->>'role' = 'admin');

CREATE POLICY "Trainers can view athlete satellite permissions"
  ON user_satellite_permissions FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'user_metadata')::jsonb->>'role' = 'trainer'
    AND user_id IN (
      SELECT athlete_id FROM athlete_workouts WHERE trainer_id = auth.uid()
    )
  );

-- Admin puede gestionar todos los permisos
CREATE POLICY "Admin can manage all satellite permissions"
  ON user_satellite_permissions FOR ALL
  TO authenticated
  USING ((auth.jwt()->>'user_metadata')::jsonb->>'role' = 'admin')
  WITH CHECK ((auth.jwt()->>'user_metadata')::jsonb->>'role' = 'admin');

-- Trainers pueden otorgar permisos a sus atletas
CREATE POLICY "Trainers can grant permissions to athletes"
  ON user_satellite_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'user_metadata')::jsonb->>'role' = 'trainer'
    AND granted_by = auth.uid()
    AND user_id IN (
      SELECT athlete_id FROM athlete_workouts WHERE trainer_id = auth.uid()
    )
  );

-- ====================
-- 3. TABLA: user_satellite_access_log
-- ====================
CREATE TABLE IF NOT EXISTS user_satellite_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  satellite_id UUID NOT NULL REFERENCES satellites(id) ON DELETE CASCADE,
  access_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  session_duration INTEGER, -- Duración en segundos (si aplicable)
  actions_performed INTEGER DEFAULT 0, -- Contador de acciones realizadas
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_satellite_access_user ON user_satellite_access_log(user_id, access_at DESC);
CREATE INDEX IF NOT EXISTS idx_satellite_access_satellite ON user_satellite_access_log(satellite_id, access_at DESC);

ALTER TABLE user_satellite_access_log ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden ver su propio historial
CREATE POLICY "Users can view own access log"
  ON user_satellite_access_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admin puede ver todo el log
CREATE POLICY "Admin can view all access logs"
  ON user_satellite_access_log FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'user_metadata')::jsonb->>'role' = 'admin');

-- Todos pueden insertar su propio acceso (lo hace el edge function)
CREATE POLICY "Users can log own access"
  ON user_satellite_access_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ====================
-- 4. DATOS INICIALES: Satélites
-- ====================
INSERT INTO satellites (name, display_name, description, url, icon, category, requires_special_permission) VALUES
  ('cycling', 'Ciclismo', 'Planificación y análisis de entrenamientos de ciclismo', 'https://cycling.asciende.pro', 'Bike', 'training', false),
  ('lab', 'Laboratorio', 'Análisis de resultados de laboratorio y métricas metabólicas', 'https://lab.asciende.pro', 'FlaskConical', 'medical', true),
  ('nutrition', 'Nutrición', 'Planificación nutricional y seguimiento de dietas', 'https://nutrition.asciende.pro', 'Apple', 'nutrition', false),
  ('running', 'Running', 'Entrenamiento de carrera y análisis de rendimiento', 'https://running.asciende.pro', 'Footprints', 'training', false)
ON CONFLICT (name) DO NOTHING;

-- ====================
-- 5. FUNCIÓN: Validar acceso a satélite
-- ====================
CREATE OR REPLACE FUNCTION check_satellite_access(
  p_user_id UUID,
  p_satellite_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_satellite_id UUID;
  v_user_role TEXT;
  v_satellite_category TEXT;
  v_has_permission BOOLEAN;
BEGIN
  -- Obtener ID del satélite y su categoría
  SELECT id, category INTO v_satellite_id, v_satellite_category
  FROM satellites
  WHERE name = p_satellite_name AND is_active = true;
  
  IF v_satellite_id IS NULL THEN
    RETURN false; -- Satélite no existe o está inactivo
  END IF;
  
  -- Obtener rol del usuario
  SELECT role INTO v_user_role
  FROM profiles
  WHERE id = p_user_id;
  
  -- Admin tiene acceso a todo
  IF v_user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Verificar permisos explícitos
  SELECT enabled INTO v_has_permission
  FROM user_satellite_permissions
  WHERE user_id = p_user_id 
    AND satellite_id = v_satellite_id;
  
  -- Si existe permiso explícito, respetar ese valor
  IF v_has_permission IS NOT NULL THEN
    RETURN v_has_permission;
  END IF;
  
  -- Permisos por defecto basados en rol
  CASE v_user_role
    WHEN 'trainer' THEN
      -- Trainers tienen acceso a satélites de entrenamiento
      RETURN v_satellite_category = 'training';
    
    WHEN 'nutritionist' THEN
      -- Nutritionists solo acceso a nutrición
      RETURN v_satellite_category = 'nutrition';
    
    WHEN 'athlete' THEN
      -- Athletes tienen acceso a todos excepto los que requieren permiso especial
      SELECT NOT requires_special_permission INTO v_has_permission
      FROM satellites
      WHERE id = v_satellite_id;
      RETURN COALESCE(v_has_permission, false);
    
    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- ====================
-- 6. FUNCIÓN: Registrar acceso a satélite
-- ====================
CREATE OR REPLACE FUNCTION log_satellite_access(
  p_user_id UUID,
  p_satellite_name TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_satellite_id UUID;
  v_log_id UUID;
BEGIN
  -- Obtener ID del satélite
  SELECT id INTO v_satellite_id
  FROM satellites
  WHERE name = p_satellite_name AND is_active = true;
  
  IF v_satellite_id IS NULL THEN
    RAISE EXCEPTION 'Satellite not found or inactive: %', p_satellite_name;
  END IF;
  
  -- Insertar log de acceso
  INSERT INTO user_satellite_access_log (
    user_id,
    satellite_id,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    v_satellite_id,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- ====================
-- 7. VISTA: Resumen de accesos por usuario
-- ====================
CREATE OR REPLACE VIEW user_satellite_summary AS
SELECT
  u.id AS user_id,
  u.full_name,
  u.email,
  u.role,
  s.name AS satellite_name,
  s.display_name AS satellite_display_name,
  s.category AS satellite_category,
  p.enabled AS has_explicit_permission,
  COUNT(l.id) AS total_accesses,
  MAX(l.access_at) AS last_access_at,
  MIN(l.access_at) AS first_access_at
FROM profiles u
CROSS JOIN satellites s
LEFT JOIN user_satellite_permissions p ON p.user_id = u.id AND p.satellite_id = s.id
LEFT JOIN user_satellite_access_log l ON l.user_id = u.id AND l.satellite_id = s.id
WHERE s.is_active = true
GROUP BY u.id, u.full_name, u.email, u.role, s.id, s.name, s.display_name, s.category, p.enabled;

-- ====================
-- 8. ÍNDICES para performance
-- ====================
CREATE INDEX IF NOT EXISTS idx_user_satellite_permissions_user ON user_satellite_permissions(user_id, enabled);
CREATE INDEX IF NOT EXISTS idx_user_satellite_permissions_satellite ON user_satellite_permissions(satellite_id, enabled);
