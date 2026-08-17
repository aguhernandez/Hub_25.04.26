/*
  # Add description field to exercises

  1. Changes
    - Add `description` column to `exercises` table
    - Column is optional (nullable) and contains text description of the exercise
*/

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS description text;
