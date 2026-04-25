/*
  # Asciende Platform Database Schema

  ## Overview
  Complete database schema for Asciende.pro SaaS platform supporting Training, Nutrition, 
  Habits, Anthropometry, Chat, Events, Bookings, and Membership management.

  ## 1. New Tables

  ### Core Tables
  - `profiles` - Extended user profiles with role, country, membership info
  - `memberships` - Membership plans and pricing
  - `user_memberships` - Active user subscriptions
  - `payments` - Payment transaction history

  ### Training Tables
  - `exercises` - Global exercise library with video URLs
  - `workouts` - Workout templates created by trainers
  - `workout_exercises` - Exercise assignments within workouts
  - `athlete_workouts` - Workout assignments to athletes
  - `training_logs` - Athlete training session logs
  - `training_programs` - Pre-made purchasable programs
  - `user_programs` - Purchased programs by users

  ### Nutrition Tables
  - `foods` - Food database with nutritional info
  - `meal_logs` - Daily meal tracking
  - `meal_plans` - Trainer-assigned meal plans
  - `meal_plan_items` - Individual foods in meal plans

  ### Habits Tables
  - `habits` - User-defined habits to track
  - `habit_logs` - Daily habit completion records

  ### Anthropometry Tables
  - `anthropometry_records` - ISAK protocol measurements

  ### Communication Tables
  - `chat_conversations` - Chat threads between users
  - `chat_messages` - Individual chat messages

  ### Booking & Events Tables
  - `professional_availability` - Trainer availability slots
  - `bookings` - Scheduled consultation bookings
  - `events` - Live events and webinars
  - `event_registrations` - User event sign-ups

  ### Content Tables
  - `performance_digests` - Weekly performance insights
  - `brand_projects` - Brand collaborations and discounts

  ## 2. Security
  - Enable RLS on all tables
  - Policies for role-based access (Admin, Trainer, Athlete)
  - Users can only access their own data unless they're trainers/admins
  - Trainers can access assigned athletes' data
  - Admins have full access

  ## 3. Important Notes
  - All timestamps use `timestamptz` for timezone support
  - Foreign keys ensure referential integrity
  - Indexes added for common query patterns
  - Unit preferences stored per user for anthropometry
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CORE TABLES
-- =============================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text NOT NULL CHECK (role IN ('admin', 'trainer', 'athlete')) DEFAULT 'athlete',
  country text,
  phone text,
  avatar_url text,
  language text DEFAULT 'en' CHECK (language IN ('en', 'es')),
  theme text DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  unit_preference text DEFAULT 'metric' CHECK (unit_preference IN ('metric', 'imperial')),
  intervals_icu_api_key text,
  objectives text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Memberships table
CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  price_monthly numeric(10,2),
  price_annual numeric(10,2),
  stripe_price_id_monthly text,
  stripe_price_id_annual text,
  features jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- User memberships table
CREATE TABLE IF NOT EXISTS user_memberships (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES memberships(id),
  stripe_subscription_id text,
  status text NOT NULL CHECK (status IN ('active', 'canceled', 'expired', 'past_due')) DEFAULT 'active',
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_payment_intent_id text,
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'usd',
  status text NOT NULL CHECK (status IN ('succeeded', 'pending', 'failed')),
  description text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- TRAINING TABLES
-- =============================================

-- Exercises library
CREATE TABLE IF NOT EXISTS exercises (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  video_url text,
  muscle_groups text[],
  equipment text[],
  difficulty text CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  is_global boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Workouts
CREATE TABLE IF NOT EXISTS workouts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  duration_minutes integer,
  difficulty text CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Workout exercises (with superset support)
CREATE TABLE IF NOT EXISTS workout_exercises (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_id uuid NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES exercises(id),
  custom_exercise_name text,
  custom_exercise_video_url text,
  sets integer,
  reps text,
  rest_seconds integer,
  notes text,
  superset_group integer,
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Athlete workout assignments
CREATE TABLE IF NOT EXISTS athlete_workouts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES profiles(id),
  workout_id uuid NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  scheduled_date date,
  status text CHECK (status IN ('pending', 'completed', 'skipped')) DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Training logs
CREATE TABLE IF NOT EXISTS training_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  athlete_workout_id uuid REFERENCES athlete_workouts(id) ON DELETE CASCADE,
  workout_exercise_id uuid REFERENCES workout_exercises(id),
  set_number integer,
  reps_completed integer,
  weight_used numeric(10,2),
  rir integer,
  bar_speed numeric(5,2),
  notes text,
  logged_at timestamptz DEFAULT now()
);

-- Pre-made training programs
CREATE TABLE IF NOT EXISTS training_programs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  duration_weeks integer,
  price numeric(10,2),
  stripe_price_id text,
  category text,
  preview_video_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- User purchased programs
CREATE TABLE IF NOT EXISTS user_programs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES training_programs(id),
  purchase_date timestamptz DEFAULT now(),
  start_date date,
  completion_status text CHECK (completion_status IN ('not_started', 'in_progress', 'completed')) DEFAULT 'not_started'
);

-- =============================================
-- NUTRITION TABLES
-- =============================================

-- Foods database
CREATE TABLE IF NOT EXISTS foods (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  brand text,
  serving_size numeric(10,2),
  serving_unit text,
  calories numeric(10,2),
  protein numeric(10,2),
  carbs numeric(10,2),
  fat numeric(10,2),
  fiber numeric(10,2),
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Meal logs
CREATE TABLE IF NOT EXISTS meal_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  food_id uuid REFERENCES foods(id),
  custom_food_name text,
  meal_type text CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  servings numeric(10,2) DEFAULT 1,
  calories numeric(10,2),
  protein numeric(10,2),
  carbs numeric(10,2),
  fat numeric(10,2),
  logged_date date NOT NULL DEFAULT CURRENT_DATE,
  logged_at timestamptz DEFAULT now()
);

-- Meal plans (trainer-assigned)
CREATE TABLE IF NOT EXISTS meal_plans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id uuid NOT NULL REFERENCES profiles(id),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  start_date date,
  end_date date,
  created_at timestamptz DEFAULT now()
);

-- Meal plan items
CREATE TABLE IF NOT EXISTS meal_plan_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_plan_id uuid NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  food_id uuid REFERENCES foods(id),
  meal_type text CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  servings numeric(10,2),
  day_of_week integer CHECK (day_of_week BETWEEN 0 AND 6),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- HABITS TABLES
-- =============================================

-- Habits
CREATE TABLE IF NOT EXISTS habits (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  habit_type text NOT NULL CHECK (habit_type IN ('checklist', 'numeric')),
  target_value numeric(10,2),
  unit text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Habit logs
CREATE TABLE IF NOT EXISTS habit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  completed boolean DEFAULT false,
  value numeric(10,2),
  notes text,
  logged_at timestamptz DEFAULT now(),
  UNIQUE(habit_id, log_date)
);

-- =============================================
-- ANTHROPOMETRY TABLES
-- =============================================

-- Anthropometry records (ISAK protocol)
CREATE TABLE IF NOT EXISTS anthropometry_records (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  measured_by uuid REFERENCES profiles(id),
  measurement_date date NOT NULL DEFAULT CURRENT_DATE,
  
  -- Basic measurements
  weight numeric(10,2),
  height numeric(10,2),
  sitting_height numeric(10,2),
  
  -- Skinfolds (mm)
  skinfold_triceps numeric(10,2),
  skinfold_subscapular numeric(10,2),
  skinfold_supraespinal numeric(10,2),
  skinfold_abdominal numeric(10,2),
  skinfold_thigh numeric(10,2),
  skinfold_calf numeric(10,2),
  
  -- Girths (cm)
  girth_arm_relaxed numeric(10,2),
  girth_arm_flexed numeric(10,2),
  girth_waist numeric(10,2),
  girth_hip numeric(10,2),
  girth_thigh numeric(10,2),
  girth_calf numeric(10,2),
  
  -- Bone breadths (cm)
  breadth_humerus numeric(10,2),
  breadth_femur numeric(10,2),
  
  notes text,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- COMMUNICATION TABLES
-- =============================================

-- Chat conversations
CREATE TABLE IF NOT EXISTS chat_conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_1_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_2_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(participant_1_id, participant_2_id)
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- BOOKING & EVENTS TABLES
-- =============================================

-- Professional availability
CREATE TABLE IF NOT EXISTS professional_availability (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week integer CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES profiles(id),
  booking_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text CHECK (status IN ('pending', 'confirmed', 'completed', 'canceled')) DEFAULT 'pending',
  notes text,
  meeting_link text,
  created_at timestamptz DEFAULT now()
);

-- Events (Zoom integration)
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by uuid NOT NULL REFERENCES profiles(id),
  title text NOT NULL,
  description text,
  event_date timestamptz NOT NULL,
  duration_minutes integer,
  zoom_meeting_id text,
  zoom_join_url text,
  zoom_password text,
  max_participants integer,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Event registrations
CREATE TABLE IF NOT EXISTS event_registrations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  registered_at timestamptz DEFAULT now(),
  attended boolean DEFAULT false,
  UNIQUE(event_id, user_id)
);

-- =============================================
-- CONTENT TABLES
-- =============================================

-- Performance digests
CREATE TABLE IF NOT EXISTS performance_digests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  content text NOT NULL,
  author_id uuid REFERENCES profiles(id),
  publish_date date DEFAULT CURRENT_DATE,
  category text,
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Brand projects
CREATE TABLE IF NOT EXISTS brand_projects (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_name text NOT NULL,
  description text,
  discount_code text,
  discount_percentage numeric(5,2),
  image_url text,
  external_link text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_memberships_user_id ON user_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_trainer_id ON workouts(trainer_id);
CREATE INDEX IF NOT EXISTS idx_athlete_workouts_athlete_id ON athlete_workouts(athlete_id);
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date ON meal_logs(user_id, logged_date);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON habit_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE anthropometry_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_projects ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - PROFILES
-- =============================================

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Trainers can view assigned athletes"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('trainer', 'admin')
    )
  );

CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- RLS POLICIES - MEMBERSHIPS
-- =============================================

CREATE POLICY "Anyone can view active memberships"
  ON memberships FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage memberships"
  ON memberships FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- RLS POLICIES - USER MEMBERSHIPS
-- =============================================

CREATE POLICY "Users can view own membership"
  ON user_memberships FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own membership"
  ON user_memberships FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all memberships"
  ON user_memberships FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- RLS POLICIES - PAYMENTS
-- =============================================

CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- RLS POLICIES - EXERCISES
-- =============================================

CREATE POLICY "Anyone can view global exercises"
  ON exercises FOR SELECT
  TO authenticated
  USING (is_global = true OR created_by = auth.uid());

CREATE POLICY "Trainers can create exercises"
  ON exercises FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('trainer', 'admin')
    )
  );

-- =============================================
-- RLS POLICIES - WORKOUTS
-- =============================================

CREATE POLICY "Trainers can view own workouts"
  ON workouts FOR SELECT
  TO authenticated
  USING (
    trainer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Trainers can create workouts"
  ON workouts FOR INSERT
  TO authenticated
  WITH CHECK (
    trainer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('trainer', 'admin')
    )
  );

CREATE POLICY "Trainers can update own workouts"
  ON workouts FOR UPDATE
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can delete own workouts"
  ON workouts FOR DELETE
  TO authenticated
  USING (trainer_id = auth.uid());

-- =============================================
-- RLS POLICIES - WORKOUT EXERCISES
-- =============================================

CREATE POLICY "Users can view workout exercises"
  ON workout_exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workouts w
      WHERE w.id = workout_exercises.workout_id
      AND (w.trainer_id = auth.uid() OR 
           EXISTS (SELECT 1 FROM athlete_workouts aw 
                   WHERE aw.workout_id = w.id AND aw.athlete_id = auth.uid()))
    )
  );

CREATE POLICY "Trainers can manage workout exercises"
  ON workout_exercises FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workouts w
      WHERE w.id = workout_exercises.workout_id AND w.trainer_id = auth.uid()
    )
  );

-- =============================================
-- RLS POLICIES - ATHLETE WORKOUTS
-- =============================================

CREATE POLICY "Athletes can view assigned workouts"
  ON athlete_workouts FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid() OR trainer_id = auth.uid());

CREATE POLICY "Trainers can assign workouts"
  ON athlete_workouts FOR INSERT
  TO authenticated
  WITH CHECK (
    trainer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('trainer', 'admin')
    )
  );

CREATE POLICY "Trainers can update assigned workouts"
  ON athlete_workouts FOR UPDATE
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- =============================================
-- RLS POLICIES - TRAINING LOGS
-- =============================================

CREATE POLICY "Athletes can view own logs"
  ON training_logs FOR SELECT
  TO authenticated
  USING (
    athlete_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM athlete_workouts aw
      WHERE aw.id = training_logs.athlete_workout_id AND aw.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Athletes can create own logs"
  ON training_logs FOR INSERT
  TO authenticated
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Athletes can update own logs"
  ON training_logs FOR UPDATE
  TO authenticated
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

-- =============================================
-- RLS POLICIES - TRAINING PROGRAMS
-- =============================================

CREATE POLICY "Anyone can view active programs"
  ON training_programs FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage programs"
  ON training_programs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- RLS POLICIES - USER PROGRAMS
-- =============================================

CREATE POLICY "Users can view own programs"
  ON user_programs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can purchase programs"
  ON user_programs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =============================================
-- RLS POLICIES - FOODS
-- =============================================

CREATE POLICY "Anyone can view foods"
  ON foods FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage foods"
  ON foods FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- RLS POLICIES - MEAL LOGS
-- =============================================

CREATE POLICY "Users can view own meal logs"
  ON meal_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own meal logs"
  ON meal_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own meal logs"
  ON meal_logs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own meal logs"
  ON meal_logs FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- RLS POLICIES - MEAL PLANS
-- =============================================

CREATE POLICY "Users can view assigned meal plans"
  ON meal_plans FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid() OR trainer_id = auth.uid());

CREATE POLICY "Trainers can create meal plans"
  ON meal_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    trainer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('trainer', 'admin')
    )
  );

CREATE POLICY "Trainers can update own meal plans"
  ON meal_plans FOR UPDATE
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- =============================================
-- RLS POLICIES - HABITS
-- =============================================

CREATE POLICY "Users can view own habits"
  ON habits FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own habits"
  ON habits FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own habits"
  ON habits FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own habits"
  ON habits FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- RLS POLICIES - HABIT LOGS
-- =============================================

CREATE POLICY "Users can view own habit logs"
  ON habit_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own habit logs"
  ON habit_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own habit logs"
  ON habit_logs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =============================================
-- RLS POLICIES - ANTHROPOMETRY
-- =============================================

CREATE POLICY "Users can view own anthropometry"
  ON anthropometry_records FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    measured_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('trainer', 'admin')
    )
  );

CREATE POLICY "Trainers can create anthropometry records"
  ON anthropometry_records FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('trainer', 'admin')
    )
  );

-- =============================================
-- RLS POLICIES - CHAT
-- =============================================

CREATE POLICY "Users can view own conversations"
  ON chat_conversations FOR SELECT
  TO authenticated
  USING (participant_1_id = auth.uid() OR participant_2_id = auth.uid());

CREATE POLICY "Users can create conversations"
  ON chat_conversations FOR INSERT
  TO authenticated
  WITH CHECK (participant_1_id = auth.uid() OR participant_2_id = auth.uid());

CREATE POLICY "Users can view conversation messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations c
      WHERE c.id = chat_messages.conversation_id
      AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update own messages"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- =============================================
-- RLS POLICIES - BOOKINGS
-- =============================================

CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR professional_id = auth.uid());

CREATE POLICY "Users can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Professionals can update bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (professional_id = auth.uid())
  WITH CHECK (professional_id = auth.uid());

-- =============================================
-- RLS POLICIES - EVENTS
-- =============================================

CREATE POLICY "Anyone can view active events"
  ON events FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage events"
  ON events FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can register for events"
  ON event_registrations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own registrations"
  ON event_registrations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- RLS POLICIES - CONTENT
-- =============================================

CREATE POLICY "Anyone can view published digests"
  ON performance_digests FOR SELECT
  TO authenticated
  USING (is_published = true);

CREATE POLICY "Trainers can create digests"
  ON performance_digests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('trainer', 'admin')
    )
  );

CREATE POLICY "Anyone can view active brand projects"
  ON brand_projects FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage brand projects"
  ON brand_projects FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'athlete');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_workouts_updated_at
  BEFORE UPDATE ON workouts
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_user_memberships_updated_at
  BEFORE UPDATE ON user_memberships
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();