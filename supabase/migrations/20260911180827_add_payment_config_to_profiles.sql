
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS payment_link text,
  ADD COLUMN IF NOT EXISTS payment_instructions text,
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'manual_link';
