/*
  # Add Measurement Method to Anthropometry

  ## Changes
  1. Add measurement_method column to anthropometry_measurements
     - manual: Traditional manual measurements with calipers and tape
     - bioimpedance: Electronic bioimpedance analysis
  
  2. Set default to 'manual' for existing records
*/

ALTER TABLE anthropometry_measurements 
ADD COLUMN IF NOT EXISTS measurement_method text DEFAULT 'manual' CHECK (measurement_method IN ('manual', 'bioimpedance'));