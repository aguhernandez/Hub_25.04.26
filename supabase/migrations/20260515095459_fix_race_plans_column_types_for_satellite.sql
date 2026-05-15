/*
  # Fix race_plans column types for satellite compatibility

  1. Changes
    - `race_breakfast_timing`: numeric -> text (satellite sends "3h before start")
    - `carb_timing`: jsonb -> text (satellite sends plain string like "Start fueling at minute 20...")
  
  2. Notes
    - These columns had no data stored previously (all NULL), so the type change is safe
    - race_breakfast_carbs_g remains numeric (satellite sends a number)
*/

ALTER TABLE race_plans ALTER COLUMN race_breakfast_timing TYPE text USING race_breakfast_timing::text;
ALTER TABLE race_plans ALTER COLUMN carb_timing TYPE text USING carb_timing::text;
