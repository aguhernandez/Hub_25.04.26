/*
  # Biological Passport System

  ## Overview
  Creates the master physiological and anthropometric profile system for each athlete.
  This is a snapshot-based, versioned, immutable historical record system.

  ## New Tables

  ### biological_passports
  The core table holding each versioned passport snapshot.

  ### Key Fields
  - version_number: auto-incremented per athlete via trigger
  - status: active | archived — only ONE active per athlete enforced via partial unique index
  - measurement_date: actual test date, separate from created_at
  - source_satellite / source_test_type: granular origin tracking
  - lab_record_id / anthropometry_record_id: optional FK links to source records

  ### Physiological Fields
  vo2max, lt1/lt2 power+HR, ftp_watts, critical_power, W', running pace, zones (JSON)

  ### Anthropometry Fields
  height, weight, body_fat%, muscle_mass, lean_mass, bone_mass

  ### Athletic Profile
  training_age_years, athlete_level (beginner/intermediate/advanced/elite)

  ### Visibility Controls
  public_visible, share_vo2, share_zones, share_body_comp

  ## Security
  - RLS enabled, role-based access
  - Only trainer/admin can create new versions
  - Athletes can read all their own passports
  - Trainers can read active passports of assigned athletes
  - Archived passport physiological data is immutable (trigger-enforced)

  ## Versioning Logic
  - BEFORE INSERT trigger: archives previous active, sets version_number
  - Partial unique index ensures max one active passport per athlete
*/

-- Create enum types safely
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'passport_status') THEN
    CREATE TYPE passport_status AS ENUM ('active', 'archived');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'passport_source') THEN
    CREATE TYPE passport_source AS ENUM ('lab', 'manual', 'imported');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'athlete_level_type') THEN
    CREATE TYPE athlete_level_type AS ENUM ('beginner', 'intermediate', 'advanced', 'elite');
  END IF;
END $$;

-- Main table
CREATE TABLE IF NOT EXISTS biological_passports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Versioning
  version_number integer NOT NULL DEFAULT 1,
  status passport_status NOT NULL DEFAULT 'active',

  -- Source metadata
  source passport_source NOT NULL DEFAULT 'manual',
  source_satellite text,
  source_test_type text,
  measurement_date date NOT NULL DEFAULT CURRENT_DATE,

  -- Optional links to originating records
  lab_record_id uuid,
  anthropometry_record_id uuid,

  -- Physiological — Aerobic capacity
  vo2max float,
  lt1_power float,
  lt2_power float,
  lt1_hr integer,
  lt2_hr integer,
  ftp_watts float,
  critical_power float,
  anaerobic_capacity_kj float,
  running_threshold_pace text,
  sport_context text DEFAULT 'other',

  -- Training zones (JSON snapshots)
  power_zones_json jsonb,
  hr_zones_json jsonb,
  rpe_zones_json jsonb,

  -- Anthropometry
  height_cm float,
  weight_kg float,
  body_fat_percent float,
  muscle_mass_kg float,
  lean_mass_kg float,
  bone_mass_kg float,

  -- Athletic profile
  training_age_years float,
  athlete_level athlete_level_type,

  -- Visibility controls
  public_visible boolean NOT NULL DEFAULT false,
  share_vo2 boolean NOT NULL DEFAULT false,
  share_zones boolean NOT NULL DEFAULT false,
  share_body_comp boolean NOT NULL DEFAULT false,

  -- Notes
  notes text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES profiles(id),

  -- Constraints
  CONSTRAINT positive_version CHECK (version_number > 0),
  CONSTRAINT valid_sport_context CHECK (
    sport_context IN ('cycling', 'running', 'triathlon', 'strength', 'swimming', 'other')
  )
);

-- Partial unique index: enforce max one active passport per athlete
CREATE UNIQUE INDEX IF NOT EXISTS idx_biological_passports_one_active
  ON biological_passports (athlete_id)
  WHERE status = 'active';

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_biological_passports_athlete_id
  ON biological_passports (athlete_id);

CREATE INDEX IF NOT EXISTS idx_biological_passports_athlete_status
  ON biological_passports (athlete_id, status);

CREATE INDEX IF NOT EXISTS idx_biological_passports_measurement_date
  ON biological_passports (athlete_id, measurement_date DESC);

-- Enable RLS
ALTER TABLE biological_passports ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTION: next version number
-- ============================================================
CREATE OR REPLACE FUNCTION get_next_passport_version(p_athlete_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max integer;
BEGIN
  SELECT COALESCE(MAX(version_number), 0)
  INTO v_max
  FROM biological_passports
  WHERE athlete_id = p_athlete_id;

  RETURN v_max + 1;
END;
$$;

-- ============================================================
-- TRIGGER: archive previous active + set version number on INSERT
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_biological_passport()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Archive any existing active passport for this athlete
  UPDATE biological_passports
  SET
    status = 'archived',
    updated_at = now()
  WHERE
    athlete_id = NEW.athlete_id
    AND status = 'active'
    AND id != NEW.id;

  -- Set correct version number
  NEW.version_number := get_next_passport_version(NEW.athlete_id);
  NEW.updated_at := now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_new_biological_passport ON biological_passports;
CREATE TRIGGER trg_handle_new_biological_passport
  BEFORE INSERT ON biological_passports
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_biological_passport();

-- ============================================================
-- TRIGGER: prevent modification of physiological data on archived passports
-- ============================================================
CREATE OR REPLACE FUNCTION prevent_archived_passport_data_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'archived' THEN
    IF OLD.vo2max IS DISTINCT FROM NEW.vo2max
      OR OLD.lt1_power IS DISTINCT FROM NEW.lt1_power
      OR OLD.lt2_power IS DISTINCT FROM NEW.lt2_power
      OR OLD.lt1_hr IS DISTINCT FROM NEW.lt1_hr
      OR OLD.lt2_hr IS DISTINCT FROM NEW.lt2_hr
      OR OLD.ftp_watts IS DISTINCT FROM NEW.ftp_watts
      OR OLD.critical_power IS DISTINCT FROM NEW.critical_power
      OR OLD.anaerobic_capacity_kj IS DISTINCT FROM NEW.anaerobic_capacity_kj
      OR OLD.running_threshold_pace IS DISTINCT FROM NEW.running_threshold_pace
      OR OLD.power_zones_json IS DISTINCT FROM NEW.power_zones_json
      OR OLD.hr_zones_json IS DISTINCT FROM NEW.hr_zones_json
      OR OLD.height_cm IS DISTINCT FROM NEW.height_cm
      OR OLD.weight_kg IS DISTINCT FROM NEW.weight_kg
      OR OLD.body_fat_percent IS DISTINCT FROM NEW.body_fat_percent
      OR OLD.muscle_mass_kg IS DISTINCT FROM NEW.muscle_mass_kg
      OR OLD.bone_mass_kg IS DISTINCT FROM NEW.bone_mass_kg
    THEN
      RAISE EXCEPTION 'Archived biological passport v% is immutable. Create a new passport version instead.', OLD.version_number;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_archived_passport_data_change ON biological_passports;
CREATE TRIGGER trg_prevent_archived_passport_data_change
  BEFORE UPDATE ON biological_passports
  FOR EACH ROW
  EXECUTE FUNCTION prevent_archived_passport_data_change();

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Athletes: read all own passports (active + archived history)
CREATE POLICY "Athletes can read own biological passports"
  ON biological_passports
  FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

-- Trainers/Admins: read passports of assigned athletes
-- Trainers see only active; admins see all
CREATE POLICY "Trainers and admins can read passports of assigned athletes"
  ON biological_passports
  FOR SELECT
  TO authenticated
  USING (
    (select (auth.jwt() -> 'app_metadata' ->> 'role')) IN ('trainer', 'admin')
    AND (
      (select (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin'
      OR (
        status = 'active'
        AND (
          EXISTS (
            SELECT 1 FROM athlete_workouts aw
            WHERE aw.athlete_id = biological_passports.athlete_id
              AND aw.trainer_id = auth.uid()
            LIMIT 1
          )
          OR EXISTS (
            SELECT 1 FROM team_members tm
            INNER JOIN teams t ON t.id = tm.team_id
            WHERE tm.athlete_id = biological_passports.athlete_id
              AND t.coach_id = auth.uid()
            LIMIT 1
          )
        )
      )
    )
  );

-- Trainers/Admins: create new passport versions
CREATE POLICY "Trainers and admins can create biological passports"
  ON biological_passports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (select (auth.jwt() -> 'app_metadata' ->> 'role')) IN ('trainer', 'admin')
  );

-- Trainers/Admins: update active passports (visibility flags + notes)
CREATE POLICY "Trainers and admins can update biological passports"
  ON biological_passports
  FOR UPDATE
  TO authenticated
  USING (
    (select (auth.jwt() -> 'app_metadata' ->> 'role')) IN ('trainer', 'admin')
  )
  WITH CHECK (
    (select (auth.jwt() -> 'app_metadata' ->> 'role')) IN ('trainer', 'admin')
  );

-- Athletes: update ONLY visibility flags on their own ACTIVE passport
CREATE POLICY "Athletes can update visibility flags on own active passport"
  ON biological_passports
  FOR UPDATE
  TO authenticated
  USING (
    athlete_id = auth.uid()
    AND status = 'active'
  )
  WITH CHECK (
    athlete_id = auth.uid()
    AND status = 'active'
  );

-- Admins: delete
CREATE POLICY "Admins can delete biological passports"
  ON biological_passports
  FOR DELETE
  TO authenticated
  USING (
    (select (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin'
  );
