/*
  # Dar acceso al satélite LAB

  1. Cambios
    - Otorgar acceso al satélite LAB a todos los usuarios existentes
    - Los admin siempre tienen acceso por defecto
    - Los trainers y athletes recibirán permiso explícito para LAB
  
  2. Seguridad
    - Se usa la tabla user_satellite_permissions para control granular
    - Los permisos son otorgados por el sistema (granted_by NULL)
*/

-- Dar acceso al satélite LAB a todos los usuarios existentes
-- (excepto admin que ya tiene acceso automático)
DO $$
DECLARE
  lab_satellite_id UUID;
BEGIN
  -- Obtener el ID del satélite LAB
  SELECT id INTO lab_satellite_id
  FROM satellites
  WHERE name = 'lab';

  -- Si el satélite LAB existe, dar permisos
  IF lab_satellite_id IS NOT NULL THEN
    -- Dar acceso a todos los usuarios que NO sean admin
    -- (admin ya tiene acceso automático por su rol)
    INSERT INTO user_satellite_permissions (user_id, satellite_id, enabled, granted_at, notes)
    SELECT 
      p.id,
      lab_satellite_id,
      true,
      now(),
      'Acceso inicial al satélite LAB - otorgado automáticamente'
    FROM profiles p
    WHERE p.role != 'admin'
      AND NOT EXISTS (
        SELECT 1 
        FROM user_satellite_permissions usp 
        WHERE usp.user_id = p.id 
          AND usp.satellite_id = lab_satellite_id
      )
    ON CONFLICT (user_id, satellite_id) 
    DO UPDATE SET 
      enabled = true,
      updated_at = now();

    RAISE NOTICE 'Permisos de LAB otorgados a usuarios existentes';
  END IF;
END $$;
