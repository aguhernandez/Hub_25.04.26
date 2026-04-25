/*
  # Add Profile Settings Fields
  
  Adds additional fields for comprehensive user profile settings:
  - Bio/About section for athlete description
  - Membership info (plan, start date)
  - Emergency contact
  - Social media links
  - Notification preferences
*/

-- Add bio and description fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS athlete_bio text;

-- Add membership fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS membership_plan text DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS membership_status text DEFAULT 'active' CHECK (membership_status IN ('active', 'inactive', 'trial', 'cancelled'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS membership_start_date timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS membership_end_date timestamptz;

-- Add emergency contact
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_relationship text;

-- Add social media
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS instagram_handle text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS twitter_handle text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS strava_profile text;

-- Add notification preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_notifications boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_notifications boolean DEFAULT true;

-- Add additional sports info
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS secondary_sport text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS years_of_experience integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_level text;

-- Add timezone
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC';

-- Add profile visibility
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_visibility text DEFAULT 'private' CHECK (profile_visibility IN ('public', 'private', 'team_only'));

-- Create index for membership lookups
CREATE INDEX IF NOT EXISTS idx_profiles_membership_status ON profiles(membership_status);
CREATE INDEX IF NOT EXISTS idx_profiles_membership_plan ON profiles(membership_plan);
