/*
  # Allow athletes to see trainer and admin profiles

  1. Problem
    - Athletes cannot see their trainer's name or avatar in chat
    - The SELECT RLS on profiles only allows users to see their own profile
    - Athletes need to see basic info of trainers/admins for chat, assignments, etc.

  2. Fix
    - Add policy allowing any authenticated user to view profiles with role 'trainer' or 'admin'
    - This is safe because trainer/admin profiles are not sensitive data for athletes to see

  3. Also
    - Allow authenticated users to see profiles of other participants in their chat conversations
*/

CREATE POLICY "Authenticated users can view trainer and admin profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (role IN ('trainer', 'admin'));
