/*
# Backfill activity_streams for existing asciende_gps activities

activity_streams.activity_id references external_activities.id (not activities.id).
For asciende_gps activities, external_activities.raw_data->>'activity_id' stores
the activities.id, and external_activities.id is the FK target.
*/

INSERT INTO activity_streams (activity_id, user_id, time_stream, altitude_stream, distance_stream, latlng_stream, velocity_smooth_stream, stream_keys, missing_heartrate, missing_power, missing_gps, resolution, series_type, fetched_at)
SELECT
  ea.id,
  ea.user_id,
  -- time_stream: seconds since start
  ARRAY(
    SELECT EXTRACT(EPOCH FROM (gp.timestamp - a.started_at))::int
    FROM activity_gps_points gp
    WHERE gp.activity_id = a.id
    ORDER BY gp.sequence_order
  ),
  -- altitude_stream
  ARRAY(
    SELECT COALESCE(gp.altitude_m, 0)
    FROM activity_gps_points gp
    WHERE gp.activity_id = a.id
    ORDER BY gp.sequence_order
  ),
  -- distance_stream: cumulative haversine distance in meters
  (
    SELECT ARRAY(
      WITH pts AS (
        SELECT gp.latitude, gp.longitude, gp.sequence_order,
               ROW_NUMBER() OVER (ORDER BY gp.sequence_order) AS rn
        FROM activity_gps_points gp
        WHERE gp.activity_id = a.id
      )
      SELECT COALESCE(SUM(
        6371000 * 2 * ASIN(SQRT(
          POWER(SIN(RADIANS(p2.latitude - p1.latitude) / 2), 2) +
          COS(RADIANS(p1.latitude)) * COS(RADIANS(p2.latitude)) *
          POWER(SIN(RADIANS(p2.longitude - p1.longitude) / 2), 2)
        ))
      ), 0)::float8
      FROM pts p1
      JOIN pts p2 ON p2.rn = p1.rn + 1
    )
  ),
  -- latlng_stream as jsonb array of [lat, lng]
  (
    SELECT jsonb_agg(jsonb_build_array(gp.latitude, gp.longitude) ORDER BY gp.sequence_order)
    FROM activity_gps_points gp
    WHERE gp.activity_id = a.id
  ),
  -- velocity_smooth_stream: m/s between consecutive points
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
  AND NOT EXISTS (
    SELECT 1 FROM activity_streams s WHERE s.activity_id = ea.id
  )
  AND EXISTS (
    SELECT 1 FROM activity_gps_points gp WHERE gp.activity_id = a.id
  );
