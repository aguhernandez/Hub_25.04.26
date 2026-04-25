/*
  # Enable Nutrition Satellite Authentication

  1. Verificar que Nutrition está registrada como satélite
  2. Habilitar acceso automático para Athletes a Nutrition
  3. Agregar permisos explícitos si es necesario
  4. Asegurar que CORS está habilitado en las edge functions
*/

-- Verificar que nutrition satélite existe
INSERT INTO satellites (name, display_name, description, url, icon, category, is_active, requires_special_permission)
VALUES ('nutrition', 'Nutrición', 'Planificación nutricional y seguimiento de dietas', 'https://nutrition.asciende.pro', 'Apple', 'nutrition', true, false)
ON CONFLICT (name) DO UPDATE SET 
  is_active = true,
  url = 'https://nutrition.asciende.pro';

-- Garantizar que todos los athletes pueden acceder a nutrition por defecto (sin permiso especial requerido)
-- La lógica de check_satellite_access ya lo maneja por rol, pero nos aseguramos

-- Función auxiliar para dar acceso a nutrition a todos los athletes
CREATE OR REPLACE FUNCTION grant_nutrition_access_to_all_athletes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Otorgar acceso explícito a nutrition para todos los athletes
  INSERT INTO user_satellite_permissions (user_id, satellite_id, enabled, granted_by, granted_at)
  SELECT 
    p.id,
    s.id,
    true,
    (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
    now()
  FROM profiles p
  CROSS JOIN satellites s
  WHERE p.role = 'athlete'
    AND s.name = 'nutrition'
    AND NOT EXISTS (
      SELECT 1 FROM user_satellite_permissions 
      WHERE user_id = p.id AND satellite_id = s.id
    )
  ON CONFLICT (user_id, satellite_id) DO UPDATE SET enabled = true;
END;
$$;

-- Ejecutar la función
SELECT grant_nutrition_access_to_all_athletes();
