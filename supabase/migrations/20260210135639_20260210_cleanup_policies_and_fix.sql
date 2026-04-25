/*
  # Clean up conflicting policies
  
  Multiple overlapping policies are causing issues.
  Remove all old policies and create a clean, minimal set.
*/

-- Drop all policies on these tables
DROP POLICY IF EXISTS "allow_select" ON profiles;
DROP POLICY IF EXISTS "allow_insert" ON profiles;
DROP POLICY IF EXISTS "allow_own_update" ON profiles;
DROP POLICY IF EXISTS "admin_delete" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Allow insert for signup" ON profiles;

-- Clean start with minimal policies for profiles
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_select_admin"
  ON profiles FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_insert_any"
  ON profiles FOR INSERT
  WITH CHECK (true);

-- For user_subscriptions, allow service role to query during signup
DROP POLICY IF EXISTS "Admins can insert subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Admins can update subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions;

CREATE POLICY "subscriptions_select_own"
  ON user_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "subscriptions_select_service"
  ON user_subscriptions FOR SELECT
  USING (true);
