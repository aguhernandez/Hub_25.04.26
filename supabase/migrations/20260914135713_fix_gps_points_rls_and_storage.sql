/*
# Fix GPS points RLS policy and add polyline/latlng storage

## Problem
When a user records a GPS activity with the app's built-in GPS and later reopens it,
the map shows a straight line between start and end instead of the actual route.
The GPS points ARE saved correctly (thousands per activity), but two issues prevent
them from being displayed:

1. **RLS policy bug**: The "Head coaches can view athletes gps points" policy joins
   `external_activities.id = activity_gps_points.activity_id`, but these are DIFFERENT
   UUIDs from different tables. `external_activities.id` is the external_activities UUID,
   while `activity_gps_points.activity_id` references the `activities` table UUID
   (stored in `external_activities.raw_data->>'activity_id'`). The join never matches,
   so coaches see zero GPS points.

2. **No polyline fallback**: The `external_activities` table has `map_polyline`,
   `start_latlng`, and `end_latlng` columns, but the save-activity edge function never
   populates them for GPS activities. When GPS points can't be loaded (e.g. RLS blocks
   a coach), the map has no fallback data.

## Changes

### RLS Policy Fix
- Drop and recreate the "Head coaches can view athletes gps points" SELECT policy on
  `activity_gps_points` to join through `external_activities.raw_data->>'activity_id'`
  instead of `external_activities.id`.
- Drop and recreate the "trainers_view_athlete_gps_points" SELECT policy similarly
  to also handle the external_activities path correctly.

### No data changes
- No columns added, no data modified, no tables dropped.
*/

-- Fix 1: Head coaches policy - join through raw_data->>'activity_id' instead of ea.id
DROP POLICY IF EXISTS "Head coaches can view athletes gps points" ON activity_gps_points;
CREATE POLICY "Head coaches can view athletes gps points"
ON activity_gps_points FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM external_activities ea
    WHERE (ea.raw_data->>'activity_id') = activity_gps_points.activity_id::text
    AND (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = ea.user_id
        AND profiles.assigned_trainer_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM team_members tm
        JOIN teams t ON t.id = tm.team_id
        WHERE tm.athlete_id = ea.user_id
        AND t.coach_id = auth.uid()
      )
    )
  )
);

-- Fix 2: Trainers policy - also check the external_activities path for asciende_gps activities
DROP POLICY IF EXISTS "trainers_view_athlete_gps_points" ON activity_gps_points;
CREATE POLICY "trainers_view_athlete_gps_points"
ON activity_gps_points FOR SELECT
TO authenticated
USING (
  -- Path 1: activity_gps_points.activity_id references activities table
  EXISTS (
    SELECT 1
    FROM activities a
    WHERE a.id = activity_gps_points.activity_id
    AND (
      SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid()
    ) IN ('admin', 'trainer', 'head_coach', 'nutritionist')
    AND EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.athlete_id = a.user_id AND t.coach_id = auth.uid()
    )
  )
  OR
  -- Path 2: activity_gps_points.activity_id references activities table via external_activities
  EXISTS (
    SELECT 1
    FROM external_activities ea
    WHERE (ea.raw_data->>'activity_id') = activity_gps_points.activity_id::text
    AND (
      SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid()
    ) IN ('admin', 'trainer', 'head_coach', 'nutritionist')
    AND EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.athlete_id = ea.user_id AND t.coach_id = auth.uid()
    )
  )
  OR
  -- Path 3: nutritionist supervision via assigned_nutritionist_id
  EXISTS (
    SELECT 1
    FROM external_activities ea
    WHERE (ea.raw_data->>'activity_id') = activity_gps_points.activity_id::text
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = ea.user_id
      AND p.assigned_nutritionist_id = auth.uid()
    )
  )
);
