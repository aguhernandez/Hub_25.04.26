/*
  # Fix athlete_workouts nullable fields for TrainingPeaks

  1. Changes
    - Make `workout_id` NULLABLE (TrainingPeaks workouts don't have workout_id)
    - Make `trainer_id` NULLABLE (TrainingPeaks workouts are self-synced)
  
  2. Reasoning
    - TrainingPeaks workouts use external_id/external_title instead of workout_id
    - TrainingPeaks workouts are imported directly by athletes, no trainer involved
    - This allows mixing Asciende workouts (with workout_id/trainer_id) and TP workouts (without)
*/

-- Make workout_id nullable
ALTER TABLE athlete_workouts 
ALTER COLUMN workout_id DROP NOT NULL;

-- Make trainer_id nullable
ALTER TABLE athlete_workouts 
ALTER COLUMN trainer_id DROP NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN athlete_workouts.workout_id IS 
'FK to workouts table. NULL for external workouts (e.g., TrainingPeaks)';

COMMENT ON COLUMN athlete_workouts.trainer_id IS 
'FK to profiles table (trainer). NULL for self-assigned or external workouts';
