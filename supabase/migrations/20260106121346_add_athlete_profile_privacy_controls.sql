/*
  # Add Privacy Controls for Athlete Profile

  ## Description
  Adds privacy control columns to athlete_profile_details table to allow athletes
  to control what information is visible on their public profile.

  ## New Columns
  - `show_body_composition` - Controls visibility of anthropometry/Kerr data
  - `show_performance_stats` - Controls visibility of performance metrics
  - `show_training_frequency` - Controls visibility of training frequency heatmap
  - `show_strength_stats` - Controls visibility of strength progression data
  - All default to true for backwards compatibility

  ## Privacy Notes
  - Athletes can hide specific sections from their public profile
  - Data remains accessible to trainers and admins
  - Only affects public profile views, not internal dashboards
*/

ALTER TABLE athlete_profile_details
ADD COLUMN IF NOT EXISTS show_body_composition boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_performance_stats boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_training_frequency boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_strength_stats boolean DEFAULT true;

-- Add helpful comment
COMMENT ON COLUMN athlete_profile_details.show_body_composition IS 'Controls visibility of body composition data (anthropometry/Kerr) on public profile';
COMMENT ON COLUMN athlete_profile_details.show_performance_stats IS 'Controls visibility of performance metrics on public profile';
COMMENT ON COLUMN athlete_profile_details.show_training_frequency IS 'Controls visibility of training frequency heatmap on public profile';
COMMENT ON COLUMN athlete_profile_details.show_strength_stats IS 'Controls visibility of strength progression on public profile';
