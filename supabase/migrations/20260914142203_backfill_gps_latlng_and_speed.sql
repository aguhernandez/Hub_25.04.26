/*
# Backfill average_speed_mps and start/end latlng for existing asciende_gps activities
*/

-- Backfill average_speed_mps
UPDATE external_activities ea
SET average_speed_mps = CASE
  WHEN ea.duration_seconds > 0 THEN ea.distance_meters / ea.duration_seconds
  ELSE 0
END
WHERE ea.source = 'asciende_gps'
  AND (ea.average_speed_mps IS NULL OR ea.average_speed_mps = 0)
  AND ea.duration_seconds > 0;

-- Backfill start_latlng and end_latlng from GPS points (numeric[] arrays)
UPDATE external_activities ea
SET
  start_latlng = sub.start_coords,
  end_latlng = sub.end_coords
FROM (
  SELECT
    gp.activity_id,
    ARRAY[
      (SELECT latitude FROM activity_gps_points WHERE activity_id = gp.activity_id ORDER BY sequence_order LIMIT 1),
      (SELECT longitude FROM activity_gps_points WHERE activity_id = gp.activity_id ORDER BY sequence_order LIMIT 1)
    ]::numeric[] AS start_coords,
    ARRAY[
      (SELECT latitude FROM activity_gps_points WHERE activity_id = gp.activity_id ORDER BY sequence_order DESC LIMIT 1),
      (SELECT longitude FROM activity_gps_points WHERE activity_id = gp.activity_id ORDER BY sequence_order DESC LIMIT 1)
    ]::numeric[] AS end_coords
  FROM activity_gps_points gp
  GROUP BY gp.activity_id
) sub
WHERE ea.source = 'asciende_gps'
  AND ea.raw_data->>'activity_id' = sub.activity_id::text
  AND (ea.start_latlng IS NULL OR ea.end_latlng IS NULL);
