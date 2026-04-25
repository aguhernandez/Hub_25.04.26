/*
  # Add Extended Profile Fields for Signup

  ## New Fields
  - `first_name` (text) - First name separate from full_name
  - `last_name` (text) - Last name separate from full_name
  - `date_of_birth` (date) - Birth date for age calculations
  - `gender` (text) - Gender for anthropometry calculations
  - `age` (integer) - Calculated or provided age
  - `profile_completed` (boolean) - Track if extended profile is complete

  ## Changes
  - Add new columns to profiles table
  - Default values for backward compatibility
*/

-- Add new profile fields
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
ADD COLUMN IF NOT EXISTS age integer,
ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_profile_completed 
  ON profiles(profile_completed);

-- Update existing profiles to mark as not completed
UPDATE profiles 
SET profile_completed = false 
WHERE profile_completed IS NULL;
