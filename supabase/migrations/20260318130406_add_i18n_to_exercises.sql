/*
  # Add i18n support to exercises table

  ## Summary
  Adds multilanguage support to the exercises table so that each exercise
  can have a name and description in both English and Spanish, while sharing
  the same video URL (link field).

  ## Changes

  ### Modified Table: exercises
  - Add `exercise_en` (text) - Exercise name in English
  - Add `exercise_es` (text) - Exercise name in Spanish
  - Add `description_en` (text) - Exercise description in English
  - Add `description_es` (text) - Exercise description in Spanish

  ### Data Migration
  - Copies current `exercise` field value into `exercise_en` (source data is in English)
  - Copies current `description` field value into `description_en`
  - Leaves `exercise_es` and `description_es` as NULL initially (to be filled in later)

  ### Notes
  - The original `exercise` and `description` columns are kept for backward compatibility
  - The `link` (video URL) remains shared across all languages
  - Frontend should fallback to `exercise_en` when `exercise_es` is NULL
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exercises' AND column_name = 'exercise_en'
  ) THEN
    ALTER TABLE exercises ADD COLUMN exercise_en text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exercises' AND column_name = 'exercise_es'
  ) THEN
    ALTER TABLE exercises ADD COLUMN exercise_es text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exercises' AND column_name = 'description_en'
  ) THEN
    ALTER TABLE exercises ADD COLUMN description_en text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exercises' AND column_name = 'description_es'
  ) THEN
    ALTER TABLE exercises ADD COLUMN description_es text;
  END IF;
END $$;

UPDATE exercises
SET
  exercise_en = exercise,
  description_en = description
WHERE exercise_en IS NULL;
