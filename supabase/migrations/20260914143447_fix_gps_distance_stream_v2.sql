/*
# Fix distance_stream for asciende_gps activities (v2)

The previous backfill produced incorrect cumulative distances because the
self-join CTE was wrong. This version uses a proper correlated approach:
for each point, sum the haversine distance of all preceding consecutive pairs.
*/

-- Delete existing streams for asciende_gps so we can re-insert with correct data
DELETE FROM activity_streams
WHERE activity_id IN (
  SELECT id FROM external_activities WHERE source = 'asciende_gps'
);

-- Re-insert with correct cumulative distance arrays using a PL/pgSQL function
-- to compute haversine cumulative distances
CREATE OR REPLACE FUNCTION compute_cumulative_distances(activity_uuid uuid)
RETURNS float8[] AS $$
DECLARE
  result float8[];
  pt RECORD;
  prev_lat float8;
  prev_lng float8;
  cum_dist float8 := 0;
  seg_dist float8;
  idx int := 0;
BEGIN
  result := ARRAY[]::float8[];
  FOR pt IN
    SELECT latitude, longitude
    FROM activity_gps_points
    WHERE activity_id = activity_uuid
    ORDER BY sequence_order
  LOOP
    IF idx > 0 THEN
      seg_dist := 6371000 * 2 * ASIN(SQRT(
        POWER(SIN(RADIANS(pt.latitude - prev_lat) / 2), 2) +
        COS(RADIANS(prev_lat)) * COS(RADIANS(pt.latitude)) *
        POWER(SIN(RADIANS(pt.longitude - prev_lng) / 2), 2)
      ));
      cum_dist := cum_dist + seg_dist;
    END IF;
    result := array_append(result, round(cum_dist::numeric, 2)::float8);
    prev_lat := pt.latitude;
    prev_lng := pt.longitude;
    idx := idx + 1;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

INSERT INTO activity_streams (activity_id, user_id, time_stream, altitude_stream, distance_stream, latlng_stream, velocity_smooth_stream, stream_keys, missing_heartrate, missing_power, missing_gps, resolution, series_type, fetched_at)
SELECT
  ea.id,
  ea.user_id,
  ARRAY(
    SELECT EXTRACT(EPOCH FROM (gp.timestamp - a.started_at))::int
    FROM activity_gps_points gp
    WHERE gp.activity_id = a.id
    ORDER BY gp.sequence_order
  ),
  ARRAY(
    SELECT COALESCE(gp.altitude_m, 0)
    FROM activity_gps_points gp
    WHERE gp.activity_id = a.id
    ORDER BY gp.sequence_order
  ),
  compute_cumulative_distances(a.id),
  (
    SELECT jsonb_agg(jsonb_build_array(gp.latitude, gp.longitude) ORDER BY gp.sequence_order)
    FROM activity_gps_points gp
    WHERE gp.activity_id = a.id
  ),
  (
    SELECT ARRAY(
      WITH pts AS (
        SELECT gp.latitude, gp.longitude, gp.timestamp,
               EXTRACT(EPOCH FROM (gp.timestamp - a.started_at))::int AS t,
               ROW_NUMBER() OVER (ORDER BY gp.sequence_order) AS rn
        FROM activity_gps_points gp
        WHERE gp.activity_id = a.id
      )
      SELECT CASE
        WHEN p2.t > p1.t THEN
          (6371000 * 2 * ASIN(SQRT(
            POWER(SIN(RADIANS(p2.latitude - p1.latitude) / 2), 2) +
            COS(RADIANS(p1.latitude)) * COS(RADIANS(p2.latitude)) *
            POWER(SIN(RADIANS(p2.longitude - p1.longitude) / 2), 2)
          ))) / (p2.t - p1.t)
        ELSE 0
      END::float8
      FROM pts p1
      JOIN pts p2 ON p2.rn = p1.rn + 1
    )
  ),
  ARRAY['time', 'altitude', 'distance', 'latlng', 'velocity_smooth']::text[],
  true,
  true,
  false,
  'high',
  'time',
  NOW()
FROM external_activities ea
JOIN activities a ON a.id::text = ea.raw_data->>'activity_id'
WHERE ea.source = 'asciende_gps'
  AND EXISTS (
    SELECT 1 FROM activity_gps_points gp WHERE gp.activity_id = a.id
  );
