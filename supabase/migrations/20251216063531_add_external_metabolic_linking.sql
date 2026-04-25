/*
  # Add External Metabolic Lab Linking Support

  1. Schema Changes
    - Add `external_metabolic_user_id` to profiles table
      - Type: uuid (nullable)
      - Purpose: Links HUB users to external Metabolic Lab app users
      - Allows external apps to identify and reference HUB users

  2. Security
    - Maintain existing RLS policies
    - External apps use anon key with SELECT access to public.profiles
    - No automatic user creation from external apps
*/

-- Add external linking field
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'external_metabolic_user_id'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN external_metabolic_user_id uuid;
    
    COMMENT ON COLUMN public.profiles.external_metabolic_user_id IS 
      'Optional UUID linking this HUB user to an external Metabolic Lab user. Used for cross-app data synchronization.';
  END IF;
END $$;

-- Create index for external lookups
CREATE INDEX IF NOT EXISTS idx_profiles_external_metabolic_user_id 
  ON public.profiles(external_metabolic_user_id) 
  WHERE external_metabolic_user_id IS NOT NULL;
