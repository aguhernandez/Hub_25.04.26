/*
  # Restructure Exercise Library

  1. Changes
    - Drop old columns that don't match the new structure
    - Add new columns matching the correct structure:
      - category: Main category classification
      - type: Exercise type
      - equipment: Equipment needed
      - exercise: Exercise name (rename from 'name')
      - link: Video/resource link (rename from 'video_url')
      - pattern_ability: Pattern or ability trained
      - movement: Type of movement
      - contraction: Type of muscle contraction
      - orientation: Exercise orientation
      - body_part: Target body part
      - parameter: Additional parameters
    
  2. Notes
    - Preserves id, created_by, created_at, is_global for compatibility
    - Old exercise data will need to be deleted and re-imported
*/

-- Drop old columns that won't be used
ALTER TABLE exercises DROP COLUMN IF EXISTS description;
ALTER TABLE exercises DROP COLUMN IF EXISTS muscle_groups;
ALTER TABLE exercises DROP COLUMN IF EXISTS difficulty;
ALTER TABLE exercises DROP COLUMN IF EXISTS level;
ALTER TABLE exercises DROP COLUMN IF EXISTS sport;

-- Rename existing columns to match new structure
ALTER TABLE exercises RENAME COLUMN name TO exercise;
ALTER TABLE exercises RENAME COLUMN video_url TO link;

-- Equipment is already there but as array, change to text
ALTER TABLE exercises DROP COLUMN IF EXISTS equipment;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS equipment text;

-- Category already exists, keep it

-- Add new columns
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS pattern_ability text;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS movement text;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS contraction text;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS orientation text;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS body_part text;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS parameter text;

-- Add comments for documentation
COMMENT ON COLUMN exercises.category IS 'Main category classification (e.g., Strength, Cardio, Flexibility)';
COMMENT ON COLUMN exercises.type IS 'Exercise type classification';
COMMENT ON COLUMN exercises.equipment IS 'Equipment needed for the exercise';
COMMENT ON COLUMN exercises.exercise IS 'Exercise name';
COMMENT ON COLUMN exercises.link IS 'Video or resource URL';
COMMENT ON COLUMN exercises.pattern_ability IS 'Pattern or ability being trained';
COMMENT ON COLUMN exercises.movement IS 'Type of movement (push, pull, squat, etc)';
COMMENT ON COLUMN exercises.contraction IS 'Type of muscle contraction (concentric, eccentric, isometric)';
COMMENT ON COLUMN exercises.orientation IS 'Exercise orientation (vertical, horizontal, rotational)';
COMMENT ON COLUMN exercises.body_part IS 'Target body part';
COMMENT ON COLUMN exercises.parameter IS 'Additional parameters or classifications';
