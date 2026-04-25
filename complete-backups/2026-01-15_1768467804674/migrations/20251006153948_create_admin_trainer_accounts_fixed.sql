/*
  # Create Admin and Trainer Accounts - Fixed
  
  Creates the official admin and trainer accounts with all required fields.
  
  1. Accounts Created
    - admin@asciende.pro with password Admin_asciende.pro1
    - agu@asciende.pro with password Agu_asciende.pro1
  
  2. Profiles
    - Admin profile with role 'admin' and email
    - Trainer profile with role 'trainer' and email
*/

-- Enable necessary extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create admin and trainer accounts
DO $$
DECLARE
  admin_user_id uuid;
  trainer_user_id uuid;
  encrypted_password_admin text;
  encrypted_password_trainer text;
BEGIN
  -- Generate encrypted passwords
  encrypted_password_admin := crypt('Admin_asciende.pro1', gen_salt('bf'));
  encrypted_password_trainer := crypt('Agu_asciende.pro1', gen_salt('bf'));
  
  -- Check if admin exists
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@asciende.pro';
  
  IF admin_user_id IS NULL THEN
    -- Create admin user
    admin_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud,
      confirmation_token,
      recovery_token
    ) VALUES (
      admin_user_id,
      '00000000-0000-0000-0000-000000000000',
      'admin@asciende.pro',
      encrypted_password_admin,
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Asciende Admin"}',
      now(),
      now(),
      'authenticated',
      'authenticated',
      '',
      ''
    );
    
    -- Create admin profile with email
    INSERT INTO profiles (id, email, role, full_name, country, sport)
    VALUES (admin_user_id, 'admin@asciende.pro', 'admin', 'Asciende Admin', 'Spain', 'admin')
    ON CONFLICT (id) DO UPDATE
    SET email = 'admin@asciende.pro', role = 'admin', full_name = 'Asciende Admin', country = 'Spain', sport = 'admin';
    
    RAISE NOTICE 'Admin account created: admin@asciende.pro';
  ELSE
    -- Update profile if exists
    UPDATE profiles
    SET email = 'admin@asciende.pro', role = 'admin', full_name = 'Asciende Admin', country = 'Spain', sport = 'admin'
    WHERE id = admin_user_id;
    
    RAISE NOTICE 'Admin account already exists';
  END IF;
  
  -- Check if trainer exists
  SELECT id INTO trainer_user_id FROM auth.users WHERE email = 'agu@asciende.pro';
  
  IF trainer_user_id IS NULL THEN
    -- Create trainer user
    trainer_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud,
      confirmation_token,
      recovery_token
    ) VALUES (
      trainer_user_id,
      '00000000-0000-0000-0000-000000000000',
      'agu@asciende.pro',
      encrypted_password_trainer,
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Agu Trainer"}',
      now(),
      now(),
      'authenticated',
      'authenticated',
      '',
      ''
    );
    
    -- Create trainer profile with email
    INSERT INTO profiles (id, email, role, full_name, country, sport)
    VALUES (trainer_user_id, 'agu@asciende.pro', 'trainer', 'Agu Trainer', 'Spain', 'trainer')
    ON CONFLICT (id) DO UPDATE
    SET email = 'agu@asciende.pro', role = 'trainer', full_name = 'Agu Trainer', country = 'Spain', sport = 'trainer';
    
    RAISE NOTICE 'Trainer account created: agu@asciende.pro';
  ELSE
    -- Update profile if exists
    UPDATE profiles
    SET email = 'agu@asciende.pro', role = 'trainer', full_name = 'Agu Trainer', country = 'Spain', sport = 'trainer'
    WHERE id = trainer_user_id;
    
    RAISE NOTICE 'Trainer account already exists';
  END IF;
  
END $$;

-- Verify and display credentials
DO $$
DECLARE
  admin_exists boolean;
  trainer_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'admin@asciende.pro') INTO admin_exists;
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'agu@asciende.pro') INTO trainer_exists;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '  ASCIENDE PLATFORM - OFFICIAL ACCOUNTS';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  IF admin_exists THEN
    RAISE NOTICE '✅ ADMIN ACCOUNT';
    RAISE NOTICE '   Email: admin@asciende.pro';
    RAISE NOTICE '   Password: Admin_asciende.pro1';
    RAISE NOTICE '';
  END IF;
  
  IF trainer_exists THEN
    RAISE NOTICE '✅ TRAINER ACCOUNT (AGU)';
    RAISE NOTICE '   Email: agu@asciende.pro';
    RAISE NOTICE '   Password: Agu_asciende.pro1';
    RAISE NOTICE '';
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '  All new athletes will be automatically assigned to Agu';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;
