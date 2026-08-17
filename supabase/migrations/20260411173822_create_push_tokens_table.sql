/*
  # Create push_tokens table

  ## Purpose
  Stores device push notification tokens for registered users so the backend
  can send targeted push notifications via FCM (Android) and APNs (iOS).

  ## New Tables
  - `push_tokens`
    - `id` (uuid, primary key)
    - `user_id` (uuid, FK → auth.users) — owner of the token
    - `token` (text) — FCM/APNs device token
    - `platform` (text) — 'ios' | 'android' | 'web'
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Constraints
  - Unique on (user_id, token) — prevents duplicate tokens per user
  - `platform` constrained to known values

  ## Security
  - RLS enabled
  - Users can only read / write their own tokens
  - Tokens are deleted on logout by the client
*/

CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL DEFAULT 'ios',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT push_tokens_platform_check CHECK (platform IN ('ios', 'android', 'web')),
  CONSTRAINT push_tokens_user_token_unique UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own push tokens"
  ON push_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push tokens"
  ON push_tokens FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push tokens"
  ON push_tokens FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own push tokens"
  ON push_tokens FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
