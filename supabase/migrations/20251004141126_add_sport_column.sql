/*
  # Add sport column to profiles

  1. Changes
    - Add `sport` column to profiles table
    - Allow null values for existing users
    - Add index for better query performance
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'sport'
  ) THEN
    ALTER TABLE profiles ADD COLUMN sport text;
    CREATE INDEX IF NOT EXISTS profiles_sport_idx ON profiles(sport);
  END IF;
END $$;
