/*
  # Add Category and Level Fields to Exercises
  
  1. Changes
    - Add `category` column to categorize exercises
    - Add `level` column for difficulty level
    - Add `sport` column to filter by sport
  
  2. Categories
    - Upper part (Tren superior)
    - Lower part (Tren inferior)
    - Power (Potencia)
    - Grinding (Fuerza máxima)
    - Stretching (Movilidad / Estiramiento)
    - Tests (Tests / Evaluaciones)
    - Speed (Velocidad)
    - Conditioning (Acondicionamiento)
  
  3. Levels
    - Beginner
    - Intermediate
    - Advanced
*/

-- Add category column
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS category TEXT;

-- Add level column
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS level TEXT;

-- Add sport column
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS sport TEXT DEFAULT 'beach_volley';

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_level ON exercises(level);
CREATE INDEX IF NOT EXISTS idx_exercises_sport ON exercises(sport);
