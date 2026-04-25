/*
  # Optimize RLS Policies - Part 3

  1. Purpose
    - Continue RLS optimization for critical tables
    - Covers: profiles, bookings, events, training_logs, habit_logs
    - Covers: brand_projects, training_programs

  2. Changes
    - Uses (select auth.uid()) instead of auth.uid()
*/

-- profiles
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
CREATE POLICY "Admins can insert profiles" ON profiles FOR INSERT TO authenticated
  WITH CHECK ((SELECT (EXISTS ( SELECT 1 FROM profiles profiles_1 WHERE ((profiles_1.id = (select auth.uid())) AND (profiles_1.role = 'admin'::text))))));

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1 FROM profiles profiles_1 WHERE ((profiles_1.id = (select auth.uid())) AND (profiles_1.role = 'admin'::text)))));

DROP POLICY IF EXISTS "Trainers can update athlete profiles" ON profiles;
CREATE POLICY "Trainers can update athlete profiles" ON profiles FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = (select auth.uid())) AND (p.role = 'trainer'::text) AND (profiles.assigned_trainer_id = p.id)))));

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT TO authenticated
  WITH CHECK ((id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated
  USING ((id = (select auth.uid()))) WITH CHECK ((id = (select auth.uid())));

DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
CREATE POLICY "users_read_own_profile" ON profiles FOR SELECT TO authenticated
  USING ((id = (select auth.uid())));

DROP POLICY IF EXISTS "trainers_view_assigned_athletes" ON profiles;
CREATE POLICY "trainers_view_assigned_athletes" ON profiles FOR SELECT TO authenticated
  USING ((assigned_trainer_id = (select auth.uid())));

-- bookings
DROP POLICY IF EXISTS "Professionals can update bookings" ON bookings;
CREATE POLICY "Professionals can update bookings" ON bookings FOR UPDATE TO authenticated
  USING ((professional_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can create bookings" ON bookings;
CREATE POLICY "Users can create bookings" ON bookings FOR INSERT TO authenticated
  WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
CREATE POLICY "Users can view own bookings" ON bookings FOR SELECT TO authenticated
  USING (((user_id = (select auth.uid())) OR (professional_id = (select auth.uid()))));

-- events
DROP POLICY IF EXISTS "Admins can manage events" ON events;
CREATE POLICY "Admins can manage events" ON events FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::text)))));

-- event_registrations
DROP POLICY IF EXISTS "Users can register for events" ON event_registrations;
CREATE POLICY "Users can register for events" ON event_registrations FOR INSERT TO authenticated
  WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can view own registrations" ON event_registrations;
CREATE POLICY "Users can view own registrations" ON event_registrations FOR SELECT TO authenticated
  USING ((user_id = (select auth.uid())));

-- performance_digests
DROP POLICY IF EXISTS "Trainers can create digests" ON performance_digests;
CREATE POLICY "Trainers can create digests" ON performance_digests FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'trainer'::text)))));

-- brand_projects
DROP POLICY IF EXISTS "Admins can manage brand projects" ON brand_projects;
CREATE POLICY "Admins can manage brand projects" ON brand_projects FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::text)))));

-- habit_logs
DROP POLICY IF EXISTS "Users can create own habit logs" ON habit_logs;
CREATE POLICY "Users can create own habit logs" ON habit_logs FOR INSERT TO authenticated
  WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can update own habit logs" ON habit_logs;
CREATE POLICY "Users can update own habit logs" ON habit_logs FOR UPDATE TO authenticated
  USING ((user_id = (select auth.uid()))) WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can view own habit logs" ON habit_logs;
CREATE POLICY "Users can view own habit logs" ON habit_logs FOR SELECT TO authenticated
  USING ((user_id = (select auth.uid())));

-- training_programs
DROP POLICY IF EXISTS "Admins can manage programs" ON training_programs;
CREATE POLICY "Admins can manage programs" ON training_programs FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::text)))));

DROP POLICY IF EXISTS "trainers_admins_create_programs" ON training_programs;
CREATE POLICY "trainers_admins_create_programs" ON training_programs FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['trainer'::text, 'admin'::text]))))));

DROP POLICY IF EXISTS "creators_update_own_programs" ON training_programs;
CREATE POLICY "creators_update_own_programs" ON training_programs FOR UPDATE TO authenticated
  USING ((created_by = (select auth.uid()))) WITH CHECK ((created_by = (select auth.uid())));

DROP POLICY IF EXISTS "creators_admins_delete_programs" ON training_programs;
CREATE POLICY "creators_admins_delete_programs" ON training_programs FOR DELETE TO authenticated
  USING (((created_by = (select auth.uid())) OR (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::text))))));

DROP POLICY IF EXISTS "trainers_read_own_programs" ON training_programs;
CREATE POLICY "trainers_read_own_programs" ON training_programs FOR SELECT TO authenticated
  USING ((created_by = (select auth.uid())));

DROP POLICY IF EXISTS "admins_read_all_programs" ON training_programs;
CREATE POLICY "admins_read_all_programs" ON training_programs FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::text)))));

-- training_logs
DROP POLICY IF EXISTS "Athletes can insert own training logs" ON training_logs;
CREATE POLICY "Athletes can insert own training logs" ON training_logs FOR INSERT TO authenticated
  WITH CHECK ((athlete_id = (select auth.uid())));

DROP POLICY IF EXISTS "Athletes can update own logs" ON training_logs;
CREATE POLICY "Athletes can update own logs" ON training_logs FOR UPDATE TO authenticated
  USING ((athlete_id = (select auth.uid()))) WITH CHECK ((athlete_id = (select auth.uid())));

DROP POLICY IF EXISTS "Athletes can view own training logs" ON training_logs;
CREATE POLICY "Athletes can view own training logs" ON training_logs FOR SELECT TO authenticated
  USING ((athlete_id = (select auth.uid())));

DROP POLICY IF EXISTS "Trainers can view athlete training logs" ON training_logs;
CREATE POLICY "Trainers can view athlete training logs" ON training_logs FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role IN ( 'trainer'::text, 'admin'::text))))));
