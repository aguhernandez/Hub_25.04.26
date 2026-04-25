/*
  # Add Elite Status and Brand Messages for Athletes

  1. Schema Changes
    - Add `is_elite` boolean field to profiles table
    - Add `brand_messages` jsonb field to store brand offers/messages
    - Add `partner_discounts` jsonb field to store discount codes
    
  2. Important Notes
    - Elite status allows athletes to receive direct brand offers
    - Brand messages are managed by admins
    - Partner discounts are available to all athletes
    - Data stored as JSONB for flexibility
*/

-- Add elite status field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_elite'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_elite boolean DEFAULT false;
  END IF;
END $$;

-- Add brand messages field (for elite athletes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'brand_messages'
  ) THEN
    ALTER TABLE profiles ADD COLUMN brand_messages jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add partner discounts field (for all athletes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'partner_discounts'
  ) THEN
    ALTER TABLE profiles ADD COLUMN partner_discounts jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add index for elite status queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_elite ON profiles(is_elite) WHERE is_elite = true;

-- Add comments
COMMENT ON COLUMN profiles.is_elite IS 'Indicates if athlete has elite status, allowing them to receive direct brand offers';
COMMENT ON COLUMN profiles.brand_messages IS 'Array of brand messages/offers for elite athletes. Format: [{brand_name, message, offer_details, created_at}]';
COMMENT ON COLUMN profiles.partner_discounts IS 'Array of partner brand discounts available to athlete. Format: [{brand_name, discount_code, description, expires_at}]';
