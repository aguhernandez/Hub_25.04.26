/*
# Add username column to profiles

## Purpose
The professional sign-up flow collects a username during registration.
This column stores it so it can be displayed and used for lookup.

## Changes
1. Adds `username` (text, nullable) to `profiles`.
2. Adds a unique index on `username` where it is not null, so no two
   professionals can share the same username.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique
  ON profiles (username)
  WHERE username IS NOT NULL;
