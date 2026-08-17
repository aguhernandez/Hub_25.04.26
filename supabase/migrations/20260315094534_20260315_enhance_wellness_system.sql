/*
  # Enhanced Wellness Monitoring System

  ## Summary
  Expands the existing wellness_checkins table with a full scientific monitoring suite.

  ## Changes

  ### Modified Tables
  - `wellness_checkins`: Adds new columns for sleep duration, DOMS by body region,
    urine color (Armstrong scale), HRV, resting HR, illness symptoms, and a
    normalized 0-100 wellness score.

  ### New Tables
  - `wellness_baselines`: Rolling 7-day HRV and RHR baselines per athlete
    for deviation alerts.

  ### Security
  - RLS maintained: athletes see own data, trainers/admins see all.
*/

-- Add new columns to wellness_checkins if they don't exist
DO $$
BEGIN
  -- Sleep duration category
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wellness_checkins' AND column_name = 'sleep_duration'
  ) THEN
    ALTER TABLE wellness_checkins ADD COLUMN sleep_duration TEXT;
  END IF;

  -- DOMS by region (1-10 scale)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wellness_checkins' AND column_name = 'lower_body_soreness'
  ) THEN
    ALTER TABLE wellness_checkins ADD COLUMN lower_body_soreness INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wellness_checkins' AND column_name = 'upper_body_soreness'
  ) THEN
    ALTER TABLE wellness_checkins ADD COLUMN upper_body_soreness INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wellness_checkins' AND column_name = 'back_soreness'
  ) THEN
    ALTER TABLE wellness_checkins ADD COLUMN back_soreness INTEGER;
  END IF;

  -- 1-10 scale columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wellness_checkins' AND column_name = 'sleep_quality_10'
  ) THEN
    ALTER TABLE wellness_checkins ADD COLUMN sleep_quality_10 INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wellness_checkins' AND column_name = 'fatigue_level_10'
  ) THEN
    ALTER TABLE wellness_checkins ADD COLUMN fatigue_level_10 INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wellness_checkins' AND column_name = 'stress_level_10'
  ) THEN
    ALTER TABLE wellness_checkins ADD COLUMN stress_level_10 INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wellness_checkins' AND column_name = 'motivation_10'
  ) THEN
    ALTER TABLE wellness_checkins ADD COLUMN motivation_10 INTEGER;
  END IF;

  -- PRS: Perceived Recovery Status 0-10
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wellness_checkins' AND column_name = 'prs'
  ) THEN
    ALTER TABLE wellness_checkins ADD COLUMN prs INTEGER;
  END IF;

  -- Illness symptoms (JSONB array of symptom keys)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wellness_checkins' AND column_name = 'illness_symptoms'
  ) THEN
    ALTER TABLE wellness_checkins ADD COLUMN illness_symptoms JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Urine color Armstrong scale 1-8
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wellness_checkins' AND column_name = 'urine_color'
  ) THEN
    ALTER TABLE wellness_checkins ADD COLUMN urine_color INTEGER;
  END IF;

  -- HRV (rMSSD ms)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wellness_checkins' AND column_name = 'hrv'
  ) THEN
    ALTER TABLE wellness_checkins ADD COLUMN hrv NUMERIC(6,2);
  END IF;

  -- Resting heart rate
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wellness_checkins' AND column_name = 'rhr'
  ) THEN
    ALTER TABLE wellness_checkins ADD COLUMN rhr INTEGER;
  END IF;

  -- Normalized 0-100 wellness score
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wellness_checkins' AND column_name = 'wellness_score_100'
  ) THEN
    ALTER TABLE wellness_checkins ADD COLUMN wellness_score_100 NUMERIC(5,1);
  END IF;

END $$;

-- Create wellness_baselines table for rolling 7-day averages
CREATE TABLE IF NOT EXISTS wellness_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  calculated_date DATE NOT NULL,
  hrv_baseline NUMERIC(6,2),
  rhr_baseline NUMERIC(5,1),
  hrv_deviation_pct NUMERIC(5,1),
  rhr_deviation_bpm NUMERIC(4,1),
  hrv_alert BOOLEAN DEFAULT false,
  rhr_alert BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(athlete_id, calculated_date)
);

ALTER TABLE wellness_baselines ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_wellness_baselines_athlete ON wellness_baselines(athlete_id);
CREATE INDEX IF NOT EXISTS idx_wellness_baselines_date ON wellness_baselines(calculated_date);

CREATE POLICY "Athletes view own baselines"
  ON wellness_baselines FOR SELECT
  TO authenticated
  USING (auth.uid() = athlete_id);

CREATE POLICY "Athletes insert own baselines"
  ON wellness_baselines FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Athletes update own baselines"
  ON wellness_baselines FOR UPDATE
  TO authenticated
  USING (auth.uid() = athlete_id)
  WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Trainers and admins view all baselines"
  ON wellness_baselines FOR SELECT
  TO authenticated
  USING (
    (SELECT (raw_app_meta_data->>'role') FROM auth.users WHERE id = auth.uid()) IN ('trainer', 'admin')
  );
