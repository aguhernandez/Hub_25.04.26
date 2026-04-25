/*
  # Create hub_athlete_profiles table

  ## Purpose
  Stores athlete identity data sent from the Hub (main app) via X-Planner-Token.
  This allows Academy satellite to recognize and personalize content for athletes
  identified by their Hub athlete_id and email.

  ## New Tables
  - `hub_athlete_profiles`
    - `id` (uuid, primary key)
    - `athlete_id` (text) - UUID from Hub's auth system
    - `athlete_email` (text) - email to correlate identity
    - `full_name` (text, nullable)
    - `sport` (text, nullable)
    - `role` (text, nullable)
    - `hub_tags` (jsonb) - array of {tag, priority, timing} objects sent by Hub
    - `last_synced_at` (timestamptz) - when Hub last pushed data
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - No public access; only service_role (used by edge function) can read/write
    because the edge function itself validates the X-Planner-Token before writing

  ## Notes
  - Upserted on each Hub sync using athlete_id as unique key
  - hub_tags replaces previous tags on every sync (last-write-wins)
*/

CREATE TABLE IF NOT EXISTS hub_athlete_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id text UNIQUE NOT NULL,
  athlete_email text NOT NULL,
  full_name text,
  sport text,
  role text,
  hub_tags jsonb DEFAULT '[]'::jsonb,
  last_synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hub_athlete_profiles_athlete_id ON hub_athlete_profiles(athlete_id);
CREATE INDEX IF NOT EXISTS idx_hub_athlete_profiles_email ON hub_athlete_profiles(athlete_email);

ALTER TABLE hub_athlete_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to hub athlete profiles"
  ON hub_athlete_profiles
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role insert hub athlete profiles"
  ON hub_athlete_profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role update hub athlete profiles"
  ON hub_athlete_profiles
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
