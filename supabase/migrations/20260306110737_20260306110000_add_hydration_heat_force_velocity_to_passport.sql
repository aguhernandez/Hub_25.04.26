/*
  # Add Hydration, Heat Adaptation and Force-Velocity to Biological Passports

  ## New Columns
  Three new JSONB columns are added to `biological_passports` to store lab module data:

  ### hydration (jsonb, nullable)
  Stores a single hydration evaluation object:
  - evaluation_date: date of the test (YYYY-MM-DD)
  - sweat_rate_l_h: sweat rate in L/h
  - percent_dehydration: % dehydration
  - average_sweat_rate_l_h: average sweat rate in L/h
  - temperature_c: ambient temperature in °C
  - humidity_percent: relative humidity %

  ### heat_adaptation (jsonb, nullable)
  Stores a single heat adaptation evaluation object:
  - evaluation_date: date of the test (YYYY-MM-DD)
  - heat_adaptation_score: score 0-100
  - adaptation_classification: "Insufficient Data" | "Minimal" | "Moderate" | "Good" | "Excellent"
  - total_sessions: number of heat sessions used for the calculation

  ### force_velocity (jsonb, nullable)
  Stores a single force-velocity profile object:
  - evaluation_date: date of the test (YYYY-MM-DD)
  - exercise: exercise used (e.g. "squat")
  - f0_n: theoretical maximum force in Newtons
  - f0_relative_bw: f0 expressed in body-weights (adimensional)
  - pmax_w: maximum mechanical power in Watts
  - pmax_w_kg: maximum mechanical power relative to body mass (W/kg)
  - optimal_velocity_ms: optimal velocity for max power (m/s)
  - fv_imbalance_percent: % imbalance from ideal F-V relationship
  - fv_imbalance_direction: "force_deficit" | "velocity_deficit" | "balanced"

  ## Notes
  - All columns default to NULL (no data from lab = null, as per lab contract)
  - No RLS changes needed; existing policies cover all columns of the table
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biological_passports' AND column_name = 'hydration'
  ) THEN
    ALTER TABLE biological_passports ADD COLUMN hydration jsonb DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biological_passports' AND column_name = 'heat_adaptation'
  ) THEN
    ALTER TABLE biological_passports ADD COLUMN heat_adaptation jsonb DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biological_passports' AND column_name = 'force_velocity'
  ) THEN
    ALTER TABLE biological_passports ADD COLUMN force_velocity jsonb DEFAULT NULL;
  END IF;
END $$;
