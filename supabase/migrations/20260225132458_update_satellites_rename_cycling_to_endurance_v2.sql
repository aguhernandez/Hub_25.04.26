/*
  # Actualización del Sistema de Satélites

  1. Cambios
    - Renombrar satélite 'cycling' a 'endurance' con URL endurance.asciende.pro
    - Agregar columna is_development a satellites
    - Agregar satélites en desarrollo: nutrition, running, strength, anthropometry
    - Reconstruir la vista user_satellite_summary con nueva columna
*/

-- Agregar columna is_development a satellites si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'satellites' AND column_name = 'is_development'
  ) THEN
    ALTER TABLE satellites ADD COLUMN is_development BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Renombrar cycling a endurance y actualizar su URL
UPDATE satellites
SET
  name = 'endurance',
  display_name = 'Endurance',
  description = 'Planificación y análisis de entrenamientos de endurance (ciclismo, triatlón, running estructurado)',
  url = 'https://endurance.asciende.pro',
  icon = 'Activity',
  is_development = false
WHERE name = 'cycling';

-- Si no existía cycling, insertar endurance directamente
INSERT INTO satellites (name, display_name, description, url, icon, category, requires_special_permission, is_development)
VALUES (
  'endurance',
  'Endurance',
  'Planificación y análisis de entrenamientos de endurance',
  'https://endurance.asciende.pro',
  'Activity',
  'training',
  false,
  false
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  url = EXCLUDED.url,
  icon = EXCLUDED.icon,
  is_development = EXCLUDED.is_development;

-- Asegurar que lab esté correctamente configurado
UPDATE satellites
SET
  is_development = false,
  url = 'https://lab.asciende.pro'
WHERE name = 'lab';

-- Upsert satélites en desarrollo
INSERT INTO satellites (name, display_name, description, url, icon, category, requires_special_permission, is_development)
VALUES
  ('nutrition', 'Nutrición', 'Planificación nutricional y seguimiento de dietas', 'https://nutrition.asciende.pro', 'Apple', 'nutrition', false, true),
  ('running', 'Running', 'Entrenamiento de carrera y análisis de rendimiento', 'https://running.asciende.pro', 'Footprints', 'training', false, true),
  ('strength', 'Fuerza', 'Planificación de entrenamiento de fuerza y musculación', 'https://strength.asciende.pro', 'Dumbbell', 'training', false, true),
  ('anthropometry', 'Antropometría', 'Evaluación antropométrica y composición corporal', 'https://anthropometry.asciende.pro', 'Ruler', 'analysis', true, true)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  url = EXCLUDED.url,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  is_development = EXCLUDED.is_development;

-- Reconstruir vista con la nueva columna is_development
DROP VIEW IF EXISTS user_satellite_summary;

CREATE VIEW user_satellite_summary AS
SELECT
  u.id AS user_id,
  u.full_name,
  u.email,
  u.role,
  s.name AS satellite_name,
  s.display_name AS satellite_display_name,
  s.category AS satellite_category,
  s.is_development AS satellite_is_development,
  p.enabled AS has_explicit_permission,
  COUNT(l.id) AS total_accesses,
  MAX(l.access_at) AS last_access_at,
  MIN(l.access_at) AS first_access_at
FROM profiles u
CROSS JOIN satellites s
LEFT JOIN user_satellite_permissions p ON p.user_id = u.id AND p.satellite_id = s.id
LEFT JOIN user_satellite_access_log l ON l.user_id = u.id AND l.satellite_id = s.id
WHERE s.is_active = true
GROUP BY u.id, u.full_name, u.email, u.role, s.id, s.name, s.display_name, s.category, s.is_development, p.enabled;
