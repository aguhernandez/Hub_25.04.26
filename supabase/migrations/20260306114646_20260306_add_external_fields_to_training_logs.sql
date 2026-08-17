/*
  # Add external planner fields to training_logs

  Adds columns needed to receive completed endurance workouts pushed by
  the Endurance Planner satellite via push-training-log endpoint.

  ## New Columns on training_logs
  - max_heart_rate (integer, nullable) — max HR in bpm
  - max_power_watts (integer, nullable) — peak power in watts
  - normalized_power_watts (integer, nullable) — normalized power (NP) in watts
  - if_value (numeric(5,3), nullable) — Intensity Factor (0-1)
  - elevation_gain_m (numeric(8,1), nullable) — total elevation gain in meters
  - avg_cadence (integer, nullable) — average cadence in rpm
  - avg_speed_kmh (numeric(6,2), nullable) — average speed in km/h
  - calories (integer, nullable) — calories burned
  - external_source (text, nullable) — name of the satellite/app that pushed the record
  - external_activity_id (text, nullable) — ID from the external app for deduplication
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_logs' AND column_name = 'max_heart_rate'
  ) THEN
    ALTER TABLE training_logs ADD COLUMN max_heart_rate integer DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_logs' AND column_name = 'max_power_watts'
  ) THEN
    ALTER TABLE training_logs ADD COLUMN max_power_watts integer DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_logs' AND column_name = 'normalized_power_watts'
  ) THEN
    ALTER TABLE training_logs ADD COLUMN normalized_power_watts integer DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_logs' AND column_name = 'if_value'
  ) THEN
    ALTER TABLE training_logs ADD COLUMN if_value numeric(5,3) DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_logs' AND column_name = 'elevation_gain_m'
  ) THEN
    ALTER TABLE training_logs ADD COLUMN elevation_gain_m numeric(8,1) DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_logs' AND column_name = 'avg_cadence'
  ) THEN
    ALTER TABLE training_logs ADD COLUMN avg_cadence integer DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_logs' AND column_name = 'avg_speed_kmh'
  ) THEN
    ALTER TABLE training_logs ADD COLUMN avg_speed_kmh numeric(6,2) DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_logs' AND column_name = 'calories'
  ) THEN
    ALTER TABLE training_logs ADD COLUMN calories integer DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_logs' AND column_name = 'external_source'
  ) THEN
    ALTER TABLE training_logs ADD COLUMN external_source text DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_logs' AND column_name = 'external_activity_id'
  ) THEN
    ALTER TABLE training_logs ADD COLUMN external_activity_id text DEFAULT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_training_logs_external_activity
  ON training_logs(athlete_id, external_activity_id)
  WHERE external_activity_id IS NOT NULL;
