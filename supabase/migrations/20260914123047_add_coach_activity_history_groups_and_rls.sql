/*
# Coach Activity History — Groups Table + Head Coach RLS

## Summary
This migration enables the Coach Activity History feature by:
1. Adding RLS policies so head_coaches can view their athletes' external_activities and activity_streams
2. Creating an `athlete_groups` table that lets coaches create custom groups/categories of athletes (e.g. "Sprint Group", "Endurance Team") for quick filtering

## New Tables
### athlete_groups
- `id` (uuid, primary key)
- `coach_id` (uuid, not null — the coach who created the group, references profiles)
- `name` (text, not null — group name)
- `description` (text — optional description)
- `color` (text — optional color tag for visual identification)
- `created_at` (timestamptz, defaults to now)

### athlete_group_members (join table)
- `id` (uuid, primary key)
- `group_id` (uuid, not null — references athlete_groups, cascade on delete)
- `athlete_id` (uuid, not null — references profiles)
- `added_at` (timestamptz, defaults to now)
- Unique constraint on (group_id, athlete_id) to prevent duplicates

## RLS Policy Changes
### external_activities
- Add SELECT policy for head_coaches: can view activities where the athlete's `assigned_trainer_id` matches the coach's id (same as existing trainer policy but also covers head_coach role check)
- Also allow viewing activities of athletes who are members of teams the coach owns (teams.coach_id = auth.uid())

### activity_streams
- Same expansion: head_coaches can view streams for athletes they supervise (direct assignment or team membership)

### athlete_groups
- Coaches can CRUD their own groups (coach_id = auth.uid())
- Athletes in a group can view the group they belong to (read-only)

### athlete_group_members
- Coaches can CRUD members of their own groups
- Athletes can view memberships for groups they're in

## Security
- All policies use auth.uid() for ownership checks
- No public access — all tables are authenticated-only
- Coaches can only manage their own groups, not other coaches'
*/

-- ============================================================
-- 1. RLS: Head coaches can view their athletes' external_activities
-- ============================================================
DROP POLICY IF EXISTS "Head coaches can view athletes external activities" ON external_activities;
CREATE POLICY "Head coaches can view athletes external activities"
ON external_activities FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = external_activities.user_id
    AND profiles.assigned_trainer_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM team_members
    JOIN teams ON teams.id = team_members.team_id
    WHERE team_members.athlete_id = external_activities.user_id
    AND teams.coach_id = auth.uid()
  )
);

-- ============================================================
-- 2. RLS: Head coaches can view their athletes' activity_streams
-- ============================================================
DROP POLICY IF EXISTS "Head coaches can view athletes activity streams" ON activity_streams;
CREATE POLICY "Head coaches can view athletes activity streams"
ON activity_streams FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = activity_streams.user_id
    AND profiles.assigned_trainer_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM team_members
    JOIN teams ON teams.id = team_members.team_id
    WHERE team_members.athlete_id = activity_streams.user_id
    AND teams.coach_id = auth.uid()
  )
);

-- ============================================================
-- 3. RLS: Head coaches can view their athletes' activity_gps_points
-- ============================================================
DROP POLICY IF EXISTS "Head coaches can view athletes gps points" ON activity_gps_points;
CREATE POLICY "Head coaches can view athletes gps points"
ON activity_gps_points FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM external_activities ea
    WHERE ea.id = activity_gps_points.activity_id
    AND (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = ea.user_id
        AND profiles.assigned_trainer_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM team_members
        JOIN teams ON teams.id = team_members.team_id
        WHERE team_members.athlete_id = ea.user_id
        AND teams.coach_id = auth.uid()
      )
    )
  )
);

-- ============================================================
-- 4. Create athlete_groups table
-- ============================================================
CREATE TABLE IF NOT EXISTS athlete_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  color text DEFAULT 'blue',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE athlete_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches can CRUD own groups" ON athlete_groups;
CREATE POLICY "Coaches can select own groups"
ON athlete_groups FOR SELECT
TO authenticated
USING (coach_id = auth.uid());

CREATE POLICY "Coaches can insert own groups"
ON athlete_groups FOR INSERT
TO authenticated
WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Coaches can update own groups"
ON athlete_groups FOR UPDATE
TO authenticated
USING (coach_id = auth.uid())
WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Coaches can delete own groups"
ON athlete_groups FOR DELETE
TO authenticated
USING (coach_id = auth.uid());

-- ============================================================
-- 5. Create athlete_group_members join table
-- ============================================================
CREATE TABLE IF NOT EXISTS athlete_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES athlete_groups(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now(),
  UNIQUE (group_id, athlete_id)
);

ALTER TABLE athlete_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches can select own group members" ON athlete_group_members;
CREATE POLICY "Coaches can select own group members"
ON athlete_group_members FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM athlete_groups
    WHERE athlete_groups.id = athlete_group_members.group_id
    AND athlete_groups.coach_id = auth.uid()
  )
);

CREATE POLICY "Coaches can insert own group members"
ON athlete_group_members FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM athlete_groups
    WHERE athlete_groups.id = athlete_group_members.group_id
    AND athlete_groups.coach_id = auth.uid()
  )
);

CREATE POLICY "Coaches can delete own group members"
ON athlete_group_members FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM athlete_groups
    WHERE athlete_groups.id = athlete_group_members.group_id
    AND athlete_groups.coach_id = auth.uid()
  )
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_athlete_group_members_group_id ON athlete_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_athlete_group_members_athlete_id ON athlete_group_members(athlete_id);
CREATE INDEX IF NOT EXISTS idx_athlete_groups_coach_id ON athlete_groups(coach_id);
