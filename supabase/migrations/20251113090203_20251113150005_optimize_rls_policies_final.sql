/*
  # Optimize RLS Policies - Final Part

  1. Purpose
    - Complete RLS optimization for remaining critical tables
    - Covers: meal_plans, teams, athlete_workouts, strength_estimates
    - Covers: performance_sessions, annual_training_plans

  2. Changes
    - Uses (select auth.uid()) for all auth checks
    - Optimizes complex permission checks
*/

-- meal_plans
DROP POLICY IF EXISTS "Athletes can create their own meal plans" ON meal_plans;
CREATE POLICY "Athletes can create their own meal plans" ON meal_plans FOR INSERT TO authenticated
  WITH CHECK ((athlete_id = (select auth.uid())));

DROP POLICY IF EXISTS "Athletes can update their own meal plans" ON meal_plans;
CREATE POLICY "Athletes can update their own meal plans" ON meal_plans FOR UPDATE TO authenticated
  USING ((athlete_id = (select auth.uid()))) WITH CHECK ((athlete_id = (select auth.uid())));

DROP POLICY IF EXISTS "Coaches can create meal plans for athletes" ON meal_plans;
CREATE POLICY "Coaches can create meal plans for athletes" ON meal_plans FOR INSERT TO authenticated
  WITH CHECK ((coach_id = (select auth.uid())));

DROP POLICY IF EXISTS "Coaches can update meal plans they created" ON meal_plans;
CREATE POLICY "Coaches can update meal plans they created" ON meal_plans FOR UPDATE TO authenticated
  USING ((coach_id = (select auth.uid()))) WITH CHECK ((coach_id = (select auth.uid())));

DROP POLICY IF EXISTS "View own or assigned meal plans" ON meal_plans;
CREATE POLICY "View own or assigned meal plans" ON meal_plans FOR SELECT TO authenticated
  USING (((athlete_id = (select auth.uid())) OR (coach_id = (select auth.uid()))));

-- teams
DROP POLICY IF EXISTS "Coaches can create teams" ON teams;
CREATE POLICY "Coaches can create teams" ON teams FOR INSERT TO authenticated
  WITH CHECK ((coach_id = (select auth.uid())));

DROP POLICY IF EXISTS "Coaches can update own teams" ON teams;
CREATE POLICY "Coaches can update own teams" ON teams FOR UPDATE TO authenticated
  USING ((coach_id = (select auth.uid()))) WITH CHECK ((coach_id = (select auth.uid())));

DROP POLICY IF EXISTS "Coaches can delete own teams" ON teams;
CREATE POLICY "Coaches can delete own teams" ON teams FOR DELETE TO authenticated
  USING ((coach_id = (select auth.uid())));

DROP POLICY IF EXISTS "Coaches can view own teams" ON teams;
CREATE POLICY "Coaches can view own teams" ON teams FOR SELECT TO authenticated
  USING ((coach_id = (select auth.uid())));

DROP POLICY IF EXISTS "Athletes can view teams they belong to" ON teams;
CREATE POLICY "Athletes can view teams they belong to" ON teams FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1 FROM team_members WHERE ((team_members.team_id = teams.id) AND (team_members.athlete_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "Admins can view all teams" ON teams;
CREATE POLICY "Admins can view all teams" ON teams FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::text)))));

-- athlete_workouts
DROP POLICY IF EXISTS "Athletes can self-assign workouts" ON athlete_workouts;
CREATE POLICY "Athletes can self-assign workouts" ON athlete_workouts FOR INSERT TO authenticated
  WITH CHECK ((athlete_id = (select auth.uid())));

DROP POLICY IF EXISTS "Athletes can update own workouts" ON athlete_workouts;
CREATE POLICY "Athletes can update own workouts" ON athlete_workouts FOR UPDATE TO authenticated
  USING ((athlete_id = (select auth.uid()))) WITH CHECK ((athlete_id = (select auth.uid())));

DROP POLICY IF EXISTS "Athletes can update own workout feedback" ON athlete_workouts;
CREATE POLICY "Athletes can update own workout feedback" ON athlete_workouts FOR UPDATE TO authenticated
  USING ((athlete_id = (select auth.uid())));

DROP POLICY IF EXISTS "Athletes can view assigned workouts" ON athlete_workouts;
CREATE POLICY "Athletes can view assigned workouts" ON athlete_workouts FOR SELECT TO authenticated
  USING ((athlete_id = (select auth.uid())));

DROP POLICY IF EXISTS "Trainers can assign workouts" ON athlete_workouts;
CREATE POLICY "Trainers can assign workouts" ON athlete_workouts FOR INSERT TO authenticated
  WITH CHECK ((trainer_id = (select auth.uid())));

DROP POLICY IF EXISTS "Trainers can update assigned workouts" ON athlete_workouts;
CREATE POLICY "Trainers can update assigned workouts" ON athlete_workouts FOR UPDATE TO authenticated
  USING ((trainer_id = (select auth.uid())));

-- strength_estimates
DROP POLICY IF EXISTS "Athletes can view own strength estimates" ON strength_estimates;
CREATE POLICY "Athletes can view own strength estimates" ON strength_estimates FOR SELECT TO authenticated
  USING ((athlete_id = (select auth.uid())));

DROP POLICY IF EXISTS "Trainers can insert athlete strength estimates" ON strength_estimates;
CREATE POLICY "Trainers can insert athlete strength estimates" ON strength_estimates FOR INSERT TO authenticated
  WITH CHECK ((trainer_id = (select auth.uid())));

DROP POLICY IF EXISTS "Trainers can update athlete strength estimates" ON strength_estimates;
CREATE POLICY "Trainers can update athlete strength estimates" ON strength_estimates FOR UPDATE TO authenticated
  USING ((trainer_id = (select auth.uid()))) WITH CHECK ((trainer_id = (select auth.uid())));

DROP POLICY IF EXISTS "Trainers can view athlete strength estimates" ON strength_estimates;
CREATE POLICY "Trainers can view athlete strength estimates" ON strength_estimates FOR SELECT TO authenticated
  USING ((trainer_id = (select auth.uid())));

DROP POLICY IF EXISTS "Admins have full access to strength estimates" ON strength_estimates;
CREATE POLICY "Admins have full access to strength estimates" ON strength_estimates FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::text)))));

-- performance_sessions
DROP POLICY IF EXISTS "Athletes can insert own performance sessions" ON performance_sessions;
CREATE POLICY "Athletes can insert own performance sessions" ON performance_sessions FOR INSERT TO authenticated
  WITH CHECK ((athlete_id = (select auth.uid())));

DROP POLICY IF EXISTS "Athletes can update own performance sessions" ON performance_sessions;
CREATE POLICY "Athletes can update own performance sessions" ON performance_sessions FOR UPDATE TO authenticated
  USING ((athlete_id = (select auth.uid()))) WITH CHECK ((athlete_id = (select auth.uid())));

DROP POLICY IF EXISTS "Athletes can view own performance sessions" ON performance_sessions;
CREATE POLICY "Athletes can view own performance sessions" ON performance_sessions FOR SELECT TO authenticated
  USING ((athlete_id = (select auth.uid())));

DROP POLICY IF EXISTS "Trainers can insert athlete performance sessions" ON performance_sessions;
CREATE POLICY "Trainers can insert athlete performance sessions" ON performance_sessions FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role IN ( 'trainer'::text, 'admin'::text))))));

DROP POLICY IF EXISTS "Trainers can view athlete performance sessions" ON performance_sessions;
CREATE POLICY "Trainers can view athlete performance sessions" ON performance_sessions FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role IN ( 'trainer'::text, 'admin'::text))))));

DROP POLICY IF EXISTS "Admins can manage all performance sessions" ON performance_sessions;
CREATE POLICY "Admins can manage all performance sessions" ON performance_sessions FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::text)))));

-- annual_training_plans
DROP POLICY IF EXISTS "Coaches can create ATPs" ON annual_training_plans;
CREATE POLICY "Coaches can create ATPs" ON annual_training_plans FOR INSERT TO authenticated
  WITH CHECK ((coach_id = (select auth.uid())));

DROP POLICY IF EXISTS "Coaches can update their ATPs" ON annual_training_plans;
CREATE POLICY "Coaches can update their ATPs" ON annual_training_plans FOR UPDATE TO authenticated
  USING ((coach_id = (select auth.uid()))) WITH CHECK ((coach_id = (select auth.uid())));

DROP POLICY IF EXISTS "Coaches can delete their ATPs" ON annual_training_plans;
CREATE POLICY "Coaches can delete their ATPs" ON annual_training_plans FOR DELETE TO authenticated
  USING ((coach_id = (select auth.uid())));

DROP POLICY IF EXISTS "Coaches can view ATPs for their athletes" ON annual_training_plans;
CREATE POLICY "Coaches can view ATPs for their athletes" ON annual_training_plans FOR SELECT TO authenticated
  USING ((coach_id = (select auth.uid())));

DROP POLICY IF EXISTS "Athletes can view their own ATPs" ON annual_training_plans;
CREATE POLICY "Athletes can view their own ATPs" ON annual_training_plans FOR SELECT TO authenticated
  USING ((athlete_id = (select auth.uid())));

DROP POLICY IF EXISTS "Admins can manage all ATPs" ON annual_training_plans;
CREATE POLICY "Admins can manage all ATPs" ON annual_training_plans FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::text)))));
